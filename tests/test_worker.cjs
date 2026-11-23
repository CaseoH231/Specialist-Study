// The Worker: saving to (fake) GitHub, the passcode and address locks, sorting and the helper with a fake AI.
const path = require('path');
const { fakeGitHub, fakeAI } = require('./fakes.cjs');
(async () => {
  const { handleApi } = await import(path.join(__dirname, '..', 'worker', 'api.js'));
  const gh = fakeGitHub(); globalThis.fetch = gh.fetch;
  const checks = []; const check = (n, ok) => checks.push(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  const ai = fakeAI((msgs) => {
    const sys = msgs[0].content;
    if (sys.includes('You sort photos')) return { path: ['complex numbers', 'Polar form', 'extra'], title: 'Ex 2C Q1–6' };
    return { reply: 'Moving it.', actions: [{ type: 'move_photo', photo: 'p-aaaaaa1', topic: 't-x' }, { type: 'hack' }] };
  });
  const env = { GITHUB_TOKEN: 'ghp_test', APP_PASSCODE: 'pw', OWNER_IPS: '203.0.113.7', AI: ai };
  const req = (p, { body, pass, ip = '198.51.100.1', method } = {}) => handleApi(new Request('http://x' + p, {
    method: method || (body ? 'POST' : 'GET'), body: body && JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(pass ? { 'x-passcode': pass } : {}) } }), env);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64');

  let lib = await (await req('/api/library')).json();
  check('an empty library before anything is saved', Array.isArray(lib.topics) && lib.photos.length === 0);
  check('uploading needs the passcode (even from the owner’s address)', (await req('/api/upload', { body: { id: 'p-aaaaaa1', data: jpeg }, ip: '203.0.113.7' })).status === 401);
  check('only JPEG photos with proper ids', (await req('/api/upload', { body: { id: '../x', data: jpeg }, pass: 'pw' })).status === 400
    && (await req('/api/upload', { body: { id: 'p-aaaaaa1', data: 'PGh0bWw+' }, pass: 'pw' })).status === 400);
  check('a photo is saved to photos/', (await req('/api/upload', { body: { id: 'p-aaaaaa1', data: jpeg }, pass: 'pw' })).status === 200 && gh.files.has('photos/p-aaaaaa1.jpg'));
  const pic = await req('/photo/p-aaaaaa1.jpg');
  check('and served back at /photo/', pic.status === 200 && pic.headers.get('content-type') === 'image/jpeg' && Buffer.from(await pic.arrayBuffer()).toString('base64') === jpeg);
  check('a missing photo is a 404', (await req('/photo/p-zzzzzz9.jpg')).status === 404);

  // Sorting (AI): owner address or passcode only.
  check('sorting is locked to the owner', (await req('/api/sort', { body: { image: jpeg } })).status === 401);
  const s = await (await req('/api/sort', { body: { image: jpeg, topics: '[t-c] Complex numbers' }, ip: '203.0.113.7' })).json();
  check('sorting gives a 2-level path and a title', JSON.stringify(s.path) === '["Complex numbers","Polar form"]' && s.title === 'Ex 2C Q1–6');
  check('the AI sees the photo and the existing topics', ai.calls[0].messages[1].content[0].image_url.url.startsWith('data:image/jpeg;base64,') && ai.calls[0].messages[0].content.includes('[t-c] Complex numbers'));

  // Changes.
  let r = await req('/api/change', { body: { ops: [{ type: 'add_path', path: s.path, ids: ['t-c', 't-p'] }, { type: 'add_photo', photo: { id: 'p-aaaaaa1', topic: '@path', title: s.title } }] }, pass: 'pw' });
  lib = (await r.json()).library;
  check('changes are saved to data/library.json', r.status === 200 && JSON.parse(gh.text('data/library.json')).photos[0].topic === 't-p' && lib.topics.length === 2);
  check('changes need the passcode', (await req('/api/change', { body: { ops: [{ type: 'delete_photo', photo: 'p-aaaaaa1' }] }, ip: '203.0.113.7' })).status === 401);
  check('an empty change just checks the passcode', (await req('/api/change', { body: { ops: [] }, pass: 'pw' })).status === 400);
  // The Sunday notes job saves notes straight to GitHub; a later change from the app must keep them.
  const onGh = JSON.parse(gh.text('data/library.json')); onGh.photos[0].notes = 'Weekly notes'; gh.put('data/library.json', JSON.stringify(onGh));
  r = await req('/api/change', { body: { ops: [{ type: 'rename_topic', topic: 't-p', name: 'Polar form & Euler' }] }, pass: 'pw' });
  const after = JSON.parse(gh.text('data/library.json'));
  check('changes from the app never wipe notes saved by the weekly job', after.photos[0].notes === 'Weekly notes' && after.topics[1].name === 'Polar form & Euler');
  // Someone else saves in between: GitHub says 409, the Worker re-reads and tries again.
  const realFetch = globalThis.fetch; let clash = true;
  globalThis.fetch = async (u, o = {}) => { if (o.method === 'PUT' && clash) { clash = false; const cur = JSON.parse(gh.text('data/library.json')); cur.photos[0].notes = 'Newer notes'; gh.put('data/library.json', JSON.stringify(cur)); } return realFetch(u, o); };
  r = await req('/api/change', { body: { ops: [{ type: 'rename_photo', photo: 'p-aaaaaa1', title: 'Renamed' }] }, pass: 'pw' });
  globalThis.fetch = realFetch;
  const a2 = JSON.parse(gh.text('data/library.json'));
  check('a save that clashes is retried on the newest copy', r.status === 200 && a2.photos[0].title === 'Renamed' && a2.photos[0].notes === 'Newer notes');
  check('a bad GitHub token is reported', (await handleApi(new Request('http://x/api/change', { method: 'POST', body: JSON.stringify({ ops: [{ type: 'rename_topic', topic: 't-c', name: 'x' }] }), headers: { 'x-passcode': 'pw' } }), { ...env, GITHUB_TOKEN: 'wrong' })).status === 502);
  check('nothing to save to without the secrets', (await handleApi(new Request('http://x/api/change', { method: 'POST', body: '{}', headers: { 'x-passcode': 'pw' } }), { AI: ai })).status === 503);

  // Members (the class code): add to the shared collection, change only their own photos.
  const menv = { ...env, SHARE_CODE: 'class' };
  const mreq = (body, dev = 'd-sam') => handleApi(new Request('http://x/api/change', { method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-passcode': 'class', 'x-device': dev, 'x-name': encodeURIComponent('Sam Ø') } }), menv);
  const up = await handleApi(new Request('http://x/api/upload', { method: 'POST', body: JSON.stringify({ id: 'p-sam0001', data: jpeg }), headers: { 'x-passcode': 'class' } }), menv);
  const addR = await mreq({ ops: [{ type: 'add_path', path: ['Vectors'], ids: ['t-vec'] }, { type: 'add_photo', photo: { id: 'p-sam0001', topic: '@path', title: 'Sam’s vectors' } }] });
  const samP = JSON.parse(gh.text('data/library.json')).photos.find((p) => p.id === 'p-sam0001');
  check('members can upload and add photos and topics, which remember who added them', up.status === 200 && addR.status === 200 && samP?.by === 'd-sam' && samP.byName === 'Sam Ø');
  check('members can rename their own photo', (await mreq({ ops: [{ type: 'rename_photo', photo: 'p-sam0001', title: 'Vectors Q1' }] })).status === 200);
  check('members can’t change someone else’s photo', (await mreq({ ops: [{ type: 'delete_photo', photo: 'p-sam0001' }] }, 'd-other')).status === 403
    && (await mreq({ ops: [{ type: 'delete_photo', photo: 'p-aaaaaa1' }] })).status === 403);
  check('members can’t rename topics or unlock formulas', (await mreq({ ops: [{ type: 'rename_topic', topic: 't-vec', name: 'x' }] })).status === 403
    && (await mreq({ ops: [{ type: 'unlock_formula', name: 'Modulus' }] })).status === 403);
  check('without a code nothing can be added', (await handleApi(new Request('http://x/api/change', { method: 'POST', body: JSON.stringify({ ops: [{ type: 'add_topic', id: 't-zz', name: 'z' }] }) }), menv)).status === 401);
  const wm = await (await handleApi(new Request('http://x/api/whoami', { headers: { 'x-passcode': 'class' } }), menv)).json();
  check('whoami knows a member', wm.role === 'member' && wm.member && !wm.owner && wm.hasShareCode);

  // Helper.
  const h = await (await req('/api/assistant', { body: { messages: [{ role: 'user', content: 'move it' }], library: 'x' }, pass: 'pw' })).json();
  check('the helper suggests changes (unknown kinds dropped)', h.reply === 'Moving it.' && h.actions.length === 1 && h.actions[0].type === 'move_photo');
  check('the helper is locked to the owner', (await req('/api/assistant', { body: { messages: [{ role: 'user', content: 'hi' }] } })).status === 401);
  const lim = await handleApi(new Request('http://x/api/sort', { method: 'POST', body: JSON.stringify({ image: jpeg }) }), { AI: fakeAI(() => new Error('4006: daily free allocation')) });
  check('the free daily limit is reported', lim.status === 429);
  const w = await (await req('/api/whoami', { ip: '203.0.113.7' })).json();
  check('whoami knows the owner’s address', w.owner && w.ai && w.storage && w.hasPasscode);

  console.log(checks.join('\n')); console.log(checks.every((c) => c.startsWith('ok')) ? 'worker ok' : 'worker FAILED');
})();
