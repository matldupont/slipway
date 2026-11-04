// scripts/mutation.test.mjs, part: which change ci/mutation.mjs judges (§3.1, §3.2, §3.5, §3.7) — no test changed,
// changes outside every test, a row of an it.each, a rename, the merge base, deletions, the mechanical entry, and the
// packages and runner calls it can or cannot read (§3.3).

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CART, project, testFile } from './project.mjs';

const FILE = 'pkgs/app/src/cart.test.ts';
const three = (names = ['a', 'b', 'c']) => testFile(names);
const reset = (p) => p.git(['checkout', '-q', '-B', 'work', 'main']);
const newNames = (record) => record.tests.map((x) => x.name).concat(record.notJudged.filter((n) => n.name).map((n) => n.name)).sort();
const EXCEPTION = (id, expires = '2099-01-01') => `exceptions:\n  - id: ${id}\n    expires: ${expires}\n    reason: a rename across test files\n    owner: test\n`;

test('a commit that changes no test file ends there: no copy, no runner call', (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'mutation-tmp-'));
  const log = join(tmp, 'calls.jsonl');
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { envDump: log } });
  t.after(() => { p.remove(); rmSync(tmp, { recursive: true, force: true }); });
  p.commit({ 'pkgs/app/src/cart.ts': `${CART}// more\n` });
  const { status, record } = p.run([], { TMPDIR: tmp });
  assert.equal(status, 0);
  assert.deepEqual(record.changedTestFiles, []);
  assert.equal(existsSync(log), false, 'the runner was called');
  assert.deepEqual(readdirSync(tmp), [], 'a copy was made');
});

test('a describe line, a hook and whitespace mark no test new; a blank line or whitespace alone is no change outside a test', (t) => {
  const body = (describe, hook, line) => `import { it, expect, describe, beforeEach } from 'vitest';\nimport { add } from './cart';\ndescribe('${describe}', () => {\n  beforeEach(() => {${hook}});\n  it('adds', () => {\n${line}\n  });\n});\n`;
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: body('cart', '', '    expect(add(1, 2)).toBe(3);') } });
  t.after(() => p.remove());
  p.commit({ [FILE]: body('the cart', ' void 0; ', '    expect(add(1,  2)).toBe(3);') });
  let { record } = p.run();
  assert.deepEqual(newNames(record), []);
  assert.deepEqual(record.outsideAnyTest, [{ file: FILE }]);
  reset(p);
  p.commit({ [FILE]: body('cart', '', '\n      expect(add(1, 2)).toBe(3);\n') });
  ({ record } = p.run());
  assert.deepEqual([newNames(record), record.outsideAnyTest], [[], []]);
});

test('a changed row of an it.each of three makes one new test, the group, named by the call\'s line', (t) => {
  const each = (row) => `import { it, expect } from 'vitest';\nimport { add } from './cart';\n\nit.each([\n  [1, 2],\n  ${row},\n  [3, 4],\n])('adds %i', (a, b) => {\n  expect(add(a, 1)).toBe(b);\n});\n`;
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: each('[2, 3]') }, config: { rows: { 'adds %i': 3 } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: each('[5, 6]') });
  const { record } = p.run();
  assert.equal(record.tests.length, 1);
  assert.deepEqual([record.tests[0].name, record.tests[0].line], ['adds 1', 4]);
});

test('a renamed test file with one line changed inside one test lists only that test', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three() } });
  t.after(() => p.remove());
  p.git(['mv', FILE, 'pkgs/app/src/basket.test.ts']);
  p.commit({ 'pkgs/app/src/basket.test.ts': three().replace("it('b', () => {\n  expect(add(1, 2)).toBe(3);", "it('b', () => {\n  expect(add(2, 2)).toBe(4);") });
  const { record } = p.run();
  assert.deepEqual(newNames(record), ['b']);
});

test('the diff is from the merge base: the default branch\'s later change marks no test new; with no default branch it stops', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three() } });
  t.after(() => p.remove());
  p.commit({ [FILE]: three().replace("it('b', () => {\n  expect(add(1, 2))", "it('b', () => {\n  expect(add(0, 3))") });
  p.git(['checkout', '-q', 'main']);
  p.commit({ [FILE]: three().replace("it('a', () => {\n  expect(add(1, 2))", "it('a', () => {\n  expect(add(2, 1))") });
  p.git(['checkout', '-q', 'work']);
  let { status, record } = p.run();
  assert.deepEqual(newNames(record), ['b']);
  assert.equal(record.head, p.git(['rev-parse', 'HEAD']).trim());
  assert.equal(record.base, p.git(['merge-base', 'main', 'HEAD']).trim());
  p.git(['branch', '-m', 'main', 'trunk']);
  ({ status, record } = p.run());
  assert.equal(status, 2);
  assert.match(record.stopped, /found none: no origin\/main, origin\/master, main or master\. Fetch it/);
});

