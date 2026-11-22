import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { Job, ProjectSettings, VIDEO_DIR, Jobs } from './db';

const CHROMIUM = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

export interface RenderHandle {
  promise: Promise<void>;
  cancel: () => void;
}

const activeJobs = new Map<string, RenderHandle>();

export function cancelRender(jobId: string) {
  const h = activeJobs.get(jobId);
  if (h) h.cancel();
}

const VIRTUAL_CLOCK = `
(function () {
  var vt = 0;
  var rafQueue = [];
  var timers = [];
  var nextTimerId = 1;
  var realNow = Date.now.bind(Date);
  var epoch = Date.now();
  var rafId = 1;

  window.__vt = function () { return vt; };
  Date.now = function () { return epoch + vt; };
  performance.now = function () { return vt; };
  if (window.performance.timing) { try { Object.defineProperty(window.performance.timing, 'navigationStart', { get: function () { return 0; } }); } catch (e) {} }

  window.requestAnimationFrame = function (cb) {
    rafQueue.push({ id: rafId, cb: cb });
    return rafId++;
  };
  window.cancelAnimationFrame = function (id) {
    rafQueue = rafQueue.filter(function (q) { return q.id !== id; });
  };
  var realSetTimeout = window.setTimeout.bind(window);
  var realClearTimeout = window.clearTimeout.bind(window);
  window.setTimeout = function (fn, delay) {
    var id = nextTimerId++;
    timers.push({ id: id, at: vt + Math.max(0, delay || 0), fn: fn, interval: 0 });
    return id;
  };
  window.clearTimeout = function (id) { timers = timers.filter(function (t) { return t.id !== id; }); };
  window.setInterval = function (fn, delay) {
    var id = nextTimerId++;
    var d = Math.max(1, delay || 0);
    timers.push({ id: id, at: vt + d, fn: fn, interval: d });
    return id;
  };
  window.clearInterval = window.clearTimeout;

  window.__step = function (dtMs) {
    vt += dtMs;
    // run timers that are due (in order), including new ones scheduled by callbacks this step
    var guard = 100000;
    while (guard-- > 0) {
      var due = null;
      for (var i = 0; i < timers.length; i++) {
        if (timers[i].at <= vt && (!due || timers[i].at < due.at)) due = timers[i];
      }
      if (!due) break;
      timers = timers.filter(function (t) { return t.id !== due.id; });
      try { typeof due.fn === 'function' && due.fn(); } catch (e) { window.__pushError('timer: ' + (e && e.message ? e.message : String(e))); }
      if (due.interval > 0) { due.at = vt + due.interval; timers.push(due); }
    }
    // run animation frames
    var q = rafQueue; rafQueue = [];
    for (var j = 0; j < q.length; j++) {
      try { q[j].cb(vt); } catch (e) { window.__pushError('raf: ' + (e && e.message ? e.message : String(e))); }
    }
    // drive CSS animations / transitions deterministically
    try {
      var anims = document.getAnimations ? document.getAnimations({subtree: true}) : [];
      for (var k = 0; k < anims.length; k++) {
        try { anims[k].pause(); anims[k].currentTime = vt; } catch (e) {}
      }
    } catch (e) {}
  };
})();
`;

const ERROR_HOOK = `
window.__errors = [];
window.__pushError = function (m) {
  if (window.__errors.length < 50) window.__errors.push(String(m));
};
window.addEventListener('error', function (e) { window.__pushError((e.message || 'error') + (e.filename ? ' @ ' + e.filename + ':' + e.lineno : '')); });
window.addEventListener('unhandledrejection', function (e) { window.__pushError('unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))); });
`;

