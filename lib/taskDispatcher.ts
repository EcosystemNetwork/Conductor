import { getStore, Agent, Task } from './store';

/** Find the best idle, healthy agent whose skills satisfy the task requirements. */
export function findMatchingAgent(task: Task): Agent | null {
  const store = getStore();
  const candidates = Array.from(store.agents.values()).filter(
    (a) =>
      a.status === 'idle' &&
      a.health !== 'unhealthy' &&
      task.requiredSkills.every((s) => a.skills.includes(s))
  );
  return candidates.length > 0 ? candidates[0] : null;
}

/** Assign a task to a matching agent. Returns true if dispatched. */
export function dispatchTask(task: Task): boolean {
  const store = getStore();
  const agent = findMatchingAgent(task);
  if (!agent) return false;

  agent.status = 'busy';
  task.status = 'assigned';
  task.assignedTo = agent.id;
  task.updatedAt = Date.now();
  store.tasks.set(task.id, task);
  return true;
}

/**
 * Process all pending tasks in priority order (highest first).
 * Returns the number of tasks dispatched.
 */
export function processQueue(): number {
  const store = getStore();
  const pending = Array.from(store.tasks.values())
    .filter((t) => t.status === 'pending')
    .sort((a, b) => b.priority - a.priority);

  let dispatched = 0;
  for (const task of pending) {
    if (dispatchTask(task)) dispatched++;
  }
  return dispatched;
}
