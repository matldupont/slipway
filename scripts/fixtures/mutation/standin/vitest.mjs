// A stand-in for Vitest, for scripts/mutation.test.mjs: it answers `list --json --includeTaskLocation` and
// `run <file> --reporter=json --outputFile=<path>` in the shapes recorded in scripts/fixtures/vitest/, from the rules
// of config.json beside it. A test is found by a line `it('name'` or `test('name'` (any modifiers or each form) of a
// `*.test.*` or `*.spec.*` file under the folder it runs in. Each rule is read only by this file.
//
// config.json: { tests: { "<name>": rule }, rows: { "<name with %i>": n }, unlisted: [file], namePattern, sleepMs, runSleepMs,
//   changedSleepMs, marker, slowStop, worker, detachedWorker, record, project, envDump, noResult, noLine,
//   noFailureMessages }
// rule: { failsWhen: [{ file, line, has }], loadFailsWhen: [...], failure: "<recording>", message, frame: { file, line },
//   always: true, redOnce: true, redTwice: true, failsUntouchedAfterChange: true, skipped: true, skipsWhen: [...],
//   connection: true,
//   needsFile: "<path from the copy's root>" }
// namePattern stands for a name filter in the package's Vitest config: `list` gives only the names it matches, unless
// a `-t` or `--testNamePattern=` argument is given, which Vitest reads over its config.
// A run is a changed one when a `failsWhen` or `loadFailsWhen` entry holds; the sleeps and the marker read that.
// A `failsWhen` entry holds when line `line` of `file` (from the copy's root) no longer holds `has`: a change was made.

import { execFileSync, spawn } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const copy = dirname(here);
const config = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'));
const statePath = join(here, 'state.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { runs: {}, sawChange: false };
const args = process.argv.slice(2);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

if (config.envDump) writeFileSync(config.envDump, JSON.stringify(Object.keys(process.env)));
if (config.record && config.project) {
  const git = (a) => execFileSync('git', ['--no-optional-locks', '-C', config.project, ...a], { encoding: 'utf8' });
  appendFileSync(config.record, `${JSON.stringify({ status: git(['status', '--porcelain']), worktrees: git(['worktree', 'list']).trim().split('\n').length })}\n`);
}
// A worker in the runner's group; with slowStop it takes that long to stop after SIGTERM.
if (config.worker) spawn(process.execPath, [join(here, 'worker.mjs'), String(config.slowStop ?? 0)], { stdio: 'ignore' });
if (config.sleepMs) sleep(config.sleepMs);

// A test's line: it('x', test.only('x', it.each([1])('x', an alias such as fixtureTest('x', or the `])('x'` that
// closes an it.each of rows.
const TEST_LINE = /^\s*(?:(?:it|test|\w+Test)\b[\w.]*(?:\([^)]*\))?|\]\))\(\s*['"]([^'"]+)['"]/;
function testsOf(abs) {
  return readFileSync(abs, 'utf8').split('\n').flatMap((text, i) => {
    const m = TEST_LINE.exec(text);
    // Vitest's listing leaves out a test skipped or todo before it runs.
    if (!m || /\.(?:skip|todo)\(/.test(text)) return [];
    const rows = config.rows?.[m[1]];
    return rows ? Array.from({ length: rows }, (_, k) => ({ name: m[1].replace('%i', String(k + 1)), line: i + 1, rule: m[1] })) : [{ name: m[1], line: i + 1, rule: m[1] }];
  });
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name === 'standin') return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(e.name) ? [p] : [];
  });
}
const changed = (rules = []) => rules.some((r) => !(readFileSync(join(copy, r.file), 'utf8').split('\n')[r.line - 1] ?? '').includes(r.has));

if (args[0] === 'list') {
  const unlisted = new Set((config.unlisted ?? []).map((f) => join(copy, f)));
  // The last name filter on the command line wins, `-t <pattern>` or `--testNamePattern=<pattern>`.
  let pattern = config.namePattern;
  args.forEach((a, i) => {
    if (a === '-t') pattern = args[i + 1];
    else if (a.startsWith('--testNamePattern=')) pattern = a.slice('--testNamePattern='.length);
  });
  const named = (t) => pattern === undefined || new RegExp(pattern).test(t.name);
  const listing = files(process.cwd()).filter((f) => !unlisted.has(f)).flatMap((file) =>
    testsOf(file).filter(named).map((t) => (config.noLine ? { name: t.name, file } : { name: t.name, file, location: { line: t.line, column: 3 } })));
  process.stdout.write(JSON.stringify(listing));
  process.exit(0);
}

const file = join(process.cwd(), args[1]);
const out = args.find((a) => a.startsWith('--outputFile='))?.slice('--outputFile='.length);
const rules = Object.values(config.tests ?? {});
const untouched = !rules.some((r) => changed(r.failsWhen) || changed(r.loadFailsWhen));
const failureOf = (rule) => {
  if (rule.message) return rule.message;
  const recorded = JSON.parse(readFileSync(join(here, 'recorded', `${rule.failure ?? 'failure-AssertionError'}.json`), 'utf8'));
  let message = recorded.failureMessages[0];
  if (rule.connection) message = 'Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect (node:net:1:1)';
  if (rule.frame) message = message.replace(/\n {4}at [^\n]*/, `\n    at ${join(copy, rule.frame.file)}:${rule.frame.line}:5`);
  return message;
};
const key = relative(copy, file);
const run = (state.runs[key] = (state.runs[key] ?? 0) + 1);
const loadFails = rules.some((r) => changed(r.loadFailsWhen));
if (config.runSleepMs) sleep(config.runSleepMs);
// A process a test starts outside the runner's group, on a run with a change: the step's groups do not reach it.
if (!untouched && config.detachedWorker) spawn(process.execPath, [join(here, 'worker.mjs')], { stdio: 'ignore', detached: true }).unref();
if (!untouched && config.marker) writeFileSync(config.marker, String(process.pid));
if (!untouched && config.changedSleepMs) {
  setTimeout(() => process.exit(1), config.changedSleepMs);
  await new Promise(() => {});
}
const assertionResults = loadFails ? [] : testsOf(file).map((t) => {
  const rule = config.tests?.[t.rule] ?? {};
  const missing = rule.needsFile && !existsSync(join(copy, rule.needsFile));
  const fails = rule.always || missing || (rule.redOnce && run === 1) || (rule.redTwice && run <= 2) || changed(rule.failsWhen) || (rule.failsUntouchedAfterChange && untouched && state.sawChange);
  const status = rule.skipped || changed(rule.skipsWhen) ? 'skipped' : fails ? 'failed' : 'passed';
  return { ancestorTitles: [], fullName: t.name, status, title: t.name, failureMessages: status === 'failed' && !config.noFailureMessages ? [failureOf(rule)] : [] };
});
if (!untouched) state.sawChange = true;
writeFileSync(statePath, JSON.stringify(state));
if (config.noResult) process.exit(1);
const result = { testResults: [{ assertionResults, status: loadFails || assertionResults.some((a) => a.status === 'failed') ? 'failed' : 'passed', message: '', name: file }] };
writeFileSync(out, JSON.stringify(result));
process.exit(assertionResults.some((a) => a.status === 'failed') || loadFails ? 1 : 0);
