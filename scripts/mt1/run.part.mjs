// scripts/mt1.test.mjs, part: `node ci/checks/meta/mt1-tests-can-fail.mjs --run` on the stand-in project of
// scripts/mutation/ — the "MT1 on that record" halves of the blocks step 3 proves the record of (§3.5–§3.9), the
// all-skipped file (§3.5) and a test every change of which was dropped (AR-9).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { verdict } from '../../ci/checks/meta/mt1-tests-can-fail.mjs';
import { CART, project, testFile } from '../mutation/project.mjs';

const MT1 = fileURLToPath(new URL('../../ci/checks/meta/mt1-tests-can-fail.mjs', import.meta.url));
export const FILE = 'pkgs/app/src/cart.test.ts';
export const CHANGED = [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }];
export const EXCEPTION = (id, reason = 'a rename across test files') => `exceptions:\n  - id: ${id}\n    expires: 2099-01-01\n    reason: ${reason}\n    owner: test\n`;

// `pnpm tests-can-fail`'s command, in the project: its exit, its report and its printed lines.
export function mt1(p) {
  const r = spawnSync(process.execPath, [MT1, '--run'], { cwd: p.root, encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1', CHECK_TODAY: '2026-11-04' }, timeout: 120_000 });
  const line = r.stdout.split('\n').findLast((l) => l.startsWith('@@json '));
  const json = line ? JSON.parse(line.slice('@@json '.length)) : null;
  return { status: r.status, out: r.stdout + r.stderr, json, ids: json?.findings.map((f) => f.where) ?? [], warned: json?.warnings.map((w) => w.where) ?? [] };
}
export const removeAll = (t, p) => t.after(() => p.remove());

test('MT1 --run judges HEAD in the process: a test that fails on a change passes, with the summary line', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { adds: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['adds']) });
  const r = mt1(p);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^MT1: 1 new tests: 1 passed, 0 failed, 0 not judged\.$/m);
  assert.match(r.out, /^MT1: Not judged for a reason this step causes: 0 of 1\. Not judged for any reason: 0 of 1\.$/m);
});

test('a test that asserts nothing and one that reads its result before the expect are only-crashes; a TypeError inside the expect counts', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  removeAll(t, p);
  p.config({ tests: {
    'asserts nothing': { failsWhen: CHANGED, failure: 'failure-crash', frame: { file: 'pkgs/app/src/cart.ts', line: 2 } },
    'reads in expect': { failsWhen: CHANGED, failure: 'failure-TypeError-in-expect', frame: { file: FILE, line: 9 } },
    'reads before expect': { failsWhen: CHANGED, failure: 'failure-TypeError-in-expect', frame: { file: FILE, line: 12 } },
  } });
  p.commit({ [FILE]: [
    "import { it, expect, beforeEach } from 'vitest';", "import { add } from './cart';", 'let made;', 'beforeEach(() => { made = add(1, 2); });',
    "it('asserts nothing', () => {", '  made;', '});', "it('reads in expect', () => {", '  expect(add(1, 2)).toBe(3);', '});',
    "it('reads before expect', () => {", '  const got = add(1, 2);', '  expect(got).toBe(3);', '});', '',
  ].join('\n') });
  const r = mt1(p);
  assert.equal(r.status, 1, r.out);
  assert.deepEqual(r.ids, [`${FILE}:5#only-crashes`, `${FILE}:11#only-crashes`]);
});

test('a test that fails once on a change and again with nothing changed is a flaky finding', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { a: { failsWhen: CHANGED, failsUntouchedAfterChange: true } } } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['a']) });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, [`${FILE}:4#flaky`]], r.out);
});

test('at the limit every unfinished test is out-of-time, and the verdict names each with "ran out of time" and "not a pass"', (t) => {
  const subject = (n) => Array.from({ length: n }, (_, i) => `export function f${i}() { return ${i}; }\n`).join('');
  const p = project({ base: { 'pkgs/app/src/a.ts': subject(9), 'pkgs/app/src/b.ts': subject(2), 'pkgs/app/src/c.ts': subject(5) }, config: { runSleepMs: 2000 } });
  removeAll(t, p);
  p.commit(Object.fromEntries(['a', 'b', 'c'].map((n) => [`pkgs/app/src/${n}.test.ts`, testFile([n], { imports: `import { f0 as add } from './${n}';` })])));
  const { record } = p.run(['--limit-seconds', '5']);
  const v = verdict(record, { today: '2026-11-04', head: record.head });
  assert.deepEqual(v.findings.map((f) => f.where).sort(), ['a', 'b', 'c'].map((n) => `pkgs/app/src/${n}.test.ts:4#out-of-time`));
  for (const f of v.findings) assert.match(f.detail, /ran out of time \(0\.1 minutes\).*not a pass/);
});

test('a deleted expect is kills-nothing; a deleted test file or one renamed away passes, naming the file removed', (t) => {
  const base = testFile(['a', 'b']);
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: base } });
  removeAll(t, p);
  p.commit({ [FILE]: base.replace("it('a', () => {\n  expect(add(1, 2)).toBe(3);\n", "it('a', () => {\n") });
  let r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, [`${FILE}:4#kills-nothing`]], r.out);
  for (const change of [() => p.git(['rm', '-q', FILE]), () => p.git(['mv', FILE, 'pkgs/app/src/cart.tst.ts'])]) {
    p.git(['reset', '-q', '--hard', 'main']);
    change();
    p.commit({});
    r = mt1(p);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^MT1: No tests were added or changed\.$/m);
    assert.match(r.out, /^MT1: 1 test files were removed or renamed away\.$/m);
  }
});

