// A stand-in for Vitest, for scripts/mutation.test.mjs: it answers `list --json --includeTaskLocation` and
// `run <file> --reporter=json --outputFile=<path>` in the shapes recorded in scripts/fixtures/vitest/, from the rules
// of config.json beside it. A test is found by a call `it('name'` or `test('name'` (any modifiers or each form) of a
// `*.test.*` or `*.spec.*` file under the folder it runs in. Each rule is read only by this file.
//
// config.json: { tests: { "<name>": rule }, rows: { "<name with %i>": n }, unlisted: [file], namePattern, tagsFilter, tags,
//   sleepMs, runSleepMs, changedRunSleepMs, noReportColumn, noColumnWhen, copies,
//   changedSleepMs, marker, slowStop, worker, detachedWorker, record, project, envDump, noResult, noLine,
//   noFailureMessages }
// A rule is keyed by a test's name (a row's own, or its call's with %i), or by `<name>@<line>` for that line only.
// rule: { failsWhen: [{ file, line, has }], loadFailsWhen: [...], failure: "<recording>", message, frame: { file, line },
//   always: true, redOnce: true, redTwice: true, failsUntouchedAfterChange: true, skipped: true, skipsWhen: [...],
//   connection: true,
//   needsFile: "<path from the copy's root>" }
// What Vitest leaves out of `list`, each standing for its own: namePattern, a name filter in the package's Vitest config;
// tagsFilter: [tag], its tags filter (a test is kept when its line holds `tags: ['<tag>']`); tags: [{ name, skip }], a
// tag the config skips; a value given to `--passWithNoTests=` or `--globals=`, which the runner keeps as a file filter
// (`<path>:<line>` keeps that line's test of that file only); `.skip(` or `.todo(` in a test's call; a
// `describe.skip(` block, up to the `});` at the start of a line that closes it; and every test of a file with a
// `.only(` test but those. `run` reports each of these as skipped (todo for `.todo(`), as Vitest's report does, each
// with its line and column when `--includeTaskLocation` is given (none with noReportLine, no column with
// noReportColumn; badReport writes one that does not parse); `aliases: [name]` are test calls too, which `list`
// leaves out with unlistedAliases, as Vitest 5's listing, read from the file without running it, does.
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

