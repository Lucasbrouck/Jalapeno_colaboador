import { NextResponse } from 'next/server';
import { getTrainingPrograms, createTrainingProgram, updateTrainingProgram, deleteTrainingProgram } from '../../../../lib/db';

export async function GET() {
    try {
        const programs = await getTrainingPrograms();
        return NextResponse.json(programs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const newProgram = await createTrainingProgram(data);
        return NextResponse.json(newProgram);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        const updatedProgram = await updateTrainingProgram(data.id, data);
        return NextResponse.json(updatedProgram);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await deleteTrainingProgram(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
