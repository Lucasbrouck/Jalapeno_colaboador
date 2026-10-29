import { NextResponse } from 'next/server';
import { getWeeklyMetrics, listWeeklyMetrics, saveWeeklyMetrics } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const companyId = searchParams.get('companyId');

    if (!date) {
        const metricsList = await listWeeklyMetrics(companyId);
        return NextResponse.json(metricsList);
    }

    const metrics = await getWeeklyMetrics(date, companyId);
    return NextResponse.json(metrics || {});
}

export async function POST(request) {
    try {
        const body = await request.json();
        const metrics = await saveWeeklyMetrics(body);
        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Error saving weekly metrics:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
