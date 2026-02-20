import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getStore, Task } from '../../../lib/store';
import { dispatchTask } from '../../../lib/taskDispatcher';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = getStore();

  if (req.method === 'GET') {
    const tasks = Array.from(store.tasks.values());
    return res.status(200).json({ tasks });
  }

  if (req.method === 'POST') {
    const { description, requiredSkills, reward, priority, maxRetries } = req.body ?? {};

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'description (string) is required' });
    }
    if (!Array.isArray(requiredSkills)) {
      return res.status(400).json({ error: 'requiredSkills (array) is required' });
    }
    if (typeof reward !== 'number' || reward < 0) {
      return res.status(400).json({ error: 'reward (non-negative number) is required' });
    }

    const parsedPriority = Math.min(5, Math.max(1, Number(priority) || 3));
    const parsedMaxRetries = Math.max(0, Number(maxRetries) || 0);

    const task: Task = {
      id: `task-${randomUUID()}`,
      description,
      requiredSkills,
      status: 'pending',
      reward,
      priority: parsedPriority,
      retryCount: 0,
      maxRetries: parsedMaxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    store.tasks.set(task.id, task);
    dispatchTask(task); // attempt immediate dispatch

    return res.status(201).json({ task });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
