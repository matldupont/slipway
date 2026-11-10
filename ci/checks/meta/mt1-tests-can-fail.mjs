#!/usr/bin/env node
// MT1 — the tests-can-fail verdict (dev/features/tests-can-fail.md §1, §4, §5; D-037).
//
// A pull request's new tests must each fail on a change to the code they import. ci/mutation.mjs makes the changes and
// returns a record of what happened; MT1 reads that record and gives the verdict.
//
//   node ci/checks/meta/mt1-tests-can-fail.mjs --run      runs the step on HEAD and judges its record in this process
//                                                         (`pnpm tests-can-fail`, which /work-ticket runs); the record
//                                                         is never a file and never crosses a pipe
//   node ci/checks/meta/mt1-tests-can-fail.mjs <folder>   judges <folder>/run.json, a recorded run: PC1's fixtures under
//                                                         ci/fixtures/known-bad/mt1/, and the `meta` script's
//                                                         ci/fixtures/mt1-green. CHECK_HEAD pins the commit it is for;
//                                                         without it the record is not held to one
//
// The registry is ci/exceptions.yaml as HEAD holds it (the folder's own, for a fixture): MT1 judges every
// `tests-can-fail#` entry's date (FO1 leaves them here) and reads `#other-runner` and `#mechanical` from it.
//
// The summary, the two shares and the count lines print as `MT1: ` notes before the report; the findings and warnings
// are report()'s. scripts/mt1.test.mjs holds what MT1 must not report, which PC1 cannot (it fails a case that passes).

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { today as clockToday } from '../lib/clock.mjs';
import { expiryProblem, loadRegistry, TESTS_CAN_FAIL_PREFIX as PREFIX } from '../lib/exceptions.mjs';
import { trustedGit } from '../lib/manifest.mjs';
import * as m from '../lib/mt1-messages.mjs';
import { escapeControl, escapeOutput, report } from '../lib/report.mjs';
import { showFile } from '../lib/mutation-git.mjs';
import { emptyRecord, registryOf, runMutation } from '../../mutation.mjs';

const ID = 'MT1';
// Every field the run returns (§3.10): a record without one is not a record this verdict can read.
export const FIELDS = Object.keys(emptyRecord(0));
const LISTS = FIELDS.filter((k) => Array.isArray(emptyRecord(0)[k]));

const share = (n, of) => `${n} of ${of}`;

/**
 * The verdict on one record, with nothing printed: what MT1 reports, and what scripts/mt1.test.mjs reads.
 * @param {object} record  ci/mutation.mjs's record (§3.10)
 * @param {{ registry?: object[], today: string, head?: string | null }} o
 * @returns {{ broken: string | null, findings: object[], warnings: object[], summary: string, notes: string[], after: string[] }}
 */
