import { Request, Response } from 'express';
import { requireAuth, AuthRequest } from './auth';

const API_KEY = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || '';
const BASE_URL = process.env.AI_BASE_URL || 'https://api.moonshot.cn/v1';
const MODEL = process.env.AI_MODEL || 'kimi-k2-0905-preview';

const SYSTEM_PROMPTS: Record<string, string> = {
  explain:
    'You are an expert creative developer inside NEURAL VIDEO STUDIO, an app that turns HTML/CSS/JS into videos. Explain the user\'s source code clearly and concisely: structure, rendering behavior, animation techniques, and anything that affects video output. Use short sections with headers.',
  fix:
    'You are a debugging expert for HTML/CSS/JS animations rendered to video in a headless Chromium environment (no user interaction, deterministic virtual time; rAF, timers and CSS animations are driven per-frame). Detect rendering problems in the user\'s code — console errors, timing issues, assets that never settle, non-deterministic Math.random without seed, interactions that need clicks, etc. List problems and give corrected code snippets.',
  improve:
    'You are a motion-design expert. Suggest concrete improvements to make the user\'s HTML/CSS/JS animation more cinematic: easing, choreography, color, depth, composition. Give short bullet points plus code snippets where useful.',
  colors:
    'You are a color and art-direction expert. Suggest professional color combinations (with hex codes) that fit the user\'s code and goal, including background, primary, accent and glow colors. Return as a compact table.',
  cinematic:
    'You are a cinematic motion expert for generative web animations. Help the user design a cinematic animation: pacing, camera-like motion, atmosphere (glow, grain, vignette), typography. Provide concrete implementation advice and code.',
};

/** Free-form chat (context aware). */
export async function aiChat(req: AuthRequest, res: Response) {
  if (!API_KEY) return res.status(503).json({ error: 'AI assistant is not configured. Set MOONSHOT_API_KEY (or KIMI_API_KEY) in the server environment.' });
  const { messages } = req.body as { messages?: { role: string; content: string }[] };
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages is required' });
  try {
    const r = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are the NEURAL VIDEO STUDIO assistant — an expert in HTML/CSS/JS animation, canvas, SVG, Three.js and turning code into videos rendered in headless Chromium. Be concise, practical, and format code in fenced blocks with language tags.' },
          ...messages.slice(-20),
        ],
        temperature: 0.6,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'AI provider error: ' + t.slice(0, 300) });
    }
    const data: any = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (e: any) {
    res.status(502).json({ error: 'AI request failed: ' + (e?.message || e) });
  }
}

/** Structured assist modes (explain / fix / improve / colors / cinematic). */
export async function aiAssist(req: AuthRequest, res: Response) {
  if (!API_KEY) return res.status(503).json({ error: 'AI assistant is not configured. Set MOONSHOT_API_KEY (or KIMI_API_KEY) in the server environment.' });
  const { mode, html, css, js, prompt } = req.body as { mode?: string; html?: string; css?: string; js?: string; prompt?: string };
  const system = SYSTEM_PROMPTS[mode || ''];
  if (!system) return res.status(400).json({ error: 'Unknown mode' });
  const codeBlock = `HTML:\n\`\`\`html\n${html || '(empty)'}\n\`\`\`\n\nCSS:\n\`\`\`css\n${css || '(empty)'}\n\`\`\`\n\nJS:\n\`\`\`js\n${js || '(empty)'}\n\`\`\``;
  const userMsg = prompt ? `${prompt}\n\n${codeBlock}` : codeBlock;
  try {
    const r = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.5,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'AI provider error: ' + (await r.text()).slice(0, 300) });
    const data: any = await r.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (e: any) {
    res.status(502).json({ error: 'AI request failed: ' + (e?.message || e) });
  }
}

/** Generate a full HTML/CSS/JS animation from a prompt. Returns structured JSON code. */
export async function aiGenerate(req: AuthRequest, res: Response) {
  if (!API_KEY) return res.status(503).json({ error: 'AI assistant is not configured. Set MOONSHOT_API_KEY (or KIMI_API_KEY) in the server environment.' });
  const { prompt, duration } = req.body as { prompt?: string; duration?: number };
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const r = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are the code-generation engine of NEURAL VIDEO STUDIO. The user describes a video animation; you generate a self-contained HTML/CSS/JS animation designed to be rendered frame-by-frame in headless Chromium with a deterministic virtual clock (requestAnimationFrame, setTimeout/setInterval and CSS animations are all driven with a fixed ${duration || 6}-second timeline at 30fps; no user interaction; no external assets except optional CDN scripts like three.js; the page loops nothing automatically unless designed to — the animation should visibly evolve over the full duration).

CRITICAL: respond with a single JSON object and NOTHING else — no markdown fences, no commentary:
{"html":"body markup","css":"styles","js":"script","title":"short title"}

Rules:
- Everything must be deterministic: seed any randomness (e.g. a mulberry32 PRNG), avoid Date.now (virtual clock handles it).
- Animation must be self-driving from t=0 (use rAF or CSS animations; do NOT wait for clicks).
- Fill the viewport nicely. Use a dark, premium aesthetic unless the prompt says otherwise. Canvas animations are encouraged for particle/3D effects; SVG for iconographic motion.
- Keep total code under ~400 lines.`,
          },
          { role: 'user', content: prompt + `\n\nTarget duration: ${duration || 6} seconds.` },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: 'AI provider error: ' + (await r.text()).slice(0, 300) });
    const data: any = await r.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return res.status(502).json({ error: 'AI returned unparseable output' }); }
    res.json({
      html: String(parsed.html || ''),
      css: String(parsed.css || ''),
      js: String(parsed.js || ''),
      title: String(parsed.title || 'AI Generated'),
    });
  } catch (e: any) {
    res.status(502).json({ error: 'AI request failed: ' + (e?.message || e) });
  }
}

export function aiRoutes(router: any) {
  router.post('/ai/chat', requireAuth, aiChat);
  router.post('/ai/assist', requireAuth, aiAssist);
  router.post('/ai/generate', requireAuth, aiGenerate);
}
