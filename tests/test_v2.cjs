// The study tools in a real browser: practice, formula sheet, planner (shared dates), confidence ratings, share.
const { chromium } = require('playwright');
const path = require('path');
const { fakeGitHub } = require('./fakes.cjs');
const BASE = 'http://localhost:8767/';
(async () => {
  const { handleApi } = await import(path.join(__dirname, '..', 'worker', 'api.js'));
  const gh = fakeGitHub(); const nodeFetch = globalThis.fetch; globalThis.fetch = gh.fetch;
  gh.put('data/library.json', JSON.stringify({ version: 1, topics: [], photos: [], events: [] })); // nothing uploaded yet
  const env = { GITHUB_TOKEN: 'ghp_test', APP_PASSCODE: 'pw' };
  const checks = []; const check = (n, ok) => checks.push(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  const b = await chromium.launch(); const errs = [];
  async function page(owner) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'pw' : undefined));
    await p.route(/\/(api|photo)\//, async (route) => {
      const r = route.request();
      const res = await handleApi(new Request(r.url(), { method: r.method(), headers: r.headers(), body: r.method() === 'POST' ? r.postData() : undefined }), env);
      route.fulfill({ status: res.status, headers: Object.fromEntries(res.headers), body: Buffer.from(await res.arrayBuffer()) });
    });
    await p.route(/fonts\.g/, (r) => r.abort());
    await p.goto(BASE);
    if (owner) { await p.evaluate(() => localStorage.setItem('specialist-study-pass', '"pw"')); await p.reload(); }
    await p.waitForSelector('#main .hello');
    return p;
  }
  // Nothing uploaded: the tools that give maths information stay locked.
  const empty = await page(true);
  await empty.goto(BASE + '#/practice'); await empty.waitForSelector('.locked');
  const pLocked = !(await empty.$('.pr-card'));
  await empty.goto(BASE + '#/formulas'); await empty.waitForSelector('.locked');
  const fLocked = (await empty.$$('.f-card')).length === 0;
  check('locked: nothing uploaded → no practice, no formulas', pLocked && fLocked);
  await empty.close();
  // Upload some topics: only those unlock.
  gh.put('data/library.json', JSON.stringify({ version: 1, events: [], unlocked: ['Modulus'], photos: [{ id: 'p-aaaaaa1', topic: 't-prob', title: 'Venn diagram questions', added: '2026-11-20', file: 'photos/p-aaaaaa1.jpg', formulas: ['Addition rule for sets'] }],
    topics: [{ id: 't-calc', name: 'Vectors', color: '#4f46e5' }, { id: 't-prob', name: 'Complex numbers', color: '#be185d' }, { id: 't-log', name: 'Sets', color: '#0f766e' }] }));
  const o = await page(true);
  check('home: study tools, planner and practice cards', (await o.$$('.tool-tile')).length === 3 && !!(await o.$('.up-next')) && !!(await o.$('.streak-card')));
  await o.goto(BASE + '#/graph'); await o.waitForSelector('#main .hello');
  check('graph plotter is gone: no sidebar link, and its old address just shows Home', !(await o.$('[data-page="graph"]')) && !(await o.$('#g-canvas')));

  // Practice: answer one right, one wrong.
  await o.click('#topics [data-page="practice"]'); await o.waitForSelector('.pr-card');
  const answer = async (right) => {
    const q = await o.evaluate(() => { const x = window.__app.question(); return { choices: x.choices, correct: x.correct, a: x.a }; });
    if (q.choices) await o.click(`[data-choice="${right ? q.correct : q.choices.find((c) => c !== q.correct)}"]`.replace(/\\/g, '\\\\'));
    else { await o.fill('#pr-in', String(right ? q.a : q.a + 1)); await o.click('#pr-form button'); }
    await o.waitForSelector('.pr-result');
  };
  await answer(true);
  const right1 = await o.$eval('.pr-card', (c) => c.classList.contains('right'));
  await o.click('#pr-next'); await answer(false);
  const wrong1 = await o.$eval('.pr-card', (c) => c.classList.contains('wrong')) && (await o.$$('.pr-steps li')).length > 0;
  const pills = await o.$$eval('.pill', (x) => x.map((e) => e.textContent).join(' | '));
  check('practice: right and wrong answers are marked, with worked steps', right1 && wrong1 && pills.includes('1/2') && pills.includes('1 day streak'));
  await o.click('[data-ptopic="Vectors"]'); await o.waitForSelector('.pr-card');
  check('practice: choosing a topic gives questions on it', (await o.textContent('.pr-card .eyebrow')).trim() === 'Vectors');
  const chips = await o.$$eval('.pr-topics [data-ptopic]', (x) => x.map((e) => e.dataset.ptopic).filter(Boolean).sort().join('|'));
  check('practice: only topics that have been uploaded are offered', chips === 'Complex numbers|Number & sets|Vectors');

  // Formula sheet.
  await o.click('#topics [data-page="formulas"]'); await o.waitForSelector('.f-card');
  const all = (await o.$$('.f-card')).length;
  const names = await o.$$eval('.f-card header b', (x) => x.map((e) => e.textContent));
  await o.fill('#f-search', 'modulus'); await o.waitForTimeout(100);
  const some = (await o.$$('.f-card')).length;
  await o.click('.f-star >> nth=0'); await o.fill('#f-search', ''); await o.click('[data-f="stars"]');
  check('formulas: only ones written on a photo or unlocked on request, searchable and starrable', all === 2 && names.sort().join('|') === 'Addition rule for sets|Modulus' && names.includes('Addition rule for sets') && names.includes('Modulus') && !names.includes('Cosine rule')
    && some > 0 && some < all && (await o.$$('.f-card')).length === 1);

  // Planner: the owner's dates are shared.
  await o.click('#topics [data-page="planner"]'); await o.waitForSelector('#ev-form');
  const soon = new Date(Date.now() + 3 * 864e5); const iso = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;
  await o.fill('#ev-form [name=title]', 'SAC 1 – Vectors'); await o.fill('#ev-form [name=date]', iso); await o.selectOption('#ev-form [name=kind]', 'SAC'); await o.click('#ev-form button');
  await o.waitForSelector('.ev');
  const shared = JSON.parse(gh.text('data/library.json')).events || [];
  check('planner: the owner’s dates are saved to the shared library, with a countdown', shared.length === 1 && shared[0].title === 'SAC 1 – Vectors' && (await o.textContent('.ev-when')) === 'In 3 days');

  // Confidence and share on a topic.
  await o.goto(BASE + '#/topic/t-calc'); await o.waitForSelector('.conf');
  await o.click('[data-conf="1"]'); await o.click('[data-act="share"]'); await o.waitForSelector('#toast.show');
  const copied = await o.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  await o.goto(BASE); await o.waitForSelector('#main .hello');
  check('confidence: marking a topic “Need help” puts it in Revise these first', (await o.textContent('.revise')).includes('Vectors'));
  check('share: copies a link to the page', copied.endsWith('#/topic/t-calc'));

  // A friend sees the shared date and can add their own (which stays on their device).
  const f = await page(false);
  check('friend: sees the owner’s SAC on their home page', (await f.textContent('.up-next')).includes('SAC 1 – Vectors'));
  await f.goto(BASE + '#/planner'); await f.waitForSelector('#ev-form');
  await f.fill('#ev-form [name=title]', 'My study session'); await f.fill('#ev-form [name=date]', iso); await f.click('#ev-form button');
  await f.waitForFunction(() => document.querySelectorAll('.ev').length === 2);
  const mineEv = await f.evaluate(() => window.__app.mine.events);
  check('friend: their own dates stay on their device', mineEv.length === 1 && (JSON.parse(gh.text('data/library.json')).events || []).length === 1);

  globalThis.fetch = nodeFetch; await b.close();
  console.log(checks.join('\n')); console.log('errors:', errs);
  console.log(checks.every((c) => c.startsWith('ok')) && !errs.length ? 'v2 ok' : 'v2 FAILED');
})();
