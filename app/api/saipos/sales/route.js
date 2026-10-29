import { NextResponse } from 'next/server';
import { getCompanyById } from '@/lib/db';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const companyId = searchParams.get('companyId');

    if (!date) {
        return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    // Default token for backward compatibility or when not specified
    let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiJlOWQ3YzRjOS00N2FmLTZjYjMtZjRlYi1lNWE5M2FiOTJmZGIiLCJpYXQiOjE3Mzg2NzEzMDR9.m7QiFSFm6U3OWGcEg--GiSqP5eWJczR-vQqHN3pnu_w';
    let company = null;

    if (companyId) {
        company = await getCompanyById(companyId);
        if (company && company.saipos_token) {
            token = company.saipos_token;
        }
    }

    const url = `https://data.saipos.io/v1/search_sales?p_date_column_filter=shift_date&p_filter_date_start=${date}T00:00:00&p_filter_date_end=${date}T23:59:59&p_limit=300&p_offset=0`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json'
            },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ error: `Saipos API error: ${response.status}`, detail: errText }, { status: response.status });
        }

        const sales = await response.json();

        if (!Array.isArray(sales)) {
            return NextResponse.json({ dayRevenue: 0, nightRevenue: 0 });
        }

        let dayRevenue = 0;
        let nightRevenue = 0;

        sales.forEach(sale => {
            // Ignore sales of type FICHA/SENHA (id_sale_type 4) if configured
            if (company && company.ignore_ficha_venda === 1 && sale.id_sale_type === 4) {
                return;
            }

            const amount = parseFloat(sale.total_amount) || 0;
            let shift = null;

            // 1. Check store_shift
            if (sale.store_shift && sale.store_shift.desc_store_shift) {
                const desc = sale.store_shift.desc_store_shift.toLowerCase();
                if (desc.includes('dia')) {
                    shift = 'DAY';
                } else if (desc.includes('noite')) {
                    shift = 'NIGHT';
                }
            }

            // 2. Fallback to 18:00 cutoff
            if (!shift && sale.created_at) {
                const createdDate = new Date(sale.created_at);
                const hour = createdDate.getHours();
                if (hour < 18) {
                    shift = 'DAY';
                } else {
                    shift = 'NIGHT';
                }
            }

            if (shift === 'DAY') {
                dayRevenue += amount;
            } else if (shift === 'NIGHT') {
                nightRevenue += amount;
            }
        });

        return NextResponse.json({
            dayRevenue: parseFloat(dayRevenue.toFixed(2)),
            nightRevenue: parseFloat(nightRevenue.toFixed(2)),
            count: sales.length
        });

    } catch (error) {
        console.error('Saipos proxy error:', error);
        return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
    }
}
