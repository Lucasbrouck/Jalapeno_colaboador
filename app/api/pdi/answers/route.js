import { NextResponse } from 'next/server';
import { getPDIAnswers, savePDIAnswer } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date'); // YYYY-MM
    const evaluationId = searchParams.get('evaluationId');

    console.log('[API] GET /api/pdi/answers params:', { userId, date, evaluationId });

    if (!userId || !date) return NextResponse.json({ error: 'Missing userId or date' }, { status: 400 });

    const answers = await getPDIAnswers(userId, date, evaluationId);
    console.log('[API] Fetched answers count:', answers.length);
    return NextResponse.json(answers);
}

export async function POST(request) {
    try {
        const body = await request.json();
        const answer = await savePDIAnswer(body);
        return NextResponse.json(answer);
    } catch (error) {
        console.error('API PDI Answer POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
