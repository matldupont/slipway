#!/usr/bin/env node
// Measurement only: F-13 Build map step 0 (dev/features/tests-can-fail.md, D-037). Not the step, and not shipped.
//
//   node measure.mjs <repository> <base> <head> [--counts-only] [--no-setup] [--record <folder>] [--call "<words>"]
//
// It applies the Contract's rule to one change and prints a record as JSON: the seconds, and the tests new,
// judged and not judged by reason. One file with no import but Node and the judged package's own `typescript`,
// so it can be run in a project that is not slipway.
//
// What it applies: §3.1 (the diff, removal-only hunks), §3.2, §3.4 (a copy of the commit outside the project,
// an offline install, ci/before-verify.sh), §3.5 (which tests are new), §3.6 whole (relative imports, the file
// beside the test, a workspace package by name, re-exports 3 deep, the support list), §3.8 (the baseline),
// §3.9 (both caps, what a failure counts for, the untouched run after; its order departs, as README.md says).
//
// What it leaves out (README.md says what each could move): the vendored parser (it reads source with the
// TypeScript compiler API), runnerCall() (the runner is `vitest` in the package, with --call's words added),
// ci/tests-can-fail.yaml, ci/exceptions.yaml (nothing is excused, kept out or mechanical), the 600 s stop (it
// runs to the end and says which tests a stop at 600 s would have left), and every exit 2 of §3: a new test
// that is red in the clean copy is counted as `red-in-copy` and the run goes on.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); if (i < 0) return false; argv.splice(i, 1); return true; };
const option = (name) => { const i = argv.indexOf(name); if (i < 0) return null; return argv.splice(i, 2)[1]; };
const countsOnly = flag('--counts-only');
const noSetup = flag('--no-setup');
const recordDir = option('--record');
const callWords = (option('--call') ?? '').split(' ').filter(Boolean);
const [repo, base, headArg] = argv;
if (!repo || !base || !headArg) { console.error('usage: node measure.mjs <repository> <base> <head> [--counts-only] [--no-setup] [--record <folder>] [--call "<words>"]'); process.exit(2); }

const EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
const SUPPORT_FOLDERS = new Set(['__tests__', '__mocks__', '__fixtures__', 'test', 'tests', 'fixtures', 'mocks']);
const SUPPORT_NAMES = new Set(['test-utils', 'factories', 'setup']);
const CRASH = new Set(['TypeError', 'ReferenceError', 'RangeError']);
const RUN_LIMIT_MS = 120_000;
const STOP_AT = 600;

const t0 = Date.now();
const seconds = () => Math.round((Date.now() - t0) / 100) / 10;
const phases = {};
const timed = (name, fn) => { const s = Date.now(); try { return fn(); } finally { phases[name] = Math.round(((phases[name] ?? 0) * 1000 + Date.now() - s) / 100) / 10; } };
const git = (args, env) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
// With --counts-only, an error the probe did not foresee prints a fixed line: its message would carry the
// repository's path, file paths and commits.
if (countsOnly) process.on('uncaughtException', () => { console.log(JSON.stringify({ stopped: 'the probe failed; run it without --counts-only on your own machine to see why' })); process.exit(2); });
const ext = (p) => { const b = posix.basename(p); const i = b.lastIndexOf('.'); return i < 0 ? '' : b.slice(i); };
const isSnapshot = (p) => p.split('/').includes('__snapshots__') || p.endsWith('.snap');
const isTestName = (p) => !isSnapshot(p) && (/\.(test|spec)\.[^/]+$/.test(p) || p.split('/').includes('__tests__'));
const isRunnable = (p) => /\.(test|spec)\.[^./]+$/.test(p) && EXT.includes(ext(p));
const isSupport = (p) => { const parts = p.split('/'); const file = parts.pop(); return parts.some((d) => SUPPORT_FOLDERS.has(d)) || SUPPORT_NAMES.has(file.split('.')[0]); };

const head = git(['rev-parse', headArg]).trim();
const mergeBase = git(['merge-base', base, head]).trim();

