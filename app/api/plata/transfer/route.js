import { transferPlata } from '@/lib/db';

export async function POST(request) {
    try {
        const { fromUserId, toUserId, amount, description, password } = await request.json();

        // Validate input
        if (!fromUserId || !toUserId || !amount || !password) {
            return Response.json(
                { success: false, error: 'Campos obrigatórios faltando' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return Response.json(
                { success: false, error: 'Valor deve ser maior que zero' },
                { status: 400 }
            );
        }

        // Perform transfer
        const result = await transferPlata(fromUserId, toUserId, amount, description, password);

        return Response.json({
            success: true,
            transaction: result
        });

    } catch (error) {
        return Response.json(
            { success: false, error: error.message },
            { status: 400 }
        );
    }
}
