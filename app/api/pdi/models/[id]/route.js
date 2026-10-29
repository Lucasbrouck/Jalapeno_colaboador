import { deletePDIModel, updatePDIModel } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
        }

        const result = await deletePDIModel(id);

        if (!result.deleted) {
            if (result.reason === 'LINKED_EVALUATIONS') {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ error: result.error || 'Model not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting PDI model:', error);
        return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { title, description } = body;

        if (!id) {
            return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
        }

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const result = await updatePDIModel(id, { title, description });

        if (!result.updated) {
            return NextResponse.json({ error: 'Model not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, id, title, description });

    } catch (error) {
        console.error('Error updating PDI model:', error);
        return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
    }
}
