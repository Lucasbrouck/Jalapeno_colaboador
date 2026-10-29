import { NextResponse } from 'next/server';
import { getUserByNfcId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const nfcId = searchParams.get('nfcId');

        if (!nfcId) {
            return NextResponse.json({ error: 'NFC ID não fornecido' }, { status: 400 });
        }

        // Normalize NFC ID (remove colons, hyphens and uppercase)
        const normalizedNfcId = nfcId.replace(/[: -]/g, '').toUpperCase();
        console.log(`[NFC Identify] Input: ${nfcId} | Normalized: ${normalizedNfcId}`);

        const user = await getUserByNfcId(normalizedNfcId);

        if (!user) {
            return NextResponse.json({ error: 'Cartão não reconhecido' }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            name: user.name,
            role: user.role,
            plataBalance: user.plataBalance,
            company_id: user.company_id
        });

    } catch (error) {
        console.error('NFC Identify API Error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
