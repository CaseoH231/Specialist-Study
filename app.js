// Specialist Study – photos of Specialist Maths work, sorted into topics, with notes underneath.
//
// Two kinds of device:
//   • The owner (has the passcode saved, or is on an OWNER_IPS address): the library lives on GitHub
//     (data/library.json + photos/). Uploads and changes go through the Worker, so every device – and the
//     Sunday notes job – sees the same thing.
//   • Everyone else (friends): they see the owner's library, read-only, and can add photos of their own.
//     Theirs stay on their device only (IndexedDB), never on the server.
import { loadCourse, courseHtml, bindCourse, courseCount } from './course.js';
import { applyOps, emptyLibrary, topicOf, photoOf, kids, ancestors, pathOf, below, treeOrder, outline, formatNotes, COLORS } from './lib.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const rid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const HOME = '__home';
const K = { lib: 'specialist-study-lib', mine: 'specialist-study-mine-v1', pass: 'specialist-study-pass', open: 'specialist-study-open', chat: 'specialist-study-chat' };
const store = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } },
};
const passcode = () => store.get(K.pass, '') || '';

// ---------- data ----------
let server = store.get(K.lib) || emptyLibrary();   // the owner's library (a saved copy, refreshed from the Worker)
let mine = store.get(K.mine) || { topics: [], photos: [] }; // this device's own photos (friends)
let who = null;                                     // /api/whoami
let current = HOME, photoId = null, query = '', courseOpen = false;
const openFolders = new Set(store.get(K.open, []));
const localUrls = new Map();                        // id → object URL of a photo kept on this device

const isOwner = () => !!passcode() || !!(who?.owner && who?.locked);
// The AI features (sorting, helper): when the Worker allows this device, or there's a passcode that unlocks them.
const aiOk = () => !!who?.ai && (!!who.owner || !!who.hasPasscode);
const isMine = (id) => String(id).startsWith('my-');
// Everything shown: the owner's library plus this device's own photos.
function view() {
  return {
    topics: [...server.topics, ...mine.topics],
    photos: [...server.photos, ...mine.photos.map((p) => ({ ...p, mine: true }))],
  };
}
let V = view();
const T = (id) => topicOf(V, id);
const P = (id) => photoOf(V, id);
const photosIn = (id) => { const ids = new Set(below(V, id)); return V.photos.filter((p) => ids.has(p.topic)); };
const src = (p) => (p.mine ? localUrls.get(p.id) || '' : `photo/${p.id}.jpg`);
const day = (iso) => { const d = new Date(`${iso}T00:00:00`); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };

// ---------- this device's own photos (IndexedDB) ----------
const idb = new Promise((ok, no) => {
  if (!('indexedDB' in self)) return no(new Error('no indexedDB'));
  const r = indexedDB.open('specialist-study', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('photos');
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
});
async function idbDo(mode, fn) {
  const db = await idb;
  return new Promise((ok, no) => { const tx = db.transaction('photos', mode); const req = fn(tx.objectStore('photos')); tx.oncomplete = () => ok(req?.result); tx.onerror = () => no(tx.error); });
}
const idbPut = (id, blob) => idbDo('readwrite', (s) => s.put(blob, id));
const idbGet = (id) => idbDo('readonly', (s) => s.get(id));
const idbDel = (id) => idbDo('readwrite', (s) => s.delete(id));
async function loadLocalPhotos() {
  for (const p of mine.photos) {
    if (localUrls.has(p.id)) continue;
    try { const b = await idbGet(p.id); if (b) localUrls.set(p.id, URL.createObjectURL(b)); } catch { /* ignore */ }
  }
}
function saveMine() {
  // Their photos in topics that no longer exist (the owner deleted one) go to their own "Unsorted".
  const ids = new Set([...server.topics, ...mine.topics].map((t) => t.id));
  const lost = mine.photos.filter((p) => !ids.has(p.topic));
  if (lost.length) {
    if (!mine.topics.some((t) => t.id === 'my-unsorted')) mine.topics.push({ id: 'my-unsorted', name: 'My unsorted', color: '#64748b' });
    lost.forEach((p) => { p.topic = 'my-unsorted'; });
  }
  mine.topics.forEach((t) => { if (t.parent && !ids.has(t.parent)) delete t.parent; });
  store.set(K.mine, mine);
}

// ---------- talking to the Worker ----------
async function callApi(path, body, { askPass = true } = {}) {
  let res = null, data = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-passcode': passcode() }, body: JSON.stringify(body) });
      data = await res.json().catch(() => ({}));
    } catch { res = null; data = {}; }
    if (res?.status !== 401 || !askPass) break;
    const p = prompt(attempt ? 'That passcode didn’t work. Try again:' : 'Enter your passcode (it’s saved on this device):');
    if (!p) return { res, data, cancelled: true };
    store.set(K.pass, p.trim());
  }
  return { res, data, cancelled: false };
}
const problem = (res, data) => (!res ? 'No internet connection.'
  : data.error === 'not-set-up' ? 'The site isn’t set up for this yet (GITHUB_TOKEN / APP_PASSCODE secrets).'
  : data.error === 'bad-token' ? 'GitHub refused the save – the GITHUB_TOKEN secret may have expired.'
  : data.error === 'daily-limit' ? 'The free AI has run out for today – try again tomorrow.'
  : data.error === 'passcode' ? 'Wrong passcode.' : `Something went wrong (${res.status}).`);

