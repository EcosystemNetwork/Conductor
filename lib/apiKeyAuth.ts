import { NextRequest } from 'next/server';
import { dataStore } from './dataStore';
import { ApiKey } from './store';

export async function validateApiKey(request: NextRequest): Promise<ApiKey | null> {
    const key = request.headers.get('x-api-key');
    if (!key) return null;

    const apiKey = dataStore.getApiKeyByValue(key);
    if (!apiKey || !apiKey.isActive) return null;

    // Update last used timestamp
    apiKey.lastUsedAt = Date.now();
    dataStore.saveApiKey(apiKey);

    return apiKey;
}
