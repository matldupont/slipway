#!/usr/bin/env node
// Start a new project from slipway: copy the template, fill its placeholders, initialise
// git on `main`, create the GitHub repository, push, create the `needs-shape` label, and
// attempt to protect `main` — recording the outcome as D-001, the way decisions.md asks
// ("decide by attempting it").
//
//   node scripts/new-project.mjs <dir> [--name "Acme"] [--repo owner/name] [--public]
//                                      [--no-github] [--dry-run]
//   npx github:<owner>/slipway <dir> …        once slipway is on GitHub
//   npm create slipway@latest <dir> …         once published as create-slipway
//
// Deliberately NOT done here, because each is a decision or an owner-only act:
//   - scaffolding the app (the framework is decision D-005) — BOOTSTRAP §1
//   - installing the agent harness (.claude/settings.json) — an agent must never install
//     its own hooks or permissions, so the owner copies it by hand — BOOTSTRAP §0
//
// Zero dependencies (D-004): Node stdlib, `git`, and `gh` for the GitHub steps. Fails at
// the first error and says which step; everything before it is left in place to inspect.

import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SELF = relative(SRC, fileURLToPath(import.meta.url));
// `scripts/` holds only this tool, which a new project has no use for.
const SKIP = new Set(['.git', 'node_modules', 'STATE.md', '.DS_Store', dirname(SELF)]);
const PLACEHOLDER_FILES = ['AGENT.md', 'docs/PRD.md', 'docs/product/FRAME.md', 'docs/product/metrics.md'];
const REQUIRED_CHECKS = ['meta', 'verify', 'pr-body'];

// ---- arguments
const USAGE = 'usage: new-project <dir> [--name "Acme"] [--repo owner/name] [--public] [--no-github] [--dry-run]';
const argv = process.argv.slice(2);
const opts = { public: false, github: true, dryRun: false, name: null, repo: null, dir: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--public') opts.public = true;
  else if (a === '--no-github') opts.github = false;
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--name' || a === '--repo') opts[a.slice(2)] = argv[++i];
  else if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
  else if (a.startsWith('-')) die(`unknown flag ${a}\n${USAGE}`);
  else if (!opts.dir) opts.dir = a;
  else die(`unexpected argument ${a}\n${USAGE}`);
}
if (!opts.dir) die(USAGE);

const dest = resolve(opts.dir);
const slug = basename(dest).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
const name = opts.name ?? basename(dest).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
if (dest === SRC || dest.startsWith(SRC + sep)) die(`destination ${dest} is inside slipway itself`);
if (existsSync(dest) && readdirSync(dest).length) die(`destination ${dest} exists and is not empty`);

// ---- helpers
function die(msg) { process.stderr.write(`new-project: ${msg}\n`); process.exit(1); }
const step = (n, msg) => process.stdout.write(`\n[${n}] ${msg}${opts.dryRun ? '  (dry run)' : ''}\n`);
const note = (msg) => process.stdout.write(`    ${msg}\n`);
function run(cmd, args, o = {}) {
  if (opts.dryRun && !o.read) { note(`$ ${cmd} ${args.join(' ')}`); return ''; }
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...o });
  } catch (e) {
    if (o.allowFail) return null;
    die(`\`${cmd} ${args.join(' ')}\` failed:\n${(e.stderr || e.message).toString().trim()}`);
  }
}
function edit(rel, fn) {
  const p = join(dest, rel);
  if (!existsSync(p)) return;
  const before = readFileSync(p, 'utf8');
  const after = fn(before);
  if (after !== before) writeFileSync(p, after);
}

// ---- preflight
let repo = opts.repo;
if (opts.github) {
  if (spawnSync('gh', ['--version']).error) die('`gh` is not installed; install it or pass --no-github');
  if (run('gh', ['auth', 'status'], { read: true, allowFail: true }) === null) die('`gh` is not authenticated: run `gh auth login`');
  if (!repo) repo = `${run('gh', ['api', 'user', '-q', '.login'], { read: true }).trim()}/${slug}`;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) die(`--repo must be owner/name, got "${repo}"`);
  if (run('gh', ['repo', 'view', repo], { read: true, allowFail: true }) !== null) die(`GitHub repository ${repo} already exists`);
}
const sha = run('git', ['-C', SRC, 'rev-parse', '--short', 'HEAD'], { read: true, allowFail: true })?.trim();
const dirty = sha && run('git', ['-C', SRC, 'status', '--porcelain'], { read: true, allowFail: true })?.trim();
const version = sha ? `${sha}${dirty ? '-dirty' : ''}` : JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).version ?? 'unknown';

process.stdout.write(`slipway ${version} → ${dest}\n  product: ${name}\n  repo:    ${opts.github ? `${repo} (${opts.public ? 'public' : 'private'})` : 'none (--no-github)'}\n`);

// ---- 1. copy
step(1, 'Copy the template');
if (!opts.dryRun) {
  cpSync(SRC, dest, { recursive: true, filter: (p) => !SKIP.has(relative(SRC, p)) && !SKIP.has(basename(p)) });
}
note(`skipped: ${[...SKIP].join(', ')}`);

