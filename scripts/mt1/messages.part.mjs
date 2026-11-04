// scripts/mt1.test.mjs, part: what each message says (§5, D-016) — a file of the project, the test's name where it is
// about a test, one next action, no check id — and that no text of the record prints raw.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { leftMessage, redMessage, setupMessage } from '../../ci/checks/lib/mutation-calls.mjs';
import { nothingJudged } from '../../ci/checks/lib/mt1-messages.mjs';
import { rawCharacters } from '../../ci/checks/lib/raw-output.mjs';
import { entry, FILE, judge, messages, nj, rec, test as judged } from './records.mjs';

const MT1 = fileURLToPath(new URL('../../ci/checks/meta/mt1-tests-can-fail.mjs', import.meta.url));
const KNOWN_BAD = fileURLToPath(new URL('../../ci/fixtures/known-bad/mt1/', import.meta.url));
// §5's next actions, read whatever the case of their first letter, since one can start a sentence or follow "then".
const ACTIONS = ['Assert on', 'excuse', 'Rename or move', 'keep it out', 'Make it pass', 'Run `pnpm tests-can-fail`', 'Write the call', 'Remove it'];
const acts = (text) => ACTIONS.some((a) => text.toLowerCase().includes(a.toLowerCase()));
const REASONS = ['no-subject', 'support-only', 'could-not-be-parsed', 'other-language', 'no-change-to-make', 'every-change-dropped', 'kept-out', 'other-runner', 'no-package', 'skipped', 'mechanical', 'excused', 'flaky'];

// One record holding a test of every finding and every reason a test is not judged, and the registry entries that
// make the expiry findings and the spent warning.
const every = () => judge(rec({
  changedTestFiles: [FILE], seconds: 200,
  tests: [
    judged({ name: 'kills', tried: 4, failedOn: null }),
    judged({ name: 'crashes', tried: 4, failedOn: null, crashes: 2, lastCrash: { type: 'TypeError', file: 'pkgs/app/src/cart.ts', line: 2 } }),
    judged({ name: 'flaky', state: 'flaky' }),
    judged({ name: 'slow', tried: 0, failedOn: null, state: 'out-of-time' }),
  ],
  neverRun: [{ file: 'pkgs/app/src/never.test.ts' }],
  notJudged: REASONS.map((why) => nj(why, { detail: ['support-only', 'could-not-be-parsed', 'other-language', 'no-change-to-make', 'every-change-dropped'].includes(why) ? 'pkgs/app/src/subject.ts' : ['excused', 'mechanical', 'kept-out'].includes(why) ? 'a reason (until 2099-12-31)' : why === 'other-runner' ? 'legacy' : null })),
  unreadable: [{ file: FILE, reason: 'Unexpected token (3:4)' }],
}), { registry: [entry('tests-can-fail#mechanical'), entry('tests-can-fail#other-runner', '2026-01-01'), entry('tests-can-fail#pkgs/app/src/x.test.ts', 'never')] });

