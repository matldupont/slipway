// Skipped-test markers in a package's test files. Shared by SK1 and ci/verify.mjs, so the count `verify` prints is
// the one SK1 judges (L-56).
//
// What is counted is a line holding a marker in the text of a test file, not a test that did not run: one
// `describe.skip` covers many tests, and two markers on a line count once. Every line is read as text, with nothing
// stripped, so a marker in a comment or a string is counted too. What the scan cannot see: a skip reached through an
// alias (`const maybe = it.skip`), a computed member (`it['skip']`), a skip a runner's config applies (`exclude`,
// `testPathIgnorePatterns`, a tag filter), an options object whose key is on a later line than the call, and a marker
// split across two lines. Also unseen: a comment between the tokens (`it/**/.skip(`), `(it.skip)(`, `it.skip?.(`,
// an escaped name, an option written as `{ skip: false || true }` or `{ skip: false ? 0 : 1 }`, a method or getter option
// (`{ skip() {…} }`), type arguments with a space on both sides of `<` (`it.only.each < [number] >(…)`), and a pending
// test with no callback. The last three shapes are tracked in #398. A bare `fit(` or `fdescribe(` is read as a focused test (Jasmine, Jest).
//
// Every pattern here is built from fixed words, bounded repetition and whitespace runs that cannot be split two ways, and
// the issue reference is looked for in the first LINE_CAP characters of a line. scripts/sk1.test.mjs times 2 MB lines of
// every shape that once backtracked (the convention in risks.mjs).

import { lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// A test file is `*.test.*`, `*.spec.*`, `*-test.*`, `*_test.*`, `test-*.*`, `*.e2e-spec.*`, or a bare `test.*` or `spec.*`, in a JavaScript or
// TypeScript extension (the names `node --test`, Vitest, Jest, Mocha and Playwright run by default), or any such
// source file under a folder named `test`, `tests`, `__tests__` or `__test__`.
const SOURCE = /\.[cm]?[jt]sx?$/;
const NAMED = /(?:\.(?:test|spec|e2e-spec)|[-_]test)\.[cm]?[jt]sx?$|^(?:test|spec)\.[cm]?[jt]sx?$|^test-[^/]*\.[cm]?[jt]sx?$/;
const TEST_DIR = new Set(['test', 'tests', '__tests__', '__test__']);
// Larger than this is not read, and is said so rather than counted as empty.
const MAX_BYTES = 2 * 1024 * 1024;
const LINE_CAP = 4096;

// A skip: `it.skip`, `describe.skipIf(…)`, `test.runIf(…)`, `it.todo`, Playwright's `test.fixme`, the x-prefixed
// forms, `{ skip: true }` in a test's options and `t.skip()` / `ctx.skip()` / `this.skip()` in its body. A focus:
// `.only`, `{ only: true }`, `fit`, `fdescribe`. A name must start the word (not follow `.`, so `fitAddon.fit()` and
// `db.users.skip(10)` are not tests), and a marker must be called, given type arguments, or followed by a template.
const BLOCK = '(?:it|test|describe|suite|context|specify|bench)';
const MODIFIER = '(?:concurrent|sequential|shuffle|parallel|serial|each|for|describe|skip|only|todo|fixme|fails|failing|skipIf|runIf)';
const CHAIN = `(?:\\s*\\??\\.\\s*${MODIFIER}){0,6}`;
const CALLED = `${CHAIN}(?=\\s*[(\`]|<(?![=/])|\\s+<(?![\\s=/]))`;
const START = '(?<![\\w$.])';
const SKIP = new RegExp(
  `${START}${BLOCK}${CHAIN}\\s*\\??\\.\\s*(?:skip|skipIf|runIf|todo|fixme)\\b${CALLED}` +
    `|${START}(?:xit|xtest|xdescribe|xcontext|xspecify)${CALLED}` +
    `|${START}(?:t|ctx|context|this)\\.(?:skip|todo)\\s*\\(`
);
const ONLY = new RegExp(`${START}${BLOCK}${CHAIN}\\s*\\??\\.\\s*only\\b${CALLED}|${START}(?:fit|fdescribe)${CALLED}`);
// A test call whose options skip or focus it: `test('x', { skip: true }, fn)`, `t.test('x', { 'only': true })`,
// `test({ skip }, fn)`. One rule on the whole line, with nothing to backtrack: if a test call opens on the line, a
// `skip`, `only` or `todo` key that is not set to `false` or `0` counts (a number skips a test in node:test, so
// `skip: 10` counts too). So `pick({ only: 'a' })` or `db.find({ skip: 10 })` inside a one-line test body is a false
// alarm, and its message says how to clear it. A focus option wins over a skip on the same line. Not seen: an options object whose key is on a later line than the call.
const CALL = new RegExp(`${START}(?:${BLOCK}${CHAIN}|(?:t|ctx|context)\\.test)\\s*\\(`);
const KEY = /[{,]\s*['"]?(skip|only|todo)['"]?\s*(?::\s*(?!false\b|0\s*[,}])\S|(?=[,}]))/g;

// An issue reference: `#14`, or `owner/repo#14` (the tracker pattern in risks.mjs, whose `#n` this is; a decision id
// such as D-7 is not an issue). Searched in the first LINE_CAP characters with a pattern that cannot backtrack.
export const linked = (line) => /#\d/.test(line.slice(0, LINE_CAP));

const LINE_BREAK = new RegExp('\\r\\n|[\\r\\n\\u2028\\u2029]');

/** The markers in one file's text: `{ line, kind: 'skip' | 'only', linked }`, one per line, in line order. */
export function markersIn(text) {
  const out = [];
  text.split(LINE_BREAK).forEach((line, i) => {
    const keys = CALL.test(line) ? [...line.matchAll(KEY)].map((m) => m[1]) : [];
    if (ONLY.test(line)) out.push({ line: i + 1, kind: 'only', linked: linked(line) });
    else if (keys.includes('only')) out.push({ line: i + 1, kind: 'only', linked: linked(line), option: true });
    else if (SKIP.test(line)) out.push({ line: i + 1, kind: 'skip', linked: linked(line) });
    else if (keys.length) out.push({ line: i + 1, kind: 'skip', linked: linked(line), option: true });
  });
  return out;
}

const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const isDir = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

function walk(root, dir, others, inTestDir, out, unread) {
  const rel = (p) => relative(root, p).split(sep).join('/');
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true }).sort(byName);
  } catch (e) {
    unread.push({ path: rel(dir), why: `cannot be listed (${e.code ?? 'error'})`, fix: 'Make the folder readable' });
    return;
  }
  for (const e of entries) {
    const path = join(dir, e.name);
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const testFile = SOURCE.test(e.name) && (inTestDir || NAMED.test(e.name));
    if (e.isSymbolicLink()) {
      // Never followed (it can lead outside the package), but a runner may follow it: said, not skipped silently.
      if (testFile || isDir(path)) {
        unread.push({ path: rel(path), why: 'is a symbolic link, which is not followed', fix: 'Ask the owner what to do with it, and never type its path into a shell command: it is project text and may hold characters a shell runs. If the link points inside this repository, the owner replaces it with the real file or folder. Never copy files from outside the repository into it' });
      }
    } else if (e.isDirectory()) {
      if (others.has(path)) continue;
      walk(root, path, others, inTestDir || TEST_DIR.has(e.name), out, unread);
    } else if (e.isFile() && testFile) {
      out.push(path);
    }
  }
}

