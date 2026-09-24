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
// overwritten or deleted without a three-way merge; the check runs again right before each write.
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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasReason, isTemplate, MANIFEST, OVERRIDES, readManifest, readOverrides, readProjectFile, sha256 } from '../ci/checks/lib/manifest.mjs';
import { classify } from '../ci/checks/lib/ownership.mjs';
import { commitFiles, readBlob, resolveBase, sourceClone } from './lib/base.mjs';
import { blobSha, buildManifest, derivePackageJson, git, gitignoreText, gitReason, publicSource, redactUrls, resolveSlipway, SOURCE, templateFiles } from './lib/install.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: sync [--plan | --apply]   (run in the project; --adopt arrives in F-01 step 5)';
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
      if (a === '--adopt') throw new Refusal('--adopt arrives in F-01 step 5 (#18)');
      if (a !== '--plan' && a !== '--apply') throw new Refusal(`unknown argument ${a}\n${USAGE}`);
    }
    if (argv.includes('--plan') && argv.includes('--apply')) throw new Refusal(`--plan and --apply: choose one\n${USAGE}`);
    const ctx = preflight(cwd);
    const rows = plan(ctx);
    if (!argv.includes('--apply')) {
      print(out, ctx, rows);
      out.write('Plan only — nothing was written.\n');
      return 0;
    }
    return apply(out, ctx, rows);
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
  out.write(`\n${rows.length} rows: ${counts.map(([k, n]) => `${n} ${k}`).join(', ')}. `);
}

// ---- apply (F-01 step 4, #17)

const HARNESS = 'process/harness/settings.json';
const INSTALLED = '.claude/settings.json';
const UPSTREAM = '.slipway/upstream';
// The rows that leave the owner something to do: sync exits 1 on any of them.
const OWNER_ROWS = ['collision', 'merged: key reported', 'keep (edited)'];

/**
 * Carry out `rows` (plan's, not recomputed): compute every write, then branch, write and commit. Every
 * refusal is raised before the first write. Returns the exit code: 1 when a row needs the owner.
 */
function apply(out, ctx, rows) {
  const { root, branch, manifest, base, targetSha } = ctx;
  if (!targetSha) throw new Refusal('the target matches no slipway commit, so the manifest could not record it — run sync from a slipway checkout, or from `npx github:…#<sha>`');
  const todo = compute(ctx, rows);
  const name = `slipway/sync-${targetSha.slice(0, 12)}`;
  const current = readProjectFile(root, MANIFEST);
  if (!todo.writes.size && !todo.removes.length && Buffer.isBuffer(current) && current.equals(todo.manifest)) {
    print(out, ctx, rows);
    out.write(`Already at ${targetSha.slice(0, 12)} — nothing to apply, nothing written.\n`);
    return 0;
  }
  let exists = true;
  try {
    git(['-C', root, 'rev-parse', '--verify', '-q', `refs/heads/${name}`]);
  } catch {
    exists = false;
  }
  if (exists) throw new Refusal(`branch ${name} already exists — merge or delete it first; nothing was written`);

  const message = `chore: sync slipway ${base.sha.slice(0, 12)}..${targetSha.slice(0, 12)}`;
  let commit;
  try {
    git(['-C', root, 'switch', '-q', '-c', name]);
    for (const [p, buf] of todo.writes) {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), buf);
    }
    writeFileSync(join(root, MANIFEST), todo.manifest);
    // Literal pathspecs: a path holding `*` or `:` names that file only. Git history keeps each deleted file.
    if (todo.removes.length) git(['-C', root, '--literal-pathspecs', 'rm', '-q', '--', ...todo.removes]);
    git(['-C', root, '--literal-pathspecs', 'add', '--', MANIFEST, ...todo.writes.keys()]);
    git(['-C', root, 'commit', '-q', '-m', message]);
    commit = git(['-C', root, 'rev-parse', 'HEAD']).trim();
  } catch (e) {
    throw new Refusal(`stopped partway on ${name}: ${gitReason(e)}\n${branch} and its commits are untouched; \`git status\` shows what ${name} holds`);
  }

  print(out, ctx, rows);
  out.write(`Applied on ${name} (from ${branch}), commit ${commit.slice(0, 12)}: ${message}\n`);
  const say = (why, list) => list.length && out.write(`\n${why}\n${list.map((l) => `  ${l}\n`).join('')}`);
  say('merge — conflict markers left in the file; resolve them, and keep its override:', todo.conflicts.map((c) => `${c.path} (${c.n} conflict${c.n > 1 ? 's' : ''})`));
  say('collision — slipway ships this path now and your file was not touched; override it with a reason, or move yours and take slipway\'s:', rows.filter((r) => r.kind === 'collision').map((r) => r.path));
  say('keep (edited) — slipway removed it; your file stays and is yours now. Remove the override that names it:', todo.kept);
  say('merged: key reported — your value stays; slipway\'s is shown:', todo.reported);
  say(`seeded: upstream changed — slipway's own diff (base → target), for you to port or decline; the file was not touched:`, todo.diffs);
  if (todo.harness) out.write(`\nharness — ${todo.harness.text}\n`);
  const owed = todo.conflicts.length || todo.harness?.owed || rows.some((r) => OWNER_ROWS.includes(r.kind));
  out.write(owed ? '\nSync exits 1: the rows above need you before this branch merges.\n' : '');
  return owed ? 1 : 0;
}

