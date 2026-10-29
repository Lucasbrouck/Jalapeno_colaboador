import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { DB_PATH } from '@/lib/db';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(dirname(DB_PATH), 'uploads', 'absences');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Clean filename and add timestamp
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filename = `${timestamp}-${safeName}`;

        const path = join(uploadDir, filename);
        await writeFile(path, buffer);

        console.log(`[API] Certificado enviado: ${path}`);

        return NextResponse.json({
            success: true,
            filename: filename,
            url: `/api/absences/view?file=${filename}`
        });
    } catch (error) {
        console.error('[API] Erro no upload de certificado:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
