import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { Agent, Task, Payout } from '../lib/store';

const WalletConnect = dynamic(() => import('../components/WalletConnect'), { ssr: false });

// ── colour tokens (match index.html design language) ──────────────────────────
const C = {
  dark:    '#06060A',
  dark2:   '#0C0C14',
  dark3:   '#13131E',
  dark4:   '#1A1A28',
  gray:    '#7878A0',
  light:   '#EEEEF6',
  cyan:    '#00D4FF',
  blue:    '#4D6BFF',
  purple:  '#A855F7',
  magenta: '#E040A0',
  coral:   '#FF6B6B',
  amber:   '#FFB340',
  green:   '#22C55E',
  red:     '#EF4444',
  yellow:  '#EAB308',
};

// ── tiny helper components ────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 100,
      fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>{label}</span>
  );
}

function HealthDot({ health }: { health: Agent['health'] }) {
  const color = health === 'healthy' ? C.green : health === 'degraded' ? C.amber : C.red;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12, color }}>{health}</span>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const colors = ['', C.gray, C.cyan, C.blue, C.amber, C.coral];
  return <Badge label={`P${priority}`} color={colors[priority] ?? C.gray} />;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: C.dark2, border: `1px solid ${color}33`,
      borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: C.gray, marginTop: 4, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ── form helpers ──────────────────────────────────────────────────────────────

