import { NextResponse } from 'next/server';
import {
    getShiftByTypeAndDate, createShift, updateShift,
    getCompanyById, awardPlataForCheckin,
    getUserByNfcId, getUserCheckin,
    updateUserCheckin, createUserCheckin
} from '@/lib/db';
import { formatDateForInput } from '@/lib/dateUtils';

export async function POST(request) {
    try {
        const body = await request.json();
        const { nfcId, companyId, coords } = body;
        const now = new Date();
        const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
        const [spHours, spMinutes] = currentTime.split(':').map(Number);
        const totalMinutes = spHours * 60 + spMinutes;
        let activeDate = formatDateForInput(now);

        if (!nfcId) {
            return NextResponse.json({ error: 'ID Ausente' }, { status: 400 });
        }

        // 1. Find User by NFC ID
        const normalizedNfcId = nfcId.replace(/:/g, '').toUpperCase();
        console.log(`[NFC Debug] Received: ${nfcId} | Normalized: ${normalizedNfcId}`);
        const user = await getUserByNfcId(normalizedNfcId);
        if (!user) {
            console.log(`[NFC Debug] User not found for ID: ${normalizedNfcId}`);
            return NextResponse.json({ error: 'Nao registrado' }, { status: 404 });
        }

        const userId = user.id;
        // Prioritize company_id from user record, then from request, then default
        const effectiveCompanyId = user.company_id || companyId || 'default-company';

        // 2. Geographic Validation (Skipped for Hardware NFC)
        const company = await getCompanyById(effectiveCompanyId);

        /* 
        // Only require coordinates if the company has latitude/longitude configured
        if (company && company.latitude && company.longitude) {
            if (!coords || !coords.latitude || !coords.longitude) {
                return NextResponse.json({
                    error: 'A localização é obrigatória para realizar o check-in.'
                }, { status: 403 });
            }
            // ... (distância e rádio ignorados para NFC hardware)
        }
        */

        // 3. Determine next action based on current state
        let checkin = await getUserCheckin(userId, activeDate);

        // Handle overnight (before 4 AM, look for yesterday's check-in)
        if (!checkin && spHours < 4) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = formatDateForInput(yesterday);
            const yCheckin = await getUserCheckin(userId, yesterdayStr);
            if (yCheckin && !yCheckin.checkoutExit) {
                checkin = yCheckin;
                activeDate = yesterdayStr;
            }
        }

        let action = 'ENTRY';
        let lastTimestamp = null;

        if (checkin) {
            if (!checkin.checkoutBreak) {
                action = 'BREAK_START';
                lastTimestamp = checkin.checkinEntry;
            } else if (!checkin.checkinBreak) {
                action = 'BREAK_END';
                lastTimestamp = checkin.checkoutBreak;
            } else if (!checkin.checkoutExit) {
                action = 'EXIT';
                lastTimestamp = checkin.checkinBreak;
            } else {
                return NextResponse.json({ error: 'Dia concluido' }, { status: 400 });
            }
        }

        // REGRA GERAL DE ENTRADA: Se não há sessão aberta hoje (ou overnight), força ENTRY
        if (!checkin) {
            action = 'ENTRY';
        }

        // --- ADDED: Checkin Audit Log ---
        console.log(`[Checkin Audit] Method: NFC, User: ${userId} (${user.name}), Action: ${action}, Time: ${now.toISOString()}, Coords: ${JSON.stringify(coords || {})}`);
        // --------------------------------

        // 50-minute Interval Rule
        if (lastTimestamp) {
            const lastDate = new Date(lastTimestamp);
            const diffMinutes = Math.floor((now - lastDate) / (1000 * 60));

            if (diffMinutes < 50) {
                const actionLabelsMap = {
                    'BREAK_START': 'sair para o descanso',
                    'BREAK_END': 'voltar do descanso',
                    'EXIT': 'fazer checkout'
                };
                return NextResponse.json({
                    error: 'Aguarde o horario'
                }, { status: 403 });
            }
        }

        // 4. Process Action
        let statusMessage = '';
        try {

            if (action === 'ENTRY') {
                let shiftType = totalMinutes < (14 * 60) ? 'DAY' : 'NIGHT';
                let status = 'ON_TIME';

                if (shiftType === 'DAY') {
                    status = totalMinutes <= (9 * 60 + 15) ? 'ON_TIME' : 'LATE';
                } else {
                    status = totalMinutes <= (15 * 60 + 45) ? 'ON_TIME' : 'LATE';
                }

                statusMessage = status === 'LATE' ? 'Entrada (Atraso)' : 'Entrada (OK)';

                console.log('Creating user check-in:', { userId, company_id: effectiveCompanyId });
                checkin = await createUserCheckin({
                    userId,
                    company_id: effectiveCompanyId,
                    date: activeDate,
                    shiftType,
                    checkinEntry: now.toISOString(),
                    status
                });

                // Reward: 3 or 1 plata
                await awardPlataForCheckin(userId, status, effectiveCompanyId);

                // Auto-register in shift
                const type = shiftType;
                let shift = await getShiftByTypeAndDate(type, activeDate, effectiveCompanyId);
                if (!shift) {
                    console.log('Creating shift:', { type, activeDate, company_id: effectiveCompanyId });
                    shift = await createShift({
                        date: activeDate,
                        type,
                        company_id: effectiveCompanyId,
                        revenue: 0,
                        metrics: { CMV: 0, RATING: 0, OPS: 0 },
                        workers: []
                    });
                }
                if (!shift.workers.some(w => w.id === userId)) {
                    console.log('Updating shift workers:', { shiftId: shift.id, userId });
                    await updateShift(shift.id, {
                        workers: [...shift.workers, { id: userId, status }]
                    });
                }
            } else if (action === 'BREAK_START') {
                statusMessage = 'Saida Intervalo';
                checkin = await updateUserCheckin(checkin.id, { checkoutBreak: now.toISOString() });
            } else if (action === 'BREAK_END') {
                statusMessage = 'Retorno (OK)';
                checkin = await updateUserCheckin(checkin.id, { checkinBreak: now.toISOString() });
            } else if (action === 'EXIT') {
                statusMessage = 'Checkout (OK)';
                checkin = await updateUserCheckin(checkin.id, { checkoutExit: now.toISOString() });

                // Double shift logic
                if (checkin.shiftType === 'DAY' && checkin.checkinEntry) {
                    const entryDate = new Date(checkin.checkinEntry);
                    const exitDate = new Date(checkin.checkoutExit);
                    const diffHours = (exitDate - entryDate) / (1000 * 60 * 60);

                    if (diffHours >= 12) {
                        let nightShift = await getShiftByTypeAndDate('NIGHT', activeDate, effectiveCompanyId);
                        if (!nightShift) {
                            nightShift = await createShift({
                                date: activeDate,
                                type: 'NIGHT',
                                company_id: effectiveCompanyId,
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
                            await awardPlataForCheckin(userId, 'ON_TIME', effectiveCompanyId);
                        }
                    }
                }
            }
        } catch (dbError) {
            console.error('Database operation failed during check-in:', dbError);
            throw new Error(`Erro ao salvar no banco de dados: ${dbError.message}`);
        }

        let returnTime = null;
        if (action === 'BREAK_START') {
            const returnDate = new Date(now.getTime() + 60 * 60 * 1000);
            returnTime = returnDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' });
        }

        return NextResponse.json({
            success: true,
            userName: user.name,
            action,
            statusMessage,
            returnTime,
            checkin
        });

    } catch (error) {
        console.error('Error in POST /api/checkins/nfc:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
