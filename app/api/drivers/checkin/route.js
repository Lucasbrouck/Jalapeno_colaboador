import { NextResponse } from 'next/server';
import { createDriverCheckin, getDriverCheckins, deleteDriverCheckin } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const checkins = await getDriverCheckins(date, startDate, endDate);
        return NextResponse.json(checkins);
    } catch (error) {
        console.error('Error fetching checkins:', error);
        return NextResponse.json({ error: 'Failed to fetch checkins: ' + error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const checkin = await request.json();

        if (!checkin.driver_id || !checkin.status || !checkin.date) {
            return NextResponse.json({ error: 'driver_id, status and date are required' }, { status: 400 });
        }

        const newCheckin = await createDriverCheckin(checkin);
        return NextResponse.json(newCheckin);
    } catch (error) {
        console.error('Error creating checkin:', error);
        return NextResponse.json({ error: 'Failed to create checkin: ' + error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const driverId = searchParams.get('driverId');
        const date = searchParams.get('date');

        if (!driverId || !date) {
            return NextResponse.json({ error: 'driverId and date are required' }, { status: 400 });
        }

        const result = await deleteDriverCheckin(driverId, date);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error deleting checkin:', error);
        return NextResponse.json({ error: 'Failed to delete checkin: ' + error.message }, { status: 500 });
    }
}
