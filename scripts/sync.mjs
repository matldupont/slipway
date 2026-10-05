// sync — take a newer slipway into a project (F-01, dev/features/template-sync.md). Steps 3–4.
//
//   pnpm -s use-slipway sync [--plan]   run in the project: the plan, the default
//   pnpm -s use-slipway sync --apply    carry it out on a branch, in one commit
//   pnpm -s use-slipway sync --json     the plan as one JSON document, for /sync-slipway (F-08 §2)
//   pnpm -s use-slipway sync --log      the plan, with every change of slipway's instead of what's new
//   (the script is `npx github:matldupont/slipway#main`; a project without it yet runs that, #<ref> for another ref)
//   node <slipway>/scripts/new-project.mjs sync …
//
// Reached through new-project's bin, so this code is always the target version's. The plan computes one
// row per path — what a sync to this version would do — and writes nothing: no file, no branch, no
// commit. The only write is its clone of slipway, in a new temp dir removed on exit. It prints for the
// owner (F-08 §3, lib/sync-text.mjs): what needs them first, the next command last; --verbose lists the rows.
//
// --apply (step 4, #17) takes those rows as they are and computes every write first, so a refusal
// leaves the project untouched. Then it creates `slipway/sync-<target>` from the current branch and
// commits the files and the manifest together. No path whose content differs from its manifest hash is
// overwritten or deleted without a three-way merge: the hash is checked again as each write is computed.
// It installs the harness, so the owner runs it: under an agent (CLAUDECODE set) it refuses, and the
// harness asks before any Bash command that runs it.
//
//   target  the files of the slipway running this command, classified by its dev/ownership.yaml; its commit
//           is this checkout's HEAD, or under a registry install the release tag's (lib/base.mjs, F-10)
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
import { readList, skippable } from '../ci/checks/lib/yaml-list.mjs';
import { commitFiles, readBlob, releaseTag, resolveBase, resolveTarget, sourceClone } from './lib/base.mjs';
import { BASE_WHY } from './lib/summary.mjs';
import { alreadyLine, alreadyText, appliedText, CONVENTIONAL, pastLine, pastText, planText, targetName } from './lib/sync-text.mjs';
import { clean, oneLine, ui } from './lib/ui.mjs';
import { blobSha, buildManifest, derivePackageJson, git, gitignoreText, gitReason, publicSource, redactUrls, resolveSlipway, shippedDiffer, SOURCE, syncCommand, templateFiles } from './lib/install.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: sync [--plan | --apply] [--verbose | --log | --json]   (run in the project; a project with no manifest: sync --adopt, see --adopt --help)';
const FLAGS = ['--plan', '--apply', '--verbose', '--log', '--json'];
// On a terminal only, on stderr, while slipway's history is read; static, since sync never yields to draw.
const PROGRESS = "◇  Reading slipway's history…";
export const KINDS = [
  'replace', 'merge', 'add', 'delete', 'keep (edited)', 'collision',
  'seeded: upstream changed', 'no longer tracked', 'merged: key updated', 'merged: key reported', 'unchanged',
];

// A named reason to stop: printed as `sync: <reason>`, exit 1. Adopt (adopt.mjs) throws it too.
export class Refusal extends Error {}

