// sync --adopt — give a project created before the manifest existed its .slipway/manifest.json, once
// (F-01 step 5, dev/features/template-sync.md#Adopt).
//
//   npx github:matldupont/slipway#<ref> sync --adopt [--base <sha>]              read-only: the report
//   npx github:matldupont/slipway#<ref> sync --adopt --apply [--base <sha>] \
//       [--keep <path>=<reason>]… [--revert <path>]…                          the owner's step
//
// The base is `--base`, else a sha in the first commit (`chore: start from slipway <sha>`) or the
// README (`Built on [slipway](SLIPWAY.md) <sha>`). Without one, sync's resolver in closest-match mode
// proposes the slipway commit on main whose managed files match the most of the project's, with the
// runner-up's count, and adopt stops until the owner confirms it with `--base`.
//
// Every path the base ships is classified by the base's ownership map, or the target's when the base
// predates the map, and hashed against the project's copy. A managed file is `pristine` (the base's
// bytes) or differs; each one that differs needs the owner's choice before --apply writes anything:
// `--keep` records an override with the reason, `--revert` puts the base's bytes back, in the same
// commit. Seeded and merged files are the project's and are recorded as they are.
//
// Without --apply nothing is written: no file, no branch, no commit (the clone of slipway is in a temp
// dir removed on exit). --apply creates `slipway/adopt-<base>` from the current branch and commits the
// manifest, the overrides and the reverts together; the owner runs it (it refuses under CLAUDECODE),
// since overrides decide which edits D1 excuses. Every git call goes through lib/install.mjs's helper.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter } from '../ci/checks/lib/frontmatter.mjs';
import { MANIFEST, NOT_A_FILE, OVERRIDES, readManifest, readOverrides, readProjectFile } from '../ci/checks/lib/manifest.mjs';
import { classify, MAP } from '../ci/checks/lib/ownership.mjs';
import { readList } from '../ci/checks/lib/yaml-list.mjs';
import { commitFiles, readBlob, resolveBase, sourceClone } from './lib/base.mjs';
import { blobSha, buildManifest, git, publicSource, SOURCE, templateFiles } from './lib/install.mjs';
import { checkWrites, history, land, Refusal, repoState } from './sync.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: sync --adopt [--base <sha>] [--apply [--keep <path>=<reason>]… [--revert <path>]…]   (run in a project with no manifest)';
const short = (sha) => sha.slice(0, 12);

export function main(argv, { cwd = process.cwd(), out = process.stdout, err = process.stderr } = {}) {
  try {
    const o = parse(argv);
    if (o.help) { out.write(`${USAGE}\n`); return 0; }
    if (o.apply && process.env.CLAUDECODE) {
      throw new Refusal('--adopt --apply records which edits D1 excuses, so the owner runs it in their own terminal, not an agent (CLAUDECODE is set) — nothing was written');
    }
    const ctx = locate(cwd, o);
    const rows = classifyAll(ctx);
    const owed = decide(rows, o);
    report(out, ctx, rows);
    if (!o.apply) {
      out.write(owed.length
        ? `Plan only — nothing was written. Each managed file that differs needs --keep <path>=<reason> or --revert <path> on --apply.\n`
        : `Plan only — nothing was written. Write it with: sync --adopt --apply --base ${ctx.base.sha}\n`);
      return 0;
    }
    if (owed.length) throw new Refusal(`each managed file that differs from the base needs --keep <path>=<reason> or --revert <path> — nothing was written:\n  ${owed.join('\n  ')}`);
    return write(out, ctx, rows, o);
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    err.write(`sync: ${e.message}\n`);
    return 1;
  }
}

function parse(argv) {
  const o = { apply: false, base: null, keep: new Map(), revert: new Set(), help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('-')) throw new Refusal(`${a} needs a value\n${USAGE}`);
      return v;
    };
    if (a === '--adopt') continue;
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a === '--apply') o.apply = true;
    else if (a === '--base') o.base = value();
    else if (a === '--revert') o.revert.add(value());
    else if (a === '--keep') {
      const v = value();
      const at = v.indexOf('=');
      const reason = at < 0 ? '' : v.slice(at + 1).trim();
      if (!reason) throw new Refusal(`--keep ${v}: give the reason after "=" — an override without one excuses nothing`);
      o.keep.set(v.slice(0, at), reason);
    } else throw new Refusal(`unknown argument ${a}\n${USAGE}`);
  }
  if (!o.apply && (o.keep.size || o.revert.size)) throw new Refusal(`--keep and --revert choose what --apply writes; add --apply\n${USAGE}`);
  return o;
}

