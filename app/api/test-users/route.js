import { getUsers } from '@/lib/db';

export async function GET() {
    try {
        const users = await getUsers();
        return Response.json({ count: users.length, users });
    } catch (error) {
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
