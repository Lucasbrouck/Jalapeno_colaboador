// Simple API test
export async function GET() {
    try {
        return Response.json({ test: 'working', timestamp: new Date().toISOString() });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
