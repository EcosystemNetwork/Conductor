import { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../../lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const store = getStore();
  const { status } = req.query;

  let history = [...store.taskHistory];
  if (status === 'completed' || status === 'failed') {
    history = history.filter((t) => t.status === status);
  }

  return res.status(200).json({ history });
}