function useForm<T extends Record<string, string>>(init: T) {
  const [values, setValues] = useState(init);
  const set = (k: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const reset = () => setValues(init);
  return { values, set, reset };
}

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [agents, setAgents]   = useState<Agent[]>([]);
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [history, setHistory] = useState<Task[]>([]);
  const [error, setError]     = useState('');
  const [notice, setNotice]   = useState('');

  const refresh = useCallback(async () => {
    try {
      const [a, t, p, h] = await Promise.all([
        fetch('/api/agents').then((r) => r.json()),
        fetch('/api/tasks').then((r) => r.json()),
        fetch('/api/payouts').then((r) => r.json()),
        fetch('/api/tasks/history').then((r) => r.json()),
      ]);
      setAgents(a.agents ?? []);
      setTasks(t.tasks ?? []);
      setPayouts(p.payouts ?? []);
      setHistory(h.history ?? []);
    } catch {
      // silently retry on next tick
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3500); };
  const showError  = (msg: string) => { setError(msg);  setTimeout(() => setError(''),  4000); };

  // register agent form
  const agentForm = useForm({ name: '', skills: '', wallet: '' });

  async function registerAgent(e: React.FormEvent) {
    e.preventDefault();
    const skills = agentForm.values.skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (!agentForm.values.name || skills.length === 0) {
      showError('Name and at least one skill are required.');
      return;
    }
    const data = await post('/api/agents/register', {
      name: agentForm.values.name, skills,
      walletAddress: agentForm.values.wallet || undefined,
    });
    if (data.error) { showError(data.error); return; }
    agentForm.reset();
    showNotice(`✓ Agent "${data.agent.name}" registered (${data.agent.id})`);
    refresh();
  }

  // create task form
  const taskForm = useForm({ desc: '', skills: '', reward: '10', priority: '3', maxRetries: '0' });

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    const skills = taskForm.values.skills.split(',').map((s) => s.trim()).filter(Boolean);
    const reward = parseFloat(taskForm.values.reward);
    if (!taskForm.values.desc) { showError('Description is required.'); return; }
    if (isNaN(reward) || reward < 0) { showError('Reward must be a non-negative number.'); return; }
    const data = await post('/api/tasks', {
      description: taskForm.values.desc,
      requiredSkills: skills,
      reward,
      priority: parseInt(taskForm.values.priority, 10),
      maxRetries: parseInt(taskForm.values.maxRetries, 10),
    });
    if (data.error) { showError(data.error); return; }
    taskForm.reset();
    showNotice(`✓ Task created (${data.task.id}) — status: ${data.task.status}`);
    refresh();
  }

  // complete task
  async function completeTask(taskId: string, agentId: string, success: boolean) {
    const data = await post('/api/tasks/complete', { taskId, agentId, success });
    if (data.error) { showError(data.error); return; }
    const label = success ? 'completed' : (data.retried ? 'retried' : 'failed');
    showNotice(`✓ Task ${label}`);
    refresh();
  }

  // totals
  const totalEarned  = agents.reduce((s, a) => s + a.totalEarned, 0);
  const activeTasks  = tasks.filter((t) => t.status === 'assigned').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

  // ── styles ──────────────────────────────────────────────────────────────────
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
  const thStyle: React.CSSProperties    = { textAlign: 'left', padding: '8px 12px', color: C.gray, fontWeight: 600,
    fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
    borderBottom: `1px solid rgba(255,255,255,.07)` };
  const tdStyle: React.CSSProperties    = { padding: '10px 12px', borderBottom: `1px solid rgba(255,255,255,.04)`, color: C.light };
  const inputStyle: React.CSSProperties = {
    background: C.dark3, border: `1px solid rgba(255,255,255,.1)`, borderRadius: 8,
    color: C.light, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
  };
  const cardStyle: React.CSSProperties  = { background: C.dark2, border: `1px solid rgba(255,255,255,.06)`, borderRadius: 16, padding: 24, marginBottom: 24 };

  return (
    <>
      <Head>
        <title>Conductor — Agent Network Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ background: C.dark, minHeight: '100vh', fontFamily: "'Outfit', sans-serif", color: C.light }}>

        {/* nav */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', height: 60,
          background: 'rgba(6,6,10,.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,.05)',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ConductorLogo.png" alt="Conductor" style={{ width: 30, height: 30, borderRadius: 8 }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: C.light, letterSpacing: '-.02em' }}>Conductor</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.gray }}>live dashboard</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite', display: 'inline-block' }} />
            </div>
            <WalletConnect />
          </div>
        </nav>

        <style>{`
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
          button:hover { opacity:.85; }
          a { color: inherit; }
        `}</style>

        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

          {/* notices */}
          {notice && (
            <div style={{ background: `${C.green}18`, border: `1px solid ${C.green}44`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: C.green, fontSize: 13 }}>
              {notice}
            </div>
          )}
          {error && (
            <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, color: C.red, fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* stats */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard label="Agents"          value={agents.length}   color={C.purple} />
            <StatCard label="Active Tasks"    value={activeTasks}     color={C.cyan}   />
            <StatCard label="Pending Tasks"   value={pendingTasks}    color={C.amber}  />
            <StatCard label="Completed Tasks" value={history.filter(h => h.status === 'completed').length} color={C.green} />
            <StatCard label="Total Earned"    value={`${totalEarned.toFixed(2)}`} color={C.magenta} />
            <StatCard label="Payouts"         value={payouts.length}  color={C.blue}   />
          </div>

          {/* two-column form row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

            {/* register agent */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '-.02em' }}>Register Agent</h2>
              <form onSubmit={registerAgent} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input style={inputStyle} placeholder="Agent name" value={agentForm.values.name} onChange={agentForm.set('name')} />
                <input style={inputStyle} placeholder="Skills (comma-separated, e.g. trade,analyze)" value={agentForm.values.skills} onChange={agentForm.set('skills')} />
                <input style={inputStyle} placeholder="Wallet address (optional)" value={agentForm.values.wallet} onChange={agentForm.set('wallet')} />
                <button type="submit" style={{
                  background: `linear-gradient(135deg,${C.purple},${C.blue})`, color: '#fff',
                  border: 'none', borderRadius: 10, padding: '10px 0', fontWeight: 700,
                  cursor: 'pointer', fontSize: 13,
                }}>Register Agent</button>
              </form>
            </div>

            {/* create task */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '-.02em' }}>Create Task</h2>
              <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input style={inputStyle} placeholder="Task description" value={taskForm.values.desc} onChange={taskForm.set('desc')} />
                <input style={inputStyle} placeholder="Required skills (comma-separated)" value={taskForm.values.skills} onChange={taskForm.set('skills')} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input style={inputStyle} placeholder="Reward" type="number" min="0" step="0.01" value={taskForm.values.reward} onChange={taskForm.set('reward')} />
                  <select style={{ ...inputStyle, appearance: 'none' }} value={taskForm.values.priority} onChange={taskForm.set('priority')}>
                    {[1,2,3,4,5].map(p => <option key={p} value={p}>Priority {p}</option>)}
                  </select>
                  <input style={inputStyle} placeholder="Max retries" type="number" min="0" max="10" value={taskForm.values.maxRetries} onChange={taskForm.set('maxRetries')} />
                </div>
                <button type="submit" style={{
                  background: `linear-gradient(135deg,${C.cyan},${C.blue})`, color: '#fff',
                  border: 'none', borderRadius: 10, padding: '10px 0', fontWeight: 700,
                  cursor: 'pointer', fontSize: 13,
                }}>Create Task</button>
              </form>
            </div>
          </div>

          {/* agents table */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '-.02em' }}>
              Agents <span style={{ color: C.gray, fontWeight: 400, fontSize: 13 }}>({agents.length})</span>
            </h2>
            {agents.length === 0
              ? <p style={{ color: C.gray, fontSize: 13 }}>No agents registered yet.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {['Name', 'Skills', 'Status', 'Health', 'Tasks Done', 'Earned', 'Wallet'].map(h =>
                          <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a) => (
                        <tr key={a.id}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>{a.name}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray, marginTop: 2 }}>{a.id}</div>
                          </td>
                          <td style={tdStyle}>{a.skills.map(s => <Badge key={s} label={s} color={C.purple} />).reduce<React.ReactNode[]>((acc, el, i) => [...acc, i > 0 ? ' ' : '', el], [])}</td>
                          <td style={tdStyle}><Badge label={a.status} color={a.status === 'idle' ? C.green : C.amber} /></td>
                          <td style={tdStyle}><HealthDot health={a.health} /></td>
                          <td style={tdStyle}>{a.tasksCompleted}</td>
                          <td style={tdStyle}>{a.totalEarned.toFixed(2)}</td>
                          <td style={tdStyle}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray }}>{a.walletAddress ? `${a.walletAddress.slice(0,8)}…` : '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>

          {/* active tasks table */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '-.02em' }}>
              Active Tasks <span style={{ color: C.gray, fontWeight: 400, fontSize: 13 }}>({tasks.length})</span>
            </h2>
            {tasks.length === 0
              ? <p style={{ color: C.gray, fontSize: 13 }}>No active tasks.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        {['Description', 'Skills', 'Status', 'Priority', 'Reward', 'Retries', 'Assigned To', 'Actions'].map(h =>
                          <th key={h} style={thStyle}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.sort((a, b) => b.priority - a.priority).map((t) => (
                        <tr key={t.id}>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600, maxWidth: 220 }}>{t.description}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray, marginTop: 2 }}>{t.id}</div>
                          </td>
                          <td style={tdStyle}>{t.requiredSkills.map(s => <Badge key={s} label={s} color={C.cyan} />).reduce<React.ReactNode[]>((acc, el, i) => [...acc, i > 0 ? ' ' : '', el], [])}</td>
                          <td style={tdStyle}><Badge label={t.status} color={t.status === 'assigned' ? C.blue : t.status === 'pending' ? C.amber : C.green} /></td>
                          <td style={tdStyle}><PriorityBadge priority={t.priority} /></td>
                          <td style={tdStyle}>{t.reward}</td>
                          <td style={tdStyle}>{t.retryCount}/{t.maxRetries}</td>
                          <td style={tdStyle}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray }}>{t.assignedTo ?? '—'}</span></td>
                          <td style={tdStyle}>
                            {t.status === 'assigned' && t.assignedTo && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => completeTask(t.id, t.assignedTo!, true)} style={{
                                  background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44`,
                                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                }}>✓ Complete</button>
                                <button onClick={() => completeTask(t.id, t.assignedTo!, false)} style={{
                                  background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}44`,
                                  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                }}>✗ Fail</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>

          {/* payouts */}
          {payouts.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '-.02em' }}>
                Payout History <span style={{ color: C.gray, fontWeight: 400, fontSize: 13 }}>({payouts.length})</span>
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {['Payout ID', 'Agent', 'Task', 'Amount', 'Status', 'Tx Hash'].map(h =>
                        <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id}>
                        <td style={tdStyle}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray }}>{p.id.slice(0, 20)}…</span></td>
                        <td style={tdStyle}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray }}>{p.agentId.slice(0, 20)}…</span></td>
                        <td style={tdStyle}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray }}>{p.taskId.slice(0, 20)}…</span></td>
                        <td style={{ ...tdStyle, color: C.green, fontWeight: 700 }}>{p.amount.toFixed(2)}</td>
                        <td style={tdStyle}><Badge label={p.status} color={p.status === 'completed' ? C.green : C.amber} /></td>
                        <td style={tdStyle}><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: C.gray }}>{p.transactionHash ? `${p.transactionHash.slice(0, 14)}…` : '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* task history */}
          {history.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '-.02em' }}>
                Task History <span style={{ color: C.gray, fontWeight: 400, fontSize: 13 }}>({history.length})</span>
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {['Description', 'Status', 'Priority', 'Reward', 'Retries', 'Completed'].map(h =>
                        <th key={h} style={thStyle}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((t) => (
                      <tr key={t.id + t.completedAt}>
                        <td style={tdStyle}>{t.description}</td>
                        <td style={tdStyle}><Badge label={t.status} color={t.status === 'completed' ? C.green : C.red} /></td>
                        <td style={tdStyle}><PriorityBadge priority={t.priority} /></td>
                        <td style={tdStyle}>{t.reward}</td>
                        <td style={tdStyle}>{t.retryCount}/{t.maxRetries}</td>
                        <td style={tdStyle}>{t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <footer style={{ textAlign: 'center', padding: '24px 0', color: C.gray, fontSize: 12 }}>
            <a href="https://github.com/EcosystemNetwork/Conductor" target="_blank" rel="noreferrer" style={{ color: C.gray }}>
              Conductor — Agent Network · MIT License
            </a>
          </footer>
        </main>
      </div>
    </>
  );
}