// §3.1 — added and changed lines per file, and the place of each hunk that only removes lines.
const added = {}; const removedAfter = {};
{
  let file = null; let inHeader = false;
  for (const l of git(['-c', 'core.quotePath=false', 'diff', '-U0', '-M', '-w', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', mergeBase, head]).split('\n')) {
    // A file's header runs from `diff --git` to its first hunk; a `+++ ` line anywhere else is an added line.
    if (l.startsWith('diff --git ')) { inHeader = true; continue; }
    if (l.startsWith('@@')) inHeader = false;
    if (inHeader && l.startsWith('+++ ')) { file = l === '+++ /dev/null' ? null : l.slice(6).replace(/\t$/, ''); continue; }
    const m = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (!m || !file) continue;
    const start = +m[1]; const n = m[2] === undefined ? 1 : +m[2];
    if (n === 0) (removedAfter[file] ??= []).push(start);
    for (let i = 0; i < n; i++) (added[file] ??= new Set()).add(start + i);
  }
}
const status = git(['diff', '--name-status', '-M', '-z', mergeBase, head]).split('\0');
const changed = []; let removedTestFiles = 0;
for (let i = 0; i < status.length - 1;) {
  const s = status[i++];
  if (s[0] === 'R' || s[0] === 'C') { const from = status[i++]; const to = status[i++]; changed.push(to); if (s[0] === 'R' && isTestName(from) && !isTestName(to)) removedTestFiles++; }
  else { const p = status[i++]; if (s[0] === 'D') { if (isTestName(p)) removedTestFiles++; } else changed.push(p); }
}

// §3.2 — which test files changed.
const changedTestFiles = changed.filter(isTestName);
const out = {
  head: countsOnly ? undefined : head, base: countsOnly ? undefined : mergeBase, seconds: 0, phases, node: process.version, runs: [],
  changedTestFiles: changedTestFiles.length, removedTestFiles, runnerCalls: 0, tests: [], notJudged: [], neverRun: [], notTests: [],
  outsideAnyTest: [], support: [], unreadable: [], failureKinds: {},
};
const finish = (code = 0) => {
  out.seconds = seconds();
  const by = (list, key) => list.reduce((a, x) => { a[x[key]] = (a[x[key]] ?? 0) + 1; return a; }, {});
  const verdicts = by(out.tests, 'verdict');
  const reasons = by(out.notJudged, 'why');
  const fresh = out.tests.length + out.notJudged.length;
  const owners = new Set(['skipped']);
  out.summary = {
    newTests: fresh, judged: out.tests.length, verdicts, notJudged: out.notJudged.length, notJudgedByReason: reasons,
    // Kept apart from the reasons the rule gives: a test the copy could not run for lack of setup (D-037).
    redInCopy: reasons['red-in-copy'] ?? 0,
    notJudgedShare: fresh ? Math.round((out.notJudged.length / fresh) * 1000) / 1000 : 0,
    notJudgedShareWithoutRedInCopy: fresh ? Math.round(((out.notJudged.length - (reasons['red-in-copy'] ?? 0)) / fresh) * 1000) / 1000 : 0,
    wouldBeNothingJudged: fresh > 0 && out.tests.length === 0 && out.notJudged.some((t) => !owners.has(t.why)),
    neverRun: out.neverRun.length, notTests: out.notTests.length, outsideAnyTest: out.outsideAnyTest.length,
    support: out.support.length, unreadable: out.unreadable.length, removedTestFiles,
    notFinishedAt600s: out.tests.filter((t) => t.doneAt > STOP_AT).length,
  };
  if (countsOnly) for (const k of ['tests', 'notJudged', 'neverRun', 'notTests', 'outsideAnyTest', 'support', 'unreadable', 'runs']) out[k] = out[k].length;
  console.log(JSON.stringify(out, null, 1));
  process.exit(code);
};
if (!changedTestFiles.length) finish();

// §3.4 — the copy: the tree of the commit, written by git into a folder outside the project.
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'tests-can-fail-probe-')));
const copy = join(tmp, 'copy');
process.on('exit', () => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* the folder is in the temporary directory */ } });
// A child killed by a signal stops the run, and `exit` removes the copy; the 120 s run limit kills with SIGTERM
// too, and is not a stop. The script is synchronous, so a signal to the probe itself (Ctrl-C, a cancelled job)
// ends it at once and can leave the copy in the temporary directory (README).
const run = (cmd, args, opts) => { const r = spawnSync(cmd, args, opts); if (r.signal && r.error?.code !== 'ETIMEDOUT') process.exit(130); return r; };
const fail = (message, detail) => { out.stopped = message; if (detail && !countsOnly) out.detail = String(detail).split('\n').slice(-12).join('\n'); finish(2); };
timed('copy', () => {
  const env = { GIT_INDEX_FILE: join(tmp, 'index') };
  git(['read-tree', head], env);
  git(['checkout-index', '-a', `--prefix=${copy}/`], env);
});
const tracked = new Set(git(['ls-tree', '-r', '--name-only', '-z', head]).split('\0').filter(Boolean));
timed('install', () => {
  let r = run('pnpm', ['install', '--frozen-lockfile', '--offline'], { cwd: copy, encoding: 'utf8' });
  out.install = 'offline';
  if (r.status !== 0) { out.install = 'offline failed; installed with the network'; r = run('pnpm', ['install', '--frozen-lockfile'], { cwd: copy, encoding: 'utf8' }); }
  if (r.status !== 0) fail('the install in the copy failed', r.stdout + r.stderr);
});
const runEnv = { ...process.env };
if (!noSetup && tracked.has('ci/before-verify.sh')) timed('setup', () => {
  const envFile = join(tmp, 'github-env'); writeFileSync(envFile, '');
  const r = run('bash', ['ci/before-verify.sh'], { cwd: copy, encoding: 'utf8', env: { ...process.env, GITHUB_ENV: envFile } });
  out.setup = r.status === 0 ? 'ci/before-verify.sh ran' : 'ci/before-verify.sh failed';
  for (const l of readFileSync(envFile, 'utf8').split('\n')) { const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(l); if (m) runEnv[m[1]] = m[2]; }
});