// A test's call: it('x', test.only('x', it.each([1])('x', an alias such as fixtureTest('x', or the `])('x'` that
// closes an it.each of rows; at the start of a line, after `);` or after `=> {`, so a line can hold more than one.
// Each is placed where Vitest places it: at its call's name, or at the `(` that follows `])`.
const TEST_CALL = new RegExp(`(?<=^\\s*|\\)\\s*;\\s*|=>\\s*\\{\\s*)(?:(?:it|test|\\w+Test${(config.aliases ?? []).map((a) => `|${a}`).join('')})\\b[\\w.]*(?:\\([^)]*\\))?(?:\\?\\.)?|\\]\\))\\(\\s*['"]([^'"]+)['"]`, 'g');
const callsOf = (text) => [...text.matchAll(TEST_CALL)].map((m, k, all) => ({ m, own: text.slice(m.index, all[k + 1]?.index ?? text.length) }));
function testsOf(abs) {
  let skipped = false;
  const lines = readFileSync(abs, 'utf8').split('\n');
  const only = lines.some((l) => callsOf(l).some((c) => c.own.includes('.only(')));
  return lines.flatMap((text, i) => {
    if (/^describe\.skip\(/.test(text)) skipped = true;
    else if (/^\}\);?\s*$/.test(text)) skipped = false;
    return callsOf(text).flatMap(({ m, own }) => {
      // Vitest's listing leaves out a test skipped or todo before it runs; its run reports it, as skipped or todo.
      const out = /\.todo\(/.test(own) ? 'todo' : skipped || /\.skip\(/.test(own) || (only && !own.includes('.only(')) ? 'skipped' : null;
      const tags = /tags: \[([^\]]*)\]/.exec(own)?.[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')) ?? [];
      const rows = config.rows?.[m[1]];
      const alias = !/^(?:it|test|\w+Test|\])/.test(m[0]);
      const at = { alias, line: i + 1, column: m.index + 1 + (m[0].startsWith('])') ? 2 : 0), rule: m[1], tags, out };
      return rows ? Array.from({ length: rows }, (_, k) => ({ ...at, name: m[1].replace('%i', String(k + 1)) })) : [{ ...at, name: m[1] }];
    });
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

// Whether the run keeps a test: the config's filters and a file:line filter on the command line.
const named = (t) => config.namePattern === undefined || new RegExp(config.namePattern).test(t.name);
const tagged = (t) => (config.tagsFilter === undefined || config.tagsFilter.some((g) => t.tags.includes(g))) && !(config.tags ?? []).some((g) => g.skip && t.tags.includes(g.name));
const filters = args.flatMap((a) => /^--(?:passWithNoTests|globals)=(.+):(\d+)$/.exec(a)?.slice(1) ?? []);
const kept = (file, t) => !t.out && named(t) && tagged(t) && (!filters.length || (relative(process.cwd(), file) === filters[0] && t.line === Number(filters[1])));

if (args[0] === 'list') {
  const unlisted = new Set((config.unlisted ?? []).map((f) => join(copy, f)));
  const listing = files(process.cwd()).filter((f) => !unlisted.has(f)).flatMap((file) =>
    testsOf(file).filter((t) => kept(file, t) && !(config.unlistedAliases && t.alias)).map((t) => (config.noLine ? { name: t.name, file } : { name: t.name, file, location: { line: t.line, column: t.column } })));
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
// changedRunSleepMs: a run with a change takes that long, then answers as any run does.
if (!untouched && config.changedRunSleepMs) sleep(config.changedRunSleepMs);
// A process a test starts outside the runner's group, on a run with a change: the step's groups do not reach it.
if (!untouched && config.detachedWorker) spawn(process.execPath, [join(here, 'worker.mjs')], { stdio: 'ignore', detached: true }).unref();
if (!untouched && config.marker) writeFileSync(config.marker, String(process.pid));
if (!untouched && config.changedSleepMs) {
  setTimeout(() => process.exit(1), config.changedSleepMs);
  await new Promise(() => {});
}
const located = args.includes('--includeTaskLocation') && !config.noReportLine;
// noColumnWhen: 'changed' leaves the column out of a run with a change, 'after' out of an untouched run after one.
const columnless = config.noReportColumn || (config.noColumnWhen === 'changed' && !untouched) || (config.noColumnWhen === 'after' && untouched && state.sawChange);
const where = (t) => (located ? { location: columnless ? { line: t.line } : { line: t.line, column: t.column } } : {});
const assertionResults = loadFails ? [] : testsOf(file).map((t) => {
  if (!kept(file, t)) return { ancestorTitles: [], fullName: t.name, status: t.out === 'todo' ? 'todo' : 'skipped', title: t.name, failureMessages: [], ...where(t) };
  const rule = [`${t.name}@${t.line}`, t.name, `${t.rule}@${t.line}`, t.rule].map((k) => config.tests?.[k]).find(Boolean) ?? {};
  const missing = rule.needsFile && !existsSync(join(copy, rule.needsFile));
  const fails = rule.always || missing || (rule.redOnce && run === 1) || (rule.redTwice && run <= 2) || changed(rule.failsWhen) || (rule.failsUntouchedAfterChange && untouched && state.sawChange);
  const status = rule.skipped || changed(rule.skipsWhen) ? 'skipped' : fails ? 'failed' : 'passed';
  return { ancestorTitles: [], fullName: t.name, status, title: t.name, failureMessages: status === 'failed' && !config.noFailureMessages ? [failureOf(rule)] : [], ...where(t) };
});
if (!untouched) state.sawChange = true;
writeFileSync(statePath, JSON.stringify(state));
if (config.noResult) process.exit(1);
// copies: n reports the file n times, as Vitest does when n projects of one call run it.
const one = { assertionResults, status: loadFails || assertionResults.some((a) => a.status === 'failed') ? 'failed' : 'passed', message: '', name: file };
const result = { testResults: Array.from({ length: config.copies ?? 1 }, () => one) };
// badReport writes a report that does not parse, as a runner cut off mid-write would.
writeFileSync(out, config.badReport ? '{"testResults": [' : JSON.stringify(result));
process.exit(assertionResults.some((a) => a.status === 'failed') || loadFails ? 1 : 0);
