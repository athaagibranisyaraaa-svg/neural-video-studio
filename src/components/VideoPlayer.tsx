import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

interface Props {
  src: string;
  format: 'mp4' | 'webm';
  jobName?: string;
  peaks?: number[] | null;
}

function fmt(t: number) {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoPlayer({ src, format, jobName, peaks }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const v = videoRef.current!;
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDur(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [src]);

  const toggle = () => { const v = videoRef.current!; v.paused ? v.play() : v.pause(); };
  const seek = (t: number) => { const v = videoRef.current!; v.currentTime = Math.min(Math.max(0, t), dur || 0); };
  const changeVol = (x: number) => { setVol(x); const v = videoRef.current!; v.volume = x; v.muted = x === 0; setMuted(x === 0); };
  const fs = () => videoRef.current!.requestFullscreen().catch(() => {});

  const pct = dur ? (time / dur) * 100 : 0;
  const barRef = useRef<HTMLDivElement>(null);
  const onSeekClick = (e: React.MouseEvent) => {
    const rect = barRef.current!.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * dur);
  };

  const N = peaks && peaks.length ? peaks.length : 0;
  const bucket = N ? Math.min(N - 1, Math.floor((time / (dur || 1)) * N)) : 0;

  return (
    <div className="glass rounded-2xl overflow-hidden neon-border">
      <div className="relative bg-black/70 group">
        <video ref={videoRef} src={src} className="w-full max-h-[60vh] mx-auto block" playsInline />
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer">
          {!playing && (
            <span className="w-16 h-16 rounded-full flex items-center justify-center bg-cyan-400/90 text-slate-950 shadow-[0_0_40px_hsl(199_100%_55%/0.6)]">
              <Play size={26} className="ml-1" fill="currentColor" />
            </span>
          )}
        </button>
      </div>

      {/* waveform / progress */}
      <div className="px-4 pt-3">
        <div ref={barRef} onClick={onSeekClick}
          className="relative h-10 flex items-end gap-[2px] cursor-pointer select-none overflow-hidden rounded-lg bg-black/30 px-1">
          {N > 0 ? (
            peaks!.map((p, i) => (
              <div key={i} className="flex-1 rounded-sm transition-all duration-75"
                style={{
                  height: `${Math.max(12, p * 100)}%`,
                  background: i <= bucket ? 'linear-gradient(180deg,#22d3ee,#8b5cf6)' : 'hsl(224 30% 22%)',
                }} />
            ))
          ) : (
            <div className="absolute inset-y-0 left-0 rounded-lg"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#22d3ee,#8b5cf6)', opacity: 0.5 }} />
          )}
          <div className="absolute inset-y-0 left-0 pointer-events-none rounded-lg"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,hsl(199 100% 55% / 0.25),hsl(262 90% 60% / 0.25))' }} />
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => seek(0)} className="text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer" aria-label="Back to start"><SkipBack size={18} /></button>
        <button onClick={toggle} className="w-9 h-9 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center hover:brightness-110 transition-all cursor-pointer" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
        </button>
        <button onClick={() => seek(Math.min(dur, time + 5))} className="text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer" aria-label="Forward 5s"><SkipForward size={18} /></button>
        <span className="text-xs font-mono text-slate-400 ml-1">{fmt(time)} / {fmt(dur)}</span>
        <div className="flex-1" />
        <button onClick={() => { const v = videoRef.current!; setMuted(!muted); v.muted = !muted; }} className="text-slate-300 hover:text-cyan-300 cursor-pointer" aria-label="Mute">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol} onChange={e => changeVol(Number(e.target.value))}
          className="w-20 accent-cyan-400 cursor-pointer" aria-label="Volume" />
        <button onClick={fs} className="text-slate-300 hover:text-cyan-300 cursor-pointer" aria-label="Fullscreen"><Maximize size={18} /></button>
      </div>
      {jobName && <div className="px-4 pb-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">{jobName} · {format.toUpperCase()}</div>}
    </div>
  );
}
