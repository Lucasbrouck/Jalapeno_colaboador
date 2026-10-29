import { NextResponse } from 'next/server';
import { adjustUserPlata } from '@/lib/db';

export async function POST(request) {
    try {
        const { userId, amount, type, description } = await request.json();

        // Validate inputs
        if (!userId || !amount || !type || !description) {
            return NextResponse.json({
                success: false,
                error: 'Dados incompletos'
            }, { status: 400 });
        }

        if (amount <= 0) {
            return NextResponse.json({
                success: false,
                error: 'Valor deve ser maior que zero'
            }, { status: 400 });
        }

        if (description.trim() === '') {
            return NextResponse.json({
                success: false,
                error: 'Descrição é obrigatória'
            }, { status: 400 });
        }

        const newBalance = await adjustUserPlata({ userId, amount, type, description });

        return NextResponse.json({
            success: true,
            balance: newBalance
        });

    } catch (error) {
        console.error('Error in /api/plata:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro ao processar transação'
        }, { status: 500 });
    }
}
