// What an install writes besides the copied files: the project's package.json, the slipway sha it
// came from, and .slipway/manifest.json. new-project uses all three; sync (F-01 steps 3–4) reuses
// them, so a project's package.json and manifest mean the same thing whichever wrote them.
// Internal (scripts/**): runs from the slipway package, never ships.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCommand } from '../../ci/checks/lib/commands.mjs';
import { sha256 } from '../../ci/checks/lib/manifest.mjs';
import { classify, listSource } from '../../ci/checks/lib/ownership.mjs';

export const SOURCE = 'github:matldupont/slipway';
// `github:owner/name`, or any URL or path git can fetch from (SLIPWAY_SOURCE, e.g. a fork or a test repository).
const sourceUrl = (source) => (source.startsWith('github:') ? `https://github.com/${source.slice('github:'.length)}.git` : source);

// The source as the manifest and the output may show it: a token in `https://user:token@host/…` is
// committed and pushed with the manifest otherwise, and so is a `?token=` query. A value git would read as an option is refused.
export function publicSource(source) {
  if (source.startsWith('-')) throw new Error(`source "${source}" reads as a git option`);
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) return source;
  const u = new URL(source);
  u.username = '';
  u.password = '';
  u.search = '';
  u.hash = '';
  return u.toString();
}

// The project's package.json from the template's: its own name, private, no bin/description/version,
// and no command that calls an internal path (O1) — the project never receives one.
export function derivePackageJson(template, { name, rules }) {
  const pkg = structuredClone(template);
  pkg.name = name;
  pkg.private = true;
  delete pkg.bin;
  delete pkg.description;
  delete pkg.version;
  const callsInternal = (c) => parseCommand(c).some((x) => x.kind === 'node' && classify(rules, x.path) === 'internal');
  for (const [k, v] of Object.entries(pkg.scripts ?? {})) {
    const kept = v.split(/\s*&&\s*/).filter((c) => !callsInternal(c));
    if (kept.length) pkg.scripts[k] = kept.join(' && ');
    else delete pkg.scripts[k];
  }
  return pkg;
}

// The git blob id of a file's bytes: what `git ls-tree` lists, computed without a repository.
export const blobSha = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

// Never a credential prompt (git reads /dev/tty, not stdin), and never an unbounded wait on the network.
const git = (args, o = {}) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes' }, timeout: 60_000, ...o });

// `path → blob id` for every file in a commit's tree.
function lsTree(gitDir, sha) {
  const out = new Map();
  for (const rec of git(['--git-dir', gitDir, 'ls-tree', '-r', '-z', sha]).split('\0')) {
    const m = rec.match(/^\d+ blob ([0-9a-f]{40})\t(.+)$/s);
    if (m) out.set(m[2], m[1]);
  }
  return out;
}

// Slipway's own checkout: HEAD and its tree, read from `src` itself.
function localCandidate(src) {
  const sha = git(['-C', src, 'rev-parse', 'HEAD']).trim();
  return { sha, tree: lsTree(git(['-C', src, 'rev-parse', '--absolute-git-dir']).trim(), sha) };
}

// Anywhere else — under `npx github:…` there is no .git, and a template sitting untracked inside
// another repository must never read that repository's HEAD: the source's HEAD by `git ls-remote`,
// and its tree by a shallow, blobless fetch into a throwaway repository.
export function remoteCandidate(source) {
  const url = sourceUrl(source);
  if (url.startsWith('-')) throw new Error(`source "${source}" reads as a git option`);
  const sha = git(['ls-remote', url, 'HEAD']).split(/\s/)[0];
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`git ls-remote ${publicSource(source)} HEAD returned no sha`);
  const dir = mkdtempSync(join(tmpdir(), 'slipway-sha-'));
  try {
    git(['init', '-q', '--bare', dir]);
    git(['--git-dir', dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', url, sha]);
    return { sha, tree: lsTree(dir, sha) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The slipway sha `src` holds, confirmed file by file: a candidate sha counts only when every shipped
 * path's bytes equal that commit's blob, and every path that commit ships is among them (a deleted
 * file is a difference too). Otherwise — a push landed between npx's download and
 * ls-remote, a dirty checkout, no network — `sha` is null and sync resolves the base by closest match.
 *
 * @param {string} src     the template root
 * @param {string[]} paths every path the install takes from `src`
 * @param {{ rules: object[], source?: string, remote?: (source: string) => { sha: string, tree: Map<string,string> } }} o
 *   `rules` from loadOwnership: which of the commit's paths ship (all but internal, and .gitignore, which is written)
 * @returns {{ sha: string|null, candidate: string|null, why: string|null }}
 */
export function resolveSlipway(src, paths, { rules, source = SOURCE, remote = remoteCandidate }) {
  let c;
  try {
    c = listSource(src) === 'git' ? localCandidate(src) : remote(source);
  } catch (e) {
    const why = (e.stderr || e.message).toString().trim().split('\n')[0].replace(/\/\/[^/\s]*@/g, '//').replace(/(:\/\/[^\s?#]*)[?#]\S*/g, '$1');
    return { sha: null, candidate: null, why: `could not read a candidate sha: ${why}` };
  }
  const taken = new Set(paths);
  const missing = [...c.tree.keys()].filter((p) => !taken.has(p) && p !== '.gitignore' && classify(rules, p) !== 'internal');
  const differ = [...paths.filter((p) => c.tree.get(p) !== blobSha(readFileSync(join(src, p)))), ...missing];
  if (differ.length) {
    const shown = differ.slice(0, 3).join(', ') + (differ.length > 3 ? `, +${differ.length - 3} more` : '');
    return { sha: null, candidate: c.sha, why: `${differ.length} file(s) differ from ${c.sha.slice(0, 12)}: ${shown}` };
  }
  return { sha: c.sha, candidate: c.sha, why: null };
}

// The manifest for files already written under `dest`: each path's class and the sha256 of its bytes.
export function buildManifest(dest, paths, { rules, slipway, version, source = SOURCE, answers }) {
  const files = {};
  for (const p of [...paths].sort()) files[p] = { class: classify(rules, p), sha256: sha256(readFileSync(join(dest, p))) };
  return { slipway, ...(slipway ? {} : { version }), source, answers, files };
}
