// scripts/mutation.test.mjs, part: ci/mutation.mjs judging new tests on a temporary project — a test that fails on a
// change, one that never does, the crash rule (§3.9), the subjects (§3.6) and the reasons a test is not judged.

import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CART, project, testFile } from './project.mjs';

// Every path under the project but .git, so a run that leaves a file there is seen.
const listing = (root, at = '') => readdirSync(join(root, at), { withFileTypes: true }).flatMap((e) => {
  const path = at ? `${at}/${e.name}` : e.name;
  if (path === '.git') return [];
  return e.isDirectory() && !e.isSymbolicLink() ? [path, ...listing(root, path)] : [path];
});
const byName = (record, name) => record.tests.find((t) => t.name === name);

test('a test that fails on a change is judged with failedOn at that line, one that never fails with failedOn null, and the project is untouched', (t) => {
  const outside = mkdtempSync(join(tmpdir(), 'mutation-log-'));
  const p = project({ base: { 'pkgs/app/src/cart.ts': 'export const one = 1;\nexport const add = (a, b) => a + b;\n' } });
  t.after(() => { p.remove(); rmSync(outside, { recursive: true, force: true }); });
  const log = join(outside, 'calls.jsonl');
  p.config({ tests: { fails: { failsWhen: [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'a + b' }] } }, record: log, project: p.root });
  p.commit({ 'pkgs/app/src/cart.test.ts': testFile(['fails', 'never']) });
  const before = listing(p.root);
  const { status, record } = p.run();
  assert.equal(status, 0, record?.stopped);
  assert.equal(byName(record, 'fails').state, 'judged');
  assert.equal(byName(record, 'fails').failedOn.line, 2);
  const never = byName(record, 'never');
  assert.deepEqual([never.state, never.failedOn, never.crashes], ['judged', null, 0]);
  assert.ok(never.tried >= 1);
  const calls = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(calls.length >= 3);
  for (const call of calls) assert.deepEqual(call, { status: '', worktrees: 1 });
  assert.deepEqual(listing(p.root), before, 'no file under the project that the run made');
  assert.equal(record.head, p.git(['rev-parse', 'HEAD']).trim());
});

test('a crash in the code, or on the line before the expect, does not count; a TypeError inside the expect does', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  const file = 'pkgs/app/src/cart.test.ts';
  const changes = [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }];
  p.config({ tests: {
    'asserts nothing': { failsWhen: changes, failure: 'failure-crash', frame: { file: 'pkgs/app/src/cart.ts', line: 2 } },
    'reads in expect': { failsWhen: changes, failure: 'failure-TypeError-in-expect', frame: { file, line: 9 } },
    'reads before expect': { failsWhen: changes, failure: 'failure-TypeError-in-expect', frame: { file, line: 12 } },
  } });
  p.commit({ [file]: [
    "import { it, expect, beforeEach } from 'vitest';",
    "import { add } from './cart';",
    'let made;',
    'beforeEach(() => { made = add(1, 2); });',
    "it('asserts nothing', () => {",
    '  made;',
    '});',
    "it('reads in expect', () => {",
    '  expect(add(1, 2)).toBe(3);',
    '});',
    "it('reads before expect', () => {",
    '  const got = add(1, 2);',
    '  expect(got).toBe(3);',
    '});',
    '',
  ].join('\n') });
  const { record } = p.run();
  assert.equal(record.stopped, null);
  for (const [name, line, where] of [['asserts nothing', 2, 'pkgs/app/src/cart.ts'], ['reads before expect', 12, file]]) {
    const test = byName(record, name);
    assert.equal(test.failedOn, null, name);
    assert.ok(test.crashes >= 1, name);
    assert.deepEqual(test.lastCrash, { type: 'TypeError', file: where, line }, name);
  }
  assert.equal(byName(record, 'reads in expect').failedOn.by, 'TypeError inside an expect');
});

test('the subjects are the imported code and what it re-exports; types are dropped, test support is left out', (t) => {
  const p = project({ base: {
    'pkgs/app/src/cart.ts': CART,
    'pkgs/app/src/utils/index.ts': "export * from './a';\n",
    'pkgs/app/src/utils/a.ts': "export * from './b';\nexport function a1(x) { return x > 1; }\n",
    'pkgs/app/src/utils/b.ts': 'export function b1(x) { return x === 2; }\n',
    'pkgs/app/src/types.ts': 'export type Cart = { lines: number };\n',
    'pkgs/app/src/factories.ts': 'export const make = () => ({ lines: 1 });\n',
    'pkgs/app/mocks/handlers.ts': 'export const handlers = [() => true];\n',
    'pkgs/lib/package.json': JSON.stringify({ name: 'lib', private: true, main: 'src/index.ts' }),
    'pkgs/lib/src/index.ts': "export * from './x';\nexport function l1() { return true; }\n",
    'pkgs/lib/src/x.ts': 'export function x1(n) { return n + 1; }\n',
  } });
  t.after(() => p.remove());
  p.commit({
    'pkgs/app/src/cart.test.ts': testFile(['uses all'], { imports: "import { add } from './cart';\nimport { a1 } from './utils';\nimport { Cart } from './types';\nimport { make } from './factories';\nimport { handlers } from '../mocks/handlers';\nimport { l1 } from 'lib';" }),
    'pkgs/app/src/types-only.test.ts': testFile(['types only'], { imports: "import { Cart } from './types';\nconst add = (a, b) => a + b;" }),
    'pkgs/app/src/factories-only.test.ts': testFile(['factories only'], { imports: "import { make } from './factories';\nconst add = (a, b) => a + b;" }),
  });
  const { record } = p.run();
  assert.equal(record.stopped, null);
  assert.deepEqual(byName(record, 'uses all').subjects.sort(), ['pkgs/app/src/cart.ts', 'pkgs/app/src/utils/a.ts', 'pkgs/app/src/utils/b.ts', 'pkgs/lib/src/index.ts', 'pkgs/lib/src/x.ts']);
  assert.deepEqual(record.noChange.map((f) => f.file).sort(), ['pkgs/app/src/types.ts', 'pkgs/app/src/utils/index.ts']);
  assert.deepEqual(record.support.map((f) => f.file).sort(), ['pkgs/app/mocks/handlers.ts', 'pkgs/app/src/factories.ts']);
  const why = (name) => record.notJudged.find((n) => n.name === name)?.why;
  assert.equal(why('types only'), 'no-change-to-make');
  assert.equal(why('factories only'), 'support-only');
  assert.equal(record.tests.filter((x) => x.name !== 'uses all').length, 0);
});

