import { NextResponse } from 'next/server';
import { cancelDriverCheckin } from '@/lib/db';

export async function POST(request) {
    try {
        const { id, reason } = await request.json();

        if (!id || !reason) {
            return NextResponse.json({ error: 'id and reason are required' }, { status: 400 });
        }

        const result = await cancelDriverCheckin(id, reason);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error cancelling checkin:', error);
        return NextResponse.json({ error: 'Failed to cancel checkin: ' + error.message }, { status: 500 });
    }
}
