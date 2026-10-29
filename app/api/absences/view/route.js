import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { DB_PATH } from '@/lib/db';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('file');

        if (!filename) {
            return new NextResponse('Arquivo não especificado', { status: 400 });
        }

        const filePath = join(dirname(DB_PATH), 'uploads', 'absences', filename);
        const data = await readFile(filePath);

        // Simple extension-based content type
        const ext = filename.split('.').pop().toLowerCase();
        let contentType = 'application/octet-stream';
        if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'gif') contentType = 'image/gif';
        else if (ext === 'heic') contentType = 'image/heic';
        else if (ext === 'heif') contentType = 'image/heif';
        else if (ext === 'pdf') contentType = 'application/pdf';

        return new NextResponse(data, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        console.error('[API] Erro ao carregar certificado:', error);
        return new NextResponse('Arquivo não encontrado', { status: 404 });
    }
}
