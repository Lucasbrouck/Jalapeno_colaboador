
import { NextResponse } from 'next/server';
import { getUsers, getUserById, createUser, updateUser, deleteUser, getUserByNfcId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const companyId = searchParams.get('companyId');

    if (id) {
        const user = await getUserById(id);
        return NextResponse.json(user ? [user] : []);
    }

    return NextResponse.json(await getUsers(companyId));
}
export async function POST(request) {
    try {
        const body = await request.json();
        const newUser = await createUser(body);
        return NextResponse.json(newUser);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE constraint failed: users.nfc_id'))) {
            return NextResponse.json({ error: 'Este cartão NFC já está vinculado a outro funcionário. Desvincule-o primeiro.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const updated = await updateUser(body.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE constraint failed: users.nfc_id'))) {
            return NextResponse.json({ error: 'Este cartão NFC já está vinculado a outro funcionário. Desvincule-o primeiro.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    await deleteUser(id);
    return NextResponse.json({ success: true });
}
