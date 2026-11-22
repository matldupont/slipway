// scripts/mutation.test.mjs, part: the time limit of ci/tests-can-fail.yaml (§6, §7, #681), and a test at the cap leaving
// the next file judged.

import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readTestsCanFail } from '../../ci/checks/lib/runner-call.mjs';
import { runMutation } from '../../ci/mutation.mjs';
import { CART, project, testFile } from './project.mjs';

const FILE = 'pkgs/app/src/cart.test.ts';
const CHANGED = [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }];
const byName = (record, name) => record.tests.find((t) => t.name === name);

const limited = (t, yaml) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { a: { failsWhen: CHANGED } } } });
  t.after(() => p.remove());
  return p.commit({ [FILE]: testFile(['a']), ...(yaml ? { 'ci/tests-can-fail.yaml': `entries:\n  - time-limit-seconds: ${yaml}\n` } : {}) });
};

test('ci/tests-can-fail.yaml: time-limit-seconds is a whole number from 60 to 7200, at most once, in an entry of its own', () => {
  const names = new Set(['api']);
  const read = (body) => readTestsCanFail(`entries:\n${body}`, names);
  assert.equal(read('  - package: api\n    run: vitest run\n').limitSeconds, null);
  for (const n of [60, 1800, 7200]) assert.equal(read(`  - time-limit-seconds: ${n}\n`).limitSeconds, n);
  const beside = read('  - package: api\n    run: vitest run\n  - time-limit-seconds: 900 # a slow suite\n');
  assert.deepEqual([beside.limitSeconds, beside.runs.get('api')], [900, ['vitest run']]);
  for (const bad of ['0', '-5', '59', '7201', '12.5', '1e3', '0900', 'abc', '']) {
    assert.throws(() => read(`  - time-limit-seconds: ${bad}\n`), /line 2: time-limit-seconds takes a whole number of seconds from 60 to 7200/, bad);
  }
  assert.throws(() => read('  - time-limit-seconds: 900\n  - time-limit-seconds: 1800\n'), /line 3: a second time-limit-seconds/);
  assert.throws(() => read('  - time-limit-seconds: 900\n    reason: slow\n'), /line 2: a time-limit-seconds entry holds nothing else/);
  assert.throws(() => read('  - package: api\n    time-limit-seconds: 900\n'), /cannot read/);
});

test('a bad time limit stops a pull request that changes no test, naming the line', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  p.commit({ 'ci/tests-can-fail.yaml': 'entries:\n  - time-limit-seconds: abc\n' });
  const { status, record } = p.run();
  assert.equal(status, 2);
  assert.match(record.stopped, /ci\/tests-can-fail\.yaml: line 2: time-limit-seconds takes a whole number/);
});

test('with no test changed, every shape of a bad limit stops the run, and the line named is the file\'s own', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  for (const [text, says] of [
    ['entries:\n  - package: app\n    time-limit-seconds: 5\n', /cannot read/],
    ['time-limit-seconds: 5\n', /cannot read/],
    ['entries:\n  - time-limit-second: 900\n', /cannot read/],
    ['entries:\n  - time-limit-seconds: abc\u2028\n', /line 2/],
    ['entries:\n  - time-limit-seconds: abc\rx\n', /line 2/],
    ['\n\n\nentries:\n  - time-limit-seconds: 5\n', /line 5: time-limit-seconds takes a whole number/],
  ]) {
    p.commit({ 'ci/tests-can-fail.yaml': text });
    const { status, record } = p.run();
    assert.equal(status, 2, JSON.stringify(text));
    assert.match(record.stopped, /^ci\/tests-can-fail\.yaml: /, JSON.stringify(text));
    assert.match(record.stopped, says, JSON.stringify(text));
  }
});

test('a symlink or a folder at the config\'s path sets no limit', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  mkdirSync(join(p.root, 'ci'), { recursive: true });
  symlinkSync('- time-limit-seconds: 7200', join(p.root, 'ci/tests-can-fail.yaml'));
  p.commit({});
  assert.equal(p.run().record.limit, 600, 'a symlink');
  const folder = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => folder.remove());
  folder.commit({ 'ci/tests-can-fail.yaml/- time-limit-seconds: 7200': 'x\n' });
  assert.equal(folder.run().record.limit, 600, 'a folder');
});

test('the limit: the file sets it on the call MT1 makes and on the script, a flag wins, and with neither it is 600', async (t) => {
  const p = limited(t, 1800);
  assert.equal((await runMutation({ root: p.root })).limit, 1800, 'the call the gate makes, which passes no limit');
  assert.equal(p.run().record.limit, 1800);
  assert.equal(p.run(['--limit-seconds', '90']).record.limit, 90);
  assert.equal(limited(t).run().record.limit, 600);
});

test('the file\'s limit moves the run\'s deadline, not only the number it reports', async (t) => {
  // The clock jumps 70 seconds after the run starts: past a limit of 60, inside the 600 of a project with none.
  const jump = (mock) => {
    const real = Date.now;
    let first = true;
    mock.method(Date, 'now', () => {
      const now = real.call(Date);
      if (first) {
        first = false;
        return now;
      }
      return now + 70_000;
    });
  };
  const short = limited(t, 60);
  jump(t.mock);
  const stopped = await runMutation({ root: short.root });
  t.mock.restoreAll();
  assert.equal(stopped.outOfTime, true);
  const open = limited(t);
  jump(t.mock);
  const ran = await runMutation({ root: open.root });
  t.mock.restoreAll();
  assert.equal(ran.outOfTime, false);
});

test('a test no change kills ends at the cap, not out of time, and the next file is judged', (t) => {
  const subject = `${Array.from({ length: 40 }, (_, i) => `export function f${i}() { return ${i}; }\n`).join('')}${Array.from({ length: 35 }, (_, i) => `export const c${i} = true;\n`).join('')}`;
  const killed = { failsWhen: [{ file: 'pkgs/app/src/b.ts', line: 1, has: 'return 0' }] };
  const p = project({ base: { 'pkgs/app/src/a.ts': subject, 'pkgs/app/src/b.ts': subject }, config: { tests: { killed } } });
  t.after(() => p.remove());
  p.commit({
    'pkgs/app/src/a.test.ts': testFile(['never'], { imports: "import { f0 as add } from './a';" }),
    'pkgs/app/src/b.test.ts': testFile(['killed'], { imports: "import { f0 as add } from './b';" }),
  });
  const { record } = p.run();
  assert.deepEqual(record.order, ['pkgs/app/src/a.test.ts', 'pkgs/app/src/b.test.ts'], 'the file held by the test nothing kills comes first');
  assert.equal(record.outOfTime, false);
  assert.deepEqual([byName(record, 'never').state, byName(record, 'never').tried, byName(record, 'never').failedOn], ['judged', 60, null]);
  assert.equal(byName(record, 'killed').failedOn.file, 'pkgs/app/src/b.ts');
});
