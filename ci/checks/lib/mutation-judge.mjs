// The judging half of the tests-can-fail run (dev/features/tests-can-fail.md §3.6, §3.8, §3.9): each new test's
// subjects, the baseline in the clean copy, then one change at a time, one test file at a time, and the run after it
// with nothing changed. Every change is written in the copy and put back before the next.

import { writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { esc, redMessage, runFile, Stop } from './mutation-calls.mjs';
import { lastLines } from './mutation-processes.mjs';
import { queueOf, skippedEntry, subjectsOf, whyNoSubject } from './mutation-tests.mjs';
import { failure, notRun } from './runner-output.mjs';

export class OutOfTime extends Error {}
const CAP = 30;

const addFiles = (list, files) => {
  for (const file of files) if (!list.some((x) => x.file === file)) list.push({ file });
};

// Each group of a baseline run: red (failed, missing, or its file did not load), skipped (every test of it skipped or
// todo), or green.
function baseline(res, group) {
  const mine = res.tests.filter((t) => group.names.has(t.name));
  if (!res.loaded || !mine.length || mine.some((t) => t.status === 'failed')) return 'red';
  return mine.every((t) => notRun(t.status)) ? 'skipped' : 'green';
}
const connectionError = (res) => res.tests.some((t) => t.failureMessages.some((m) => /ECONNREFUSED|ECONNRESET|connect ETIMEDOUT/.test(m)));

/**
 * @param {{ ctx: object, record: object, units: object[], tracked: Set<string>, packages: object[], changed: string[], own: (file: string) => Set<number> }} o
 */
export async function judge({ ctx, record, units, tracked, packages, changed, own }) {
  const pending = new Map();
  const toRecord = (unit, group, extra = {}) => ({
    package: unit.pkg.name, file: unit.file, name: group.name, line: group.line, subjects: (unit.pools ?? []).map((p) => p.file),
    tried: 0, failedOn: null, crashes: 0, lastCrash: null, unreadFailures: 0, lastUnread: null, state: null, ...extra,
  });
  try {
    // §3.6: the subjects.
    const ready = [];
    for (const unit of units) {
      const s = subjectsOf({ copy: ctx.copy, tracked, packages, changed, testFile: unit.file, testText: unit.text });
      addFiles(record.support, s.support);
      for (const u of s.unreadable) if (!record.unreadable.some((x) => x.file === u.file)) record.unreadable.push({ file: u.file, reason: esc(u.reason) });
      addFiles(record.noChange, s.nothing);
      if (!s.pools.length) {
        const why = whyNoSubject(s);
        const detail = why === 'support-only' ? s.support[0] : why === 'no-change-to-make' ? s.nothing[0] : s.unreadable[0]?.file ?? null;
        for (const g of unit.groups) record.notJudged.push({ file: unit.file, name: g.name, why, detail });
        continue;
      }
      Object.assign(unit, { pools: s.pools }, queueOf(s.pools, own));
      ready.push(unit);
      for (const g of unit.groups) pending.set(g, unit);
    }

    // §3.9's order, set before the baseline, so a stop at the limit still says which file would have come next.
    ready.sort((a, b) => a.queue.length - b.queue.length);
    record.order = ready.map((u) => u.file);

    // §3.8: the baseline, and once more for a file with a red new test.
    const first = new Map();
    for (const unit of ready) first.set(unit, unit.first ?? await runFile(ctx, unit));
    const red = ready.flatMap((unit) => unit.groups.filter((g) => baseline(first.get(unit), g) === 'red').map((g) => ({ unit, g })));
    const everyRed = red.length > 0 && red.length === ready.reduce((n, u) => n + u.groups.length, 0);
    const connection = ready.some((u) => connectionError(first.get(u)));
    const again = new Map();
    for (const unit of ready) if (red.some((r) => r.unit === unit)) again.set(unit, await runFile(ctx, unit));
    for (const { unit, g } of red) {
      if (baseline(again.get(unit), g) === 'red') throw new Stop(redMessage(unit, g.name, { everyRed, connection }));
      record.notJudged.push({ file: unit.file, name: g.name, why: 'flaky', detail: null });
      pending.delete(g);
    }
    for (const unit of ready) {
      unit.groups = unit.groups.filter((g) => {
        if (!pending.has(g)) return false;
        if (baseline(first.get(unit), g) !== 'skipped') return true;
        record.notJudged.push(skippedEntry(unit.file, g));
        pending.delete(g);
        return false;
      });
    }

    // §3.9: the file with the fewest changes first.
    for (const unit of ready.filter((u) => u.groups.length)) {
      ctx.say(`judging ${unit.file}: ${unit.groups.length} new tests, ${unit.queue.length} changes to try`);
      await judgeFile(ctx, record, unit, toRecord, pending);
    }
  } catch (e) {
    if (!(e instanceof OutOfTime)) throw e;
    record.outOfTime = true;
    // Every new test not finished is out-of-time; one that already failed on a change keeps it.
    for (const [g, unit] of pending) record.tests.push({ ...(g.rec ?? toRecord(unit, g)), state: g.rec?.failedOn ? 'judged' : 'out-of-time' });
  }
}

async function judgeFile(ctx, record, unit, toRecord, pending) {
  for (const g of unit.groups) g.rec = toRecord(unit, g);
  const recs = unit.groups.map((g) => g.rec);
  const testAbs = join(ctx.copy, unit.file);
  const fromCopy = (file) => (file && file.startsWith(ctx.copy + sep) ? relative(ctx.copy, file).split(sep).join('/') : file);
  for (const { pool, change } of unit.queue) {
    const open = unit.groups.filter((g) => !g.rec.failedOn);
    if (!open.length) break;
    ctx.checkpoint();
    const path = join(ctx.copy, pool.file);
    writeFileSync(path, pool.text.slice(0, change.start) + change.replacement + pool.text.slice(change.end));
    let res;
    try {
      res = await runFile(ctx, unit);
    } finally {
      writeFileSync(path, pool.text);
    }
    if (res.none) throw new Stop(`The test runner wrote no result for \`${esc(unit.file)}\`:\n${esc(lastLines(res.log))}`);
    // A change that hangs the file or stops it loading says nothing about a test: dropped, not counted.
    if (res.hung || !res.loaded) continue;
    for (const g of open) g.rec.tried += 1;
    for (const t of res.tests) {
      const g = t.status === 'failed' && open.find((x) => x.names.has(t.name) && !x.rec.failedOn);
      if (!g) continue;
      const f = failure(t.failureMessages, testAbs, unit.expects);
      if (f.counts) g.rec.failedOn = { file: pool.file, line: change.line, kind: change.kind, by: f.by };
      else if (f.crash) {
        g.rec.crashes += 1;
        g.rec.lastCrash = { type: f.crash.type, file: fromCopy(f.crash.file), line: f.crash.line };
      } else if (f.unnamed !== undefined) {
        g.rec.unreadFailures += 1;
        g.rec.lastUnread = esc(f.unnamed);
      }
    }
  }
  if (recs.some((r) => !r.failedOn) && (unit.body > CAP || unit.other > CAP)) {
    record.capped.push({ file: unit.file, untriedBody: Math.max(0, unit.body - CAP), untriedOther: Math.max(0, unit.other - CAP) });
  }
  // A test every change of which was dropped (its file stopped loading, or hung) had nothing tried: not judged, by
  // its own reason, never a judged test with nothing tried, which the verdict reads as a fault in the record (AR-9).
  const dropped = unit.groups.filter((g) => !g.rec.failedOn && g.rec.tried === 0);
  for (const g of dropped) {
    record.notJudged.push({ file: unit.file, name: g.name, why: 'every-change-dropped', detail: unit.pools.length === 1 ? unit.pools[0].file : null });
    pending.delete(g);
  }
  unit.groups = unit.groups.filter((g) => !dropped.includes(g));
  if (!unit.groups.length) return;
  // Then the file once more, untouched: a new test that fails there failed with nothing changed.
  ctx.checkpoint();
  const again = await runFile(ctx, unit);
  const redAgain = new Set(again.tests.filter((t) => t.status === 'failed').map((t) => t.name));
  for (const g of unit.groups) {
    const flaky = again.hung || again.none || !again.loaded || [...g.names].some((n) => redAgain.has(n));
    record.tests.push({ ...g.rec, state: flaky ? 'flaky' : 'judged' });
    pending.delete(g);
  }
}
