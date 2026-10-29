import { NextResponse } from 'next/server';
import { getUsers, getUserCheckin, getCompanies } from '@/lib/db';
import { formatDateForInput } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        const companies = await getCompanies();
        const targetCompanies = companyId
            ? companies.filter(c => String(c.id) === String(companyId))
            : companies;

        const seenUserIds = new Set();
        const allUsers = [];

        for (const company of targetCompanies) {
            const companyUsers = await getUsers(company.id);
            for (const u of companyUsers) {
                if ((u.role === 'worker' || u.role === 'manager') && !seenUserIds.has(u.id)) {
                    seenUserIds.add(u.id);
                    allUsers.push({
                        ...u,
                        company_id: company.id,
                        companyName: company.name,
                        company_name: company.name
                    });
                }
            }
        }

        const today = formatDateForInput(new Date());

        const liveStatus = await Promise.all(allUsers.map(async user => {
            const checkin = await getUserCheckin(user.id, today);

            let status = 'offline';

            if (checkin) {
                if (checkin.checkoutExit) {
                    status = 'offline';
                } else if (checkin.checkoutBreak && !checkin.checkinBreak) {
                    status = 'at_lunch';
                } else if (checkin.checkinEntry) {
                    status = 'working';
                }
            }

            return {
                id: user.id,
                name: user.name,
                role: user.role,
                level_name: user.trainingLevelName || null,
                company_id: user.company_id,
                companyName: user.companyName,
                company_name: user.company_name,
                status,
                checkinEntry: checkin?.checkinEntry || null,
                checkoutBreak: checkin?.checkoutBreak || null,
                checkinBreak: checkin?.checkinBreak || null,
                checkoutExit: checkin?.checkoutExit || null,
                lastUpdate: checkin ? (checkin.checkoutExit || checkin.checkinBreak || checkin.checkoutBreak || checkin.checkinEntry) : null
            };
        }));

        return NextResponse.json(liveStatus);
    } catch (error) {
        console.error('Error in GET /api/aovivo:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
