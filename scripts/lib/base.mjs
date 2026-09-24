// Slipway's history, as sync reads it (F-01 step 3, dev/features/template-sync.md): a cached clone of
// the manifest's `source`, and the commit a set of blobs came from. Every git call goes through the
// helper in install.mjs. Internal (scripts/**): runs from the slipway package, never ships.

import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classify, MAP, parseOwnership } from '../../ci/checks/lib/ownership.mjs';
import { blobSha, git, gitReason, lsTree, publicSource, redactUrls } from './install.mjs';

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
    const why = redactUrls(gitReason(e).replaceAll(url, shown).replaceAll(source, shown));
    return new Error(`could not fetch slipway from ${shown}: ${why}`);
  };
  // The cache never records the URL: it is made with `init` (no remote), and fetches name the URL
  // themselves and write no FETCH_HEAD. A cache an older version cloned is cleaned of both, so an
  // interrupted run leaves no credential at rest either. HEAD follows the source's default branch.
  const fetch = () => {
    const head = git(['ls-remote', '--symref', '--', url, 'HEAD'], o).match(/^ref: refs\/heads\/(\S+)\tHEAD$/m)?.[1];
    git(['--git-dir', dir, 'fetch', '--quiet', '--prune', '--no-write-fetch-head', '--', url, '+refs/heads/*:refs/heads/*'], o);
    if (head) git(['--git-dir', dir, 'symbolic-ref', 'HEAD', `refs/heads/${head}`]);
  };
  try {
    try {
      git(['--git-dir', dir, 'remote', 'remove', 'origin']);
    } catch {
      // no origin: a cache this version made
    }
    rmSync(join(dir, 'FETCH_HEAD'), { force: true });
    fetch();
    return dir;
  } catch {
    // No cache yet, or one that no longer fetches: start it again.
    rmSync(dir, { recursive: true, force: true });
  }
  try {
    git(['init', '--bare', '--quiet', dir]);
    fetch();
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
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
 * The slipway commits that shipped exactly `blobs`: each one's ownership map puts every listed path in
 * class `cls` at that blob id, and no other path in that class. `start` (the manifest's `slipway` hint)
 * is tried first and settles it when it matches; otherwise every commit along `ref` is read, newest
 * first. Several commits match when the ones between them touched no file of that class: `settleTie`
 * tells them apart. `best` and `runnerUp` rank every commit read (most paths at their blob, then fewest
 * extra, then the walk's order) — the closest-match mode adopt (#18) shows, never picking silently.
 *
 * @param {string} gitDir
 * @param {Map<string, string>} blobs  path → git blob id
 * @param {{ start?: string|null, ref?: string, cls?: string }} [o]
 * @returns {{ exact: string[], best: Candidate|null, runnerUp: Candidate|null, total: number }}
 *   Candidate: `{ sha, matched, extra }` — `matched` of `total` paths hold their blob; `extra` counts
 *   the paths in `cls` that commit ships and `blobs` does not list (null when it has no readable map).
 */
export function resolveBase(gitDir, blobs, { start = null, ref = 'HEAD', cls = 'managed' } = {}) {
  const ranked = [];
  const exact = [];
  const list = commits(gitDir, start, ref);
  for (const sha of list) {
    const { tree, rules } = commitFiles(gitDir, sha);
    let matched = 0;
    for (const [p, b] of blobs) if (tree.get(p) === b && (!rules || classify(rules, p) === cls)) matched++;
    const extra = rules ? [...tree.keys()].filter((p) => !blobs.has(p) && classify(rules, p) === cls).length : null;
    ranked.push({ sha, matched, extra });
    if (matched === blobs.size && extra === 0) {
      exact.push(sha);
      if (sha === start) break; // the hint matches: nothing else can outrank it
    }
  }
  // Stable sort: equal candidates keep the walk's order.
  ranked.sort((a, b) => b.matched - a.matched || (a.extra ?? Infinity) - (b.extra ?? Infinity));
  return { exact, best: ranked[0] ?? null, runnerUp: ranked[1] ?? null, total: blobs.size };
}

/**
 * One of several exact commits, told apart by the files outside the matched class. `written` is the
 * manifest's other `path → blob`, as written; `render(path, bytes, rules)` reproduces what the install
 * wrote from a commit's copy, or returns null when it cannot. The commit that reproduces the most wins.
 * Returns `{ sha: null, tied }` when the best are several that ship different files: the caller names
 * them rather than guess. Several with the same shipped files are one answer; the newest is returned.
 */
export function settleTie(gitDir, shas, written, render) {
  const seen = shas.map((sha) => {
    const { tree, rules } = commitFiles(gitDir, sha);
    let score = 0;
    // A file the install writes whole (render gives null) is no evidence either way, so it cannot keep
    // a tie open either.
    const unrendered = new Set();
    for (const [p, blob] of written) {
      if (!tree.has(p)) continue;
      let out;
      try {
        out = render(p, readBlob(gitDir, tree.get(p)), rules);
      } catch {
        continue; // an unreadable copy reproduces nothing, and still counts in the fingerprint
      }
      if (out === null) unrendered.add(p);
      else if (blobSha(out) === blob) score++;
    }
    // A file the commit ships that the install never recorded: the project did not come from it.
    if (rules) for (const [p] of tree) if (!written.has(p) && !['internal', 'managed'].includes(classify(rules, p))) score--;
    const shipped = [...tree]
      .filter(([p]) => rules && classify(rules, p) !== 'internal' && !unrendered.has(p))
      .map(([p, id]) => `${p}\0${id}`)
      .sort()
      .join('\n');
    return { sha, score, shipped };
  });
  const top = Math.max(...seen.map((x) => x.score));
  const best = seen.filter((x) => x.score === top);
  return { sha: new Set(best.map((x) => x.shipped)).size === 1 ? best[0].sha : null, tied: best.map((x) => x.sha) };
}
