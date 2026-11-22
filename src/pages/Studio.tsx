import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Save, Upload, Sparkles, Loader2, Download, CheckCircle2, X,
  Monitor, RectangleVertical, Square, Tv, FileCode2, Music, Trash2, Wand2,
} from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import VideoPlayer from '../components/VideoPlayer';
import { api } from '../lib/api';
import type { Job, Project, Settings } from '../lib/api';
import { useAuth } from '../lib/auth';

const DEFAULT_CODE = {
  html: `<div class="scene">
  <div class="orb"></div>
  <h1 class="title">NEURAL<br/>VIDEO STUDIO</h1>
  <div class="subtitle">code &rarr; cinematic video</div>
  <canvas id="particles"></canvas>
</div>`,
  css: `.scene { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;
  background: radial-gradient(circle at 50% 120%, #1b2550, #05070f 70%); }
#particles { position: absolute; inset: 0; width: 100%; height: 100%; }
.orb { position: absolute; width: 340px; height: 340px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #67e8f9, #8b5cf6 55%, transparent 72%);
  filter: blur(2px); opacity: .9; animation: float 6s ease-in-out infinite; }
.title { position: relative; font-size: 76px; font-weight: 700; letter-spacing: .12em; text-align: center; line-height: 1.05;
  color: #eef2ff; text-shadow: 0 0 40px rgba(34,211,238,.55), 0 0 120px rgba(139,92,246,.4);
  animation: rise 1.6s cubic-bezier(.2,.8,.2,1) both; }
.subtitle { position: relative; margin-top: 26px; font-size: 20px; letter-spacing: .45em; text-transform: uppercase; color: #67e8f9;
  animation: fadein 2.2s .6s ease both; }
@keyframes float { 0%,100% { transform: translateY(6%) scale(1); } 50% { transform: translateY(-6%) scale(1.06); } }
@keyframes rise { from { opacity: 0; transform: translateY(46px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes fadein { from { opacity: 0; letter-spacing: .8em; } to { opacity: 1; } }`,
  js: `// Deterministic particle field (seeded PRNG — stable across frames)
const cv = document.getElementById('particles');
const cx = cv.getContext('2d');
let W, H;
function resize() { W = cv.width = cv.clientWidth; H = cv.height = cv.clientHeight; }
resize();
function mulberry32(a) { return function() { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(1337);
const stars = Array.from({ length: 120 }, () => ({
  x: rnd(), y: rnd(), r: rnd() * 1.8 + .3, s: rnd() * .6 + .15, o: rnd() * Math.PI * 2,
}));
function draw(t) {
  cx.clearRect(0, 0, W, H);
  for (const st of stars) {
    const y = ((st.y + t * 0.00002 * st.s) % 1) * H;
    const tw = .45 + .55 * Math.sin(t * .004 + st.o);
    cx.fillStyle = 'rgba(148, 197, 255,' + (tw * .8) + ')';
    cx.beginPath(); cx.arc(st.x * W, y, st.r, 0, 7); cx.fill();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);`,
};

const DEFAULT_SETTINGS: Settings = {
  width: 1280, height: 720, fps: 30, duration: 6,
  format: 'mp4', quality: 'standard', backgroundColor: '#05070f',
  audioPath: null, audioVolume: 1,
};

const ASPECTS = [
  { id: '16:9', icon: Monitor, w: 1280, h: 720, label: '16:9' },
  { id: '9:16', icon: RectangleVertical, w: 720, h: 1280, label: '9:16' },
  { id: '1:1', icon: Square, w: 960, h: 960, label: '1:1' },
  { id: '4:3', icon: Tv, w: 1080, h: 810, label: '4:3' },
];

const RESOLUTIONS = [
  { label: '720p', scale: 1 }, { label: '1080p', scale: 1.5 },
  { label: '1440p', scale: 2 }, { label: '4K', scale: 3 },
];

const AI_MODES = [
  { id: 'explain', label: 'Explain Code' },
  { id: 'fix', label: 'Detect Problems' },
  { id: 'improve', label: 'Improve Animation' },
  { id: 'colors', label: 'Color Palettes' },
  { id: 'cinematic', label: 'Cinematic Advice' },
];

