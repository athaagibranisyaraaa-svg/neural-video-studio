import { useEffect, useRef } from 'react';

/** Subtle ambient particle field with slow drift and constellation lines. */
export default function Particles({ density = 70 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0, raf = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * DPR; canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const pts = Array.from({ length: density }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035, vy: (Math.random() - 0.5) * 0.00035,
      r: Math.random() * 1.6 + 0.4,
      hue: Math.random() < 0.5 ? 199 : Math.random() < 0.5 ? 262 : 187,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      }
      // constellation lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = (a.x - b.x) * w, dy = (a.y - b.y) * h;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            ctx.strokeStyle = `hsla(199, 100%, 60%, ${0.10 * (1 - Math.sqrt(d2) / 110)})`;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = `hsla(${p.hue}, 100%, 68%, 0.7)`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [density]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-60" aria-hidden />;
}