async function refresh({ quiet = true } = {}) {
  try {
    const res = await fetch('api/library', { cache: 'no-store' });
    if (res.ok) {
      const lib = await res.json();
      if (Array.isArray(lib?.topics)) { server = { ...emptyLibrary(), ...lib }; store.set(K.lib, server); }
    } else if (!quiet) toast('Couldn’t reach the shared library.');
  } catch { if (!quiet) toast('You’re offline – showing the saved copy.'); }
  saveMine(); V = view(); render();
  if (!quiet) toast('Up to date ✓');
}
async function checkWho() {
  try { const r = await fetch('api/whoami', { headers: { 'x-passcode': passcode() } }); who = r.ok ? await r.json() : null; } catch { who = null; }
  document.body.classList.toggle('no-ai', !aiOk());
  $('#btn-owner').textContent = passcode() ? 'Forget my passcode on this device' : 'I’m the owner…';
}

// Change things. The owner's changes are saved to GitHub; a friend's go to their own copy.
async function change(ops, { quiet = false } = {}) {
  const forMine = ops.filter((o) => isMineOp(o)), forServer = ops.filter((o) => !isMineOp(o));
  if (forMine.length) {
    // The owner's topics are included (read-only) so their own photos and sub-topics can go inside them.
    const lib = { topics: [...structuredClone(server.topics), ...mine.topics], photos: mine.photos };
    for (const o of forMine) if (o.type === 'delete_photo') { idbDel(o.photo).catch(() => {}); }
    applyOps(lib, forMine); mine = { topics: lib.topics.filter((t) => isMine(t.id)), photos: lib.photos }; saveMine();
  }
  if (forServer.length) {
    if (!isOwner()) { toast('Only the owner can change their photos.'); return false; }
    applyOps(server, structuredClone(forServer)); V = view(); render(); // show it straight away
    const { res, data, cancelled } = await callApi('api/change', { ops: forServer });
    if (cancelled || !res?.ok) { toast(cancelled ? 'Not saved.' : `Not saved: ${problem(res, data)}`); await refresh(); return false; }
    server = data.library; store.set(K.lib, server);
  }
  V = view(); render();
  if (!quiet) toast('Saved ✓');
  return true;
}
// An op belongs to this device's own copy if the thing it changes is theirs (ids starting "my-") –
// even when it moves that thing into one of the owner's topics.
function isMineOp(o) {
  if (o.type === 'add_topic') return isMine(o.id);
  if (o.type === 'add_photo') return isMine(o.photo.id);
  if (o.type === 'add_path') return !isOwner();
  if (/_photo$/.test(o.type)) return isMine(o.photo);
  return isMine(o.topic);
}

// ---------- photos: shrink before saving ----------
async function shrink(file, max) {
  const img = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(async () => {
    const el = new Image(); el.src = URL.createObjectURL(file); await el.decode(); return el;
  });
  const w0 = img.width, h0 = img.height, k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
  const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
  return { blob, b64, w: c.width, h: c.height };
}

// ---------- uploading ----------
let uploadHint = null; // a topic to put photos in (uploading from a topic page)
function pickPhotos(topic = null) { uploadHint = topic; $('#file-pick').value = ''; $('#file-pick').click(); }
$('#file-pick').addEventListener('change', (ev) => { const files = [...ev.target.files]; if (files.length) upload(files, uploadHint); });

