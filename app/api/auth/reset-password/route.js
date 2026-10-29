import { NextResponse } from 'next/server';
import { getUserByResetToken, updateUser } from '@/lib/db';

export async function POST(request) {
    try {
        const { token, password, confirmPassword } = await request.json();

        if (!token || !password || !confirmPassword) {
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

        const user = await getUserByResetToken(token);

        if (!user) {
            return NextResponse.json(
                { error: 'Link inválido ou expirado' },
                { status: 400 }
            );
        }

        // Check expiration
        if (new Date() > new Date(user.resetTokenExpires)) {
            return NextResponse.json(
                { error: 'Link expirado. Solicite um novo ao administrador.' },
                { status: 400 }
            );
        }

        // Update user
        await updateUser(user.id, {
            password,
            resetToken: null,
            resetTokenExpires: null,
            isFirstAccess: false // Also clears first access if they reset password
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Erro ao redefinir senha' },
            { status: 500 }
        );
    }
}
