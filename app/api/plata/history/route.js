import { NextResponse } from 'next/server';
import { getPlataHistory } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({
                error: 'userId is required'
            }, { status: 400 });
        }

        const history = await getPlataHistory(userId);

        return NextResponse.json(history);

    } catch (error) {
        console.error('Error in /api/plata/history:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
