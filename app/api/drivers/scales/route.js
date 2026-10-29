import { NextResponse } from 'next/server';
import { getDriverScales, createDriverScale, deleteDriverScale } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const scales = await getDriverScales();
        return NextResponse.json(scales);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const scale = await request.json();
        if (!scale.start_time || !scale.end_time) {
            return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
        }
        const newScale = await createDriverScale(scale);
        return NextResponse.json(newScale);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        await deleteDriverScale(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
