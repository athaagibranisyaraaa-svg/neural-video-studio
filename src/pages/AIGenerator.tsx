import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, Clapperboard } from 'lucide-react';
import { api } from '../lib/api';
import { navigate } from '../lib/router';

const SUGGESTIONS = [
  'Flowing aurora waves over a dark ocean with glowing particles',
  'Neon grid city flythrough at night, synthwave style',
  'Morphing liquid metal blobs with studio lighting',
  'Animated data visualization — a bar chart growing with glowing bars',
  'Rotating 3D wireframe torus with orbiting satellites (Three.js)',
  'Elegant logo reveal: light streaks converging into a monogram',
];

export default function AIGenerator() {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ html: string; css: string; js: string; title: string } | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const d = await api.aiGenerate({ prompt: prompt.trim(), duration });
      setResult(d);
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  const openInStudio = async () => {
    if (!result) return;
    const { project } = await api.createProject({ name: result.title || 'AI Animation', html: result.html, css: result.css, js: result.js, settings: { duration } as any });
    navigate(`/studio?project=${project.id}`);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.35em] text-violet-300/80 font-semibold mb-1">GENERATIVE</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">AI Generator</h1>
        <p className="text-slate-400 mt-2 text-sm">Describe a motion graphic — the AI writes a self-contained HTML/CSS/JS animation, deterministic and render-ready.</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder="Describe your animation… e.g. 'Golden ink dispersing in water, macro cinematic lighting'"
          className="input-dark resize-none text-sm" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="label" htmlFor="ai-dur">Duration — {duration}s</label>
            <input id="ai-dur" type="range" min={2} max={15} value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full accent-violet-400" />
          </div>
          <button className="btn-primary !py-3" onClick={generate} disabled={busy || !prompt.trim()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate Animation
          </button>
        </div>
        {error && <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">{error}</div>}
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => setPrompt(s)}
              className="glass-soft rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-cyan-200 hover:border-cyan-400/40 transition-all cursor-pointer">
              {s}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">{result.title}</h2>
            <button className="btn-primary" onClick={openInStudio}><Clapperboard size={15} /> Open in Studio <ArrowRight size={14} /></button>
          </div>
          <iframe title="AI preview" sandbox="allow-scripts"
            srcDoc={`<!DOCTYPE html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#05070f}${result.css}</style></head><body>${result.html}<scr` + `ipt>try{${result.js}}catch(e){}</scr` + `ipt></body></html>`}
            className="w-full h-[360px] rounded-xl border border-white/10 bg-black" />
          <p className="text-xs text-slate-500">Preview runs live in your browser. Open in Studio to edit the code, adjust export settings and render a video.</p>
        </motion.div>
      )}
    </div>
  );
}
