// scripts/mutation.test.mjs, part: what #681 adds to a run: the filtered screen (§3.9, D-057), where only a whole-file
// run credits a kill; the time limit of ci/tests-can-fail.yaml (§6, §7); and a test at the cap leaving the next file judged.

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { allPassed, FILTER_MAX, nameFilter, sameFilter } from '../../ci/checks/lib/mutation-filter.mjs';
import { Stop } from '../../ci/checks/lib/mutation-calls.mjs';
import { readTestsCanFail } from '../../ci/checks/lib/runner-call.mjs';
import { readResult } from '../../ci/checks/lib/runner-output.mjs';
import { runMutation } from '../../ci/mutation.mjs';
import { CART, project, testFile } from './project.mjs';

const FILE = 'pkgs/app/src/cart.test.ts';
const CHANGED = [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }];
const OLD = Array.from({ length: 9 }, (_, i) => `old${i}`);
const byName = (record, name) => record.tests.find((t) => t.name === name);

// A project whose test file holds `old` before the change and `old` plus `fresh` after it, and the log of its runs.
function screened(t, tests, fresh = ['fresh'], old = OLD) {
  const dir = mkdtempSync(join(tmpdir(), 'mutation-calls-'));
  const callLog = join(dir, 'calls.jsonl');
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: testFile(old) }, config: { callLog, tests } });
  t.after(() => {
    p.remove();
    rmSync(dir, { recursive: true, force: true });
  });
  p.commit({ [FILE]: testFile([...old, ...fresh]) });
  const { record } = p.run();
  return { record, calls: readFileSync(callLog, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) };
}

test('one new test beside nine old ones: each change runs a filter naming only the new test, and the old ones do not run', (t) => {
  const { record, calls } = screened(t, {});
  const f = byName(record, 'fresh');
  assert.ok(f.tried > 0);
  assert.equal(calls.filter((c) => c.filter === '^(?:fresh)$').length, f.tried + 1, 'one clean run with the filter, and one run per change');
  assert.equal(calls.filter((c) => c.filter === null).length, 2, 'only the clean report and the untouched run after judging run the whole file');
});

test('a failure under the filter goes to a whole-file run of the same change, which credits the kill', (t) => {
  const { record, calls } = screened(t, { fresh: { failsWhen: CHANGED } });
  assert.equal(byName(record, 'fresh').failedOn.file, 'pkgs/app/src/cart.ts');
  const at = calls.findIndex((c) => c.changed && c.filter !== null);
  assert.deepEqual(calls[at + 1], { filter: null, changed: true });
});

test('a test that fails only when filtered is never credited: a whole-file run decides, and it kills nothing', (t) => {
  const { record, calls } = screened(t, { fresh: { failsWhen: CHANGED, failsOnlyFiltered: true } });
  const f = byName(record, 'fresh');
  assert.equal(f.state, 'judged');
  assert.equal(f.failedOn, null);
  assert.ok(calls.some((c) => c.changed && c.filter === null), 'the same change ran on the whole file');
  const tries = calls.filter((c) => c.filter !== null).length - 1;
  assert.equal(f.tried, tries, 'the whole-file run of a change is not a second tried change');
});

test('a filtered clean run that is not green ends screening for the file, and a real kill still counts', (t) => {
  const { record, calls } = screened(t, { fresh: { failsWhen: CHANGED, redWhenFiltered: true } });
  assert.equal(byName(record, 'fresh').failedOn.file, 'pkgs/app/src/cart.ts');
  assert.deepEqual(calls.filter((c) => c.filter !== null), [{ filter: '^(?:fresh)$', changed: false }], 'the clean run, and no filtered run of a change');
});

test('when a kill shrinks the open tests, the new filter gets its own clean run first', (t) => {
  const { record, calls } = screened(t, { a: { failsWhen: CHANGED } }, ['a', 'b'], ['old']);
  const both = calls.filter((c) => c.filter === '^(?:a|b)$').length;
  const one = calls.filter((c) => c.filter === '^(?:b)$').length;
  assert.ok(byName(record, 'a').failedOn);
  assert.ok(one >= 2, 'a clean run and at least one change');
  assert.equal(byName(record, 'b').tried, both - 1 + one - 1, 'one clean run per filter, every other filtered run a change');
});

test('nameFilter() matches each name only, in both spellings, and gives up on a missing name or a filter too long', () => {
  const names = ['a.b(c)+d [x] $1 ^y | z/w-v', 'a_b(c)+d [x] $1 ^y | z/w-v', 'a.b', 'axb'];
  const only = new RegExp(nameFilter([{ name: names[0] }, { name: 'a.b' }]));
  assert.deepEqual(names.filter((n) => only.test(n)), [names[0], 'a.b']);
  const nested = new RegExp(nameFilter([{ name: 'outer > leaf', fullName: 'outer leaf' }]));
  assert.deepEqual(['outer > leaf', 'outer leaf', 'outer', 'leaf', 'outer leaf x'].filter((n) => nested.test(n)), ['outer > leaf', 'outer leaf']);
  assert.equal(nameFilter([]), null);
  assert.equal(nameFilter([{ name: 'a' }, { name: '', fullName: null }]), null);
  assert.equal(nameFilter([{ name: 'x'.repeat(FILTER_MAX) }]), null);
});

test('readResult() keeps the runner\'s own full name beside the ` > ` name, and null when it gives none', () => {
  const entry = (fullName) => ({ title: 'leaf', ancestorTitles: ['outer'], fullName, status: 'passed', failureMessages: [] });
  const [{ tests }] = readResult({ testResults: [{ name: '/f', status: 'passed', assertionResults: [entry('outer leaf'), entry(7)] }] }, 'p', '5.0.0');
  assert.deepEqual(tests.map((x) => [x.name, x.fullName]), [['outer > leaf', 'outer leaf'], ['outer > leaf', null]]);
});

test('allPassed() is true only when the file loaded and every open test passed; a skipped or missing one did not', () => {
  const open = [{ key: '1:1\u0000a' }, { key: '2:1\u0000b' }];
  const row = (line, name, status) => ({ line, column: 1, name, status });
  const res = (tests, more = {}) => ({ hung: false, none: false, loaded: true, tests, ...more });
  const green = [row(1, 'a', 'passed'), row(2, 'b', 'passed')];
  assert.equal(allPassed(res(green), open), true);
  assert.equal(allPassed(res([row(1, 'a', 'passed'), row(2, 'b', 'skipped')]), open), false);
  assert.equal(allPassed(res([row(1, 'a', 'passed')]), open), false);
  assert.equal(allPassed(res([row(1, 'a', 'passed'), row(2, 'b', 'failed')]), open), false);
  for (const more of [{ hung: true }, { none: true }, { loaded: false }]) assert.equal(allPassed(res(green, more), open), false);
});

test('sameFilter() stops the run on a clean run with any other filter, or none', () => {
  assert.doesNotThrow(() => sameFilter({ filter: '^(?:a)$' }, '^(?:a)$'));
  for (const clean of [{ filter: '^(?:a|b)$' }, { filter: null }, null, undefined]) assert.throws(() => sameFilter(clean, '^(?:a)$'), Stop);
});

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

const limited = (t, yaml) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { tests: { a: { failsWhen: CHANGED } } } });
  t.after(() => p.remove());
  return p.commit({ [FILE]: testFile(['a']), ...(yaml ? { 'ci/tests-can-fail.yaml': `entries:\n  - time-limit-seconds: ${yaml}\n` } : {}) });
};

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
