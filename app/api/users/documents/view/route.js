import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { DB_PATH, getStoredFile, saveStoredFile } from '@/lib/db';

function inferContentType(filename, storedType) {
    if (storedType && storedType !== 'application/octet-stream') return storedType;
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'heic') return 'image/heic';
    if (ext === 'heif') return 'image/heif';
    if (ext === 'pdf') return 'application/pdf';
    return 'application/octet-stream';
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('file');

        if (!filename) {
            return new NextResponse('Arquivo não especificado', { status: 400 });
        }

        let data = null;
        let contentType = inferContentType(filename);

        // 1. Try persistent database storage first
        const stored = await getStoredFile(filename);
        if (stored && stored.buffer) {
            data = stored.buffer;
            contentType = inferContentType(filename, stored.contentType);
        } else {
            // 2. Fallback to local disk and auto-backfill DB
            const docPath = join(dirname(DB_PATH), 'uploads', 'documents', filename);
            const absPath = join(dirname(DB_PATH), 'uploads', 'absences', filename);
            const foundPath = existsSync(docPath) ? docPath : (existsSync(absPath) ? absPath : null);
            if (foundPath) {
                data = await readFile(foundPath);
                try {
                    await saveStoredFile(filename, 'documents', contentType, data);
                } catch (_) {}
            }
        }

        if (!data) {
            return new NextResponse('Arquivo não encontrado', { status: 404 });
        }

        return new NextResponse(data, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${filename}"`,
                'Cache-Control': 'public, max-age=31536000, immutable'
            }
        });
    } catch (error) {
        console.error('[API] Erro ao carregar documento:', error);
        return new NextResponse('Arquivo não encontrado', { status: 404 });
    }
}
