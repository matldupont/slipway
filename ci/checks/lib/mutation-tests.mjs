// Which tests the tests-can-fail step judges, and which code it changes for them (dev/features/tests-can-fail.md
// §3.3, §3.5, §3.6, §3.9). Reads the copy of HEAD and the parser's answers; starts nothing.

import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { discoverWorkspace } from './workspace.mjs';
import { imports, mutants, reExports } from './mutants.mjs';
import { EXTENSIONS, looksLikeTest } from './mutation-git.mjs';
import { notRun } from './runner-output.mjs';

// §3.6: code written for the tests, never a subject. The list is closed: it changes by an edit to the Contract.
const SUPPORT_DIRS = new Set(['__tests__', '__mocks__', '__fixtures__', 'test', 'tests', 'fixtures', 'mocks']);
const SUPPORT_NAMES = new Set(['test-utils', 'factories', 'setup']);
const DEPTH = 3;
const CAP = 30;
export const NOT_SOURCE = 'not JavaScript or TypeScript';

// Matched on the path inside the repository (AR-10 of the 0.3 review): where the checkout sits never makes a file support.
export function isSupport(path) {
  const parts = path.split('/');
  return parts.slice(0, -1).some((p) => SUPPORT_DIRS.has(p)) || SUPPORT_NAMES.has(parts.at(-1).split('.')[0]);
}

// A parser call that throws (a limit the parser did not foresee) reads as a file it cannot read.
export function safely(read, path, text) {
  try {
    return read(path, text);
  } catch {
    return { unreadable: 'the parser stopped on it' };
  }
}

const DEP_KEYS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
/**
 * The workspace's packages, each with its folder ('' for the root), its package.json and whether it uses Vitest. A
 * project with no workspace packages is its root package alone.
 */
export function workspacePackages(copy) {
  const ws = discoverWorkspace(copy);
  const read = (dir) => JSON.parse(readFileSync(join(copy, dir, 'package.json'), 'utf8'));
  const list = ws.packages.length ? ws.packages.map((p) => ({ name: p.name, dir: p.dir.split('\\').join('/') })) : [{ name: ws.root.name, dir: '' }];
  return list.map((p) => {
    const json = read(p.dir);
    const vitest = DEP_KEYS.some((k) => json[k] && typeof json[k] === 'object' && 'vitest' in json[k]);
    return { ...p, json, vitest };
  }).sort((a, b) => b.dir.length - a.dir.length);
}
export const packageOf = (packages, file) => packages.find((p) => p.dir === '' || file.startsWith(`${p.dir}/`)) ?? null;
export const within = (pkg, file) => (pkg.dir ? file.slice(pkg.dir.length + 1) : file);

// Where the runner places a test: the offset of its line and column (both counted from 1) in the file's text, or null
// when that place is not in the text. A test belongs to the call one of whose points (spans()) is its place (#655).
export function placeIn(text) {
  const starts = [0];
  for (let at = text.indexOf('\n'); at >= 0; at = text.indexOf('\n', at + 1)) starts.push(at + 1);
  return ({ line, column }) => {
    if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1 || column < 1 || line > starts.length) return null;
    const offset = starts[line - 1] + column - 1;
    return offset < (line < starts.length ? starts[line] - 1 : text.length) ? offset : null;
  };
}
// The test call a place is one of the points of, or null.
const callAt = (calls, offset) => (offset === null ? null : calls.find((c) => c.points.includes(offset)) ?? null);

/**
 * The new tests of one test file (§3.5), from the runner's report of a clean run (or its listing, under the
 * mechanical excuse). Each test belongs to the call its place (its line and column) is a
 * point of, never to a call it only shares a line with or sits inside, and each is its own entry. A test is new when a changed line
 * falls inside its own call, or a hunk that only removes lines sits inside it. When `read` is unreadable, or a test
 * is at no point of a call spans() knows (an alias, test.extend), or spans() trusts no place in the file (a tagged
 * template, a source map comment), every test of the file is new, each judged on its own; a changed call it reads
 * with no test in it is still named. An entry is `run` when the clean run ran it, and `skip` when its call, or a
 * describe around it, says skip; `read` when the step found its call; `line` is its call's first line.
 * @param {Array<{ name: string, line: number, column: number, status?: string }>} reported
 * @returns {{ groups: Array<{ name: string, line: number, at: { line: number, column: number }, run: boolean, skip: boolean, read: boolean }>, outside: boolean, every: boolean, untrusted: string | null, unreported: Array<{ line: number, skip: boolean, untrusted: string | null }> }}
 */
