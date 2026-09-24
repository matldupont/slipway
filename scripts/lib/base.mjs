// Slipway's history, as sync reads it (F-01 step 3, dev/features/template-sync.md): a fresh clone of the
// manifest's `source` per run, and the commit a set of blobs came from. Every git call goes through the
// helper in install.mjs. Internal (scripts/**): runs from the slipway package, never ships.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { classify, MAP, parseOwnership } from '../../ci/checks/lib/ownership.mjs';
import { git, gitReason, lsTree, publicSource, redactUrls } from './install.mjs';

// What git fetches for a manifest's `source`. `github:owner/repo` is npm's shorthand; anything else
// (a URL, a local path) is passed as it is, after `--`. An option-shaped source is refused.
export function fetchUrl(source) {
  publicSource(source);
  const gh = source.match(/^github:([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  return gh ? `https://github.com/${gh[1]}.git` : source;
}

// Every clone this process made, removed when it exits — also on Ctrl-C or a kill — so nothing it
// fetched, the URL in its config included, outlives the run.
const clones = [];
const cleanUp = () => clones.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true }));
process.on('exit', cleanUp);
// A signal ends the process without 'exit' unless it is handled: exiting from the handler runs it.
for (const [sig, n] of [['SIGINT', 2], ['SIGTERM', 15], ['SIGHUP', 1]]) process.once(sig, () => process.exit(128 + n));

/**
 * A bare, blobless clone of `source` in a new private temp dir, removed on exit. Returns its git dir.
 * Blobs arrive when read. Throws with the source redacted: git's own message can quote the URL.
 */
export function sourceClone(source) {
  const url = fetchUrl(source);
  const shown = publicSource(url);
  const dir = join(mkdtempSync(join(tmpdir(), 'slipway-sync-')), 'source.git');
  clones.push(dirname(dir));
  try {
    git(['clone', '--bare', '--quiet', '--filter=blob:none', '--', url, dir], { timeout: 300_000 });
  } catch (e) {
    throw new Error(`could not fetch slipway from ${shown}: ${redactUrls(gitReason(e).replaceAll(url, shown).replaceAll(source, shown))}`);
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
 * `slipway` hint), then along `ref` newest first; the first exact commit wins. Several commits are
 * exact when the ones between them touched no file of that class; the newest is taken (a known
 * limitation, F-01). Without one, `best` and `runnerUp` rank every commit read (most paths at their
 * blob, then fewest extra, then the walk's order) — the closest-match mode adopt (#18) shows, never
 * picking silently.
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
  // Stable sort: equal candidates keep the walk's order.
  ranked.sort((a, b) => b.matched - a.matched || (a.extra ?? Infinity) - (b.extra ?? Infinity));
  return { exact: null, best: ranked[0] ?? null, runnerUp: ranked[1] ?? null, total: blobs.size };
}
