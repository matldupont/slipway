// What the tests-can-fail verdict says (dev/features/tests-can-fail.md §4, §5; D-016): each finding, warning and count
// line, in the project's words, with its next action. A finding and a warning are report.mjs's shape: one sentence
// that says what is wrong, and one fix that starts with a verb (scripts/report.test.mjs holds both to it). Every value
// from the record is a pull request's text and goes through `e` (report.mjs's field escape) once here; the record
// escapes `unreadable[].reason` and `lastUnread` itself, and escaping is idempotent (an escape is plain ASCII), so
// neither is changed twice.

import { codeSpan, escapeControl } from './report.mjs';

export const e = (v) => escapeControl(String(v ?? ''));
export const file = (f) => codeSpan(e(f));
export const named = (f, name) => (name == null ? file(f) : `${file(f)} › "${e(name)}"`);
const EXCUSE = 'or excuse the file in `ci/exceptions.yaml` with a date';
const AGAIN = 'run `pnpm tests-can-fail`';

// §3.6–§3.8's reasons a new test is not judged: the rule's own, and the ones the owner gave (§4).
export const RULE_CAUSED = ['no-subject', 'support-only', 'could-not-be-parsed', 'other-language', 'no-change-to-make', 'every-change-dropped'];
export const OWNER_GAVE = ['excused', 'kept-out', 'mechanical'];

// §5's not-judged line for each reason, and what to do about it.
const REASONS = {
  'no-subject': () => ['it imports no source file this step follows', `Write its import of the code under test as a relative path, ${EXCUSE}.`],
  'support-only': (d) => [`every source file it imports is test support (${file(d)})`, `Write an assertion on product code, not test support, ${EXCUSE}.`],
  'could-not-be-parsed': (d) => [`its subject ${file(d)} could not be parsed`, `Edit the subject so it parses, ${EXCUSE}.`],
  'other-language': (d) => [`its subject ${file(d)} is not JavaScript or TypeScript`, 'Add an excuse for the file in `ci/exceptions.yaml` with a date, since nothing here can change it.'],
  'no-change-to-make': (d) => [`there is nothing this step can change in ${file(d)}, which is all it imports`, `Write an assertion on code that does something, ${EXCUSE}.`],
  'every-change-dropped': (d) => [`every change this step made to ${d == null ? 'the code it imports' : file(d)} stopped the test file loading`, `Move what runs as the file loads into a function, ${EXCUSE}.`],
  'kept-out': (d) => [`it is kept out in \`ci/tests-can-fail.yaml\`: ${e(d)}`, 'Remove its `keep-out:` entry from `ci/tests-can-fail.yaml` once the file should be judged.'],
  'other-runner': (d, live) => [`its package ${codeSpan(e(d))} does not use Vitest`, live ? 'Remove it (`tests-can-fail#other-runner` in `ci/exceptions.yaml`) once the package moves to Vitest.' : 'Move the package to Vitest, or excuse its runner with `tests-can-fail#other-runner` in `ci/exceptions.yaml`.'],
  'no-package': () => ['it is in no package of the workspace', 'Rename or move it into a package of the workspace, so a run finds it.'],
  skipped: () => ['it is skipped', `Remove the skip, then ${AGAIN} so the test is judged.`],
  // §3.5: listed only when every name is let through, so a name filter in the package's call or config left it out.
  narrowed: () => ['the runner lists it only when every test name is let through', `Remove the name filter from the package's test script or Vitest config, then ${AGAIN}.`],
  mechanical: (d) => [`this pull request is excused as a mechanical change ${untilReason(d)}`, 'Remove it from `ci/exceptions.yaml` in the next pull request, as it counts only in this one.'],
  excused: (d) => [`excused ${untilReason(d)}`, 'Remove its entry from `ci/exceptions.yaml` once the test checks what the code does.'],
  // §3.8's notJudged flaky: red, then green, before any change. The tests state `flaky` (§3.9) is a finding, worded apart.
  flaky: () => ['it was red, then green, in a clean copy with nothing changed', `Keep it passing every time, then ${AGAIN}.`],
};
// The record's detail for an excuse is `{reason} (until {date})`: §5 reads "until {date}: {reason}".
function untilReason(detail) {
  const m = String(detail ?? '').match(/^([\s\S]*) \(until ([^()]*)\)$/);
  return m ? `until ${e(m[2])}: ${e(m[1])}` : `: ${e(detail)}`;
}

export function notJudged(n, live) {
  const make = REASONS[n.why] ?? (() => [`its reason, ${codeSpan(e(n.why))}, is not one this step names`, `Run \`pnpm tests-can-fail\` again, and report it if it says this again.`]);
  const [reason, fix] = make(n.detail, live);
  return { where: e(`${n.file}#not-judged/${n.why}${n.name == null ? '' : `/${n.name}`}`), detail: `Not judged: ${named(n.file, n.name)} — ${reason}.`, fix };
}

const at = (t, id) => e(`${t.file}:${t.line}#${id}`);
const subjects = (t) => (t.subjects?.length ? t.subjects.map(file).join(', ') : 'none named');

export const killsNothing = (t) => ({
  where: at(t, 'kills-nothing'),
  detail: `${named(t.file, t.name)} passed on all ${t.tried} changes made to the code it imports (${subjects(t)}).`,
  fix: `Write an assertion on what the code returns or does, then ${AGAIN}.`,
});