const topicOptions = (sel, { ownerOnly = false } = {}) => treeOrder(V).filter(({ t }) => !ownerOnly || !isMine(t.id))
  .map(({ t, depth }) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${'  '.repeat(depth)}${depth ? '└ ' : ''}${esc(t.name)}</option>`).join('');

async function upload(files, hint) {
  const owner = isOwner();
  const rows = files.map((f) => ({ file: f, id: owner ? rid('p-') : rid('my-p'), title: f.name.replace(/\.[^.]+$/, ''), topic: hint, status: 'Waiting…', url: URL.createObjectURL(f) }));
  const draw = () => {
    const done = rows.every((r) => r.state);
    showDialog(`<div class="dlg-head"><div class="grow"><h2>${done ? 'Uploaded' : 'Uploading…'}</h2>
      <p class="lead" style="margin:4px 0 0">${owner ? (hint ? 'Saving them in the topic you’re in.' : 'Each photo is saved and sorted into a topic automatically. Change anything that’s wrong.')
        : 'These stay on this device only. Pick a topic for each.'}</p></div></div>
      <div class="dlg-body"><div class="up-list">${rows.map((r, i) => `<div class="up-row"><img src="${r.url}" alt="">
        <div><span class="st ${r.state === 'ok' ? 'ok' : r.state === 'bad' ? 'bad' : ''}">${esc(r.status)}</span>
        ${r.state === 'ok' ? `<input data-title="${i}" value="${esc(r.title)}" aria-label="Title">
          <select data-topic="${i}" aria-label="Topic">${topicOptions(r.topic, { ownerOnly: false })}<option value="__new">+ New topic…</option></select>` : ''}</div></div>`).join('')}</div></div>
      <div class="dlg-foot"><span class="grow"></span><button class="primary" id="up-done" ${done ? '' : 'disabled'}>Done</button></div>`, 'small');
    $('#up-done').onclick = finish;
  };
  draw();
  for (const r of rows) {
    r.status = 'Saving…'; draw();
    try {
      const big = await shrink(r.file, 2000);
      if (owner) {
        let { res, data, cancelled } = await callApi('api/upload', { id: r.id, data: big.b64 });
        if (cancelled || !res?.ok) throw new Error(cancelled ? 'Not saved.' : problem(res, data));
        let path = null;
        if (!hint && who?.ai) {
          r.status = 'Sorting…'; draw();
          const small = await shrink(r.file, 1024);
          ({ res, data } = await callApi('api/sort', { image: small.b64, topics: outline({ topics: server.topics, photos: [] }) }, { askPass: false }));
          if (res?.ok && data.path?.length) { path = data.path; if (data.title) r.title = data.title; }
        }
        const ops = hint ? [] : [{ type: 'add_path', path: path || ['Unsorted'], ids: [rid('t-'), rid('t-')] }];
        ops.push({ type: 'add_photo', photo: { id: r.id, topic: hint || '@path', title: r.title, w: big.w, h: big.h, added: new Date().toISOString().slice(0, 10) } });
        ({ res, data } = await callApi('api/change', { ops }));
        if (!res?.ok) throw new Error(problem(res, data));
        server = data.library; store.set(K.lib, server);
        r.topic = photoOf(server, r.id)?.topic;
        r.status = `Saved in ${pathOf(server, topicOf(server, r.topic))}`;
      } else {
        await idbPut(r.id, big.blob);
        localUrls.set(r.id, URL.createObjectURL(big.blob));
        if (!hint && aiOk()) {
          r.status = 'Sorting…'; draw();
          const small = await shrink(r.file, 1024);
          const { res, data } = await callApi('api/sort', { image: small.b64, topics: outline({ topics: V.topics, photos: [] }) }, { askPass: false });
          if (res?.ok && data.path?.length) {
            // Find the topics by name (yours or the owner's), making any that are missing as your own.
            const lib = { topics: [...structuredClone(server.topics), ...mine.topics], photos: [] };
            const op = { type: 'add_path', path: data.path, ids: [rid('my-t'), rid('my-t')] };
            applyOps(lib, [op, { type: 'add_photo', photo: { id: 'p-probe0', topic: '@path' } }]);
            mine.topics = lib.topics.filter((t) => isMine(t.id));
            r.topic = lib.photos[0]?.topic; if (data.title) r.title = data.title;
            V = view();
          }
        }
        if (!r.topic || !T(r.topic)) r.topic = current !== HOME && T(current) ? current : ensureMyPhotos();
        mine.photos.push({ id: r.id, topic: r.topic, title: r.title, added: new Date().toISOString().slice(0, 10), w: big.w, h: big.h });
        saveMine();
        r.status = `Saved on this device in ${pathOf(V, T(r.topic))}`;
      }
      r.state = 'ok'; r.saved = { title: r.title, topic: r.topic };
    } catch (err) { r.state = 'bad'; r.status = `Not saved: ${err.message}`; }
    V = view(); render(); draw();
  }
  dlg.onchange = async (ev) => { // one handler per upload (replaces the last one)
    const i = ev.target.dataset.topic ?? ev.target.dataset.title; if (i == null) return;
    const r = rows[+i];
    if (ev.target.dataset.title != null) r.title = ev.target.value.trim() || r.title;
    else if (ev.target.value === '__new') {
      const name = prompt('Name of the new topic:'); const id = name && await newTopic(name, null);
      if (id) r.topic = id; draw();
    } else r.topic = ev.target.value;
  };
  async function finish() {
    const ops = [];
    rows.filter((r) => r.state === 'ok').forEach((r) => {
      if (r.title !== r.saved.title) ops.push({ type: 'rename_photo', photo: r.id, title: r.title });
      if (r.topic !== r.saved.topic) ops.push({ type: 'move_photo', photo: r.id, topic: r.topic });
    });
    dlg.close();
    if (ops.length) await change(ops);
    const first = rows.find((r) => r.state === 'ok');
    if (first && rows.filter((r) => r.state === 'ok').length === 1) go(`#/photo/${first.id}`);
    else if (first) go(`#/topic/${P(first.id)?.topic}`);
  }
}
function ensureMyPhotos() {
  if (!mine.topics.some((t) => t.id === 'my-photos')) mine.topics.push({ id: 'my-photos', name: 'My photos', color: '#0f766e' });
  return 'my-photos';
}
async function newTopic(name, parent) {
  name = String(name || '').trim(); if (!name) return null;
  const own = !isOwner() || (parent && isMine(parent));
  const id = own ? rid('my-t') : rid('t-');
  const ok = await change([{ type: 'add_topic', id, name, parent: parent || null }], { quiet: true });
  return ok ? id : null;
}

// ---------- screens ----------
const dlg = $('#dlg');
function showDialog(html, cls = '') { dlg.className = cls; dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }

const FOLDER = '<svg class="fold" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const canEdit = (id) => isMine(id) || isOwner();

