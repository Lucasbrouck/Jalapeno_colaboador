import { NextResponse } from 'next/server';
import { getTrainingGroups, getAllTrainingGroups, createTrainingGroup, updateTrainingGroup, deleteTrainingGroup } from '../../../../lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const programId = searchParams.get('program_id');

        let groups;
        if (programId) {
            groups = await getTrainingGroups(programId);
        } else {
            // New DB function needed or just reuse/adapt? 
            // I need to add getAllGroups to db.js or just custom query here?
            // Let's add getAllTrainingGroups to db.js for consistency
            groups = await getAllTrainingGroups();
        }
        return NextResponse.json(groups);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const newGroup = await createTrainingGroup(data);
        return NextResponse.json(newGroup);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        const updatedGroup = await updateTrainingGroup(data.id, data);
        return NextResponse.json(updatedGroup);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await deleteTrainingGroup(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
