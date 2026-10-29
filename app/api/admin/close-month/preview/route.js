
import { NextResponse } from 'next/server';
import { calculateClosingRewards } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const companyId = searchParams.get('companyId');

    if (!month) {
        return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    try {
        const rewards = await calculateClosingRewards(month, companyId);
        return NextResponse.json(rewards);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
