// Formula sheet (#/formulas): the key Specialist Maths Units 1 & 2 formulas, searchable, with stars for the tricky ones.
import { formulaShown } from './unlock.js';
export const SHEET = [
  ['Number systems', [
    ['Number sets', '\\mathbb{N} \\subseteq \\mathbb{Z} \\subseteq \\mathbb{Q} \\subseteq \\mathbb{R}', '$\\mathbb{N}$ natural, $\\mathbb{Z}$ integers, $\\mathbb{Q}$ rational, $\\mathbb{R}$ real; irrationals are $\\mathbb{R} \\setminus \\mathbb{Q}$ (e.g. $\\pi$, $\\sqrt2$).'],
    ['Rational numbers', '\\mathbb{Q} = \\left\\{ \\tfrac{p}{q} : p, q \\in \\mathbb{Z},\\ q \\ne 0 \\right\\}', 'Terminating or recurring decimals.'],
    ['Recurring decimal to fraction', '0.\\overline{abc} = \\dfrac{abc}{999}', 'Multiply by $10^n$ ($n$ = digits in the repeat) and subtract.'],
    ['Surds', '\\sqrt{ab} = \\sqrt a\\,\\sqrt b,\\quad \\dfrac{1}{\\sqrt a} = \\dfrac{\\sqrt a}{a}', 'Rationalise the denominator.'],
    ['Interval notation', '[a, b] = \\{x : a \\le x \\le b\\},\\quad (a, b) = \\{x : a < x < b\\}', 'Square bracket includes the end point.'],
  ]],
  ['Sets', [
    ['Set notation', 'x \\in A,\\quad A \\subseteq B,\\quad \\varnothing,\\quad \\xi', 'Element of, subset of, empty set, universal set.'],
    ['Union and intersection', 'A \\cup B,\\quad A \\cap B', 'Union: in $A$, $B$ or both. Intersection: in both.'],
    ['Complement', 'A\' = \\{x \\in \\xi : x \\notin A\\},\\quad n(A\') = n(\\xi) - n(A)', ''],
    ['Addition rule for sets', 'n(A \\cup B) = n(A) + n(B) - n(A \\cap B)', 'Disjoint sets: $A \\cap B = \\varnothing$.'],
    ['De Morgan’s laws', '(A \\cup B)\' = A\' \\cap B\',\\quad (A \\cap B)\' = A\' \\cup B\'', ''],
  ]],
  ['Logic & proof', [
    ['Implication', 'P \\Rightarrow Q', 'Converse $Q \\Rightarrow P$; contrapositive $\\lnot Q \\Rightarrow \\lnot P$ (same truth as the original).'],
    ['Proof by contradiction', '\\text{assume } \\lnot P \\;\\Rightarrow\\; \\text{contradiction}', 'e.g. proving $\\sqrt2$ is irrational.'],
    ['Mathematical induction', 'P(1) \\text{ true},\\ P(k) \\Rightarrow P(k + 1)', 'Then $P(n)$ is true for all $n \\in \\mathbb{N}$.'],
    ['Even and odd', '2k \\text{ (even)},\\quad 2k + 1 \\text{ (odd)},\\ k \\in \\mathbb{Z}', ''],
  ]],
  ['Sequences & series', [
    ['Arithmetic sequence', 't_n = a + (n - 1)d', ''],
    ['Arithmetic series', 'S_n = \\dfrac{n}{2}\\big(2a + (n - 1)d\\big) = \\dfrac{n}{2}(a + l)', ''],
    ['Geometric sequence', 't_n = a r^{n - 1}', ''],
    ['Geometric series', 'S_n = \\dfrac{a(r^n - 1)}{r - 1}', ''],
    ['Infinite geometric series', 'S_\\infty = \\dfrac{a}{1 - r},\\quad |r| < 1', ''],
    ['Recurrence relation', 't_{n+1} = r\\,t_n + d', ''],
  ]],
  ['Combinatorics', [
    ['Multiplication principle', 'm \\times n \\text{ ways}', 'One task in $m$ ways then another in $n$ ways.'],
    ['Factorial', 'n! = n(n - 1)(n - 2)\\cdots 1,\\quad 0! = 1', ''],
    ['Permutations', '^nP_r = \\dfrac{n!}{(n - r)!}', 'Order matters.'],
    ['Combinations', '^nC_r = \\dbinom{n}{r} = \\dfrac{n!}{r!\\,(n - r)!}', 'Order doesn’t matter.'],
    ['Pascal’s triangle', '^nC_r = {}^{n-1}C_{r-1} + {}^{n-1}C_r', ''],
    ['Inclusion–exclusion', '|A \\cup B \\cup C| = \\sum|A| - \\sum|A \\cap B| + |A \\cap B \\cap C|', ''],
    ['Pigeonhole principle', 'n + 1 \\text{ objects in } n \\text{ boxes}', 'At least one box has two or more.'],
  ]],
  ['Matrices', [
    ['Matrix product', '(AB)_{ij} = \\text{row } i \\text{ of } A \\cdot \\text{column } j \\text{ of } B', 'Needs columns of $A$ = rows of $B$; $AB \\ne BA$ in general.'],
    ['Determinant (2×2)', '\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc', ''],
    ['Inverse (2×2)', 'A^{-1} = \\dfrac{1}{ad - bc}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix}', 'Exists only if $\\det A \\ne 0$.'],
    ['Identity', 'AI = IA = A,\\quad AA^{-1} = I', ''],
  ]],
  ['Trigonometry', [
    ['Sine rule', '\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}', 'Watch the ambiguous case.'],
    ['Cosine rule', 'a^2 = b^2 + c^2 - 2bc\\cos A', ''],
    ['Area of a triangle', '\\text{Area} = \\tfrac12 ab\\sin C', ''],
    ['Degrees and radians', '\\pi^c = 180^\\circ', ''],
    ['Exact values', '\\sin\\tfrac{\\pi}{6} = \\tfrac12,\\; \\sin\\tfrac{\\pi}{4} = \\tfrac{\\sqrt2}{2},\\; \\sin\\tfrac{\\pi}{3} = \\tfrac{\\sqrt3}{2}', '$\\cos$ the other way round.'],
    ['Pythagorean identity', '\\sin^2\\theta + \\cos^2\\theta = 1', ''],
  ]],
  ['Vectors', [
    ['Magnitude', '|x\\mathbf{i} + y\\mathbf{j}| = \\sqrt{x^2 + y^2}', ''],
    ['Unit vector', '\\hat{\\mathbf{a}} = \\dfrac{\\mathbf{a}}{|\\mathbf{a}|}', ''],
    ['Scalar (dot) product', '\\mathbf{a} \\cdot \\mathbf{b} = a_1b_1 + a_2b_2 = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta', 'Perpendicular when $\\mathbf{a} \\cdot \\mathbf{b} = 0$.'],
    ['Vector resolute', '\\text{proj}_{\\mathbf{b}}\\,\\mathbf{a} = (\\mathbf{a} \\cdot \\hat{\\mathbf{b}})\\,\\hat{\\mathbf{b}}', ''],
    ['Position vectors', '\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a}', ''],
  ]],
  ['Complex numbers', [
    ['Imaginary unit', 'i^2 = -1', ''],
    ['Cartesian form', 'z = a + bi,\\quad \\text{Re}(z) = a,\\ \\text{Im}(z) = b', ''],
    ['Conjugate', '\\bar z = a - bi,\\quad z\\bar z = a^2 + b^2', 'Used to divide complex numbers.'],
    ['Modulus', '|z| = \\sqrt{a^2 + b^2}', ''],
    ['Polar form', 'z = r\\,\\text{cis}\\,\\theta = r(\\cos\\theta + i\\sin\\theta)', '$\\text{Arg}(z) \\in (-\\pi, \\pi]$.'],
    ['Multiplying in polar form', 'z_1 z_2 = r_1 r_2\\,\\text{cis}(\\theta_1 + \\theta_2)', 'Divide: divide moduli, subtract arguments.'],
  ]],
  ['Kinematics', [
    ['Constant acceleration', 'v = u + at,\\quad s = ut + \\tfrac12 at^2', ''],
    ['More constant acceleration', 'v^2 = u^2 + 2as,\\quad s = \\tfrac12(u + v)t', ''],
    ['Velocity and acceleration', 'v = \\dfrac{dx}{dt},\\quad a = \\dfrac{dv}{dt}', ''],
  ]],
];


