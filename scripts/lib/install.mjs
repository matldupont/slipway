// What an install writes besides the copied files: the project's package.json, the slipway sha it
// came from, and .slipway/manifest.json. new-project uses all three; sync (F-01 steps 3–4) reuses
// them, so a project's package.json and manifest mean the same thing whichever wrote them.
// Internal (scripts/**): runs from the slipway package, never ships.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCommand } from '../../ci/checks/lib/commands.mjs';
import { sha256 } from '../../ci/checks/lib/manifest.mjs';
import { classify, listSource, loadOwnership, MAP, shippedPaths } from '../../ci/checks/lib/ownership.mjs';

export const SOURCE = 'github:matldupont/slipway';
// The source as the manifest and the output may show it: a token in `https://user:token@host/…` is
// committed and pushed with the manifest otherwise, and so is a `?token=` query. Sync fetches from
// `source` later (through the helper below), so a value git would read as an option is refused now.
export function publicSource(source) {
  if (source.startsWith('-')) throw new Error(`source "${source}" reads as a git option`);
  // `<transport>::<address>` would carry its address past the URL redaction below.
  if (/^[a-z][a-z0-9+.-]*::/i.test(source)) throw new Error(`source "${source.split('::')[0]}::…" names a git transport helper — give the URL itself`);
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) return source;
  const u = new URL(source);
  u.username = '';
  u.password = '';
  u.search = '';
  u.hash = '';
  return u.toString();
}

/**
 * What an install takes from the template at `src`, by class in its ownership map: the precondition
 * new-project and sync share (O1). Throws when the map cannot be read, a path has no class — it has no
 * safe sync action — or nothing would be copied.
 *
 * @returns {{ rules: object[], copy: string[], internal: string[], listedBy: string }} `copy` is every
 *   path taken as it is; `.gitignore` is written instead (gitignoreText), so it is in neither list.
 */
export function templateFiles(src) {
  let rules;
  try {
    rules = loadOwnership(src);
  } catch (e) {
    throw new Error(`${e.message} — cannot tell which files ship`);
  }
  const shipped = shippedPaths(src, rules);
  const git = listSource(src) === 'git';
  const listedBy = git ? 'git ls-files' : 'a directory walk (no git checkout at the template top)';
  const unclassified = shipped.filter((p) => !classify(rules, p));
  if (unclassified.length) {
    const fix = git
      ? 'give each a class first (O1)'
      : 'these may be local files: delete them or run from a git checkout of slipway; if they belong in the template, give each a class (O1)';
    throw new Error(`${unclassified.length} path(s) from ${listedBy} match no glob in ${MAP}; ${fix}:\n  ${unclassified.join('\n  ')}`);
  }
  const internal = shipped.filter((p) => classify(rules, p) === 'internal');
  const copy = shipped.filter((p) => classify(rules, p) !== 'internal' && p !== '.gitignore');
  if (copy.length === 0) throw new Error(`found nothing to copy in ${src} — is this a slipway checkout or package?`);
  return { rules, copy, internal, listedBy };
}

// The .gitignore an install writes: npm never packs one, so under `npx github:…` there is none to copy.
export const gitignoreText = (src) =>
  existsSync(join(src, '.gitignore')) ? readFileSync(join(src, '.gitignore'), 'utf8') : 'node_modules/\n.DS_Store\nSTATE.md\n';

// Every URL in `text` (a git message) as publicSource shows it: git drops userinfo from its own
// messages but keeps a `?token=` query.
export const redactUrls = (text) =>
  text.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'"]+/gi, (u) => {
    try {
      return publicSource(u);
    } catch {
      return '<url>';
    }
  });

// Why a git call failed, in one line: its `fatal:`/`error:` line, not the hint git often ends with.
export function gitReason(e) {
  const lines = String(e.stderr || e.message).trim().split(/\r?\n/);
  return lines.find((l) => /^(fatal|error): /.test(l)) ?? lines.at(-1);
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

// The one git helper: new-project calls it on the local checkout only, and sync (F-01 steps 3–4) fetches
// through it. No prompt of any kind (the terminal, an askpass helper, Git Credential Manager), and a
// timeout. ssh gets BatchMode only when the owner has configured no ssh of their own (GIT_SSH_COMMAND,
// GIT_SSH, a global or system core.sshCommand), which the variable would otherwise override. A
// repository's own core.sshCommand is not read: the fetches run in sync's clone, which never sets one.
let quiet;
function quietEnv() {
  if (!quiet) {
    quiet = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '', SSH_ASKPASS: '', GCM_INTERACTIVE: 'never' };
    // Transports only: never `ext::` (runs a command) or another helper a `source` could name.
    quiet.GIT_ALLOW_PROTOCOL = 'file:git:http:https:ssh';
    if (!ownSsh()) quiet.GIT_SSH_COMMAND = 'ssh -o BatchMode=yes';
  }
  return quiet;
}
export const git = (args, o = {}) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: quietEnv(), timeout: 60_000, ...o });
function ownSsh() {
  if (process.env.GIT_SSH_COMMAND || process.env.GIT_SSH) return true;
  return ['--global', '--system'].some((scope) => {
    try {
      // Outside any repository, as the fetches in sync's cache are: an `includeIf gitdir:` for the
      // project must not count as ssh the fetch will use.
      return execFileSync('git', ['config', scope, '--includes', '--get', 'core.sshCommand'], { cwd: tmpdir(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() !== '';
    } catch {
      return false;
    }
  });
}

// `path → blob id` for every file in a commit's tree.
export function lsTree(gitDir, sha) {
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

/**
 * A hint at the slipway sha `src` holds, with no network call. Only slipway's own checkout offers one:
 * HEAD, when every copied path's bytes equal that commit's blob and every path the commit ships was
 * copied (a deleted file is a difference too). Anywhere else — under `npx github:…` there is no .git,
 * and a template untracked inside another repository must never read that repository's HEAD — and in
 * an edited checkout, `sha` is null. Sync finds the base by the manifest's blob ids either way.
 *
 * @param {string} src     the template root
 * @param {string[]} paths every path the install takes from `src`
 * @param {{ rules: object[] }} o  `rules` from loadOwnership: which of HEAD's paths ship (all but
 *   internal, and .gitignore, which is written)
 * @returns {{ sha: string|null, candidate: string|null, why: string|null }}
 */
export function resolveSlipway(src, paths, { rules }) {
  if (listSource(src) !== 'git') return { sha: null, candidate: null, why: 'not a slipway checkout (no .git at the template top)' };
  let c;
  try {
    c = localCandidate(src);
  } catch (e) {
    return { sha: null, candidate: null, why: `could not read HEAD: ${String(e.stderr || e.message).trim().split(/\r?\n/).at(-1)}` };
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
// `blob` is the git blob id of the same bytes: sync finds the base as the slipway commit whose tree
// holds exactly these blobs (#16), so the `slipway` sha is only where it starts looking. `read` gives
// a path's bytes some other way: sync --apply (#17) records the target's bytes, not the project's.
export function buildManifest(dest, paths, { rules, slipway, version, source = SOURCE, answers, read = (p) => readFileSync(join(dest, p)) }) {
  const files = {};
  for (const p of [...paths].sort()) {
    const buf = read(p);
    files[p] = { class: classify(rules, p), sha256: sha256(buf), blob: blobSha(buf) };
  }
  return { slipway, version, source, answers, files };
}