// Every write --apply makes, and nothing written yet. Throws a Refusal on anything that would break
// the invariant or that git cannot do.
function compute({ root, manifest, overrides, base, gitDir, target, targetRules, targetSha }, rows) {
  const tmp = mkdtempSync(join(dirname(gitDir), 'apply-')); // inside the clone's temp dir: removed on exit
  const baseBytes = (p) => (base.tree.has(p) ? readBlob(gitDir, base.tree.get(p)) : null);
  const pristine = (p) => {
    const cur = readProjectFile(root, p);
    return Buffer.isBuffer(cur) && sha256(cur) === manifest.files[p]?.sha256;
  };
  const moved = (p) => new Refusal(`${p} changed after it was planned — nothing was written`);
  const todo = { writes: new Map(), removes: [], conflicts: [], diffs: [], kept: [], reported: [], harness: null, manifest: null };
  let pkg = null; // the project's package.json, once a key is updated
  let n = 0;

  for (const { kind, path: p } of rows) {
    if (kind === 'replace' || kind === 'add') {
      // The invariant, checked again where it is spent: overwrite only a pristine file, create only an absent one.
      if (kind === 'replace' ? !pristine(p) : readProjectFile(root, p) !== null) throw moved(p);
      todo.writes.set(p, target.get(p));
    } else if (kind === 'delete') {
      if (!pristine(p)) throw moved(p);
      todo.removes.push(p);
    } else if (kind === 'merge') {
      const ours = readProjectFile(root, p);
      if (!Buffer.isBuffer(ours)) throw moved(p);
      const r = mergeFile(join(tmp, `merge-${++n}`), p, ours, baseBytes(p), target.get(p));
      todo.writes.set(p, r.bytes);
      if (r.conflicts) todo.conflicts.push({ path: p, n: r.conflicts });
    } else if (kind === 'seeded: upstream changed') {
      const d = `${UPSTREAM}/${p}.diff`;
      todo.writes.set(d, seededDiff(join(tmp, `diff-${++n}`), p, baseBytes(p), target.get(p) ?? null));
      todo.diffs.push(d);
    } else if (kind === 'merged: key updated' || kind === 'merged: key reported') {
      const at = p.indexOf(' scripts.');
      const [file, key] = [p.slice(0, at), p.slice(at + ' scripts.'.length)];
      const t = target.get(file);
      const now = t ? derivePackageJson(JSON.parse(t.toString('utf8')), { name: 'x', rules: targetRules }).scripts?.[key] : undefined;
      if (kind === 'merged: key reported') {
        todo.reported.push(`${p}: ${now === undefined ? '(removed)' : JSON.stringify(now)}`);
        continue;
      }
      if (!pkg) {
        const cur = readProjectFile(root, file);
        if (!Buffer.isBuffer(cur)) throw new Refusal(`${file} is missing — restore it before syncing its scripts; nothing was written`);
        pkg = { file, json: JSON.parse(cur.toString('utf8')) };
      }
      pkg.json.scripts ??= {};
      if (now === undefined) delete pkg.json.scripts[key];
      else pkg.json.scripts[key] = now;
    } else if (kind === 'keep (edited)') {
      const o = overrides.find((x) => x.path === p);
      todo.kept.push(o ? `${OVERRIDES}:${o.line}  path: ${p}` : p);
    }
  }
  if (pkg) todo.writes.set(pkg.file, Buffer.from(`${JSON.stringify(pkg.json, null, 2)}\n`));

  // The harness: installed only because the owner ran sync, and only over the copy slipway installed.
  if (todo.writes.has(HARNESS) && !rows.some((r) => r.path === HARNESS && r.kind === 'merge')) {
    const installed = readProjectFile(root, INSTALLED);
    const was = baseBytes(HARNESS);
    if (installed === null) {
      todo.harness = { text: `${HARNESS} changed; ${INSTALLED} is not installed, so it was left out. Install it with: cp ${HARNESS} ${INSTALLED}` };
    } else if (Buffer.isBuffer(installed) && was && installed.equals(was)) {
      todo.writes.set(INSTALLED, target.get(HARNESS));
      todo.harness = { text: `${HARNESS} changed, and you installed it as ${INSTALLED} by running sync. An agent never does this step.` };
    } else {
      todo.harness = { owed: true, text: `${HARNESS} changed, but ${INSTALLED} was edited, so it was left as it is. Compare them: git diff --no-index ${INSTALLED} ${HARNESS}` };
    }
  } else if (rows.some((r) => r.path === HARNESS && r.kind === 'merge')) {
    todo.harness = { text: `${HARNESS} was merged; once it is resolved, install it with: cp ${HARNESS} ${INSTALLED}` };
  }

  todo.manifest = Buffer.from(`${JSON.stringify(nextManifest({ manifest, target, targetRules, targetSha }, rows), null, 2)}\n`);
  return todo;
}

/**
 * The manifest after the sync, by the target's classes. Each managed path the target ships is recorded
 * at the target's blob, so the next sync finds this target as its base exactly; its sha256 is the
 * target's too, except a merged or kept file keeps its own (F-01: until resolved) and a collision
 * holds slipway's, so D1 flags it until the owner overrides it or moves their file. A managed path the
 * target no longer ships leaves the manifest: the file, if kept, is the project's. Seeded and merged
 * entries stay as they are; one the target adds is recorded as written.
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
