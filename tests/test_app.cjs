// The app in a real browser, with the real Worker code behind it (fake GitHub, fake AI).
//   Owner: upload → saved and sorted → topic page → photo page → full screen → helper moves it.
//   Friend: sees the owner's photos read-only; their own uploads stay on their device.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const { fakeGitHub, fakeAI } = require('./fakes.cjs');
const APP_KEY = 'specialist-study';
const BASE = 'http://localhost:8767/';
(async () => {
  const { handleApi } = await import(path.join(__dirname, '..', 'worker', 'api.js'));
  const gh = fakeGitHub(); const nodeFetch = globalThis.fetch; globalThis.fetch = gh.fetch;
  let sorts = 0;
  const ai = fakeAI((msgs) => {
    if (msgs[0].content.includes('You sort photos')) { sorts++; return { path: ['Complex numbers', 'Polar form'], title: `Ex 2C part ${sorts}` }; }
    const id = msgs[0].content.match(/\((p-[a-z0-9]+)\)/)[1];
    if (msgs[msgs.length - 1].content.includes('unlock')) // asking the helper to unlock formulas
      return { reply: 'Unlocking it.', actions: [{ type: 'unlock_formula', name: 'modulus' }, { type: 'unlock_formula', name: 'made-up formula' }] };
    if (msgs[msgs.length - 1].content.includes('by name')) { // how the free AI often answers: names, titles, brackets
      const other = msgs[0].content.match(/\((p-[a-z0-9]+)\) My renamed photo/)[1];
      return { reply: 'Moving them.', actions: [{ type: 'move_photo', photo: 'Ex 2C part 2', topic: 'Proof' },
        { type: 'move_photo', photo: `(${other})`, topic: 'Complex numbers › Polar form' }, { type: 'move_photo', photo: '[' + other + ']', topic: 'Statistics' }] };
    }
    return { reply: 'I can move it to a new Proof topic.', actions: [{ type: 'add_topic', key: 'new-1', name: 'Proof', parent: '' }, { type: 'move_photo', photo: id, topic: 'new-1' }] };
  });
  const env = { GITHUB_TOKEN: 'ghp_test', APP_PASSCODE: 'pw', SHARE_CODE: 'class', AI: ai };
  const checks = []; const check = (n, ok) => checks.push(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  const b = await chromium.launch(); const errs = [];
  async function page({ code = 'pw', name = 'Owner' } = {}) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept(d.type() !== 'prompt' ? undefined : /code|passcode/i.test(d.message()) ? code : name));
    await p.route(/\/(api|photo)\//, async (route) => {
      const r = route.request();
      const res = await handleApi(new Request(r.url(), { method: r.method(), headers: { ...r.headers(), 'cf-connecting-ip': '198.51.100.9' }, body: r.method() === 'POST' ? r.postData() : undefined }), env);
      route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    });
    await p.route(/fonts\.g/, (r) => r.abort());
    return p;
  }
  // Two test photos.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-')); const shots = [];
  const maker = await b.newPage({ viewport: { width: 900, height: 1200 } });
  for (const k of [1, 2]) {
    await maker.setContent(`<body style="font:40px serif;padding:60px">Ex 2C Q${k}<br>z = 3 + 4i<br>|z| = 5</body>`);
    shots.push(path.join(dir, `page${k}.png`)); await maker.screenshot({ path: shots[k - 1] });
  }

  // ---- the owner ----
  const o = await page();
  await o.goto(BASE); await o.evaluate(() => localStorage.setItem('specialist-study-pass', JSON.stringify('pw'))); await o.reload();
  await o.waitForSelector('#main .hello');
  await o.setInputFiles('#file-pick', shots);
  await o.waitForSelector('#up-done:not([disabled])', { timeout: 20000 });
  const status = await o.$$eval('.up-row .st', (x) => x.map((e) => e.textContent).join(' | '));
  check('owner: photos are saved and sorted', /Saved in Complex numbers › Polar form \| Saved in Complex numbers › Polar form/.test(status)
    && [...gh.files.keys()].filter((k) => k.startsWith('photos/')).length === 2);
  await o.fill('.up-row input >> nth=0', 'My renamed photo');
  await o.click('#up-done');
  await o.waitForFunction(() => location.hash.startsWith('#/topic/'));
  await o.waitForTimeout(400);
  const lib = JSON.parse(gh.text('data/library.json'));
  check('owner: renaming in the upload list is saved', lib.photos[0].title === 'My renamed photo' && lib.photos[1].title === 'Ex 2C part 2');
  check('owner: lands on the topic with both photos', (await o.$$('.pgrid .pcard')).length === 2 && (await o.textContent('.bar h2')).includes('Polar form'));
  check('owner: the photos load from /photo/', await o.$eval('.pcard img', (i) => i.complete && i.naturalWidth > 100));
  // Notes added by the weekly job show under the photo.
  lib.photos[0].notes = '### Method\n- Use $|z| = \\sqrt{a^2+b^2}$\n- **Check** the quadrant'; lib.photos[0].notesAt = new Date().toISOString();
  gh.put('data/library.json', JSON.stringify(lib));
  await o.evaluate(() => document.querySelector('#btn-refresh').click());
  await o.waitForTimeout(500);
  await o.click('.pcard >> nth=0'); await o.waitForSelector('.photo-page');
  check('owner: notes show under the photo, with the maths drawn', (await o.textContent('.notes')).includes('Check the quadrant') && !!(await o.$('.notes h4')) && !!(await o.$('.notes .katex')));
  await o.click('.shot img'); await o.waitForSelector('#viewer:not([hidden])');
  await o.keyboard.press('ArrowRight'); const vt = await o.textContent('#v-title'); await o.keyboard.press('Escape');
  check('owner: full screen viewer opens and steps to the next photo', vt === 'Ex 2C part 2' && await o.$eval('#viewer', (v) => v.hidden));
  // The helper.
  await o.click('#bot-btn'); await o.fill('#bot-input', 'move this to a proof topic'); await o.press('#bot-input', 'Enter');
  await o.waitForSelector('[data-do]'); await o.click('[data-do]'); await o.waitForSelector('.proposal.done');
  const lib2 = JSON.parse(gh.text('data/library.json'));
  const proof = lib2.topics.find((t) => t.name === 'Proof');
  check('owner: the helper’s “Do it” makes the topic and moves the photo', !!proof && lib2.photos.some((p) => p.topic === proof.id));
  await o.fill('#bot-input', 'move them by name'); await o.press('#bot-input', 'Enter');
  await o.waitForSelector('.proposal:not(.done) [data-do]');
  const lines = await o.$$eval('.proposal:not(.done) li', (x) => x.map((e) => e.textContent).join(' | '));
  await o.click('.proposal:not(.done) [data-do]'); await o.waitForFunction(() => !document.querySelector('.proposal:not(.done)'));
  const lib3 = JSON.parse(gh.text('data/library.json'));
  const T3 = (n) => lib3.topics.find((t) => t.name === n)?.id, P3 = (t) => lib3.photos.find((p) => p.title === t);
  console.log('helper lines:', lines);
  check('owner: the helper’s moves work with names, titles, paths and brackets (and make missing topics)', !lines.includes('?') && lines.includes('to Polar form')
    && P3('Ex 2C part 2').topic === T3('Proof') && P3('My renamed photo').topic === T3('Statistics') && !!T3('Statistics'));

  // Asking the helper to unlock a formula.
  await o.fill('#bot-input', 'please unlock it, it is on my photo'); await o.press('#bot-input', 'Enter');
  await o.waitForSelector('.proposal:not(.done) [data-do]');
  const ulines = await o.$$eval('.proposal:not(.done) li', (x) => x.map((e) => e.textContent).join(' | '));
  await o.click('.proposal:not(.done) [data-do]'); await o.waitForFunction(() => !document.querySelector('.proposal:not(.done)'));
  const unl = JSON.parse(gh.text('data/library.json')).unlocked || [];
  check('owner: the helper unlocks a formula on request (and says when one doesn’t exist)', JSON.stringify(unl) === '["Modulus"]'
    && ulines.includes('✕ There') && ulines.includes('Unlock the formula'));
  await o.goto(BASE + '#/formulas'); await o.waitForSelector('.f-card');
  check('owner: the unlocked formula now shows on the sheet', (await o.$$eval('.f-card header b', (x) => x.map((e) => e.textContent))).join() === 'Modulus');
  await o.goto(BASE);

  // ---- a friend: looks first, then joins with the class code and adds to the shared collection ----
  const f = await page({ code: 'class', name: 'Sam' });
  await f.goto(BASE); await f.waitForSelector('#main .hello'); await f.waitForTimeout(300);
  const fTopics = await f.$$eval('#topics .topic .nm', (x) => x.map((e) => e.textContent).join('|'));
  check('friend: sees the shared topics', fTopics.includes('Complex numbers') && fTopics.includes('Proof'));
  await f.click('#topics .topic:has-text("Complex numbers")');
  check('friend: can’t rename or delete topics', !(await f.$('[data-act="rename-topic"]')));
  const puts = gh.log.length, count0 = JSON.parse(gh.text('data/library.json')).photos.length;
  await f.setInputFiles('#file-pick', [shots[0]]);          // asks for the class code, then their name
  await f.waitForSelector('#up-done:not([disabled])', { timeout: 20000 });
  const libF = JSON.parse(gh.text('data/library.json')), added = libF.photos[libF.photos.length - 1];
  check('friend: with the class code, their upload goes into the shared collection, with their name', libF.photos.length === count0 + 1
    && gh.log.length > puts && added.byName === 'Sam' && /^d-/.test(added.by) && (await f.textContent('.up-row .st')).startsWith('Saved in'));
  check('friend: shows as a member', (await f.textContent('#sub')).includes('Member'));
  await f.click('#up-done'); await f.waitForSelector('.photo-page');
  check('friend: can change their own photo, and it says who added it', !!(await f.$('[data-act="rename-photo"]')) && (await f.textContent('.lead')).includes('added by Sam'));
  const ownerPhoto = libF.photos.find((p) => p.byName !== 'Sam');
  await f.goto(BASE + '#/photo/' + ownerPhoto.id); await f.waitForSelector('.photo-page');
  check('friend: can’t change someone else’s photo', !(await f.$('[data-act="delete-photo"]')));
  // The Worker enforces it too, whatever the app does.
  const sneaky = await f.evaluate(async (id) => (await fetch('api/change', { method: 'POST', headers: { 'content-type': 'application/json', 'x-passcode': 'class', 'x-device': 'd-someoneelse' },
    body: JSON.stringify({ ops: [{ type: 'delete_photo', photo: id }] }) })).status, ownerPhoto.id);
  check('friend: the server refuses to let a member delete another person’s photo', sneaky === 403 && JSON.parse(gh.text('data/library.json')).photos.some((p) => p.id === ownerPhoto.id));
  // Choosing topics in the upload list, then Done (this once did nothing after making a new topic).
  await f.goto(BASE); await f.waitForSelector('#main .hello');
  await f.setInputFiles('#file-pick', shots);
  await f.waitForSelector('#up-done:not([disabled])', { timeout: 20000 });
  const owners = await f.$eval('select[data-topic="0"]', (s) => [...s.options].find((o) => o.textContent.includes('Complex numbers')).value);
  await f.selectOption('select[data-topic="0"]', owners);
  await f.selectOption('select[data-topic="1"]', '__new');   // the prompt answers "Sam", so a topic called "Sam"
  await f.waitForFunction(() => [...document.querySelectorAll('select[data-topic="1"] option')].some((o) => o.selected && o.textContent.trim() === 'Sam'));
  await f.click('#up-done'); await f.waitForTimeout(800);
  const libD = JSON.parse(gh.text('data/library.json')), samTopic = libD.topics.find((t) => t.name === 'Sam'), last2 = libD.photos.slice(-2);
  check('friend: Done puts each photo in the topic chosen (an existing one, and a new shared one)', !!samTopic && last2[0].topic === owners && last2[1].topic === samTopic.id
    && !(await f.$('dialog[open]')));
  check('friend: the helper button shows for members', await f.$eval('#bot-btn', (b) => getComputedStyle(b).display !== 'none'));
  // Photos kept on this device from before can be added to the shared collection.
  await f.evaluate(async (db) => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 300); g.fillStyle = '#000'; g.fillText('old photo', 20, 40);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8));
    await new Promise((ok, no) => { const r = indexedDB.open(db, 1); r.onupgradeneeded = () => r.result.createObjectStore('photos');
      r.onsuccess = () => { const tx = r.result.transaction('photos', 'readwrite'); tx.objectStore('photos').put(blob, 'my-pold1'); tx.oncomplete = ok; tx.onerror = no; }; });
    const mine = { topics: [{ id: 'my-photos', name: 'My photos', color: '#0f766e' }], photos: [{ id: 'my-pold1', topic: 'my-photos', title: 'Old photo', added: '2026-11-01', w: 400, h: 300 }], events: [] };
    localStorage.setItem(`${db}-mine-v1`, JSON.stringify(mine));
  }, APP_KEY);
  await f.goto(BASE); await f.reload(); await f.waitForSelector('[data-act="adopt"]'); await f.click('[data-act="adopt"]');
  const target = await f.$eval('#adopt-to', (s) => [...s.options].find((o) => o.textContent.includes('Proof')).value);
  await f.selectOption('#adopt-to', target); await f.click('#adopt-go');
  await f.waitForFunction(() => !document.querySelector('dialog[open]'));
  const lib4 = JSON.parse(gh.text('data/library.json')), old = lib4.photos.find((p) => p.title === 'Old photo');
  check('friend: photos only on this device can be added to the shared collection (and leave the device)', !!old && old.topic === target && old.byName === 'Sam'
    && (await f.evaluate(() => window.__app.mine.photos.length)) === 0 && !(await f.$('[data-act="adopt"]')));
  // Log out: back to look-only.
  await f.evaluate(() => document.querySelector('#btn-owner').click()); await f.waitForFunction(() => !document.querySelector('#sub').textContent.includes('Member'));
  check('friend: logging out goes back to look-only', (await f.textContent('#btn-owner')).startsWith('Log in'));

  // ---- a phone ----
  const ph = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })).newPage();
  ph.on('pageerror', (e) => errs.push(e.message)); await ph.route(/\/(api|photo)\//, (r) => r.fulfill({ status: 404, body: '{}' }));
  await ph.route(/fonts\.g/, (r) => r.abort());
  await ph.goto(BASE); await ph.click('.tabbar [data-tab="topics"]');
  check('phone: the tab bar opens the topic drawer', await ph.evaluate(() => document.body.classList.contains('nav-open')));

  globalThis.fetch = nodeFetch;
  console.log(checks.join('\n')); console.log('errors:', errs);
  console.log(checks.every((c) => c.startsWith('ok')) && !errs.length ? 'app ok' : 'app FAILED');
  await b.close();
})();
