import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getStore } from '../../../lib/store';
import { dispatchTask } from '../../../lib/taskDispatcher';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskId, agentId, success } = req.body ?? {};

  if (!taskId || !agentId) {
    return res.status(400).json({ error: 'taskId and agentId are required' });
  }

  const store = getStore();
  const task = store.tasks.get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const agent = store.agents.get(agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  if (task.assignedTo !== agentId) {
    return res.status(403).json({ error: 'Task is not assigned to this agent' });
  }

  const now = Date.now();

  if (success) {
    task.status = 'completed';
    task.completedAt = now;
    task.updatedAt = now;

    agent.status = 'idle';
    agent.tasksCompleted += 1;
    agent.totalEarned += task.reward;

    // Generate payout
    const payout = {
      id: `payout-${randomUUID()}`,
      agentId,
      taskId,
      amount: task.reward,
      status: 'completed' as const,
      transactionHash: `0x${randomUUID().replace(/-/g, '')}`,
      createdAt: now,
    };
    store.payouts.set(payout.id, payout);

    // Move to history
    store.taskHistory.push({ ...task });
    store.tasks.delete(taskId);

    return res.status(200).json({ task, payout });
  } else {
    // Handle failure + retry
    if (task.retryCount < task.maxRetries) {
      task.retryCount += 1;
      task.status = 'pending';
      task.assignedTo = undefined;
      task.updatedAt = now;
      agent.status = 'idle';
      dispatchTask(task); // re-dispatch immediately
      return res.status(200).json({ task, retried: true });
    }

    task.status = 'failed';
    task.completedAt = now;
    task.updatedAt = now;
    agent.status = 'idle';

    store.taskHistory.push({ ...task });
    store.tasks.delete(taskId);

    return res.status(200).json({ task, retried: false });
  }
}
