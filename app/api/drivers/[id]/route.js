import { NextResponse } from 'next/server';
import { deleteDeliveryDriver } from '@/lib/db';

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const result = await deleteDeliveryDriver(id);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error deleting driver:', error);
        return NextResponse.json({
            error: error.message || 'Falha ao deletar entregador'
        }, { status: 500 });
    }
}
