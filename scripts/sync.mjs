// sync — take a newer slipway into a project (F-01, dev/features/template-sync.md). Steps 3–4.
//
//   npx github:matldupont/slipway#<ref> sync [--plan]   run in the project: the plan, the default
//   npx github:matldupont/slipway#<ref> sync --apply    carry it out on a branch, in one commit
//   node <slipway>/scripts/new-project.mjs sync …
//
// Reached through new-project's bin, so this code is always the target version's. The plan prints one
// row per path — what a sync to this version would do — and writes nothing: no file, no branch, no
// commit. The only write is its clone of slipway, in a new temp dir removed on exit.
//
// --apply (step 4, #17) takes those rows as they are and computes every write first, so a refusal
// leaves the project untouched. Then it creates `slipway/sync-<target>` from the current branch and
// commits the files and the manifest together. No path whose content differs from its manifest hash is
// overwritten or deleted without a three-way merge: the hash is checked again as each write is computed.
// It installs the harness, so the owner runs it: under an agent (CLAUDECODE set) it refuses, and the
// harness asks before any Bash command that runs it.
//
//   target  the files of the slipway running this command, classified by its dev/ownership.yaml
//   base    the slipway commit whose tree holds exactly the manifest's managed blob ids (lib/base.mjs),
//           read from a clone of the manifest's `source`
//
// Refuses, naming why, on a dirty tree, a detached HEAD, no manifest, or D1 red.
// Zero dependencies (D-004): Node stdlib and `git`. Every git call on the project or on slipway's clone
// goes through the helper in lib/install.mjs; only the local listing of this package's own files
// (ownership.mjs, as new-project uses it) calls git directly.

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasReason, isTemplate, MANIFEST, NOT_A_FILE, OVERRIDES, readManifest, readOverrides, readProjectFile, sha256 } from '../ci/checks/lib/manifest.mjs';
import { classify, MAP } from '../ci/checks/lib/ownership.mjs';
import { commitFiles, readBlob, resolveBase, sourceClone } from './lib/base.mjs';
import { BASE_WHY, bucketLines, needsLines } from './lib/summary.mjs';
import { blobSha, buildManifest, derivePackageJson, git, gitignoreText, gitReason, publicSource, redactUrls, resolveSlipway, SOURCE, templateFiles } from './lib/install.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: sync [--plan | --apply] [--verbose]   (run in the project; a project with no manifest: sync --adopt, see --adopt --help)';
export const KINDS = [
  'replace', 'merge', 'add', 'delete', 'keep (edited)', 'collision',
  'seeded: upstream changed', 'merged: key updated', 'merged: key reported', 'unchanged',
];

// A named reason to stop: printed as `sync: <reason>`, exit 1. Adopt (adopt.mjs) throws it too.
export class Refusal extends Error {}

export function main(argv, { cwd = process.cwd(), out = process.stdout, err = process.stderr } = {}) {
  try {
    for (const a of argv) {
      if (a === '-h' || a === '--help') { out.write(`${USAGE}\n`); return 0; }
      if (a !== '--plan' && a !== '--apply' && a !== '--verbose') throw new Refusal(`unknown argument ${a}\n${USAGE}`);
    }
    if (argv.includes('--plan') && argv.includes('--apply')) throw new Refusal(`--plan and --apply: choose one\n${USAGE}`);
    if (argv.includes('--apply') && process.env.CLAUDECODE) {
      throw new Refusal('--apply installs slipway\'s files and its harness, so the owner runs it in their own terminal, not an agent (CLAUDECODE is set) — nothing was written');
    }
    const ctx = { ...preflight(cwd), verbose: argv.includes('--verbose') };
    const rows = plan(ctx);
    if (!argv.includes('--apply')) {
      print(out, ctx, rows, true);
      out.write(ctx.verbose ? 'Plan only — nothing was written.\n' : 'Plan only — nothing was written. Carry it out with: sync --apply\n');
      return 0;
    }
    return apply(out, ctx, rows);
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    err.write(`sync: ${e.message}\n`);
    return 1;
  }
}

/**
 * The project as sync and adopt both require it: a git repository that is not slipway itself, a clean
 * tree, and a branch checked out. Reads only: `--no-optional-locks` keeps status from refreshing the index.
 */
