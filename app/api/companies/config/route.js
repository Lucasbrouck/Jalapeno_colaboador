import { NextResponse } from 'next/server';
import { getCompanyById, updateCompany } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        if (!companyId) {
            return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }

        const company = await getCompanyById(companyId);
        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        return NextResponse.json({
            latitude: company.latitude,
            longitude: company.longitude,
            checkinRadius: company.checkinRadius,
            saipos_token: company.saipos_token,
            ignore_ficha_venda: company.ignore_ficha_venda === 1
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { companyId, latitude, longitude, checkinRadius, saipos_token, ignore_ficha_venda } = body;

        if (!companyId) {
            return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
        }

        const updated = await updateCompany(companyId, {
            latitude,
            longitude,
            checkinRadius,
            saipos_token,
            ignore_ficha_venda
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
