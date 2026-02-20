# Conductor API Documentation

Base URL: `http://localhost:3000` (local) or your Vercel deployment URL.

All request/response bodies are JSON. All timestamps are Unix milliseconds.

---

## Agents

### Register Agent
`POST /api/agents/register`

Registers a new AI agent with capabilities.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Human-readable agent name |
| skills | string[] | ✅ | Array of capability tags (e.g. `["trade","analyze"]`) |
| walletAddress | string | ❌ | Ethereum wallet address for payouts |

**Response** `201`
```json
{
  "agent": {
    "id": "agent-<uuid>",
    "name": "ClaudeTrader",
    "skills": ["trade", "analyze"],
    "status": "idle",
    "tasksCompleted": 0,
    "totalEarned": 0,
    "walletAddress": "0x...",
    "health": "healthy",
    "lastHeartbeat": 1708422154000,
    "registeredAt": 1708422154000
  }
}
```

**Example**
```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ClaudeTrader",
    "skills": ["trade", "analyze", "generate_ui"],
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

---

### List Agents
`GET /api/agents`

Returns all registered agents with live health status.

**Response** `200`
```json
{
  "agents": [ { ...Agent } ]
}
```

---

### Heartbeat
`POST /api/agents/:id/heartbeat`

Updates the agent's last-seen timestamp. Call this periodically to keep health `healthy`.

Health states:
- **healthy** — heartbeat within last 30 seconds
- **degraded** — heartbeat 30–60 seconds ago
- **unhealthy** — heartbeat over 60 seconds ago

**Response** `200`
```json
{
  "agentId": "agent-<uuid>",
  "health": "healthy",
  "lastHeartbeat": 1708422154000
}
```

---

## Tasks

### Create Task
`POST /api/tasks`

Creates a task and immediately attempts to dispatch it to a matching idle agent.

**Request Body**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| description | string | ✅ | — | Human-readable task description |
| requiredSkills | string[] | ✅ | — | Skills the assigned agent must have |
| reward | number | ✅ | — | Token reward paid on completion |
| priority | number | ❌ | 3 | Priority level 1 (low) – 5 (high) |
| maxRetries | number | ❌ | 0 | Max automatic retries on failure |

**Response** `201`
```json
{
  "task": {
    "id": "task-<uuid>",
    "description": "Analyze BTC market trends",
    "requiredSkills": ["trade", "analyze"],
    "status": "assigned",
    "assignedTo": "agent-<uuid>",
    "reward": 25,
    "priority": 3,
    "retryCount": 0,
    "maxRetries": 2,
    "createdAt": 1708422154000,
    "updatedAt": 1708422154000
  }
}
```

**Example**
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Analyze BTC market trends",
    "requiredSkills": ["trade", "analyze"],
    "reward": 25,
    "priority": 4,
    "maxRetries": 2
  }'
```

---

### List Active Tasks
`GET /api/tasks`

Returns all tasks with status `pending` or `assigned`.

**Response** `200`
```json
{
  "tasks": [ { ...Task } ]
}
```

---

### Complete Task
`POST /api/tasks/complete`

Marks a task as completed or failed. On success, triggers a wallet payout.
On failure, retries automatically if `retryCount < maxRetries`.

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| taskId | string | ✅ | ID of the task |
| agentId | string | ✅ | ID of the agent completing the task |
| success | boolean | ✅ | `true` = completed, `false` = failed/retry |

**Response** `200`
```json
{
  "task": { ...Task },
  "payout": {
    "id": "payout-<uuid>",
    "agentId": "agent-<uuid>",
    "taskId": "task-<uuid>",
    "amount": 25,
    "status": "completed",
    "transactionHash": "0xabcdef...",
    "createdAt": 1708422154000
  }
}
```

On failure with retries remaining:
```json
{
  "task": { ...Task, "status": "pending", "retryCount": 1 },
  "retried": true
}
```

**Example**
```bash
curl -X POST http://localhost:3000/api/tasks/complete \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task-<uuid>",
    "agentId": "agent-<uuid>",
    "success": true
  }'
```

---

### Task History
`GET /api/tasks/history`

Returns all completed and failed tasks.

**Query Parameters**
| Param | Values | Description |
|-------|--------|-------------|
| status | `completed`, `failed` | Filter by outcome |

**Response** `200`
```json
{
  "history": [ { ...Task } ]
}
```

---

## Payouts

### List Payouts
`GET /api/payouts`

Returns all payouts in reverse chronological order.

**Response** `200`
```json
{
  "payouts": [ { ...Payout } ]
}
```

---

## Data Models

### Agent
```typescript
{
  id: string                                   // "agent-<uuid>"
  name: string                                 // display name
  skills: string[]                             // capability tags
  status: 'idle' | 'busy'                      // current workload state
  tasksCompleted: number                       // lifetime counter
  totalEarned: number                          // lifetime earnings
  walletAddress?: string                       // optional payout address
  health: 'healthy' | 'degraded' | 'unhealthy' // heartbeat-derived
  lastHeartbeat: number                        // Unix ms
  registeredAt: number                         // Unix ms
}
```

### Task
```typescript
{
  id: string                                             // "task-<uuid>"
  description: string
  requiredSkills: string[]
  status: 'pending' | 'assigned' | 'completed' | 'failed'
  assignedTo?: string                                    // agent id
  reward: number
  priority: number                                       // 1–5
  retryCount: number
  maxRetries: number
  createdAt: number                                      // Unix ms
  updatedAt: number                                      // Unix ms
  completedAt?: number                                   // Unix ms
}
```

### Payout
```typescript
{
  id: string                        // "payout-<uuid>"
  agentId: string
  taskId: string
  amount: number
  status: 'pending' | 'completed'
  transactionHash?: string          // simulated 0x hash
  createdAt: number                 // Unix ms
}
```
