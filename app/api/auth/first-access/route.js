import { NextResponse } from 'next/server';
import { getUserByEmail, updateUser } from '@/lib/db';

export async function POST(request) {
    try {
        const { email, password, confirmPassword } = await request.json();

        if (!email || !password || !confirmPassword) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: 'As senhas não coincidem' },
                { status: 400 }
            );
        }

        const user = await getUserByEmail(email);

        if (!user) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        if (!user.isFirstAccess) {
            return NextResponse.json(
                { error: 'Este usuário já realizou o primeiro acesso. Use a redefinição de senha ou contate o administrador.' },
                { status: 403 }
            );
        }

        // Update user
        await updateUser(user.id, {
            password,
            isFirstAccess: false
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('First access error:', error);
        return NextResponse.json(
            { error: 'Erro ao processar primeiro acesso' },
            { status: 500 }
        );
    }
}
