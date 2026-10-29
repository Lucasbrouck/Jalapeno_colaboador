import { NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request, { params }) {
    try {
        const { id } = await params;

        // TODO: In a real app, verify Admin session here

        const user = await getUserById(id);

        if (!user) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            );
        }

        const token = randomUUID();
        // Expires in 24 hours
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await updateUser(user.id, {
            resetToken: token,
            resetTokenExpires: expires
        });

        // In production, use the actual domain from env
        // For local/railway, we can try to infer or just return the token/path
        const resetLink = `/reset-password?token=${token}`;

        return NextResponse.json({
            success: true,
            link: resetLink,
            token: token
        });

    } catch (error) {
        console.error('Reset link error:', error);
        return NextResponse.json(
            { error: 'Erro ao gerar link' },
            { status: 500 }
        );
    }
}
