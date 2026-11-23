// scripts/mutation.test.mjs, part: which change ci/mutation.mjs judges (§3.1, §3.2, §3.5, §3.7) — no test changed,
// changes outside every test, a row of an it.each, a rename, the merge base, deletions, the mechanical entry, and the
// packages and runner calls it can or cannot read (§3.3).

import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { changedLines } from '../../ci/checks/lib/mutation-git.mjs';
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

test('a describe line or a hook makes every test in the file new; a whitespace-only edit does too, and the record names it (D-057)', (t) => {
  const body = (describe, hook, line) => `import { it, expect, describe, beforeEach } from 'vitest';\nimport { add } from './cart';\ndescribe('${describe}', () => {\n  beforeEach(() => {${hook}});\n  it('adds', () => {\n${line}\n  });\n});\n`;
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: body('cart', '', '    expect(add(1, 2)).toBe(3);') } });
  t.after(() => p.remove());
  p.commit({ [FILE]: body('the cart', ' void 0; ', '    expect(add(1,  2)).toBe(3);') });
  let { record } = p.run();
  assert.deepEqual([newNames(record), record.whitespaceOnly], [['adds'], []]);
  reset(p);
  p.commit({ [FILE]: body('cart', '', '\n      expect(add(1, 2)).toBe(3);\n') });
  ({ record } = p.run());
  assert.deepEqual([newNames(record), record.whitespaceOnly], [['adds'], [{ file: FILE }]]);
});

test('one changed and one untouched test in a changed file are both judged (D-057)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: testFile(['changed', 'untouched']) } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['changed', 'untouched']).replace("it('changed', () => {\n  expect(add(1, 2)).toBe(3);", "it('changed', () => {\n  expect(add(2, 2)).toBe(4);") });
  const { record } = p.run();
  assert.deepEqual(record.tests.map((x) => [x.name, x.state]).sort(), [['changed', 'judged'], ['untouched', 'judged']]);
});

test('content decides what changed: a mode change at one path judges nothing, and an identical rename is judged (D-057)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three() } });
  t.after(() => p.remove());
  chmodSync(join(p.root, FILE), 0o755);
  p.commit({});
  let { record } = p.run();
  assert.deepEqual([record.changedTestFiles, newNames(record), record.whitespaceOnly], [[FILE], [], []]);
  reset(p);
  p.git(['mv', FILE, 'pkgs/app/src/basket.test.ts']);
  p.commit({});
  ({ record } = p.run());
  assert.deepEqual([record.changedTestFiles, newNames(record), record.whitespaceOnly], [['pkgs/app/src/basket.test.ts'], ['a', 'b', 'c'], []]);
});

test('a change of mode alone to a file no run picks up is still never-run (D-057)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three() }, config: { unlisted: [FILE] } });
  t.after(() => p.remove());
  chmodSync(join(p.root, FILE), 0o755);
  p.commit({});
  const { record } = p.run();
  assert.deepEqual([record.neverRun, newNames(record)], [[{ file: FILE }], []]);
});

test('an identical rename to where no run picks it up is still never-run (D-057)', (t) => {
  const moved = 'pkgs/app/src/basket.test.ts';
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three() }, config: { unlisted: [moved] } });
  t.after(() => p.remove());
  p.git(['mv', FILE, moved]);
  p.commit({});
  const { record } = p.run();
  assert.deepEqual([record.neverRun, newNames(record)], [[{ file: moved }], []]);
});

for (const from of ['pkgs/app/src/cart.tst.ts', 'pkgs/app/src/cart.test.ts.off', 'pkgs/app/src/__tests__/cart.ts']) {
  test(`a file renamed from ${from} to a name a runner runs, its content unchanged, has every test judged (D-057)`, (t) => {
    const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [from]: three() } });
    t.after(() => p.remove());
    p.git(['mv', from, FILE]);
    p.commit({});
    const { record } = p.run();
    assert.deepEqual([newNames(record), record.whitespaceOnly], [['a', 'b', 'c'], []]);
  });
}

