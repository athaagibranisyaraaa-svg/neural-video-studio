import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
export const STORAGE_DIR = path.join(ROOT, 'storage');
export const VIDEO_DIR = path.join(STORAGE_DIR, 'videos');
export const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
const DB_FILE = path.join(STORAGE_DIR, 'db.json');

for (const d of [STORAGE_DIR, VIDEO_DIR, UPLOAD_DIR]) fs.mkdirSync(d, { recursive: true });

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface ProjectSettings {
  width: number; height: number; fps: number; duration: number;
  format: 'mp4' | 'webm'; quality: 'draft' | 'standard' | 'high';
  backgroundColor: string; audioPath?: string | null; audioVolume: number;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  html: string; css: string; js: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'queued' | 'rendering' | 'done' | 'error' | 'cancelled';

export interface Job {
  id: string;
  userId: string;
  projectId: string | null;
  projectName: string;
  settings: ProjectSettings;
  status: JobStatus;
  progress: number; // 0..100
  error: string | null;
  consoleErrors: string[];
  videoPath: string | null; // relative to VIDEO_DIR
  fileSize: number;
  duration: number; // rendered seconds
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface DBShape {
  users: User[];
  projects: Project[];
  jobs: Job[];
}

let db: DBShape = { users: [], projects: [], jobs: [] };
if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { /* start fresh */ }
}

let saveTimer: NodeJS.Timeout | null = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}

export const uid = () => crypto.randomBytes(12).toString('hex');

export const Users = {
  byEmail: (email: string) => db.users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  byId: (id: string) => db.users.find(u => u.id === id),
  create: (u: User) => { db.users.push(u); persist(); return u; },
};

export const Projects = {
  forUser: (userId: string) => db.projects.filter(p => p.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  byId: (id: string) => db.projects.find(p => p.id === id),
  create: (p: Project) => { db.projects.push(p); persist(); return p; },
  update: (p: Project) => { p.updatedAt = new Date().toISOString(); persist(); return p; },
  remove: (id: string) => { db.projects = db.projects.filter(p => p.id !== id); persist(); },
};

export const Jobs = {
  forUser: (userId: string) => db.jobs.filter(j => j.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  byId: (id: string) => db.jobs.find(j => j.id === id),
  create: (j: Job) => { db.jobs.push(j); persist(); return j; },
  save: (j: Job) => { persist(); return j; },
};

export function userStorageBytes(userId: string): number {
  let total = 0;
  for (const j of db.jobs) {
    if (j.userId === userId && j.videoPath) {
      const f = path.join(VIDEO_DIR, j.videoPath);
      try { total += fs.statSync(f).size; } catch { /* missing */ }
    }
  }
  try {
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      if (f.startsWith(userId + '_')) total += fs.statSync(path.join(UPLOAD_DIR, f)).size;
    }
  } catch { /* ignore */ }
  return total;
}
