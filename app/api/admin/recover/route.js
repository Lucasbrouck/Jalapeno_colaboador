import { NextResponse } from 'next/server';
import { recoverNightShiftsByDates } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        // Proteção simples usando a mesma chave do backup
        if (!key || key !== 'lucas-backup-2024') {
            return new NextResponse('Não autorizado', { status: 401 });
        }

        const dates = ['2026-04-05', '2026-04-07'];
        const results = await recoverNightShiftsByDates(dates);

        return NextResponse.json({ 
            success: true, 
            message: 'Processamento concluído',
            results 
        });

    } catch (error) {
        console.error('Erro na API de Recuperação:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}
