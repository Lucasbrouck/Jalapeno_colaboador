import { NextResponse } from 'next/server';
import { getPendingPlataNotifications, markPlataNotificationsRead } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const notifications = await getPendingPlataNotifications(userId);
        return NextResponse.json({ notifications });
    } catch (error) {
        console.error('Error in GET /api/plata/notifications:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId, transactionIds } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
        }

        await markPlataNotificationsRead(userId, transactionIds);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in POST /api/plata/notifications:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