export function main(argv, { cwd = process.cwd(), out = process.stdout, err = process.stderr, env = process.env } = {}) {
  let settle = () => {}; // clears the progress line, once
  try {
    for (const a of argv) {
      if (a === '-h' || a === '--help') { out.write(`${USAGE}\n\n${BASE_WHY}\n`); return 0; }
      if (!FLAGS.includes(a)) throw new Refusal(`unknown argument ${oneLine(a)}\n${USAGE}`);
    }
    if (argv.includes('--plan') && argv.includes('--apply')) throw new Refusal(`--plan and --apply: choose one\n${USAGE}`);
    // --json is the plan for a program to read (F-08 §2): refused with either flag that prints for a person.
    const json = argv.includes('--json');
    if (json && argv.includes('--apply')) throw new Refusal('--json is for the plan; --apply prints for the owner — nothing was written');
    if (json && argv.includes('--verbose')) throw new Refusal(`--json and --verbose: choose one — nothing was written\n${USAGE}`);
    const log = argv.includes('--log');
    if (log && argv.includes('--apply')) throw new Refusal('--log is for the plan; --apply prints what it did — nothing was written');
    if (log && (json || argv.includes('--verbose'))) throw new Refusal(`--log and ${json ? '--json' : '--verbose'}: choose one — nothing was written\n${USAGE}`);
    if (argv.includes('--apply') && process.env.CLAUDECODE) {
      throw new Refusal('--apply installs slipway\'s files and its harness, so the owner runs it in their own terminal, not an agent (CLAUDECODE is set) — nothing was written');
    }
    if (!json && out.isTTY === true && err.isTTY === true) {
      err.write(PROGRESS);
      settle = () => { settle = () => {}; err.write(`\r${' '.repeat(PROGRESS.length)}\r`); };
    }
    const ctx = { ...preflight(cwd), verbose: argv.includes('--verbose') };
    if (ctx.past) {
      // The project synced from a commit past this one: there is nothing to take, so nothing is planned or
      // written, whichever of the plan and --apply was asked for.
      settle();
      if (json) writeDoc(out, planDoc(ctx, [], { stale: [], absorbed: [] }));
      else out.write(pastText(ui(out, env), { branch: ctx.branch, remote: ctx.remote, notes: ctx.notes, version: ctx.targetVersion, target: ctx.targetSha }));
      return 0;
    }
    const rows = plan(ctx);
    if (!argv.includes('--apply')) {
      // The plan lists the stale overrides --apply will, and the ones it removes, so it computes the same
      // writes, in its temp dir only. What stops that stops --apply too, and the owner hears it now.
      let stale, absorbed;
      try {
        ({ stale, absorbed } = compute(ctx, rows, { check: false }));
      } catch (e) {
        if (e instanceof Refusal) throw new Refusal(`${e.message}\n--apply would refuse this too, so the plan stops here.`);
        throw e;
      }
      settle();
      const idle = nothingToTake(ctx, rows, { stale, absorbed });
      if (json) {
        writeDoc(out, planDoc(ctx, rows, { stale, absorbed, idle }));
        return 0;
      }
      if (idle && !ctx.verbose) {
        out.write(alreadyText(ui(out, env), { branch: ctx.branch, remote: ctx.remote, target: ctx.targetSha, version: ctx.targetVersion }));
        return 0;
      }
      if (ctx.verbose) {
        printVerbose(out, ctx, rows);
        out.write('Plan only — nothing was written.\n');
      } else out.write(planText(ui(out, env), planView(ctx, rows, { stale, absorbed, log })));
      return 0;
    }
    settle();
    return apply(out, ui(out, env), ctx, rows);
  } catch (e) {
    settle();
    if (!(e instanceof Refusal)) throw e;
    err.write(`sync: ${clean(e.message)}\n`); // a refusal quotes paths and git's words: no control character reaches the terminal
    return 1;
  }
}

// JSON.stringify escapes C0 controls only. DEL and the C1 range (U+009B is CSI) would reach a terminal raw
// from a commit subject or a path, so they are escaped too; a parser reads the same text.
function writeDoc(out, doc) {
  const text = JSON.stringify(doc, null, 2);
  out.write(`${text.replace(/[\u007f-\u009f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`);
}

// Whether this package holds exactly what the commit with `tree` ships. Its ownership map must be that
// commit's, byte for byte: then both sides ship the same paths, and one classification decides which files
// are compared. A commit that only reclassified a path is another commit, whatever version it carries.
const sameShipped = (tree, t) =>
  tree.get(MAP) === blobSha(readFileSync(join(SRC, MAP))) && shippedDiffer(tree, SRC, t.copy, { rules: t.rules }).length === 0;

