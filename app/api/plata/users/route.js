import { getUsersForTransfer } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const currentUserId = searchParams.get('currentUserId');


        if (!currentUserId) {
            return Response.json(
                { success: false, error: 'currentUserId é obrigatório' },
                { status: 400 }
            );
        }

        const users = await getUsersForTransfer(currentUserId);

        return Response.json(users);

    } catch (error) {
        return Response.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
