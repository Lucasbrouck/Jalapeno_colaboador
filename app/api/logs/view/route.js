import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request) {
    try {
        const logPath = path.join(process.cwd(), 'client_error_log.txt');
        
        try {
            const data = await fs.readFile(logPath, 'utf8');
            const lines = data.trim().split('\n').filter(Boolean);
            const logs = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return { error: 'Failed to parse line', raw: line, timestamp: new Date().toISOString() };
                }
            });
            
            // Return latest logs first
            return NextResponse.json(logs.reverse());
        } catch (fileError) {
            if (fileError.code === 'ENOENT') {
                return NextResponse.json([]); // No logs yet
            }
            throw fileError;
        }
    } catch (e) {
        console.error('Failed to read client logs:', e);
        return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 });
    }
}
