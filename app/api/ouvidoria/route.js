import { NextResponse } from 'next/server';
import {
    createWhistleblowerReport,
    getWhistleblowerReportByProtocol,
    addWhistleblowerMessage
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const protocol = searchParams.get('protocol') || searchParams.get('protocolo');

        if (!protocol) {
            return NextResponse.json({ error: 'Informe o número do protocolo para consulta.' }, { status: 400 });
        }

        const report = await getWhistleblowerReportByProtocol(protocol, false);
        if (!report) {
            return NextResponse.json({ error: 'Protocolo não encontrado. Verifique os números digitados.' }, { status: 404 });
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error('Error fetching whistleblower report:', error);
        return NextResponse.json({ error: 'Erro ao consultar protocolo.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        if (body.action === 'ADD_MESSAGE') {
            if (!body.protocol || !body.message || !String(body.message).trim()) {
                return NextResponse.json({ error: 'Protocolo e mensagem são obrigatórios.' }, { status: 400 });
            }
            const updated = await addWhistleblowerMessage({
                protocol: body.protocol,
                senderType: 'REPORTER',
                message: body.message,
                attachmentUrl: body.attachment_url || null
            });
            if (!updated) {
                return NextResponse.json({ error: 'Protocolo não encontrado.' }, { status: 404 });
            }
            return NextResponse.json(updated);
        }

        if (!body.description || String(body.description).trim().length < 10) {
            return NextResponse.json(
                { error: 'Por favor, descreva o ocorrido com pelo menos 10 caracteres.' },
                { status: 400 }
            );
        }

        const isAnonymous = body.is_anonymous === true || body.is_anonymous === 1 || body.is_anonymous === '1' || body.is_anonymous === 'true';

        // Security & NR-5 / Lei 14.457/2022 Anonymity Guarantee:
        // Request headers, cookies, and IP addresses are NEVER read or stored when isAnonymous is true.
        const cleanPayload = {
            is_anonymous: isAnonymous,
            reporter_user_id: isAnonymous ? null : (body.reporter_user_id || null),
            reporter_name: isAnonymous ? null : (body.reporter_name || null),
            reporter_contact: isAnonymous ? null : (body.reporter_contact || null),
            reporter_role: isAnonymous ? null : (body.reporter_role || null),
            company_id: body.company_id || null,
            norm_reference: body.norm_reference || 'NR5',
            category: body.category || 'OUTROS',
            severity: body.severity || 'MEDIUM',
            title: body.title || null,
            description: body.description,
            incident_date: body.incident_date || null,
            incident_location: body.incident_location || null,
            involved_people: body.involved_people || null,
            witnesses_info: body.witnesses_info || null,
            evidence_attachment: body.evidence_attachment || null
        };

        const created = await createWhistleblowerReport(cleanPayload);

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating whistleblower report:', error);
        return NextResponse.json({ error: 'Erro ao registrar relato.' }, { status: 500 });
    }
}
