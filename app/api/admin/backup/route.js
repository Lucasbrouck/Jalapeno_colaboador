import { NextResponse } from 'next/server';
import { existsSync, createReadStream, statSync } from 'fs';
import { DB_PATH, checkpointDatabaseForBackup } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        // Chave de segurança simples
        // Recomendado: Mover para uma variável de ambiente (process.env.BACKUP_KEY)
        if (!key || key !== 'lucas-backup-2024') {
            return new NextResponse('Não autorizado', { status: 401 });
        }

        if (!existsSync(DB_PATH)) {
            console.error('Arquivo de banco não encontrado:', DB_PATH);
            return new NextResponse('Arquivo de banco não encontrado', { status: 404 });
        }

        // Flush WAL to main database file before streaming backup
        await checkpointDatabaseForBackup();

        const fileStats = statSync(DB_PATH);
        const fileStream = createReadStream(DB_PATH);

        // Retorna o arquivo como um stream para evitar sobrecarga de memória
        return new NextResponse(fileStream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename=backup-rewards.db',
                'Content-Length': fileStats.size.toString(),
            },
        });
    } catch (error) {
        console.error('Erro no backup:', error);
        return new NextResponse('Erro interno ao gerar backup', { status: 500 });
    }
}