function navTree(id = null, depth = 0) {
  const trail = current === HOME ? [] : [...ancestors(V, T(current) || {}), T(current)].filter(Boolean).map((t) => t.id);
  return kids(V, id).map((t) => {
    const ch = kids(V, t.id).length, open = ch && (openFolders.has(t.id) || trail.includes(t.id));
    return `<div class="node"><button class="topic ${t.id === current && !query && !photoId ? 'on' : ''}" data-topic="${t.id}" style="--c:${t.color};--d:${depth}">
      <span class="tw" ${ch ? `data-toggle="${t.id}"` : ''}>${ch ? (open ? '▾' : '▸') : ''}</span>
      <span class="dot"></span><span class="nm">${esc(t.name)}</span><span class="n">${photosIn(t.id).length}</span></button>
      ${open ? navTree(t.id, depth + 1) : ''}</div>`;
  }).join('');
}
const pcard = (p) => `<a class="pcard" href="#/photo/${encodeURIComponent(p.id)}"><div class="pic"><img src="${src(p)}" alt="" loading="lazy"></div>
  ${p.notes ? '<span class="tag">📝 Notes</span>' : ''}${p.mine ? '<span class="tag mine">Yours</span>' : ''}
  <div class="body"><b>${esc(p.title)}</b><small>${esc(day(p.added))}${current === HOME || query ? ` · ${esc(T(p.topic)?.name || '')}` : ''}</small></div></a>`;
function folderCard(t) {
  const subs = kids(V, t.id), ps = photosIn(t.id);
  return `<a class="tcard" href="#/topic/${encodeURIComponent(t.id)}" style="--c:${t.color}"><h3>${FOLDER}${esc(t.name)}</h3>
    <span class="tn">${subs.length ? `${plural(subs.length, 'sub-topic')} · ` : ''}${plural(ps.length, 'photo')}</span>
    ${ps.length ? `<div class="mosaic">${ps.slice(-4).reverse().map((p) => `<img src="${src(p)}" alt="" loading="lazy">`).join('')}</div>` : ''}</a>`;
}

function render() {
  if (current !== HOME && !T(current)) current = HOME;
  if (photoId && !P(photoId)) photoId = null;
  $('#sub').textContent = `${plural(V.photos.length, 'photo')} · ${plural(V.topics.length, 'topic')}`;
  $('#topics').innerHTML = `<button class="topic home ${current === HOME && !query && !photoId && !courseOpen ? 'on' : ''}" data-topic="${HOME}"><span class="ico">⌂</span><span class="nm">Home</span></button>
    <button class="topic home ${courseOpen ? 'on' : ''}" data-course><span class="ico">📘</span><span class="nm">Course</span><span class="n">${courseCount() || ''}</span></button>
    <div class="nav-label">Topics</div>${navTree()}<button class="topic add" id="add-topic">+ New topic</button>`;
  const main = $('#main');
  if (query) {
    const q = query.toLowerCase();
    const hits = V.photos.filter((p) => [p.title, pathOf(V, T(p.topic)), p.notes].join(' ').toLowerCase().includes(q));
    main.innerHTML = `<div class="bar"><h2>Search</h2></div><p class="lead">${plural(hits.length, 'photo')} matching “${esc(query)}”</p>
      ${hits.length ? `<div class="pgrid">${hits.map(pcard).join('')}</div>` : '<p class="empty">Nothing found.</p>'}`;
  } else if (courseOpen) { main.innerHTML = courseHtml(isOwner()); bindCourse(main, { isOwner, callApi, toast, redraw: render }); return; }
  else if (photoId) main.innerHTML = photoPage();
  else if (current === HOME) main.innerHTML = home();
  else main.innerHTML = topicPage();
  drawMaths(main);
}

function home() {
  const ps = V.photos, hr = new Date().getHours();
  const week = new Date(Date.now() - 8 * 864e5).toISOString();
  const fresh = ps.filter((p) => p.notesAt && p.notesAt > week);
  const facts = ps.length ? [plural(ps.length, 'photo'), plural(V.topics.length, 'topic'), `${ps.filter((p) => p.notes).length} with notes`].join(' · ')
    : 'Upload photos of your work and they’ll be sorted into topics for you.';
  return `<div class="hello"><div><p class="eyebrow">${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}</p>
      <h2>Specialist Maths</h2><p class="lead">${facts}</p></div>
      <div class="tools"><button class="primary" data-act="upload">⤒ Upload photos</button></div></div>
    <a class="c-link" href="#/course"><span class="c-ico">📘</span><span><b>Study design &amp; work plan</b>
      <small>${courseCount() ? `${courseCount()} document${courseCount() === 1 ? '' : 's'} – what you’re learning this year, and when` : 'What you’re learning this year, and when'}</small></span></a>
    ${ps.length ? `<h3 class="sect-h">Recently added</h3><div class="strip">${ps.slice(-10).reverse().map(pcard).join('')}</div>` : ''}
    <h3 class="sect-h">Topics</h3>
    ${V.topics.length ? `<div class="tgrid">${kids(V).map(folderCard).join('')}<button class="tcard add" data-act="new-topic"><h3>+ New topic</h3><span class="tn">Or let uploads make them</span></button></div>`
    : '<div class="empty"><p>No topics yet – they appear as you upload.</p><button class="primary" data-act="upload">⤒ Upload photos</button></div>'}
    ${fresh.length ? `<h3 class="sect-h">New notes this week <span class="count">${fresh.length}</span></h3><div class="pgrid">${fresh.map(pcard).join('')}</div>` : ''}`;
}