export function newTests(reported, read, { added, removedAfter }, text) {
  const calls = read.unreadable ? [] : read.tests;
  const place = placeIn(text);
  // A file spans() trusts no place in: no test is tied to a call by its place.
  const untrusted = read.unreadable ? null : read.untrusted;
  const owner = reported.map((t) => (untrusted ? null : callAt(calls, place(t))));
  const every = Boolean(read.unreadable) || Boolean(untrusted) || owner.some((c) => !c);
  const marks = (call) => [...added].some((n) => n >= call.first && n <= call.last) || removedAfter.some((n) => n >= call.first && n + 1 <= call.last);
  const groups = reported.map((t, i) => {
    const found = owner[i];
    return { name: t.name, line: every || !found ? t.line : found.first, at: { line: t.line, column: t.column }, call: found, run: t.status === undefined || !notRun(t.status), skip: found?.skip === true, read: Boolean(found) };
  });
  const fresh = groups.filter((g) => every || marks(g.call));
  const inAnyCall = (n) => calls.some((c) => n >= c.first && n <= c.last);
  const outside = !every && ([...added].some((n) => !inAnyCall(n)) || removedAfter.some((n) => !calls.some((c) => n >= c.first && n + 1 <= c.last)));
  // A changed call the runner places no test in: gated by a condition, an empty table, or never called (§3.5).
  // In a file whose places are not trusted, the step cannot tell such a call from one whose tests ran: it names each.
  const unreported = calls.filter((c) => marks(c) && !owner.includes(c)).map((c) => ({ line: c.first, skip: c.skip === true, untrusted }));
  return { groups: fresh.map(({ call, ...g }) => g), outside, every, untrusted, unreported };
}

// §3.8: a new test the clean run skips is the owner's skip only when its own call, or a describe around it, says so;
// any other is narrowed, a reason the owner did not give.
export const skippedEntry = (file, g) => (g.skip
  ? { file, name: g.name, why: 'skipped', detail: null }
  : { file, name: g.name, why: 'narrowed', detail: g.read ? 'the run skips it, and its call holds no skip' : 'the run skips it, in a call this step cannot read for a skip' });
// §3.5: a changed call the runner reports no test in is named by its line, by the same rule; in a file whose places are
// not trusted, every changed call is, since the step cannot tell.
export const unreportedEntry = (file, c) => (c.untrusted
  ? { file, name: null, why: 'narrowed', detail: `this step cannot tell whether the runner ran a test in the call at line ${c.line}, since ${c.untrusted} in the file moves where the runner says a test is` }
  : c.skip
  ? { file, name: null, why: 'skipped', detail: `the runner reports no test in the call at line ${c.line}, which says skip` }
  : { file, name: null, why: 'narrowed', detail: `the runner reports no test in the call at line ${c.line}` });

// A relative import, resolved to a tracked file inside the repository: as written, with each extension, `.js` read as
// its TypeScript source, or as a folder's index.
function resolve(tracked, fromFile, spec) {
  const target = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  if (target === '..' || target.startsWith('../') || posix.isAbsolute(target)) return null;
  if (tracked.has(target)) return target;
  const bare = target.replace(/\.(?:[cm]?js|jsx)$/, '');
  for (const b of new Set([target, bare])) for (const e of EXTENSIONS) if (tracked.has(b + e)) return b + e;
  for (const e of EXTENSIONS) if (tracked.has(`${target}/index${e}`)) return `${target}/index${e}`;
  return null;
}

function entryOf(tracked, pkg) {
  const exp = pkg.json.exports;
  const dot = typeof exp === 'string' ? exp : exp?.['.'];
  const named = [typeof dot === 'string' ? dot : dot?.import ?? dot?.default, pkg.json.module, pkg.json.main].filter((x) => typeof x === 'string');
  const at = posix.join(pkg.dir || '.', 'package.json');
  for (const c of [...named, 'src/index', 'index']) {
    const found = resolve(tracked, at, `./${c.replace(/^\.\//, '')}`);
    if (found) return found;
  }
  return null;
}

