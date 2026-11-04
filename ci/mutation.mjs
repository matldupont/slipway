#!/usr/bin/env node
// The tests-can-fail run (dev/features/tests-can-fail.md §1, §3, §7, D-037): it diffs HEAD from its merge base with the
// default branch, copies HEAD outside the project, changes the code a new test imports, runs that test there, stops
// every process it starts, and returns the record of §3.10. The verdict (ci/checks/meta/mt1-tests-can-fail.mjs) reads
// it in the same process. No file of the project is changed or written. Run as a script, it prints the record as JSON
// and exits 2 when the run stopped. Its one argument is `--limit-seconds <n>` (600 when not given).

import { mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { today } from './checks/lib/clock.mjs';
import { expiryProblem } from './checks/lib/exceptions.mjs';
import { trustedGit } from './checks/lib/manifest.mjs';
import { spans } from './checks/lib/mutants.mjs';
import { argvOf, CALL_LIMIT_MS, esc, leftMessage, listTests, runnerEnv, setupMessage, Stop, vitestVersion } from './checks/lib/mutation-calls.mjs';
import { changedFiles, changedLines, defaultBranch, isRunnableName, mergeBase, NO_DEFAULT, revParse, showFile, trackedFiles, uncommitted, writeCopy } from './checks/lib/mutation-git.mjs';
import { judge, OutOfTime } from './checks/lib/mutation-judge.mjs';
import { Groups, killPids, lastLines, namingFolder } from './checks/lib/mutation-processes.mjs';
import { newTests, packageOf, safely, within, workspacePackages } from './checks/lib/mutation-tests.mjs';
import { readTestsCanFail, runnerCall, unreadableScript } from './checks/lib/runner-call.mjs';
import { isRecordedMajor } from './checks/lib/runner-output.mjs';
import { readList } from './checks/lib/yaml-list.mjs';

export const BUDGET_SECONDS = 120;
export const LIMIT_SECONDS = 600;
const DAY_MS = 24 * 60 * 60 * 1000;
const PREFIX = 'tests-can-fail-';
// After a signal, the run ends within this long, or the process exits without its clean-up.
export const SIGNAL_STOP_MS = 10_000;
const SIGNALS = { SIGINT: 2, SIGTERM: 15, SIGHUP: 1 };

const emptyRecord = (limit) => ({
  head: null, base: null, seconds: 0, budget: BUDGET_SECONDS, limit, outOfTime: false, stopped: null, signal: null,
  uncommitted: 0, changedTestFiles: [], runs: [], order: [], tests: [], neverRun: [], notJudged: [], unreadable: [],
  support: [], noChange: [], notTests: [], outsideAnyTest: [], removedTestFiles: 0, mechanical: false, mechanicalSpent: false,
  excuseProblems: [], capped: [], leftProcesses: 0,
});

// §1: each run first removes the tests-can-fail-* folders of the temporary directory more than a day old.
function sweep(now) {
  for (const name of readdirSync(tmpdir())) {
    if (!name.startsWith(PREFIX)) continue;
    const path = join(tmpdir(), name);
    try {
      if (statSync(path).isDirectory() && now - statSync(path).mtimeMs > DAY_MS) rmSync(path, { recursive: true, force: true });
    } catch {
      /* another user's, or gone */
    }
  }
}

const registryOf = (text) => (text === null ? [] : readList(text, ['id', 'expires', 'reason', 'owner'], { strict: true }));

/**
 * @param {{ root?: string, limitSeconds?: number }} [o]
 * @returns {Promise<object>} the record of §3.10, complete on every exit path
 */
export async function runMutation({ root = process.cwd(), limitSeconds = LIMIT_SECONDS, say = () => {} } = {}) {
  const started = Date.now();
  const deadline = started + limitSeconds * 1000;
  const record = emptyRecord(limitSeconds);
  const groups = new Groups();
  const ctx = { groups, dir: null, copy: null, env: runnerEnv(), signalled: null, say };
  ctx.callLimit = () => Math.min(CALL_LIMIT_MS, deadline - Date.now());
  ctx.checkpoint = (r) => {
    if (ctx.signalled) throw new Stop(`The run was stopped by ${ctx.signalled}.`);
    if (r?.timedOut && Date.now() >= deadline - 50) throw new OutOfTime();
    if (Date.now() >= deadline) throw new OutOfTime();
  };
  const handlers = Object.keys(SIGNALS).map((sig) => {
    const on = () => {
      if (ctx.signalled) return;
      ctx.signalled = sig;
      record.signal = sig;
      groups.stopAll();
      setTimeout(() => process.exit(128 + SIGNALS[sig]), SIGNAL_STOP_MS).unref();
    };
    process.on(sig, on);
    return [sig, on];
  });
  try {
    sweep(started);
    await body(root, record, ctx, deadline);
  } catch (e) {
    if (e instanceof OutOfTime) record.outOfTime = true;
    else record.stopped ??= e instanceof Stop ? e.message : `The step stopped on an error it did not foresee: ${esc(e?.message ?? e)}`;
  } finally {
    await groups.stopAll();
    if (ctx.dir) {
      const left = namingFolder(ctx.dir);
      if (left === null) record.stopped ??= 'pgrep could not say whether a process this check started is still running, so the run cannot show it leaves nothing running.';
      else if (left.length) {
        killPids(left);
        record.leftProcesses = left.length;
        record.stopped ??= leftMessage(left.length);
      }
      try {
        rmSync(ctx.dir, { recursive: true, force: true });
      } catch (e) {
        record.stopped ??= `The copy at ${esc(ctx.dir)} could not be removed: ${esc(e?.message ?? e)}`;
      }
    }
    for (const [sig, on] of handlers) process.off(sig, on);
    record.seconds = Math.round((Date.now() - started) / 100) / 10;
  }
  return record;
}

async function body(root, record, ctx, deadline) {
  const top = trustedGit(root, ['rev-parse', '--show-toplevel']).trim();
  record.head = revParse(top, 'HEAD');
  const from = defaultBranch(top);
  if (!from) throw new Stop(NO_DEFAULT);
  record.base = mergeBase(top, from, record.head);
  record.uncommitted = uncommitted(top);
  const { tests: changed, paths, removed } = changedFiles(top, record.base, record.head);
  record.removedTestFiles = removed;
  record.changedTestFiles = changed.map((c) => c.file);
  ctx.say(`${changed.length} changed test files, ${removed} removed or renamed away`);
  if (!changed.length) return;

  // §3.7: the registry is read from the commit; the mechanical entry counts only in the change that adds it.
  let registry;
  let before;
  try {
    registry = registryOf(showFile(top, record.head, 'ci/exceptions.yaml'));
    before = registryOf(showFile(top, record.base, 'ci/exceptions.yaml'));
  } catch (e) {
    throw new Stop(`ci/exceptions.yaml: ${esc(e.message)}`);
  }
  const day = today(top);
  const live = (id) => registry.find((e) => e.id === id && !expiryProblem(e.expires, day));
  const mechanical = live('tests-can-fail#mechanical');
  if (mechanical && before.some((e) => e.id === 'tests-can-fail#mechanical')) record.mechanicalSpent = true;
  const excuse = (file) => {
    const entry = registry.find((e) => e.id === `tests-can-fail#${file}`);
    if (!entry) return null;
    const problem = expiryProblem(entry.expires, day);
    if (problem) record.excuseProblems.push({ file, problem });
    return problem ? null : entry;
  };

  ctx.dir = realpathSync(mkdtempSync(join(tmpdir(), PREFIX)));
  ctx.copy = join(ctx.dir, 'copy');
  ctx.say(`copying ${record.head.slice(0, 12)} to ${ctx.dir}`);
  writeCopy(top, record.head, ctx.dir, ctx.copy);
  const tracked = trackedFiles(top, record.head);
  const packages = workspacePackages(ctx.copy);
  let config = { runs: new Map(), keepOut: [] };
  if (tracked.has('ci/tests-can-fail.yaml')) {
    try {
      config = readTestsCanFail(readFileSync(join(ctx.copy, 'ci/tests-can-fail.yaml'), 'utf8'), new Set(packages.map((p) => p.name)));
    } catch (e) {
      throw new Stop(esc(e.message));
    }
  }

  // §3.3, §3.7: which changed test files can be judged at all.
  const anyVitest = packages.some((p) => p.vitest);
  const byPackage = new Map();
  const notJudged = (file, why, detail = null) => record.notJudged.push({ file, name: null, why, detail });
  for (const entry of changed) {
    const { file } = entry;
    const pkg = packageOf(packages, file);
    if (!pkg) {
      notJudged(file, 'no-package');
      continue;
    }
    const inPkg = within(pkg, file);
    const kept = config.keepOut.find((k) => k.package === pkg.name && (inPkg === k.path || inPkg.startsWith(`${k.path}/`)));
    const excused = kept ? null : excuse(file);
    if (kept) notJudged(file, 'kept-out', kept.reason);
    else if (excused) notJudged(file, 'excused', `${excused.reason} (until ${excused.expires})`);
    else if (pkg.vitest) byPackage.set(pkg, [...(byPackage.get(pkg) ?? []), entry]);
    else if (!/\.(?:test|spec)\.[^/]+$/.test(file)) record.notTests.push({ file });
    else if (!anyVitest && !live('tests-can-fail#other-runner')) {
      throw new Stop(`\`${esc(file)}\` was added or changed, and no package here uses Vitest, the only test runner this step can judge.`);
    } else notJudged(file, 'other-runner', pkg.name);
  }
  if (!byPackage.size) return;

  // §3.4: the install, then ci/before-verify.sh, whose services are kept until the run ends.
  ctx.say('installing in the copy');
  const install = await ctx.groups.run(['pnpm', '--dir', ctx.copy, 'install', '--frozen-lockfile', '--offline'], { cwd: ctx.copy, env: process.env, log: join(ctx.dir, 'install.log'), limitMs: ctx.callLimit() });
  ctx.checkpoint(install);
  if (install.status !== 0) throw new Stop(`The install in the copy of this commit failed:\n${esc(lastLines(join(ctx.dir, 'install.log')))}`);
  const versions = new Map();
  for (const pkg of byPackage.keys()) {
    const version = vitestVersion(ctx.copy, pkg);
    if (!isRecordedMajor(version)) throw new Stop(`\`${esc(pkg.name)}\` has Vitest ${esc(version ?? 'of no version this step can read')}, and this step was written for Vitest 4 and 5. It reads the runner's output only as recorded for those.`);
    versions.set(pkg, version);
  }
  if (tracked.has('ci/before-verify.sh')) {
    const envFile = join(ctx.dir, 'github-env');
    writeFileSync(envFile, '');
    const log = join(ctx.dir, 'setup.log');
    const setup = await ctx.groups.run(['bash', join(ctx.copy, 'ci/before-verify.sh')], { cwd: ctx.copy, env: { ...process.env, GITHUB_ENV: envFile }, log, limitMs: ctx.callLimit(), keep: true });
    ctx.checkpoint(setup);
    if (setup.status !== 0) throw new Stop(setupMessage(lastLines(log)));
    ctx.env = runnerEnv(readFileSync(envFile, 'utf8'));
  }

  // §3.5: the listing of each call, and which tests are new.
  const units = [];
  for (const [pkg, entries] of byPackage) {
    const scripts = config.runs.get(pkg.name) ?? (typeof pkg.json.scripts?.test === 'string' ? [pkg.json.scripts.test] : []);
    const listed = [];
    for (const script of scripts) {
      const call = runnerCall(script);
      if (call.unreadable) throw new Stop(unreadableScript(esc(pkg.name), esc(script)));
      const unit = { pkg, call, argv: argvOf(ctx.copy, pkg, call), version: versions.get(pkg) };
      record.runs.push({ package: pkg.name, call: script, version: unit.version });
      listed.push({ unit, tests: await listTests(ctx, unit) });
    }
    for (const entry of entries) {
      // Only a regular file the commit tracks is read: a symlink or a submodule is no test file of this change.
      if (!tracked.has(entry.file)) {
        record.notTests.push({ file: entry.file });
        continue;
      }
      const by = listed.find((l) => l.tests.some((t) => t.file === entry.file));
      if (!by) {
        (isRunnableName(entry.file) ? record.neverRun : record.notTests).push({ file: entry.file });
        continue;
      }
      const text = readFileSync(join(ctx.copy, entry.file), 'utf8');
      const read = safely(spans, entry.file, text);
      if (read.unreadable) record.unreadable.push({ file: entry.file, reason: esc(read.unreadable) });
      const found = newTests(by.tests.filter((t) => t.file === entry.file), read, changedLines(top, record.base, record.head, entry));
      if (found.every && !read.unreadable) record.unreadable.push({ file: entry.file, reason: 'a test it lists is in no test call this step reads (an alias of it or test, or test.extend)' });
      if (found.outside && !entry.added) record.outsideAnyTest.push({ file: entry.file });
      if (found.groups.length) units.push({ ...by.unit, file: entry.file, text, expects: read.unreadable ? [] : read.expects, groups: found.groups });
    }
  }

  if (mechanical && !record.mechanicalSpent) {
    record.mechanical = true;
    const detail = `${mechanical.reason} (until ${mechanical.expires})`;
    for (const unit of units) for (const g of unit.groups) record.notJudged.push({ file: unit.file, name: g.name, why: 'mechanical', detail });
    return;
  }
  const own = (file) => (paths.includes(file) ? changedLines(top, record.base, record.head, { file, from: file }).added : new Set());
  await judge({ ctx, record, units, tracked, packages, changed: paths, own, deadline });
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const at = process.argv.indexOf('--limit-seconds');
  const limitSeconds = at > 0 ? Number(process.argv[at + 1]) : LIMIT_SECONDS;
  if (!Number.isFinite(limitSeconds) || limitSeconds <= 0) {
    process.stderr.write('--limit-seconds takes a number of seconds above 0\n');
    process.exit(2);
  }
  const record = await runMutation({ limitSeconds, say: (line) => process.stderr.write(`tests-can-fail: ${esc(line)}\n`) });
  process.stdout.write(`${JSON.stringify(record, null, 1)}\n`);
  process.exit(record.signal ? 128 + SIGNALS[record.signal] : record.stopped ? 2 : 0);
}