// §3.3 — a package is judged when vitest is among its dependencies.
const packages = [...tracked].filter((p) => posix.basename(p) === 'package.json' && !p.split('/').includes('node_modules')).map((p) => {
  let json = {}; try { json = JSON.parse(readFileSync(join(copy, p), 'utf8')); } catch { /* not a package this probe reads */ }
  const deps = { ...json.dependencies, ...json.devDependencies, ...json.peerDependencies, ...json.optionalDependencies };
  return { dir: posix.dirname(p) === '.' ? '' : posix.dirname(p), name: json.name, json, vitest: 'vitest' in deps };
}).sort((a, b) => b.dir.length - a.dir.length);
const packageOf = (file) => packages.find((p) => p.dir === '' || file.startsWith(`${p.dir}/`));
const within = (pkg, file) => (pkg.dir ? file.slice(pkg.dir.length + 1) : file);
const loaded = new Map();
const typescriptOf = (pkg) => {
  if (!loaded.has(pkg.dir)) {
    let ts = null;
    for (const from of [join(copy, pkg.dir, 'package.json'), join(copy, 'package.json')]) { try { ts = createRequire(from)('typescript'); break; } catch { /* try the root */ } }
    loaded.set(pkg.dir, ts);
  }
  return loaded.get(pkg.dir);
};
const vitest = (pkg, args) => { out.runnerCalls++; return run(join(copy, pkg.dir, 'node_modules/.bin/vitest'), [...args, ...callWords], { cwd: join(copy, pkg.dir), encoding: 'utf8', env: runEnv, timeout: RUN_LIMIT_MS, maxBuffer: 256 << 20 }); };

