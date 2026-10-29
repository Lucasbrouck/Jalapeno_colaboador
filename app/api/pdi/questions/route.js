import { NextResponse } from 'next/server';
import { getPDIQuestions, createPDIQuestion, deletePDIQuestion } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const modelId = searchParams.get('modelId');
        const companyId = searchParams.get('companyId');

        // Pass modelId and companyId to helper
        const questions = await getPDIQuestions(true, modelId, companyId);
        return NextResponse.json(questions || []);
    } catch (error) {
        console.error('PDI GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const question = await createPDIQuestion(body);
        return NextResponse.json(question);
    } catch (error) {
        console.error('PDI POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await deletePDIQuestion(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PDI DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
