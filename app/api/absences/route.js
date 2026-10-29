import { NextResponse } from 'next/server';
import { getAbsences, createAbsence, deleteAbsence, updateAbsence } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const data = await getAbsences(userId, companyId, status);
    return NextResponse.json(data);
}


export async function PUT(request) {
    const body = await request.json();
    if (!body.id) {
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }
    const updated = await updateAbsence(body.id, body);
    return NextResponse.json(updated);
}

export async function POST(request) {
    const body = await request.json();
    if (!body.userId || !body.date) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const newAbsence = await createAbsence(body);
    return NextResponse.json(newAbsence);
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
        await deleteAbsence(id);
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
}
