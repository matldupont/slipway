// What the tests-can-fail verdict says (dev/features/tests-can-fail.md §4, §5; D-016): each finding, warning and count
// line, in the project's words, with its next action. Every value from the record is a pull request's text and goes
// through `e` (report.mjs's field escape) once here; the record escapes `unreadable[].reason` and `lastUnread` itself,
// and escaping is idempotent (an escape is plain ASCII), so neither is changed twice.

import { codeSpan, escapeControl } from './report.mjs';

export const e = (v) => escapeControl(String(v ?? ''));
export const file = (f) => codeSpan(e(f));
export const named = (f, name) => (name == null ? file(f) : `${file(f)} › "${e(name)}"`);
const AGAIN = 'then run `pnpm tests-can-fail`.';
const excuseId = (f) => codeSpan(`tests-can-fail#${e(f)}`);

// §3.6–§3.8's reasons a new test is not judged: the rule's own, and the ones the owner gave (§4).
export const RULE_CAUSED = ['no-subject', 'support-only', 'could-not-be-parsed', 'other-language', 'no-change-to-make', 'every-change-dropped'];
export const OWNER_GAVE = ['excused', 'kept-out', 'mechanical'];

// The wording of §5's not-judged line for each reason, and what to do about it.
const REASONS = {
  'no-subject': () => ['it imports no source file this step follows', (f) => `Import the code under test by a relative path, which this step follows, or excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(f)}); ${AGAIN}`],
  'support-only': (d) => [`every source file it imports is test support (${file(d)})`, (f) => `Assert on product code rather than test support, or excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(f)}); ${AGAIN}`],
  'could-not-be-parsed': (d) => [`its subject ${file(d)} could not be parsed`, (f) => `Make it parse as JavaScript or TypeScript, or excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(f)}); ${AGAIN}`],
  'other-language': (d) => [`its subject ${file(d)} is not JavaScript or TypeScript`, (f) => `Nothing here can change it: excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(f)}), so the next run counts it as yours.`],
  'no-change-to-make': (d) => [`there is nothing this step can change in ${file(d)}, which is all it imports`, (f) => `Assert on code that does something, or excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(f)}); ${AGAIN}`],
  'every-change-dropped': (d) => [`every change this step made to ${d == null ? 'the code it imports' : file(d)} stopped the test file loading`, (f) => `Write the code so a change to it leaves ${file(f)} loading (a value read when the file loads cannot be changed), or excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(f)}); ${AGAIN}`],
  'kept-out': (d) => [`it is kept out in \`ci/tests-can-fail.yaml\`: ${e(d)}`, () => 'Remove it from `ci/tests-can-fail.yaml` (`keep-out:`) once the file should be judged.'],
  'other-runner': (d, live) => [`its package ${codeSpan(e(d))} does not use Vitest${live ? ', and `tests-can-fail#other-runner` in `ci/exceptions.yaml` says so on purpose' : ''}`, () => (live ? 'Remove it (`tests-can-fail#other-runner`) once the package moves to Vitest.' : 'Move the package to Vitest, or excuse its runner with `tests-can-fail#other-runner` in `ci/exceptions.yaml`, with a date; then run `pnpm tests-can-fail`.')],
  'no-package': () => ['it is in no package of the workspace', () => 'Rename or move it into a package of the workspace, so a run finds it.'],
  skipped: () => ['it is skipped', () => 'Run `pnpm tests-can-fail` again once the skip is removed, so the test is judged.'],
  mechanical: (d) => [`this pull request is excused as a mechanical change ${untilReason(d)}`, () => 'Remove it (`tests-can-fail#mechanical` in `ci/exceptions.yaml`) in the next pull request: it counts only in this one.'],
  excused: (d) => [`excused ${untilReason(d)}`, (f) => `Remove it (id ${excuseId(f)} in \`ci/exceptions.yaml\`) once the test asserts on what the code does.`],
  // §3.8's notJudged flaky: red, then green, before any change. The tests state `flaky` (§3.9) is a finding, worded apart.
  flaky: () => ['it was red, then green, in a clean copy with nothing changed: it is flaky, so this step cannot tell what it notices', () => 'Make it pass every time, then run `pnpm tests-can-fail`.'],
};
// The record's detail for an excuse is `{reason} (until {date})`: §5 reads "until {date}: {reason}".
function untilReason(detail) {
  const m = String(detail ?? '').match(/^([\s\S]*) \(until ([^()]*)\)$/);
  return m ? `until ${e(m[2])}: ${e(m[1])}` : `: ${e(detail)}`;
}

export function notJudged(n, live) {
  const make = REASONS[n.why] ?? (() => [`its reason, ${codeSpan(e(n.why))}, is not one this step names`, () => 'Run `pnpm tests-can-fail` again; if it says this again, the run and its verdict disagree.']);
  const [reason, fix] = make(n.detail, live);
  return { where: `${n.file}#not-judged/${n.why}${n.name == null ? '' : `/${n.name}`}`, detail: `Not judged: ${named(n.file, n.name)} — ${reason}.`, fix: fix(n.file) };
}

const at = (t, id) => `${t.file}:${t.line}#${id}`;
const subjects = (t) => (t.subjects?.length ? t.subjects.map(file).join(', ') : 'none named');

export const killsNothing = (t) => ({
  where: at(t, 'kills-nothing'),
  detail: `${named(t.file, t.name)} passes whatever the code does: ${t.tried} changes were made to the code its file imports (${subjects(t)}), and it failed on none of them.`,
  fix: 'Assert on what the code returns or does, then run `pnpm tests-can-fail`.',
});

export const onlyCrashes = (t) => ({
  where: at(t, 'only-crashes'),
  detail: `${named(t.file, t.name)} only ever failed by crashing: ${t.tried} changes were made to the code its file imports, and its only failures were crashes, the last a ${e(t.lastCrash?.type)} at ${codeSpan(`${e(t.lastCrash?.file)}:${e(t.lastCrash?.line)}`)}. A crash shows the code broke, not that the test checks anything. It counts only on a line inside an \`expect(...)\` of the test's own file: a result read on the line before the \`expect\` does not.`,
  fix: `Either assert on what the code returns or does, or excuse the test in \`ci/exceptions.yaml\` with a date (id ${excuseId(t.file)}). Then run \`pnpm tests-can-fail\`.`,
});

// §3.9's tests state: it failed on the untouched run after its changes. Chance is one cause; state a shared service
// kept from an earlier run of the file is the other (AR-4 of the 0.5 review).
export const flaky = (t) => ({
  where: at(t, 'flaky'),
  detail: `${named(t.file, t.name)} failed with nothing changed, after passing once in the same copy: by chance, or on state a service kept from an earlier run of its file. A test that fails that way cannot show it notices a change.`,
  fix: 'Make it pass every time, from a clean start each run, then run `pnpm tests-can-fail`.',
});

export const outOfTime = (t, limit) => ({
  where: at(t, 'out-of-time'),
  detail: `The check that new tests can fail ran out of time (${Math.round((limit / 60) * 10) / 10} minutes) before it reached ${named(t.file, t.name)}. It was not judged, so this is not a pass.`,
  fix: 'Run `pnpm tests-can-fail` again; if it stops here every time, the pull request\'s tests are too slow for the step: see `BOOTSTRAP.md`, "Tests can fail".',
});

// A file the runner lists nothing in: no run picks it up, or every test in it is skipped or todo, which the listing
// does not tell apart (§3.5, the owner's call of 2026-11-04).
export const neverRun = (n, runs) => ({
  where: `${n.file}#never-run`,
  detail: `${file(n.file)} was added or changed, and none of this project's test runs picks it up (${runs.length ? runs.map((r) => `${codeSpan(e(r.package))}: ${codeSpan(e(r.call))}`).join('; ') : 'no test call was read'}), or every test in it is skipped. A test nothing runs is not coverage.`,
  fix: 'Rename or move it so a run finds it, remove the skip when every test in it is skipped, or keep it out on purpose in `ci/tests-can-fail.yaml` (`keep-out:`, with a reason).',
});

// AR-5 of the 0.3 review: each reason gets its own next action; only no-subject is told to import by a relative path.
const NEXT = {
  'no-subject': 'import the code under test by a relative path, which this step follows',
  'support-only': 'assert on product code rather than test support',
  'could-not-be-parsed': 'make the subject parse',
  'other-language': 'excuse the file',
  'no-change-to-make': 'assert on code that does something',
  'every-change-dropped': 'write the code so a change to it leaves the test file loading',
  'other-runner': 'move the package to Vitest, or excuse its runner with `tests-can-fail#other-runner`',
  'no-package': 'move the file into a package of the workspace',
  flaky: 'make it pass every time',
};
export function nothingJudged(counted, total, first) {
  const reasons = Object.entries(counted).map(([why, n]) => `${n} ${codeSpan(e(why))} (${NEXT[why] ?? 'see its line above'})`).join(', ');
  return {
    where: 'nothing-judged',
    detail: `None of the ${total} tests this pull request adds or edits was judged, so this is not a pass: ${reasons}. Each is named above.`,
    fix: `Do what each reason says, or excuse a test file in \`ci/exceptions.yaml\` with a date (id ${excuseId(first)}, for the first of them). Then run \`pnpm tests-can-fail\`.`,
  };
}

// AR-10: an entry that names no test file (`#mechanical`, `#other-runner`) gets its words too.
export function excuseExpired(entry, problem) {
  const id = String(entry.id);
  const what = id === 'tests-can-fail#mechanical' ? 'the mechanical-change excuse' : id === 'tests-can-fail#other-runner' ? 'the excuse for a package that does not use Vitest' : `the excuse for ${file(id.slice('tests-can-fail#'.length))}`;
  const when = problem === 'expired' ? `expired ${e(entry.expires)}` : problem === 'none' ? 'has no `expires:` date' : `has an \`expires:\` that is not a real day (${e(entry.expires)})`;
  return {
    where: `ci/exceptions.yaml:${id}#excuse-expired`,
    detail: `${codeSpan(e(id))} in \`ci/exceptions.yaml\`, ${what}, ${when}, so it excuses nothing.`,
    fix: 'Remove it, or set `expires:` to a real future day with a reason, then run `pnpm tests-can-fail`.',
  };
}

export const spentMechanical = () => ({
  where: 'ci/exceptions.yaml:tests-can-fail#mechanical#spent',
  detail: '`tests-can-fail#mechanical` in `ci/exceptions.yaml` counted only in the pull request that added it, and excuses nothing now.',
  fix: 'Remove it.',
});

export const unreadable = (u) => ({
  where: `${u.file}#unreadable`,
  detail: `${file(u.file)} could not be read as tests, so every test in it was treated as new: ${e(u.reason)}.`,
  fix: `Write the call as \`it(...)\` or \`test(...)\` from \`vitest\`, or excuse the file in \`ci/exceptions.yaml\` with a date (id ${excuseId(u.file)}).`,
});

export const overBudget = (seconds, budget) => ({
  where: 'run#over-budget',
  detail: `The check that new tests can fail took ${e(seconds)} seconds, over its budget of ${e(budget)}.`,
  fix: 'Run `pnpm tests-can-fail` again; if it is slow every time, the pull request\'s tests are too slow for the step: see `BOOTSTRAP.md`, "Tests can fail".',
});

// The count lines after the shares (§4), in the words of §3; each names what the record holds, escaped.
export function countLines(r) {
  const names = (list) => list.map((x) => file(x.file)).join(', ');
  const lines = [];
  for (const c of r.capped) lines.push(`${file(c.file)} stopped at the cap of 30 changes: ${e(c.untriedBody)} body changes and ${e(c.untriedOther)} others were not tried, so it is not fully checked.`);
  if (r.removedTestFiles) lines.push(`${e(r.removedTestFiles)} test files were removed or renamed away.`);
  if (r.notTests.length) lines.push(`${r.notTests.length} changed files under a test name or folder are not tests: ${names(r.notTests)}.`);
  if (r.outsideAnyTest.length) lines.push(`${r.outsideAnyTest.length} test files changed outside any test: ${names(r.outsideAnyTest)}.`);
  if (r.support.length) lines.push(`${r.support.length} test support files were left out of the code under test: ${names(r.support)}.`);
  if (r.uncommitted) lines.push(`${e(r.uncommitted)} tracked files have changes not committed, and were not judged: this step judges the last commit.`);
  return lines;
}