// The version the target's package.json carries, or null: what the manifest records, and the release to look for.
function packageVersion(target) {
  try {
    return JSON.parse(target.get('package.json')?.toString('utf8') ?? '{}').version ?? null;
  } catch {
    return null; // the plan refuses a package.json that is not JSON, by name
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
    throw new Refusal(`${oneLine(cwd)} is not inside a git repository — run sync in the project`);
  }
  if (isTemplate(root)) throw new Refusal('this is slipway itself — run sync in a project built from it');
  const dirty = git(['-C', root, '--no-optional-locks', 'status', '--porcelain', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
  if (dirty.length) {
    const shown = dirty.slice(0, 5).map((l) => `\n  ${oneLine(l)}`).join('') + (dirty.length > 5 ? `\n  +${dirty.length - 5} more` : '');
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
    throw new Refusal(`cannot read slipway's history from ${oneLine(publicSource(source))}: ${redactUrls(gitReason(e))}`);
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
    if (!/^[0-9a-f]{40}$/.test(f.blob ?? '')) throw new Refusal(`${MANIFEST}: "${oneLine(p)}" has no blob id, so the base cannot be found — remove the manifest and run \`sync --adopt\``);
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
    const c = (x) => `${x.sha.slice(0, 12)} (${x.matched} of ${r.total} of slipway's files at their blob${x.extra ? `, ${x.extra} more it ships` : ''})`;
    throw new Refusal(
      r.best
        ? `no slipway commit holds exactly the manifest's ${r.total} slipway files; closest ${c(r.best)}${r.runnerUp ? `, then ${c(r.runnerUp)}` : ''}`
        : `${oneLine(publicSource(source))} has no commits to compare the manifest with`,
    );
  }
  const base = read(() => commitFiles(gitDir, r.exact));
  if (!base.tree.has(MAP)) base.rules = t.rules;

  // The target's sha: this checkout's clean HEAD, else the commit the package came from — the release's tag
  // when the package holds exactly what that commit ships, then its managed blobs on the default branch, then
  // on any branch (lib/base.mjs, resolveTarget). The version is shown only when the target is the commit the
  // tag `v<version>` names: any other commit is not that release.
  const targetManaged = new Map(t.copy.filter((p) => classify(t.rules, p) === 'managed').map((p) => [p, blobSha(target.get(p))]));
  const version = packageVersion(target);
  const head = resolveSlipway(SRC, t.copy, { rules: t.rules }).sha;
  const found = head ? { sha: head, release: read(() => releaseTag(gitDir, version)) === head } : read(() => resolveTarget(gitDir, targetManaged, { version, same: (tree) => sameShipped(tree, t) }));
  const targetSha = found.sha;
  const targetVersion = found.release ? version : null;
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
  // `log` is every subject, as --verbose lists them; `commits` leaves the merges out, for the plan and --json.
  let log = [];
  let commits = [];
  // The plan and --apply refuse the same base, and both say so when the project is already past the target.
  const past = Boolean(targetSha) && targetSha !== r.exact && forwardOnly(gitDir, r.exact, targetSha, source) === 'past';
  if (targetSha && targetSha !== r.exact && !past) {
    try {
      // Parents, a tab, the subject: a merge has two parents or more, so one walk gives both lists.
      const all = git(['--git-dir', gitDir, 'log', '--format=%P%x09%s', `${r.exact}..${targetSha}`]).split('\n')
        .map((l) => ({ merge: l.slice(0, l.indexOf('\t')).includes(' '), subject: l.slice(l.indexOf('\t') + 1) }))
        .filter((c) => c.subject);
      log = all.map((c) => c.subject);
      commits = all.filter((c) => !c.merge).map((c) => c.subject);
    } catch {
      notes.push(`slipway's commits base → target are not listed: ${targetSha.slice(0, 12)} is not in ${publicSource(source)} (unpushed?)`);
    }
  }

  return { notes, log, commits, root, branch, remote, manifest, overrides, source, base: { sha: r.exact, ...base }, gitDir, target, targetRules: t.rules, targetSha, targetVersion, past };
}

/**
 * Refuses a target that is not newer than the base: sync moves forward only, and a target the source
 * lacks cannot be the next base. Plan and --apply both call it, so a plan never reads as ready for a base
 * --apply would refuse. A target that shares no history with the base gets its own words: git could
 * name no commit between them. A target the base descends from is no refusal: the project is already past
 * it (it synced from a later commit than the release it runs now), and `'past'` is returned.
 */
function forwardOnly(gitDir, base, target, source, { apply = false } = {}) {
  const short = (sha) => sha.slice(0, 12);
  try {
    git(['--git-dir', gitDir, 'merge-base', '--is-ancestor', base, target]);
  } catch (e) {
    if (e.status !== 1) {
      // The target is not in the source: the plan notes it and goes on; --apply cannot record it.
      if (apply) throw new Refusal(`the target ${short(target)} is not in ${oneLine(publicSource(source))} — push it first; nothing was written`);
      return;
    }
    try {
      git(['--git-dir', gitDir, 'merge-base', '--is-ancestor', target, base]);
      return 'past';
    } catch {
      // Not an ancestor, or git could not say: the refusals below.
    }
    let shared = true;
    try {
      git(['--git-dir', gitDir, 'merge-base', base, target]);
    } catch {
      shared = false;
    }
    throw new Refusal(
      shared
        ? `the target ${short(target)} is not newer than the base ${short(base)} — sync only moves forward; nothing was written`
        : `the target ${short(target)} and the base ${short(base)} share no history in ${oneLine(publicSource(source))}, so sync cannot say what changed between them; nothing was written`,
    );
  }
}

// A path as the owner pastes it into a shell: as is when it is plain, else single-quoted.
export const shellQuote = (p) => (/^[\w./@%+=,-]+$/.test(p) ? p : `'${p.replaceAll("'", "'\\''")}'`);

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
    (now && Buffer.isBuffer(cur) && blobSha(cur) === recorded ? restore : own).push(p);
  }
  if (!restore.length && !own.length) return null;
  const list = (ps) => ps.map((p) => `\n  ${p}`).join('');
  const short = best.slice(0, 12);
  const re = restore.map((p) => ` --revert ${shellQuote(p)}`).join('');
  return [
    `slipway's history was changed after this project recorded its version, so that record points at a version ${oneLine(publicSource(source))} no longer has. The nearest one is ${short}, which differs in:${list([...restore, ...own])}`,
    `To re-point the project at ${short}${restore.length ? ", restoring slipway's copy of each file you have not changed" : ''}, run this in your own terminal:\n  git switch -c slipway/re-point && git rm -q ${MANIFEST} && git commit -qm "chore: drop the slipway record for a rewritten history" && ${syncCommand(root)} --adopt --apply --base ${best}${re}`,
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
    } else if (cls === 'seeded' && !t) {
      add('no longer tracked', p); // slipway stopped shipping it (internal now, or gone): the project's file stays its own
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
    throw new Refusal(`${oneLine(p)} is not valid JSON: ${oneLine(e.message)}`);
  }
  const rows = [];
  for (const k of [...new Set([...Object.keys(was), ...Object.keys(now)])].sort()) {
    if (was[k] === now[k] || mine[k] === now[k]) continue;
    rows.push({ kind: mine[k] === was[k] ? 'merged: key updated' : 'merged: key reported', path: `${p} scripts.${k}`, file: p, key: k });
  }
  return rows.length ? rows : [{ kind: 'unchanged', path: p }];
}

