import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Clapperboard, Clock, HardDrive, Film, ArrowRight, Loader2, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';
import type { Stats, Job } from '../lib/api';
import { navigate } from '../lib/router';

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { delay: i * 0.07, duration: 0.4 },
});

function StatCard({ icon: Icon, label, value, sub, i }: { icon: any; label: string; value: string; sub: string; i: number }) {
  return (
    <motion.div {...cardAnim(i)} className="glass rounded-2xl p-5 relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-cyan-400/10 blur-2xl group-hover:bg-cyan-400/20 transition-all" />
      <Icon size={20} className="text-cyan-300 mb-3" />
      <div className="text-3xl font-bold tracking-tight glow-text">{value}</div>
      <div className="text-sm text-slate-300 font-medium mt-1">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const map: Record<string, [string, any]> = {
    done: ['Completed', CheckCircle2], rendering: ['Rendering', Loader], queued: ['Queued', Loader2],
    error: ['Failed', AlertCircle], cancelled: ['Cancelled', AlertCircle],
  };
  const [label, Icon] = map[status] || [status, AlertCircle];
  const color = status === 'done' ? 'text-emerald-300' : status === 'error' || status === 'cancelled' ? 'text-rose-300' : 'text-cyan-300';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${color}`}>
      <Icon size={13} className={status === 'rendering' || status === 'queued' ? 'animate-spin' : ''} /> {label}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  const load = () => api.stats().then(setStats).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => { if (!stats || stats.queued > 0) load(); }, 2500);
    return () => clearInterval(t);
  }, [stats]);

  return (
    <div className="space-y-8">
      <motion.div {...cardAnim(0)} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mb-1">OVERVIEW</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-2 text-sm">Your code-to-video pipeline at a glance.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary" onClick={() => navigate('/studio')}>
            <Clapperboard size={16} /> New Video <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>

      {error && <div className="glass rounded-xl px-5 py-4 text-rose-300 border-rose-500/30">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard i={0} icon={Film} value={String(stats?.totalVideos ?? '—')} label="Videos Generated" sub={`${stats?.queued ?? 0} currently in queue`} />
        <StatCard i={1} icon={Clock} value={stats ? `${Math.round(stats.totalRenderTime)}s` : '—'} label="Total Render Time" sub="across all exports" />
        <StatCard i={2} icon={HardDrive} value={stats?.storageFormatted ?? '—'} label="Storage Used" sub="videos + uploads" />
        <StatCard i={3} icon={Clapperboard} value={String(stats?.projectCount ?? '—')} label="Projects" sub="saved code projects" />
      </div>

      <motion.div {...cardAnim(2)} className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-wide">Generation Activity — last 14 days</h2>
          <span className="text-xs text-slate-500 font-mono">{stats?.activity?.reduce((a, d) => a + d.renders, 0) ?? 0} renders</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.activity ?? []} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(224 30% 16% / 0.5)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid hsl(224 35% 20%)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#22d3ee' }} />
              <Area type="monotone" dataKey="renders" stroke="#22d3ee" strokeWidth={2} fill="url(#gA)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div {...cardAnim(3)} className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-wide">Recent Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer">View all →</button>
          </div>
          {stats?.recentProjects?.length ? (
            <div className="space-y-2.5">
              {stats.recentProjects.map(p => (
                <button key={p.id} onClick={() => navigate(`/studio?project=${p.id}`)}
                  className="w-full glass-soft rounded-xl px-4 py-3 flex items-center justify-between hover:border-cyan-400/40 transition-all text-left cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{p.settings.width}×{p.settings.height} · {p.settings.fps}fps · {p.settings.duration}s</div>
                  </div>
                  <ArrowRight size={15} className="text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500 py-6 text-center">No projects yet — create your first video.</p>}
        </motion.div>

        <motion.div {...cardAnim(4)} className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-wide">Rendering History</h2>
            <button onClick={() => navigate('/queue')} className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer">Queue →</button>
          </div>
          {stats?.recentJobs?.length ? (
            <div className="space-y-2.5">
              {stats.recentJobs.map(j => (
                <div key={j.id} className="glass-soft rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{j.projectName}</div>
                    <div className="h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${j.progress}%`, background: j.status === 'error' ? '#fb7185' : 'linear-gradient(90deg,#22d3ee,#8b5cf6)' }} />
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500 py-6 text-center">No renders yet.</p>}
        </motion.div>
      </div>
    </div>
  );
}
