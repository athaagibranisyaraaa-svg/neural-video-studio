import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import type { Job } from '../lib/api';

const META: Record<string, { color: string; icon: any }> = {
  queued: { color: 'text-slate-300', icon: Loader2 },
  rendering: { color: 'text-cyan-300', icon: Loader2 },
  done: { color: 'text-emerald-300', icon: CheckCircle2 },
  error: { color: 'text-rose-300', icon: AlertCircle },
  cancelled: { color: 'text-amber-300', icon: XCircle },
};

export default function Queue() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState('');

  const load = () => api.jobs().then(d => setJobs(d.jobs)).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => {
      if (jobs?.some(j => j.status === 'queued' || j.status === 'rendering')) load();
    }, 2000);
    return () => clearInterval(t);
  }, [jobs]);

  const cancel = async (id: string) => { await api.cancelJob(id); load(); };

  const active = jobs?.filter(j => j.status === 'queued' || j.status === 'rendering') || [];
  const past = jobs?.filter(j => !active.includes(j)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mb-1">PIPELINE</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Rendering Queue</h1>
        </div>
        <button className="btn-ghost" onClick={load}><RefreshCw size={15} /> Refresh</button>
      </div>
      {error && <div className="glass rounded-xl px-4 py-3 text-rose-300">{error}</div>}

      {jobs === null ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-300" /></div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400 mb-3">Active ({active.length})</h2>
            {active.length === 0 ? <p className="text-sm text-slate-500 glass rounded-xl px-4 py-3">Queue is idle.</p> : (
              <div className="space-y-3">
                {active.map(j => (
                  <motion.div key={j.id} layout className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Loader2 size={15} className="animate-spin text-cyan-300 shrink-0" />
                        <span className="font-semibold truncate">{j.projectName}</span>
                        <span className="text-[11px] font-mono text-slate-500">{j.settings.width}×{j.settings.height} · {j.settings.fps}fps · {j.settings.duration}s</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-cyan-300">{j.progress}%</span>
                        <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => cancel(j.id)}>Cancel</button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${j.progress}%`, background: 'linear-gradient(90deg,#22d3ee,#8b5cf6)' }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400 mb-3">History ({past.length})</h2>
            {past.length === 0 ? <p className="text-sm text-slate-500 glass rounded-xl px-4 py-3">No renders yet.</p> : (
              <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden">
                {past.slice(0, 30).map(j => {
                  const M = META[j.status];
                  const Icon = M.icon;
                  return (
                    <div key={j.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <Icon size={16} className={`${M.color} shrink-0 ${j.status === 'rendering' ? 'animate-spin' : ''}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{j.projectName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {new Date(j.createdAt).toLocaleString()} · {(j.fileSize / 1e6).toFixed(2)} MB
                          {j.status === 'error' && j.error ? ` · ${j.error.slice(0, 80)}` : ''}
                        </div>
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${M.color}`}>{j.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