test('a deleted expect makes its test new; a deleted test, a hook that loses a line, a deleted or renamed-away file mark none', (t) => {
  const hooked = (hook) => `import { it, expect, beforeEach } from 'vitest';\nimport { add } from './cart';\nlet n;\nbeforeEach(() => {\n${hook}});\n\nit('a', () => {\n  n;\n  expect(add(1, 2)).toBe(3);\n});\n\nit('b', () => {\n  expect(add(1, 2)).toBe(3);\n});\n\nit('c', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
  const base = hooked('  n = 1;\n  n += 1;\n');
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: base } });
  t.after(() => p.remove());
  p.commit({ [FILE]: base.replace('  n;\n  expect(add(1, 2)).toBe(3);\n', '  n;\n') });
  let { record } = p.run();
  assert.deepEqual(newNames(record), ['a']);
  assert.equal(record.tests[0].failedOn, null);
  reset(p);
  p.commit({ [FILE]: base.replace("\nit('b', () => {\n  expect(add(1, 2)).toBe(3);\n});\n", '') });
  ({ record } = p.run());
  assert.deepEqual([newNames(record), record.outsideAnyTest], [[], [{ file: FILE }]]);
  reset(p);
  p.commit({ [FILE]: hooked('  n = 1;\n') });
  ({ record } = p.run());
  assert.deepEqual([newNames(record), record.outsideAnyTest], [[], [{ file: FILE }]]);
  for (const change of [() => p.git(['rm', '-q', FILE]), () => p.git(['mv', FILE, 'pkgs/app/src/cart.tst.ts'])]) {
    reset(p);
    change();
    p.commit({});
    ({ record } = p.run());
    assert.deepEqual([record.changedTestFiles, record.removedTestFiles], [[], 1]);
  }
});

test('the mechanical entry counts only in the change that adds it; re-touched, merged in or uncommitted, it excuses nothing', (t) => {
  const log = join(mkdtempSync(join(tmpdir(), 'mutation-log-')), 'calls.jsonl');
  const calls = (path) => (existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').length : 0);
  const files = ['pkgs/app/src/a.test.ts', 'pkgs/app/src/b.test.ts', 'pkgs/app/src/c.test.ts'];
  const base = Object.fromEntries(files.map((f) => [f, testFile(['t'], { imports: "import { add } from './cart';" })]));
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, ...base } });
  t.after(() => p.remove());
  const touch = (f, n) => ({ [f]: base[f].replace('add(1, 2)).toBe(3)', `add(${n}, 2)).toBe(${n + 2})`) });
  p.config({ record: log, project: p.root });
  p.commit({ ...touch(files[0], 2), ...touch(files[1], 2), ...touch(files[2], 2), 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#mechanical') });
  let { record } = p.run();
  assert.equal(record.mechanical, true);
  assert.deepEqual(record.notJudged.map((n) => [n.file, n.why, n.detail]), files.map((f) => [f, 'mechanical', 'a rename across test files (until 2099-01-01)']));
  assert.equal(calls(log), 1, 'the runner was called for the listing and no more');
  p.git(['branch', '-f', 'main', 'HEAD']);
  p.commit({ ...touch(files[0], 5), 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#mechanical').replace('a rename', 'a codemod') });
  ({ record } = p.run());
  assert.deepEqual([record.mechanical, record.mechanicalSpent, record.tests.length], [false, true, 1]);
  // Arrives by a merge of the default branch: the merge base holds it, so it is spent.
  reset(p);
  p.git(['checkout', '-q', '-B', 'side', 'main~1']);
  p.commit({ 'pkgs/app/src/d.test.ts': testFile(['d']) });
  p.git(['merge', '-q', '--no-edit', 'main']);
  ({ record } = p.run());
  assert.deepEqual([record.mechanical, record.mechanicalSpent, newNames(record)], [false, true, ['d']]);
});

test('the registry is read from the commit: an uncommitted mechanical entry excuses nothing, and the step says what it left out', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three(), 'ci/exceptions.yaml': 'exceptions: []\n' } });
  t.after(() => p.remove());
  p.commit({ [FILE]: three().replace("it('c', () => {\n  expect(add(1, 2))", "it('c', () => {\n  expect(add(0, 3))") });
  p.write({ 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#mechanical') });
  const { record } = p.run();
  assert.deepEqual([record.mechanical, record.uncommitted, newNames(record)], [false, 1, ['c']]);
});
