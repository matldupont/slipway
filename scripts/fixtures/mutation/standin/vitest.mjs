// A stand-in for Vitest, for scripts/mutation.test.mjs: it answers `list --json --includeTaskLocation` and
// `run <file> --reporter=json --outputFile=<path>` in the shapes recorded in scripts/fixtures/vitest/, from the rules
// of config.json beside it. A test is found by a line `it('name'` or `test('name'` (any modifiers or each form) of a
// `*.test.*` or `*.spec.*` file under the folder it runs in. Each rule is read only by this file.
//
// config.json: { tests: { "<name>": rule }, unlisted: [file], sleepMs, worker, detachedWorker, record, project,
//   envDump, noResult, noLine, noFailureMessages }
// rule: { failsWhen: [{ file, line, has }], loadFailsWhen: [...], failure: "<recording>", frame: { file, line },
//   always: true, redOnce: true, failsUntouchedAfterChange: true, skipped: true, connection: true }
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
  const git = (a) => execFileSync('git', ['-C', config.project, ...a], { encoding: 'utf8' });
  appendFileSync(config.record, `${JSON.stringify({ status: git(['status', '--porcelain']), worktrees: git(['worktree', 'list']).trim().split('\n').length })}\n`);
}
if (config.worker) spawn(process.execPath, [join(here, 'worker.mjs')], { stdio: 'ignore' });
if (config.detachedWorker) spawn(process.execPath, [join(here, 'worker.mjs')], { stdio: 'ignore', detached: true }).unref();
if (config.sleepMs) sleep(config.sleepMs);

const TEST_LINE = /^\s*(?:it|test)\b[\w.]*(?:\([^)]*\))?\(\s*['"]([^'"]+)['"]/;
function testsOf(abs) {
  return readFileSync(abs, 'utf8').split('\n').flatMap((text, i) => {
    const m = TEST_LINE.exec(text);
    return m ? [{ name: m[1], line: i + 1 }] : [];
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
  const listing = files(process.cwd()).filter((f) => !unlisted.has(f)).flatMap((file) =>
    testsOf(file).map((t) => (config.noLine ? { name: t.name, file } : { name: t.name, file, location: { line: t.line, column: 3 } })));
  process.stdout.write(JSON.stringify(listing));
  process.exit(0);
}

const file = join(process.cwd(), args[1]);
const out = args.find((a) => a.startsWith('--outputFile='))?.slice('--outputFile='.length);
const rules = Object.values(config.tests ?? {});
const untouched = !rules.some((r) => changed(r.failsWhen) || changed(r.loadFailsWhen));
const failureOf = (rule) => {
  const recorded = JSON.parse(readFileSync(join(here, 'recorded', `${rule.failure ?? 'failure-AssertionError'}.json`), 'utf8'));
  let message = recorded.failureMessages[0];
  if (rule.connection) message = 'Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect (node:net:1:1)';
  if (rule.frame) message = message.replace(/\n {4}at [^\n]*/, `\n    at ${join(copy, rule.frame.file)}:${rule.frame.line}:5`);
  return message;
};
const key = relative(copy, file);
const run = (state.runs[key] = (state.runs[key] ?? 0) + 1);
const loadFails = rules.some((r) => changed(r.loadFailsWhen));
const assertionResults = loadFails ? [] : testsOf(file).map((t) => {
  const rule = config.tests?.[t.name] ?? {};
  const fails = rule.always || (rule.redOnce && run === 1) || changed(rule.failsWhen) || (rule.failsUntouchedAfterChange && untouched && state.sawChange);
  const status = rule.skipped ? 'skipped' : fails ? 'failed' : 'passed';
  return { ancestorTitles: [], fullName: t.name, status, title: t.name, failureMessages: status === 'failed' && !config.noFailureMessages ? [failureOf(rule)] : [] };
});
if (!untouched) state.sawChange = true;
writeFileSync(statePath, JSON.stringify(state));
if (config.noResult) process.exit(1);
const result = { testResults: [{ assertionResults, status: loadFails || assertionResults.some((a) => a.status === 'failed') ? 'failed' : 'passed', message: '', name: file }] };
writeFileSync(out, JSON.stringify(result));
process.exit(assertionResults.some((a) => a.status === 'failed') || loadFails ? 1 : 0);
