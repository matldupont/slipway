// scripts/mutation.test.mjs, part: the edges of judging (§3.8, §3.9, §7) — flaky in the baseline and after it, the
// time limit, the caps and the order of changes, a Vitest with no recording, and what one changed run adds when the
// file does not load, the test times out, or it is skipped.

import assert from 'node:assert/strict';
import test from 'node:test';
import { mutants } from '../../ci/checks/lib/mutants.mjs';
import { CART, project, testFile } from './project.mjs';

const FILE = 'pkgs/app/src/cart.test.ts';
const CHANGED = [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }];
// A subject with n functions of one body change each, and m booleans of one literal change each.
const subject = (n, m = 0) => `${Array.from({ length: n }, (_, i) => `export function f${i}() { return ${i}; }\n`).join('')}${Array.from({ length: m }, (_, i) => `export const c${i} = true;\n`).join('')}`;
const byName = (record, name) => record.tests.find((t) => t.name === name);

test('a test that fails once on a change and again with nothing changed is flaky', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { a: { failsWhen: CHANGED, failsUntouchedAfterChange: true } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  const { record } = p.run();
  assert.equal(byName(record, 'a').state, 'flaky');
  assert.ok(byName(record, 'a').failedOn, 'it was credited, and is flaky whatever it was credited with');
});

test('at the limit the run stops, in the order of fewest changes first, and every unfinished test is out-of-time', (t) => {
  const base = { 'pkgs/app/src/a.ts': subject(9), 'pkgs/app/src/b.ts': subject(2), 'pkgs/app/src/c.ts': subject(5) };
  const p = project({ base, config: { runSleepMs: 2000 } });
  t.after(() => p.remove());
  p.commit(Object.fromEntries(['a', 'b', 'c'].map((n) => [`pkgs/app/src/${n}.test.ts`, testFile([n], { imports: `import { f0 as add } from './${n}';` })])));
  const started = Date.now();
  const { status, record } = p.run(['--limit-seconds', '5']);
  assert.ok(Date.now() - started < 5000 + 4000, 'it stops within the limit, and its clean-up');
  assert.equal(status, 0);
  assert.deepEqual(record.order, ['pkgs/app/src/b.test.ts', 'pkgs/app/src/c.test.ts', 'pkgs/app/src/a.test.ts']);
  assert.equal(record.outOfTime, true);
  assert.equal(record.limit, 5);
  assert.deepEqual(record.tests.map((x) => x.state).sort(), ['out-of-time', 'out-of-time', 'out-of-time']);
});

test('red then green in the baseline is not judged, flaky, and nothing is changed for it; red twice stops the run', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { once: { redOnce: true } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['once', 'fine']) });
  let { status, record } = p.run();
  assert.equal(status, 0);
  assert.deepEqual(record.notJudged.map((n) => [n.name, n.why]), [['once', 'flaky']]);
  assert.deepEqual(record.tests.map((x) => x.name), ['fine']);
  p.config({ tests: { twice: { redTwice: true } } }).commit({ [FILE]: testFile(['twice', 'fine']) });
  ({ status, record } = p.run());
  assert.equal(status, 2);
  assert.equal(record.stopped, '`pkgs/app/src/cart.test.ts` › "twice" is red in a clean copy of this commit, before anything is changed. If it passes in your checkout, it needs a file that git does not track and `ci/before-verify.sh` does not make, or a service that script starts and that did not come up.');
});

