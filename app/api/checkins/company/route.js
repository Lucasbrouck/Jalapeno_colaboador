import { NextResponse } from 'next/server';
import { getCompanyCheckinsByDate } from '@/lib/db';
import { formatDateForInput } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        let date = searchParams.get('date');
        if (!date) {
            const now = new Date();
            const spHours = parseInt(now.toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }));
            // In day change before 04:00 AM we should still look at yesterday's date
            if (spHours < 4) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                date = formatDateForInput(yesterday);
            } else {
                date = formatDateForInput(now);
            }
        }

        if (!companyId) {
            return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }

        const checkins = await getCompanyCheckinsByDate(companyId, date);
        return NextResponse.json(checkins);
    } catch (error) {
        console.error('Error in GET /api/checkins/company:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
