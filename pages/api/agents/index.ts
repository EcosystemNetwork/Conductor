import { NextApiRequest, NextApiResponse } from 'next';
import { getStore, computeHealth } from '../../../lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const store = getStore();
  const agents = Array.from(store.agents.values()).map((a) => ({
    ...a,
    health: computeHealth(a.lastHeartbeat),
  }));

  return res.status(200).json({ agents });
}