// §2 — the changes a source text gets, and the spans of a test file, read with the project's TypeScript.
const parse = (ts, path, text) => {
  const kind = { '.tsx': ts.ScriptKind.TSX, '.jsx': ts.ScriptKind.JSX, '.js': ts.ScriptKind.JS, '.mjs': ts.ScriptKind.JS, '.cjs': ts.ScriptKind.JS }[ext(path)] ?? ts.ScriptKind.TS;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  return sf.parseDiagnostics?.length ? null : sf;
};
const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
function mutants(ts, path, text) {
  const sf = parse(ts, path, text); if (!sf) return null;
  const K = ts.SyntaxKind;
  const SWAP = new Map([[K.EqualsEqualsEqualsToken, '!=='], [K.ExclamationEqualsEqualsToken, '==='], [K.EqualsEqualsToken, '!='], [K.ExclamationEqualsToken, '=='], [K.LessThanToken, '<='], [K.LessThanEqualsToken, '<'], [K.GreaterThanToken, '>='], [K.GreaterThanEqualsToken, '>'], [K.AmpersandAmpersandToken, '||'], [K.BarBarToken, '&&'], [K.PlusToken, '-'], [K.MinusToken, '+'], [K.AsteriskToken, '/'], [K.SlashToken, '*']]);
  const list = [];
  const add = (node, replacement, kind, rank) => list.push({ start: node.getStart(sf), end: node.getEnd(), replacement, kind, rank, line: lineOf(sf, node.getStart(sf)) });
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isImportEqualsDeclaration(n) || ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
    if (ts.isExportDeclaration(n) && n.moduleSpecifier) return;
    if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)) && n.body) {
      if (ts.isBlock(n.body)) add(n.body, '{}', 'body', 0); else add(n.body, 'undefined', 'body', 0);
    }
    if (ts.isIfStatement(n)) { add(n.expression, 'true', 'condition', 1); add(n.expression, 'false', 'condition', 1); }
    if (ts.isConditionalExpression(n)) { add(n.condition, 'true', 'condition', 1); add(n.condition, 'false', 'condition', 1); }
    if (ts.isBinaryExpression(n) && SWAP.has(n.operatorToken.kind)) add(n.operatorToken, SWAP.get(n.operatorToken.kind), 'operator', 2);
    if (n.kind === K.TrueKeyword) add(n, 'false', 'literal', 2);
    if (n.kind === K.FalseKeyword) add(n, 'true', 'literal', 2);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return list;
}
function readFile(ts, path, text) {
  const sf = parse(ts, path, text); if (!sf) return null;
  const tests = []; const expects = []; const imports = []; const reExports = [];
  const rootOf = (e) => { while (e) { if (ts.isIdentifier(e)) return e.text; if (ts.isPropertyAccessExpression(e) || ts.isCallExpression(e)) e = e.expression; else if (ts.isTaggedTemplateExpression(e)) e = e.tag; else return null; } return null; };
  const span = (n) => ({ start: lineOf(sf, n.getStart(sf)), end: lineOf(sf, n.getEnd()) });
  const visit = (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && !n.importClause?.isTypeOnly) imports.push(n.moduleSpecifier.text);
    if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier) && !n.isTypeOnly) reExports.push(n.moduleSpecifier.text);
    if (ts.isCallExpression(n)) {
      const root = rootOf(n.expression);
      if (root === 'it' || root === 'test') { tests.push(span(n)); n.arguments.forEach(visit); return; }
      if (root === 'expect' && (ts.isIdentifier(n.expression) || (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression)))) expects.push(span(n));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { tests, expects, imports, reExports };
}