test('every finding, warning and exit 2 names a file of the project, the test where it is about one, a next action of §5, and no check id', () => {
  const v = every();
  const nothing = judge(rec({ changedTestFiles: [FILE], notJudged: [nj('no-subject')] }));
  const broken = [
    judge(rec({ head: '9'.repeat(40) })), judge(rec({ stopped: leftMessage(2) })), judge(rec({ changedTestFiles: [FILE], tests: [judged({ tried: 0, failedOn: null })] })),
    (() => { const r = rec(); delete r.capped; return judge(r); })(),
  ];
  const all = [...messages(v), ...messages(nothing), ...broken.flatMap(messages)];
  assert.ok(all.length >= 24, `${all.length} messages`);
  for (const text of all) {
    assert.ok(acts(text), `no next action: ${text}`);
    assert.doesNotMatch(text, /MT1/, text);
  }
  for (const f of [...v.findings, ...v.warnings, ...nothing.findings]) {
    assert.match(`${f.detail} ${f.fix}`, /`(?:pkgs\/app\/src\/[^`]+|ci\/exceptions\.yaml|ci\/tests-can-fail\.yaml|BOOTSTRAP\.md)`/, f.where);
    const t = [...v.findings, ...v.warnings].includes(f) && f.where.match(/^pkgs\/app\/src\/cart\.test\.ts:\d+#/);
    if (t) assert.match(f.detail, /› "/, `a message about a test names it: ${f.where}`);
  }
  for (const f of v.warnings.filter((w) => w.where.includes('#not-judged/'))) assert.match(f.detail, /› "/, f.where);
  // The run's own messages in these cases, which MT1 prints as its exit 2.
  const unit = { file: FILE };
  for (const text of [redMessage(unit, 'twice', { everyRed: false, connection: false }), redMessage(unit, 'twice', { everyRed: true, connection: false }), leftMessage(3), setupMessage('Error: listen EADDRINUSE :5432')]) {
    assert.ok(acts(text), `no next action: ${text}`);
    assert.doesNotMatch(text, /MT1/);
  }
});

test('the two flaky outcomes are told apart: a test red then green before any change, and one red on the untouched run after its changes', () => {
  const v = every();
  const finding = v.findings.find((f) => f.where.endsWith('#flaky'));
  const warning = v.warnings.find((w) => w.where.includes('#not-judged/flaky'));
  assert.match(finding.detail, /failed with nothing changed after passing in the same copy/);
  assert.match(warning.detail, /red, then green, in a clean copy with nothing changed\.$/);
  // AR-4 of the 0.5 review: chance is not the only cause it names.
  assert.match(finding.detail, /by chance or on state a service kept from an earlier run\./);
});

test('nothing-judged is one line of fixed length; each test it counts has its not-judged warning with its own next action, and only no-subject is told to import by a relative path', () => {
  const counts = REASONS.filter((w) => !['excused', 'kept-out', 'skipped', 'mechanical'].includes(w));
  const v = judge(rec({ changedTestFiles: [FILE], notJudged: counts.map((why, i) => nj(why, { name: `t${i}`, detail: 'pkgs/app/src/s.ts' })) }));
  const found = v.findings.find((f) => f.where === 'nothing-judged');
  assert.equal(found.detail, `None of the ${counts.length} new or edited tests was judged, so this is not a pass, for ${counts.length} reasons: each test's not-judged warning says why and what to do.`);
  assert.match(found.fix, /`ci\/exceptions\.yaml`/);
  // The line points to a warning for each test it counts: every reason that counts has one, and it gives an action.
  for (const [i, why] of counts.entries()) {
    const w = v.warnings.find((x) => x.where === `pkgs/app/src/${why}.test.ts#not-judged/${why}/t${i}`);
    assert.ok(w, `${why} has its not-judged warning`);
    assert.match(w.fix, /^[A-Z][a-z]+ /, `${why}'s warning gives its next action`);
  }
  assert.equal(v.warnings.filter((w) => /relative path/.test(w.fix)).length, 1);
  assert.match(v.warnings.find((w) => w.where.includes('/no-subject/')).fix, /relative path/);
  // A reason this step does not name still gets its warning, so the line never points at nothing.
  const odd = judge(rec({ changedTestFiles: [FILE], notJudged: [nj('not-a-reason')] }));
  assert.deepEqual([odd.ids, odd.warnings.length], [['nothing-judged'], 1]);
  // The worst case: the most tests and reasons a record could hold still fit in 160 characters, as does one reason.
  assert.ok(nothingJudged(Object.fromEntries(Array.from({ length: 999 }, (_, i) => [`r${i}`, 1])), 9999999).detail.length <= 160);
  assert.match(nothingJudged({ 'no-subject': 1 }, 1).detail, /for 1 reason:/);
  // The other-runner line names its entry (AR-4 of the 0.3 review).
  assert.match(judge(rec({ changedTestFiles: [FILE], notJudged: [nj('other-runner', { detail: 'legacy' })] })).warnings[0].fix, /`tests-can-fail#other-runner`/);
});

test('excuse-expired has its words for an entry that names a test file and for one that names none', () => {
  const v = judge(rec(), { registry: [entry('tests-can-fail#mechanical', '2026-01-01'), entry('tests-can-fail#other-runner', ''), entry(`tests-can-fail#${FILE}`, '2026-13-01')] });
  const [mechanical, other, file] = v.findings.map((f) => f.detail);
  assert.match(mechanical, /^`tests-can-fail#mechanical` in `ci\/exceptions\.yaml` \(the mechanical-change excuse\) expired 2026-01-01, so it excuses nothing\.$/);
  assert.match(other, /\(the excuse for a package off Vitest\) has no `expires:` date/);
  assert.match(file, /^`tests-can-fail#pkgs\/app\/src\/cart\.test\.ts` in `ci\/exceptions\.yaml` has an `expires:` that is not a real day \(2026-13-01\)/);
  assert.equal(v.exit, 1);
});

