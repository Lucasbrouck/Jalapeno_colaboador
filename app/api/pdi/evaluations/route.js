import { NextResponse } from 'next/server';
import {
    getPDIEvaluations,
    createPDIEvaluation,
    updatePDIEvaluation,
    deletePDIEvaluation
} from '@/lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');
        const companyId = searchParams.get('companyId');

        const evaluations = await getPDIEvaluations({ userId, status, companyId });
        return NextResponse.json(evaluations);
    } catch (error) {
        console.error('PDI Evaluations GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { userId, date } = await req.json();

        if (!userId || !date) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Status transitions: 
        // 1. Admin schedules -> PENDING_SELF
        // 2. User answers -> PENDING_ADM
        // 3. Admin evaluates -> COMPLETED

        const created = await createPDIEvaluation({ userId, date });
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('PDI Evaluations POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id } = body;

        console.log('[API] PUT /api/pdi/evaluations payload:', body);

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await updatePDIEvaluation(id, body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PDI Evaluations PUT Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await deletePDIEvaluation(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PDI Evaluations DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
