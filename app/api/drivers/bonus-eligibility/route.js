import { NextResponse } from 'next/server';
import { getDriverBonusEligibilityStats } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('driverId');
        const dateStr = searchParams.get('date');

        if (!driverId || !dateStr) {
            return NextResponse.json({ error: 'driverId and date are required' }, { status: 400 });
        }

        // Check if the given date is the last working day of the month
        // Working days exclude Mondays (day 1)
        const d = new Date(dateStr + 'T12:00:00Z');
        const year = d.getFullYear();
        const month = d.getMonth();

        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0));
        let lastWorkingDay = new Date(lastDayOfMonth);

        if (lastWorkingDay.getUTCDay() === 1) { // 1 is Monday
            lastWorkingDay.setUTCDate(lastWorkingDay.getUTCDate() - 1); // Go to Sunday
        }

        const lastWorkingDateString = lastWorkingDay.toISOString().split('T')[0];

        // If today is not the last working day, not eligible yet
        if (dateStr !== lastWorkingDateString) {
            return NextResponse.json({ eligible: false, reason: 'Not the last working day of the month' });
        }

        // Count working days in the month (excluding Mondays)
        let workingDaysCount = 0;
        const daysInMonth = lastDayOfMonth.getUTCDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const tempD = new Date(Date.UTC(year, month, i, 12, 0, 0));
            if (tempD.getUTCDay() !== 1) {
                workingDaysCount++;
            }
        }

        // Get driver's monthly bonus stats from db layer
        const yearMonth = dateStr.substring(0, 7); // 'YYYY-MM'
        const { checkinsCount, alreadyPaid, bonusAmount } = await getDriverBonusEligibilityStats(driverId, yearMonth);

        // Driver must have worked all working days
        if (checkinsCount < workingDaysCount) {
            return NextResponse.json({ eligible: false, reason: `Absences detected. Worked ${checkinsCount}/${workingDaysCount} days.` });
        }

        if (alreadyPaid) {
            return NextResponse.json({ eligible: false, reason: 'Bonus already paid for this month' });
        }

        return NextResponse.json({
            eligible: true,
            amount: bonusAmount,
            checkinsCount,
            workingDaysCount
        });

    } catch (error) {
        console.error('Error calculating bonus eligibility:', error);
        return NextResponse.json({ error: 'Failed to calculate eligibility' }, { status: 500 });
    }
}