test('every new test red, or a connection error, names ci/before-verify.sh\'s services before it blames a test (AR-1)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { a: { always: true } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  let { record } = p.run();
  assert.match(record.stopped, /^A service `ci\/before-verify\.sh` starts may not be up, or one from an earlier run may still hold its port: every new test is red/);
  p.config({ tests: { a: { always: true, connection: true } } }).commit({ [FILE]: testFile(['a', 'b']) });
  ({ record } = p.run());
  assert.match(record.stopped, /^A service `ci\/before-verify\.sh` starts may not be up.*: a test failed on a connection error\. Check those services first\. `pkgs/);
});

test('past the caps a file is capped with the counts not tried: 30 body changes, then 30 more', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': subject(40, 35) } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['never'], { imports: "import { f0 as add } from './cart';" }) });
  const { record } = p.run();
  assert.equal(byName(record, 'never').tried, 60);
  assert.deepEqual(record.capped, [{ file: FILE, untriedBody: 10, untriedOther: 5 }]);
});

test('the change on a line the pull request adds is tried first, then the rest by kind (AR-13)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': subject(3, 1) }, config: { tests: { a: { failsWhen: [{ file: 'pkgs/app/src/cart.ts', line: 3, has: 'return 22' }] } } } });
  t.after(() => p.remove());
  p.commit({ 'pkgs/app/src/cart.ts': subject(3, 1).replace('return 2;', 'return 22;'), [FILE]: testFile(['a'], { imports: "import { f0 as add } from './cart';" }) });
  const { record } = p.run();
  assert.deepEqual([byName(record, 'a').tried, byName(record, 'a').failedOn.line], [1, 3]);
});

test('a Vitest major with no recording stops the run before any runner call (AR-8)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, version: '9.1.0', config: { envDump: '/dev/null/x' } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  const { status, record } = p.run();
  assert.equal(status, 2);
  assert.match(record.stopped, /^`app` has Vitest 9\.1\.0, and this step was written for Vitest 4 and 5/);
  assert.deepEqual(record.runs, []);
});

test('a failure whose first word is not an error\'s name counts for nothing and is named (AR-8)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { a: { failsWhen: CHANGED, message: 'boom: not an error\n    at x (/x:1:1)' } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  const a = byName(p.run().record, 'a');
  assert.deepEqual([a.failedOn, a.unreadFailures > 0, a.lastUnread], [null, true, 'boom']);
});

test('one changed run: a file that does not load adds nothing; a timeout or a skip adds to tried and nothing else (AR-9)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  const ALL = mutants('cart.ts', CART).length;
  const timeout = 'Error: Test timed out in 5000ms.\nIf this is a long-running test, pass a timeout value as the last argument.';
  // Two of cart.ts's changes touch line 2: add's body and its +. A file that does not load is dropped for each.
  const cases = [[{ loadFailsWhen: CHANGED }, 2], [{ failsWhen: CHANGED, message: timeout }, 0], [{ skipsWhen: CHANGED }, 0]];
  for (const [rule, dropped] of cases) {
    p.config({ tests: { a: rule } }).commit({ [FILE]: testFile(['a', 'b']) });
    const { record } = p.run();
    const [a, b] = [byName(record, 'a'), byName(record, 'b')];
    assert.deepEqual([a.tried, b.tried, a.failedOn, a.crashes, a.state], [ALL - dropped, ALL - dropped, null, 0, 'judged'], JSON.stringify(rule));
  }
});

test('a skipped new test is not judged, skipped; a subject in another language is other-language; an unreadable test file has every test new (AR-13)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, 'pkgs/app/src/calc.py': 'x = 1\n' }, config: { tests: { skipped: { skipped: true } } } });
  t.after(() => p.remove());
  const lone = `${testFile(['one', 'two'])}// a lone CR:\r here\n`;
  p.commit({
    [FILE]: testFile(['skipped', 'kept']),
    'pkgs/app/src/calc.test.ts': testFile(['py'], { imports: "import { add } from './calc.py';" }),
  });
  let { record } = p.run();
  const why = Object.fromEntries(record.notJudged.map((n) => [n.name, n.why]));
  assert.deepEqual(why, { skipped: 'skipped', py: 'other-language' });
  // The file beside it is its subject, so its tests are judged even though its imports cannot be read.
  p.git(['checkout', '-q', '-B', 'work', 'main']);
  p.commit({ [FILE]: testFile(['one', 'two']) });
  p.git(['branch', '-f', 'main', 'HEAD']);
  p.commit({ [FILE]: lone });
  ({ record } = p.run());
  assert.deepEqual(record.tests.map((x) => x.name).sort(), ['one', 'two']);
  assert.match(record.unreadable.find((u) => u.file === FILE).reason, /line break git does not count/);
});

test('a test the runner lists in no call spans() reads (an alias, test.extend) makes every test of its file new', (t) => {
  const file = (line) => `import { test, expect } from 'vitest';\nimport { add } from './cart';\nconst fixtureTest = test.extend({});\n\nfixtureTest('one', () => {\n  expect(add(1, 2)).toBe(3);\n});\n\ntest('two', () => {\n${line}\n});\n`;
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: file('  expect(add(1, 2)).toBe(3);') } });
  t.after(() => p.remove());
  p.commit({ [FILE]: file('  expect(add(2, 2)).toBe(4);') });
  const { record } = p.run();
  assert.deepEqual(record.tests.map((x) => x.name).sort(), ['one', 'two']);
  assert.match(record.unreadable.find((u) => u.file === FILE).reason, /an alias of it or test, or test\.extend/);
});

test('a new test skipped or todo before it runs, which the runner does not list, is not judged, skipped, and named by its line', (t) => {
  // An old skipped test the change does not touch is not named.
  const old = "\nit.skip('old', () => {});\n";
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: `${testFile(['kept'])}${old}` } });
  t.after(() => p.remove());
  p.commit({ [FILE]: `${testFile(['kept', 'new'])}${old}\nit.skip('later', () => {\n  expect(add(1, 2)).toBe(3);\n});\n\nit.todo('one day');\n` });
  let { record } = p.run();
  const named = (r) => r.notJudged.map((n) => [n.file, n.why, n.detail]);
  const at = (file, line) => [file, 'skipped', `the runner lists no test in the call at line ${line}: skipped or todo before it runs`];
  assert.deepEqual(record.tests.map((x) => x.name), ['new']);
  assert.deepEqual(named(record), [at(FILE, 14), at(FILE, 18)]);
  // A file whose every test is skipped or todo is listed by no run: never-run, as a file no run picks up is.
  const later = 'pkgs/app/src/later.test.ts';
  p.commit({ [later]: "import { it } from 'vitest';\n\nit.skip('a', () => {});\nit.todo('b');\n" });
  ({ record } = p.run());
  assert.deepEqual(record.neverRun, [{ file: later }]);
  assert.deepEqual(named(record).filter(([file]) => file === later), []);
  // A todo beside a test written through an alias is named too.
  const alias = 'pkgs/app/src/alias.test.ts';
  p.commit({ [alias]: "import { test } from 'vitest';\nconst fixtureTest = test.extend({});\n\nfixtureTest('aliased', () => {});\ntest.todo('soon');\n" });
  ({ record } = p.run());
  assert.deepEqual(named(record).filter(([file, why]) => file === alias && why === 'skipped'), [at(alias, 5)]);
});