// The words a row kind is shown in. The kinds themselves are identifiers the code branches on; the owner
// reads whose file it is (D-016). A kind with no entry is already plain.
const LABEL = {
  'seeded: upstream changed': "yours — slipway's template changed",
  'merged: key updated': 'script updated',
  'merged: key reported': 'script kept, yours differs',
};
const label = (kind) => LABEL[kind] ?? kind;

// The files a /sync-slipway session has already read when --apply writes them: the skill, and the process doc
// it cites. A row that writes either one means the session holds an older copy than the branch (#216).
const SKILL_FILES = ['.claude/skills/sync-slipway/SKILL.md', 'process/intake.md'];
export const skillChanged = (rows) => rows.some((r) => ['replace', 'add', 'merge'].includes(r.kind) && SKILL_FILES.includes(r.path));

// What each row kind means for the owner, and what --apply does with it.
const MEANING = {
  replace: "slipway's file, unchanged since install, and slipway changed it: --apply overwrites it",
  merge: 'you edited it under an override, and slipway changed it: --apply merges (conflict markers possible)',
  add: 'new in slipway, absent here: --apply copies it in',
  delete: 'slipway removed it and yours is unchanged since install: --apply deletes it',
  'keep (edited)': 'slipway removed or changed it, but you edited yours: --apply leaves yours',
  collision: 'slipway ships a path where you have your own file: --apply leaves yours',
  'no longer tracked': "slipway no longer ships this file, so it stays yours untouched: --apply stops listing it, and no later plan mentions it",
  'seeded: upstream changed': "your file (started from slipway's template), which slipway's template has since changed. --apply never rewrites it: it writes slipway's diff under .slipway/upstream/ as a reference to apply by hand, not a patch (it is against the template's copy); /sync-slipway walks you through it",
  'merged: key updated': 'a package.json script you left at the base value: --apply updates it',
  'merged: key reported': "a package.json script you changed: --apply keeps yours and shows slipway's",
  unchanged: 'the same on both sides: nothing to do',
};

// An override that is stale after --apply, as D1 will judge it on the sync branch: it names a file slipway
// no longer maintains. One whose file is slipway's copy then is removed by --apply instead (D-021).
const STALE_WHY = 'slipway no longer maintains this file, so the entry excuses nothing and D1 flags it';
const staleLine = (s) => `${OVERRIDES}:${s.line}  path: ${s.path}`;

