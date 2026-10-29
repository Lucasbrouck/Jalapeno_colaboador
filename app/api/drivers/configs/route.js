import { NextResponse } from 'next/server';
import { getDriverConfigs, updateDriverConfigs } from '@/lib/db';

export async function GET() {
    try {
        const configs = await getDriverConfigs();
        return NextResponse.json(configs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const configs = await request.json();
        await updateDriverConfigs(configs);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
