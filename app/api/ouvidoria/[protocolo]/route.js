import { NextResponse } from 'next/server';
import {
    getWhistleblowerReportByProtocol,
    addWhistleblowerMessage
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
    try {
        const params = await context.params;
        const protocolo = params?.protocolo;

        if (!protocolo) {
            return NextResponse.json({ error: 'Protocolo não informado.' }, { status: 400 });
        }

        const report = await getWhistleblowerReportByProtocol(protocolo, false);
        if (!report) {
            return NextResponse.json({ error: 'Protocolo não encontrado.' }, { status: 404 });
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error('Error fetching protocol:', error);
        return NextResponse.json({ error: 'Erro ao consultar protocolo.' }, { status: 500 });
    }
}

export async function POST(request, context) {
    try {
        const params = await context.params;
        const protocolo = params?.protocolo;
        const body = await request.json();

        if (!protocolo || !body.message || !String(body.message).trim()) {
            return NextResponse.json({ error: 'Mensagem é obrigatória.' }, { status: 400 });
        }

        const updated = await addWhistleblowerMessage({
            protocol: protocolo,
            senderType: 'REPORTER',
            message: body.message,
            attachmentUrl: body.attachment_url || null
        });

        if (!updated) {
            return NextResponse.json({ error: 'Protocolo não encontrado.' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error posting message to protocol:', error);
        return NextResponse.json({ error: 'Erro ao enviar mensagem.' }, { status: 500 });
    }
}
