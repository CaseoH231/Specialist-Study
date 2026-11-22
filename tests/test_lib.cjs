// The library rules: topics, photos and the change "ops".
const path = require('path');
(async () => {
  const L = await import(path.join(__dirname, '..', 'lib.js'));
  const checks = []; const check = (n, ok) => checks.push(`${ok ? 'ok  ' : 'FAIL'} ${n}`);
  const lib = L.emptyLibrary();
  let r = L.applyOps(lib, [{ type: 'add_path', path: ['Complex numbers', 'Polar form'], ids: ['t-c', 't-p'] },
    { type: 'add_photo', photo: { id: 'p-aaaaaa', topic: '@path', title: 'Ex 2C' } }]);
  check('a sorted photo makes its topics and goes in the deepest', r.done === 2 && L.photoOf(lib, 'p-aaaaaa').topic === 't-p' && L.topicOf(lib, 't-p').parent === 't-c');
  L.applyOps(lib, [{ type: 'add_path', path: ['complex numbers ', 'De Moivre'], ids: ['t-x', 't-d'] }, { type: 'add_photo', photo: { id: 'p-bbbbbb', topic: '@path', title: 'DM' } }]);
  check('existing topics are found by name (any case), not duplicated', !L.topicOf(lib, 't-x') && L.topicOf(lib, 't-d').parent === 't-c');
  r = L.applyOps(lib, [{ type: 'move_topic', topic: 't-c', parent: 't-p' }]);
  check('a topic can’t move inside itself', r.done === 0 && !L.topicOf(lib, 't-c').parent);
  L.applyOps(lib, [{ type: 'add_photo', photo: { id: 'p-cccccc', topic: 'nope', title: 'Lost' } }]);
  check('a photo with no real topic goes to Unsorted', L.photoOf(lib, 'p-cccccc').topic === 'unsorted');
  L.applyOps(lib, [{ type: 'delete_topic', topic: 't-c' }]);
  check('deleting a topic keeps its sub-topics and photos (moved up)', !L.topicOf(lib, 't-c') && !L.topicOf(lib, 't-p').parent && L.photoOf(lib, 'p-aaaaaa').topic === 't-p');
  lib.photos[0].notes = 'Kept'; L.applyOps(lib, [{ type: 'move_photo', photo: 'p-aaaaaa', topic: 't-d' }, { type: 'rename_photo', photo: 'p-aaaaaa', title: '  New  name ' }]);
  check('moving and renaming keeps the notes', L.photoOf(lib, 'p-aaaaaa').notes === 'Kept' && L.photoOf(lib, 'p-aaaaaa').title === 'New name' && L.photoOf(lib, 'p-aaaaaa').topic === 't-d');
  r = L.applyOps(lib, [{ type: 'add_topic', id: '<bad>', name: 'x' }, { type: 'nonsense' }, null]);
  check('bad ops are skipped, not thrown', r.done === 0 && r.skipped.length === 3);
  check('outline lists ids for the AI', /\[t-d\] De Moivre/.test(L.outline(lib)) && /\(p-aaaaaa\) New name/.test(L.outline(lib)));
  const html = L.formatNotes('### Method\n- use $z=re^{i\\theta}$\n- **check** <b>\nDone');
  check('notes are formatted safely', html.includes('<h4>Method</h4>') && html.includes('<b>check</b> &lt;b&gt;') && html.includes('$z=re^{i\\theta}$') && html.includes('<p>Done</p>'));
  const u = L.emptyLibrary();
  L.applyOps(u, [{ type: 'unlock_formula', name: 'Log laws' }, { type: 'unlock_formula', name: 'Log laws' }, { type: 'unlock_formula', name: 'Modulus' }, { type: 'lock_formula', name: 'Modulus' }]);
  check('formulas can be unlocked and locked again (no duplicates)', JSON.stringify(u.unlocked) === '["Log laws"]');
  console.log(checks.join('\n')); console.log(checks.every((c) => c.startsWith('ok')) ? 'lib ok' : 'lib FAILED');
})();
