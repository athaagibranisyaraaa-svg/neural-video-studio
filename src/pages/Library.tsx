import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Download, Loader2, Play } from 'lucide-react';
import { api, videoBlobUrl } from '../lib/api';
import type { Job } from '../lib/api';
import VideoPlayer from '../components/VideoPlayer';

export default function Library() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ job: Job; url: string; peaks: number[] | null } | null>(null);

  const load = () => api.jobs().then(d => setJobs(d.jobs.filter(j => j.status === 'done'))).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const open = async (job: Job) => {
    const url = await videoBlobUrl(job.id);
    const pk = await api.peaks(job.id).catch(() => ({ peaks: [] }));
    setSelected({ job, url, peaks: pk.peaks?.length ? pk.peaks : null });
  };

  const download = async (job: Job) => {
    const url = await videoBlobUrl(job.id);
    const a = document.createElement('a');
    a.href = url; a.download = `${job.projectName.replace(/[^\w\- ]/g, '')}.${job.settings.format}`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mb-1">EXPORTS</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Video Library</h1>
        <p className="text-slate-400 mt-2 text-sm">Every successful render is kept here for re-download.</p>
      </div>
      {error && <div className="glass rounded-xl px-4 py-3 text-rose-300">{error}</div>}

      {jobs === null ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-300" /></div>
      ) : jobs.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <Film size={40} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No videos yet — rendered exports will appear here.</p>
        </div>
      ) : (
        <>
          {selected && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
              <VideoPlayer src={selected.url} format={selected.job.settings.format} jobName={selected.job.projectName} peaks={selected.peaks} />
            </motion.div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((j, i) => (
              <motion.button key={j.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => open(j)}
                className="glass rounded-2xl p-5 text-left hover:border-cyan-400/40 transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-cyan-400/20 flex items-center justify-center">
                    <Play size={16} className="text-cyan-300 ml-0.5" fill="currentColor" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 text-slate-400">{j.settings.format}</span>
                </div>
                <h3 className="font-bold truncate">{j.projectName}</h3>
                <div className="text-[11px] font-mono text-slate-500 mt-1.5 space-y-0.5">
                  <div>{j.settings.width}×{j.settings.height} · {j.settings.fps}fps · {j.duration}s</div>
                  <div>{(j.fileSize / 1e6).toFixed(2)} MB · {new Date(j.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                  <button className="btn-primary flex-1 !py-2 text-xs" onClick={() => download(j)}><Download size={13} /> Download</button>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