// The next command for a row that needs the owner (OWNER_ROWS).
function nextStep(r, targetSha, cmd) {
  const from = targetSha ? targetSha.slice(0, 12) : 'the target';
  if (r.kind === 'collision') return `to keep yours, list it in ${OVERRIDES} with a reason; to take slipway's, copy its file from ${from} over yours`;
  if (r.kind === 'merged: key reported') return `${cmd} --apply keeps your value and prints slipway's; edit the key by hand to take it`;
  return `${cmd} --apply leaves your file as it is; port slipway's change by hand if you want it`;
}

// The non-empty buckets, in KINDS order: `[kind, count]`.
const bucketCounts = (rows) => KINDS.map((k) => [k, rows.filter((r) => r.kind === k).length]).filter(([, n]) => n);

// What the plan lists under "Needs you by hand": the rows --apply leaves to the owner and the overrides
// that go stale, each with its next step. The text plan and --json read the same list; `file` is the
// project file the text plan links the item to, and --json leaves it out.
function needsYou({ root, targetSha }, rows, stale) {
  const cmd = syncCommand(root);
  return [
    ...rows.filter((r) => OWNER_ROWS.includes(r.kind)).map((r) => ({ kind: label(r.kind), path: r.path, next: nextStep(r, targetSha, cmd), file: r.file ?? r.path })),
    ...stale.map((s) => ({ kind: 'stale override', path: staleLine(s), next: `after ${cmd} --apply, delete this entry on the sync branch: ${STALE_WHY}`, file: OVERRIDES })),
  ];
}

/**
 * The plan as data, schema 1 (F-08 §2, dev/features/cli-output.md): what /sync-slipway reads instead of
 * the text. Shas are full, the skill cites them. A field is added under the same schema number; one that
 * is renamed, removed or changes meaning takes the next. `targetVersion` is the release the target is, or
 * null. `alreadyPast` is true when the project's base is past the target: no rows, and `next` is that sentence.
 * `nothingToTake` is true whenever nothing is applied (past the target, or at it with nothing to say): then
 * `next` is a sentence for the owner, never a command.
 */
function planDoc(ctx, rows, { stale, absorbed, idle = false }) {
  const { root, branch, remote, source, base, targetSha, targetVersion, past, notes, commits } = ctx;
  const entry = ({ line, path }) => ({ line, path });
  return {
    schema: 1,
    branch,
    source: publicSource(source),
    base: base.sha,
    target: targetSha ?? null,
    targetVersion: targetVersion ?? null,
    remote: remote ?? null,
    notes,
    commits: commits.map((subject) => {
      const m = CONVENTIONAL.exec(subject);
      return { subject, type: m?.[1] ?? null, scope: m?.[2] ?? null };
    }),
    buckets: bucketCounts(rows).map(([kind, count]) => ({ kind, label: label(kind), count, meaning: MEANING[kind] })),
    rows: rows.map(({ kind, path }) => ({ kind, label: label(kind), path })),
    needsYou: needsYou(ctx, rows, stale).map(({ kind, path, next }) => ({ kind, path, next })),
    overrides: { absorbed: absorbed.map(entry), stale: stale.map(entry) },
    skillChanged: skillChanged(rows),
    alreadyPast: past,
    nothingToTake: past || idle,
    next: past ? pastLine({ version: targetVersion, target: targetSha }) : idle ? alreadyLine({ version: targetVersion, target: targetSha }) : `${syncCommand(root)} --apply`,
  };
}

/**
 * Whether the project is at the target with nothing to say: base and target are one commit, every row is
 * unchanged, and no note, owed item, stale override or absorbed override is left. A project created from a
 * registry copy records no commit; its first plan finds the base by content, equal to the target, and then
 * nothing is taken, so nothing is applied and the commit stays unrecorded until a sync has something to write.
 * One answer for the plan, --json and --apply. Not `past` (a base beyond the target): that returns earlier.
 */
export function nothingToTake(ctx, rows, { stale, absorbed }) {
  return Boolean(ctx.targetSha) && ctx.targetSha === ctx.base.sha
    && rows.every((r) => r.kind === 'unchanged')
    && ctx.notes.length === 0 && stale.length === 0 && absorbed.length === 0
    && needsYou(ctx, rows, stale).length === 0;
}

// The plan as lib/sync-text.mjs lays it out for the owner (F-08 §3): the same lists --json carries.
function planView(ctx, rows, { stale, absorbed, log }) {
  const { root, branch, remote, source, base, targetSha, targetVersion, notes, commits } = ctx;
  return {
    root, branch, remote, notes, commits, log,
    source: publicSource(source),
    base: base.sha,
    target: targetSha,
    version: targetVersion,
    owed: needsYou(ctx, rows, stale),
    counts: Object.fromEntries(bucketCounts(rows)),
    absorbed: absorbed.length,
    stale: stale.length,
    next: `${syncCommand(root)} --apply`,
  };
}

