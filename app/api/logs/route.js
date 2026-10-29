import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
    try {
        const body = await request.json();
        const { error, stack, url, userAgent } = body;

        const logData = {
            timestamp: new Date().toISOString(),
            url,
            userAgent,
            error,
            stack
        };

        const logEntry = JSON.stringify(logData) + '\n';
        const logPath = path.join(process.cwd(), 'client_error_log.txt');
        await fs.appendFile(logPath, logEntry, 'utf8');

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Failed to save client log:', e);
        return NextResponse.json({ error: 'Failed to save log' }, { status: 500 });
    }
}
