
import { NextResponse } from 'next/server';
import { getUserById, getUserByNfcId, recordPlataUsage } from '@/lib/db';

export async function POST(request) {
    try {
        const { userId, nfcId, password, value } = await request.json();

        if (!value || parseFloat(value) <= 0) {
            return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
        }

        let user = null;

        if (nfcId) {
            // "The card is the password"
            user = await getUserByNfcId(nfcId);
            if (!user) {
                return NextResponse.json({ error: 'Cartão não registrado' }, { status: 404 });
            }
        } else if (userId) {
            user = await getUserById(userId);
            if (!user) {
                return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
            }
            if (user.password !== password) {
                return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: 'Dados de identificação ausentes' }, { status: 400 });
        }

        const amount = parseFloat(value);

        // recordPlataUsage handles balance verification and atomic debit
        const result = await recordPlataUsage(user.id, amount, 'Compra Via NFC', user.company_id);

        return NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, email: user.email, currentBalance: result.newBalance },
            transaction: { amount, date: new Date().toISOString() }
        });

    } catch (error) {
        console.error('Maquininha Error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
