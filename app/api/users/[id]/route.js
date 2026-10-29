import { NextResponse } from 'next/server';
import { getUserById, deleteUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const user = await getUserById(id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in GET /api/users/[id]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        // Use the centralized deleteUser function which handles cascading
        await deleteUser(id);

        // Check if user is gone (deleteUser doesn't return count, but we can verify)
        // Actually deleteUser in db.js was updated to return result. Let's assume void or check user.
        // My recent edit to db.js returned `stmt.run(id)`, so it returns RunResult.
        // However, I can't await it effectively here if it's synchronous in db.js (better-sqlite3 is sync).
        // Since deleteUser throws if db fails, we are good. 

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
