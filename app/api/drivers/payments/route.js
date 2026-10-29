import { NextResponse } from 'next/server';
import { createDriverPayment, getDriverPayments, getDriverBalance } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('driverId');
        if (!driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 });

        const balanceOnly = searchParams.get('balance');

        if (balanceOnly === 'true') {
            return NextResponse.json({ balance: await getDriverBalance(driverId) });
        }

        const payments = await getDriverPayments(driverId);
        return NextResponse.json(payments);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const payment = await request.json();
        if (!payment.driver_id || !payment.amount || !payment.date) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }
        const newPayment = await createDriverPayment(payment);
        return NextResponse.json(newPayment);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