function crumbs(t, last = true) {
  return `<nav class="crumbs" aria-label="You are here"><a href="#/">Home</a>${[...ancestors(V, t), ...(last ? [] : [t])].map((a) =>
    ` <span>›</span> <a href="#/topic/${encodeURIComponent(a.id)}">${esc(a.name)}</a>`).join('')}${last ? ` <span>›</span> <b>${esc(t.name)}</b>` : ''}</nav>`;
}
function topicPage() {
  const t = T(current), subs = kids(V, t.id), here = V.photos.filter((p) => p.topic === t.id), all = photosIn(t.id);
  const edit = canEdit(t.id);
  return `${crumbs(t)}
    <div class="bar" style="--c:${t.color}"><h2><span class="tdot"></span>${esc(t.name)}</h2><div class="tools">
      ${edit ? `<details class="more topic-menu"><summary aria-label="Topic options">⋯</summary><div class="menu">
        <button data-act="rename-topic">Rename</button><button data-act="colour-topic">Change colour</button>
        <button data-act="move-topic">Move into another topic…</button><button class="danger" data-act="delete-topic">Delete topic…</button></div></details>` : ''}
      <button data-act="sub-topic">+ Sub-topic</button><button class="primary" data-act="upload-here">⤒ Upload here</button></div></div>
    <p class="lead">${subs.length ? `${plural(subs.length, 'sub-topic')} · ` : ''}${plural(all.length, 'photo')}${isMine(t.id) ? ' · only on this device' : ''}</p>
    ${subs.length ? `<h3 class="sect-h">Sub-topics</h3><div class="tgrid">${subs.map(folderCard).join('')}</div>` : ''}
    ${here.length ? `${subs.length ? '<h3 class="sect-h">Photos</h3>' : ''}<div class="pgrid">${here.map(pcard).join('')}</div>`
      : subs.length ? '' : '<div class="empty"><p>No photos here yet.</p><button class="primary" data-act="upload-here">⤒ Upload here</button></div>'}`;
}
const siblings = (p) => V.photos.filter((x) => x.topic === p.topic);
function photoPage() {
  const p = P(photoId), t = T(p.topic), list = siblings(p), i = list.indexOf(p);
  const prev = list[i - 1], next = list[i + 1], edit = canEdit(p.id);
  return `<div class="photo-page" style="--c:${t?.color || '#888'}">${t ? crumbs(t, false) : ''}
    <div class="bar"><h2>${esc(p.title)}</h2><div class="tools">
      ${edit ? `<details class="more topic-menu"><summary aria-label="Photo options">⋯</summary><div class="menu">
        <button data-act="rename-photo">Rename</button><button data-act="move-photo">Move to another topic…</button>
        <button class="danger" data-act="delete-photo">Delete photo…</button></div></details>` : ''}
      <button class="dark" data-act="full">⛶ Full screen</button></div></div>
    <p class="lead">${esc(day(p.added))}${p.mine ? ' · yours, only on this device' : ''}${list.length > 1 ? ` · ${i + 1} of ${list.length} in this topic` : ''}</p>
    <div class="shot"><img src="${src(p)}" alt="${esc(p.title)}" data-act="full"></div>
    ${p.notes ? `<section class="notes"><h3>Notes <small>added ${esc(new Date(p.notesAt || Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</small></h3>${formatNotes(p.notes)}</section>`
      : `<section class="notes none"><p>${p.mine ? 'Notes are only added to the owner’s photos.' : 'No notes yet – they’re added once a week.'}</p></section>`}
    <div class="note-nav">${prev ? `<a class="btn" href="#/photo/${encodeURIComponent(prev.id)}">‹ ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a class="btn" href="#/photo/${encodeURIComponent(next.id)}">${esc(next.title)} ›</a>` : ''}</div></div>`;
}
function drawMaths(el) {
  if (!window.renderMathInElement) return;
  el.querySelectorAll('.notes').forEach((n) => window.renderMathInElement(n, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true }, { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  }));
}
window.addEventListener('load', () => drawMaths($('#main')));

// ---------- full-screen viewer ----------
let viewing = null;
function openViewer(id) {
  viewing = P(id); if (!viewing) return;
  const list = siblings(viewing), i = list.indexOf(viewing);
  $('#v-img').src = src(viewing); $('#v-img').alt = viewing.title; $('#v-title').textContent = viewing.title;
  $('#v-prev').disabled = i <= 0; $('#v-next').disabled = i >= list.length - 1;
  $('#v-stage').classList.remove('zoomed'); $('#v-zoom').textContent = '＋';
  $('#viewer').hidden = false; document.body.classList.add('viewing');
}
function closeViewer() {
  $('#viewer').hidden = true; document.body.classList.remove('viewing');
  if (viewing && viewing.id !== photoId) go(`#/photo/${viewing.id}`);
  viewing = null;
}
function step(d) { if (!viewing) return; const list = siblings(viewing), n = list[list.indexOf(viewing) + d]; if (n) openViewer(n.id); }
function zoom() { const z = $('#v-stage').classList.toggle('zoomed'); $('#v-zoom').textContent = z ? '－' : '＋'; }
$('#v-close').onclick = closeViewer; $('#v-prev').onclick = () => step(-1); $('#v-next').onclick = () => step(1);
$('#v-zoom').onclick = zoom; $('#v-img').onclick = zoom;
let swipe = null;
$('#v-stage').addEventListener('pointerdown', (e) => { swipe = { x: e.clientX, y: e.clientY }; });
$('#v-stage').addEventListener('pointerup', (e) => {
  if (!swipe || $('#v-stage').classList.contains('zoomed')) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
});

// ---------- actions ----------
async function pickTopic(title, { exclude = [], allowTop = false, ownerOnly = false } = {}) {
  return new Promise((done) => {
    const opts = treeOrder(V).filter(({ t }) => !exclude.includes(t.id) && (!ownerOnly || !isMine(t.id)));
    showDialog(`<div class="dlg-head"><h2 class="grow">${esc(title)}</h2><button class="link" data-close>✕</button></div>
      <div class="dlg-body form"><select id="pick" size="${Math.min(12, opts.length + 1)}">${allowTop ? '<option value="">(Top level)</option>' : ''}
      ${opts.map(({ t, depth }) => `<option value="${t.id}">${'  '.repeat(depth)}${esc(t.name)}</option>`).join('')}</select></div>
      <div class="dlg-foot"><span class="grow"></span><button data-close>Cancel</button><button class="primary" id="pick-ok">Move</button></div>`, 'small');
    dlg.addEventListener('close', () => done(undefined), { once: true });
    $('#pick-ok').onclick = () => { const v = $('#pick').value; dlg.addEventListener('close', () => done(v), { once: true }); dlg.close(); };
  });
}
$('#main').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  ev.target.closest('details.topic-menu')?.removeAttribute('open');
  const act = b.dataset.act, t = T(current), p = photoId && P(photoId);
  if (act === 'upload') pickPhotos(null);
  else if (act === 'upload-here') pickPhotos(current);
  else if (act === 'new-topic') { const n = prompt('Name of the new topic:'); if (n) await newTopic(n, null); }
  else if (act === 'sub-topic') { const n = prompt(`New sub-topic inside “${t.name}”:`); if (n) { const id = await newTopic(n, t.id); if (id) go(`#/topic/${id}`); } }
  else if (act === 'rename-topic') { const n = prompt('New name:', t.name); if (n?.trim()) await change([{ type: 'rename_topic', topic: t.id, name: n }]); }
  else if (act === 'colour-topic') {
    const c = COLORS[(COLORS.indexOf(t.color) + 1) % COLORS.length];
    await change([{ type: 'colour_topic', topic: t.id, color: c }], { quiet: true });
  } else if (act === 'move-topic') {
    const to = await pickTopic(`Move “${t.name}” into…`, { exclude: below(V, t.id), allowTop: true, ownerOnly: !isMine(t.id) });
    if (to !== undefined) await change([{ type: 'move_topic', topic: t.id, parent: to || null }]);
  } else if (act === 'delete-topic') {
    if (confirm(`Delete “${t.name}”? Its photos and sub-topics move up a level – nothing is lost.`)) { const up = t.parent; await change([{ type: 'delete_topic', topic: t.id }]); go(up ? `#/topic/${up}` : '#/'); }
  } else if (act === 'full') openViewer(p.id);
  else if (act === 'rename-photo') { const n = prompt('New title:', p.title); if (n?.trim()) await change([{ type: 'rename_photo', photo: p.id, title: n }]); }
  else if (act === 'move-photo') {
    const to = await pickTopic(`Move “${p.title}” to…`, { exclude: [p.topic], ownerOnly: !p.mine });
    if (to) await change([{ type: 'move_photo', photo: p.id, topic: to }]);
  } else if (act === 'delete-photo') {
    if (confirm(`Delete “${p.title}”?`)) { const back = p.topic; await change([{ type: 'delete_photo', photo: p.id }]); go(`#/topic/${back}`); }
  }
});
$('#topics').addEventListener('click', async (ev) => {
  const tog = ev.target.closest('[data-toggle]');
  if (tog) { ev.stopPropagation(); const id = tog.dataset.toggle; openFolders.has(id) ? openFolders.delete(id) : openFolders.add(id); store.set(K.open, [...openFolders]); return render(); }
  if (ev.target.closest('[data-course]')) return go('#/course');
  if (ev.target.closest('#add-topic')) { const n = prompt('Name of the new topic:'); if (n) await newTopic(n, null); return; }
  const b = ev.target.closest('[data-topic]'); if (b) go(b.dataset.topic === HOME ? '#/' : `#/topic/${b.dataset.topic}`);
});

