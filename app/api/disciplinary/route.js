import { NextResponse } from 'next/server';
import {
    getDisciplinaryRecords,
    createDisciplinaryRecord,
    updateDisciplinaryRecord,
    deleteDisciplinaryRecord
} from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const companyId = searchParams.get('companyId');
        const records = await getDisciplinaryRecords(userId, companyId);
        return NextResponse.json(records);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        if (!body.userId || !body.type || !body.rule_title || !body.date) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
        }
        const record = await createDisciplinaryRecord(body);
        return NextResponse.json(record, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        if (!body.id) {
            return NextResponse.json({ error: 'ID do registro é obrigatório' }, { status: 400 });
        }
        const updated = await updateDisciplinaryRecord(body.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }
        await deleteDisciplinaryRecord(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
