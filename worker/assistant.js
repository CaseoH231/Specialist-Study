// POST /api/assistant {messages, library: outline text, where}
// The helper chat: answers questions about the photos and suggests changes (moving photos, making or renaming
// folders…). Changes are only suggestions – the app shows them and nothing happens until you press "Do it".
import { access, refuse } from './access.js';
import { json } from './api.js';
import { ask, limitHit } from './ai.js';

export const ACTIONS = ['add_topic', 'rename_topic', 'move_topic', 'delete_topic', 'move_photo', 'rename_photo', 'delete_photo', 'open', 'unlock_formula', 'lock_formula'];
const STR = { type: 'string' };
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'actions'],
  properties: {
    reply: STR,
    actions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type'], properties: {
      type: { type: 'string', enum: ACTIONS }, key: STR, topic: STR, photo: STR, name: STR, parent: STR, title: STR,
    } } },
  },
};

const SYSTEM = `You are the helper inside "Specialist Study", a high-school student's app for photos of their Specialist Mathematics work. Photos are sorted into folders (topics), and folders can sit inside other folders. The student talks to you in a chat box.

You're given the folders and photos. Folder ids look like [t-…] and photo ids like (p-…). Some photos have notes written under them.

You can:
- Answer questions about where things are, and about what's in their uploaded photos – using ONLY the folder names, photo titles and the notes under the photos listed below (short, friendly).
  This is a study helper, not a tutor: don't teach, explain or give maths that isn't in those notes – no new formulas, methods, worked examples or answers to homework.
  If they ask about something that isn't in their uploads, say it isn't in their uploaded work yet and suggest they upload their work on it (then it'll get notes on Sunday).
- Suggest changes, but only ones the student asked for. Each change is one action:
  add_topic {key, name, parent}   – key is a new id like "new-1" that later actions can use; parent is a folder id, a new key, or "" for top level
  rename_topic {topic, name}
  move_topic {topic, parent}      – parent "" = top level
  delete_topic {topic}            – the photos and sub-folders inside move up a level; nothing is lost
  move_photo {photo, topic}       – topic is a folder id or a new key
  rename_photo {photo, title}
  delete_photo {photo}
  open {topic} or open {photo}    – show that page (happens straight away)
  unlock_formula {name}           – show a formula-sheet entry (name exactly as in the formula list below), e.g. when they say it's on their photo
  lock_formula {name}             – hide one again

The formula sheet starts locked: a formula only shows once it's on one of their photos or they ask you to unlock it. Only unlock or lock when they ask.

For topic and photo, give the id exactly as it appears inside the brackets, without the brackets – e.g. "t-k3x9ab" or "p-mf2a7q", never a name. Use only ids that exist in the list (or keys you make with add_topic). In "reply", say in a sentence or two what you found or what you're suggesting. Changes are NOT done when you reply: the app shows them with a "Do it" button, so never say you've done them.

Reply with one JSON object only: {"reply": "...", "actions": [...]} (actions is [] when there's nothing to do).`;

export async function assistant(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.AI) return json({ error: 'not-set-up' }, 503);
  const who = access(request, env);
  if (!who.owner) return refuse(who, json);
  if (Number(request.headers.get('content-length') || 0) > 300000) return json({ error: 'too-big' }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'bad-request' }, 400);
  try {
    const raw = await ask(env, [
      { role: 'system', content: `${SYSTEM}\n\nFolders and photos:\n${String(body.library || '').slice(0, 60000) || '(none yet)'}\n\nFormula sheet (✓ shown, 🔒 locked):\n${String(body.formulas || '').slice(0, 8000) || '(none)'}\n\nThey are looking at: ${String(body.where || 'the home page').slice(0, 300)}` },
      ...history,
    ], SCHEMA, 2000);
    if (!raw || typeof raw.reply !== 'string') return json({ error: 'no-reply' }, 502);
    const actions = (Array.isArray(raw.actions) ? raw.actions : []).filter((a) => a && ACTIONS.includes(a.type)).slice(0, 60);
    return json({ reply: raw.reply.trim(), actions });
  } catch (err) {
    if (limitHit(err)) return json({ error: 'daily-limit' }, 429);
    return json({ error: 'failed', detail: String(err?.message || err) }, 500);
  }
}