const STARS = 'specialist-study-stars';
let stars = new Set((() => { try { return JSON.parse(localStorage.getItem(STARS)) || []; } catch { return []; } })());
let filter = '', onlyStars = false;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function listHtml() {
  const f = filter.toLowerCase();
  const parts = SHEET.map(([sect, rows]) => [sect, rows.filter(([n, tex, note]) => formulaShown(n) && (!onlyStars || stars.has(n))
    && (!f || `${sect} ${n} ${tex} ${note}`.toLowerCase().includes(f)))]).filter(([, rows]) => rows.length);
  if (!formulaCount()) return `<div class="empty locked"><p class="lock-ico">🔒</p><p><b>All formulas are locked for now.</b></p>
    <p>A formula appears once it's actually written on one of your uploaded photos (they're checked when the weekly notes are added),
    or when you ask the ✦ Ask helper to unlock it – e.g. “unlock the quadratic formula, it's on my photo”.</p></div>`;
  if (!parts.length) return `<p class="empty">${onlyStars ? 'No starred formulas yet – tap ☆ on the ones you keep forgetting.' : 'No formulas match.'}</p>`;
  return parts.map(([sect, rows]) => `<section class="f-sect"><h3 class="sect-h">${esc(sect)}</h3><div class="f-grid">${rows.map(([n, tex, note]) => `
    <article class="f-card"><header><b>${esc(n)}</b><button class="f-star ${stars.has(n) ? 'on' : ''}" data-star="${esc(n)}" aria-label="Star ${esc(n)}">${stars.has(n) ? '★' : '☆'}</button></header>
      <div class="f-tex">$$${esc(tex)}$$</div>${note ? `<p>${esc(note)}</p>` : ''}</article>`).join('')}</div></section>`).join('');
}
export function formulasHtml() {
  return `<nav class="crumbs" aria-label="You are here"><a href="#/">Home</a> <span>›</span> <b>Formula sheet</b></nav>
    <div class="bar"><h2>Formula sheet</h2><div class="tools"><button data-f="stars" class="${onlyStars ? 'dark' : ''}">★ Starred</button><button data-f="print">Print</button></div></div>
    <p class="lead">Only formulas written on your uploaded photos, or ones you've asked the helper to unlock – ${formulaCount()} so far.</p>
    <input class="f-search" id="f-search" type="search" placeholder="Search formulas – e.g. vector, series, modulus" value="${esc(filter)}">
    <div id="f-list">${listHtml()}</div>`;
}
export function bindFormulas(main, { drawMaths }) {
  const refresh = () => { main.querySelector('#f-list').innerHTML = listHtml(); drawMaths(main.querySelector('#f-list')); };
  main.querySelector('#f-search').oninput = (e) => { filter = e.target.value; refresh(); };
  main.onclick = (ev) => {
    const s = ev.target.closest('[data-star]');
    if (s) { const n = s.dataset.star; stars.has(n) ? stars.delete(n) : stars.add(n); try { localStorage.setItem(STARS, JSON.stringify([...stars])); } catch { /* fine */ } return refresh(); }
    const b = ev.target.closest('[data-f]');
    if (b?.dataset.f === 'stars') { onlyStars = !onlyStars; b.classList.toggle('dark', onlyStars); refresh(); }
    if (b?.dataset.f === 'print') window.print();
  };
  drawMaths(main);
}
// How many formulas your uploads have unlocked (all = every formula on the sheet).
export const formulaCount = (all = false) => SHEET.reduce((n, [, r]) => n + r.filter(([name]) => all || formulaShown(name)).length, 0);
export const FORMULA_NAMES = SHEET.flatMap(([, rows]) => rows.map(([name]) => name));