test('could-not-be-parsed, no-subject, excused and kept-out are named; a file nothing lists is never-run; data and helpers are not tests', (t) => {
  const p = project({ base: { 'pkgs/app/src/broken.ts': 'export function (\n' } });
  t.after(() => p.remove());
  p.config({ unlisted: ['pkgs/app/src/unlisted.test.ts'] });
  p.commit({
    'pkgs/app/src/broken.test.ts': testFile(['broken'], { imports: "import { add } from './broken';" }),
    'pkgs/app/src/plain.test.ts': testFile(['plain'], { imports: 'const add = (a, b) => a + b;' }),
    'pkgs/app/src/excused.test.ts': testFile(['excused'], { imports: 'const add = (a, b) => a + b;' }),
    'pkgs/app/e2e/flow.test.ts': testFile(['flow'], { imports: 'const add = (a, b) => a + b;' }),
    'pkgs/app/src/unlisted.test.ts': testFile(['unlisted']),
    'pkgs/app/src/__snapshots__/cart.test.tsx.snap': 'exports[`x`] = `1`;\n',
    'pkgs/app/src/__tests__/fixtures/order.json': '{}\n',
    'pkgs/app/src/__tests__/helpers.ts': 'export const h = 1;\n',
    'ci/exceptions.yaml': 'exceptions:\n  - id: tests-can-fail#pkgs/app/src/excused.test.ts\n    expires: 2099-01-01\n    reason: reads migration files\n    owner: test\n',
    'ci/tests-can-fail.yaml': 'entries:\n  - package: app\n    keep-out: e2e/\n    reason: browser tests\n',
  });
  const { record } = p.run();
  assert.equal(record.stopped, null);
  const why = Object.fromEntries(record.notJudged.map((n) => [n.file, n.why]));
  assert.deepEqual(why, {
    'pkgs/app/src/broken.test.ts': 'could-not-be-parsed',
    'pkgs/app/src/plain.test.ts': 'no-subject',
    'pkgs/app/src/excused.test.ts': 'excused',
    'pkgs/app/e2e/flow.test.ts': 'kept-out',
  });
  assert.equal(record.notJudged.find((n) => n.why === 'excused').detail, 'reads migration files (until 2099-01-01)');
  assert.equal(record.notJudged.find((n) => n.why === 'kept-out').detail, 'browser tests');
  assert.deepEqual(record.tests, []);
  assert.deepEqual(record.neverRun, [{ file: 'pkgs/app/src/unlisted.test.ts' }]);
  assert.deepEqual(record.notTests.map((f) => f.file).sort(), ['pkgs/app/src/__tests__/fixtures/order.json', 'pkgs/app/src/__tests__/helpers.ts']);
  assert.equal(record.changedTestFiles.includes('pkgs/app/src/__snapshots__/cart.test.tsx.snap'), false);
});

test('the parser\'s reason a subject is unreadable is escaped in the record: it can quote the file', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.js': 'const a = 1, b = 2;\nexport { a as "x\u001b[31m" };\nexport { b as "x\u001b[31m" };\n' } });
  t.after(() => p.remove());
  p.commit({ 'pkgs/app/src/cart.test.ts': testFile(['a']) });
  const { record } = p.run();
  const { reason } = record.unreadable.find((u) => u.file === 'pkgs/app/src/cart.js');
  assert.equal(/[\u0000-\u001f]/.test(reason), false, reason);
  assert.ok(reason.includes('\\u001b'), reason);
});

test('a changed test file that is a symlink is not read: one the runner runs is named, could-not-be-parsed', (t) => {
  const outside = mkdtempSync(join(tmpdir(), 'mutation-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(join(outside, 'far.test.ts'), testFile(['far']));
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  symlinkSync(join(outside, 'far.test.ts'), join(p.root, 'pkgs/app/src/far.test.ts'));
  p.commit({});
  const { status, record } = p.run();
  assert.equal(status, 0, record.stopped);
  assert.deepEqual(record.tests, []);
  assert.deepEqual(record.notJudged.map((n) => [n.file, n.why]), [['pkgs/app/src/far.test.ts', 'could-not-be-parsed']]);
  assert.deepEqual(record.notTests, []);
});

test('the record is printed with a control or format character in a test name as a JSON escape', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  p.commit({ 'pkgs/app/src/cart.test.ts': testFile(['a\u202eb\u009bc']) });
  const { stdout, record } = p.run();
  assert.equal(/[\u202e\u009b]/.test(stdout), false);
  assert.deepEqual(record.tests.map((x) => x.name), ['a\u202eb\u009bc']);
});