// The project, slipway's clone, and the base: every refusal that needs no hashing.
function locate(cwd, o) {
  const { root, branch } = repoState(cwd);
  let has;
  try {
    has = readManifest(root);
  } catch (e) {
    throw new Refusal(e.message);
  }
  if (has) throw new Refusal(`${MANIFEST} exists already — this project has adopted sync; run \`sync\``);
  let t;
  try {
    t = templateFiles(SRC);
  } catch (e) {
    throw new Refusal(e.message);
  }
  let source;
  try {
    source = publicSource(process.env.SLIPWAY_SOURCE || SOURCE);
  } catch (e) {
    throw new Refusal(`SLIPWAY_SOURCE: ${e.message}`);
  }
  let gitDir;
  try {
    gitDir = sourceClone(source);
  } catch (e) {
    throw new Refusal(e.message);
  }
  const read = (fn) => history(source, fn);

  const hint = o.base ? { rev: o.base, from: '--base' } : recordedSha(root);
  let sha;
  if (hint) {
    if (!/^[0-9a-f]{4,40}$/.test(hint.rev)) throw new Refusal(`${hint.from} "${hint.rev}" is not a commit sha — pass --base <sha>`);
    try {
      sha = git(['--git-dir', gitDir, 'rev-parse', '--verify', '-q', `${hint.rev}^{commit}`]).trim();
    } catch {
      throw new Refusal(`${hint.from} names slipway ${hint.rev}, which ${source} does not have (a fork, or never pushed) — pass --base <sha> of a slipway commit`);
    }
  } else {
    // Closest match: every tracked file's blob, against each commit on main's managed files.
    const blobs = new Map();
    for (const rec of git(['-C', root, 'ls-files', '-s', '-z']).split('\0')) {
      const m = rec.match(/^100\d{3} ([0-9a-f]{40}) 0\t(.+)$/s);
      if (m) blobs.set(m[2], m[1]);
    }
    const r = read(() => resolveBase(gitDir, blobs, { fallback: t.rules }));
    const subject = (sha) => read(() => git(['--git-dir', gitDir, 'log', '-1', '--date=short', '--format=%ad %s', sha]).trim());
    const c = (x) => `${x.sha} — ${x.matched} managed file(s) as that commit shipped them${x.extra ? `, ${x.extra} it ships that you lack` : ''}\n    ${subject(x.sha)}`;
    if (!r.best?.matched) throw new Refusal(`no slipway sha in the first commit or README, and no commit on ${source}'s main shares a managed file with this project — pass --base <sha>`);
    throw new Refusal(
      `no slipway sha in the first commit or README (${firstSubject(root)}). Closest commit on ${source}'s main:\n  ${c(r.best)}\n` +
        `${r.runnerUp ? `  runner-up: ${c(r.runnerUp)}\n` : ''}Confirm it (or name another) with: sync --adopt --base ${r.best.sha} — nothing was written`,
    );
  }
  const base = read(() => commitFiles(gitDir, sha));
  const mapped = base.tree.has(MAP);
  if (mapped && !base.rules) throw new Refusal(`slipway ${short(sha)} has an ownership map this version cannot read — pass a newer --base`);
  const rules = mapped ? base.rules : t.rules;
  return { root, branch, source, gitDir, read, target: t, base: { sha, tree: base.tree, rules, mapped, from: hint.from } };
}

// The slipway sha new-project recorded, when it recorded one: the first commit's subject, else the README.
function recordedSha(root) {
  const subject = firstSubject(root);
  const c = subject.match(/^chore: start from slipway ([0-9a-f]{40})$/);
  if (c) return { rev: c[1], from: 'the first commit' };
  const readme = readProjectFile(root, 'README.md');
  const r = Buffer.isBuffer(readme) && readme.toString('utf8').match(/Built on \[?slipway\]?(?:\([^)\s]*\))? ([0-9a-f]{40})(?![\w-])/);
  return r ? { rev: r[1], from: 'README.md' } : null;
}

function firstSubject(root) {
  const roots = git(['-C', root, 'rev-list', '--max-parents=0', 'HEAD']).split('\n').filter(Boolean);
  return git(['-C', root, 'log', '-1', '--format=%s', roots.at(-1)]).trim();
}

/**
 * One row per path the base ships, sorted, by its class: `{ path, cls, kind, id }` where `id` is the
 * base's blob. Managed kinds: pristine, differs, missing, not a file. Seeded and merged: `seeded`,
 * `merged`, or `… (missing)`.
 */
