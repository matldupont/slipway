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

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter } from '../ci/checks/lib/frontmatter.mjs';
import { MANIFEST, NOT_A_FILE, OVERRIDES, readManifest, readOverrides, readProjectFile } from '../ci/checks/lib/manifest.mjs';
import { classify, MAP } from '../ci/checks/lib/ownership.mjs';
import { readList } from '../ci/checks/lib/yaml-list.mjs';
import { commitFiles, readBlob, resolveBase, sourceClone } from './lib/base.mjs';
import { BASE_WHY, bucketLines, needsLines } from './lib/summary.mjs';
import { blobSha, buildManifest, git, publicSource, SOURCE, templateFiles } from './lib/install.mjs';
import { checkWrites, history, land, Refusal, repoState } from './sync.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: sync --adopt [--base <sha>] [--verbose] [--apply [--keep <path>=<reason>]… [--revert <path>]…]   (run in a project with no manifest)';
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
    const { stale, all: owed } = decide(rows, o, ctx.overrides);
    report(out, ctx, rows, o.verbose, stale);
    if (!o.apply) {
      out.write(!o.verbose && owed.length ? `Plan only — nothing was written. Give each file above its choice, then write it with: sync --adopt --apply --base ${ctx.base.sha} --keep <path>=<reason> | --revert <path>\n` : owed.length
        ? `Plan only — nothing was written. Before --apply, each managed file that differs needs --keep <path>=<reason> or --revert <path>, and ${OVERRIDES} may list only those it keeps:\n  ${owed.join('\n  ')}\n`
        : `Plan only — nothing was written. Write it with: sync --adopt --apply --base ${ctx.base.sha}\n`);
      return 0;
    }
    if (owed.length) throw new Refusal(`each managed file that differs from the base needs --keep <path>=<reason> or --revert <path>, and ${OVERRIDES} may list only those it keeps — nothing was written:\n  ${owed.join('\n  ')}`);
    return write(out, ctx, rows, o);
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    err.write(`sync: ${e.message}\n`);
    return 1;
  }
}

function parse(argv) {
  const o = { apply: false, verbose: false, base: null, keep: new Map(), revert: new Set(), help: false };
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
    else if (a === '--verbose') o.verbose = true;
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
  let overrides;
  try {
    overrides = readOverrides(root);
  } catch (e) {
    throw new Refusal(e.message);
  }
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
  return { root, branch, source, gitDir, read, overrides, target: t, base: { sha, tree: base.tree, rules, mapped, from: hint.from } };
}

// The slipway sha new-project recorded, when it recorded one: the first commit's subject, else the README.
function recordedSha(root) {
  const subject = firstSubject(root);
  // Before the manifest, new-project recorded `rev-parse --short`; since, the full sha.
  const c = subject.match(/^chore: start from slipway ([0-9a-f]{7,40})$/);
  if (c) return { rev: c[1], from: 'the first commit' };
  const readme = readProjectFile(root, 'README.md');
  const r = Buffer.isBuffer(readme) && readme.toString('utf8').match(/Built on \[?slipway\]?(?:\([^)\s]*\))? ([0-9a-f]{7,40})(?![\w.-]*\w)/);
  return r ? { rev: r[1], from: 'README.md' } : null;
}

