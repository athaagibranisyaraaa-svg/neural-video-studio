import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, HardDrive, Cpu, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Stats } from '../lib/api';

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cores, setCores] = useState(0);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    setCores(navigator.hardwareConcurrency || 4);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mb-1">CONFIGURATION</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-2 text-sm">Workspace and rendering environment information.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold"><HardDrive size={17} className="text-cyan-300" /> Storage</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">Used — videos & uploads</span>
              <span className="font-mono text-slate-300">{stats?.storageFormatted ?? '…'}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats?.storageBytes ?? 0) / 1e8)}%`, background: 'linear-gradient(90deg,#22d3ee,#8b5cf6)' }} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">Soft display scale: 100 MB shown as full bar. Manage space by removing old exports.</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold"><Cpu size={17} className="text-violet-300" /> Rendering Environment</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="glass-soft rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Engine</div>
            <div className="font-semibold">Chromium + FFmpeg</div>
            <div className="text-xs text-slate-500 mt-1">Deterministic virtual-clock frame capture</div>
          </div>
          <div className="glass-soft rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Hardware</div>
            <div className="font-semibold">{cores} logical cores</div>
            <div className="text-xs text-slate-500 mt-1">Headless pipeline, sandboxed</div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} className="text-emerald-300" /> AI Assistant</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          The AI assistant (explain, debug, improve, palettes, prompt-to-animation) runs entirely server-side.
          Set <code className="font-mono text-cyan-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">MOONSHOT_API_KEY</code> or{' '}
          <code className="font-mono text-cyan-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">KIMI_API_KEY</code> in the server environment
          (optionally <code className="font-mono text-slate-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">AI_BASE_URL</code> and{' '}
          <code className="font-mono text-slate-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">AI_MODEL</code>). Keys are never sent to the browser.
        </p>
        <p className="text-sm text-slate-400 leading-relaxed">
          Server admins can also tune <code className="font-mono text-slate-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">CHROMIUM_PATH</code>,{' '}
          <code className="font-mono text-slate-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">PORT</code> and{' '}
          <code className="font-mono text-slate-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">JWT_SECRET</code>.
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
          <SettingsIcon size={13} /> Changes to environment variables require a server restart.
          {!stats && <Loader2 size={13} className="animate-spin ml-auto" />}
        </div>
      </div>
    </div>
  );
}
