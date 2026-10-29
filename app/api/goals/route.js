
import { NextResponse } from 'next/server';
import { getGoals, updateGoals } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const companyId = searchParams.get('companyId');
    return NextResponse.json(await getGoals(month, companyId));
}

export async function POST(request) {
    const body = await request.json();
    const updated = await updateGoals(body, body.month);
    return NextResponse.json(updated);
}