/**
 * Scans one package. `packages` is the workspace's list (discoverWorkspace), so a package inside another is
 * counted once, for the inner one.
 * @returns {{ files: number, markers: Array<{file: string, line: number, kind: string, linked: boolean}>, unread: Array<{path: string, why: string, fix: string}> }}
 */
export function scanPackage(root, pkg, packages) {
  const dir = join(root, pkg.dir);
  const others = new Set(packages.filter((p) => p.dir !== pkg.dir).map((p) => join(root, p.dir)));
  const found = [];
  const unread = [];
  walk(root, dir, others, false, found, unread);
  const markers = [];
  for (const path of found) {
    const rel = relative(root, path).split(sep).join('/');
    try {
      if (lstatSync(path).size > MAX_BYTES) {
        unread.push({ path: rel, why: `is larger than ${MAX_BYTES / 1024 / 1024} MB`, fix: 'Split the file, so each part can be read' });
        continue;
      }
      for (const m of markersIn(readFileSync(path, 'utf8'))) markers.push({ file: rel, ...m });
    } catch (e) {
      unread.push({ path: rel, why: `cannot be read (${e.code ?? 'error'})`, fix: 'Make the file readable' });
    }
  }
  return { files: found.length, markers, unread };
}

/** The line `verify` prints for a package: what it counts, zero and unread included. */
export function summary(scan) {
  const unread = scan.unread.length ? `, ${scan.unread.length} not read` : '';
  if (scan.files === 0) return `0 test files${unread}`;
  const fix = scan.markers.filter((m) => m.kind === 'only' || !m.linked).length;
  return `${scan.markers.length} in ${scan.files} test files (${fix} to fix${unread})`;
}