test('the mechanical entry: its change passes naming each test; the next change is judged, and the entry is spent with "Remove it"', (t) => {
  const files = ['pkgs/app/src/a.test.ts', 'pkgs/app/src/b.test.ts', 'pkgs/app/src/c.test.ts'];
  const base = Object.fromEntries(files.map((f) => [f, testFile(['t'])]));
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, ...base }, config: { tests: { t: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  const touch = (f, n) => ({ [f]: base[f].replace('add(1, 2)).toBe(3)', `add(${n}, 2)).toBe(${n + 2})`) });
  p.commit({ ...touch(files[0], 2), ...touch(files[1], 2), ...touch(files[2], 2), 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#mechanical') });
  let r = mt1(p);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.warned, files.map((f) => `${f}#not-judged/mechanical/t`));
  p.git(['branch', '-f', 'main', 'HEAD']);
  p.commit(touch(files[0], 5));
  r = mt1(p);
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.warned, ['ci/exceptions.yaml:tests-can-fail#mechanical#spent']);
  assert.match(r.out, /Remove it\./);
});

test('a new test red then green in the baseline, the only new one, is nothing-judged', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { once: { redOnce: true } } } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['once']) });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${FILE}#not-judged/flaky/once`]], r.out);
});

test('a file stopped at the cap prints the capped line with both counts beside kills-nothing', (t) => {
  const subject = `${Array.from({ length: 40 }, (_, i) => `export function f${i}() { return ${i}; }\n`).join('')}${Array.from({ length: 35 }, (_, i) => `export const c${i} = true;\n`).join('')}`;
  const p = project({ base: { 'pkgs/app/src/cart.ts': subject } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['never'], { imports: "import { f0 as add } from './cart';" }) });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, [`${FILE}:4#kills-nothing`]], r.out);
  assert.match(r.out, /^MT1: `pkgs\/app\/src\/cart\.test\.ts` stopped at the cap of 30 changes: 10 body changes and 5 others were not tried, so it is not fully checked\.$/m);
  assert.match(r.json.findings[0].detail, /passed on all 60 changes/);
});

test('MT1 --run reads ci/exceptions.yaml as HEAD holds it: an uncommitted edit neither excuses nor hides an expiry', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  removeAll(t, p);
  const entry = (expires) => `exceptions:\n  - id: tests-can-fail#${FILE}\n    expires: ${expires}\n    reason: reads files\n    owner: test\n`;
  p.commit({ 'ci/exceptions.yaml': entry('2026-10-01') });
  writeFileSync(join(p.root, 'ci', 'exceptions.yaml'), entry('2099-01-01'));
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, [`ci/exceptions.yaml:tests-can-fail#${FILE}#excuse-expired`]], r.out);
});

test('a new file whose every test is skipped is never-run, and its message says a skip may be why', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  removeAll(t, p);
  p.commit({ 'pkgs/app/src/later.test.ts': "import { it } from 'vitest';\n\nit.skip('a', () => {});\nit.todo('b');\n" });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, ['pkgs/app/src/later.test.ts#never-run']], r.out);
  const f = r.json.findings[0];
  assert.match(f.detail, /no test run picks it up \(`app`: `vitest run`\), or every test in it is skipped\./);
  assert.match(f.fix, /remove the skip, or keep it out in `ci\/tests-can-fail\.yaml` with a reason/);
});

test('a test every change of which stops its file loading is not judged, by its own reason: named beside a judged test, nothing-judged alone', (t) => {
  const one = 'export function f0() { return 0; }\nexport function f1() { return 1; }\n';
  const p = project({ base: { 'pkgs/app/src/cart.ts': one, 'pkgs/app/src/other.ts': CART } });
  removeAll(t, p);
  p.config({ tests: { dropped: { loadFailsWhen: [{ file: 'pkgs/app/src/cart.ts', line: 1, has: 'return 0' }, { file: 'pkgs/app/src/cart.ts', line: 2, has: 'return 1' }] }, kills: { failsWhen: [{ file: 'pkgs/app/src/other.ts', line: 2, has: 'return a + b' }] } } });
  p.commit({ [FILE]: testFile(['dropped'], { imports: "import { f0 as add } from './cart';" }) });
  let r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${FILE}#not-judged/every-change-dropped/dropped`]], r.out);
  assert.doesNotMatch(r.out, /the run and its verdict disagree/);
  p.commit({ 'pkgs/app/src/other.test.ts': testFile(['kills'], { imports: "import { add } from './other';" }) });
  r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], [`${FILE}#not-judged/every-change-dropped/dropped`]], r.out);
  assert.match(r.json.warnings[0].detail, /every change this step made to `pkgs\/app\/src\/cart\.ts` stopped the test file loading/);
});

test('MT1 --run names ci/exceptions.yaml when the commit\'s copy cannot be read', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  removeAll(t, p);
  p.commit({ 'ci/exceptions.yaml': 'exceptions:\n  - id: x\n    bogus: 1\n' });
  const r = mt1(p);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /ci\/exceptions\.yaml: /);
});

test('MT1 --run never prints the CI command marker raw, on stdout or in its progress lines', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  removeAll(t, p);
  p.commit({ 'pkgs/app/src/##[warning]cart.test.ts': testFile(['adds']) });
  const r = mt1(p);
  assert.match(r.out, /judging pkgs\/app\/src\/.*cart\.test\.ts/);
  assert.doesNotMatch(r.out, /##\[/);
});