function buildDocument(settings: ProjectSettings, html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: ${settings.backgroundColor || '#000000'}; }
${css}
</style>
</head>
<body>
${html}
<script>${VIRTUAL_CLOCK}<\/script>
<script>${ERROR_HOOK}<\/script>
<script>
try {
${js}
} catch (e) { window.__pushError('script: ' + (e && e.message ? e.message : String(e))); }
<\/script>
</body>
</html>`;
}

function ffmpegArgs(settings: ProjectSettings, outFile: string): string[] {
  const base = ['-y', '-f', 'image2pipe', '-framerate', String(settings.fps), '-i', '-'];
  const audio = settings.audioPath ? ['-i', settings.audioPath] : [];
  if (settings.format === 'mp4') {
    const crf = settings.quality === 'draft' ? '28' : settings.quality === 'high' ? '16' : '21';
    return [...base, ...audio, '-c:v', 'libx264', '-preset', 'medium', '-crf', crf,
      '-pix_fmt', 'yuv420p', ...(settings.audioPath ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), outFile];
  }
  const crf = settings.quality === 'draft' ? '32' : settings.quality === 'high' ? '18' : '26';
  return [...base, ...audio, '-c:v', 'libvpx', '-b:v', '2M', '-crf', crf,
    ...(settings.audioPath ? ['-c:a', 'libopus', '-b:a', '128k', '-shortest'] : []), outFile];
}

export function startRender(job: Job, html: string, css: string, js: string): RenderHandle {
  let cancelled = false;
  let browser: puppeteer.Browser | null = null;
  let ffmpeg: ChildProcess | null = null;

  const promise = (async () => {
    job.status = 'rendering';
    job.startedAt = new Date().toISOString();
    Jobs.save(job);

    const outFile = path.join(VIDEO_DIR, `${job.id}.${job.settings.format}`);
    let page: puppeteer.Page | null = null;
    try {
      browser = await puppeteer.launch({
        executablePath: CHROMIUM,
        headless: true,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-gpu', '--hide-scrollbars', '--mute-audio',
          '--font-render-hinting=none',
        ],
      });
      page = await browser.newPage();
      await page.setViewport({ width: job.settings.width, height: job.settings.height, deviceScaleFactor: 1 });

      const consoleErrors: string[] = [];
      page.on('pageerror', (e) => { if (consoleErrors.length < 50) consoleErrors.push('pageerror: ' + e.message); });
      page.on('console', (msg) => {
        if (msg.type() === 'error' && consoleErrors.length < 50) consoleErrors.push('console: ' + msg.text());
      });

      const doc = buildDocument(job.settings, html, css, js);
      await page.setContent(doc, { waitUntil: 'load', timeout: 30000 });
      // let first layout/paint settle, then freeze CSS animations at t=0
      await page.evaluate('window.__step(0)');
      await new Promise(r => setTimeout(r, 120));

      ffmpeg = spawn('ffmpeg', ffmpegArgs(job.settings, outFile));
      const ffErrors: string[] = [];
      ffmpeg.stderr.on('data', (d) => {
        const s = d.toString();
        if (/error/i.test(s) && ffErrors.length < 20) ffErrors.push(s.trim().slice(0, 300));
      });

      const totalFrames = Math.max(1, Math.round(job.settings.duration * job.settings.fps));
      const dt = 1000 / job.settings.fps;

      for (let i = 0; i < totalFrames; i++) {
        if (cancelled) throw new Error('__cancelled__');
        await page.evaluate(`window.__step(${dt})`);
        const buf = await page.screenshot({ type: 'png' });
        if (cancelled) throw new Error('__cancelled__');
        if (!ffmpeg.stdin!.write(buf)) {
          await new Promise<void>((res) => ffmpeg!.stdin!.once('drain', res));
        }
        if (i % 5 === 0 || i === totalFrames - 1) {
          job.progress = Math.round(((i + 1) / totalFrames) * 100);
          Jobs.save(job);
        }
      }

      ffmpeg.stdin!.end();
      await new Promise<void>((res, rej) => {
        ffmpeg!.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg exited with code ' + code + (ffErrors.length ? ': ' + ffErrors[0] : '')))));
      });

      if (cancelled) throw new Error('__cancelled__');

      const stats = fs.statSync(outFile);
      job.status = 'done';
      job.videoPath = `${job.id}.${job.settings.format}`;
      job.fileSize = stats.size;
      job.progress = 100;
      job.consoleErrors = consoleErrors;
    } catch (e: any) {
      if (e?.message === '__cancelled__') {
        job.status = 'cancelled';
      } else {
        job.status = 'error';
        job.error = e?.message || String(e);
      }
      try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile); } catch { /* ignore */ }
    } finally {
      try { ffmpeg?.kill('SIGKILL'); } catch { /* ignore */ }
      try { await browser?.close(); } catch { /* ignore */ }
      job.finishedAt = new Date().toISOString();
      Jobs.save(job);
      activeJobs.delete(job.id);
    }
  })();

  const handle: RenderHandle = {
    promise,
    cancel: () => { cancelled = true; },
  };
  activeJobs.set(job.id, handle);
  return handle;
}

/** Generate ~160 audio peak values for waveform display. */
export async function audioPeaks(audioPath: string, buckets = 160): Promise<number[]> {
  return new Promise((resolve) => {
    const ff = spawn('ffmpeg', ['-i', audioPath, '-ac', '1', '-ar', '8000', '-f', 's16le', '-']);
    const chunks: Buffer[] = [];
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.on('close', () => {
      const buf = Buffer.concat(chunks);
      const samples = Math.floor(buf.length / 2);
      if (!samples) return resolve([]);
      const per = Math.max(1, Math.floor(samples / buckets));
      const peaks: number[] = [];
      for (let b = 0; b < buckets; b++) {
        let max = 0;
        const start = b * per;
        for (let i = start; i < Math.min(start + per, samples); i++) {
          const v = Math.abs(buf.readInt16LE(i * 2)) / 32768;
          if (v > max) max = v;
        }
        peaks.push(Math.round(max * 100) / 100);
      }
      resolve(peaks);
    });
    ff.on('error', () => resolve([]));
  });
}
