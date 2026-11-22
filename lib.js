// The photo library: topics (folders, which can sit inside each other) and photos of worked maths.
// Pure functions only – used by the app, by the Worker (which saves the owner's library to GitHub) and by the tests.
//
// library = { version: 1, updatedAt, topics: [{ id, name, parent?, color }],
//             photos: [{ id, topic, title, added, file, w, h, notes?, notesAt? }] }
// Changes are small "ops", so two devices (or the Sunday notes job) never overwrite each other's work:
//   add_topic {id, name, parent}   rename_topic {topic, name}   move_topic {topic, parent}   colour_topic {topic, color}
//   delete_topic {topic}           – its photos and sub-topics move up into its parent (nothing is lost)
//   add_photo {photo: {...}}       move_photo {photo, topic}   rename_photo {photo, title}   delete_photo {photo}
//   add_event {event: {id, date, title, kind}}   delete_event {event} – dates in the planner (SACs, tests…)
//   unlock_formula {name}   lock_formula {name} – formula-sheet entries shown on request (the helper bot)
// Photos can also carry formulas: [names] – formula-sheet entries explicitly written on them (set by the weekly notes job).
//   add_path {path: [names], ids: [new ids]} – finds or makes nested topics by name (used when sorting a photo);
//                                   an add_photo after it with topic "@path" goes in the deepest one

export const COLORS = ['#4f46e5', '#0f766e', '#c2410c', '#be185d', '#1d4ed8', '#7c3aed', '#047857', '#b45309', '#0e7490', '#9f1239'];
export const UNSORTED = 'unsorted';
export const emptyLibrary = () => ({ version: 1, updatedAt: null, topics: [], photos: [], events: [], unlocked: [] });
export const KINDS = ['SAC', 'Test', 'Exam', 'Assignment', 'Other'];

const ID = /^[a-z0-9][a-z0-9-]{0,40}$/i;
const clean = (s, max = 120) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

export const topicOf = (lib, id) => lib.topics.find((t) => t.id === id) || null;
export const photoOf = (lib, id) => lib.photos.find((p) => p.id === id) || null;
export const kids = (lib, parent = null) => lib.topics.filter((t) => (t.parent || null) === parent);
export function ancestors(lib, t) {
  const out = [], seen = new Set();
  for (let p = t && topicOf(lib, t.parent); p && !seen.has(p.id); p = topicOf(lib, p.parent)) { seen.add(p.id); out.unshift(p); }
  return out;
}
export const pathOf = (lib, t) => (t ? [...ancestors(lib, t), t].map((x) => x.name).join(' › ') : '');
// A topic and everything below it.
export function below(lib, id) {
  const out = [id];
  for (let i = 0; i < out.length; i++) kids(lib, out[i]).forEach((k) => out.push(k.id));
  return out;
}
export const photosIn = (lib, id) => { const ids = new Set(below(lib, id)); return lib.photos.filter((p) => ids.has(p.topic)); };
// Every topic, parents before children, with its depth.
export function treeOrder(lib) {
  const out = [];
  const walk = (parent, depth) => kids(lib, parent).forEach((t) => { out.push({ t, depth }); walk(t.id, depth + 1); });
  walk(null, 0);
  return out;
}
const nextColor = (lib) => COLORS[lib.topics.length % COLORS.length];
const wouldLoop = (lib, topic, parent) => !!parent && below(lib, topic).includes(parent);

function addTopic(lib, id, name, parent) {
  const t = { id, name: clean(name, 80), color: nextColor(lib) };
  if (parent) t.parent = parent;
  lib.topics.push(t);
  return t;
}
// Make sure the "Unsorted" topic exists (photos go there when sorting isn't possible).
export function ensureUnsorted(lib) {
  return topicOf(lib, UNSORTED) || addTopic(lib, UNSORTED, 'Unsorted', null);
}

// Applies ops to lib (in place). Returns { done, skipped } – ops that don't make sense are skipped, never thrown.
export function applyOps(lib, ops) {
  let done = 0; const skipped = []; const ctx = {};
  for (const op of Array.isArray(ops) ? ops : []) {
    const ok = applyOne(lib, op || {}, ctx);
    if (ok) done++; else skipped.push(op?.type || '?');
  }
  if (done) lib.updatedAt = new Date().toISOString();
  return { done, skipped };
}