const KEPT = 'entries:\n  - package: app\n    keep-out: src/e2e\n    reason: browser tests\n';
const E2E = 'pkgs/app/src/e2e/cart.test.ts';
for (const [what, after] of [['stays in the config', KEPT], ['is deleted in the same pull request', null]]) {
  test(`an identical rename out of a kept-out folder whose entry ${what} has every test judged (D-057)`, (t) => {
    const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [E2E]: three(), 'ci/tests-can-fail.yaml': KEPT } });
    t.after(() => p.remove());
    p.git(['mv', E2E, FILE]);
    p.commit({ 'ci/tests-can-fail.yaml': after });
    const { record } = p.run();
    assert.deepEqual(newNames(record), ['a', 'b', 'c']);
  });
}

test('an identical rename out of a folder the pull request itself keeps out has every test judged (D-057)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [E2E]: three() } });
  t.after(() => p.remove());
  p.git(['mv', E2E, FILE]);
  p.commit({ 'ci/tests-can-fail.yaml': KEPT });
  const { record } = p.run();
  assert.deepEqual(newNames(record), ['a', 'b', 'c']);
});

test('an identical rename into another package has every test judged (D-057)', (t) => {
  const other = { name: 'other', private: true, scripts: { test: 'vitest run' }, devDependencies: { vitest: 'link:../../standin' } };
  const moved = 'pkgs/other/src/cart.test.ts';
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, 'pkgs/other/src/cart.ts': CART, 'pkgs/other/package.json': JSON.stringify(other), [FILE]: three() } });
  t.after(() => p.remove());
  p.git(['mv', FILE, moved]);
  p.commit({});
  const { record } = p.run();
  assert.deepEqual(newNames(record), ['a', 'b', 'c']);
});

test('a link replaced by a file holding the same bytes is a change of type, and its tests are judged (D-057)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  const text = testFile(['a']);
  p.git(['checkout', '-q', 'main']);
  symlinkSync(text, join(p.root, FILE));
  p.commit({});
  p.git(['checkout', '-q', '-B', 'work', 'main']);
  p.git(['rm', '-q', FILE]);
  p.commit({ [FILE]: text });
  const { record } = p.run();
  assert.deepEqual(newNames(record), ['a']);
});

test('a changed row of an it.each of three makes each row a new test, judged on its own and named by the call\'s line (#655)', (t) => {
  const each = (row) => `import { it, expect } from 'vitest';\nimport { add } from './cart';\n\nit.each([\n  [1, 2],\n  ${row},\n  [3, 4],\n])('adds %i', (a, b) => {\n  expect(add(a, 1)).toBe(b);\n});\n`;
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: each('[2, 3]') }, config: { rows: { 'adds %i': 3 } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: each('[5, 6]') });
  const { record } = p.run();
  assert.deepEqual(record.tests.map((x) => [x.name, x.line]), [['adds 1', 4], ['adds 2', 4], ['adds 3', 4]]);
});

test('a renamed test file with one line changed inside one test has every test in it judged', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three() } });
  t.after(() => p.remove());
  p.git(['mv', FILE, 'pkgs/app/src/basket.test.ts']);
  p.commit({ 'pkgs/app/src/basket.test.ts': three().replace("it('b', () => {\n  expect(add(1, 2)).toBe(3);", "it('b', () => {\n  expect(add(2, 2)).toBe(4);") });
  const { record } = p.run();
  assert.deepEqual(newNames(record), ['a', 'b', 'c']);
});