test('the only-crashes and kills-nothing details hold the test, its file and §5\'s wording; capped prints both counts beside kills-nothing', () => {
  const v = every();
  const crash = v.findings.find((f) => f.where.endsWith('#only-crashes'));
  // The crash's facts are in its detail; the way out, ci/exceptions.yaml among them, is its fix (report.mjs's shape).
  for (const part of ['`pkgs/app/src/cart.test.ts` › "crashes"', 'last a TypeError at `pkgs/app/src/cart.ts:2`', 'a result read on the line before']) assert.ok(crash.detail.includes(part), part);
  assert.match(crash.fix, /`ci\/exceptions\.yaml`/);
  assert.match(v.findings.find((f) => f.where.endsWith('#kills-nothing')).detail, /^`pkgs\/app\/src\/cart\.test\.ts` › "kills" passed on all 4 changes made to the code it imports \(`pkgs\/app\/src\/cart\.ts`\)\.$/);
  assert.match(v.findings.find((f) => f.where.endsWith('#never-run')).detail, /no test run picks it up \(`app`: `vitest run`\), or every test in it is skipped\.$/);
});

test('no text of the record prints raw: C0, C1 and bidi characters in every field are escaped once, and the record\'s own escapes are not escaped again', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mt1-raw-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bad = (s) => `${s}\u001b[31m\u0085‮⁦\u0007`;
  const f = bad('pkgs/app/src/a.test.ts');
  const r = rec({
    changedTestFiles: [f], runs: [{ package: bad('app'), call: bad('vitest run'), version: '5.0.3' }],
    tests: [judged({ file: f, name: bad('n'), tried: 2, failedOn: null, subjects: [bad('s.ts')] }), judged({ file: f, name: bad('c'), tried: 2, failedOn: null, crashes: 1, lastCrash: { type: bad('TypeError'), file: bad('x.ts'), line: bad('3') } })],
    neverRun: [{ file: f }], notJudged: REASONS.map((why) => ({ file: f, name: bad(why), why, detail: bad('d') })),
    unreadable: [{ file: f, reason: 'already \\u001b escaped' }], capped: [{ file: f, untriedBody: 1, untriedOther: 2 }],
    notTests: [{ file: f }], outsideAnyTest: [{ file: f }], support: [{ file: f }], noChange: [{ file: f }],
  });
  // The verdict escapes each string itself, before report() does it again: none of its text holds one raw.
  const v = judge(r, { head: null, registry: [entry('tests-can-fail#mechanical', '2026-01-01')] });
  assert.equal(rawCharacters([...messages(v), ...v.findings.map((f) => f.where), v.summary, ...v.notes].join('\n')), null);
  writeFileSync(join(dir, 'run.json'), JSON.stringify(r));
  mkdirSync(join(dir, 'ci'));
  writeFileSync(join(dir, 'ci', 'exceptions.yaml'), 'exceptions:\n  - id: tests-can-fail#mechanical\n    reason: r\n    owner: o\n    expires: 2026-01-01\n');
  const out = spawnSync(process.execPath, [MT1, dir], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1', CHECK_TODAY: '2026-11-04' } });
  assert.equal(out.status, 1, out.stdout + out.stderr);
  assert.equal(rawCharacters(out.stdout, out.stderr), null);
  assert.ok(out.stdout.includes('already \\u001b escaped'), 'the record\'s escape is printed as it is');
  const printed = out.stdout.split('\n').filter((l) => !l.startsWith('@@json ')).join('\n');
  assert.ok(!printed.includes('\\\\u001b'), 'and never escaped twice');
  assert.match(out.stdout, /^MT1: .*\\u001b\[31m/m, 'a note line is escaped too');
  JSON.parse(out.stdout.split('\n').findLast((l) => l.startsWith('@@json ')).slice('@@json '.length));
});

test('each known-bad fixture of MT1 is one PC1 runs, and every reason a record can give has its wording', () => {
  assert.deepEqual(readdirSync(KNOWN_BAD).sort(), ['findings', 'lacks-field', 'no-record', 'not-json', 'nothing-judged', 'other-head', 'out-of-time-early', 'stopped', 'tried-zero']);
  const judge = readFileSync(fileURLToPath(new URL('../../ci/checks/lib/mutation-judge.mjs', import.meta.url)), 'utf8') + readFileSync(fileURLToPath(new URL('../../ci/mutation.mjs', import.meta.url)), 'utf8') + readFileSync(fileURLToPath(new URL('../../ci/checks/lib/mutation-tests.mjs', import.meta.url)), 'utf8');
  const given = new Set([...judge.matchAll(/why: '([a-z-]+)'/g), ...judge.matchAll(/notJudged\([^,]+, '([a-z-]+)'/g), ...judge.matchAll(/'(other-runner|kept-out|excused|no-package|mechanical|skipped|flaky|no-subject|support-only|could-not-be-parsed|other-language|no-change-to-make|every-change-dropped)'/g)].map((x) => x[1]));
  for (const why of given) assert.ok(REASONS.includes(why), `the run gives ${why}, which this test does not word`);
  for (const w of every().warnings.filter((x) => x.where.includes('#not-judged/'))) assert.doesNotMatch(w.detail, /is not one this step names/, w.where);
});