export function repoState(cwd) {
  let root;
  try {
    root = git(['-C', cwd, 'rev-parse', '--show-toplevel']).trim();
  } catch {
    throw new Refusal(`${cwd} is not inside a git repository — run sync in the project`);
  }
  if (isTemplate(root)) throw new Refusal('this is slipway itself — run sync in a project built from it');
  const dirty = git(['-C', root, '--no-optional-locks', 'status', '--porcelain', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
  if (dirty.length) {
    const shown = dirty.slice(0, 5).map((l) => `\n  ${l}`).join('') + (dirty.length > 5 ? `\n  +${dirty.length - 5} more` : '');
    throw new Refusal(`the working tree is not clean (${dirty.length} path(s)) — commit or stash first:${shown}`);
  }
  let branch;
  try {
    branch = git(['-C', root, 'symbolic-ref', '-q', '--short', 'HEAD']).trim();
  } catch {
    throw new Refusal('HEAD is detached — check out a branch first');
  }
  return { root, branch, remote: remoteLine(root, branch) };
}

/**
 * The header line about the branch's remote, or null when it is level: a plan against a tree that lacks
 * merged work misleads every later step. A warning, never a gate. Fetches the upstream's remote (its
 * tracking refs move; FETCH_HEAD is not written), so offline or without an upstream the line says the
 * remote was not checked.
 */
export function remoteLine(root, branch) {
  const at = (args) => git(['-C', root, ...args]).trim();
  let upstream;
  try {
    upstream = at(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch {
    return `not checked — ${branch} has no upstream`;
  }
  try {
    at(['fetch', '-q', '--no-write-fetch-head', at(['config', `branch.${branch}.remote`])]);
    const behind = Number(at(['rev-list', '--count', 'HEAD..@{u}']));
    return behind > 0 ? `WARNING — ${branch} is ${behind} commit${behind > 1 ? 's' : ''} behind ${upstream}; run \`git pull\` first` : null;
  } catch (e) {
    return `not checked — could not fetch ${upstream}: ${redactUrls(gitReason(e))}`;
  }
}

// Git failing on slipway's clone (an empty source, a default branch gone) is a named refusal too.
export function history(source, fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof Refusal) throw e;
    throw new Refusal(`cannot read slipway's history from ${publicSource(source)}: ${redactUrls(gitReason(e))}`);
  }
}

function preflight(cwd) {
  const { root, branch, remote } = repoState(cwd);
  let manifest, overrides;
  try {
    manifest = readManifest(root);
    overrides = readOverrides(root);
  } catch (e) {
    throw new Refusal(e.message);
  }
  if (!manifest) throw new Refusal(`no ${MANIFEST} — run \`sync --adopt\` first (a project created before the manifest existed)`);
  const d1 = spawnSync(process.execPath, [join(SRC, 'ci', 'checks', 'meta', 'd1-drift.mjs'), root], { encoding: 'utf8' });
  if (d1.status !== 0) throw new Refusal(`D1 is red — sync would lose or refuse these edits; fix them first:\n${(d1.stdout + d1.stderr).trim()}`);

  const managed = new Map();
  for (const [p, f] of Object.entries(manifest.files)) {
    if (f.class !== 'managed') continue;
    if (!/^[0-9a-f]{40}$/.test(f.blob ?? '')) throw new Refusal(`${MANIFEST}: "${p}" has no blob id, so the base cannot be found — remove the manifest and run \`sync --adopt\``);
    managed.set(p, f.blob);
  }

  // The target: this slipway's own files, by its own map (O1's precondition, as new-project runs it).
  let t;
  try {
    t = templateFiles(SRC);
  } catch (e) {
    throw new Refusal(e.message);
  }
  const target = new Map(t.copy.map((p) => [p, readFileSync(join(SRC, p))]));
  target.set('.gitignore', Buffer.from(gitignoreText(SRC)));

  const source = manifest.source || SOURCE;
  let gitDir;
  try {
    gitDir = sourceClone(source);
  } catch (e) {
    throw new Refusal(e.message);
  }
  const read = (fn) => history(source, fn);

  // A base older than the ownership map is classified by the target's, as adopt recorded it.
  const r = read(() => resolveBase(gitDir, managed, { start: manifest.slipway, fallback: t.rules }));
  if (!r.exact) {
    const rewritten = r.best?.extra === 0 && rewrittenHistory({ root, gitDir, read, managed, best: r.best.sha, source });
    if (rewritten) throw new Refusal(rewritten);
    const c =(x) => `${x.sha.slice(0, 12)} (${x.matched} of ${r.total} managed files at their blob${x.extra ? `, ${x.extra} more it ships` : ''})`;
    throw new Refusal(
      r.best
        ? `no slipway commit holds exactly the manifest's ${r.total} managed files; closest ${c(r.best)}${r.runnerUp ? `, then ${c(r.runnerUp)}` : ''}`
        : `${publicSource(source)} has no commits to compare the manifest with`,
    );
  }
  const base = read(() => commitFiles(gitDir, r.exact));
  if (!base.tree.has(MAP)) base.rules = t.rules;

  // The target's sha, for the header: this checkout's clean HEAD, else the commit holding its managed
  // blobs on any branch (`npx github:…#<ref>` may run a ref off the default branch).
  const targetManaged = new Map(t.copy.filter((p) => classify(t.rules, p) === 'managed').map((p) => [p, blobSha(target.get(p))]));
  const targetSha = resolveSlipway(SRC, t.copy, { rules: t.rules }).sha ?? read(() => resolveBase(gitDir, targetManaged, { ref: '--branches' }).exact);
  // npm never packs .gitignore: under npx, slipway's own is in the target commit, not on disk. Without
  // that commit the target's copy is unknown, and the plan says so rather than compare a stand-in.
  const notes = [];
  if (!existsSync(join(SRC, '.gitignore'))) {
    const id = targetSha && read(() => commitFiles(gitDir, targetSha).tree.get('.gitignore'));
    if (id) target.set('.gitignore', read(() => readBlob(gitDir, id)));
    else if (base.tree.has('.gitignore')) {
      target.set('.gitignore', read(() => readBlob(gitDir, base.tree.get('.gitignore'))));
      notes.push("the target's .gitignore is unknown (npm does not pack it, and no slipway commit matches this package); its row compares the base with itself");
    }
  }

  // What changed, for /sync-slipway to explain: the subjects on slipway's history, base → target. Only
  // informs the explanation, so a target the source lacks (unpushed) is a note; --apply refuses it.
  let log = [];
  if (targetSha && targetSha !== r.exact) {
    try {
      log = git(['--git-dir', gitDir, 'log', '--format=%s', `${r.exact}..${targetSha}`]).split('\n').filter(Boolean);
    } catch {
      notes.push(`slipway's commits base → target are not listed: ${targetSha.slice(0, 12)} is not in ${publicSource(source)} (unpushed?)`);
    }
  }

  return { notes, log, root, branch, remote, manifest, overrides, source, base: { sha: r.exact, ...base }, gitDir, target, targetRules: t.rules, targetSha };
}

/**
 * The refusal for a manifest whose managed blobs match no commit, when the closest commit differs from it
 * only in managed files it lists: slipway's published history was rewritten under the project (D-015).
 * Names that commit and each differing file, and the command that re-points the project at it. A file the
 * project changed itself (its bytes match neither the record nor the closest commit) is the owner's
 * choice, never in the command. Null when the closest commit holds every listed file at its record.
 */
function rewrittenHistory({ root, gitDir, read, managed, best, source }) {
  const tree = read(() => commitFiles(gitDir, best).tree);
  const restore = [];
  const own = [];
  for (const [p, recorded] of managed) {
    const now = tree.get(p);
    if (now === recorded) continue;
    const cur = readProjectFile(root, p);
    if (Buffer.isBuffer(cur) && blobSha(cur) === now) continue; // already the closest commit's copy
    (Buffer.isBuffer(cur) && blobSha(cur) === recorded ? restore : own).push(p);
  }
  if (!restore.length && !own.length) return null;
  const list = (ps) => ps.map((p) => `\n  ${p}`).join('');
  const short = best.slice(0, 12);
  const re = restore.map((p) => ` --revert ${p}`).join('');
  return [
    `slipway's history was changed after this project recorded its version, so that record points at a version ${publicSource(source)} no longer has. The nearest one is ${short}, which differs in:${list([...restore, ...own])}`,
    `To re-point the project at ${short}${restore.length ? ", restoring slipway's copy of each file you have not changed" : ''}, run this in your own terminal:\n  git switch -c slipway/re-point && git rm -q ${MANIFEST} && git commit -qm "chore: drop the slipway record for a rewritten history" && sync --adopt --apply --base ${best}${re}`,
    own.length && `You changed ${own.length === 1 ? 'this file' : 'these files'} yourself, so the command leaves ${own.length === 1 ? 'it' : 'them'} alone and adopt asks you for each: add --keep <path>=<reason> to keep yours, or --revert <path> to take slipway's copy:${list(own)}`,
    'Nothing was written.',
  ].filter(Boolean).join('\n');
}

/**
 * One row per path, by the target's classes: `{ kind, path }`, sorted by path. Pure but for reads of
 * the project and the base commit.
 */
export function plan({ root, manifest, overrides, base, gitDir, target, targetRules }) {
  const overridden = new Set(overrides.filter(hasReason).map((o) => o.path));
  const baseBytes = (p) => (base.tree.has(p) ? readBlob(gitDir, base.tree.get(p)) : null);
  const rows = [];
  const add = (kind, path) => rows.push({ kind, path });

  for (const p of [...new Set([...Object.keys(manifest.files), ...target.keys()])].sort()) {
    const m = manifest.files[p];
    const t = target.get(p);
    const cls = t ? classify(targetRules, p) : m.class;
    const cur = readProjectFile(root, p);

    if (cls === 'merged') {
      scriptRows(p, { base: baseBytes(p), target: t, cur, baseRules: base.rules, targetRules }).forEach((r) => rows.push(r));
    } else if (!m) {
      add(cur === null ? 'add' : 'collision', p);
    } else if (cls === 'seeded') {
      // Never written; reported when slipway changed its own copy between base and target.
      const was = base.tree.get(p);
      add(was === (t ? blobSha(t) : undefined) ? 'unchanged' : 'seeded: upstream changed', p);
    } else {
      const pristine = Buffer.isBuffer(cur) && sha256(cur) === m.sha256;
      if (!t) add(pristine ? 'delete' : cur === null ? 'unchanged' : 'keep (edited)', p);
      else if (pristine) add(t.equals(cur) ? 'unchanged' : 'replace', p);
      else if (blobSha(t) === m.blob) add('unchanged', p); // slipway did not change it; the edit stays
      else if (overridden.has(p) && Buffer.isBuffer(cur)) add('merge', p);
      else add('keep (edited)', p);
    }
  }
  return rows;
}

// package.json `scripts`, key by key (F-01 `merged`): a key slipway changed between base and target is
// `updated` when the project still has the base value, else `reported`. Both sides go through the same
// derivation new-project uses, so a key that calls an internal path never counts.
function scriptRows(p, { base, target, cur, baseRules, targetRules }) {
  const scripts = (buf, rules) => (buf ? derivePackageJson(JSON.parse(buf.toString('utf8')), { name: 'x', rules }).scripts ?? {} : {});
  let was, now, mine;
  try {
    was = scripts(base, baseRules);
    now = scripts(target, targetRules);
    mine = Buffer.isBuffer(cur) ? JSON.parse(cur.toString('utf8')).scripts ?? {} : {};
  } catch (e) {
    throw new Refusal(`${p} is not valid JSON: ${e.message}`);
  }
  const rows = [];
  for (const k of [...new Set([...Object.keys(was), ...Object.keys(now)])].sort()) {
    if (was[k] === now[k] || mine[k] === now[k]) continue;
    rows.push({ kind: mine[k] === was[k] ? 'merged: key updated' : 'merged: key reported', path: `${p} scripts.${k}`, file: p, key: k });
  }
  return rows.length ? rows : [{ kind: 'unchanged', path: p }];
}

// What each row kind means for the owner, and what --apply does with it.
const MEANING = {
  replace: 'pristine here, changed by slipway: --apply overwrites it',
  merge: 'you edited it under an override, and slipway changed it: --apply merges (conflict markers possible)',
  add: 'new in slipway, absent here: --apply copies it in',
  delete: 'slipway removed it and yours is pristine: --apply deletes it',
  'keep (edited)': 'slipway removed or changed it, but you edited yours: --apply leaves yours',
  collision: 'slipway ships a path where you have your own file: --apply leaves yours',
  'seeded: upstream changed': "a file you fill in, never rewritten: --apply writes slipway's diff under .slipway/upstream/ as a reference to port by hand, not a patch (it is against the template's copy); /sync-slipway walks you through it",
  'merged: key updated': 'a package.json script you left at the base value: --apply updates it',
  'merged: key reported': "a package.json script you changed: --apply keeps yours and shows slipway's",
  unchanged: 'the same on both sides: nothing to do',
};

// The next command for a row that needs the owner (OWNER_ROWS).
function nextStep(r, targetSha) {
  const from = targetSha ? targetSha.slice(0, 12) : 'the target';
  if (r.kind === 'collision') return `to keep yours, list it in ${OVERRIDES} with a reason; to take slipway's, copy its file from ${from} over yours`;
  if (r.kind === 'merged: key reported') return "sync --apply keeps your value and prints slipway's; edit the key by hand to take it";
  return "sync --apply leaves your file as it is; port slipway's change by hand if you want it";
}

function print(out, { branch, remote, source, base, targetSha, notes, log, verbose }, rows, plan = false) {
  const width = Math.max(...KINDS.map((k) => k.length));
  out.write(`slipway sync plan, on ${branch}\n`);
  out.write(`  source: ${publicSource(source)}\n`);
  out.write(`  base:   ${base.sha} (by content: the manifest's managed blobs)\n`);
  out.write(`  target: ${targetSha ?? `${SRC} (its files match no slipway commit)`}\n`);
  if (remote) out.write(`  remote: ${remote}\n`);
  for (const n of notes) out.write(`  note:   ${n}\n`);
  if (log.length) out.write(`\nslipway's commits, base → target (${log.length}, newest first):\n${log.map((l) => `  ${l}\n`).join('')}`);
  out.write('\n');
  const counts = KINDS.map((k) => [k, rows.filter((r) => r.kind === k).length]).filter(([, n]) => n);
  if (verbose) {
    for (const r of rows) out.write(`  ${r.kind.padEnd(width)}  ${r.path}\n`);
    out.write(`\n${rows.length} rows: ${counts.map(([k, n]) => `${n} ${k}`).join(', ')}. `);
    return;
  }
  out.write(`${BASE_WHY}\n\n${rows.length} rows:\n${bucketLines(counts.map(([k, n]) => ({ n, label: k, meaning: MEANING[k] })))}\n`);
  const owed = rows.filter((r) => OWNER_ROWS.includes(r.kind));
  if (plan && owed.length) out.write(`Needs you (${owed.length}):\n${needsLines(owed.map((r) => ({ kind: r.kind, path: r.path, next: nextStep(r, targetSha) })))}\n`);
  else if (plan) out.write('Nothing needs you.\n');
}

// ---- apply (F-01 step 4, #17)

const HARNESS = 'process/harness/settings.json';
const INSTALLED = '.claude/settings.json';
const UPSTREAM = '.slipway/upstream';
// The rows that leave the owner something to do: sync exits 1 on any of them.
const OWNER_ROWS = ['collision', 'merged: key reported', 'keep (edited)'];

/**
 * Carry out `rows` (plan's, not recomputed): compute every write, then branch, write and commit. Every
 * refusal compute() and the checks here can foresee comes before the branch; a failure after it (a
 * commit hook, a disk error) is named with the branch it left. Returns the exit code: 1 when a row needs
 * the owner.
 */
function apply(out, ctx, rows) {
  const { root, branch, base, gitDir, targetSha } = ctx;
  if (!targetSha) throw new Refusal('the target matches no slipway commit, so the manifest could not record it — run sync from a slipway checkout, or from `npx github:…#<sha>`');
  const short = (sha) => sha.slice(0, 12);
  // Forward only, and only to a commit the source has: the next sync finds its base there.
  try {
    git(['--git-dir', gitDir, 'merge-base', '--is-ancestor', base.sha, targetSha]);
  } catch (e) {
    throw new Refusal(
      e.status === 1
        ? `the target ${short(targetSha)} is not newer than the base ${short(base.sha)} — sync only moves forward; nothing was written`
        : `the target ${short(targetSha)} is not in ${publicSource(ctx.source)} — push it first; nothing was written`,
    );
  }
  const todo = compute(ctx, rows);
  const name = `slipway/sync-${short(targetSha)}`;
  const current = readProjectFile(root, MANIFEST);
  if (!todo.writes.size && !todo.removes.length && Buffer.isBuffer(current) && current.equals(todo.manifest)) {
    print(out, ctx, rows);
    out.write(`Already at ${short(targetSha)} — nothing to apply, nothing written.\n`);
    return 0;
  }
  const message = `chore: sync slipway ${short(base.sha)}..${short(targetSha)}`;
  const commit = land(root, branch, name, message, { writes: new Map([...todo.writes, [MANIFEST, { bytes: todo.manifest }]]), removes: todo.removes });

  print(out, ctx, rows);
  out.write(`Applied on ${name} (from ${branch}), commit ${short(commit)}: ${message}\n`);
  const say = (why, list) => list.length && out.write(`\n${why}\n${list.map((l) => `  ${l}\n`).join('')}`);
  say('merge — conflict markers left in the file; resolve them, and keep its override:', todo.conflicts.map((c) => `${c.path} (${c.n} conflict${c.n > 1 ? 's' : ''})`));
  say(`collision — slipway ships this path now; your file was not touched, and D1 flags it. To keep yours, override it with a reason; to take slipway's, copy its file from ${short(targetSha)} over yours:`, rows.filter((r) => r.kind === 'collision').map((r) => r.path));
  say('keep (edited) — slipway removed it; your file stays and is yours now:', todo.kept.gone);
  say(`keep (edited) — slipway changed it, but your copy is missing, not a file, or was seeded until now, so nothing was merged. Copy slipway's from ${short(targetSha)}, or override it with a reason:`, todo.kept.shipped);
  say(`stale override — it names no managed file now, so D1 flags it; remove it from ${OVERRIDES}:`, todo.stale);
  say('merged: key reported — your value stays; slipway\'s is shown:', todo.reported);
  say(`seeded: upstream changed — slipway's own diff (base → target): a reference to port by hand, not a patch to apply (it is against the template's copy, not yours). /sync-slipway walks you through them. The file was not touched:`, todo.diffs);
  if (todo.harness) out.write(`\nharness — ${todo.harness.text}\n`);
  const owed = todo.conflicts.length || todo.stale.length || todo.harness?.owed || rows.some((r) => OWNER_ROWS.includes(r.kind));
  out.write(owed ? '\nSync exits 1: the rows above need you before this branch merges.\n' : '');
  return owed ? 1 : 0;
}

// Every write --apply makes, and nothing written yet. Throws a Refusal on anything that would break
// the invariant or that git cannot do: a changed file, a symlink or directory where a file goes, a path
// the project ignores, a failed merge.
function compute({ root, manifest, overrides, base, gitDir, target, targetRules, targetSha }, rows) {
  const tmp = mkdtempSync(join(dirname(gitDir), 'apply-')); // inside the clone's temp dir: removed on exit
  const baseBytes = (p) => (base.tree.has(p) ? readBlob(gitDir, base.tree.get(p)) : null);
  const pristine = (p) => {
    const cur = readProjectFile(root, p);
    return Buffer.isBuffer(cur) && sha256(cur) === manifest.files[p]?.sha256;
  };
  // The executable bit, as slipway ships it: a hook it adds must still run.
  const exec = (p) => existsSync(join(SRC, p)) && (statSync(join(SRC, p)).mode & 0o111) !== 0;
  const moved = (p) => new Refusal(`${p} changed after it was planned — nothing was written`);
  const todo = { writes: new Map(), removes: [], conflicts: [], diffs: [], kept: { gone: [], shipped: [] }, stale: [], reported: [], harness: null, manifest: null };
  let pkg = null; // the project's package.json, once a key is updated
  let n = 0;

  for (const r of rows) {
    const { kind, path: p } = r;
    if (kind === 'replace' || kind === 'add') {
      // The invariant, checked again where it is spent: overwrite only a pristine file, create only an absent one.
      if (kind === 'replace' ? !pristine(p) : readProjectFile(root, p) !== null) throw moved(p);
      todo.writes.set(p, { bytes: target.get(p), exec: exec(p) });
    } else if (kind === 'delete') {
      if (!pristine(p)) throw moved(p);
      todo.removes.push(p);
    } else if (kind === 'merge') {
      const ours = readProjectFile(root, p);
      if (!Buffer.isBuffer(ours)) throw moved(p);
      const m = mergeFile(join(tmp, `merge-${++n}`), p, ours, baseBytes(p), target.get(p));
      todo.writes.set(p, { bytes: m.bytes });
      if (m.conflicts) todo.conflicts.push({ path: p, n: m.conflicts });
    } else if (kind === 'seeded: upstream changed') {
      const d = `${UPSTREAM}/${p}.diff`;
      todo.writes.set(d, { bytes: seededDiff(join(tmp, `diff-${++n}`), p, baseBytes(p), target.get(p) ?? null) });
      todo.diffs.push(d);
    } else if (kind === 'merged: key updated' || kind === 'merged: key reported') {
      const t = target.get(r.file);
      const now = t ? derivePackageJson(JSON.parse(t.toString('utf8')), { name: 'x', rules: targetRules }).scripts?.[r.key] : undefined;
      if (kind === 'merged: key reported') {
        todo.reported.push(`${p}: ${now === undefined ? '(removed)' : JSON.stringify(now)}`);
        continue;
      }
      if (!pkg) {
        const cur = readProjectFile(root, r.file);
        if (!Buffer.isBuffer(cur)) throw new Refusal(`${r.file} is missing — restore it before syncing its scripts; nothing was written`);
        pkg = { file: r.file, json: JSON.parse(cur.toString('utf8')) };
      }
      pkg.json.scripts ??= {};
      if (now === undefined) delete pkg.json.scripts[r.key];
      else pkg.json.scripts[r.key] = now;
    } else if (kind === 'keep (edited)') {
      (target.has(p) ? todo.kept.shipped : todo.kept.gone).push(p);
    }
  }
  if (pkg) todo.writes.set(pkg.file, { bytes: Buffer.from(`${JSON.stringify(pkg.json, null, 2)}\n`) });

  // The harness: installed only because the owner ran sync, and only over the copy slipway installed.
  const harnessRow = rows.find((r) => r.path === HARNESS)?.kind;
  if (harnessRow === 'replace' || harnessRow === 'add') {
    const installed = readProjectFile(root, INSTALLED);
    const was = baseBytes(HARNESS);
    if (installed === null) {
      todo.harness = { text: `${HARNESS} changed; ${INSTALLED} is not installed, so it was left out. Install it with: cp ${HARNESS} ${INSTALLED}` };
    } else if (Buffer.isBuffer(installed) && was && installed.equals(was)) {
      todo.writes.set(INSTALLED, { bytes: target.get(HARNESS) });
      todo.harness = { text: `${HARNESS} changed, and you installed it as ${INSTALLED} by running sync --apply. The owner runs this step; an agent must not (the harness asks before one does).` };
    } else {
      todo.harness = { owed: true, text: `${HARNESS} changed, but ${INSTALLED} was edited, so it was left as it is. Compare them: git diff --no-index ${INSTALLED} ${HARNESS}` };
    }
  } else if (harnessRow === 'merge') {
    todo.harness = { text: `${HARNESS} was merged; once it is resolved, install it with: cp ${HARNESS} ${INSTALLED}` };
  }

  const next = nextManifest({ manifest, target, targetRules, targetSha }, rows);
  todo.manifest = Buffer.from(`${JSON.stringify(next, null, 2)}\n`);
  // D1 was green, so every override named a managed file; one that no longer does was made stale here.
  todo.stale = overrides.filter((o) => hasReason(o) && next.files[o.path]?.class !== 'managed').map((o) => `${OVERRIDES}:${o.line}  path: ${o.path}`);

  checkWrites(root, [...todo.writes.keys(), MANIFEST], todo.removes);
  return todo;
}

/**
 * Where each write lands, checked before any is made: never through a symlink or onto a directory (the
 * last path component; a symlinked parent is a known limitation), never inside a file of the project's
 * (one not in `removes`), and never onto a path the project ignores, which git would refuse to commit
 * after the branch exists. Throws a Refusal naming every offending path.
 */
export function checkWrites(root, paths, removes = []) {
  const notFile = paths.filter((p) => readProjectFile(root, p) === NOT_A_FILE);
  if (notFile.length) throw new Refusal(`sync writes regular files only, and these are symlinks or directories — nothing was written:\n  ${notFile.join('\n  ')}`);
  // A file where a write needs a directory: a kept file slipway turned into a folder, or a file at .slipway/upstream.
  const removed = new Set(removes);
  const parents = new Set(paths.flatMap((p) => p.split('/').slice(0, -1).map((_, i, dirs) => dirs.slice(0, i + 1).join('/'))));
  const blocked = [...parents].filter((d) => !removed.has(d) && existsSync(join(root, d)) && !statSync(join(root, d)).isDirectory());
  if (blocked.length) throw new Refusal(`sync must write inside these, but each is a file of yours — move it first; nothing was written:\n  ${blocked.join('\n  ')}`);
  let ignored = '';
  try {
    ignored = git(['-C', root, 'check-ignore', '--', ...paths, ...removes]).trim();
  } catch (e) {
    if (e.status !== 1) throw new Refusal(`git check-ignore failed: ${gitReason(e)} — nothing was written`);
  }
  if (ignored) throw new Refusal(`the project ignores paths sync would write or delete, so it could not commit them — un-ignore them first; nothing was written:\n  ${ignored.split('\n').join('\n  ')}`);
}

/**
 * Branch `name` from `from`, make `removes` and `writes` (path → `{ bytes, exec? }`), and commit them
 * all as `message`. Returns the commit's sha. A branch that exists already is refused before anything
 * is written; a failure after the branch exists names it, and `from` is never touched.
 */
export function land(root, from, name, message, { writes, removes = [] }) {
  let exists = true;
  try {
    git(['-C', root, 'rev-parse', '--verify', '-q', `refs/heads/${name}`]);
  } catch {
    exists = false;
  }
  if (exists) throw new Refusal(`branch ${name} already exists — merge or delete it first; nothing was written`);
  try {
    git(['-C', root, 'switch', '-q', '-c', name]);
    // Deletes first: a file slipway turned into a directory must be gone before the directory is made.
    // Literal pathspecs: a path holding `*` or `:` names that file only. Git history keeps each deleted file.
    if (removes.length) git(['-C', root, '--literal-pathspecs', 'rm', '-q', '--', ...removes]);
    for (const [p, { bytes, exec }] of writes) {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), bytes);
      if (exec !== undefined) chmodSync(join(root, p), exec ? 0o755 : 0o644);
    }
    git(['-C', root, '--literal-pathspecs', 'add', '--', ...writes.keys()]);
    git(['-C', root, 'commit', '-q', '-m', message]);
    return git(['-C', root, 'rev-parse', 'HEAD']).trim();
  } catch (e) {
    throw new Refusal(`stopped partway: ${gitReason(e)}\nYou are on ${name}, with its writes not committed. ${from} and its commits are untouched.`);
  }
}

