import { getStore, Agent, ApiKey } from './store';

export const dataStore = {
    getAllAgents(): Agent[] {
        return Array.from(getStore().agents.values());
    },
    getAllApiKeys(): ApiKey[] {
        return Array.from(getStore().apiKeys.values());
    },
    getApiKeyById(id: string): ApiKey | undefined {
        return getStore().apiKeys.get(id);
    },
    getApiKeyByValue(key: string): ApiKey | undefined {
        return Array.from(getStore().apiKeys.values()).find(k => k.key === key);
    },
    saveApiKey(apiKey: ApiKey): void {
        getStore().apiKeys.set(apiKey.id, apiKey);
    },
    deleteApiKey(id: string): boolean {
        return getStore().apiKeys.delete(id);
    },
};