// ---------- addresses: #/  #/topic/<id>  #/photo/<id> ----------
function go(hash) { if (location.hash === hash || (hash === '#/' && !location.hash)) route(); else location.hash = hash; }
function route() {
  const [, kind, raw] = location.hash.match(/^#\/(topic|photo)\/(.+)$/) || [];
  const id = raw && decodeURIComponent(raw);
  query = ''; $('#search').value = ''; $('#msearch').value = ''; photoId = null; courseOpen = location.hash === '#/course';
  if (kind === 'photo' && P(id)) { photoId = id; current = P(id).topic; }
  else if (kind === 'topic' && T(id)) { current = id; if (kids(V, id).length) openFolders.add(id); }
  else current = HOME;
  if (dlg.open) dlg.close();
  render(); setNav(false); window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);

// ---------- helper chat ----------
let chat = store.get(K.chat, []);
const describe = (a) => {
  const tn = (id) => T(id)?.name || keyNames[id] || '?', pn = (id) => `“${P(id)?.title || '?'}”`;
  return { add_topic: `New topic “${a.name}”${a.parent ? ` inside ${tn(a.parent)}` : ''}`, rename_topic: `Rename ${tn(a.topic)} to “${a.name}”`,
    move_topic: `Move ${tn(a.topic)} ${a.parent ? `into ${tn(a.parent)}` : 'to the top level'}`, delete_topic: `Delete the topic ${tn(a.topic)} (its photos move up)`,
    move_photo: `Move ${pn(a.photo)} to ${tn(a.topic)}`, rename_photo: `Rename ${pn(a.photo)} to “${a.title}”`, delete_photo: `Delete ${pn(a.photo)}` }[a.type] || a.type;
};
let keyNames = {};
function renderChat() {
  keyNames = {};
  chat.forEach((m) => (m.actions || []).forEach((a) => { if (a.type === 'add_topic' && a.key) keyNames[a.key] = a.name; }));
  $('#bot-msgs').innerHTML = (chat.length ? '' : `<div class="msg assistant"><div class="bubble bot-hello">Hi! Ask me where something is, or to move photos and tidy topics. I’ll suggest the changes and you press “Do it”.</div>
    <div class="chips">${['Which topics have no notes yet?', 'Move everything in Unsorted to the right topics', 'Make a Proof topic and put induction inside it'].map((q) =>
      `<button class="chip ask" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`) + chat.map((m, i) => {
    const acts = (m.actions || []).filter((a) => a.type !== 'open');
    return `<div class="msg ${m.role}"><div class="bubble">${esc(m.content)}</div>${acts.length ? `<div class="proposal ${m.done ? 'done' : ''}"><b>${m.done ? 'Done' : 'Suggested changes'}</b>
      <ul>${acts.map((a) => `<li>${esc(describe(a))}</li>`).join('')}</ul>${m.done ? '' : `<button class="primary" data-do="${i}">Do it</button> <button class="link" data-skip="${i}">No thanks</button>`}</div>` : ''}</div>`;
  }).join('');
  $('#bot-msgs').scrollTop = 1e9;
}
async function askHelper(text) {
  text = String(text || '').trim(); if (!text) return;
  chat.push({ role: 'user', content: text }); renderChat();
  $('#bot-msgs').insertAdjacentHTML('beforeend', '<div class="msg assistant"><div class="bubble typing"><span></span><span></span><span></span></div></div>');
  const where = photoId ? `the photo (${photoId}) “${P(photoId)?.title}”` : current !== HOME ? `the topic [${current}] ${pathOf(V, T(current))}` : 'the home page';
  const { res, data } = await callApi('api/assistant', { messages: chat.map(({ role, content }) => ({ role, content })), library: outline(V, { notes: true }), where });
  chat.push(res?.ok ? { role: 'assistant', content: data.reply, actions: data.actions || [] } : { role: 'assistant', content: problem(res, data) });
  store.set(K.chat, chat.slice(-30)); renderChat();
  const open = (res?.ok && data.actions || []).find((a) => a.type === 'open');
  if (open) go(open.photo && P(open.photo) ? `#/photo/${open.photo}` : T(open.topic) ? `#/topic/${open.topic}` : location.hash);
}
async function doActions(i) {
  const m = chat[i]; const map = {}, ops = [];
  const id = (x) => map[x] || x;
  for (const a of m.actions || []) {
    if (a.type === 'add_topic') { const parent = id(a.parent || '') || null; map[a.key || a.name] = (parent && isMine(parent)) || !isOwner() ? rid('my-t') : rid('t-'); ops.push({ type: 'add_topic', id: map[a.key || a.name], name: a.name, parent }); }
    else if (a.type === 'move_topic') ops.push({ type: 'move_topic', topic: id(a.topic), parent: id(a.parent || '') || null });
    else if (a.type === 'move_photo') ops.push({ type: 'move_photo', photo: a.photo, topic: id(a.topic) });
    else if (a.type !== 'open') ops.push({ ...a });
  }
  if (await change(ops)) { m.done = true; store.set(K.chat, chat); renderChat(); }
}
function toggleHelper(open = !document.body.classList.contains('bot-open')) {
  document.body.classList.toggle('bot-open', open); $('#bot').hidden = !open;
  if (open) { renderChat(); setTimeout(() => $('#bot-input').focus(), 50); }
}
$('#bot-btn').onclick = () => toggleHelper();
$('#bot-close').onclick = () => toggleHelper(false);
$('#bot-form').onsubmit = (ev) => { ev.preventDefault(); const i = $('#bot-input'); askHelper(i.value); i.value = ''; };
$('#bot-input').addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); $('#bot-form').requestSubmit(); } });
$('#bot-msgs').addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-ask]'); if (a) return askHelper(a.dataset.ask);
  const d = ev.target.closest('[data-do]'); if (d) return doActions(+d.dataset.do);
  const s = ev.target.closest('[data-skip]'); if (s) { chat[+s.dataset.skip].actions = []; store.set(K.chat, chat); renderChat(); }
});

