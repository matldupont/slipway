// What the tests-can-fail step reads from git (dev/features/tests-can-fail.md §3.1, §3.2, §3.4): the default branch,
// the merge base, which test files the change touches and which lines, and the copy of HEAD outside the project.
// Every call goes through trustedGit's environment, and nothing here writes to the project or its .git.

import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { posix } from 'node:path';
import { trustedEnvAt, trustedGit } from './manifest.mjs';

export const EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'];

// §3.2: a file that looks like a test, in any language; a snapshot is the runner's own, never one.
export function looksLikeTest(path) {
  const parts = path.split('/');
  if (parts.includes('__snapshots__') || path.endsWith('.snap')) return false;
  return parts.slice(0, -1).includes('__tests__') || /\.(?:test|spec)\.[^/]+$/.test(path);
}
// §3.5: a name a runner would pick up, so a file of it no call lists is a finding.
export const isRunnableName = (path) => EXTENSIONS.some((e) => path.endsWith(`.test${e}`) || path.endsWith(`.spec${e}`));

const git = (root, args) => trustedGit(root, args);
const tryGit = (root, args) => {
  try {
    return git(root, args).trim();
  } catch {
    return null;
  }
};

/**
 * The branch the change is diffed from (§3.1, AR-6 of the 0.4 review): origin's default branch, else the local default
 * branch, as /work-ticket finds its {base}. Null when there is neither.
 */
export function defaultBranch(root) {
  const head = tryGit(root, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  if (head?.startsWith('refs/remotes/origin/')) return head.slice('refs/remotes/'.length);
  for (const name of ['origin/main', 'origin/master', 'main', 'master']) {
    const ref = name.startsWith('origin/') ? `refs/remotes/${name}` : `refs/heads/${name}`;
    if (tryGit(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])) return name;
  }
  return null;
}
export const NO_DEFAULT =
  'This step diffs the change from the default branch, and found none: no origin/main, origin/master, main or master. Fetch it (`git fetch origin`), then run `pnpm tests-can-fail` again.';

export const revParse = (root, rev) => git(root, ['rev-parse', '--verify', `${rev}^{commit}`]).trim();
export const mergeBase = (root, a, b) => git(root, ['merge-base', a, b]).trim();

/**
 * The files the change touches (§3.2): each changed test file by its path at head (and whether the change adds it),
 * the count removed or renamed away from a test name, and every path changed at head.
 */
export function changedFiles(root, base, head) {
  const words = git(root, ['diff', '--name-status', '-z', '-M', '--no-ext-diff', base, head]).split('\0');
  const tests = [];
  const paths = [];
  let removed = 0;
  for (let i = 0; i < words.length - 1; ) {
    const status = words[i++];
    if (status.startsWith('R') || status.startsWith('C')) {
      const from = words[i++];
      const to = words[i++];
      paths.push(to);
      if (looksLikeTest(to)) tests.push({ file: to, from, added: false });
      else if (looksLikeTest(from) && status.startsWith('R')) removed += 1;
    } else {
      const path = words[i++];
      if (status === 'D') {
        if (looksLikeTest(path)) removed += 1;
        continue;
      }
      paths.push(path);
      if (looksLikeTest(path)) tests.push({ file: path, from: path, added: status === 'A' });
    }
  }
  return { tests, paths, removed };
}

/**
 * The lines a change adds to one file and the places it only removes lines (§3.1): `git diff -U0 -M -w
 * --ignore-blank-lines`, so a line whose only change is whitespace, or a blank line, is no changed line. A hunk that
 * only removes lines sits after line `n` of the new file (`@@ -12,2 +11,0 @@` sits after line 11).
 */
export function changedLines(root, base, head, { file, from }) {
  const args = ['diff', '-U0', '-M', '-w', '--ignore-blank-lines', '--no-color', '--no-ext-diff', base, head, '--'];
  const out = git(root, from === file ? [...args, file] : [...args, from, file]);
  const added = new Set();
  const removedAfter = [];
  for (const m of out.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    if (count === 0) removedAfter.push(start);
    for (let n = start; n < start + count; n += 1) added.add(n);
  }
  return { added, removedAfter };
}

// The tracked files at head that are plain files (no link, no submodule): only these are read or changed in the copy.
export function trackedFiles(root, head) {
  const files = new Set();
  for (const entry of git(root, ['ls-tree', '-r', '-z', head]).split('\0')) {
    const m = /^(\d+) blob [0-9a-f]+\t(.+)$/s.exec(entry);
    if (m && (m[1] === '100644' || m[1] === '100755')) files.add(m[2]);
  }
  return files;
}

export const showFile = (root, rev, path) => tryGit(root, ['show', `${rev}:${path}`]);

// How many tracked files hold a change not committed: the step judges the last commit, and says what it leaves out.
export const uncommitted = (root) => git(root, ['status', '--porcelain', '-z', '--untracked-files=no']).split('\0').filter((e) => /^[ MADRCTU?!]{2} /.test(e)).length;

// §3.4: the tree of head written out into `copy` through an index file of its own in `dir`, so nothing is registered
// in the project's .git and its index is not touched.
export function writeCopy(root, head, dir, copy) {
  const env = { ...trustedEnvAt(root), GIT_INDEX_FILE: posix.join(dir, 'index') };
  const run = (args) => execFileSync('git', ['--no-replace-objects', '-C', root, ...args], { cwd: tmpdir(), env, stdio: ['ignore', 'ignore', 'pipe'] });
  run(['read-tree', head]);
  run(['checkout-index', '-a', `--prefix=${copy}/`]);
}