// §3.6 — the subjects of a test file.
const resolveRelative = (fromFile, spec) => {
  const target = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  if (target.startsWith('..')) return null;
  if (tracked.has(target)) return target;
  const bare = target.replace(/\.(js|jsx|mjs|cjs)$/, '');
  for (const b of new Set([target, bare])) for (const e of EXT) { if (tracked.has(b + e)) return b + e; }
  for (const e of EXT) if (tracked.has(`${target}/index${e}`)) return `${target}/index${e}`;
  return null;
};
const entryOf = (pkg) => {
  const exp = pkg.json.exports; const dot = typeof exp === 'string' ? exp : exp?.['.'];
  const named = [typeof dot === 'string' ? dot : dot?.import ?? dot?.default, pkg.json.module, pkg.json.main].filter((x) => typeof x === 'string');
  for (const c of [...named, 'src/index', 'index']) { const r = resolveRelative(posix.join(pkg.dir, 'x'), `./${c.replace(/^\.\//, '')}`); if (r) return r; }
  return null;
};
function subjectsOf(ts, testFile, read) {
  const found = new Set(); const dropped = { support: new Set(), unreadable: new Set(), nothing: new Set(), language: new Set() };
  const take = (file, depth) => {
    if (!file || found.has(file) || isTestName(file)) return;
    if (!EXT.includes(ext(file))) { dropped.language.add(file); return; }
    if (isSupport(file)) { dropped.support.add(file); return; }
    found.add(file);
    if (depth >= 3) return;
    const r = readFile(ts, file, readFileSync(join(copy, file), 'utf8'));
    for (const spec of r?.reExports ?? []) if (spec.startsWith('.')) take(resolveRelative(file, spec), depth + 1);
  };
  for (const spec of read.imports) {
    if (spec.startsWith('.')) { take(resolveRelative(testFile, spec), 0); continue; }
    const pkg = packages.find((p) => p.name && p.dir !== '' && (spec === p.name || spec.startsWith(`${p.name}/`)));
    if (!pkg) continue;
    const own = changed.filter((f) => f.startsWith(`${pkg.dir}/`) && !isTestName(f) && EXT.includes(ext(f)) && tracked.has(f));
    for (const f of own.length ? own : [entryOf(pkg)]) take(f, 0);
  }
  const beside = testFile.replace(/\.(test|spec)(\.[^./]+)$/, '$2');
  if (beside !== testFile && tracked.has(beside)) take(beside, 0);
  const pools = [];
  for (const f of found) {
    const src = readFileSync(join(copy, f), 'utf8');
    const list = mutants(ts, f, src);
    if (!list) { dropped.unreadable.add(f); continue; }
    if (!list.length) { dropped.nothing.add(f); continue; }
    pools.push({ f, src, list });
  }
  return { pools, dropped };
}

// §3.9 — the changes in order (the README says where this departs from §3.9): every `body` change first, the pull
// request's own lines first within each kind, taking turns across the
// subjects; at most 30 `body` changes, then at most 30 more.
function queueOf(pools) {
  for (const p of pools) { const own = added[p.f] ?? new Set(); p.list.sort((a, b) => (own.has(b.line) - own.has(a.line)) || a.rank - b.rank || a.start - b.start); }
  const turns = (pick) => { const ls = pools.map((p) => p.list.filter(pick)); const q = []; for (let i = 0; q.length < 30 && ls.some((l) => l[i]); i++) for (let k = 0; k < pools.length; k++) if (ls[k][i] && q.length < 30) q.push({ p: pools[k], m: ls[k][i] }); return q; };
  return [...turns((m) => m.kind === 'body'), ...turns((m) => m.kind !== 'body')];
}
const available = (pools) => pools.reduce((n, p) => n + p.list.length, 0);

// §8 — the three things read from the runner: the listing, the result, and a failed test's failureMessages.
const sample = (name, value) => { if (!recordDir) return; mkdirSync(recordDir, { recursive: true }); const f = join(recordDir, `${name}.json`); if (!existsSync(f)) writeFileSync(f, `${JSON.stringify(value, null, 1).split(tmp).join('<copy>')}\n`); };
const tally = (kind) => { out.failureKinds[kind] = (out.failureKinds[kind] ?? 0) + 1; };
function judgeFailure(messages, testAbs, expects) {
  const first = messages?.[0];
  if (typeof first !== 'string') { tally('no failureMessages'); return { counts: false, kind: 'no-message' }; }
  if (/Test timed out|Hook timed out/.test(first)) { tally('timeout'); return { counts: false, kind: 'timeout' }; }
  const name = /^([A-Za-z_$][\w$]*)\s*:/.exec(first)?.[1];
  if (!name) { tally('first word is not an error name'); return { counts: false, kind: 'unnamed' }; }
  if (!CRASH.has(name)) { tally(`counts: ${name}`); return { counts: true, kind: name }; }
  const frame = first.split('\n').find((l) => /^\s+at\s/.test(l));
  const m = frame && /((?:file:\/\/)?\/[^():\s]+):(\d+):\d+\)?\s*$/.exec(frame);
  const file = m?.[1].replace(/^file:\/\//, ''); const line = m ? +m[2] : null;
  if (file === testAbs && expects.some((e) => line >= e.start && line <= e.end)) { tally(`counts: ${name} inside an expect of the test's own file`); return { counts: true, kind: `${name} in expect` }; }
  tally(`crash: ${name} ${!m ? 'with no frame read' : file === testAbs ? 'in the test file, outside an expect' : 'outside the test file'}`);
  return { counts: false, kind: 'crash', crash: { type: name, file: file?.startsWith(copy) ? file.slice(copy.length + 1) : file ?? null, line } };
}
const runFile = (pkg, testFile) => {
  const o = join(tmp, 'result.json'); rmSync(o, { force: true });
  const run = vitest(pkg, ['run', within(pkg, testFile), '--reporter=json', `--outputFile=${o}`]);
  let r = null; try { r = JSON.parse(readFileSync(o, 'utf8')); } catch { /* no result */ }
  return { r, hung: run.error?.code === 'ETIMEDOUT' };
};
const titleOf = (a) => [...(a.ancestorTitles ?? []).filter(Boolean), a.title].join(' > ');

