import { NextResponse } from 'next/server';
import {
    getUserCheckin, getUserCheckinsForMonth, createUserCheckin, updateUserCheckin, deleteUserCheckin,
    getShiftByTypeAndDate, createShift, updateShift,
    getCompanyById, awardPlataForCheckin
} from '@/lib/db';
import { formatDateForInput } from '@/lib/dateUtils';

// Helper to calculate distance between two coordinates in meters (Haversine Formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const month = searchParams.get('month');
        const now = new Date();
        const date = searchParams.get('date') || formatDateForInput(now);
        const spHours = parseInt(now.toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }));

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        if (month) {
            const checkins = await getUserCheckinsForMonth(userId, month);
            return NextResponse.json(checkins);
        }

        // Logic for overnight shifts: 
        // If it's before 04:00 AM, check if there's an active check-in from yesterday.
        let checkin = await getUserCheckin(userId, date);

        if (!checkin && spHours < 4) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = formatDateForInput(yesterday);
            const yCheckin = await getUserCheckin(userId, yesterdayStr);

            // Only return yesterday's if it's not finished
            if (yCheckin && !yCheckin.checkoutExit) {
                checkin = yCheckin;
            }
        }

        return NextResponse.json(checkin || null);
    } catch (error) {
        console.error('Error in GET /api/checkins:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, companyId, coords } = body;
        let { action } = body;
        const now = new Date();
        const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
        const [spHours, spMinutes] = currentTime.split(':').map(Number);
        const totalMinutes = spHours * 60 + spMinutes;
        let activeDate = formatDateForInput(now);

        if (!userId || !companyId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const company = await getCompanyById(companyId);

        // 1. Determinar Estado do Checkin (Overnight e Regra Geral)
        let checkin = await getUserCheckin(userId, activeDate);
        if (!checkin && spHours < 4) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = formatDateForInput(yesterday);
            const yCheckin = await getUserCheckin(userId, yesterdayStr);

            // If it's not ENTRY and we have an unfinished check-in from yesterday, use it
            if (action !== 'ENTRY' && yCheckin && !yCheckin.checkoutExit) {
                checkin = yCheckin;
                activeDate = yesterdayStr;
            }
        }

        // REGRA GERAL DE ENTRADA: Se não há sessão aberta hoje (ou overnight), força ENTRY
        if (!checkin) {
            action = 'ENTRY';
        }

        // 2. Geographic Logging (geofencing desativado — apenas coleta para debug)
        let distanceLog = 'N/A';
        if (company && company.latitude && company.longitude) {
            if (!coords || !coords.latitude || !coords.longitude) {
                console.warn(`[Geofence DEBUG] User ${userId} Action ${action}: coords não enviadas pelo cliente`);
            } else {
                const distance = calculateDistance(
                    coords.latitude, coords.longitude,
                    company.latitude, company.longitude
                );
                
                distanceLog = distance.toFixed(2) + 'm';
                const radius = company.checkinRadius || 200;

                if (distance > radius) {
                    console.warn(`[Geofence DEBUG] User ${userId} Action ${action}: FORA do raio (${Math.round(distance)}m / raio ${radius}m)`);
                } else {
                    console.log(`[Geofence DEBUG] User ${userId} Action ${action}: DENTRO do raio (${Math.round(distance)}m / raio ${radius}m)`);
                }
            }
        }

        // --- Checkin Audit Log ---
        console.log(`[Checkin Audit] Method: WEB, User: ${userId}, Action: ${action}, Time: ${now.toISOString()}, Distance: ${distanceLog}, Coords: ${JSON.stringify(coords || {})}`);
        // --------------------------------

        if (action === 'ENTRY') {
            if (checkin) {
                return NextResponse.json({ error: 'Já foi realizado o check-in hoje.' }, { status: 400 });
            }

            let shiftType = 'DAY';
            let status = 'ON_TIME';

            // Transition point: 14:00 (2:00 PM)
            // Any check-in before 14:00 is considered DAY shift
            // Any check-in from 14:00 onwards is considered NIGHT shift
            if (totalMinutes < (14 * 60)) {
                shiftType = 'DAY';
                // Day shift starts at 07:00 (or before). ON_TIME until 09:15.
                status = totalMinutes <= (9 * 60 + 15) ? 'ON_TIME' : 'LATE';
            } else {
                shiftType = 'NIGHT';
                // Night shift ON_TIME until 15:45.
                status = totalMinutes <= (15 * 60 + 45) ? 'ON_TIME' : 'LATE';
            }

            checkin = await createUserCheckin({
                userId,
                company_id: companyId,
                date: activeDate,
                shiftType,
                checkinEntry: now.toISOString(),
                status
            });

            // Reward: 3 or 1 plata
            await awardPlataForCheckin(userId, status, companyId);

            // AUTO-REGISTRATION: Add to shifts and shift_workers
            const registerInShift = async (type, punctuality) => {
                console.log(`[Checkin] Verificando registro automático para ${type} em ${activeDate}`);
                try {
                    let shift = await getShiftByTypeAndDate(type, activeDate, companyId);
                    if (!shift) {
                        console.log(`[Checkin] Criando novo turno administrativo: ${activeDate} (${type})`);
                        shift = await createShift({
                            date: activeDate,
                            type,
                            company_id: companyId,
                            revenue: 0,
                            metrics: { CMV: 0, RATING: 0, OPS: 0 },
                            workers: []
                        });
                    }
                    if (shift && !shift.workers.some(w => w.id === userId)) {
                        console.log(`[Checkin] Adicionando usuário ${userId} ao turno ${shift.id}`);
                        await updateShift(shift.id, {
                            workers: [...shift.workers, { id: userId, status: punctuality }]
                        });
                    }
                } catch (error) {
                    console.error('[Checkin] Erro crítico no registro automático de turno:', error);
                }
            };

            await registerInShift(shiftType, status);

        } else if (action === 'BREAK_START') {
            if (!checkin) return NextResponse.json({ error: 'Check-in de entrada não encontrado.' }, { status: 400 });
            checkin = await updateUserCheckin(checkin.id, { checkoutBreak: now.toISOString() });

            // Add returnTime for UI consistency
            const returnDate = new Date(now.getTime() + 60 * 60 * 1000);
            const returnTime = returnDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
            return NextResponse.json({ ...checkin, returnTime });
        } else if (action === 'BREAK_END') {
            if (!checkin || !checkin.checkoutBreak) return NextResponse.json({ error: 'Check-out de intervalo não encontrado.' }, { status: 400 });
            checkin = await updateUserCheckin(checkin.id, { checkinBreak: now.toISOString() });
        } else if (action === 'EXIT') {
            if (!checkin) return NextResponse.json({ error: 'Check-in de entrada não encontrado.' }, { status: 400 });

            checkin = await updateUserCheckin(checkin.id, {
                checkoutExit: now.toISOString()
            });

            // AUTO-REGISTRATION: Handle double shift detection
            if (checkin.shiftType === 'DAY' && checkin.checkinEntry) {
                const entryDate = new Date(checkin.checkinEntry);
                const exitDate = new Date(checkin.checkoutExit);
                const diffHours = (exitDate - entryDate) / (1000 * 60 * 60);
                
                // If duration is 12 hours or more, register for NIGHT shift too
                if (diffHours >= 12) {
                    let nightShift = await getShiftByTypeAndDate('NIGHT', activeDate, companyId);
                    if (!nightShift) {
                        nightShift = await createShift({
                            date: activeDate,
                            type: 'NIGHT',
                            company_id: companyId,
                            revenue: 0,
                            metrics: { CMV: 0, RATING: 0, OPS: 0 },
                            workers: []
                        });
                    }
                    if (!nightShift.workers.some(w => w.id === userId)) {
                        await updateShift(nightShift.id, {
                            workers: [...nightShift.workers, { id: userId, status: 'ON_TIME' }]
                        });

                        // Reward for the second shift (always ON_TIME as it's an auto-registration)
                        await awardPlataForCheckin(userId, 'ON_TIME', companyId);
                    }
                }
            }
        }

        return NextResponse.json(checkin);
    } catch (error) {
        console.error('Error in POST /api/checkins:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, userId, date, checkinEntry, checkoutBreak, checkinBreak, checkoutExit, companyId, shiftLinks, syncShift } = body;

        if (!id && (!userId || !date)) {
            return NextResponse.json({ error: 'Missing required fields (id or userId+date)' }, { status: 400 });
        }

        let status = body.status;
        let detectedDayStatus = 'NONE';
        let detectedNightStatus = 'NONE';

        // Recalculate status if checkinEntry is provided
        if (checkinEntry) {
            const entryDate = new Date(checkinEntry);
            const spTime = entryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
            const [hours, minutes] = spTime.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;

            if (totalMinutes < (14 * 60)) {
                status = totalMinutes <= (9 * 60 + 15) ? 'ON_TIME' : 'LATE';
                detectedDayStatus = status;

                if (checkoutExit) {
                    const exitDate = new Date(checkoutExit);
                    const diffHours = (exitDate - entryDate) / (1000 * 60 * 60);
                    if (diffHours >= 12) {
                        detectedNightStatus = 'ON_TIME';
                    }
                }
            } else {
                status = totalMinutes <= (15 * 60 + 45) ? 'ON_TIME' : 'LATE';
                detectedNightStatus = status;
            }
        }

        let checkin = null;
        if (id) {
            console.log(`[Checkin Audit] Method: MANUAL_EDIT (UPDATE), User: ${userId}, Admin: (PUT request), Action: UPDATE, Time: ${new Date().toISOString()}, Data: ${JSON.stringify(body)}`);
            checkin = await updateUserCheckin(id, {
                checkinEntry,
                checkoutBreak,
                checkinBreak,
                checkoutExit,
                status
            });
        } else if (checkinEntry || checkoutBreak || checkinBreak || checkoutExit) {
            // Determine shiftType
            let shiftType = 'DAY';
            if (checkinEntry) {
                const entryDate = new Date(checkinEntry);
                const spTime = entryDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
                const [hours] = spTime.split(':').map(Number);
                if (hours >= 14) shiftType = 'NIGHT';
            }

            console.log(`[Checkin Audit] Method: MANUAL_EDIT (CREATE), User: ${userId}, Admin: (PUT request), Action: CREATE, Time: ${new Date().toISOString()}, Data: ${JSON.stringify(body)}`);
            checkin = await createUserCheckin({
                userId,
                date,
                company_id: companyId,
                checkinEntry,
                checkoutBreak,
                checkinBreak,
                checkoutExit,
                status: status || 'ON_TIME',
                shiftType
            });
        }

        // Sync with Shifts (DAY / NIGHT) if shiftLinks or syncShift is provided
        if ((shiftLinks || syncShift) && userId && date) {
            const targetLinks = {
                DAY: shiftLinks?.DAY !== undefined ? shiftLinks.DAY : detectedDayStatus,
                NIGHT: shiftLinks?.NIGHT !== undefined ? shiftLinks.NIGHT : detectedNightStatus
            };

            for (const type of ['DAY', 'NIGHT']) {
                const desiredStatus = targetLinks[type];
                let shift = await getShiftByTypeAndDate(type, date, companyId);

                if (desiredStatus === 'ON_TIME' || desiredStatus === 'LATE') {
                    if (!shift) {
                        await createShift({
                            date,
                            type,
                            company_id: companyId,
                            revenue: 0,
                            metrics: { CMV: 0, RATING: 0, OPS: 0 },
                            workers: [{ id: userId, status: desiredStatus }]
                        });
                    } else {
                        const existingWorker = shift.workers?.find(w => w.id === userId);
                        if (!existingWorker) {
                            await updateShift(shift.id, {
                                workers: [...(shift.workers || []), { id: userId, status: desiredStatus }]
                            });
                        } else if (existingWorker.status !== desiredStatus) {
                            await updateShift(shift.id, {
                                workers: shift.workers.map(w => w.id === userId ? { ...w, status: desiredStatus } : w)
                            });
                        }
                    }
                } else if (desiredStatus === 'NONE' && shift && shift.workers?.some(w => w.id === userId)) {
                    await updateShift(shift.id, {
                        workers: shift.workers.filter(w => w.id !== userId)
                    });
                }
            }
        }

        return NextResponse.json(checkin);
    } catch (error) {
        console.error('Error in PUT /api/checkins:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const removeFromShifts = searchParams.get('removeFromShifts') === 'true';
        const userId = searchParams.get('userId');
        const date = searchParams.get('date');
        const companyId = searchParams.get('companyId');

        if (!id) {
            return NextResponse.json({ error: 'Missing checkin ID' }, { status: 400 });
        }

        await deleteUserCheckin(id);

        if (removeFromShifts && userId && date) {
            for (const type of ['DAY', 'NIGHT']) {
                const shift = await getShiftByTypeAndDate(type, date, companyId);
                if (shift && shift.workers?.some(w => w.id === userId)) {
                    await updateShift(shift.id, {
                        workers: shift.workers.filter(w => w.id !== userId)
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/checkins:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
