#!/usr/bin/env node
// Start a new project from slipway: copy the template, fill its placeholders, initialise
// git on `main`, create the GitHub repository, push, create the `needs-shape` label, and
// attempt to protect `main` — recording the outcome as D-001, the way decisions.md asks
// ("decide by attempting it").
//
//   node scripts/new-project.mjs <dir> [--name "Acme"] [--repo owner/name] [--public]
//                                      [--keep-email] [--no-harness] [--no-github] [--dry-run]
//   npx github:<owner>/slipway <dir> …        once slipway is on GitHub
//   npm create slipway@latest <dir> …         once published as create-slipway
//
// It also installs the agent harness (.claude/settings.json: hooks and permissions). An agent must
// never install its own hooks; the owner running this script is the one installing them, and the
// output says so as it happens. --no-harness skips it.
//
// Deliberately NOT done here: scaffolding the app — the framework is decision D-005 (BOOTSTRAP §1).
//
// Commits in the new repository use your GitHub noreply identity (<id>+<login>@users.noreply.github.com),
// set as that repository's local git config, so a personal email is never published — and a push
// is not rejected by GitHub's "block pushes that expose my email" setting. --keep-email opts out.
//
// Zero dependencies (D-004): Node stdlib, `git`, and `gh` for the GitHub steps. Fails at
// the first error and says which step; everything before it is left in place to inspect.

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { today as localToday } from '../ci/checks/lib/clock.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SELF = relative(SRC, fileURLToPath(import.meta.url));
// `scripts/` holds only this tool, which a new project has no use for; `dev/` is slipway's own planning.
const SKIP = new Set(['.git', 'node_modules', 'STATE.md', '.DS_Store', 'dev', dirname(SELF)]);
const PLACEHOLDER_FILES = ['AGENT.md', 'docs/PRD.md', 'docs/product/FRAME.md', 'docs/product/metrics.md'];
const REQUIRED_CHECKS = ['meta', 'verify', 'pr-body'];
// Written, not copied: npm never packs .gitignore, so under `npx github:…` there is none to copy.
const GITIGNORE = existsSync(join(SRC, '.gitignore'))
  ? readFileSync(join(SRC, '.gitignore'), 'utf8')
  : 'node_modules/\n.DS_Store\nSTATE.md\n';

// ---- arguments
const USAGE = 'usage: new-project <dir> [--name "Acme"] [--repo owner/name] [--public] [--keep-email] [--no-harness] [--no-github] [--dry-run]';
const argv = process.argv.slice(2);
const opts = { public: false, github: true, dryRun: false, keepEmail: false, harness: true, name: null, repo: null, dir: null };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--public') opts.public = true;
  else if (a === '--no-github') opts.github = false;
  else if (a === '--keep-email') opts.keepEmail = true;
  else if (a === '--no-harness') opts.harness = false;
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
let onGitHub = false; // set once step 4 starts: from then on, re-running fails on the existing repository
function die(msg) {
  process.stderr.write(`new-project: ${msg}\n`);
  if (onGitHub) process.stderr.write(`\nThe GitHub repository may already exist, so re-running will fail. Finish from this step instead:\nsee "If a run fails partway" in the slipway README (https://github.com/matldupont/slipway#start-a-project).\n`);
  process.exit(1);
}
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
let identity = null;
if (opts.github) {
  if (spawnSync('gh', ['--version']).error) die('`gh` is not installed; install it or pass --no-github');
  if (run('gh', ['auth', 'status'], { read: true, allowFail: true }) === null) die('`gh` is not authenticated: run `gh auth login`');
  const [id, login] = run('gh', ['api', 'user', '-q', '.id,.login'], { read: true }).trim().split('\n');
  if (!opts.keepEmail) identity = { name: login, email: `${id}+${login}@users.noreply.github.com` };
  if (!repo) repo = `${login}/${slug}`;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) die(`--repo must be owner/name, got "${repo}"`);
  if (run('gh', ['repo', 'view', repo], { read: true, allowFail: true }) !== null) die(`GitHub repository ${repo} already exists`);
}
const sha = run('git', ['-C', SRC, 'rev-parse', '--short', 'HEAD'], { read: true, allowFail: true })?.trim();
const dirty = sha && run('git', ['-C', SRC, 'status', '--porcelain'], { read: true, allowFail: true })?.trim();
const version = sha ? `${sha}${dirty ? '-dirty' : ''}` : JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).version ?? 'unknown';