function applyOne(lib, op, ctx) {
  const T = (id) => topicOf(lib, id), P = (id) => photoOf(lib, id);
  switch (op.type) {
    case 'add_topic': {
      if (!ID.test(op.id || '') || T(op.id) || !clean(op.name)) return false;
      if (op.parent && !T(op.parent)) return false;
      addTopic(lib, op.id, op.name, op.parent || null); return true;
    }
    case 'add_path': {
      const names = (op.path || []).map((n) => clean(n, 80)).filter(Boolean).slice(0, 4);
      if (!names.length) return false;
      let parent = null;
      names.forEach((name, i) => {
        const have = kids(lib, parent).find((t) => same(t.name, name));
        if (have) { parent = have.id; return; }
        const id = ID.test(op.ids?.[i] || '') && !T(op.ids[i]) ? op.ids[i] : `t-${Math.random().toString(36).slice(2, 10)}`;
        parent = addTopic(lib, id, name, parent).id;
      });
      ctx.path = parent; // the deepest topic: an add_photo after this can say topic "@path"
      return true;
    }
    case 'rename_topic': { const t = T(op.topic); if (!t || !clean(op.name)) return false; t.name = clean(op.name, 80); return true; }
    case 'colour_topic': { const t = T(op.topic); if (!t || !/^#[0-9a-f]{6}$/i.test(op.color || '')) return false; t.color = op.color; return true; }
    case 'move_topic': {
      const t = T(op.topic), parent = op.parent || null;
      if (!t || (parent && !T(parent)) || wouldLoop(lib, t.id, parent)) return false;
      if (parent) t.parent = parent; else delete t.parent;
      return true;
    }
    case 'delete_topic': {
      const t = T(op.topic); if (!t) return false;
      const up = t.parent || null;
      kids(lib, t.id).forEach((k) => { if (up) k.parent = up; else delete k.parent; });
      const loose = lib.photos.filter((p) => p.topic === t.id);
      lib.topics = lib.topics.filter((x) => x !== t);
      if (loose.length) { const home = up || ensureUnsorted(lib).id; loose.forEach((p) => { p.topic = home; }); }
      return true;
    }
    case 'add_photo': {
      const p = op.photo || {};
      if (!ID.test(p.id || '') || P(p.id)) return false;
      const want = p.topic === '@path' ? ctx.path : p.topic;
      const topic = T(want) ? want : ensureUnsorted(lib).id;
      lib.photos.push({ id: p.id, topic, title: clean(p.title) || 'Untitled', added: clean(p.added, 30) || new Date().toISOString().slice(0, 10),
        file: clean(p.file, 120) || `photos/${p.id}.jpg`, w: +p.w || 0, h: +p.h || 0 });
      return true;
    }
    case 'move_photo': { const p = P(op.photo); if (!p || !T(op.topic)) return false; p.topic = op.topic; return true; }
    case 'rename_photo': { const p = P(op.photo); if (!p || !clean(op.title)) return false; p.title = clean(op.title); return true; }
    case 'add_event': {
      const e = op.event || {};
      lib.events ||= [];
      if (!ID.test(e.id || '') || lib.events.some((x) => x.id === e.id) || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '') || !clean(e.title)) return false;
      lib.events.push({ id: e.id, date: e.date, title: clean(e.title, 80), kind: KINDS.includes(e.kind) ? e.kind : 'Other' });
      lib.events.sort((a, b) => a.date.localeCompare(b.date));
      return true;
    }
    case 'unlock_formula': {
      const n = clean(op.name, 80); lib.unlocked ||= [];
      if (!n || lib.unlocked.includes(n)) return false;
      lib.unlocked.push(n); return true;
    }
    case 'lock_formula': {
      const n = clean(op.name, 80), before = (lib.unlocked || []).length;
      lib.unlocked = (lib.unlocked || []).filter((x) => x !== n);
      return lib.unlocked.length < before;
    }
    case 'delete_event': {
      const n = (lib.events || []).length;
      lib.events = (lib.events || []).filter((x) => x.id !== op.event);
      return lib.events.length < n;
    }
    case 'delete_photo': { const p = P(op.photo); if (!p) return false; lib.photos = lib.photos.filter((x) => x !== p); return true; }
    default: return false;
  }
}

// A short text outline of the library, for the AI (ids in brackets so it can refer to them).
export function outline(lib, { notes = false } = {}) {
  return treeOrder(lib).map(({ t, depth }) => {
    const here = lib.photos.filter((p) => p.topic === t.id)
      .map((p) => `${'  '.repeat(depth + 1)}- (${p.id}) ${p.title}${notes && p.notes ? ` — notes: ${clean(p.notes, 160)}` : ''}`);
    return [`${'  '.repeat(depth)}[${t.id}] ${t.name}`, ...here].join('\n');
  }).join('\n');
}

// Tiny, safe formatter for the notes written under photos: paragraphs, "- " bullets, "### " headings, **bold**.
// Maths in $…$ or $$…$$ is left as text for KaTeX to draw.
export function formatNotes(text) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const out = []; let list = null;
  for (const line of String(text || '').split('\n')) {
    const l = line.trimEnd();
    if (/^\s*[-•*] /.test(l)) { (list ||= []).push(`<li>${inline(l.replace(/^\s*[-•*] /, ''))}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    if (!l.trim()) continue;
    const h = l.match(/^#{1,4} (.*)/);
    out.push(h ? `<h4>${inline(h[1])}</h4>` : `<p>${inline(l)}</p>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('');
}
