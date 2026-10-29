import { NextResponse } from 'next/server';
import {
    getDisciplinaryRules,
    createDisciplinaryRule,
    updateDisciplinaryRule,
    deleteDisciplinaryRule,
    ensureDefaultDisciplinaryRulesAsync
} from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');
        const rules = await getDisciplinaryRules(companyId);
        return NextResponse.json(rules);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        if (body.action === 'seed_official') {
            await ensureDefaultDisciplinaryRulesAsync(true);
            const rules = await getDisciplinaryRules(body.companyId);
            return NextResponse.json({ success: true, count: rules.length, rules });
        }
        if (!body.title) {
            return NextResponse.json({ error: 'O título da regra é obrigatório' }, { status: 400 });
        }
        const rule = await createDisciplinaryRule(body);
        return NextResponse.json(rule, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        if (!body.id) {
            return NextResponse.json({ error: 'ID da regra é obrigatório' }, { status: 400 });
        }
        const updated = await updateDisciplinaryRule(body.id, body);
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
        await deleteDisciplinaryRule(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
