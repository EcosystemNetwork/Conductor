// In-memory data store for the Conductor agent network.
// Uses a global singleton so state persists across Next.js API route calls in dev.

export interface Agent {
  id: string;
  name: string;
  skills: string[];
  status: 'idle' | 'busy';
  tasksCompleted: number;
  totalEarned: number;
  walletAddress?: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastHeartbeat: number;
  registeredAt: number;
}

export interface Task {
  id: string;
  description: string;
  requiredSkills: string[];
  status: 'pending' | 'assigned' | 'completed' | 'failed';
  assignedTo?: string;
  reward: number;
  priority: number; // 1 (low) – 5 (high)
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface Payout {
  id: string;
  agentId: string;
  taskId: string;
  amount: number;
  status: 'pending' | 'completed';
  transactionHash?: string;
  createdAt: number;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  ownerWallet?: string;
  createdAt: number;
  lastUsedAt?: number;
  isActive: boolean;
  permissions: string[];
}

interface Store {
  agents: Map<string, Agent>;
  tasks: Map<string, Task>;
  payouts: Map<string, Payout>;
  taskHistory: Task[];
  apiKeys: Map<string, ApiKey>;
}

declare global {
  // eslint-disable-next-line no-var
  var _conductorStore: Store | undefined;
}

function createStore(): Store {
  return {
    agents: new Map(),
    tasks: new Map(),
    payouts: new Map(),
    taskHistory: [],
    apiKeys: new Map(),
  };
}

export function getStore(): Store {
  if (!global._conductorStore) {
    global._conductorStore = createStore();
  }
  return global._conductorStore;
}

/** Compute agent health from last heartbeat timestamp. */
export function computeHealth(lastHeartbeat: number): Agent['health'] {
  const age = Date.now() - lastHeartbeat;
  if (age < 30_000) return 'healthy';
  if (age < 60_000) return 'degraded';
  return 'unhealthy';
}
