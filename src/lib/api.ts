export interface UserInfo { id: string; name: string; email: string; createdAt?: string }
export interface Settings {
  width: number; height: number; fps: number; duration: number;
  format: 'mp4' | 'webm'; quality: 'draft' | 'standard' | 'high';
  backgroundColor: string; audioPath?: string | null; audioVolume: number;
}
export interface Project {
  id: string; userId: string; name: string; html: string; css: string; js: string;
  settings: Settings; createdAt: string; updatedAt: string;
}
export type JobStatus = 'queued' | 'rendering' | 'done' | 'error' | 'cancelled';
export interface Job {
  id: string; userId: string; projectId: string | null; projectName: string;
  settings: Settings; status: JobStatus; progress: number; error: string | null;
  consoleErrors: string[]; videoPath: string | null; fileSize: number; duration: number;
  createdAt: string; startedAt: string | null; finishedAt: string | null;
}
export interface Stats {
  totalVideos: number; totalRenderTime: number; storageBytes: number; storageFormatted: string;
  projectCount: number; queued: number;
  activity: { date: string; renders: number }[];
  recentProjects: Project[]; recentJobs: Job[];
}

const TOKEN_KEY = 'nvs_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    setToken(null);
    window.dispatchEvent(new Event('nvs:logout'));
    throw new Error('Session expired — please sign in again');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: UserInfo }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: UserInfo }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: UserInfo }>('/api/auth/me'),
  projects: () => request<{ projects: Project[] }>('/api/projects'),
  createProject: (body: Partial<Project>) =>
    request<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  saveProject: (id: string, body: Partial<Project>) =>
    request<{ project: Project }>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProject: (id: string) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
  uploadProject: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ html: string; css: string; js: string; filename: string }>('/api/upload/project', { method: 'POST', body: fd });
  },
  uploadAudio: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ audioPath: string; name: string }>('/api/upload/audio', { method: 'POST', body: fd });
  },
  render: (body: { projectId?: string; name?: string; html?: string; css?: string; js?: string; settings: Settings }) =>
    request<{ job: Job }>('/api/render', { method: 'POST', body: JSON.stringify(body) }),
  jobs: () => request<{ jobs: Job[] }>('/api/jobs'),
  job: (id: string) => request<{ job: Job }>(`/api/jobs/${id}`),
  cancelJob: (id: string) => request<{ ok: boolean }>(`/api/jobs/${id}/cancel`, { method: 'POST' }),
  peaks: (id: string) => request<{ peaks: number[] }>(`/api/jobs/${id}/peaks`),
  stats: () => request<Stats>('/api/stats'),
  videoUrl: (jobId: string) => `/api/videos/${jobId}`,
  aiChat: (messages: { role: string; content: string }[]) =>
    request<{ reply: string }>('/api/ai/chat', { method: 'POST', body: JSON.stringify({ messages }) }),
  aiAssist: (body: { mode: string; html?: string; css?: string; js?: string; prompt?: string }) =>
    request<{ reply: string }>('/api/ai/assist', { method: 'POST', body: JSON.stringify(body) }),
  aiGenerate: (body: { prompt: string; duration: number }) =>
    request<{ html: string; css: string; js: string; title: string }>('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) }),
};

/** Fetch a video as an authenticated blob URL. */
export async function videoBlobUrl(jobId: string): Promise<string> {
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(api.videoUrl(jobId), { headers });
  if (!res.ok) throw new Error('Could not load video');
  return URL.createObjectURL(await res.blob());
}
