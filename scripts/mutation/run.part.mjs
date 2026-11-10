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

test('a test helper that imports product code is a path to it: the code a test reaches only through its helpers is a subject, and the test is judged (#659)', (t) => {
  const p = project({ base: {
    'pkgs/app/src/cart.ts': CART,
    'pkgs/app/src/config.ts': 'export const config = { limit: 3 };\nexport function over(n) {\n  return n > config.limit;\n}\n',
    'pkgs/app/tests/api.ts': "import { add } from '../src/cart';\nexport const start = () => ({ add });\n",
    'pkgs/app/tests/cart-fixture.ts': "import { start } from './api';\nexport const app = start();\n",
  } });
  t.after(() => p.remove());
  p.config({ tests: { 'through its helper': { failsWhen: [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }] } } });
  p.commit({ 'pkgs/app/tests/checkout.test.ts': testFile(['through its helper'], { imports: "import { config } from '../src/config';\nimport { app } from './cart-fixture';\nconst { add } = app;" }) });
  const { status, record } = p.run();
  assert.equal(status, 0, record?.stopped);
  const judged = byName(record, 'through its helper');
  assert.deepEqual(judged.subjects.sort(), ['pkgs/app/src/cart.ts', 'pkgs/app/src/config.ts']);
  assert.deepEqual([judged.state, judged.failedOn?.file], ['judged', 'pkgs/app/src/cart.ts']);
  // The helpers are still support, never changed.
  assert.deepEqual(record.support.map((f) => f.file).sort(), ['pkgs/app/tests/api.ts', 'pkgs/app/tests/cart-fixture.ts']);
  assert.deepEqual(record.notJudged, []);
});

test('a helper that imports product code adds the files the pull request changed in that package, its own lines first; a helper\'s import by package name is followed as the test\'s is (#659)', (t) => {
  const p = project({ base: {
    'pkgs/app/src/orders.ts': 'export function check(body) {\n  return body.ok === true;\n}\n',
    'pkgs/app/src/app.ts': "import { check } from './orders';\nexport function start() {\n  return { check };\n}\n",
    'pkgs/app/tests/server.ts': "import { start } from '../src/app';\nexport const app = start();\n",
    'pkgs/lib/package.json': JSON.stringify({ name: 'lib', private: true, main: 'src/index.ts' }),
    'pkgs/lib/src/index.ts': 'export function l1(n) {\n  return n + 1;\n}\n',
    'pkgs/app/tests/lib-fixture.ts': "import { l1 } from 'lib';\nexport const one = l1(0);\n",
  } });
  t.after(() => p.remove());
  p.config({ tests: { 'checks the body': { failsWhen: [{ file: 'pkgs/app/src/orders.ts', line: 2, has: 'body.ok === true && body.n > 0' }] } } });
  p.commit({
    'pkgs/app/src/orders.ts': 'export function check(body) {\n  return body.ok === true && body.n > 0;\n}\n',
    'pkgs/app/tests/orders.test.ts': testFile(['checks the body'], { imports: "import { app } from './server';\nconst add = (a, b) => a + b;" }),
    'pkgs/app/tests/lib.test.ts': testFile(['through lib'], { imports: "import { one } from './lib-fixture';\nconst add = (a, b) => a + b;" }),
  });
  const { status, record } = p.run();
  assert.equal(status, 0, record?.stopped);
  // The changed file is the subject, not app.ts, which the helper imports and which reaches it by a plain import.
  const checks = byName(record, 'checks the body');
  assert.deepEqual(checks.subjects, ['pkgs/app/src/orders.ts']);
  assert.deepEqual([checks.state, checks.failedOn?.file], ['judged', 'pkgs/app/src/orders.ts']);
  assert.deepEqual(byName(record, 'through lib').subjects, ['pkgs/lib/src/index.ts']);
});

test('a test whose helpers import no product code is still support-only, a helper chain is followed 3 levels deep, no further, and a test that reads files is named so (#659)', (t) => {
  const p = project({ base: {
    'pkgs/app/src/cart.ts': CART,
    'pkgs/app/tests/rows.ts': 'export const rows = [1, 2];\n',
    'pkgs/app/tests/data-fixture.ts': "import { rows } from './rows';\nexport const data = rows;\n",
    'pkgs/app/tests/h3.ts': "import { add } from '../src/cart';\nexport const h3 = add;\n",
    'pkgs/app/tests/h2.ts': "export { h3 as h2 } from './h3';\nimport './h3';\n",
    'pkgs/app/tests/h1.ts': "import { h2 } from './h2';\nexport const h1 = h2;\n",
    'pkgs/app/tests/h0.ts': "import { h1 } from './h1';\nexport const h0 = h1;\n",
  } });
  t.after(() => p.remove());
  p.commit({
    'pkgs/app/tests/data.test.ts': testFile(['data only'], { imports: "import { data } from './data-fixture';\nconst add = (a, b) => a + b;" }),
    'pkgs/app/tests/deep.test.ts': testFile(['too deep'], { imports: "import { h0 } from './h0';\nconst add = h0;" }),
    'pkgs/app/tests/files.test.ts': testFile(['reads files'], { imports: "import { readFileSync } from 'node:fs';\nimport { join } from 'node:path';\nconst add = (a, b) => a + b;" }),
    'pkgs/app/tests/alias.test.ts': testFile(['through an alias'], { imports: "import { readFileSync } from 'node:fs';\nimport { x } from '@/lib/x';\nconst add = (a, b) => a + b;" }),
  });
  const { status, record } = p.run();
  assert.equal(status, 0, record?.stopped);
  const why = (name) => record.notJudged.find((n) => n.name === name);
  assert.deepEqual([why('data only')?.why, why('too deep')?.why], ['support-only', 'support-only']);
  // A test that imports no source file and reads files is no-subject, with the detail its message reads.
  assert.deepEqual([why('reads files')?.why, why('reads files')?.detail], ['no-subject', 'reads files']);
  // One that also imports through an alias may import its code that way: it keeps the import fix.
  assert.deepEqual([why('through an alias')?.why, why('through an alias')?.detail], ['no-subject', null]);
  assert.equal(record.tests.length, 0);
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
