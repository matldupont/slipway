// scripts/mutation.test.mjs, part: which packages ci/mutation.mjs can judge and how it runs them (§3.3) — a workspace
// with no Vitest, the other-runner entry, a test script it cannot read and the run: entry that states it, a file in
// no package, a package on another runner, and a checkout under a folder named `test`.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CART, project, testFile } from './project.mjs';

const FILE = 'pkgs/app/src/cart.test.ts';
const EXCEPTION = (id) => `exceptions:\n  - id: ${id}\n    expires: 2099-01-01\n    reason: tests run by another runner\n    owner: test\n`;

test('with no package on Vitest, a changed test file stops the run, unless the other-runner entry names it not judged', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, pkg: { devDependencies: {} } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  let { status, record } = p.run();
  assert.equal(status, 2);
  assert.equal(record.stopped, '`pkgs/app/src/cart.test.ts` was added or changed, and no package here uses Vitest, the only test runner this step can judge.');
  p.commit({ 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#other-runner') });
  ({ status, record } = p.run());
  assert.equal(status, 0);
  assert.deepEqual(record.notJudged.map((n) => [n.file, n.why]), [[FILE, 'other-runner']]);
});

test('a test script that is not a plain call stops the run quoting it; a run: entry states the call and the test is judged', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, test: 'cross-env CI=1 vitest run' });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  let { status, record } = p.run();
  assert.equal(status, 2);
  assert.equal(record.stopped, "`app`'s `test` script is not a plain call to the test runner, so this step cannot tell which tests it runs: cross-env CI=1 vitest run. Write the call in `ci/tests-can-fail.yaml`: `- package: app` and `run: vitest run …` or `run: node … node_modules/vitest/vitest.mjs run …`.");
  p.commit({ 'ci/tests-can-fail.yaml': 'entries:\n  - package: app\n    run: vitest run\n  - package: app\n    run: node node_modules/vitest/vitest.mjs run --project unit\n' });
  ({ status, record } = p.run());
  assert.equal(status, 0, record.stopped);
  assert.deepEqual(record.runs.map((r) => r.call), ['vitest run', 'node node_modules/vitest/vitest.mjs run --project unit']);
  assert.deepEqual(record.tests.map((x) => [x.name, x.state]), [['a', 'judged']]);
});

test('a test file in no package is named; a package on another runner: its data is not a test, its kept-out folder is kept-out', (t) => {
  const p = project({ base: {
    'pkgs/app/src/cart.ts': CART,
    'pkgs/other/package.json': JSON.stringify({ name: 'other', private: true }),
  } });
  t.after(() => p.remove());
  p.commit({
    'root.test.ts': testFile(['root']),
    'pkgs/other/__tests__/data.json': '{}\n',
    'pkgs/other/src/other.test.ts': testFile(['other']),
    'pkgs/other/e2e/flow.test.ts': testFile(['flow']),
    'ci/tests-can-fail.yaml': 'entries:\n  - package: other\n    keep-out: e2e\n    reason: browser tests\n',
  });
  const { status, record } = p.run();
  assert.equal(status, 0, record.stopped);
  assert.deepEqual(Object.fromEntries(record.notJudged.map((n) => [n.file, n.why])), {
    'root.test.ts': 'no-package',
    'pkgs/other/src/other.test.ts': 'other-runner',
    'pkgs/other/e2e/flow.test.ts': 'kept-out',
  });
  assert.deepEqual(record.notTests, [{ file: 'pkgs/other/__tests__/data.json' }]);
  assert.deepEqual(record.neverRun, []);
});

test('a checkout under a folder named test makes no file test support: the support list reads the path inside the repository', (t) => {
  const parent = join(mkdtempSync(join(tmpdir(), 'mutation-')), 'test');
  mkdirSync(parent);
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, parent });
  t.after(() => rmSync(join(parent, '..'), { recursive: true, force: true }));
  p.commit({ [FILE]: testFile(['a']) });
  const { record } = p.run();
  assert.deepEqual([record.support, record.tests[0].subjects], [[], ['pkgs/app/src/cart.ts']]);
});
