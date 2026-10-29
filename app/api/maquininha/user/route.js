import { NextResponse } from 'next/server';
import { getUserByNfcId } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const nfcId = searchParams.get('nfcId');

        if (!nfcId) {
            return NextResponse.json({ error: 'NFC ID não fornecido' }, { status: 400 });
        }

        const user = await getUserByNfcId(nfcId);

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado para este cartão.' }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            plataBalance: user.plataBalance,
            showOnboarding: user.maquininhaOnboarding === 1
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