// §3.5 — the listing, and which tests are new.
const perFile = [];
for (const pkg of packages) {
  const files = changedTestFiles.filter((f) => packageOf(f) === pkg);
  if (!files.length) continue;
  if (!pkg.vitest) { for (const f of files) out.notJudged.push({ file: f, name: null, why: 'other-runner' }); continue; }
  const ts = typescriptOf(pkg);
  if (!ts) fail('a judged package has no typescript for this probe to read source with');
  const listed = timed('listing', () => vitest(pkg, ['list', '--json', '--includeTaskLocation']));
  let all; try { all = JSON.parse(listed.stdout.slice(listed.stdout.indexOf('['))); } catch { fail('the test runner gave no listing this probe can read', listed.stdout + listed.stderr); }
  let version = null; try { version = JSON.parse(readFileSync(join(copy, pkg.dir, 'node_modules/vitest/package.json'), 'utf8')).version; } catch { /* not found */ }
  out.runs.push({ package: countsOnly ? undefined : pkg.dir, vitest: version, listed: all.length, withoutLine: all.filter((t) => !t.location?.line).length });
  sample(`vitest-${version}-listing`, all.filter((t) => files.some((f) => join(copy, f) === t.file)).slice(0, 6));
  for (const f of files) {
    const mine = all.filter((t) => t.file === join(copy, f));
    if (!mine.length) { (isRunnable(f) ? out.neverRun : out.notTests).push({ file: f }); continue; }
    const read = readFile(ts, f, readFileSync(join(copy, f), 'utf8'));
    if (!read) out.unreadable.push({ file: f, reason: 'the test file could not be parsed' });
    const lines = added[f] ?? new Set(); const gone = removedAfter[f] ?? [];
    const groups = new Map();
    for (const t of mine) {
      const line = t.location?.line ?? 0;
      const spans = (read?.tests ?? []).filter((s) => line >= s.start && line <= s.end).sort((a, b) => (a.end - a.start) - (b.end - b.start));
      const call = spans.find((s) => s.start === line) ?? spans[0] ?? null;
      const key = call ? call.start : line;
      if (!groups.has(key)) groups.set(key, { name: t.name, line: key, call, rows: 1, names: new Set([t.name]) }); else { const g = groups.get(key); g.rows++; g.names.add(t.name); }
    }
    const fresh = [...groups.values()].filter((g) => !read || !g.call || [...lines].some((l) => l >= g.call.start && l <= g.call.end) || gone.some((n) => n >= g.call.start && n + 1 <= g.call.end));
    if (!fresh.length) { out.outsideAnyTest.push({ file: f }); continue; }
    perFile.push({ pkg, ts, file: f, read: read ?? { tests: [], expects: [], imports: [], reExports: [] }, fresh });
  }
}

