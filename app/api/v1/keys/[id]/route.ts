import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const apiKey = dataStore.getApiKeyById(id);
    if (!apiKey) {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    apiKey.isActive = false;
    dataStore.saveApiKey(apiKey);

    return NextResponse.json({ success: true });
}
