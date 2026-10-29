import { NextResponse } from 'next/server';
import { getStoreItems, createStoreItem, updateStoreItem } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');
        const includeInactive = searchParams.get('admin') === 'true';

        if (!companyId) {
            return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }

        const items = await getStoreItems(companyId, includeInactive);
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error in GET /api/store/items:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { id, name, description, price, icon, company_id, active } = body;

        if (id) {
            // Update
            const updated = await updateStoreItem(id, { name, description, price, icon, active });
            return NextResponse.json(updated);
        } else {
            // Create
            if (!name || !price || !company_id) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }
            const newItem = await createStoreItem({ name, description, price, icon, company_id });
            return NextResponse.json(newItem);
        }
    } catch (error) {
        console.error('Error in POST /api/store/items:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