// ---------- menu ----------
$('#btn-upload').onclick = () => pickPhotos(current !== HOME && !photoId ? current : null);
$('#btn-refresh').onclick = () => refresh({ quiet: false });
$('#btn-owner').onclick = async () => {
  if (passcode()) { if (confirm('Forget the passcode on this device? It will then work like a friend’s copy.')) { store.set(K.pass, ''); await checkWho(); render(); toast('Passcode forgotten.'); } return; }
  const p = prompt('Your passcode:'); if (!p) return;
  store.set(K.pass, p.trim());
  const { res, data } = await callApi('api/change', { ops: [] }, { askPass: false });
  if (res?.status === 400) { await checkWho(); render(); toast('Owner mode on ✓ – uploads now go to your shared library.'); }
  else { store.set(K.pass, ''); toast(problem(res, data)); }
};
$('#btn-device').onclick = async () => {
  await checkWho();
  showDialog(`<div class="dlg-head"><h2 class="grow">This device</h2><button class="link" data-close>✕</button></div><div class="dlg-body">
    <p><b>${isOwner() ? 'Owner device' : 'Friend’s copy'}</b> – ${isOwner() ? 'uploads and changes are saved to your shared library on GitHub.' : 'you see the owner’s photos; photos you upload stay on this device only.'}</p>
    <p>AI sorting and helper: <b>${who?.ai && isOwner() ? 'on' : 'off'}</b>${who && !who.ai ? ' (no AI binding)' : ''}. Shared library: <b>${who?.storage ? 'connected' : 'not set up'}</b>.</p>
    ${who ? `<p class="hint">Your internet address: <code>${esc(who.ip)}</code>To lock the AI features to this network, add this to the Worker’s OWNER_IPS secret:<code>${esc(who.suggest)}</code></p>` : '<p class="hint">Offline – can’t check.</p>'}
    </div>`, 'small');
};
let installEvent = null;
window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); installEvent = ev; $('#btn-install').hidden = false; });
$('#btn-install').onclick = async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; $('#btn-install').hidden = true; };
document.addEventListener('click', (ev) => { document.querySelectorAll('details.more[open]').forEach((d) => { if (!d.contains(ev.target)) d.removeAttribute('open'); }); });

