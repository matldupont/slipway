// sync — take a newer slipway into a project (F-01, dev/features/template-sync.md). Step 3: the plan.
//
//   npx github:matldupont/slipway#<ref> sync        run in the project
//   node <slipway>/scripts/new-project.mjs sync
//
// Reached through new-project's bin, so this code is always the target version's. It prints one row
// per path — what a sync to this version would do — and writes nothing: no file, no branch, no commit.
// The only write is its clone of slipway, in a new temp dir removed on exit.
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
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasReason, isTemplate, MANIFEST, readManifest, readOverrides, readProjectFile, sha256 } from '../ci/checks/lib/manifest.mjs';
import { classify } from '../ci/checks/lib/ownership.mjs';
import { commitFiles, readBlob, resolveBase, sourceClone } from './lib/base.mjs';
import { blobSha, derivePackageJson, git, gitignoreText, gitReason, publicSource, redactUrls, resolveSlipway, SOURCE, templateFiles } from './lib/install.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: sync [--plan]   (run in the project; --apply arrives in F-01 step 4, --adopt in step 5)';
export const KINDS = [
  'replace', 'merge', 'add', 'delete', 'keep (edited)', 'collision',
  'seeded: upstream changed', 'merged: key updated', 'merged: key reported', 'unchanged',
];

// A named reason to stop: printed as `sync: <reason>`, exit 1.
class Refusal extends Error {}

export function main(argv, { cwd = process.cwd(), out = process.stdout, err = process.stderr } = {}) {
  try {
    for (const a of argv) {
      if (a === '-h' || a === '--help') { out.write(`${USAGE}\n`); return 0; }
      if (a === '--apply') throw new Refusal('--apply arrives in F-01 step 4 (#17); this version only plans');
      if (a === '--adopt') throw new Refusal('--adopt arrives in F-01 step 5 (#18)');
      if (a !== '--plan') throw new Refusal(`unknown argument ${a}\n${USAGE}`);
    }
    const ctx = preflight(cwd);
    const rows = plan(ctx);
    print(out, ctx, rows);
    return 0;
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    err.write(`sync: ${e.message}\n`);
    return 1;
  }
}

function preflight(cwd) {
  let root;
  try {
    root = git(['-C', cwd, 'rev-parse', '--show-toplevel']).trim();
  } catch {
    throw new Refusal(`${cwd} is not inside a git repository — run sync in the project`);
  }
  if (isTemplate(root)) throw new Refusal('this is slipway itself — run sync in a project built from it');
  // --no-optional-locks: status must not refresh the index, or the plan would write to .git.
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
  let manifest, overrides;
  try {
    manifest = readManifest(root);
    overrides = readOverrides(root);
  } catch (e) {
    throw new Refusal(e.message);
  }
  if (!manifest) throw new Refusal(`no ${MANIFEST} — run \`sync --adopt\` (arrives in F-01 step 5, #18)`);
  const d1 = spawnSync(process.execPath, [join(SRC, 'ci', 'checks', 'meta', 'd1-drift.mjs'), root], { encoding: 'utf8' });
  if (d1.status !== 0) throw new Refusal(`D1 is red — sync would lose or refuse these edits; fix them first:\n${(d1.stdout + d1.stderr).trim()}`);

  const managed = new Map();
  for (const [p, f] of Object.entries(manifest.files)) {
    if (f.class !== 'managed') continue;
    if (!/^[0-9a-f]{40}$/.test(f.blob ?? '')) throw new Refusal(`${MANIFEST}: "${p}" has no blob id, so the base cannot be found — re-adopt it (#18)`);
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
  // Git failing on the clone's history (an empty source, a default branch gone) is a named refusal too.
  const history = (fn) => {
    try {
      return fn();
    } catch (e) {
      if (e instanceof Refusal) throw e;
      throw new Refusal(`cannot read slipway's history from ${publicSource(source)}: ${redactUrls(gitReason(e))}`);
    }
  };

  const r = history(() => resolveBase(gitDir, managed, { start: manifest.slipway }));
  if (!r.exact) {
    const c = (x) => `${x.sha.slice(0, 12)} (${x.matched} of ${r.total} managed files at their blob${x.extra ? `, ${x.extra} more it ships` : ''})`;
    throw new Refusal(
      r.best
        ? `no slipway commit holds exactly the manifest's ${r.total} managed files; closest ${c(r.best)}${r.runnerUp ? `, then ${c(r.runnerUp)}` : ''}`
        : `${publicSource(source)} has no commits to compare the manifest with`,
    );
  }
  const base = history(() => commitFiles(gitDir, r.exact));

  // The target's sha, for the header: this checkout's clean HEAD, else the commit holding its managed
  // blobs on any branch (`npx github:…#<ref>` may run a ref off the default branch).
  const targetManaged = new Map(t.copy.filter((p) => classify(t.rules, p) === 'managed').map((p) => [p, blobSha(target.get(p))]));
  const targetSha = resolveSlipway(SRC, t.copy, { rules: t.rules }).sha ?? history(() => resolveBase(gitDir, targetManaged, { ref: '--branches' }).exact);
  // npm never packs .gitignore: under npx, slipway's own is in the target commit, not on disk. Without
  // that commit the target's copy is unknown, and the plan says so rather than compare a stand-in.
  const notes = [];
  if (!existsSync(join(SRC, '.gitignore'))) {
    const id = targetSha && history(() => commitFiles(gitDir, targetSha).tree.get('.gitignore'));
    if (id) target.set('.gitignore', history(() => readBlob(gitDir, id)));
    else if (base.tree.has('.gitignore')) {
      target.set('.gitignore', history(() => readBlob(gitDir, base.tree.get('.gitignore'))));
      notes.push("the target's .gitignore is unknown (npm does not pack it, and no slipway commit matches this package); its row compares the base with itself");
    }
  }

  return { notes, root, branch, manifest, overrides, source, base: { sha: r.exact, ...base }, gitDir, target, targetRules: t.rules, targetSha };
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
    rows.push({ kind: mine[k] === was[k] ? 'merged: key updated' : 'merged: key reported', path: `${p} scripts.${k}` });
  }
  return rows.length ? rows : [{ kind: 'unchanged', path: p }];
}

function print(out, { branch, source, base, targetSha, notes }, rows) {
  const width = Math.max(...KINDS.map((k) => k.length));
  out.write(`slipway sync plan, on ${branch}\n`);
  out.write(`  source: ${publicSource(source)}\n`);
  out.write(`  base:   ${base.sha} (by content: the manifest's managed blobs)\n`);
  out.write(`  target: ${targetSha ?? `${SRC} (its files match no slipway commit)`}\n`);
  for (const n of notes) out.write(`  note:   ${n}\n`);
  out.write('\n');
  for (const r of rows) out.write(`  ${r.kind.padEnd(width)}  ${r.path}\n`);
  const counts = KINDS.map((k) => [k, rows.filter((r) => r.kind === k).length]).filter(([, n]) => n);
  out.write(`\n${rows.length} rows: ${counts.map(([k, n]) => `${n} ${k}`).join(', ')}. Plan only — nothing was written.\n`);
}
