import { NextApiRequest, NextApiResponse } from 'next';
import { getStore } from '../../../lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const store = getStore();
  const payouts = Array.from(store.payouts.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  return res.status(200).json({ payouts });
}