// ---------- search & keys ----------
const onSearch = (ev) => { query = ev.target.value.trim(); photoId = null; courseOpen = false; render(); };
$('#search').addEventListener('input', onSearch); $('#msearch').addEventListener('input', onSearch);
document.addEventListener('keydown', (ev) => {
  if (!$('#viewer').hidden) {
    if (ev.key === 'Escape') closeViewer(); else if (ev.key === 'ArrowLeft') step(-1); else if (ev.key === 'ArrowRight') step(1);
    return;
  }
  const typing = /input|textarea|select/i.test(ev.target.tagName);
  if (ev.key === '/' && !typing && !dlg.open) { ev.preventDefault(); $('#search').focus(); }
  if (ev.key === 'Escape' && document.body.classList.contains('nav-open')) setNav(false);
  if (!typing && !dlg.open && photoId && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
    const p = P(photoId), list = siblings(p), n = list[list.indexOf(p) + (ev.key === 'ArrowLeft' ? -1 : 1)]; if (n) go(`#/photo/${n.id}`);
  }
});

// ---------- phone: drawer and tab bar ----------
function setNav(open) {
  document.body.classList.toggle('nav-open', open);
  $('#nav-btn').setAttribute('aria-expanded', String(open));
  document.querySelectorAll('.tabbar [data-tab]').forEach((b) => b.classList.toggle('on',
    open ? b.dataset.tab === 'topics' : b.dataset.tab === 'home' && current === HOME && !photoId && !query && !courseOpen));
}
$('#nav-btn').onclick = () => setNav(!document.body.classList.contains('nav-open'));
$('#scrim').onclick = () => setNav(false);
document.querySelector('.tabbar').addEventListener('click', (ev) => {
  const tab = ev.target.closest('[data-tab]')?.dataset.tab;
  if (tab !== 'topics') setNav(false);
  if (tab === 'home') go('#/');
  else if (tab === 'topics') setNav(!document.body.classList.contains('nav-open'));
  else if (tab === 'upload') pickPhotos(current !== HOME && !photoId ? current : null);
  else if (tab === 'ask') toggleHelper();
});
$('#side').addEventListener('click', (ev) => { if (ev.target.closest('.side-tools > button, .menu button')) setNav(false); });

// ---------- start ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
saveMine(); V = view(); route();
loadLocalPhotos().then(() => render());
checkWho().then(() => render());
refresh().then(route);
loadCourse().then(() => render());
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
window.__app = { get server() { return server; }, get mine() { return mine; } }; // for the tests
