// Skipped-test markers in a package's test files. Shared by SK1 and ci/verify.mjs, so the count `verify` prints is
// the one SK1 judges (L-56).
//
// What is counted is a marker in the text of a test file, not a test that did not run: one `describe.skip` covers
// many tests. Every line is read as text, with nothing stripped, so a marker in a comment or a string is counted
// too. What the scan cannot see: a skip reached through an alias (`const maybe = it.skip`), a computed member
// (`it['skip']`), a skip a runner's config applies (`exclude`, `testPathIgnorePatterns`, a tag filter) and a
// marker split across two lines.

import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { TRACKER } from './risks.mjs';

// `*.test.*` and `*.spec.*` in a JavaScript or TypeScript extension, and any such file under `__tests__/` or `tests/`.
const SOURCE = /\.[cm]?[jt]sx?$/;
const NAMED = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const TEST_DIR = new Set(['__tests__', 'tests']);
// Larger than this is not read, and is said so rather than counted as empty.
const MAX_BYTES = 2 * 1024 * 1024;

// A skip: `it.skip`, `describe.skipIf(…)`, `test.runIf(…)`, `it.todo`, the x-prefixed forms. `describe.concurrent.skip`
// and `it.skip.each` read too. A focus: `.only`, `fit`, `fdescribe`.
const BLOCK = '(?:it|test|describe|suite|context|specify|bench)';
const SKIP = new RegExp(`\\b${BLOCK}(?:\\.\\w+)*\\.(?:skip|skipIf|runIf|todo)\\b|\\b(?:xit|xtest|xdescribe|xcontext|xspecify)\\b`);
const ONLY = new RegExp(`\\b${BLOCK}(?:\\.\\w+)*\\.only\\b|\\b(?:fit|fdescribe)\\s*\\(`);
// An issue reference: the tracker pattern risks.mjs holds, minus a decision id (D-7 is not an issue).
const TRACKER_ALL = new RegExp(TRACKER.source, 'g');
export const linked = (line) => (line.match(TRACKER_ALL) ?? []).some((m) => m.includes('#'));

/** The markers in one file's text: `{ line, kind: 'skip' | 'only', linked }`, in line order. */
export function markersIn(text) {
  const out = [];
  text.split(/\r?\n|\u2028|\u2029/).forEach((line, i) => {
    if (ONLY.test(line)) out.push({ line: i + 1, kind: 'only', linked: linked(line) });
    else if (SKIP.test(line)) out.push({ line: i + 1, kind: 'skip', linked: linked(line) });
  });
  return out;
}

function walk(dir, others, inTestDir, out, unread) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  } catch (e) {
    unread.push({ path: dir, why: `cannot list the folder (${e.code ?? 'error'})` });
    return;
  }
  for (const e of entries) {
    const path = join(dir, e.name);
    if (e.isSymbolicLink()) continue; // never followed: a link can lead outside the package
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || others.has(path)) continue;
      walk(path, others, inTestDir || TEST_DIR.has(e.name), out, unread);
    } else if (e.isFile() && SOURCE.test(e.name) && (inTestDir || NAMED.test(e.name))) {
      out.push(path);
    }
  }
}

/**
 * Scans one package. `packages` is the workspace's list (discoverWorkspace), so a package inside another is
 * counted once, for the inner one.
 * @returns {{ files: number, markers: Array<{file: string, line: number, kind: string, linked: boolean}>, unread: Array<{path: string, why: string}> }}
 */
export function scanPackage(root, pkg, packages) {
  const dir = join(root, pkg.dir);
  const others = new Set(packages.filter((p) => p.dir !== pkg.dir).map((p) => join(root, p.dir)));
  const found = [];
  const unread = [];
  walk(dir, others, false, found, unread);
  const markers = [];
  for (const path of found) {
    const rel = relative(root, path).split(sep).join('/');
    try {
      if (lstatSync(path).size > MAX_BYTES) {
        unread.push({ path: rel, why: `larger than ${MAX_BYTES / 1024 / 1024} MB` });
        continue;
      }
      for (const m of markersIn(readFileSync(path, 'utf8'))) markers.push({ file: rel, ...m });
    } catch (e) {
      unread.push({ path: rel, why: `cannot be read (${e.code ?? 'error'})` });
    }
  }
  return { files: found.length, markers, unread };
}

/** The line `verify` prints for a package: what it counts, zero included. */
export function summary(scan) {
  if (scan.files === 0) return '0 test files';
  const none = scan.markers.filter((m) => m.kind === 'only' || !m.linked).length;
  return `${scan.markers.length} in ${scan.files} test files (${none} with no issue)`;
}
