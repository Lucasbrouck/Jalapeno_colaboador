import { NextResponse } from 'next/server';
import { getTrainingLevels, createTrainingLevel, updateTrainingLevel, deleteTrainingLevel } from '../../../../lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const groupId = searchParams.get('group_id');

        const levels = await getTrainingLevels(groupId) || [];
        return NextResponse.json(levels);
    } catch (error) {
        console.error('FATAL ERROR in /api/training/levels:', error);
        // Return empty array and 200 to AVOID frontend crash, but keep the status in the body for debugging
        return NextResponse.json([], {
            status: 200, // Returning 200 with empty array prevents the .map() crash
            headers: { 'X-Error': error.message }
        });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();

        // Basic validation
        if (!data.name || !data.order_index) {
            return NextResponse.json({ error: 'Name and Order Index are required' }, { status: 400 });
        }

        const newLevel = await createTrainingLevel(data);
        return NextResponse.json(newLevel);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();

        if (!data.id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const updated = await updateTrainingLevel(data.id, data);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        await deleteTrainingLevel(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
