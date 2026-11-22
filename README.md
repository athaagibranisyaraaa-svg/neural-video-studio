# NEURAL VIDEO STUDIO

A premium AI-powered platform that turns source code (HTML / CSS / JavaScript) into real, downloadable videos.
Code is rendered frame-by-frame in headless Chromium with a deterministic virtual clock, captured as PNG
frames, and encoded to MP4 (H.264) or WebM (VP8 + Opus) with FFmpeg.

## Features

- **Code → Video engine** — paste HTML/CSS/JS or upload `.html/.css/.js` files / ZIP projects; live preview panel
- **Deterministic rendering** — a virtual clock drives `requestAnimationFrame`, timers, `Date.now`,
  `performance.now` and CSS animations (`document.getAnimations().currentTime`), so canvas, SVG, CSS
  transitions and Three.js scenes (CDN) render perfectly in sync with the exported timeline
- **Export settings** — 720p/1080p/1440p/4K, 16:9 / 9:16 / 1:1 / 4:3, 24/30/60 FPS, 1–30 s duration,
  background color, quality presets, MP4 or WebM, optional background music (muxed into the video)
- **Rendering pipeline** — job queue with live progress, console-error capture, cancel support
- **Video player** — play/pause, timeline seek, volume, fullscreen, waveform visualization when audio is attached
- **Projects** — create, rename, delete, save, reopen; per-user storage
- **Dashboard** — totals, render-time stats, storage usage, 14-day activity chart (Recharts), recent projects & history
- **AI assistant** (server-side, key in env) — explain code, detect rendering problems, suggest improvements,
  color palettes, cinematic advice, and prompt→animation generation
- **Auth** — register / login / logout, JWT (30 d) + bcrypt, per-user data isolation

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Monaco Editor, Recharts, lucide-react |
| Backend  | Node.js + Express (TS, run with `tsx`), Puppeteer-core + system Chromium, FFmpeg |
| Storage  | JSON document store (`storage/db.json`) + disk storage (`storage/videos`, `storage/uploads`) |

## Requirements

- Node.js ≥ 20
- FFmpeg on `PATH`
- Chromium on the system (`CHROMIUM_PATH` env var if not at `/usr/bin/chromium`)

## Quick start

```bash
npm install

# development (Vite dev server on :3000 with API proxy → server on :4000)
npm run dev:all

# production
npm run build          # needs ~3 GB heap: NODE_OPTIONS=--max-old-space-size=3072
npm start              # serves API + built client on http://localhost:4000
```

## Environment variables

Create `.env` in the project root (loaded via your process manager / shell — the server reads `process.env`):

```bash
# required for the AI assistant (never exposed to the browser)
MOONSHOT_API_KEY=sk-...          # or KIMI_API_KEY
AI_BASE_URL=https://api.moonshot.cn/v1   # optional
AI_MODEL=kimi-k2-0905-preview            # optional

# optional
PORT=4000
JWT_SECRET=change-me             # generated & persisted automatically if unset
CHROMIUM_PATH=/usr/bin/chromium
```

Without an AI key the whole app works; the assistant endpoints return a clear
"not configured" message and the UI explains how to enable them.

## API overview

All endpoints except `/api/auth/*` require `Authorization: Bearer <jwt>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` · `/api/auth/login` | create session |
| GET  | `/api/auth/me` | current user |
| GET/POST | `/api/projects` · `/api/projects/:id` (GET/PUT/DELETE) | project CRUD |
| POST | `/api/upload/project` | upload `.html/.css/.js/.zip` → parsed code |
| POST | `/api/upload/audio` | attach background music |
| POST | `/api/render` | queue a render (projectId or inline code + settings) |
| GET  | `/api/jobs` · `/api/jobs/:id` | queue + progress |
| POST | `/api/jobs/:id/cancel` | cancel a render |
| GET  | `/api/jobs/:id/peaks` | waveform peaks (when audio attached) |
| GET  | `/api/videos/:jobId` | stream the rendered video (auth) |
| GET  | `/api/stats` | dashboard statistics |
| POST | `/api/ai/chat` · `/api/ai/assist` · `/api/ai/generate` | AI assistant |

## Deployment

### Docker

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg chromium && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./ && RUN npm install
COPY . .
ENV CHROMIUM_PATH=/usr/bin/chromium
RUN NODE_OPTIONS=--max-old-space-size=3072 npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

A `Dockerfile` is included. Persist the `storage/` directory (database + videos) with a volume.

### Traditional

1. Install Node 20, FFmpeg and Chromium on the host.
2. `npm install && npm run build`
3. Run behind a reverse proxy (nginx) with `npm start`; set `JWT_SECRET`, `MOONSHOT_API_KEY` etc. in the environment.
4. Back up `storage/`.

## Notes

- Rendering resolution above 1080p at 60 FPS is heavy — one frame = one headless screenshot; scale worker count if needed.
- User code runs inside a sandboxed headless page; it is rendered, not executed against your server.
- Uploaded code runs in the user's own browser preview inside a `sandbox="allow-scripts"` iframe (no same-origin access).
