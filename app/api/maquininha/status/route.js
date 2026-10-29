import { NextResponse } from 'next/server';
import { getUserByEmail, getUserById, updateUser } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email não fornecido' }, { status: 400 });
        }

        const user = await getUserByEmail(email);

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            showOnboarding: user.maquininhaOnboarding === 0 || !user.maquininhaOnboarding
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID não fornecido' }, { status: 400 });
        }

        const user = await getUserById(userId);

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // Set maquininhaOnboarding to 1 (Done)
        await updateUser(user.id, { maquininhaOnboarding: 1 });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
