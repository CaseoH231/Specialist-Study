// Everything under /api/ (and the photos at /photo/<id>.jpg).
//   GET  /api/whoami     – may this device use the AI features; the address to put in OWNER_IPS
//   GET  /api/library    – the owner's photo library (data/library.json on GitHub). Anyone can read it.
//   POST /api/change     – {ops} changes to the library (passcode). Applied to the newest copy, so nothing is overwritten.
//   POST /api/upload     – {id, data} saves a photo as photos/<id>.jpg (passcode)
//   GET  /photo/<id>.jpg – a saved photo
//   POST /api/sort       – which topic a photo belongs in (owner – AI, free Workers AI allowance)
//   POST /api/assistant  – the helper chat (owner – AI)
// Writes always need the APP_PASSCODE, because they change what everyone sees.
import { access } from './access.js';
import { readText, readBytes, write, toBase64, GitHubError } from './github.js';
import { applyOps, emptyLibrary } from '../lib.js';
import { sort } from './sort.js';
import { assistant } from './assistant.js';

export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const LIBRARY = 'data/library.json';
const cache = () => (typeof caches !== 'undefined' && caches.default) || null;
const LIB_KEY = 'https://specialist-study.cache/library';

function writeCheck(request, env) {
  if (!env.GITHUB_TOKEN || !env.APP_PASSCODE) return json({ error: 'not-set-up' }, 503);
  if (request.headers.get('x-passcode') !== env.APP_PASSCODE) return json({ error: 'passcode' }, 401);
  return null;
}
const ghFail = (err) => (err instanceof GitHubError
  ? json({ error: err.status === 401 || err.status === 403 ? 'bad-token' : 'github', status: err.status }, 502)
  : json({ error: 'failed', detail: String(err?.message || err) }, 500));

async function getLibrary(env) {
  const file = await readText(env, LIBRARY);
  return file ? { sha: file.sha, lib: { ...emptyLibrary(), ...JSON.parse(file.text) } } : { sha: undefined, lib: emptyLibrary() };
}

async function library(env) {
  if (!env.GITHUB_TOKEN) return json({ error: 'not-set-up' }, 404);
  const hit = await cache()?.match(LIB_KEY);
  if (hit) return hit;
  try {
    const { lib } = await getLibrary(env);
    const out = new Response(JSON.stringify(lib), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=20' } });
    await cache()?.put(LIB_KEY, out.clone());
    return out;
  } catch (err) { return ghFail(err); }
}

async function change(request, env) {
  const no = writeCheck(request, env); if (no) return no;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const ops = Array.isArray(body?.ops) ? body.ops.slice(0, 200) : null;
  if (!ops?.length) return json({ error: 'bad-request' }, 400);
  // Someone else (another device, or the Sunday notes job) may save at the same moment: then GitHub refuses
  // the old version, so fetch the newest one and apply the ops again.
  for (let tries = 0; tries < 4; tries++) {
    try {
      const { sha, lib } = await getLibrary(env);
      const result = applyOps(lib, structuredClone(ops));
      if (!result.done) return json({ ok: true, library: lib, ...result });
      const what = [...new Set(ops.map((o) => o.type))].join(', ');
      await write(env, LIBRARY, toBase64(JSON.stringify(lib, null, 1)), `App: ${what} (${result.done} change${result.done === 1 ? '' : 's'})`, sha);
      await cache()?.delete(LIB_KEY);
      return json({ ok: true, library: lib, ...result });
    } catch (err) {
      if (err instanceof GitHubError && (err.status === 409 || err.status === 422) && tries < 3) continue;
      return ghFail(err);
    }
  }
  return json({ error: 'busy' }, 503);
}

async function upload(request, env) {
  const no = writeCheck(request, env); if (no) return no;
  if (Number(request.headers.get('content-length') || 0) > 12e6) return json({ error: 'too-big' }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad-request' }, 400); }
  const id = String(body?.id || ''), data = String(body?.data || '');
  if (!/^p-[a-z0-9]{6,30}$/.test(id) || !data.startsWith('/9j/')) return json({ error: 'bad-request' }, 400); // JPEG only
  try {
    await write(env, `photos/${id}.jpg`, data, `App: add photo ${id}`);
    return json({ ok: true, file: `photos/${id}.jpg` });
  } catch (err) {
    if (err instanceof GitHubError && err.status === 422) return json({ ok: true, file: `photos/${id}.jpg` }); // already there
    return ghFail(err);
  }
}

async function photo(request, env, id) {
  const key = `https://specialist-study.cache/photo/${id}`;
  const hit = await cache()?.match(key);
  if (hit) return hit;
  if (!env.GITHUB_TOKEN) return new Response('Not found', { status: 404 });
  try {
    const bytes = await readBytes(env, `photos/${id}.jpg`);
    if (!bytes) return new Response('Not found', { status: 404 });
    const out = new Response(bytes, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
    await cache()?.put(key, out.clone());
    return out;
  } catch { return new Response('Not available', { status: 502 }); }
}

export async function handleApi(request, env) {
  const { pathname } = new URL(request.url);
  const pic = pathname.match(/^\/photo\/(p-[a-z0-9]{6,30})\.jpg$/);
  if (pic) return photo(request, env, pic[1]);
  if (pathname === '/api/library') return library(env);
  if (pathname === '/api/change') return request.method === 'POST' ? change(request, env) : json({ error: 'method' }, 405);
  if (pathname === '/api/upload') return request.method === 'POST' ? upload(request, env) : json({ error: 'method' }, 405);
  if (pathname === '/api/sort') return sort(request, env);
  if (pathname === '/api/assistant') return assistant(request, env);
  if (pathname === '/api/whoami') {
    const a = access(request, env);
    return json({ ip: a.ip, suggest: a.suggest, owner: a.owner, locked: a.locked, ipLocked: a.ipLocked, hasPasscode: a.hasPasscode,
      ai: !!env.AI, storage: !!env.GITHUB_TOKEN });
  }
  return json({ error: 'not-found' }, 404);
}