// A crash counts only inside an `expect(...)` of the test's own file (§3.9).
export const onlyCrashes = (t) => ({
  where: at(t, 'only-crashes'),
  detail: `${named(t.file, t.name)} only crashed, last a ${e(t.lastCrash?.type)} at ${codeSpan(`${e(t.lastCrash?.file)}:${e(t.lastCrash?.line)}`)}; a result read on the line before \`expect\` is no check.`,
  fix: 'Put the check inside an `expect(...)`, or excuse the file in `ci/exceptions.yaml` with a date.',
});

// §3.9's tests state: it failed on the untouched run after its changes. Chance is one cause; state a shared service
// kept from an earlier run of the file is the other (AR-4 of the 0.5 review).
export const flaky = (t) => ({
  where: at(t, 'flaky'),
  detail: `${named(t.file, t.name)} failed with nothing changed after passing in the same copy, by chance or on state a service kept from an earlier run.`,
  fix: `Keep it passing every time, from a clean start each run, then ${AGAIN}.`,
});

export const outOfTime = (t, limit) => ({
  where: at(t, 'out-of-time'),
  detail: `The check ran out of time (${Math.round((limit / 60) * 10) / 10} minutes) before ${named(t.file, t.name)}, so it is not judged and this is not a pass.`,
  fix: 'Run `pnpm tests-can-fail` again, and if it stops here every time read "Tests can fail" in `BOOTSTRAP.md`.',
});

// §7: the run reached its limit before it marked a test out-of-time (the install, ci/before-verify.sh or a listing):
// none was judged, and that is never a pass.
export const outOfTimeRun = (limit) => ({
  where: 'run#out-of-time',
  detail: `The check ran out of time (${Math.round((limit / 60) * 10) / 10} minutes) before it judged any new test, so this is not a pass.`,
  fix: 'Run `pnpm tests-can-fail` again, and if it stops here every time read "Tests can fail" in `BOOTSTRAP.md`.',
});

// A file the runner lists nothing in: no run picks it up, or every test in it is skipped or todo, which the listing
// does not tell apart (§3.5, the owner's call of 2026-11-04).
export const neverRun = (n, runs) => ({
  where: e(`${n.file}#never-run`),
  detail: `${file(n.file)} was changed, and no test run picks it up (${runs.length ? runs.map((r) => `${codeSpan(e(r.package))}: ${codeSpan(e(r.call))}`).join('; ') : 'no test call was read'}), or every test in it is skipped.`,
  fix: 'Rename or move it so a run finds it, remove the skip, or keep it out in `ci/tests-can-fail.yaml` with a reason.',
});

// A fixed length whatever the record holds, so it stays one sentence of at most 160 characters: each reason's next
// action is on its test's not-judged warning, which the verdict writes for every test in notJudged (AR-5 of the 0.3
// review, reworded on the owner's call of 2026-11-04).
export function nothingJudged(counted, total) {
  const k = Object.keys(counted).length;
  return {
    where: 'nothing-judged',
    detail: `None of the ${total} new or edited tests was judged, so this is not a pass, for ${k} ${k === 1 ? 'reason' : 'reasons'}: each test's not-judged warning says why and what to do.`,
    fix: 'Read each test\'s not-judged warning and do what it says, or excuse a test file in `ci/exceptions.yaml` with a date.',
  };
}

// AR-10: an entry that names no test file (`#mechanical`, `#other-runner`) gets its words too.
export function excuseExpired(entry, problem) {
  const id = String(entry.id);
  const what = id === 'tests-can-fail#mechanical' ? ' (the mechanical-change excuse)' : id === 'tests-can-fail#other-runner' ? ' (the excuse for a package off Vitest)' : '';
  const when = problem === 'expired' ? `expired ${e(entry.expires)}` : problem === 'none' ? 'has no `expires:` date' : `has an \`expires:\` that is not a real day (${e(entry.expires)})`;
  return {
    where: e(`ci/exceptions.yaml:${id}#excuse-expired`),
    detail: `${codeSpan(e(id))} in \`ci/exceptions.yaml\`${what} ${when}, so it excuses nothing.`,
    fix: 'Remove it, or set `expires:` to a real future day with a reason.',
  };
}

export const spentMechanical = () => ({
  where: 'ci/exceptions.yaml:tests-can-fail#mechanical#spent',
  detail: '`tests-can-fail#mechanical` in `ci/exceptions.yaml` counted only in the pull request that added it, and excuses nothing now.',
  fix: 'Remove it.',
});

export const unreadable = (u) => ({
  where: e(`${u.file}#unreadable`),
  detail: `${file(u.file)} could not be read as tests, so every test in it was treated as new: ${e(u.reason)}.`,
  fix: `Write each test as \`it(...)\` or \`test(...)\` from \`vitest\`, ${EXCUSE}.`,
});

export const overBudget = (seconds, budget) => ({
  where: 'run#over-budget',
  detail: `The check that new tests can fail took ${e(seconds)} seconds, over its budget of ${e(budget)}.`,
  fix: 'Run `pnpm tests-can-fail` again, and if it is slow every time read "Tests can fail" in `BOOTSTRAP.md`.',
});

// The count lines after the shares (§4), in the words of §3; each names what the record holds, escaped. They are
// notes, not findings, so the one-sentence shape does not bind them.
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