/**
 * The manifest after the sync, by the target's classes. Each managed path the target ships is recorded
 * at the target's blob, so the next sync finds this target as its base exactly; its sha256 is the
 * target's too, except a merged or kept file keeps its own (F-01: until resolved) and a collision
 * holds slipway's, so D1 flags it until the owner overrides it or takes slipway's copy. A managed path
 * the target no longer ships leaves the manifest: the file, if kept, is the project's. Seeded and
 * merged entries stay as they are; one the target adds is recorded as written.
 */
function nextManifest({ manifest, target, targetRules, targetSha }, rows) {
  const kind = new Map(rows.map((r) => [r.path, r.kind]));
  const version = JSON.parse(target.get('package.json')?.toString('utf8') ?? '{}').version ?? manifest.version;
  const next = buildManifest(null, [...target.keys()], {
    rules: targetRules,
    slipway: targetSha,
    version,
    source: manifest.source,
    answers: manifest.answers,
    read: (p) => target.get(p),
  });
  const files = {};
  for (const p of [...new Set([...Object.keys(manifest.files), ...target.keys()])].sort()) {
    const m = manifest.files[p];
    const t = next.files[p];
    if (!t) {
      if (m && m.class !== 'managed') files[p] = m;
    } else if (t.class === 'managed') {
      files[p] = m && (kind.get(p) === 'merge' || kind.get(p) === 'keep (edited)') ? { ...t, sha256: m.sha256 } : t;
    } else if (m) {
      files[p] = { ...m, class: t.class };
    } else if (kind.get(p) === 'add') {
      files[p] = t;
    }
  }
  return { ...next, files };
}

