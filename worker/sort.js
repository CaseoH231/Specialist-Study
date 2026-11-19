// POST /api/sort {image: base64 JPEG (small), topics: outline text}
// Looks at a photo of worked maths and says which topic (and sub-topic) it belongs in, plus a short title.
// It only sorts – it doesn't copy out what's written. Nothing is saved here; the app saves the result.
import { access, refuse } from './access.js';
import { json } from './api.js';
import { ask, limitHit } from './ai.js';

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['path', 'title'],
  properties: { path: { type: 'array', items: { type: 'string' } }, title: { type: 'string' } },
};

const SYSTEM = `You sort photos of a high-school student's Specialist Mathematics work (exercise books, worksheets, textbook questions, tests) into folders in their study app.

Look at the photo and decide which topic it belongs to. Reply with:
- path: the folder path, 1 or 2 levels: [main topic, sub-topic], e.g. ["Complex numbers", "Polar form"] or ["Vectors", "Vector equations of lines"] or ["Proof", "Mathematical induction"].
  Main topics are broad Specialist Maths areas, such as: Proof, Complex numbers, Vectors, Matrices, Functions and graphs, Trigonometry, Sequences and series, Combinatorics, Calculus, Integration techniques, Differential equations, Kinematics, Mechanics, Probability and statistics.
  Sub-topics are the specific skill or section the work is on.
  IMPORTANT: reuse an existing folder whenever the work fits it, copying its name exactly. Only invent a new name when nothing existing fits.
- title: a short title for the photo (max 8 words) saying what's on it, using any exercise or question numbers you can see, e.g. "Ex 2C Q1–6: Converting to polar form" or "De Moivre's theorem examples".

If the photo isn't maths or you can't tell, use ["Unsorted"] and a title describing it.`;

export async function sort(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.AI) return json({ error: 'not-set-up' }, 503);
  const who = access(request, env);
  if (!who.owner) return refuse(who, json);
  if (Number(request.headers.get('content-length') || 0) > 4e6) return json({ error: 'too-big' }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const image = String(body?.image || '');
  if (!image.startsWith('/9j/')) return json({ error: 'bad-request' }, 400);
  const topics = String(body?.topics || '').slice(0, 20000);
  try {
    const raw = await ask(env, [
      { role: 'system', content: `${SYSTEM}\n\nThe student's existing folders (sub-folders indented):\n${topics || '(none yet)'}\n\nReply with one JSON object only: {"path": [...], "title": "..."}` },
      { role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }, { type: 'text', text: 'Which folder does this photo go in?' }] },
    ], SCHEMA, 300);
    const path = (Array.isArray(raw?.path) ? raw.path : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1, 80));
    const title = String(raw?.title || '').trim().slice(0, 100);
    if (!path.length) return json({ error: 'no-reply' }, 502);
    return json({ path, title });
  } catch (err) {
    if (limitHit(err)) return json({ error: 'daily-limit' }, 429);
    return json({ error: 'failed', detail: String(err?.message || err) }, 500);
  }
}