// --verbose: the header, every subject, one line per path, then the counts. Plain text, as it always
// was; what sync did not write (a subject, a path, a note) is cleaned of control characters on the way out.
function printVerbose(out, ctx, rows) {
  const { branch, remote, source, base, targetSha, targetVersion, notes, log } = ctx;
  const width = Math.max(...KINDS.map((k) => label(k).length));
  out.write(clean([
    `slipway sync plan, on ${branch}\n`,
    `  source: ${publicSource(source)}\n`,
    `  base:   ${base.sha} (by content: the files slipway installed)\n`,
    `  target: ${targetSha ? targetName(targetVersion, targetSha) : `${SRC} (its files match no slipway commit)`}\n`,
    remote ? `  remote: ${remote}\n` : '',
    ...notes.map((n) => `  note:   ${n}\n`),
    log.length ? `\nslipway's commits, base → target (${log.length}, newest first):\n${log.map((l) => `  ${l}\n`).join('')}` : '',
    '\n',
    ...rows.map((r) => `  ${label(r.kind).padEnd(width)}  ${r.path}\n`),
    `\n${rows.length} rows: ${bucketCounts(rows).map(([k, n]) => `${n} ${label(k)}`).join(', ')}. `,
  ].join('')));
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
function apply(out, u, ctx, rows) {
  const { root, branch, base, gitDir, targetSha } = ctx;
  if (!targetSha) throw new Refusal('the target matches no slipway commit, so the manifest could not record it — run sync from a slipway checkout, or from `npx github:…#<sha>`');
  const short = (sha) => sha.slice(0, 12);
  // Forward only, and only to a commit the source has: the next sync finds its base there.
  forwardOnly(gitDir, base.sha, targetSha, ctx.source, { apply: true });
  const todo = compute(ctx, rows);
  const name = `slipway/sync-${short(targetSha)}`;
  const current = readProjectFile(root, MANIFEST);
  if (nothingToTake(ctx, rows, todo) || (!todo.writes.size && !todo.removes.length && Buffer.isBuffer(current) && current.equals(todo.manifest))) {
    if (ctx.verbose) verboseFirst(out, ctx, rows);
    out.write(alreadyText(u, { branch, target: targetSha, version: ctx.targetVersion }));
    return 0;
  }
  const message = `chore: sync slipway ${short(base.sha)}..${short(targetSha)}`;
  const commit = land(root, branch, name, message, { writes: new Map([...todo.writes, [MANIFEST, { bytes: todo.manifest }]]), removes: todo.removes });

  // Every leftover, one line per path with its instruction (F-08 §4). `file` is what the path links to.
  const from = short(targetSha);
  const leftover = [
    ...todo.conflicts.map((c) => ({ path: c.path, text: `merge — ${c.n} conflict${c.n > 1 ? 's' : ''}; resolve ${c.n > 1 ? 'them' : 'it'}, and keep its override` })),
    ...rows.filter((r) => r.kind === 'collision').map((r) => ({ path: r.path, text: `collision — slipway ships this path now, and your file was not touched. To keep yours, list it in ${OVERRIDES} with a reason; to take slipway's, copy its file from ${from} over yours` })),
    ...todo.kept.gone.map((p) => ({ path: p, text: 'keep (edited) — slipway removed it; your file stays and is yours now' })),
    ...todo.kept.shipped.map((p) => ({ path: p, text: `keep (edited) — slipway changed it, but your copy is missing, not a file, or was your own file until now, so slipway's change was not applied. Copy slipway's from ${from}, or list yours in ${OVERRIDES} with a reason` })),
    ...todo.stale.map((s) => ({ path: staleLine(s), file: OVERRIDES, text: `stale override — delete this entry: ${STALE_WHY}` })),
    ...todo.reported.map((r) => ({ path: r.path, file: r.file, text: `${label('merged: key reported')} — your value stays; slipway's is ${r.value}` })),
    ...(todo.harness?.owed ? [{ path: INSTALLED, text: `harness — ${todo.harness.text}` }] : []),
  ].map((i) => ({ file: i.path, ...i }));

  if (ctx.verbose) verboseFirst(out, ctx, rows);
  out.write(appliedText(u, {
    root, name, branch, commit, message,
    target: targetSha,
    version: ctx.targetVersion,
    remote: ctx.remote,
    notes: ctx.notes,
    owed: leftover,
    settled: todo.diffs.length,
    counts: Object.fromEntries(bucketCounts(rows)),
    absorbed: todo.absorbed.length,
    stale: todo.stale.length,
    also: todo.harness && !todo.harness.owed ? [todo.harness.text] : [],
    skill: skillChanged(rows),
  }));
  const owed = todo.conflicts.length || todo.stale.length || todo.harness?.owed || rows.some((r) => OWNER_ROWS.includes(r.kind));
  return owed ? 1 : 0;
}

// --apply --verbose: the per-path list and its counts, as the plan's --verbose prints them, then what it did.
function verboseFirst(out, ctx, rows) {
  printVerbose(out, ctx, rows);
  out.write('\n\n');
}

// Every write --apply makes, and nothing written yet. Throws a Refusal on anything that would break
// the invariant or that git cannot do: a changed file, a symlink or directory where a file goes, a path
// the project ignores, a failed merge. The plan calls it with `check: false` for the overrides:
// it writes only inside the clone's temp dir, and skips the checks of where each write lands.
function compute({ root, manifest, overrides, base, gitDir, target, targetRules, targetSha }, rows, { check = true } = {}) {
  const tmp = mkdtempSync(join(dirname(gitDir), 'apply-')); // inside the clone's temp dir: removed on exit
  const baseBytes = (p) => (base.tree.has(p) ? readBlob(gitDir, base.tree.get(p)) : null);
  const pristine = (p) => {
    const cur = readProjectFile(root, p);
    return Buffer.isBuffer(cur) && sha256(cur) === manifest.files[p]?.sha256;
  };
  // The executable bit, as slipway ships it: a hook it adds must still run.
  const exec = (p) => existsSync(join(SRC, p)) && (statSync(join(SRC, p)).mode & 0o111) !== 0;
  const moved = (p) => new Refusal(`${oneLine(p)} changed after it was planned — nothing was written`);
  const todo = { writes: new Map(), removes: [], conflicts: [], diffs: [], kept: { gone: [], shipped: [] }, stale: [], absorbed: [], reported: [], harness: null, manifest: null };
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
        todo.reported.push({ path: p, file: r.file, value: now === undefined ? '(removed)' : JSON.stringify(now) });
        continue;
      }
      if (!pkg) {
        const cur = readProjectFile(root, r.file);
        if (!Buffer.isBuffer(cur)) throw new Refusal(`${oneLine(r.file)} is missing — restore it before syncing its scripts; nothing was written`);
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
      todo.harness = { text: `${HARNESS} changed, and this run installed it as ${INSTALLED}: nothing is left to run` };
    } else {
      todo.harness = { owed: true, text: `${HARNESS} changed, but ${INSTALLED} was edited, so it was left as it is. Compare them: git diff --no-index ${INSTALLED} ${HARNESS}` };
    }
  } else if (harnessRow === 'merge') {
    todo.harness = { text: `${HARNESS} now holds your edits and slipway's changes together; once any conflicts in it are resolved, install it with: cp ${HARNESS} ${INSTALLED}` };
  }

  // Each path's bytes once --apply has run.
  const after = (p) => (todo.writes.has(p) ? todo.writes.get(p).bytes : todo.removes.includes(p) ? null : readProjectFile(root, p));
  const next = nextManifest({ manifest, target, targetRules, targetSha }, rows, after);
  todo.manifest = Buffer.from(`${JSON.stringify(next, null, 2)}\n`);
  // D1 was green, so every override named a managed file that differed from its hash. D1's own rule on
  // the new manifest: one that names no managed file now is stale, and the owner decides it; one whose
  // file matches its new hash excuses nothing, so --apply removes it in the same commit (D-021).
  for (const o of overrides.filter(hasReason)) {
    const f = next.files[o.path];
    const now = after(o.path);
    if (f?.class !== 'managed') todo.stale.push({ line: o.line, path: o.path });
    else if (Buffer.isBuffer(now) && sha256(now) === f.sha256) todo.absorbed.push({ line: o.line, path: o.path });
  }
  if (todo.absorbed.length) todo.writes.set(OVERRIDES, { bytes: withoutOverrides(root, overrides, todo.absorbed) });

  if (check) checkWrites(root, [...todo.writes.keys(), MANIFEST], todo.removes);
  return todo;
}

