import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { DB_PATH, saveStoredFile } from '@/lib/db';

function inferContentType(filename, mimeType) {
    if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
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

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${timestamp}-${safeName}`;
        const contentType = inferContentType(filename, file.type);

        // 1. Persist permanently in database (PostgreSQL / SQLite)
        await saveStoredFile(filename, 'documents', contentType, buffer);

        // 2. Also write to local disk cache
        try {
            const uploadDir = join(dirname(DB_PATH), 'uploads', 'documents');
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }
            const path = join(uploadDir, filename);
            await writeFile(path, buffer);
        } catch (_) {}

        return NextResponse.json({
            success: true,
            filename: filename,
            url: `/api/users/documents/view?file=${filename}`
        });
    } catch (error) {
        console.error('[API] Erro no upload de documento:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
