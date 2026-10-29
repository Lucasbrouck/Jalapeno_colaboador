import { getPDIModels, createPDIModel } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const models = await getPDIModels();
        return NextResponse.json(models);
    } catch (error) {
        console.error('Error fetching PDI models:', error);
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { title, description } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        const created = await createPDIModel({ title, description });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Error creating PDI model:', error);
        return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
    }
}
