import { getShifts } from '@/lib/db';

export async function GET() {
    try {
        console.log('[TEST-SHIFTS] Starting getShifts test...');
        const shifts = await getShifts();
        console.log('[TEST-SHIFTS] getShifts returned:', typeof shifts, Array.isArray(shifts));
        return Response.json({ count: shifts?.length, shifts });
    } catch (error) {
        console.error('[TEST-SHIFTS] Error:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
