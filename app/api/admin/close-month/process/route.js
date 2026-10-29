
import { NextResponse } from 'next/server';
import { applyClosingRewards } from '@/lib/db';

export async function POST(request) {
    try {
        const { month, companyId, rewards } = await request.json();

        if (!month || !rewards) {
            return NextResponse.json({ error: 'Month and rewards are required' }, { status: 400 });
        }

        const result = await applyClosingRewards(month, companyId, rewards);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
