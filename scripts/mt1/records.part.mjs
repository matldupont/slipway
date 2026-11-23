// scripts/mt1.test.mjs, part: the verdict on records it must pass (§4), the head it holds a record to, nothing-judged
// and what never makes it, the two shares, and the record's faults that are exit 2.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { headOf } from '../../ci/checks/meta/mt1-tests-can-fail.mjs';
import { emptyRecord } from '../../ci/mutation.mjs';
import { entry, FILE, judge, nj, rec, test as judged } from './records.mjs';

test('every new test failing on a change, beside an unjudged test and seconds over the budget, passes with its counts and the two warnings', () => {
  const v = judge(rec({ changedTestFiles: [FILE, 'pkgs/app/src/no-subject.test.ts'], seconds: 150, tests: [judged(), judged({ name: 'totals', line: 9 })], notJudged: [nj('no-subject')] }));
  assert.equal(v.exit, 0, JSON.stringify(v.findings));
  assert.equal(v.summary, '3 new tests: 2 passed, 0 failed, 1 not judged.');
  assert.deepEqual(v.warned, ['pkgs/app/src/no-subject.test.ts#not-judged/no-subject/no-subject', 'run#over-budget']);
  assert.match(v.warnings[1].detail, /took 150 seconds, over its budget of 120/);
});

test('a record with no changed test file passes with "No tests were added or changed.", and counts the test files removed', () => {
  const none = judge(rec());
  assert.deepEqual([none.exit, none.summary, none.notes], [0, 'No tests were added or changed.', []]);
  const removed = judge(rec({ removedTestFiles: 1 }));
  assert.deepEqual([removed.exit, removed.summary, removed.notes], [0, 'No tests were added or changed.', ['1 test files were removed or renamed away.']]);
});

test('in a temporary git repository, a record whose head is its HEAD is accepted and any other is exit 2', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mt1-head-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
  git('init', '-q', '-b', 'main');
  git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'one');
  const head = headOf(dir);
  assert.match(head, /^[0-9a-f]{40}$/);
  assert.equal(judge(rec({ head }), { head }).exit, 0);
  const other = judge(rec({ head: '9'.repeat(40) }), { head });
  assert.equal(other.exit, 2);
  assert.equal(other.broken, `This record is for commit ${'9'.repeat(40)}, not the one being checked (${head}). Run \`pnpm tests-can-fail\` again.`);
  // The folder form with no CHECK_HEAD holds the record to no commit.
  assert.equal(judge(rec({ head: '9'.repeat(40) }), { head: null }).exit, 0);
});

test('a changed test file that is a symlink is a finding of its own, with a way out that fits it (#684)', () => {
  const v = judge(rec({ changedTestFiles: [FILE], tests: [judged()], unreadable: [{ file: FILE, reason: 'a symlink or a submodule, which this step does not read', test: true, link: true }] }));
  assert.deepEqual([v.exit, v.ids, v.warned], [1, [`${FILE}#unreadable`], []]);
  assert.match(v.findings[0].detail, /is a symlink or a submodule, so this step cannot read the tests in it\.$/);
  assert.match(v.findings[0].fix, /^Save it as a regular file, or excuse the file in `ci\/exceptions\.yaml` with a date\.$/);
});

test('a file a test imports that cannot be read stays a warning, and offers no excuse that would do nothing (#684)', () => {
  const v = judge(rec({ changedTestFiles: [FILE], tests: [judged()], unreadable: [{ file: 'pkgs/app/src/data.json', reason: 'not JavaScript or TypeScript' }] }));
  assert.deepEqual([v.exit, v.ids], [0, []]);
  assert.equal(v.warnings[0].fix, 'Rename or move the code under test into a file this step can read.');
});

test('the whitespace line counts only files with a test judged: a file excused as mechanical is not said to be judged (D-057)', () => {
  const line = (r) => judge(r).notes.find((n) => n.includes('changed only in whitespace'));
  assert.equal(line(rec({ changedTestFiles: [FILE], whitespaceOnly: [{ file: FILE }], mechanical: true, notJudged: [nj('mechanical', { file: FILE, detail: 'a reformat (until 2099-12-31)' })] })), undefined);
  assert.match(line(rec({ changedTestFiles: [FILE], whitespaceOnly: [{ file: FILE }], tests: [judged()] })), /^1 test files changed only in whitespace, and their tests were judged/);
  assert.equal(line(rec({ changedTestFiles: [FILE], whitespaceOnly: [{ file: FILE }], tests: [judged({ state: 'out-of-time' })] })), undefined);
});

test('a record from a step before D-057, which holds outsideAnyTest and no whitespaceOnly, is exit 2 and names the version mismatch', () => {
  const old = rec({ outsideAnyTest: [{ file: FILE }] });
  delete old.whitespaceOnly;
  const v = judge(old);
  assert.equal(v.exit, 2);
  assert.match(v.broken, /lacks `whitespaceOnly`.*different slipway versions/);
});