export default function Studio({ projectId: initialProjectId, initialTab }: { projectId: string | null; initialTab?: string }) {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [name, setName] = useState('Untitled Project');
  const [html, setHtml] = useState(DEFAULT_CODE.html);
  const [css, setCss] = useState(DEFAULT_CODE.css);
  const [js, setJs] = useState(DEFAULT_CODE.js);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<'html' | 'css' | 'js'>(initialTab === 'code' ? 'js' : 'html');
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(!projectId);
  const [notice, setNotice] = useState('');

  const [job, setJob] = useState<Job | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // AI panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState('explain');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOut, setAiOut] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState('');

  const fileInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectId) return;
    api.projects().then(({ projects }) => {
      const p = projects.find(x => x.id === projectId);
      if (p) {
        setName(p.name); setHtml(p.html); setCss(p.css); setJs(p.js); setSettings(p.settings);
      }
      setLoaded(true);
    }).catch(e => { setError(e.message); setLoaded(true); });
  }, [projectId]);

  // live preview srcDoc
  const srcDoc = useMemo(() => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:${settings.backgroundColor}}
${css}</style></head><body>${html}<script>try{${js}}catch(e){document.title='ERR:'+e.message}<\/script></body></html>`,
    [html, css, js, settings.backgroundColor]);

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error' || job.status === 'cancelled') return;
    const t = setInterval(async () => {
      try {
        const { job: j } = await api.job(job.id);
        setJob(j);
        if (j.status === 'done') {
          clearInterval(t);
          const url = await import('../lib/api').then(m => m.videoBlobUrl(j.id));
          setVideoUrl(url);
          const pk = await api.peaks(j.id).catch(() => ({ peaks: [] }));
          setPeaks(pk.peaks?.length ? pk.peaks : null);
          setBusy('');
        } else if (j.status === 'error' || j.status === 'cancelled') {
          clearInterval(t); setBusy('');
        }
      } catch { /* keep polling */ }
    }, 1200);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  const markDirty = () => { setDirty(true); };

  const save = async (): Promise<Project | null> => {
    setError('');
    try {
      if (projectId) {
        const { project } = await api.saveProject(projectId, { name, html, css, js, settings });
        setDirty(false); flash('Project saved'); return project;
      }
      const { project } = await api.createProject({ name, html, css, js, settings });
      setDirty(false);
      setProjectId(project.id);
      history.replaceState(null, '', `#/studio?project=${project.id}`);
      flash('Project created'); return project;
    } catch (e: any) { setError(e.message); return null; }
  };

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2500); };

  const startRender = async () => {
    setError(''); setVideoUrl(null); setJob(null);
    setBusy('Preparing render…');
    try {
      const saved = await save();
      const { job: j } = await api.render({ projectId: saved?.id || projectId || undefined, name, html, css, js, settings });
      setJob(j);
      setBusy('Rendering…');
    } catch (e: any) {
      setError(e.message); setBusy('');
    }
  };

  const uploadCode = async (f: File) => {
    try {
      const d = await api.uploadProject(f);
      if (d.html) setHtml(d.html);
      if (d.css) setCss(d.css);
      if (d.js) setJs(d.js);
      markDirty();
      flash(`Imported ${d.filename}`);
    } catch (e: any) { setError(e.message); }
  };

  const uploadAudioFile = async (f: File) => {
    try {
      const d = await api.uploadAudio(f);
      setSettings(s => ({ ...s, audioPath: d.audioPath }));
      flash(`Audio attached: ${d.name}`);
    } catch (e: any) { setError(e.message); }
  };

  const runAI = async () => {
    setAiBusy(true); setAiOut(''); setAiNotice('');
    try {
      const d = await api.aiAssist({ mode: aiMode, html, css, js, prompt: aiPrompt || undefined });
      setAiOut(d.reply);
    } catch (e: any) {
      setAiNotice(e.message);
    } finally { setAiBusy(false); }
  };

  const download = async (format: 'mp4' | 'webm') => {
    if (!job) return;
    const url = await import('../lib/api').then(m => m.videoBlobUrl(job.id));
    const a = document.createElement('a');
    a.href = url; a.download = `${name.replace(/[^\w\- ]/g, '')}.${format}`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const rendering = job && (job.status === 'rendering' || job.status === 'queued');

  if (!loaded) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-300" /></div>;

  const setAspect = (w: number, h: number) => setSettings(s => ({ ...s, width: w, height: h }));

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <FileCode2 size={22} className="text-cyan-300" />
        <input value={name} onChange={e => { setName(e.target.value); markDirty(); }}
          className="input-dark !w-64 font-semibold" aria-label="Project name" />
        {dirty && <span className="text-xs text-amber-300/90 font-semibold">unsaved changes</span>}
        <div className="flex-1" />
        <input ref={fileInput} type="file" accept=".html,.css,.js,.zip" className="hidden" onChange={e => e.target.files?.[0] && uploadCode(e.target.files[0])} />
        <input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAudioFile(e.target.files[0])} />
        <button className="btn-ghost" onClick={() => fileInput.current?.click()}><Upload size={15} /> Import Code / ZIP</button>
        <button className="btn-ghost" onClick={save}><Save size={15} /> Save</button>
        <button className="btn-primary" onClick={startRender} disabled={!!busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
          {busy || 'Render Video'}
        </button>
        <button className="btn-ghost !px-3" onClick={() => setAiOpen(true)} aria-label="AI Assistant"><Sparkles size={16} className="text-violet-300" /></button>
      </div>

      {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl px-4 py-2.5 text-sm text-emerald-300 border-emerald-400/30">{notice}</motion.div>}
      {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl px-4 py-2.5 text-sm text-rose-300 border-rose-500/30">{error}</motion.div>}

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_420px] gap-5">
        {/* editor + preview */}
        <div className="space-y-5 min-w-0">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1 px-3 pt-3">
              {(['html', 'css', 'js'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${tab === t ? 'bg-white/5 text-cyan-200 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t === 'js' ? 'JavaScript' : t}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-slate-600 font-mono pr-2">{user?.name}</span>
            </div>
            <div className="h-[420px] border-t border-white/5">
              <CodeEditor language={tab === 'js' ? 'javascript' : tab} value={tab === 'html' ? html : tab === 'css' ? css : js}
                onChange={v => { tab === 'html' ? setHtml(v) : tab === 'css' ? setCss(v) : setJs(v); markDirty(); }} />
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Live Preview</span>
              <span className="text-[11px] font-mono text-slate-500">{settings.width} × {settings.height} · {settings.fps}fps</span>
            </div>
            <div className="bg-black/40 flex justify-center p-3">
              <iframe title="Live preview" sandbox="allow-scripts"
                srcDoc={srcDoc}
                className="rounded-lg border border-white/10 bg-black transition-all"
                style={{ width: Math.min(620, settings.width / 2), height: Math.min(360, settings.height / 2), aspectRatio: `${settings.width}/${settings.height}` }} />
            </div>
          </div>
        </div>

        {/* settings + render status */}
        <div className="space-y-5">
          <div className="glass rounded-2xl p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Export Settings</h3>

            <div>
              <span className="label">Aspect Ratio</span>
              <div className="grid grid-cols-4 gap-2">
                {ASPECTS.map(a => (
                  <button key={a.id} onClick={() => setAspect(a.w, a.h)}
                    className={`glass-soft rounded-xl py-2.5 flex flex-col items-center gap-1 transition-all cursor-pointer ${settings.width / settings.height === a.w / a.h ? 'border-cyan-400/60 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}>
                    <a.icon size={17} />
                    <span className="text-[10px] font-bold">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="res">Resolution</label>
                <select id="res" className="input-dark"
                  value={RESOLUTIONS.findIndex(r => {
                    const base = ASPECTS.find(a => Math.abs(a.w / a.h - settings.width / settings.height) < 0.01) || ASPECTS[0];
                    return base.w * r.scale === settings.width;
                  })}
                  onChange={e => {
                    const scale = RESOLUTIONS[Number(e.target.value)].scale;
                    const a = ASPECTS.find(x => Math.abs(x.w / x.h - settings.width / settings.height) < 0.01) || ASPECTS[0];
                    setSettings(s => ({ ...s, width: a.w * scale, height: a.h * scale }));
                  }}>
                  {RESOLUTIONS.map((r, i) => {
                    const base = ASPECTS.find(a => Math.abs(a.w / a.h - settings.width / settings.height) < 0.01) || ASPECTS[0];
                    return <option key={r.label} value={i}>{r.label} — {base.w * r.scale}×{base.h * r.scale}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="fps">Frame Rate</label>
                <select id="fps" className="input-dark" value={settings.fps} onChange={e => setSettings(s => ({ ...s, fps: Number(e.target.value) }))}>
                  {[24, 30, 60].map(f => <option key={f} value={f}>{f} FPS</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dur">Duration ({settings.duration}s)</label>
                <input id="dur" type="range" min={1} max={30} step={1} value={settings.duration}
                  onChange={e => setSettings(s => ({ ...s, duration: Number(e.target.value) }))} className="w-full accent-cyan-400 mt-3" />
              </div>
              <div>
                <label className="label" htmlFor="fmt">Format</label>
                <select id="fmt" className="input-dark" value={settings.format} onChange={e => setSettings(s => ({ ...s, format: e.target.value as any }))}>
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="webm">WebM (VP8)</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="qual">Quality</label>
                <select id="qual" className="input-dark" value={settings.quality} onChange={e => setSettings(s => ({ ...s, quality: e.target.value as any }))}>
                  <option value="draft">Draft (fast)</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="bgc">Background</label>
                <input id="bgc" type="color" value={settings.backgroundColor} onChange={e => setSettings(s => ({ ...s, backgroundColor: e.target.value }))}
                  className="w-full h-10 rounded-xl bg-transparent border border-white/10 cursor-pointer p-1" />
              </div>
            </div>

            <div>
              <span className="label">Audio</span>
              {settings.audioPath ? (
                <div className="glass-soft rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
                  <Music size={15} className="text-cyan-300" />
                  <span className="truncate flex-1">Background music attached</span>
                  <button onClick={() => setSettings(s => ({ ...s, audioPath: null }))} aria-label="Remove audio" className="text-slate-400 hover:text-rose-400 cursor-pointer"><Trash2 size={14} /></button>
                </div>
              ) : (
                <button className="btn-ghost w-full" onClick={() => audioInput.current?.click()}><Music size={15} /> Attach Background Music</button>
              )}
            </div>
          </div>

          {/* render progress / result */}
          <AnimatePresence mode="wait">
            {job && (
              <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Render Output</h3>
                  <span className={`text-xs font-bold ${job.status === 'done' ? 'text-emerald-300' : job.status === 'error' ? 'text-rose-300' : 'text-cyan-300'}`}>
                    {job.status.toUpperCase()} {rendering && `· ${job.progress}%`}
                  </span>
                </div>

                {(job.status === 'rendering' || job.status === 'queued') && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                      <Loader2 size={15} className="animate-spin text-cyan-300" /> Capturing {Math.round(settings.duration * settings.fps)} frames at {settings.fps}fps…
                    </div>
                    <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${job.progress}%`, background: 'linear-gradient(90deg,#22d3ee,#8b5cf6,#22d3ee)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s linear infinite' }} />
                    </div>
                    <button className="btn-ghost w-full mt-3 !py-2" onClick={async () => { await api.cancelJob(job.id); const { job: j } = await api.job(job.id); setJob(j); }}>
                      Cancel Render
                    </button>
                  </div>
                )}

                {job.status === 'error' && (
                  <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-1">
                    <div className="font-semibold flex items-center gap-2"><X size={15} /> Render failed</div>
                    <div className="text-xs font-mono opacity-90">{job.error}</div>
                  </div>
                )}

                {job.status === 'done' && videoUrl && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Render complete — {(job.fileSize / 1e6).toFixed(2)} MB</div>
                    <VideoPlayer src={videoUrl} format={job.settings.format} jobName={job.projectName} peaks={peaks} />
                    <div className="grid grid-cols-2 gap-3">
                      <button className="btn-primary" onClick={() => download('mp4')}><Download size={15} /> MP4</button>
                      <button className="btn-ghost" onClick={() => download('webm')}><Download size={15} /> WebM</button>
                    </div>
                    {job.consoleErrors?.length > 0 && (
                      <details className="glass-soft rounded-xl p-3 text-xs">
                        <summary className="cursor-pointer text-amber-300 font-semibold">{job.consoleErrors.length} console message(s) during render</summary>
                        <pre className="mt-2 whitespace-pre-wrap font-mono text-slate-400 max-h-32 overflow-y-auto scroll-slim">{job.consoleErrors.join('\n')}</pre>
                      </details>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* AI assist drawer */}
      <AnimatePresence>
        {aiOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAiOpen(false)} />
            <motion.aside className="fixed right-0 inset-y-0 w-full sm:w-[440px] glass z-50 p-6 flex flex-col"
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', damping: 26, stiffness: 220 }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="flex items-center gap-2 font-bold"><Sparkles size={17} className="text-violet-300" /> AI Assistant</h3>
                <button onClick={() => setAiOpen(false)} aria-label="Close AI panel" className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {AI_MODES.map(m => (
                  <button key={m.id} onClick={() => setAiMode(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${aiMode === m.id ? 'bg-violet-500/25 text-violet-200 border border-violet-400/40' : 'glass-soft text-slate-400 hover:text-slate-200'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={2}
                placeholder="Optional context, e.g. 'make it feel like a product launch teaser'…"
                className="input-dark resize-none mb-3 text-sm" />
              <button className="btn-primary w-full mb-4" onClick={runAI} disabled={aiBusy}>
                {aiBusy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                Run Analysis
              </button>
              {aiNotice && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3">{aiNotice}</div>}
              <div className="flex-1 overflow-y-auto scroll-slim glass-soft rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
                {aiOut || <span className="text-slate-500">The assistant will analyze your current HTML, CSS and JS. Configure an AI API key on the server to enable this feature.</span>}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