/**
 * The subjects of one test file (§3.6), each with the changes it can get, and what was dropped and why.
 * @returns {{ pools: Array<{ file: string, text: string, list: object[] }>, support: string[], unreadable: Array<{ file: string, reason: string }>, nothing: string[], followed: number }}
 */
export function subjectsOf({ copy, tracked, packages, changed, testFile, testText }) {
  const found = new Set();
  const support = new Set();
  const read = (file) => readFileSync(join(copy, file), 'utf8');
  const take = (file, depth) => {
    if (!file || found.has(file) || support.has(file) || looksLikeTest(file) && !isSupport(file)) return;
    if (isSupport(file)) {
      support.add(file);
      return;
    }
    found.add(file);
    if (depth >= DEPTH) return;
    const paths = safely(reExports, file, read(file));
    if (Array.isArray(paths)) for (const spec of paths) take(resolve(tracked, file, spec), depth + 1);
  };
  const specs = safely(imports, testFile, testText);
  // A test file whose imports cannot be read has none followed; it is named, and what is beside it still counts.
  const unreadable = specs.unreadable ? [{ file: testFile, reason: specs.unreadable }] : [];
  for (const spec of Array.isArray(specs) ? specs : []) {
    if (spec.startsWith('.')) {
      take(resolve(tracked, testFile, spec), 0);
      continue;
    }
    const pkg = packages.find((p) => p.name && p.dir !== '' && (spec === p.name || spec.startsWith(`${p.name}/`)));
    if (!pkg) continue;
    const own = changed.filter((f) => f.startsWith(`${pkg.dir}/`) && !looksLikeTest(f) && !isSupport(f) && EXTENSIONS.some((e) => f.endsWith(e)) && tracked.has(f));
    for (const f of own.length ? own : [entryOf(tracked, pkg)]) take(f, 0);
  }
  const beside = testFile.replace(/\.(?:test|spec)(\.[^./]+)$/, '$1');
  if (beside !== testFile) take(resolve(tracked, testFile, `./${posix.basename(beside)}`), 0);
  const pools = [];
  const nothing = [];
  for (const file of found) {
    const text = read(file);
    const list = safely(mutants, file, text);
    if (list.unreadable) unreadable.push({ file, reason: list.unreadable });
    else if (!list.length) nothing.push(file);
    else pools.push({ file, text, list });
  }
  return { pools, support: [...support], unreadable, nothing, followed: found.size + support.size + (specs.unreadable ? 1 : 0) };
}

// Why a test file with no subject left has its new tests not judged (§3.6).
export function whyNoSubject({ followed, support, unreadable, nothing }) {
  if (!followed) return 'no-subject';
  if (support.length === followed) return 'support-only';
  if (unreadable.some((u) => u.reason !== NOT_SOURCE)) return 'could-not-be-parsed';
  if (unreadable.length) return 'other-language';
  return nothing.length ? 'no-change-to-make' : 'no-subject';
}

/**
 * The changes to try for one test file (§3.9): `body` changes first, then the rest, the pull request's own lines first
 * within each, taking turns across the subjects; at most 30 of each. Also how many of each kind there were.
 * @param {(file: string) => Set<number>} ownLines  the lines the change adds to a subject
 */
export function queueOf(pools, ownLines) {
  const sorted = pools.map((p) => {
    const own = ownLines(p.file);
    return { pool: p, list: [...p.list].sort((a, b) => Number(own.has(b.line)) - Number(own.has(a.line))) };
  });
  const turns = (pick) => {
    const lists = sorted.map((s) => s.list.filter(pick));
    const queue = [];
    for (let i = 0; queue.length < CAP && lists.some((l) => l[i]); i += 1) {
      for (let k = 0; k < lists.length && queue.length < CAP; k += 1) if (lists[k][i]) queue.push({ pool: sorted[k].pool, change: lists[k][i] });
    }
    return queue;
  };
  const isBody = (c) => c.kind === 'body';
  const body = pools.reduce((n, p) => n + p.list.filter(isBody).length, 0);
  const other = pools.reduce((n, p) => n + p.list.length, 0) - body;
  return { queue: [...turns(isBody), ...turns((c) => !isBody(c))], body, other };
}