/**
 * The project's overrides file without the entries that start on `drop`'s lines: each one's own lines
 * go, and every other line, comments and blank lines included, stays byte for byte. Lines are cut from
 * the bytes and only read as UTF-8, as readList reads them, so a byte that is not UTF-8 is kept as it is.
 * Read back before it is used: the entries left must be `overrides` less `drop`, or nothing is written.
 */
export function withoutOverrides(root, overrides, drop) {
  const cur = readProjectFile(root, OVERRIDES);
  const lines = [];
  if (Buffer.isBuffer(cur)) {
    for (let at = 0; at < cur.length;) {
      const end = cur.indexOf(0x0a, at);
      lines.push(cur.subarray(at, end < 0 ? cur.length : end + 1));
      at = end < 0 ? cur.length : end + 1;
    }
  }
  const heads = new Set(drop.map((d) => d.line));
  let dropping = false;
  const bytes = Buffer.concat(lines.filter((l, i) => {
    const bare = l.toString('utf8').replace(/\r?\n$/, '');
    if (skippable(bare)) return true;
    if (/^\s*-/.test(bare)) dropping = heads.has(i + 1);
    else if (!/^\s/.test(bare)) dropping = false;
    return !dropping;
  }));
  const entries = (list) => JSON.stringify(list.map((o) => [o.path, o.reason ?? null]));
  let left;
  try {
    left = readList(bytes.toString('utf8'), ['path', 'reason'], { strict: true });
  } catch {
    left = null;
  }
  if (!left || entries(left) !== entries(overrides.filter((o) => !heads.has(o.line)))) {
    throw new Refusal(`${OVERRIDES} changed after it was planned — nothing was written`);
  }
  return bytes;
}