test('the diff is from the merge base: a file only the default branch changed later is not judged; with no default branch it stops', (t) => {
  const other = 'pkgs/app/src/other.test.ts';
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: three(), [other]: testFile(['z']) } });
  t.after(() => p.remove());
  p.commit({ [FILE]: three().replace("it('b', () => {\n  expect(add(1, 2))", "it('b', () => {\n  expect(add(0, 3))") });
  p.git(['checkout', '-q', 'main']);
  p.commit({ [other]: testFile(['z']).replace('add(1, 2)).toBe(3)', 'add(2, 1)).toBe(3)') });
  p.git(['checkout', '-q', 'work']);
  let { status, record } = p.run();
  assert.deepEqual(newNames(record), ['a', 'b', 'c']);
  assert.equal(record.head, p.git(['rev-parse', 'HEAD']).trim());
  assert.equal(record.base, p.git(['merge-base', 'main', 'HEAD']).trim());
  p.git(['branch', '-m', 'main', 'trunk']);
  ({ status, record } = p.run());
  assert.equal(status, 2);
  assert.match(record.stopped, /found none: no origin\/main, origin\/master, main or master\. Fetch it/);
});

test('a deleted expect, a deleted test or a hook that loses a line has every test left in the file judged; a deleted or renamed-away file has none', (t) => {
  const hooked = (hook) => `import { it, expect, beforeEach } from 'vitest';\nimport { add } from './cart';\nlet n;\nbeforeEach(() => {\n${hook}});\n\nit('a', () => {\n  n;\n  expect(add(1, 2)).toBe(3);\n});\n\nit('b', () => {\n  expect(add(1, 2)).toBe(3);\n});\n\nit('c', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
  const base = hooked('  n = 1;\n  n += 1;\n');
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: base } });
  t.after(() => p.remove());
  p.commit({ [FILE]: base.replace('  n;\n  expect(add(1, 2)).toBe(3);\n', '  n;\n') });
  let { record } = p.run();
  assert.deepEqual(newNames(record), ['a', 'b', 'c']);
  assert.equal(record.tests.find((x) => x.name === 'a').failedOn, null);
  reset(p);
  p.commit({ [FILE]: base.replace("\nit('b', () => {\n  expect(add(1, 2)).toBe(3);\n});\n", '') });
  ({ record } = p.run());
  assert.deepEqual([newNames(record), record.whitespaceOnly], [['a', 'c'], []]);
  reset(p);
  p.commit({ [FILE]: hooked('  n = 1;\n') });
  ({ record } = p.run());
  assert.deepEqual([newNames(record), record.whitespaceOnly], [['a', 'b', 'c'], []]);
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
  assert.deepEqual([record.mechanical, record.uncommitted, newNames(record)], [false, 1, ['a', 'b', 'c']]);
});

test('the lines a change adds are read whatever git calls the file, and a path that reads as a pathspec is a path', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  const lines = (file, files) => {
    const base = p.git(['rev-parse', 'HEAD']).trim();
    p.commit(files);
    return [...changedLines(p.root, base, p.git(['rev-parse', 'HEAD']).trim(), { file, from: file }).added];
  };
  // A NUL byte makes git call the file binary.
  assert.deepEqual(lines(FILE, { [FILE]: 'one\n// \0\n' }), [1, 2]);
  // So does an attribute, on a file with none; a textconv driver is not run.
  const other = 'pkgs/app/src/other.test.ts';
  p.commit({ '.gitattributes': '*.test.ts -diff\n' });
  assert.deepEqual(lines(other, { [other]: 'one\ntwo\n' }), [1, 2]);
  p.git(['config', 'diff.upper.textconv', 'tr a-z A-Z <']);
  p.commit({ '.gitattributes': '*.test.ts diff=upper\n' });
  assert.deepEqual(lines(other, { [other]: 'one\nTWO\n' }), [2]);
  const magic = ':(attr:nope)cart.test.ts';
  assert.deepEqual(lines(magic, { [magic]: 'one\n' }), [1]);
});

test('a test file the change adds is no whitespace-only change, and every test in it is new', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['n']) });
  const { record } = p.run();
  assert.deepEqual(newNames(record), ['n']);
  assert.deepEqual(record.whitespaceOnly, []);
});