export function verdict(record, { registry = [], today, head = null }) {
  const out = { broken: null, findings: [], warnings: [], summary: '', notes: [], after: [] };
  const missing = FIELDS.filter((k) => !(record && typeof record === 'object' && k in record) || (LISTS.includes(k) && !Array.isArray(record[k])));
  if (missing.length) return { ...out, broken: `The record of the run lacks ${missing.map((k) => `\`${k}\``).join(', ')}, so it cannot be judged. Run \`pnpm tests-can-fail\` again; if it says this again, the step and this check are from different slipway versions: take \`ci/\` from one version with \`/sync-slipway\`.` };
  // A stop that quotes output (ci/before-verify.sh's lines) holds a line break: the report's BROKEN line is one line, so
  // the sentence is that line and the output is printed below it, each line escaped (#659).
  if (record.stopped) {
    const [first, ...rest] = String(record.stopped).split('\n');
    return { ...out, broken: m.e(first), after: rest };
  }
  if (head !== null && record.head !== head) return { ...out, broken: `This record is for commit ${m.e(record.head)}, not the one being checked (${m.e(head)}). Run \`pnpm tests-can-fail\` again.` };
  // §4: a test with nothing tried belongs in notJudged (§3.6), so one judged is a fault in the record (AR-9).
  const empty = record.tests.find((t) => t.state === 'judged' && !t.failedOn && !t.crashes && !t.tried);
  if (empty) return { ...out, broken: `The record judges ${m.named(empty.file, empty.name)} with no change tried, which the run never does: it belongs in the tests not judged. This is a fault in the step, not in your tests: report it to slipway with the run's output, and excuse the file in \`ci/exceptions.yaml\` with a date meanwhile.` };

  const entries = registry.filter((x) => typeof x.id === 'string' && x.id.startsWith(PREFIX));
  for (const x of entries) {
    const problem = expiryProblem(x.expires, today);
    if (problem) out.findings.push(m.excuseExpired(x, problem));
  }
  const otherRunner = entries.some((x) => x.id === `${PREFIX}other-runner` && !expiryProblem(x.expires, today));
  if (!record.mechanical && entries.some((x) => x.id === `${PREFIX}mechanical`) && !out.findings.some((f) => f.where.includes(`${PREFIX}mechanical#`))) out.warnings.push(m.spentMechanical());

  for (const t of record.tests) {
    if (t.state === 'flaky') out.findings.push(m.flaky(t));
    else if (t.state === 'out-of-time') out.findings.push(m.outOfTime(t, record.limit));
    else if (t.failedOn) continue;
    else if (t.crashes > 0) out.findings.push(m.onlyCrashes(t));
    else out.findings.push(m.killsNothing(t));
  }
  // §7: a run stopped at its limit is never a pass, also when it stopped before any test was marked.
  if (record.outOfTime && !record.tests.some((t) => t.state === 'out-of-time')) out.findings.push(m.outOfTimeRun(record.limit));
  for (const n of record.neverRun) out.findings.push(m.neverRun(n, record.runs));
  for (const n of record.notJudged) out.warnings.push(m.notJudged(n, otherRunner));
  for (const u of record.unreadable) out.warnings.push(m.unreadable(u));
  if (record.seconds > record.budget) out.warnings.push(m.overBudget(record.seconds, record.budget));

  // §4: none of the new tests judged, and one of them left out for a reason the owner did not give.
  const total = record.tests.length + record.notJudged.length;
  const given = (n) => m.OWNER_GAVE.includes(n.why) || n.why === 'skipped' || (n.why === 'other-runner' && otherRunner);
  const notGiven = record.notJudged.filter((n) => !given(n));
  if (total > 0 && record.tests.length === 0 && notGiven.length) {
    const counted = {};
    for (const n of notGiven) counted[n.why] = (counted[n.why] ?? 0) + 1;
    out.findings.push(m.nothingJudged(counted, total));
  }

  if (!record.changedTestFiles.length) out.summary = 'No tests were added or changed.';
  else {
    const passed = record.tests.filter((t) => t.state === 'judged' && t.failedOn).length;
    const rule = record.notJudged.filter((n) => m.RULE_CAUSED.includes(n.why) || (n.why === 'other-runner' && !otherRunner)).length;
    out.summary = `${total} new tests: ${passed} passed, ${record.tests.length - passed} failed, ${record.notJudged.length} not judged.`;
    out.notes.push(`Not judged for a reason this step causes: ${share(rule, total)}. Not judged for any reason: ${share(record.notJudged.length, total)}.`);
  }
  out.notes.push(...m.countLines(record));
  return out;
}

// Prints the notes and the report; returns the exit code. A note shows `##[` escaped, as report() does every field.
function print(v) {
  const note = (line) => process.stdout.write(escapeOutput(`${ID}: ${escapeControl(line)}`).replace(/##\[/g, '\\u0023\\u0023\\u005b') + '\n');
  for (const line of [...(v.broken ? [] : [v.summary]), ...v.notes]) note(line);
  const exit = report({ id: ID, claim: v.summary || 'the record was judged', scanned: 1, unit: 'run record', findings: v.findings, warnings: v.warnings, broken: v.broken });
  for (const line of v.after ?? []) note(line);
  return exit;
}

export const headOf = (root) => trustedGit(root, ['rev-parse', 'HEAD']).trim();

function brokenOnly(why) {
  return report({ id: ID, claim: '', scanned: 1, unit: 'run record', broken: why });
}

async function main(arg) {
  if (arg === undefined) return brokenOnly('Give a folder holding run.json, or --run to run `pnpm tests-can-fail` on this commit.');
  if (arg === '--run') {
    const root = process.cwd();
    let head;
    let registry;
    try {
      head = headOf(root);
    } catch (e) {
      return brokenOnly(m.e(e.message));
    }
    try {
      // The commit's, as the run reads it (§3.7): a change not committed excuses nothing and hides no expiry.
      registry = registryOf(showFile(root, head, 'ci/exceptions.yaml'));
    } catch (e) {
      return brokenOnly(m.e(`ci/exceptions.yaml: ${e.message}`));
    }
    const record = await runMutation({ root, say: (line) => process.stderr.write(`tests-can-fail: ${escapeControl(line).replace(/##\[/g, '\\u0023\\u0023\\u005b')}\n`) });
    return print(verdict(record, { registry, today: clockToday(root), head }));
  }
  const folder = resolve(arg);
  const path = join(folder, 'run.json');
  if (!existsSync(path)) return brokenOnly(`There is no record of a run at ${m.file(path)}. Run \`pnpm tests-can-fail\` to make one.`);
  let record;
  try {
    record = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return brokenOnly(`The record at ${m.file(path)} is not JSON (${m.e(e.message)}). Run \`pnpm tests-can-fail\` again.`);
  }
  let registry;
  try {
    registry = loadRegistry(join(folder, 'ci', 'exceptions.yaml'));
  } catch (e) {
    return brokenOnly(m.e(e.message));
  }
  return print(verdict(record, { registry, today: clockToday(folder), head: process.env.CHECK_HEAD ?? null }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exit(await main(process.argv[2]));
