import { NextResponse } from 'next/server';
import { getDeliveryDrivers, createDeliveryDriver } from '@/lib/db';

export async function GET(request) {
    try {
        const drivers = await getDeliveryDrivers();
        return NextResponse.json(drivers);
    } catch (error) {
        console.error('Error fetching drivers:', error);
        return NextResponse.json({ error: 'Failed to fetch drivers: ' + error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const driver = await request.json();

        if (!driver.name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const newDriver = await createDeliveryDriver(driver);
        return NextResponse.json(newDriver);
    } catch (error) {
        console.error('Error creating driver:', error);
        return NextResponse.json({ error: 'Failed to create driver: ' + error.message }, { status: 500 });
    }
}
