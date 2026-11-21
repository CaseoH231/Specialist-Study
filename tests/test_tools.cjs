// The study tools' maths: every practice question's answer is worked out a second, independent way from the numbers
// in the question itself; plus the "only what's been uploaded" rule.
const path = require('path');
(async () => {
  const P = await import(path.join(__dirname, '..', 'practice.js'));
  const U = await import(path.join(__dirname, '..', 'unlock.js'));
  const F = await import(path.join(__dirname, '..', 'formulas.js'));
  const checks = []; const check = (n, ok) => checks.push(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  const num = (s) => +String(s).replace(/[−–]/g, '-');

  let seed = 2027; const r = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let made = 0, verified = 0; const bad = [], seenTopics = new Set();
  for (let i = 0; i < 4000; i++) {
    const q = P.makeQuestion(r, null, true); made++; seenTopics.add(q.topic);
    if (q.choices) { if (!q.choices.includes(q.correct) || new Set(q.choices).size !== 4) bad.push(q.q); continue; }
    if (!Number.isFinite(q.a)) { bad.push(q.q); continue; }
    let m, want = null;
    if ((m = q.q.match(/0\.\\overline\{(\d+)\}/))) want = parseFloat('0.' + m[1].repeat(Math.ceil(30 / m[1].length)));
    else if ((m = q.q.match(/n\(A\) = (\d+)\$, \$n\(B\) = (\d+)\$ and \$n\(A \\cap B\) = (\d+)/))) want = num(m[1]) + num(m[2]) - num(m[3]);
    else if ((m = q.q.match(/n\(\\xi\) = (\d+)\$ and \$n\(A\) = (\d+)/))) want = num(m[1]) - num(m[2]);
    else if ((m = q.q.match(/first term \$(-?\d+)\$ and common difference \$(-?\d+)\$. Find \$t_\{(\d+)\}/))) { let t = num(m[1]); for (let k = 1; k < num(m[3]); k++) t += num(m[2]); want = t; }
    else if ((m = q.q.match(/first term \$(\d+)\$ and common ratio \$(\d+)\$. Find the sum of the first \$(\d+)\$/))) { let t = num(m[1]), s = 0; for (let k = 0; k < num(m[3]); k++) { s += t; t *= num(m[2]); } want = s; }
    else if ((m = q.q.match(/\^\{(\d+)\}P_\{(\d+)\}/))) { let p = 1; for (let k = 0; k < num(m[2]); k++) p *= num(m[1]) - k; want = p; }
    else if ((m = q.q.match(/\^\{(\d+)\}C_\{(\d+)\}/))) want = fact(num(m[1])) / (fact(num(m[2])) * fact(num(m[1]) - num(m[2])));
    else if ((m = q.q.match(/determinant of \$\\begin\{bmatrix\} (-?\d+) & (-?\d+) \\\\ (-?\d+) & (-?\d+)/))) want = num(m[1]) * num(m[4]) - num(m[2]) * num(m[3]);
    else if ((m = q.q.match(/A = \\begin\{bmatrix\} (-?\d+) & (-?\d+) \\\\ (-?\d+) & (-?\d+) \\end\{bmatrix\}\$ and \$B = \\begin\{bmatrix\} (-?\d+) & (-?\d+) \\\\ (-?\d+) & (-?\d+)/))) {
      const A = [[num(m[1]), num(m[2])], [num(m[3]), num(m[4])]], B = [[num(m[5]), num(m[6])], [num(m[7]), num(m[8])]];
      want = A[0].reduce((s, a, k) => s + a * B[k][1], 0);
    } else if ((m = q.q.match(/b = (\d+)\$, \$c = (\d+)\$ and \$A = (\d+)\^\\circ/))) { const b = num(m[1]), c = num(m[2]), A = (num(m[3]) * Math.PI) / 180; want = b * b + c * c - 2 * b * c * Math.cos(A); }
    else if ((m = q.q.match(/\\mathbf\{a\} = (-?\d+)\\mathbf\{i\} ([+-]) (\d+)\\mathbf\{j\}\$\.$/))) want = Math.hypot(num(m[1]), num(m[3]));
    else if ((m = q.q.match(/\\mathbf\{a\} = (-?\d+)\\mathbf\{i\} ([+-]) (\d+)\\mathbf\{j\}\$ and \$\\mathbf\{b\} = (-?\d+)\\mathbf\{i\} ([+-]) (\d+)\\mathbf\{j\}/))) {
      const a2 = (m[2] === '-' ? -1 : 1) * num(m[3]), b2 = (m[5] === '-' ? -1 : 1) * num(m[6]); want = num(m[1]) * num(m[4]) + a2 * b2;
    } else if ((m = q.q.match(/\|z\|\$ where \$z = (-?\d+) ([+-]) (\d*)i\$/))) want = Math.hypot(num(m[1]), num(m[3] || 1));
    else if ((m = q.q.match(/real part of \$\((-?\d+) ([+-]) (\d*)i\)\((-?\d+) ([+-]) (\d*)i\)/))) {
      const a = num(m[1]), b = (m[2] === '-' ? -1 : 1) * num(m[3] || 1), c = num(m[4]), d = (m[5] === '-' ? -1 : 1) * num(m[6] || 1); want = a * c - b * d;
    } else if ((m = q.q.match(/velocity \$(-?\d+)\$ m\/s and has constant acceleration \$(-?\d+)\$ m\/s². Find its velocity after \$(\d+)\$/))) want = num(m[1]) + num(m[2]) * num(m[3]);
    if (want === null) { bad.push('not checked: ' + q.q); continue; }
    verified++; if (!near(want, q.a, 1e-6)) bad.push(`${q.q} → ${q.a}, expected ${want}`);
  }
  check(`practice: ${made} questions, all with a proper answer`, made === 4000 && !bad.length);
  check(`practice: ${verified} answers re-checked independently from the question's own numbers`, verified > 3000 && !bad.length);
  if (bad.length) console.log('bad:', bad.slice(0, 5));
  check('practice: every topic has questions', P.TOPICS.every((t) => seenTopics.has(t) && P.makeQuestion(r, t, true).topic === t));
  check('practice: answers can be typed as whole numbers, decimals or fractions', P.readAnswer('3/4') === 0.75 && P.readAnswer('-2.5') === -2.5
    && P.readAnswer('−1/2') === -0.5 && Number.isNaN(P.readAnswer('abc')) && Number.isNaN(P.readAnswer('1/0')));
  check('practice: day streaks count back from today (or yesterday)', P.streak(['2026-11-18', '2026-11-19', '2026-11-20'], '2026-11-20') === 3 && P.streak(['2026-11-10'], '2026-11-20') === 0);

  // Nothing is shown until it's been uploaded.
  U.setSources([]);
  check('locked: with nothing uploaded there are no questions and no formulas', P.makeQuestion(r) === null && P.unlockedTopics().length === 0 && F.formulaCount() === 0 && F.formulaCount(true) === 51);
  U.setSources(['headstart', 'Recurring decimals to fractions', 'Set notation', 'Number sets and Venn diagrams', 'Making a recurring decimal a fraction']);
  const qs = Array.from({ length: 200 }, () => P.makeQuestion(r).topic);
  check('unlocked: your headstart uploads give only number & sets questions and their formulas', qs.every((t) => t === 'Number & sets')
    && JSON.stringify(P.unlockedTopics()) === '["Number & sets"]' && F.formulaCount() > 4 && F.formulaCount() < 15);
  U.setSources(['catalogue', 'reset']);
  check('unlocked: words must start the same – "catalogue"/"reset" unlock nothing', P.unlockedTopics().length === 0);

  console.log(checks.join('\n')); console.log(checks.every((c) => c.startsWith('ok')) ? 'tools ok' : 'tools FAILED');
})();
