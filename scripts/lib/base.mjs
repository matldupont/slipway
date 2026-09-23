// Slipway's history, as sync reads it (F-01 step 3, dev/features/template-sync.md): a cached clone of
// the manifest's `source`, and the commit a set of blobs came from. Every git call goes through the
// helper in install.mjs. Internal (scripts/**): runs from the slipway package, never ships.

import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classify, MAP, parseOwnership } from '../../ci/checks/lib/ownership.mjs';
import { git, lsTree, publicSource } from './install.mjs';

// What git fetches for a manifest's `source`. `github:owner/repo` is npm's shorthand; anything else
// (a URL, a local path) is passed as it is, after `--`. An option-shaped source is refused.
export function fetchUrl(source) {
  publicSource(source);
  const gh = source.match(/^github:([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  return gh ? `https://github.com/${gh[1]}.git` : source;
}

// The cache lives in the OS temp dir, in a directory only this user can write: a repository someone
// else planted there could run its hooks or config in our git calls.
function cacheRoot() {
  const uid = process.getuid?.();
  const dir = join(tmpdir(), `slipway-sync-${uid ?? 'user'}`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const st = lstatSync(dir);
  if (!st.isDirectory() || (uid !== undefined && st.uid !== uid) || (process.platform !== 'win32' && st.mode & 0o077)) {
    throw new Error(`${dir} is not a directory only you can write — remove it and re-run`);
  }
  return dir;
}

/**
 * A bare clone of `source`, cached per URL and fetched on every call. Returns its git dir. Throws with
 * the source redacted: git's own message can quote the URL it was given.
 */
export function sourceClone(source) {
  const url = fetchUrl(source);
  const shown = publicSource(url);
  const dir = join(cacheRoot(), `${createHash('sha256').update(url).digest('hex').slice(0, 16)}.git`);
  const o = { timeout: 300_000 };
  const fail = (e) => {
    const why = String(e.stderr || e.message).trim().split(/\r?\n/).at(-1).replaceAll(url, shown).replaceAll(source, shown);
    return new Error(`could not fetch slipway from ${shown}: ${why}`);
  };
  try {
    git(['--git-dir', dir, 'fetch', '--quiet', '--prune', '--', url, '+refs/heads/*:refs/heads/*'], o);
    return dir;
  } catch {
    // No cache yet, or one that no longer fetches: start it again.
    rmSync(dir, { recursive: true, force: true });
  }
  try {
    git(['clone', '--bare', '--quiet', '--', url, dir], o);
  } catch (e) {
    throw fail(e);
  }
  return dir;
}

// A blob's bytes.
export const readBlob = (gitDir, id) => git(['--git-dir', gitDir, 'cat-file', 'blob', id], { encoding: 'buffer' });

// A commit's files and the ownership map it shipped with (null when it has none, or one this code
// cannot read). Maps are cached by blob id: they rarely change between commits.
const maps = new Map();
export function commitFiles(gitDir, sha) {
  const tree = lsTree(gitDir, sha);
  const id = tree.get(MAP);
  if (id && !maps.has(id)) {
    let rules = null;
    try {
      rules = parseOwnership(readBlob(gitDir, id).toString('utf8'));
    } catch {
      // An unreadable map classifies nothing: the commit can still be closest, never exact.
    }
    maps.set(id, rules);
  }
  return { tree, rules: id ? maps.get(id) : null };
}

function commits(gitDir, start, ref) {
  const list = git(['--git-dir', gitDir, 'rev-list', ref]).split('\n').filter(Boolean);
  if (!start || !/^[0-9a-f]{40}$/.test(start)) return list;
  try {
    git(['--git-dir', gitDir, 'cat-file', '-e', `${start}^{commit}`]);
  } catch {
    return list; // a fork's or an unpushed sha: the walk alone decides
  }
  return [start, ...list.filter((s) => s !== start)];
}

/**
 * The slipway commit that shipped exactly `blobs`: its ownership map puts every listed path in class
 * `cls` at that blob id, and no other path in that class. Tried at `start` first (the manifest's
 * `slipway` hint), then along `ref` newest first; the first exact commit wins. Without one, `best` and
 * `runnerUp` rank the closest (most paths at their blob, then fewest extra, then newest) — adopt (#18)
 * shows both and never picks silently.
 *
 * @param {string} gitDir
 * @param {Map<string, string>} blobs  path → git blob id
 * @param {{ start?: string|null, ref?: string, cls?: string }} [o]
 * @returns {{ exact: string|null, best: Candidate|null, runnerUp: Candidate|null, total: number }}
 *   Candidate: `{ sha, matched, extra }` — `matched` of `total` paths hold their blob; `extra` counts
 *   the paths in `cls` that commit ships and `blobs` does not list (null when it has no readable map).
 */
export function resolveBase(gitDir, blobs, { start = null, ref = 'HEAD', cls = 'managed' } = {}) {
  const ranked = [];
  for (const sha of commits(gitDir, start, ref)) {
    const { tree, rules } = commitFiles(gitDir, sha);
    let matched = 0;
    for (const [p, b] of blobs) if (tree.get(p) === b && (!rules || classify(rules, p) === cls)) matched++;
    const extra = rules ? [...tree.keys()].filter((p) => !blobs.has(p) && classify(rules, p) === cls).length : null;
    if (matched === blobs.size && extra === 0) return { exact: sha, best: { sha, matched, extra }, runnerUp: null, total: blobs.size };
    ranked.push({ sha, matched, extra });
  }
  // Stable sort: equal candidates keep the walk's order, newest first.
  ranked.sort((a, b) => b.matched - a.matched || (a.extra ?? Infinity) - (b.extra ?? Infinity));
  return { exact: null, best: ranked[0] ?? null, runnerUp: ranked[1] ?? null, total: blobs.size };
}
