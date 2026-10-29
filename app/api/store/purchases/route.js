import { NextResponse } from 'next/server';
import { getStorePurchases, purchaseStoreItem, updatePurchaseStatus } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');
        const userId = searchParams.get('userId');

        if (!companyId) {
            return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }

        const purchases = await getStorePurchases(companyId, userId);
        return NextResponse.json(purchases);
    } catch (error) {
        console.error('Error in GET /api/store/purchases:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, itemId, companyId } = body;

        if (!userId || !itemId || !companyId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const purchase = await purchaseStoreItem(userId, itemId, companyId);
        return NextResponse.json(purchase);
    } catch (error) {
        console.error('Error in POST /api/store/purchases:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { purchaseId, status } = body;

        if (!purchaseId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const updated = await updatePurchaseStatus(purchaseId, status);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error in PUT /api/store/purchases:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
