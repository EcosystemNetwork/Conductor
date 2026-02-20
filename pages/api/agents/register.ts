import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getStore, Agent } from '../../../lib/store';
import { processQueue } from '../../../lib/taskDispatcher';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, skills, walletAddress } = req.body ?? {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name (string) is required' });
  }
  if (!Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: 'skills (non-empty array) is required' });
  }

  const store = getStore();
  const agent: Agent = {
    id: `agent-${randomUUID()}`,
    name,
    skills,
    status: 'idle',
    tasksCompleted: 0,
    totalEarned: 0,
    walletAddress,
    health: 'healthy',
    lastHeartbeat: Date.now(),
    registeredAt: Date.now(),
  };

  store.agents.set(agent.id, agent);
  processQueue(); // assign any pending tasks to the new agent

  return res.status(201).json({ agent });
}
