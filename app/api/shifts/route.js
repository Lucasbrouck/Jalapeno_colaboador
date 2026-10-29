import { NextResponse } from 'next/server';
import { getShifts, createShift, updateShift, deleteShift } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');
        const shifts = await getShifts(companyId);
        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error in GET /api/shifts:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        await createShift(body);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in POST /api/shifts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    const body = await request.json();
    await updateShift(body.id, body);
    return NextResponse.json({ success: true });
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }
    await deleteShift(id);
    return NextResponse.json({ success: true });
}