test('a record that stopped, lacks a field, or judges a test with nothing tried is exit 2 with its own message', () => {
  assert.deepEqual([judge(rec({ stopped: 'The run was stopped by SIGINT.' })).exit, judge(rec({ stopped: 'The run was stopped by SIGINT.' })).broken], [2, 'The run was stopped by SIGINT.']);
  for (const field of Object.keys(emptyRecord(0))) {
    const r = rec();
    delete r[field];
    assert.equal(judge(r).exit, 2, field);
    assert.match(judge(r).broken, new RegExp(`lacks \`${field}\``), field);
  }
  assert.match(judge(rec({ tests: 'none' })).broken, /lacks `tests`/, 'a list that is not a list');
  const empty = judge(rec({ changedTestFiles: [FILE], tests: [judged({ tried: 0, failedOn: null })] }));
  assert.equal(empty.exit, 2);
});

test('a run stopped at its limit before any test was marked out-of-time is a finding, never a pass', () => {
  const v = judge(rec({ changedTestFiles: [FILE], outOfTime: true }));
  assert.deepEqual([v.exit, v.ids], [1, ['run#out-of-time']]);
  assert.match(v.findings[0].detail, /ran out of time \(10 minutes\) before it judged any new test, so this is not a pass/);
  // One marked out-of-time is named by its own finding, not twice.
  const marked = judge(rec({ changedTestFiles: [FILE], outOfTime: true, tests: [judged({ tried: 0, failedOn: null, state: 'out-of-time' })] }));
  assert.deepEqual(marked.ids, [`${FILE}:3#out-of-time`]);
});

test('none judged for a reason the owner did not give is nothing-judged; one judged beside them is not', () => {
  const three = [nj('no-subject', { name: 'a' }), nj('no-subject', { name: 'b' }), nj('support-only', { detail: 'pkgs/app/src/__tests__/make.ts' })];
  assert.deepEqual(judge(rec({ changedTestFiles: [FILE], notJudged: three })).ids, ['nothing-judged']);
  const beside = judge(rec({ changedTestFiles: [FILE], notJudged: three, tests: [judged()] }));
  assert.deepEqual([beside.exit, beside.ids, beside.warned.length], [0, [], 3]);
  // A test flaky in the copy, or narrowed, is its own finding, alone or beside a judged test, and is not counted twice.
  for (const why of ['flaky', 'narrowed']) {
    const n = nj(why, { name: 'x' });
    assert.deepEqual(judge(rec({ changedTestFiles: [FILE], notJudged: [n] })).ids, [`${n.file}#left-out/x`], why);
    const v = judge(rec({ changedTestFiles: [FILE], notJudged: [n], tests: [judged()] }));
    assert.deepEqual([v.exit, v.ids, v.warned], [1, [`${n.file}#left-out/x`], []], why);
  }
});

test('new tests all excused, kept out, skipped or mechanical pass, each named; all other-runner passes beside an unexpired entry and fails without it', () => {
  const given = ['excused', 'kept-out', 'skipped', 'mechanical'].map((why) => nj(why, { detail: why === 'skipped' ? null : 'a reason (until 2099-12-31)' }));
  const v = judge(rec({ changedTestFiles: [FILE], notJudged: given, mechanical: true }), { registry: [entry('tests-can-fail#mechanical')] });
  assert.equal(v.exit, 0, JSON.stringify(v.findings));
  assert.deepEqual(v.warned, given.map((n) => `${n.file}#not-judged/${n.why}/${n.name}`));
  const other = rec({ changedTestFiles: [FILE], notJudged: [nj('other-runner', { detail: 'legacy' })] });
  assert.equal(judge(other, { registry: [entry('tests-can-fail#other-runner')] }).exit, 0);
  assert.deepEqual(judge(other).ids, ['nothing-judged']);
  assert.deepEqual(judge(other, { registry: [entry('tests-can-fail#other-runner', '2026-01-01')] }).ids, ['ci/exceptions.yaml:tests-can-fail#other-runner#excuse-expired', 'nothing-judged']);
});

