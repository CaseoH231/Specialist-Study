// Practice (#/practice): endless Year 11 Specialist Maths questions, marked straight away, with worked answers.
// Each generator makes a fresh question from a random-number function r() (0 ≤ r < 1), so tests can pass a seeded one.
// A question: { topic, q, a (number) | choices + correct (multiple choice), steps (worked answer) }. Maths in $…$.
// Each generator has keys: it's only offered once something matching them has been uploaded (unlock.js).
import { unlocked, hasUploads } from './unlock.js';

const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const int = (r, lo, hi, not = []) => { for (;;) { const n = lo + Math.floor(r() * (hi - lo + 1)); if (!not.includes(n)) return n; } };
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
// Tidy LaTeX for a polynomial from [coef, power] pairs: 3x^2 - x + 4
export function poly(terms) {
  let out = '';
  for (const [c, p] of terms) {
    if (!c) continue;
    const sign = c < 0 ? ' - ' : out ? ' + ' : '', a = Math.abs(c);
    const coef = p === 0 ? `${a}` : a === 1 ? '' : `${a}`;
    out += (out ? sign : c < 0 ? '-' : '') + coef + (p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`);
  }
  return out || '0';
}
export const frac = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? `${n}` : `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}`; };


function EXACT_TRIG(r) {
    const angles = [[0, '0'], [30, '\\frac{\\pi}{6}'], [45, '\\frac{\\pi}{4}'], [60, '\\frac{\\pi}{3}'], [90, '\\frac{\\pi}{2}'], [120, '\\frac{2\\pi}{3}'], [135, '\\frac{3\\pi}{4}'], [150, '\\frac{5\\pi}{6}'], [180, '\\pi']];
    const VAL = { 0: '0', 0.5: '\\frac{1}{2}', '-0.5': '-\\frac{1}{2}', 1: '1', '-1': '-1' };
    const show = (v) => {
      if (!Number.isFinite(v) || Math.abs(v) > 1e6) return '\\text{undefined}';
      const k = Math.round(v * 1e6) / 1e6, s = k < 0 ? '-' : '', a = Math.abs(k);
      if (VAL[k] !== undefined) return VAL[k];
      if (Math.abs(a - Math.SQRT2 / 2) < 1e-6) return `${s}\\frac{\\sqrt{2}}{2}`;
      if (Math.abs(a - Math.sqrt(3) / 2) < 1e-6) return `${s}\\frac{\\sqrt{3}}{2}`;
      if (Math.abs(a - Math.sqrt(3)) < 1e-6) return `${s}\\sqrt{3}`;
      if (Math.abs(a - 1 / Math.sqrt(3)) < 1e-6) return `${s}\\frac{1}{\\sqrt{3}}`;
      return String(k);
    };
    const [deg, rad] = pick(r, angles), fn = pick(r, ['sin', 'cos', 'tan']);
    const v = fn === 'tan' && deg === 90 ? Infinity : Math[fn](deg * Math.PI / 180);
    const correct = show(v);
    const pool = ['0', '\\frac{1}{2}', '-\\frac{1}{2}', '\\frac{\\sqrt{2}}{2}', '-\\frac{\\sqrt{2}}{2}', '\\frac{\\sqrt{3}}{2}', '-\\frac{\\sqrt{3}}{2}', '1', '-1', '\\sqrt{3}', '-\\sqrt{3}', '\\frac{1}{\\sqrt{3}}', '\\text{undefined}'].filter((x) => x !== correct);
    const choices = [correct]; while (choices.length < 4) { const c = pick(r, pool); if (!choices.includes(c)) choices.push(c); }
    choices.sort(() => r() - 0.5);
    const useRad = r() < 0.6;
    return { q: `Find the exact value of $\\${fn}\\left(${useRad ? rad : `${deg}^\\circ`}\\right)$.`, choices, correct,
      steps: [useRad ? `$${rad} = ${deg}^\\circ$` : `Use the exact-value triangles / unit circle.`, `$\\${fn}(${deg}^\\circ) = ${correct}$`] };
}

export const TOPICS = ['Number & sets', 'Sequences & series', 'Combinatorics', 'Matrices', 'Trigonometry', 'Vectors', 'Complex numbers', 'Kinematics'];

const fact = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25]];
const bm = (a, b, c, d) => `\\begin{bmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{bmatrix}`;
const cx = (a, b) => `${a} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}i`;

const GEN = [
  { topic: 'Number & sets', keys: ['recurring', 'decimal', 'rational', 'number set', 'number system', 'fraction'], make(r) {
    const L = int(r, 1, 3), n = int(r, 1, 10 ** L - 2), digits = String(n).padStart(L, '0'), den = 10 ** L - 1;
    return { q: `Write $0.\\overline{${digits}}$ as a fraction in simplest form.`, a: n / den, shown: frac(n, den),
      steps: [`Let $x = 0.\\overline{${digits}}$. The repeating block has ${L} digit${L > 1 ? 's' : ''}, so multiply by $${10 ** L}$: $${10 ** L}x = ${n}.\\overline{${digits}}$`,
        `Subtract: $${10 ** L}x - x = ${n}$, so $${den}x = ${n}$`, `$x = \\frac{${n}}{${den}} = ${frac(n, den)}$`] };
  } },
  { topic: 'Number & sets', keys: ['set', 'venn', 'union', 'intersection'], make(r) {
    const both = int(r, 1, 8), a = both + int(r, 2, 12), b = both + int(r, 2, 12);
    return { q: `$n(A) = ${a}$, $n(B) = ${b}$ and $n(A \\cap B) = ${both}$. Find $n(A \\cup B)$.`, a: a + b - both,
      steps: [`$n(A \\cup B) = n(A) + n(B) - n(A \\cap B)$ (the overlap was counted twice)`, `$= ${a} + ${b} - ${both} = ${a + b - both}$`] };
  } },
  { topic: 'Number & sets', keys: ['set', 'complement', 'venn'], make(r) {
    const n = int(r, 20, 40), a = int(r, 5, n - 5);
    return { q: `$n(\\xi) = ${n}$ and $n(A) = ${a}$. Find $n(A')$.`, a: n - a,
      steps: [`$A'$ is everything in $\\xi$ that's not in $A$.`, `$n(A') = n(\\xi) - n(A) = ${n} - ${a} = ${n - a}$`] };
  } },
  { topic: 'Sequences & series', keys: ['arithmetic', 'sequence', 'series', 'recurrence', 'recursion'], make(r) {
    const a = int(r, -10, 20), d = int(r, -6, 8, [0]), n = int(r, 5, 25);
    return { q: `An arithmetic sequence has first term $${a}$ and common difference $${d}$. Find $t_{${n}}$.`, a: a + (n - 1) * d,
      steps: [`$t_n = a + (n - 1)d$`, `$t_{${n}} = ${a} + ${n - 1} \\times (${d}) = ${a + (n - 1) * d}$`] };
  } },
  { topic: 'Sequences & series', keys: ['geometric', 'series', 'sequence'], make(r) {
    const a = int(r, 1, 6), ratio = pick(r, [2, 3]), n = int(r, 3, ratio === 2 ? 8 : 5), s = (a * (ratio ** n - 1)) / (ratio - 1);
    return { q: `A geometric sequence has first term $${a}$ and common ratio $${ratio}$. Find the sum of the first $${n}$ terms.`, a: s,
      steps: [`$S_n = \\frac{a(r^n - 1)}{r - 1}$`, `$S_{${n}} = \\frac{${a}(${ratio}^{${n}} - 1)}{${ratio} - 1} = ${s}$`] };
  } },
  { topic: 'Combinatorics', keys: ['permutation', 'arrangement', 'combinatoric', 'counting', 'factorial'], make(r) {
    const n = int(r, 5, 9), k = int(r, 2, 4), ans = fact(n) / fact(n - k);
    return { q: `How many ways can ${k} different prizes be given to ${k} of ${n} people (order matters)? Find $^{${n}}P_{${k}}$.`, a: ans,
      steps: [`$^nP_r = \\frac{n!}{(n - r)!}$`, `$^{${n}}P_{${k}} = \\frac{${n}!}{${n - k}!} = ${ans}$`] };
  } },
  { topic: 'Combinatorics', keys: ['combination', 'combinatoric', 'choose', 'counting', 'selection', 'pascal'], make(r) {
    const n = int(r, 5, 12), k = int(r, 2, n - 2), ans = fact(n) / (fact(k) * fact(n - k));
    return { q: `How many ways can a team of ${k} be chosen from ${n} people? Find $^{${n}}C_{${k}}$.`, a: ans,
      steps: [`$^nC_r = \\frac{n!}{r!\\,(n - r)!}$`, `$^{${n}}C_{${k}} = \\frac{${n}!}{${k}!\\,${n - k}!} = ${ans}$`] };
  } },
  { topic: 'Matrices', keys: ['matri', 'determinant'], make(r) {
    const [a, b, c, d] = [int(r, -6, 9), int(r, -6, 9), int(r, -6, 9), int(r, -6, 9)];
    return { q: `Find the determinant of $${bm(a, b, c, d)}$.`, a: a * d - b * c,
      steps: [`$\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc$`, `$= (${a})(${d}) - (${b})(${c}) = ${a * d - b * c}$`] };
  } },
  { topic: 'Matrices', keys: ['matri', 'multiplication', 'matrix product'], make(r) {
    const A = [int(r, -4, 5), int(r, -4, 5), int(r, -4, 5), int(r, -4, 5)], B = [int(r, -4, 5), int(r, -4, 5), int(r, -4, 5), int(r, -4, 5)];
    const ans = A[0] * B[1] + A[1] * B[3];
    return { q: `$A = ${bm(...A)}$ and $B = ${bm(...B)}$. Find the entry in row 1, column 2 of $AB$.`, a: ans,
      steps: [`Row 1 of $A$ times column 2 of $B$.`, `$(${A[0]})(${B[1]}) + (${A[1]})(${B[3]}) = ${ans}$`] };
  } },
  { topic: 'Trigonometry', keys: ['trig', 'exact value', 'unit circle', 'circular', 'radian'], make: EXACT_TRIG },
  { topic: 'Trigonometry', keys: ['cosine rule', 'sine rule', 'non-right', 'trig'], make(r) {
    const b = int(r, 2, 9), c = int(r, 2, 9), A = pick(r, [60, 120]), a2 = b * b + c * c - 2 * b * c * (A === 60 ? 0.5 : -0.5);
    return { q: `In triangle $ABC$, $b = ${b}$, $c = ${c}$ and $A = ${A}^\\circ$. Find $a^2$.`, a: a2,
      steps: [`Cosine rule: $a^2 = b^2 + c^2 - 2bc\\cos A$`, `$\\cos ${A}^\\circ = ${A === 60 ? '\\frac{1}{2}' : '-\\frac{1}{2}'}$`, `$a^2 = ${b * b} + ${c * c} - 2(${b})(${c})(${A === 60 ? '\\frac{1}{2}' : '-\\frac{1}{2}'}) = ${a2}$`] };
  } },
  { topic: 'Vectors', keys: ['vector', 'magnitude'], make(r) {
    const [x, y, m] = pick(r, TRIPLES), sx = pick(r, [1, -1]), sy = pick(r, [1, -1]);
    return { q: `Find $|\\mathbf{a}|$ where $\\mathbf{a} = ${sx * x}\\mathbf{i} ${sy < 0 ? '-' : '+'} ${y}\\mathbf{j}$.`, a: m,
      steps: [`$|x\\mathbf{i} + y\\mathbf{j}| = \\sqrt{x^2 + y^2}$`, `$\\sqrt{(${sx * x})^2 + (${sy * y})^2} = \\sqrt{${x * x + y * y}} = ${m}$`] };
  } },
  { topic: 'Vectors', keys: ['vector', 'dot product', 'scalar product'], make(r) {
    const [a, b, c, d] = [int(r, -6, 6), int(r, -6, 6), int(r, -6, 6), int(r, -6, 6)];
    return { q: `$\\mathbf{a} = ${a}\\mathbf{i} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\mathbf{j}$ and $\\mathbf{b} = ${c}\\mathbf{i} ${d < 0 ? '-' : '+'} ${Math.abs(d)}\\mathbf{j}$. Find $\\mathbf{a} \\cdot \\mathbf{b}$.`, a: a * c + b * d,
      steps: [`$\\mathbf{a} \\cdot \\mathbf{b} = a_1 b_1 + a_2 b_2$`, `$(${a})(${c}) + (${b})(${d}) = ${a * c + b * d}$`] };
  } },
  { topic: 'Complex numbers', keys: ['complex', 'modulus', 'argand'], make(r) {
    const [x, y, m] = pick(r, TRIPLES), sx = pick(r, [1, -1]), sy = pick(r, [1, -1]);
    return { q: `Find $|z|$ where $z = ${cx(sx * x, sy * y)}$.`, a: m,
      steps: [`$|a + bi| = \\sqrt{a^2 + b^2}$`, `$\\sqrt{(${sx * x})^2 + (${sy * y})^2} = \\sqrt{${x * x + y * y}} = ${m}$`] };
  } },
  { topic: 'Complex numbers', keys: ['complex'], make(r) {
    const [a, b, c, d] = [int(r, -5, 6), int(r, -5, 6, [0]), int(r, -5, 6), int(r, -5, 6, [0])];
    return { q: `Find the real part of $(${cx(a, b)})(${cx(c, d)})$.`, a: a * c - b * d,
      steps: [`Expand: $ac + adi + bci + bd\\,i^2$, and $i^2 = -1$.`, `Real part $= ac - bd = (${a})(${c}) - (${b})(${d}) = ${a * c - b * d}$`] };
  } },
  { topic: 'Kinematics', keys: ['kinematic', 'velocity', 'acceleration', 'motion', 'constant acceleration'], make(r) {
    const u = int(r, -5, 15), a = int(r, -4, 6, [0]), t = int(r, 2, 10);
    return { q: `A particle starts with velocity $${u}$ m/s and has constant acceleration $${a}$ m/s². Find its velocity after $${t}$ seconds.`, a: u + a * t,
      steps: [`$v = u + at$`, `$v = ${u} + (${a})(${t}) = ${u + a * t}$ m/s`] };
  } },
];

