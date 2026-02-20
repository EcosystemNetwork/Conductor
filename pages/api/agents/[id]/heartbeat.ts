import { NextApiRequest, NextApiResponse } from 'next';
import { getStore, computeHealth } from '../../../../lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid agent id' });
  }

  const store = getStore();
  const agent = store.agents.get(id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agent.lastHeartbeat = Date.now();
  agent.health = computeHealth(agent.lastHeartbeat);

  return res.status(200).json({ agentId: id, health: agent.health, lastHeartbeat: agent.lastHeartbeat });
}
