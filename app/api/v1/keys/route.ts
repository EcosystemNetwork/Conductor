import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { dataStore } from '@/lib/dataStore';
import { ApiKey } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
    const keys = dataStore.getAllApiKeys().map(({ key: _key, ...rest }) => rest);
    return NextResponse.json({ keys });
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const id = randomUUID();
    const rawKey = `cnd_${randomUUID().replace(/-/g, '')}`;

    const apiKey: ApiKey = {
        id,
        key: rawKey,
        name,
        isActive: true,
        createdAt: Date.now(),
        permissions: ['read', 'write'],
    };

    dataStore.saveApiKey(apiKey);

    return NextResponse.json({ key: rawKey, id }, { status: 201 });
}