// Only question types about something that's been uploaded (see unlock.js). all = true ignores that (tests).
export const available = (topic = null, all = false) => GEN.filter((g) => (all || unlocked(g.keys)) && (!topic || g.topic === topic));
export const unlockedTopics = () => TOPICS.filter((t) => available(t).length);
export function makeQuestion(r = Math.random, topic = null, all = false) {
  const pool = available(topic, all);
  if (!pool.length) return null;
  const g = pick(r, pool);
  return { topic: g.topic, ...g.make(r) };
}

// Reads what was typed: 7, -2.5, 3/4, -1/2, 0.25 – returns a number or NaN.
export function readAnswer(text) {
  const s = String(text).trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
  const f = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (f) return +f[2] === 0 ? NaN : +f[1] / +f[2];
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? +s : NaN;
}
export const isRight = (q, text) => (q.choices ? text === q.correct : Math.abs(readAnswer(text) - q.a) < 1e-6);

// ---------- the page ----------
const SAVED = 'specialist-study-practice';
const load = () => { try { return JSON.parse(localStorage.getItem(SAVED)) || {}; } catch { return {}; } };
let stats = { days: [], topics: {}, ...load() };
const keep = () => { try { localStorage.setItem(SAVED, JSON.stringify(stats)); } catch { /* fine */ } };
let topic = null, q = null, answered = null, session = { right: 0, done: 0 };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

