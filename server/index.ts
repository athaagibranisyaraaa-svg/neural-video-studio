import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import JSZip from 'jszip';
import {
  Users, Projects, Jobs, uid, User, Project, Job,
  ProjectSettings, VIDEO_DIR, UPLOAD_DIR, userStorageBytes,
} from './db';
import { signToken, requireAuth, AuthRequest } from './auth';
import { startRender, cancelRender, audioPeaks } from './render';
import { aiRoutes } from './ai';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT || 4000);
const ROOT = path.resolve(__dirname, '..');

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const auth = req as AuthRequest;
      cb(null, `${auth.user?.id || 'anon'}_${uid()}_${file.originalname.replace(/[^\w.\-]/g, '_')}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const DEFAULT_SETTINGS: ProjectSettings = {
  width: 1280, height: 720, fps: 30, duration: 6,
  format: 'mp4', quality: 'standard', backgroundColor: '#0a0e1a',
  audioPath: null, audioVolume: 1,
};

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (Users.byEmail(email)) return res.status(409).json({ error: 'Email already registered' });
  const user: User = {
    id: uid(), name: String(name), email: String(email),
    passwordHash: await bcrypt.hash(String(password), 10),
    createdAt: new Date().toISOString(),
  };
  Users.create(user);
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = Users.byEmail(email || '');
  if (!user || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: { id: req.user!.id, name: req.user!.name, email: req.user!.email, createdAt: req.user!.createdAt } });
});

// ---------- Projects ----------
app.get('/api/projects', requireAuth, (req: AuthRequest, res) => {
  res.json({ projects: Projects.forUser(req.user!.id) });
});

app.post('/api/projects', requireAuth, (req: AuthRequest, res) => {
  const { name, html, css, js, settings } = req.body || {};
  const p: Project = {
    id: uid(), userId: req.user!.id, name: String(name || 'Untitled Project'),
    html: String(html || ''), css: String(css || ''), js: String(js || ''),
    settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  Projects.create(p);
  res.json({ project: p });
});

app.get('/api/projects/:id', requireAuth, (req: AuthRequest, res) => {
  const p = Projects.byId(req.params.id);
  if (!p || p.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });
  res.json({ project: p });
});

app.put('/api/projects/:id', requireAuth, (req: AuthRequest, res) => {
  const p = Projects.byId(req.params.id);
  if (!p || p.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });
  const { name, html, css, js, settings } = req.body || {};
  if (name !== undefined) p.name = String(name);
  if (html !== undefined) p.html = String(html);
  if (css !== undefined) p.css = String(css);
  if (js !== undefined) p.js = String(js);
  if (settings) p.settings = { ...p.settings, ...settings };
  Projects.update(p);
  res.json({ project: p });
});

app.delete('/api/projects/:id', requireAuth, (req: AuthRequest, res) => {
  const p = Projects.byId(req.params.id);
  if (!p || p.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });
  Projects.remove(p.id);
  res.json({ ok: true });
});

// ---------- Uploads (code files / zips / audio) ----------
app.post('/api/upload/project', requireAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const buf = fs.readFileSync(req.file.path);
    let html = '', css = '', js = '';
    if (req.file.originalname.toLowerCase().endsWith('.zip')) {
      const zip = await JSZip.loadAsync(buf);
      const files: Record<string, string> = {};
      for (const [name, file] of Object.entries(zip.files)) {
        if (file.dir) continue;
        files[name.replace(/^.*?\//, '')] = await file.async('string');
      }
      const find = (ext: string) => Object.keys(files).find(n => n.toLowerCase().endsWith(ext)) || '';
      html = files[find('.html')] || '';
      css = Object.keys(files).filter(n => n.endsWith('.css')).map(n => files[n]).join('\n');
      js = Object.keys(files).filter(n => n.endsWith('.js')).map(n => files[n]).join('\n');
      if (!html) return res.status(400).json({ error: 'ZIP must contain an .html file' });
    } else if (req.file.originalname.toLowerCase().match(/\.(html?|css|js|ts|tsx)$/)) {
      const text = buf.toString('utf8');
      const ext = req.file.originalname.split('.').pop()!.toLowerCase();
      if (ext.startsWith('htm')) html = text;
      else if (ext === 'css') css = text;
      else js = text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload .html, .css, .js or .zip' });
    }
    res.json({ html, css, js, filename: req.file.originalname });
  } catch (e: any) {
    res.status(400).json({ error: 'Failed to parse file: ' + (e?.message || e) });
  }
});

app.post('/api/upload/audio', requireAuth, upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ audioPath: req.file.path, name: req.file.originalname });
});

// ---------- Render jobs ----------
app.post('/api/render', requireAuth, (req: AuthRequest, res) => {
  const { projectId, name, html, css, js, settings } = req.body || {};
  let source: { html: string; css: string; js: string; name: string } | null = null;
  if (projectId) {
    const p = Projects.byId(projectId);
    if (!p || p.userId !== req.user!.id) return res.status(404).json({ error: 'Project not found' });
    source = { html: p.html, css: p.css, js: p.js, name: p.name };
  } else {
    source = { html: String(html || ''), css: String(css || ''), js: String(js || ''), name: String(name || 'Untitled') };
  }
  const s: ProjectSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  s.duration = Math.min(Math.max(1, Number(s.duration) || 6), 60);
  s.fps = [24, 30, 60].includes(s.fps) ? s.fps : 30;
  if (s.format !== 'webm') s.format = 'mp4';

  const job: Job = {
    id: uid(), userId: req.user!.id, projectId: projectId || null,
    projectName: source.name, settings: s, status: 'queued', progress: 0,
    error: null, consoleErrors: [], videoPath: null, fileSize: 0, duration: s.duration,
    createdAt: new Date().toISOString(), startedAt: null, finishedAt: null,
  };
  Jobs.create(job);
  startRender(job, source.html, source.css, source.js);
  res.json({ job });
});

app.get('/api/jobs', requireAuth, (req: AuthRequest, res) => {
  res.json({ jobs: Jobs.forUser(req.user!.id).slice(0, 100) });
});

app.get('/api/jobs/:id', requireAuth, (req: AuthRequest, res) => {
  const j = Jobs.byId(req.params.id);
  if (!j || j.userId !== req.user!.id) return res.status(404).json({ error: 'Job not found' });
  res.json({ job: j });
});

app.get('/api/jobs/:id/peaks', requireAuth, async (req: AuthRequest, res) => {
  const j = Jobs.byId(req.params.id);
  if (!j || j.userId !== req.user!.id) return res.status(404).json({ error: 'Job not found' });
  if (!j.settings.audioPath || !fs.existsSync(j.settings.audioPath)) return res.json({ peaks: [] });
  res.json({ peaks: await audioPeaks(j.settings.audioPath) });
});

app.post('/api/jobs/:id/cancel', requireAuth, (req: AuthRequest, res) => {
  const j = Jobs.byId(req.params.id);
  if (!j || j.userId !== req.user!.id) return res.status(404).json({ error: 'Job not found' });
  if (j.status === 'queued' || j.status === 'rendering') cancelRender(j.id);
  res.json({ ok: true });
});

app.get('/api/videos/:jobId', requireAuth, (req: AuthRequest, res) => {
  const j = Jobs.byId(req.params.jobId);
  if (!j || j.userId !== req.user!.id || !j.videoPath) return res.status(404).json({ error: 'Video not found' });
  const file = path.join(VIDEO_DIR, path.basename(j.videoPath));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Video file missing' });
  const stat = fs.statSync(file);
  res.setHeader('Content-Type', j.settings.format === 'webm' ? 'video/webm' : 'video/mp4');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `inline; filename="${(j.projectName || 'video').replace(/[^\w\- ]/g, '')}.${j.settings.format}"`);
  fs.createReadStream(file).pipe(res);
});

// ---------- Stats ----------
app.get('/api/stats', requireAuth, (req: AuthRequest, res) => {
  const jobs = Jobs.forUser(req.user!.id);
  const projects = Projects.forUser(req.user!.id);
  const done = jobs.filter(j => j.status === 'done');
  const totalRenderTime = done.reduce((a, j) => a + j.duration, 0);
  const storageBytes = userStorageBytes(req.user!.id);

  const days: { date: string; renders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, renders: jobs.filter(j => j.createdAt.slice(0, 10) === key).length });
  }
  const fmtBytes = (b: number) => {
    if (b > 1e9) return (b / 1e9).toFixed(2) + ' GB';
    if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
    return Math.round(b / 1e3) + ' KB';
  };
  res.json({
    totalVideos: done.length,
    totalRenderTime,
    storageBytes, storageFormatted: fmtBytes(storageBytes),
    projectCount: projects.length,
    queued: jobs.filter(j => j.status === 'queued' || j.status === 'rendering').length,
    activity: days,
    recentProjects: projects.slice(0, 6),
    recentJobs: jobs.slice(0, 8),
  });
});

aiRoutes(app);

// ---------- Static client ----------
const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  console.log(`NEURAL VIDEO STUDIO server running on http://localhost:${PORT}`);
});
