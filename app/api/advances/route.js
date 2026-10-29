
import { NextResponse } from 'next/server';
import { getAdvances, createAdvance, deleteAdvance } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');

    const data = await getAdvances(userId, companyId);

    return NextResponse.json(data);
}

export async function POST(request) {
    const body = await request.json();
    // Expect body: { userId, value, description, date }

    if (!body.userId || !body.value) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const newAdvance = await createAdvance(body);
    return NextResponse.json(newAdvance);
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        await deleteAdvance(id);
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
}