// Days in a row with at least one question answered (today or ending yesterday).
export function streak(days = stats.days, now = today()) {
  const set = new Set(days); let d = new Date(`${now}T00:00:00Z`), n = 0;
  if (!set.has(now)) d = new Date(d - 864e5);
  while (set.has(d.toISOString().slice(0, 10))) { n++; d = new Date(d - 864e5); }
  return n;
}
export const practiceStats = () => ({ streak: streak(), topics: stats.topics });

export function practiceHtml() {
  const open = unlockedTopics();
  if (topic && !open.includes(topic)) { topic = null; q = null; answered = null; }
  if (q && !open.includes(q.topic)) { q = null; answered = null; }
  if (!q) q = makeQuestion(Math.random, topic);
  const head = `<nav class="crumbs" aria-label="You are here"><a href="#/">Home</a> <span>›</span> <b>Practice</b></nav>
    <div class="bar"><h2>Practice</h2><div class="tools"><span class="pill">🔥 ${streak()} day streak</span><span class="pill">This session: ${session.right}/${session.done}</span></div></div>`;
  if (!q) return `${head}<div class="empty locked"><p class="lock-ico">🔒</p><p><b>Practice unlocks as you upload your work.</b></p>
    <p>Questions only cover what's in your uploaded photos${hasUploads() ? ' – nothing uploaded so far matches a practice skill yet' : ''}. Upload a photo of, say, your vectors work and vectors questions appear here.</p></div>`;
  const t = stats.topics, acc = (k) => (t[k]?.n ? Math.round((100 * t[k].right) / t[k].n) : null);
  return `${head}
    <p class="lead">Only on what you've uploaded – more topics unlock as you upload more work.</p>
    <div class="chips pr-topics">${open.length > 1 ? `<button class="chip ask ${topic ? '' : 'on'}" data-ptopic="">Mixed</button>` : ''}${open.map((k) => `<button class="chip ask ${topic === k ? 'on' : ''}" data-ptopic="${esc(k)}">${esc(k)}${acc(k) !== null ? ` · ${acc(k)}%` : ''}</button>`).join('')}</div>
    <section class="pr-card ${answered === null ? '' : answered ? 'right' : 'wrong'}">
      <p class="eyebrow">${esc(q.topic)}</p>
      <div class="pr-q">${esc(q.q)}</div>
      ${q.choices ? `<div class="pr-choices">${q.choices.map((c) => `<button class="pr-choice ${answered !== null && c === q.correct ? 'is-right' : ''}" data-choice="${esc(c)}" ${answered !== null ? 'disabled' : ''}>$${esc(c)}$</button>`).join('')}</div>`
        : `<form class="pr-form" id="pr-form"><input id="pr-in" inputmode="decimal" autocomplete="off" placeholder="Your answer (e.g. 7, -2.5 or 3/4)" ${answered !== null ? 'disabled' : ''}>
           <button class="primary" ${answered !== null ? 'disabled' : ''}>Check</button></form>`}
      ${answered === null ? '<button class="link" data-pr="show">Show me how</button>' : `<div class="pr-result"><b>${answered ? '✓ Correct!' : `✗ Not quite – the answer is ${q.choices ? `$${esc(q.correct)}$` : `$${esc(q.shown ?? String(q.a))}$`}`}</b>
        <ol class="pr-steps">${q.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <button class="primary" data-pr="next" id="pr-next">Next question →</button></div>`}
    </section>
    <p class="hint tipline">Questions are made fresh each time, so you never run out. Fractions are fine: type <code>3/4</code>.</p>`;
}

function mark(ok) {
  answered = ok; session.done++; if (ok) session.right++;
  const t = (stats.topics[q.topic] ||= { n: 0, right: 0 }); t.n++; if (ok) t.right++;
  if (!stats.days.includes(today())) stats.days = [...stats.days, today()].slice(-400);
  keep();
}
export function bindPractice(main, { redraw }) {
  main.onclick = (ev) => {
    const tp = ev.target.closest('[data-ptopic]');
    if (tp) { topic = tp.dataset.ptopic || null; q = makeQuestion(Math.random, topic); answered = null; return redraw(); }
    const ch = ev.target.closest('[data-choice]');
    if (ch && answered === null) { mark(ch.dataset.choice === q.correct); return redraw(); }
    const b = ev.target.closest('[data-pr]');
    if (b?.dataset.pr === 'next') { q = makeQuestion(Math.random, topic); answered = null; redraw(); main.querySelector('#pr-in')?.focus(); }
    if (b?.dataset.pr === 'show') { mark(false); redraw(); }
  };
  const f = main.querySelector('#pr-form');
  if (f) f.onsubmit = (ev) => { ev.preventDefault(); const v = main.querySelector('#pr-in').value; if (!v.trim()) return; if (Number.isNaN(readAnswer(v))) { main.querySelector('#pr-in').setCustomValidity('Type a number or a fraction like 3/4'); f.reportValidity(); return; } mark(isRight(q, v)); redraw(); };
  main.querySelector('#pr-in')?.addEventListener('input', (e) => e.target.setCustomValidity(''));
}
export const currentQuestion = () => q; // for the tests