test('a test the runner leaves out with no skip in its text is a left-out finding, alone or beside a judged test (#652, D-057)', () => {
  const narrowed = nj('narrowed', { name: 'adds', detail: 'the run skips it, and its call holds no skip' });
  const id = `${narrowed.file}#left-out/adds`;
  const alone = judge(rec({ changedTestFiles: [FILE], notJudged: [narrowed] }));
  assert.deepEqual([alone.exit, alone.ids, alone.warned], [1, [id], []]);
  assert.match(alone.findings[0].detail, /is left out: the run skips it; its call has no skip\.$/);
  assert.equal(alone.findings[0].fix, 'Set the env value it needs, remove the filter, `.only` or hook skipping it, keep out in `ci/tests-can-fail.yaml`, or add a dated excuse to `ci/exceptions.yaml`.');
  const unread = judge(rec({ changedTestFiles: [FILE], notJudged: [{ ...narrowed, detail: 'the run skips it, in a call this step cannot read for a skip' }] }));
  assert.match(unread.findings[0].detail, /is left out: the run skips it; the step cannot read its call\.$/);
  // The report prints the detail and the fix on lines of their own: past the file and the test, each is 160 at most.
  for (const f of [alone.findings[0], unread.findings[0]]) assert.ok(f.detail.replace(`\`${narrowed.file}\` › "adds"`, '').length <= 160 && f.fix.length <= 160, f.detail);
  const beside = judge(rec({ changedTestFiles: [FILE], tests: [judged()], notJudged: [narrowed] }));
  assert.deepEqual([beside.exit, beside.ids], [1, [id]]);
  const unsure = nj('narrowed', { name: null, detail: 'this step cannot tell whether the runner ran a test in the call at line 4, since a tagged template in the file moves where the runner says a test is' });
  const only = judge(rec({ changedTestFiles: [FILE], notJudged: [unsure] }));
  assert.deepEqual([only.exit, only.ids, only.warned], [1, ['nothing-judged'], [`${unsure.file}#not-judged/narrowed`]]);
  assert.match(only.findings[0].fix, /^Read each new test's not-judged warning and do what it says, so it runs or is skipped by its own call/);
  const mixed = judge(rec({ changedTestFiles: [FILE], notJudged: [unsure, nj('no-subject')] }));
  assert.match(mixed.findings[0].fix, /^Read each not-judged warning and do what it says, so each new test runs or is skipped by its own call, or excuse/);
  for (const f of [only.findings[0], mixed.findings[0]]) assert.ok(f.fix.length <= 160, f.fix);
  assert.equal(judge(rec({ changedTestFiles: [FILE], tests: [judged()], notJudged: [unsure] })).exit, 0);
  assert.deepEqual(judge(rec({ changedTestFiles: [FILE], notJudged: [nj('skipped')] })).exit, 0);
});

test('a test every change of which stopped its file loading is named beside a judged test, and is nothing-judged alone, never a fault in the record', () => {
  const dropped = nj('every-change-dropped', { detail: 'pkgs/app/src/cart.ts' });
  const beside = judge(rec({ changedTestFiles: [FILE], tests: [judged()], notJudged: [dropped] }));
  assert.deepEqual([beside.exit, beside.broken, beside.warned], [0, null, [`${dropped.file}#not-judged/every-change-dropped/every-change-dropped`]]);
  assert.match(beside.warnings[0].detail, /every change this step made to `pkgs\/app\/src\/cart\.ts` stopped the test file loading/);
  const alone = judge(rec({ changedTestFiles: [FILE], notJudged: [dropped] }));
  assert.deepEqual([alone.exit, alone.ids], [1, ['nothing-judged']]);
  for (const v of [beside, alone]) assert.ok(!JSON.stringify(v).includes('the run and its verdict disagree'));
});

test('the summary prints both shares, 2 of 8 rule-caused and 4 of 8 in all (its 1 flaky is notJudged\'s), and both at 0 with none unjudged', () => {
  const tests = [judged(), judged({ name: 'b' }), judged({ name: 'c' }), judged({ name: 'd' })];
  const v = judge(rec({ changedTestFiles: [FILE], tests, notJudged: [nj('no-subject', { name: 'x' }), nj('no-subject', { name: 'y' }), nj('skipped'), nj('flaky')] }));
  assert.equal(v.summary, '8 new tests: 4 passed, 0 failed, 4 not judged.');
  assert.deepEqual(v.notes, ['Not judged for a reason this step causes: 2 of 8. Not judged for any reason: 4 of 8.']);
  assert.deepEqual(judge(rec({ changedTestFiles: [FILE], tests })).notes, ['Not judged for a reason this step causes: 0 of 4. Not judged for any reason: 0 of 4.']);
});

test('the findings of §4\'s table, the spent mechanical entry, and the count lines with the names the record holds', () => {
  const v = judge(rec({
    changedTestFiles: [FILE], tests: [judged({ tried: 3, failedOn: null }), judged({ name: 'c', tried: 3, failedOn: null, crashes: 1, lastCrash: { type: 'TypeError', file: FILE, line: 12 } })],
    capped: [{ file: FILE, untriedBody: 10, untriedOther: 5 }], notTests: [{ file: 'pkgs/app/src/__tests__/h.ts' }], whitespaceOnly: [{ file: FILE }], support: [{ file: 'pkgs/app/src/factories.ts' }], uncommitted: 2,
  }), { registry: [entry('tests-can-fail#mechanical')] });
  assert.deepEqual(v.ids, [`${FILE}:3#kills-nothing`, `${FILE}:3#only-crashes`]);
  assert.deepEqual(v.warned, ['ci/exceptions.yaml:tests-can-fail#mechanical#spent']);
  assert.deepEqual(v.notes.slice(1), [
    '`pkgs/app/src/cart.test.ts` stopped at the cap of 30 changes: 10 body changes and 5 others were not tried, so it is not fully checked.',
    '1 changed files under a test name or folder are not tests: `pkgs/app/src/__tests__/h.ts`.',
    '1 test files changed only in whitespace, and their tests were judged: `pkgs/app/src/cart.test.ts`.',
    '1 test support files were left out of the code under test: `pkgs/app/src/factories.ts`.',
    '2 tracked files have changes not committed, and were not judged: this step judges the last commit.',
  ]);
});