/**
 * Where each write lands, checked before any is made: never through a symlink or onto a directory (the
 * last path component; a symlinked parent is a known limitation), never inside a file of the project's
 * (one not in `removes`), and never onto a path the project ignores, which git would refuse to commit
 * after the branch exists. Throws a Refusal naming every offending path.
 */
export function checkWrites(root, paths, removes = []) {
  const notFile = paths.filter((p) => readProjectFile(root, p) === NOT_A_FILE);
  if (notFile.length) throw new Refusal(`sync writes regular files only, and these are symlinks or directories — nothing was written:\n  ${notFile.map(oneLine).join('\n  ')}`);
  // A file where a write needs a directory: a kept file slipway turned into a folder, or a file at .slipway/upstream.
  const removed = new Set(removes);
  const parents = new Set(paths.flatMap((p) => p.split('/').slice(0, -1).map((_, i, dirs) => dirs.slice(0, i + 1).join('/'))));
  const blocked = [...parents].filter((d) => !removed.has(d) && existsSync(join(root, d)) && !statSync(join(root, d)).isDirectory());
  if (blocked.length) throw new Refusal(`sync must write inside these, but each is a file of yours — move it first; nothing was written:\n  ${blocked.map(oneLine).join('\n  ')}`);
  let ignored = '';
  try {
    ignored = git(['-C', root, 'check-ignore', '--', ...paths, ...removes]).trim();
  } catch (e) {
    if (e.status !== 1) throw new Refusal(`git check-ignore failed: ${gitReason(e)} — nothing was written`);
  }
  if (ignored) throw new Refusal(`the project ignores paths sync would write or delete, so it could not commit them — un-ignore them first; nothing was written:\n  ${ignored.split('\n').map(oneLine).join('\n  ')}`);
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
 * target's too, except a merged or kept file that still differs from the target's copy keeps its own
 * (F-01: until resolved; one that equals it is slipway's again, #132), and a collision holds slipway's,
 * so D1 flags it until the owner overrides it or takes slipway's copy. A managed path
 * the target no longer ships leaves the manifest, and so does a seeded one: the file, if kept, is the
 * project's. Merged entries stay as they are; one the target adds is recorded as written.
 */
function nextManifest({ manifest, target, targetRules, targetSha }, rows, after) {
  const kind = new Map(rows.map((r) => [r.path, r.kind]));
  const version = packageVersion(target) ?? manifest.version;
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
      if (m && m.class === 'merged') files[p] = m;
    } else if (t.class === 'managed') {
      const own = m && (kind.get(p) === 'merge' || kind.get(p) === 'keep (edited)');
      const now = after(p);
      files[p] = own && !(Buffer.isBuffer(now) && now.equals(target.get(p))) ? { ...t, sha256: m.sha256 } : t;
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
    throw new Refusal(`${oneLine(p)}: git merge-file failed: ${gitReason(e)} — nothing was written`);
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
    throw new Refusal(`${oneLine(p)}: git diff failed: ${gitReason(e)} — nothing was written`);
  }
  throw new Refusal(`${oneLine(p)}: planned as changed upstream, but its base and target are the same`);
}