// ---- 2. fill placeholders
step(2, 'Fill placeholders and start the lessons clock');
const today = new Date().toISOString().slice(0, 10);
if (!opts.dryRun) {
  for (const f of PLACEHOLDER_FILES) edit(f, (s) => s.replaceAll('<Product>', name).replaceAll('<owner/repo>', repo ?? '<owner/repo>'));
  edit('package.json', (s) => {
    const pkg = JSON.parse(s);
    pkg.name = slug;
    pkg.private = true;
    delete pkg.bin;
    delete pkg.description;
    delete pkg.version;
    return JSON.stringify(pkg, null, 2) + '\n';
  });
  writeFileSync(join(dest, 'process', 'anchor'), today + '\n');
  writeFileSync(join(dest, 'README.md'), `# ${name}

<!-- One paragraph: what this is and who it is for — FRAME.md's question, once it is framed. -->

Built on [slipway](SLIPWAY.md) ${version}. Where the project stands and what to do next:

\`\`\`bash
pnpm status
\`\`\`
`);
}
note(`<Product> → ${name}${repo ? `, <owner/repo> → ${repo}` : ''} in ${PLACEHOLDER_FILES.join(', ')}`);
note(`package.json name → ${slug}; process/anchor → ${today}; README.md → product stub`);

// ---- 3. git
step(3, 'Initialise git on main and commit');
run('git', ['init', '-q', '-b', 'main'], { cwd: dest });
run('git', ['add', '-A'], { cwd: dest });
run('git', ['commit', '-q', '-m', `chore: start from slipway ${version}`], { cwd: dest });

if (!opts.github) {
  finish(null);
  process.exit(0);
}

// ---- 4. GitHub repository
step(4, `Create ${repo} and push main`);
run('gh', ['repo', 'create', repo, opts.public ? '--public' : '--private', '--source', dest, '--remote', 'origin', '--push']);

// ---- 5. label
step(5, 'Create the needs-shape label');
run('gh', ['label', 'create', 'needs-shape', '--repo', repo, '--color', 'D93F0B', '--force',
  '--description', 'Issue failed the I1 shape check (acceptance or seams missing)']);

// ---- 6. protect main, record D-001
step(6, 'Attempt to protect main (D-001)');
const protection = JSON.stringify({
  required_status_checks: { strict: true, contexts: REQUIRED_CHECKS },
  enforce_admins: true,
  required_pull_request_reviews: { required_approving_review_count: 0 },
  restrictions: null,
});
let outcome;
if (opts.dryRun) {
  note(`$ gh api -X PUT repos/${repo}/branches/main/protection  (${REQUIRED_CHECKS.join(', ')}; strict; admins)`);
} else {
  const r = spawnSync('gh', ['api', '-X', 'PUT', `repos/${repo}/branches/main/protection`, '--input', '-'],
    { input: protection, encoding: 'utf8' });
  outcome = r.status === 0
    ? { ok: true }
    : { ok: false, why: ((r.stdout || '') + (r.stderr || '')).match(/"message":"([^"]+)"/)?.[1] ?? (r.stderr || '').trim() };
  note(outcome.ok ? 'protected' : `not available: ${outcome.why}`);
  edit('decisions.md', (s) => s.replace(
    /## D-001 — Can `main` be protected on this plan\? \*\(open[^\n]*\n[\s\S]*?(?=\n## D-002)/,
    outcome.ok
      ? `## D-001 — \`main\` is protected *(decided ${today}, by attempting it)*

Pull request required; required checks ${REQUIRED_CHECKS.map((c) => `\`${c}\``).join(', ')}; branches must be up to date before merging;
administrators included. Set by \`scripts/new-project.mjs\`. A direct push to \`main\` is now rejected (BOOTSTRAP §3, probe 2).
`
      : `## D-001 — \`main\` cannot be protected on this plan *(decided ${today}, by attempting it)*

GitHub refused branch protection: "${outcome.why}". Accepted risk: a direct push to \`main\` is not prevented. The fallback
is already in place — CI runs on \`push: main\` as well as on pull requests, so a direct push is at least detected
and turns CI red. Revisit if the plan changes (public repositories and paid plans support protection).
`));
}
finish(outcome);

function finish(outcome) {
  const rel = relative(process.cwd(), dest).startsWith('..') ? dest : relative(process.cwd(), dest) || '.';
  process.stdout.write(`
Done${opts.dryRun ? ' (dry run — nothing was written)' : ''}. ${dest}

Next (BOOTSTRAP.md):
  cd ${rel}
${outcome ? `  git status             # decisions.md carries D-001 — commit it in the bootstrap PR, not to main\n` : ''}  cp process/harness/settings.json .claude/settings.json      # owner-only: installs hooks and permissions
  # §1 scaffold the app (D-005), then: pnpm install && pnpm verify && pnpm meta && pnpm status
  # §3 acceptance run — every probe seen failing once
`);
}
