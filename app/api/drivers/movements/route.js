import { NextResponse } from 'next/server';
import { getDriverMovements } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('driverId');

        if (!driverId) {
            return NextResponse.json({ error: 'driverId is required' }, { status: 400 });
        }

        const movements = await getDriverMovements(driverId);
        return NextResponse.json(movements);
    } catch (error) {
        console.error('Error fetching movements:', error);
        return NextResponse.json({ error: 'Failed to fetch movements: ' + error.message }, { status: 500 });
    }
}