function classifyAll({ root, base }) {
  const rows = [];
  for (const [path, id] of [...base.tree].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const cls = classify(base.rules, path);
    if (!cls || cls === 'internal') continue;
    const cur = readProjectFile(root, path);
    let kind;
    if (cls === 'managed') kind = cur === null ? 'missing' : cur === NOT_A_FILE ? 'not a file' : blobSha(cur) === id ? 'pristine' : 'differs';
    else kind = Buffer.isBuffer(cur) ? cls : `${cls} (missing)`;
    rows.push({ path, cls, kind, id });
  }
  return rows;
}

// Apply each --keep and --revert to its row. Returns the managed rows still waiting for a choice.
function decide(rows, o) {
  const byPath = new Map(rows.map((r) => [r.path, r]));
  for (const p of [...o.keep.keys(), ...o.revert]) {
    const r = byPath.get(p);
    if (!r || r.cls !== 'managed') throw new Refusal(`${p} is not a managed file the base ships — --keep and --revert take the managed files that differ`);
    if (r.kind === 'pristine') throw new Refusal(`${p} already matches the base — it needs no --keep or --revert`);
    if (o.keep.has(p) && o.revert.has(p)) throw new Refusal(`${p}: --keep or --revert, not both`);
    r.choice = o.keep.has(p) ? 'keep' : 'revert';
  }
  return rows.filter((r) => r.cls === 'managed' && r.kind !== 'pristine' && !r.choice).map((r) => `${r.kind.padEnd(10)}  ${r.path}`);
}