process.stdout.write(`slipway ${version} → ${dest}\n  product: ${name}\n  repo:    ${opts.github ? `${repo} (${opts.public ? 'public' : 'private'})` : 'none (--no-github)'}\n  commits: ${identity ? `${identity.name} <${identity.email}>` : 'your git config'}\n`);

// ---- 1. copy
step(1, 'Copy the template');
if (!opts.dryRun) {
  cpSync(SRC, dest, { recursive: true, filter: (p) => !SKIP.has(relative(SRC, p)) && !SKIP.has(basename(p)) });
}
note(`skipped: ${[...SKIP].join(', ')}`);

// ---- 2. fill placeholders
step(2, 'Fill placeholders and start the lessons clock');
const today = localToday(opts.dryRun ? SRC : dest);
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
  writeFileSync(join(dest, '.gitignore'), GITIGNORE);
  writeFileSync(join(dest, 'README.md'), `# ${name}

<!-- One paragraph: what this is and who it is for — FRAME.md's question, once it is framed. -->

Built on [slipway](SLIPWAY.md) ${version}. Where the project stands and what to do next:

\`\`\`bash
pnpm status
\`\`\`
`);
}
note(`<Product> → ${name}${repo ? `, <owner/repo> → ${repo}` : ''} in ${PLACEHOLDER_FILES.join(', ')}`);
note(`package.json name → ${slug}; process/anchor → ${today}; README.md → product stub; .gitignore written`);

// ---- 2b. harness
step('2b', opts.harness ? 'Install the agent harness' : 'Agent harness — skipped (--no-harness)');
if (opts.harness) {
  if (!opts.dryRun) {
    mkdirSync(join(dest, '.claude'), { recursive: true });
    copyFileSync(join(dest, 'process', 'harness', 'settings.json'), join(dest, '.claude', 'settings.json'));
  }
  note('process/harness/settings.json → .claude/settings.json (committed with the project). In Claude Code');
  note('sessions opened in this project it: asks before any git push, stash pop/drop, checkout --, reset --hard,');
  note('and before edits to lint/type/test configs, workflows, ci/ and the harness itself; injects `pnpm status`');
  note('at session start; blocks a turn from ending while `pnpm verify:fast` is red. Your personal');
  note('~/.claude settings are untouched and still apply. See process/harness/README.md.');
} else {
  note('install later with: mkdir -p .claude && cp process/harness/settings.json .claude/settings.json');
}

// ---- 3. git
step(3, 'Initialise git on main and commit');
run('git', ['init', '-q', '-b', 'main'], { cwd: dest });
if (identity) {
  run('git', ['config', 'user.name', identity.name], { cwd: dest });
  run('git', ['config', 'user.email', identity.email], { cwd: dest });
}
run('git', ['add', '-A'], { cwd: dest });
run('git', ['commit', '-q', '-m', `chore: start from slipway ${version}`], { cwd: dest });

if (!opts.github) {
  finish(null);
  process.exit(0);
}

// ---- 4. GitHub repository
step(4, `Create ${repo} and push main`);
onGitHub = true;
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

Next: open Claude Code in the project and run /bootstrap — it scaffolds the app, opens the bootstrap PR
and runs the acceptance probes (BOOTSTRAP.md is the reference for each step).
  cd ${rel}
${outcome ? `  git status             # decisions.md carries D-001 — commit it in the bootstrap PR, not to main\n` : ''}${opts.harness ? '' : '  mkdir -p .claude && cp process/harness/settings.json .claude/settings.json   # harness, if wanted\n'}  claude                 # then: /bootstrap
`);
}