// `git merge-file` on copies in `dir`: the project's side, the base, slipway's side. Conflict markers
// stay in the result; git's exit status is their count.
function mergeFile(dir, p, ours, base, theirs) {
  mkdirSync(dir);
  const file = (name, buf) => {
    writeFileSync(join(dir, name), buf);
    return join(dir, name);
  };
  const args = ['merge-file', '-p', '-L', 'project', '-L', 'base', '-L', 'slipway', file('ours', ours), file('base', base ?? Buffer.alloc(0)), file('theirs', theirs)];
  try {
    return { bytes: git(args, { encoding: 'buffer' }), conflicts: 0 };
  } catch (e) {
    if (e.status >= 1 && e.status <= 127 && Buffer.isBuffer(e.stdout)) return { bytes: e.stdout, conflicts: e.status };
    throw new Refusal(`${p}: git merge-file failed: ${gitReason(e)} — nothing was written`);
  }
}

// Slipway's own change to a seeded file, base → target, as a patch that names the project's path.
function seededDiff(dir, p, was, now) {
  const side = (s, buf) => {
    if (!buf) return '/dev/null';
    mkdirSync(dirname(join(dir, s, p)), { recursive: true });
    writeFileSync(join(dir, s, p), buf);
    return `${s}/${p}`;
  };
  const args = ['diff', '--no-index', '--no-prefix', '--no-ext-diff', '--no-textconv', '--no-color', '--binary', '--', side('a', was), side('b', now)];
  try {
    git(args, { cwd: dir, encoding: 'buffer' });
  } catch (e) {
    if (e.status === 1 && Buffer.isBuffer(e.stdout)) return e.stdout;
    throw new Refusal(`${p}: git diff failed: ${gitReason(e)} — nothing was written`);
  }
  throw new Refusal(`${p}: planned as changed upstream, but its base and target are the same`);
}