function report(out, ctx, rows) {
  const { root, branch, source, base } = ctx;
  const show = (r) => (r.choice ? `${r.kind} → ${r.choice}` : r.kind);
  const width = Math.max(...rows.map((r) => show(r).length), 8);
  out.write(`slipway adopt, on ${branch}\n`);
  out.write(`  source: ${source}\n`);
  out.write(`  base:   ${base.sha} (from ${base.from})\n`);
  out.write(`  map:    ${base.mapped ? "the base's dev/ownership.yaml" : `the target's — the base predates ${MAP}`}\n\n`);
  for (const r of rows) out.write(`  ${show(r).padEnd(width)}  ${r.path}\n`);
  const counts = [...new Set(rows.map(show))].map((k) => `${rows.filter((r) => show(r) === k).length} ${k}`);
  out.write(`\n${rows.length} paths the base ships: ${counts.join(', ')}.\n`);
  const shipped = new Set(rows.map((r) => r.path));
  const own = git(['-C', root, 'ls-files', '-z']).split('\0').filter((p) => p && !shipped.has(p));
  out.write(`${own.length} tracked file(s) are the project's own: not in the base, so sync never touches them.\n`);
  const ids = ownIds(ctx);
  if (ids.length) out.write(`\nThe project's own IDs, for /sync-slipway to move to PL-/PD- (slipway's are in the base or the target):\n${ids.map((i) => `  ${i}\n`).join('')}`);
  out.write('\n');
}

// Lessons whose file is in neither the base nor the target, and decisions.md headings whose ID is in
// neither's decisions.md: the project's own, still on slipway's L-/D- prefixes.
function ownIds({ root, base, target, read, gitDir }) {
  const slipway = new Set([...base.tree.keys(), ...target.copy]);
  const lessons = git(['-C', root, 'ls-files', '-z', '--', 'process/lessons']).split('\0')
    .filter((p) => /^process\/lessons\/[^/]+\.md$/.test(p) && !p.endsWith('/README.md') && !slipway.has(p))
    .map((p) => ({ p, id: frontmatter(readFileSync(join(root, p), 'utf8'))?.id }))
    .filter(({ id }) => /^L-\d+$/.test(id ?? ''))
    .map(({ p, id }) => `${id}  ${p}`);
  const heads = (text) => new Set([...text.matchAll(/^##\s+(D-\d+)\b/gm)].map((m) => m[1]));
  const theirs = new Set([
    ...(base.tree.has('decisions.md') ? heads(read(() => readBlob(gitDir, base.tree.get('decisions.md'))).toString('utf8')) : []),
    ...heads(Buffer.isBuffer(readProjectFile(SRC, 'decisions.md')) ? readFileSync(join(SRC, 'decisions.md'), 'utf8') : ''),
  ]);
  const mine = readProjectFile(root, 'decisions.md');
  const decisions = Buffer.isBuffer(mine) ? [...heads(mine.toString('utf8'))].filter((d) => !theirs.has(d)).map((d) => `${d}  decisions.md`) : [];
  return [...lessons, ...decisions];
}

// --apply: the manifest, the overrides and the reverts, on a branch, in one commit.
function write(out, ctx, rows, o) {
  const { root, branch, base, gitDir, read, source } = ctx;
  const bytes = new Map(); // what the manifest records per path: the base's for a differing managed file
  const writes = new Map();
  for (const r of rows) {
    const cur = readProjectFile(root, r.path);
    const theirs = () => read(() => readBlob(gitDir, r.id));
    if (r.kind === 'pristine' || (r.cls !== 'managed' && Buffer.isBuffer(cur))) bytes.set(r.path, cur);
    else bytes.set(r.path, theirs());
    if (r.choice === 'revert') {
      const mode = read(() => git(['--git-dir', gitDir, 'ls-tree', base.sha, '--', r.path]).split(' ')[0]);
      writes.set(r.path, { bytes: bytes.get(r.path), exec: mode === '100755' });
    }
  }
  const pkg = rows.some((r) => r.path === 'package.json') ? JSON.parse(bytes.get('package.json').toString('utf8')) : {};
  const baseVersion = base.tree.has('package.json') ? JSON.parse(read(() => readBlob(gitDir, base.tree.get('package.json'))).toString('utf8')).version ?? null : null;
  const manifest = buildManifest(null, rows.map((r) => r.path), {
    rules: base.rules,
    slipway: base.sha,
    version: baseVersion,
    source,
    answers: answers(root, pkg),
    read: (p) => bytes.get(p),
  });
  writes.set(MANIFEST, { bytes: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) });
  if (o.keep.size) writes.set(OVERRIDES, { bytes: Buffer.from(overridesText(root, o.keep)) });

  checkWrites(root, [...writes.keys()]);
  const name = `slipway/adopt-${short(base.sha)}`;
  const message = `chore: adopt slipway sync at ${short(base.sha)}`;
  const commit = land(root, branch, name, message, { writes });
  out.write(`Adopted on ${name} (from ${branch}), commit ${short(commit)}: ${message}\n`);
  const say = (why, list) => list.length && out.write(`  ${why}: ${list.join(', ')}\n`);
  say(`kept, with an override in ${OVERRIDES}`, [...o.keep.keys()]);
  say("reverted to the base's bytes", [...o.revert]);
  out.write('Next: run `sync` on this branch for the plan to the target, then `sync --apply`.\n');
  return 0;
}

// The overrides file with each --keep added: the project's own entries stay as they are. Each entry
// is read back through the same parser D1 uses, so a path or reason it would misread is refused.
function overridesText(root, keep) {
  let text = '';
  try {
    const cur = readProjectFile(root, OVERRIDES);
    if (cur === NOT_A_FILE) throw new Refusal(`${OVERRIDES} is not a file — nothing was written`);
    const listed = new Set(readOverrides(root).map((x) => x.path));
    const dup = [...keep.keys()].filter((p) => listed.has(p));
    if (dup.length) throw new Refusal(`${OVERRIDES} already lists ${dup.join(', ')} — drop the --keep for it`);
    text = Buffer.isBuffer(cur) ? cur.toString('utf8') : '';
  } catch (e) {
    throw e instanceof Refusal ? e : new Refusal(e.message);
  }
  if (!text.trim()) text = 'overrides:\n';
  else if (!text.endsWith('\n')) text += '\n';
  for (const [path, reason] of keep) {
    const entry = `  - path: ${path}\n    reason: ${reason}\n`;
    const back = readList(`overrides:\n${entry}`, ['path', 'reason'], { strict: true });
    if (/[\r\n]/.test(reason) || back.length !== 1 || back[0].path !== path || back[0].reason !== reason) {
      throw new Refusal(`--keep ${path}: the reason cannot be written as one plain line of ${OVERRIDES} (a newline, a " #" or quotes) — reword it; nothing was written`);
    }
    text += entry;
  }
  return text;
}

// new-project's answers, read back: the product name and issue repo from AGENT.md's configuration
// table, else package.json's name. A placeholder left in is no answer.
function answers(root, pkg) {
  const agent = readProjectFile(root, 'AGENT.md');
  const text = Buffer.isBuffer(agent) ? agent.toString('utf8') : '';
  const cell = (key) => {
    const v = text.match(new RegExp(`^\\|\\s*${key}\\s*\\|\\s*\`?([^|\`]*?)\`?\\s*\\|`, 'm'))?.[1]?.trim();
    return v && !/<[^>]*>/.test(v) ? v : null;
  };
  return { name: cell('Product name') ?? pkg.name ?? null, repo: cell('Issue repo') };
}
