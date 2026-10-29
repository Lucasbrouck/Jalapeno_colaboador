
import { NextResponse } from 'next/server';
import { getStreaksConfig, updateStreaksConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json(await getStreaksConfig());
}

export async function POST(request) {
    try {
        const config = await request.json();
        await updateStreaksConfig(config);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