// §3.6, §3.8 — subjects, then the baseline in the clean copy.
for (const unit of perFile) {
  const { pools, dropped } = subjectsOf(unit.ts, unit.file, unit.read);
  for (const f of dropped.support) if (!out.support.some((s) => s.file === f)) out.support.push({ file: f });
  for (const f of dropped.unreadable) if (!out.unreadable.some((s) => s.file === f)) out.unreadable.push({ file: f, reason: 'could not be parsed' });
  unit.pools = pools; unit.queue = queueOf(pools);
  if (!pools.length) {
    const why = dropped.unreadable.size ? 'could-not-be-parsed' : dropped.language.size ? 'other-language' : dropped.nothing.size ? 'no-change-to-make' : dropped.support.size ? 'support-only' : 'no-subject';
    for (const g of unit.fresh) out.notJudged.push({ file: unit.file, name: g.name, why });
    unit.fresh = [];
    continue;
  }
  const { r } = timed('baseline', () => runFile(unit.pkg, unit.file));
  if (!r) { for (const g of unit.fresh) out.notJudged.push({ file: unit.file, name: g.name, why: 'red-in-copy' }); unit.fresh = []; continue; }
  sample(`vitest-${out.runs.at(-1)?.vitest}-result-passed`, { ...r, testResults: r.testResults.map((s) => ({ ...s, assertionResults: s.assertionResults.slice(0, 2) })) });
  const results = r.testResults.flatMap((s) => s.assertionResults);
  const loads = !r.testResults.some((s) => s.status === 'failed' && s.assertionResults.length === 0);
  unit.fresh = unit.fresh.filter((g) => {
    const mine = results.filter((a) => g.names.has(titleOf(a)));
    const why = !loads || mine.some((a) => a.status === 'failed') ? 'red-in-copy' : mine.length && mine.every((a) => ['skipped', 'pending', 'todo', 'disabled'].includes(a.status)) ? 'skipped' : !mine.length ? 'red-in-copy' : null;
    if (why) out.notJudged.push({ file: unit.file, name: g.name, why });
    return !why;
  });
}

// §3.9 — judging, one test file at a time, the file with the fewest changes to try first.
const judging = perFile.filter((u) => u.fresh.length).sort((a, b) => a.queue.length - b.queue.length);
timed('judging', () => {
  for (const unit of judging) {
    const testAbs = join(copy, unit.file);
    const recs = unit.fresh.map((g) => ({ file: unit.file, name: g.name, line: g.line, rows: g.rows, names: g.names, subjects: unit.pools.length, changesAvailable: available(unit.pools), tried: 0, failedOn: null, crashes: 0, lastCrash: null, dropped: 0 }));
    for (const { p, m } of unit.queue) {
      const open = recs.filter((r) => !r.failedOn);
      if (!open.length) break;
      for (const r of open) r.tried++;
      writeFileSync(join(copy, p.f), p.src.slice(0, m.start) + m.replacement + p.src.slice(m.end));
      let res;
      try { res = runFile(unit.pkg, unit.file); } finally { writeFileSync(join(copy, p.f), p.src); }
      const broke = !res.r || res.r.testResults.some((s) => s.status === 'failed' && s.assertionResults.length === 0);
      if (broke) { tally(res.hung ? 'dropped: the run hung' : !res.r ? 'dropped: no result' : 'dropped: the test file did not load'); for (const r of open) r.dropped++; continue; }
      for (const a of res.r.testResults.flatMap((s) => s.assertionResults)) {
        if (a.status !== 'failed') continue;
        const rec = open.find((r) => r.names.has(titleOf(a)) && !r.failedOn);
        if (!rec) continue;
        const v = judgeFailure(a.failureMessages, testAbs, unit.read.expects);
        sample(`vitest-${out.runs.at(-1)?.vitest}-failure-${v.kind.replace(/[^A-Za-z]+/g, '-')}`, a);
        if (v.counts) rec.failedOn = { file: p.f, line: m.line, kind: m.kind, by: v.kind };
        else if (v.crash) { rec.crashes++; rec.lastCrash = v.crash; }
      }
    }
    const again = runFile(unit.pkg, unit.file);
    const red = new Set((again.r?.testResults ?? []).flatMap((s) => s.assertionResults).filter((a) => a.status === 'failed').map(titleOf));
    for (const r of recs) {
      const flaky = !again.r || [...r.names].some((n) => red.has(n));
      r.verdict = flaky ? 'flaky' : r.failedOn ? 'passes' : r.crashes ? 'only-crashes' : 'kills-nothing';
      r.doneAt = seconds();
      delete r.names;
      if (countsOnly) { delete r.name; delete r.file; delete r.failedOn; delete r.lastCrash; }
      out.tests.push(r);
    }
  }
});
if (countsOnly) for (const t of out.notJudged) { delete t.file; delete t.name; }
finish();