function firstSubject(root) {
  try {
    const roots = git(['-C', root, 'rev-list', '--max-parents=0', 'HEAD']).split('\n').filter(Boolean);
    return git(['-C', root, 'log', '-1', '--format=%s', roots.at(-1)]).trim();
  } catch {
    throw new Refusal('this branch has no commits — commit the project first, or pass --base <sha>');
  }
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

// Apply each --keep and --revert to its row; a differing file .slipway/overrides.yaml already lists
// with a reason is kept already. Returns what still stops --apply: each managed row waiting for a
// choice, and each override D1 would call stale once the manifest exists.
function decide(rows, o, overrides) {
  const byPath = new Map(rows.map((r) => [r.path, r]));
  const differs = (r) => r?.cls === 'managed' && r.kind !== 'pristine';
  const listed = new Set(overrides.filter((x) => x.reason?.trim() && differs(byPath.get(x.path))).map((x) => x.path));
  for (const p of [...o.keep.keys(), ...o.revert]) {
    const r = byPath.get(p);
    if (!r || r.cls !== 'managed') throw new Refusal(`${p} is not a managed file the base ships — --keep and --revert take the managed files that differ`);
    if (r.kind === 'pristine') throw new Refusal(`${p} already matches the base — it needs no --keep or --revert`);
    if (o.keep.has(p) && o.revert.has(p)) throw new Refusal(`${p}: --keep or --revert, not both`);
    if (listed.has(p)) throw new Refusal(`${p} is kept already by its entry in ${OVERRIDES} — drop the ${o.keep.has(p) ? '--keep' : '--revert (or remove that entry first)'}`);
    r.choice = o.keep.has(p) ? 'keep' : 'revert';
  }
  for (const p of listed) byPath.get(p).choice = `keep (${OVERRIDES})`;
  const waiting = rows.filter((r) => differs(r) && !r.choice).map((r) => `${r.kind.padEnd(10)}  ${r.path}`);
  const stale = overrides.filter((x) => !listed.has(x.path)).map((x) => `${OVERRIDES}:${x.line}  ${x.path} — ${x.reason?.trim() ? 'not a managed file that differs from the base' : 'no reason'}; remove it`);
  return { waiting, stale, all: [...waiting, ...stale] };
}

// What each bucket means for the owner, and what sync does with it later.
const MEANING = {
  pristine: 'the same as the base. Sync updates it when slipway changes it',
  differs: 'you changed it since the base. Needs your choice below; then sync merges slipway\'s changes into it, or leaves it if you keep it',
  missing: 'the base ships it and you have no such file. Needs your choice below',
  'not a file': 'a folder or link where the base ships a file. Needs your choice below',
  seeded: "a file you fill in (PRD, decisions…). Sync never rewrites it; it writes slipway's diff for you to port by hand, a reference and not a patch; /sync-slipway walks you through it",
  merged: 'package.json: sync updates its scripts key by key, and keeps any you changed',
};
const meaning = (label) => {
  const base = label.replace(/ \(missing\)$/, '').replace(/ → .*$/, '');
  const m = MEANING[base] ?? '';
  return label.includes('→') ? `${m.split('. ')[0]}; you chose it, --apply writes it` : label.endsWith('(missing)') ? `${m.split('. ')[0]}; the file is missing here` : m;
};

function report(out, ctx, rows, verbose = false, stale = []) {
  const { root, branch, source, base } = ctx;
  const show = (r) => (r.choice ? `${r.kind} → ${r.choice}` : r.kind);
  const width = Math.max(...rows.map((r) => show(r).length), 8);
  out.write(`slipway adopt, on ${branch}\n`);
  out.write(`  source: ${source}\n`);
  out.write(`  base:   ${base.sha} (from ${base.from})\n`);
  out.write(`  map:    ${base.mapped ? "the base's dev/ownership.yaml" : `the target's — the base predates ${MAP}`}\n\n`);
  const labels = [...new Set(rows.map(show))];
  if (verbose) for (const r of rows) out.write(`  ${show(r).padEnd(width)}  ${r.path}\n`);
  else out.write(`${BASE_WHY}\n\n${rows.length} paths the base ships:\n${bucketLines(labels.map((l) => ({ n: rows.filter((r) => show(r) === l).length, label: l, meaning: meaning(l) })))}\n`);
  if (verbose) {
    const counts = labels.map((k) => `${rows.filter((r) => show(r) === k).length} ${k}`);
    out.write(`\n${rows.length} paths the base ships: ${counts.join(', ')}.\n`);
  }
  const shipped = new Set(rows.map((r) => r.path));
  const own = git(['-C', root, 'ls-files', '-z']).split('\0').filter((p) => p && !shipped.has(p));
  out.write(`${own.length} tracked file(s) are the project's own: not in the base, so sync never touches them.\n`);
  const waiting = rows.filter((r) => r.cls === 'managed' && r.kind !== 'pristine' && !r.choice);
  if (!verbose) {
    if (waiting.length || stale.length) {
      const items = [
        ...waiting.map((r) => ({ kind: r.kind, path: r.path, next: `--keep ${r.path}=<reason>  to keep yours, or  --revert ${r.path}  to put the base's back` })),
        ...stale.map((s) => ({ kind: 'override', path: s.replace(/ — .*$/, '').replace(/^\S+ +/, ''), next: `remove its entry from ${OVERRIDES}` })),
      ];
      out.write(`\nNeeds you (${items.length}):\n${needsLines(items)}`);
    } else out.write('\nNothing needs a decision.\n');
  }
  const ids = ownIds(ctx);
  if (ids.length) out.write(`\nThe project's own IDs, for /sync-slipway to move to PL-/PD- right after --apply (slipway's are in the base, or the target's under the same title):\n${ids.map((i) => `  ${i}\n`).join('')}`);
  out.write('\n');
}

// Lessons whose file is in neither the base nor the target, and the project's own decisions
// (ownDecisions): still on slipway's L-/D- prefixes.
function ownIds({ root, base, target, read, gitDir }) {
  const slipway = new Set([...base.tree.keys(), ...target.copy]);
  const lesson = (root, p) => {
    const buf = readProjectFile(root, p);
    return Buffer.isBuffer(buf) ? frontmatter(buf.toString('utf8')) : null;
  };
  const isLesson = (p) => /^process\/lessons\/[^/]+\.md$/.test(p) && !p.endsWith('/README.md');
  // A target lesson under another file name (slipway renamed it) is still slipway's: same id, same rule.
  const theirs = new Set(target.copy.filter(isLesson).map((p) => lesson(SRC, p)).filter(Boolean).map((fm) => `${fm.id}\0${fm.rule}`));
  const lessons = git(['-C', root, 'ls-files', '-z', '--', 'process/lessons']).split('\0')
    .filter((p) => isLesson(p) && !slipway.has(p))
    .map((p) => ({ p, fm: lesson(root, p) }))
    .filter(({ fm }) => /^L-\d+$/.test(fm?.id ?? '') && !theirs.has(`${fm.id}\0${fm.rule}`))
    .map(({ p, fm }) => `${fm.id}  ${p}`);
  const text = (buf) => (Buffer.isBuffer(buf) ? buf.toString('utf8') : '');
  const was = base.tree.has('decisions.md') ? read(() => readBlob(gitDir, base.tree.get('decisions.md'))) : null;
  const decisions = ownDecisions(text(readProjectFile(root, 'decisions.md')), text(was), text(readProjectFile(SRC, 'decisions.md'))).map((d) => `${d}  decisions.md`);
  return [...lessons, ...decisions];
}

/**
 * The project's own `D-<n>` headings in its decisions.md: slipway's are the base's IDs (the file is
 * seeded from it), and a target ID only when its title is the target's own, word for word — one the
 * project copied in by hand. The trailing `*(status)*` is not compared: a project decides slipway's
 * open decisions. A target ID under another title is the project's decision that slipway reused the
 * number of (the project's D-015), so it is listed.
 */
export function ownDecisions(mine, base, target) {
  const heads = (t) => new Map([...t.matchAll(/^##\s+(D-\d+)\b(.*)$/gm)].map((m) => [m[1], m[2].replace(/\s*\*\([^)]*\)\*\s*$/, '').trim()]));
  const b = heads(base);
  const t = heads(target);
  return [...heads(mine)].filter(([id, title]) => !b.has(id) && t.get(id) !== title).map(([id]) => id);
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
  let pkg = {};
  try {
    if (bytes.has('package.json')) pkg = JSON.parse(bytes.get('package.json').toString('utf8'));
  } catch (e) {
    throw new Refusal(`package.json is not valid JSON: ${e.message} — nothing was written`);
  }
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
