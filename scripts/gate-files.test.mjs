#!/usr/bin/env node
// The harness's gate paths and a pull request's changed files (ci/checks/lib/gate-files.mjs, read by P1):
// creating a gate file asks like editing one, the matcher covers the paths the harness lists, and the
// changed-files list names a package.json only when its `scripts` differ. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SPEC_PATH, unreviewedSpecs } from '../ci/checks/lib/spec-review.mjs';
import { versionLines } from '../ci/checks/lib/review-header.mjs';
import { canonical, changes, COLD_REVIEW_DEFAULT, gateGlobs, gateListed, gateMatcher, gateTouched, GUARD_GLOBS, SETTINGS, writeRules } from '../ci/checks/lib/gate-files.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(SETTINGS, 'utf8');

// #307: an `Edit(...)` rule asks before a file is edited or created; a `Write(...)` rule is matched by nothing
// and prints a warning when the project opens. The list is pinned, so a rule taken out fails here.
const ASK_PATHS = [
  '**/biome.json', '**/biome.jsonc', '**/tsconfig*.json', '**/eslint.config.*', '**/.eslintrc*', '**/.prettierrc*',
  '**/prettier.config.*', '**/vitest.config.*', '**/vite.config.*', '**/.oxlintrc*', '**/oxlint.config.*',
  '**/.github/workflows/**', '**/ci/**', '**/process/harness/**', '**/.claude/settings*.json', '**/.slipway/**',
  '**/.claude/**', '**/AGENT.md', '**/CLAUDE.md', '**/CLAUDE.local.md', '**/process/slipway-rules.md',
  '**/process/intake.md', '**/dev/skill-configuration.md', '**/dev/ownership.yaml', '**/scripts/new-project.mjs',
  '**/docs/reviews/**/*.md', '**/.npmrc', '**/.pnpmfile.cjs', '**/.vale.ini', '**/pnpm-workspace.yaml', '**/node_modules/**', '**/.envrc', '**/mise.toml',
  '**/.mise.toml', '**/package.yaml', '**/package.json5', '**/mise.*.toml', '**/.mise.*.toml',
  '**/.config/mise.toml', '**/.config/mise.*.toml', '**/.config/mise/**', '**/mise/*.toml', '**/.mise/*.toml',
  '~/.claude/slipway/**',
];

test('every path the harness asks about has an Edit rule, and no Write rule is left to warn about', () => {
  const globs = gateGlobs(settings);
  for (const p of ASK_PATHS) assert.ok(globs.includes(p), `process/harness/settings.json has no Edit(${p}) ask rule`);
  assert.deepEqual(globs.filter((g) => !ASK_PATHS.includes(g)), [], 'an Edit rule this list does not pin: add it to ASK_PATHS');
  assert.deepEqual(writeRules(settings), [], 'a Write(...) ask rule is matched by nothing: the Edit(...) rule covers creating the file');
  assert.deepEqual(writeRules(JSON.stringify({ permissions: { ask: ['Edit(**/a.json)', 'Write(**/a.json)'] } })), ['**/a.json']);
});

test('the matcher covers the harness paths, at any depth, and nothing else', () => {
  const gate = gateMatcher(settings);
  for (const p of ['tsconfig.json', 'packages/api/tsconfig.base.json', '.oxlintrc.json', 'apps/web/vite.config.ts', '.github/workflows/ci.yml', 'ci/verify.mjs', 'ci/fixtures/known-bad/p1/a.json', 'process/harness/settings.json', '.claude/settings.json', '.npmrc', 'apps/web/.npmrc', '.pnpmfile.cjs', 'pnpm-workspace.yaml', 'node_modules/x.txt', 'packages/api/node_modules/.bin/tsc', '.envrc', 'mise.toml', '.mise.toml', 'packages/x/package.yaml', 'package.json5', 'mise.local.toml', '.mise.local.toml', 'mise.ci.toml', '.config/mise.toml', '.config/mise/config.toml', '.config/mise/conf.d/node.toml', 'mise/config.toml', '.mise/config.toml', 'mise/config.local.toml', '.mise/config.ci.toml']) {
    assert.ok(gate(p), `${p} should be a gate file`);
  }
  // #163: owner-only markdown is a gate file; other markdown, even under a gate directory, is not.
  for (const p of ['CLAUDE.md', 'CLAUDE.local.md', 'apps/web/CLAUDE.local.md', 'apps/web/AGENT.md', 'process/slipway-rules.md', 'process/intake.md', '.claude/skills/work-ticket/SKILL.md', '.claude/agents/x.md']) assert.ok(gate(p), `${p} should be a gate file`);
  assert.equal(gate.lookalike('.CLAUDE/skills/x/SKILL.md'), '**/.claude/**', 'a case-folded .claude/ is a lookalike, not a document');
  assert.equal(gate.lookalike('docs/Claude.md'), '**/CLAUDE.md', 'a case-folded CLAUDE.md is a lookalike, not a document');
  assert.equal(gate.lookalike('docs/Claude.Local.md'), '**/CLAUDE.local.md', 'a case-folded CLAUDE.local.md is a lookalike, not a document');
  assert.ok(gate('ci/a\nb.mjs') && gate('.github/workflows/x\r.yml'), 'a line break in a name hides nothing');
  assert.ok(gateMatcher(settings, ['**/legacy-gate.cfg'])('x/legacy-gate.cfg'), 'extra globs (the base branch\'s) are added');
  // #405: a review is Markdown, so the rule names `*.md`: the folder is asked about and counted at any depth.
  for (const p of ['docs/reviews/2026-10-06-landing-page-0.1.md', 'docs/reviews/TEMPLATE.md', 'docs/reviews/old/2026-10-06-prd-0.1.md', 'site/docs/reviews/a/b/x.md']) assert.ok(gate(p), `${p} should be a gate file`);
  for (const p of ['docs/reviews/notes.txt', 'docs/review/x.md', 'docs/reviews.md', 'src/docs/reviews-x/y.md']) assert.ok(!gate(p), `${p} should not be`);
  for (const p of ['src/ci.ts', 'src/tsconfig.ts', 'ci/README.md', 'docs/ci/notes.md', 'process/harness/README.md', 'ci/fixtures/known-bad/p1/gate-none.md', 'package.json', 'README.md', '.nvmrc', '.node-version', '.tool-versions', 'src/node_modules.ts']) assert.ok(!gate(p), `${p} should not be`);
});

const repo = mkdtempSync(join(tmpdir(), 'gate-files-'));
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim();
const put = (p, body) => {
  mkdirSync(dirname(join(repo, p)), { recursive: true });
  writeFileSync(join(repo, p), body);
};
const pkg = (scripts, extra = {}) => JSON.stringify({ name: 'x', ...extra, scripts }, null, 2);

git('init', '-q', '-b', 'main');
git('config', 'user.email', 't@example.com');
git('config', 'user.name', 't');
put('package.json', pkg({ test: 'vitest', lint: 'oxlint' }));
put('apps/web/package.json', pkg({ test: 'vitest' }));
put('tsconfig.json', '{}');
put('old/tsconfig.json', '{}');
put('tools/pm/package.json', pkg({}, { packageManager: 'pnpm@10.0.0' }));
put('tools/settings/package.json', pkg({}, { pnpm: { overrides: { a: '1' } } }));
put('tools/empty/package.json', JSON.stringify({ name: 'x' }));
for (const d of ['engines', 'resolutions', 'local-dep', 'registry-dep', 'workspace-dep', 'bin', 'tool-config', 'module-type']) put(`tools/${d}/package.json`, pkg({}, { devDependencies: { left: '^1.0.0' } }));
put('process/harness/settings.json', JSON.stringify({ permissions: { ask: ['Edit(**/x.cfg)'] } }));
git('add', '-A');
git('commit', '-q', '-m', 'base');
const base = git('rev-parse', 'HEAD');
git('switch', '-q', '-c', 'work');
put('package.json', pkg({ lint: 'oxlint', test: 'vitest' }, { version: '1.0.0' })); // reordered, other key: scripts the same
put('apps/web/package.json', pkg({ test: 'true' })); // scripts changed
put('packages/api/package.json', pkg({ test: 'true' })); // new package, scripts declared
put('packages/api/tsconfig.json', '{}'); // new gate file
put('tools/pm/package.json', pkg({}, { packageManager: 'pnpm@10.1.0' })); // another pnpm runs the gate
put('tools/settings/package.json', pkg({}, { pnpm: { overrides: { a: '2' } } })); // pnpm's settings changed
put('tools/empty/package.json', pkg({}, { version: '2.0.0' })); // an empty scripts is no scripts: the same
put('tools/bom/package.json', `\uFEFF${pkg({ test: 'true' })}`); // JSON.parse refuses it, pnpm may not: listed
put('tools/engines/package.json', pkg({}, { devEngines: { runtime: { name: 'node', version: '24.1.0' } } })); // another node runs it
put('tools/resolutions/package.json', pkg({}, { resolutions: { a: '2' } })); // pnpm reads it as overrides
put('tools/local-dep/package.json', pkg({}, { devDependencies: { vitest: 'link:../vitest', left: '^1.0.0' } })); // a program from the repository
put('tools/registry-dep/package.json', pkg({}, { devDependencies: { left: '^2.0.0' } })); // a registry bump: the lockfile's question (#138)
put('tools/workspace-dep/package.json', pkg({}, { devDependencies: { left: '^1.0.0', tsc: 'workspace:*' } })); // the repository's own package
put('tools/bin/package.json', pkg({}, { devDependencies: { left: '^1.0.0' }, bin: { tsc: 'x.js' } })); // a program under a gate tool's name
put('tools/tool-config/package.json', pkg({}, { devDependencies: { left: '^1.0.0' }, prettier: { semi: false } })); // a gate tool's settings, kept in package.json (#174)
put('tools/module-type/package.json', pkg({}, { devDependencies: { left: '^1.0.0' }, type: 'module' })); // how node loads the gate's code
git('rm', '-q', 'old/tsconfig.json'); // deleted gate file
git('add', '-A');
git('commit', '-q', '-m', 'work');
const head = git('rev-parse', 'HEAD');

test('a path that only reads as a gate path in canonical form is a lookalike, never a gate file', () => {
  const gate = gateMatcher(settings);
  const like = {
    '.NPMRC': '**/.npmrc',
    'PNPM-WORKSPACE.YAML': '**/pnpm-workspace.yaml',
    'pnpm-work\u017fpace.yaml': '**/pnpm-workspace.yaml', // a long s: NFKC reads it as s
    'NODE_MODULES/x.txt': '**/node_modules/**',
    'pkg/node_module\u017f/.bin/tsc': '**/node_modules/**',
    'tools/PACKAGE.JSON': 'package.json',
    'CI/verify.mjs': '**/ci/**',
  };
  for (const [p, g] of Object.entries(like)) {
    assert.ok(!gate(p), `${p} is not a gate file`);
    assert.equal(gate.lookalike(p), g, p);
  }
  for (const p of ['.npmrc', 'package.json', 'src/app.ts', 'docs/NOTES.MD', 'README.md', 'ci/README.MD']) assert.equal(gate.lookalike(p), null, p);
  assert.equal(canonical('node_module\u017f'), 'node_modules');
});

test('changes lists every changed path, deletions included, and a package.json only when its run keys or a dependency on local code differ', () => {
  const c = changes(base, head, repo);
  assert.deepEqual(c.files.sort(), ['apps/web/package.json', 'old/tsconfig.json', 'package.json', 'packages/api/package.json', 'packages/api/tsconfig.json', 'tools/bin/package.json', 'tools/bom/package.json', 'tools/empty/package.json', 'tools/engines/package.json', 'tools/local-dep/package.json', 'tools/module-type/package.json', 'tools/pm/package.json', 'tools/registry-dep/package.json', 'tools/resolutions/package.json', 'tools/settings/package.json', 'tools/tool-config/package.json', 'tools/workspace-dep/package.json']);
  assert.deepEqual(c.scripts.sort(), ['apps/web/package.json', 'packages/api/package.json', 'tools/bin/package.json', 'tools/bom/package.json', 'tools/engines/package.json', 'tools/local-dep/package.json', 'tools/module-type/package.json', 'tools/pm/package.json', 'tools/resolutions/package.json', 'tools/settings/package.json', 'tools/tool-config/package.json', 'tools/workspace-dep/package.json']);
  assert.deepEqual(c.globs, ['**/x.cfg', COLD_REVIEW_DEFAULT]); // the base commit's harness, not the PR's; it has no AGENT.md, so the cold-review default (#259)
  assert.deepEqual(c.links, []);
  const gate = gateMatcher(settings);
  assert.deepEqual(c.files.filter(gate).sort(), ['old/tsconfig.json', 'packages/api/tsconfig.json']);
});

test('changes measures from the merge base, so a change on the base branch is not the PR\'s', () => {
  git('switch', '-q', 'main');
  put('tsconfig.json', '{ "strict": true }');
  put('package.json', pkg({ test: 'changed on main' }));
  git('add', '-A');
  git('commit', '-q', '-m', 'main moves');
  const c = changes(git('rev-parse', 'main'), head, repo);
  assert.ok(!c.files.includes('tsconfig.json') && !c.scripts.includes('package.json'), JSON.stringify(c));
});

test('a package.json the base lacks prints no git fatal line, and a real git failure still fails with git\'s message', () => {
  const script = join(SRC, 'ci/checks/lib/gate-files.mjs');
  const ok = spawnSync(process.execPath, [script, base, head], { cwd: repo, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stderr, '');
  assert.ok(JSON.parse(ok.stdout).scripts.includes('tools/pm/package.json')); // new at head, its run keys still count
  const bad = spawnSync(process.execPath, [script, '0'.repeat(40), head], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /fatal:|bad object|unknown revision/);
});

// P1 on one body with no `## Gate changes` section, beside the sidecar changes() writes for base...tip.
const p1 = (from, tip) => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-files-p1-'));
  try {
    writeFileSync(join(dir, 'body.md'), '## What\nLane: bounded.\n\n## Verification\n```\npnpm meta\n```\n\n## Links\nCloses #1\n');
    writeFileSync(join(dir, 'body.changes.json'), JSON.stringify(changes(from, tip, repo)));
    return spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/p1-pr-body.mjs'), dir], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const missing = (r, path) => {
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stdout + r.stderr, new RegExp(`body\\.md#gate-changes/missing: the PR touches gate files \\([^)]*${path.replace(/[.]/g, '\\.')}`));
};

// #174: the guard's list of gate paths is the reference. Each path it counts is counted here, or is a row of the
// harness README's "Where the PR check differs" table, with a reason.
const GUARD = readFileSync(join(SRC, 'process/harness/hooks/base-guard.sh'), 'utf8');
const README = readFileSync(join(SRC, 'process/harness/README.md'), 'utf8');
const differs = README.split(/^### /m).find((s) => s.startsWith('Where the PR check differs')) ?? '';
const excepted = (row) => {
  const line = differs.split('\n').find((l) => l.startsWith(`| ${row} |`));
  assert.ok(line, `the harness README has no "${row}" row under "Where the PR check differs"`);
  assert.ok(line.split('|')[2].trim().length > 40, `the "${row}" row gives no reason`);
};
// The guard's paths that are not globs of the harness list, each with the README row that excepts it.
const EXCEPTED = { '**/package.json': 'every `package.json`' };

test('every path the guard adds to the harness list is counted by the PR check, or excepted in the harness README', () => {
  const gate = gateMatcher(settings);
  const loop = GUARD.match(/^for glob in \$globs ((?:'[^']+' ?)+); do$/m);
  assert.ok(loop, 'the guard\'s list of extra paths is not where this test reads it');
  const extras = loop[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
  assert.ok(extras.length >= 3, 'no extra paths read from the guard');
  for (const g of extras) {
    if (GUARD_GLOBS.includes(g)) continue;
    assert.ok(EXCEPTED[g], `the guard counts ${g}; the PR check neither counts it nor excepts it`);
    excepted(EXCEPTED[g]);
  }
  // The guard's other hard-coded list, the .claude folder: the harness rule `**/.claude/**` counts all of it here.
  assert.ok(GUARD.includes("set -- ':(glob,icase)**/.claude/**' ':(glob,icase)**/.claude' ':(exclude,glob,icase)**/.claude/skills/**'\n"), 'the guard\'s .claude list moved or changed: re-read it against the PR check');
  assert.ok(gateGlobs(settings).includes('**/.claude/**'));
  // #373, D-039: of the skills tree the guard counts a folder that holds a `.claude-plugin` entry, whole. The check
  // counts every skill, so it needs no list of its own for them; these lines are the guard's, pinned as they read.
  for (const line of ["set -- ':(glob,icase)**/.claude/skills/**'\n", 'at_base=$(g ls-tree -r --name-only "$base") ||', 'indexed=$(g ls-files -c) ||',
    'l = tolower($0); sub(/^"/, "", l); if (!match(l, /(^|\\/)\\.claude\\/skills\\/[^\\/]+\\//)) next;', '"$at_base" "$indexed" "$others" "$skills" "$skills_new" |', '!changes { if (l ~ /\\/\\.claude-plugin(\\/|"?$)/) plugins[folder] = 1; next }',
    '"$tracked" "$untracked" "$dotclaude" "$dotclaude_new" "$plugin" |']) {
    assert.ok(GUARD.includes(line), `the guard's plugin-folder list moved or changed (${line}): re-read it against the PR check`);
  }
  for (const p of ['.claude/skills/x/.claude-plugin/plugin.json', '.claude/skills/x/hooks/hooks.json', '.claude/skills/x/hooks/register.ts',
    'apps/web/.claude/skills/x/.claude-plugin/plugin.json', '.claude/skills/x/SKILL.md']) assert.ok(gate(p), `${p} should be a gate file for the PR check`);
  assert.equal(gate.lookalike('.claude/skills/x/.Claude-Plugin/plugin.json'), null, 'a plugin folder in another letter case is counted as it is, not as a lookalike');
  for (const g of GUARD_GLOBS) assert.ok(extras.includes(g), `${g} is no longer a path the guard counts`);
  for (const p of ['.gitmodules', '.gitattributes', 'apps/web/.gitattributes', 'vendor/x/.gitmodules']) assert.ok(gate(p), `${p} should be a gate file`);
  for (const p of ['docs/gitattributes', 'src/.gitattributes.ts', '.gitignore']) assert.ok(!gate(p), `${p} should not be`);
  assert.equal(gate.lookalike('.GitAttributes'), '**/.gitattributes');
  assert.ok(!gate('package.json') && !gate('apps/web/package.json'), 'a package.json counts by its run keys, not its path');
});

test('each shape the guard counts and the PR check does not is pinned, and has its reason in the harness README', () => {
  const gate = gateMatcher(settings);
  // Documents: the guard skips markdown only for the globs that name it, so a .md under a gate folder counts there.
  assert.ok(GUARD.includes('case "$glob" in *.md|'), 'the guard\'s markdown handling moved');
  for (const p of ['ci/README.md', 'ci/fixtures/known-bad/p1/gate-none.md', 'process/harness/README.md', '.github/workflows/notes.md']) assert.ok(!gate(p), `${p} should not be`);
  excepted('a markdown file under a gate folder');
  // The folder itself: the guard adds each `x/**` glob's folder as a path, for a link in its place.
  assert.ok(GUARD.includes('${glob%/\\*\\*}'), 'the guard no longer counts a gate folder\'s own name');
  for (const p of ['ci', 'node_modules', 'apps/web/node_modules', '.claude', '.slipway', 'process/harness']) assert.ok(!gate(p), `${p} should not be`);
  excepted('a plain file at a gate folder\'s name');
  // Quoted names: the guard counts any name git quotes. Here a name is read unquoted (`-z`), so one inside a gate
  // path is a gate file like any other, and one outside is not.
  assert.match(GUARD, /^odd=.*grep '\^"'/m, 'the guard no longer counts quoted names');
  for (const p of ['ci/naïve.mjs', '.github/workflows/"x".yml', 'ci/a\tb.mjs', 'café/.npmrc']) assert.ok(gate(p), `${JSON.stringify(p)} should be a gate file`);
  for (const p of ['docs/café.txt', 'src/"x".ts']) assert.ok(!gate(p) && gate.lookalike(p) === null, `${JSON.stringify(p)} should not be`);
  excepted('a quoted name outside every gate path');
  excepted('an untracked file');
});

test('.gitattributes, .gitmodules and a quoted name inside a gate path reach P1 through a real diff', () => {
  git('switch', '-q', '-c', 'guard', head);
  const step = (path, body) => {
    const from = git('rev-parse', 'HEAD');
    put(path, body);
    git('add', '-A');
    git('commit', '-q', '-m', 'step');
    const tip = git('rev-parse', 'HEAD');
    assert.deepEqual(changes(from, tip, repo).files, [path]);
    missing(p1(from, tip), path);
  };
  step('.gitattributes', '* text=auto\n');
  step('vendor/x/.gitmodules', ''); // inert: names no submodule
  step('ci/naïve.mjs', '');
});

// A link is committed as its mode and target only: nothing here follows one, clones one or runs one (#149).
// The four link tests build on each other's commits (the `links` branch): node:test runs them in file order.
test('a gate folder committed as a symlink is a gate change, and P1 asks for Gate changes naming it', () => {
  git('switch', '-q', '-c', 'links', head);
  symlinkSync('docs', join(repo, '.slipway')); // a folder outside the gate paths
  git('add', '-A');
  git('commit', '-q', '-m', 'symlink');
  const tip = git('rev-parse', 'HEAD');
  const c = changes(head, tip, repo);
  assert.deepEqual(c.links, ['.slipway']);
  assert.ok(!gateMatcher(settings)('.slipway'), 'no path rule names the folder itself');
  missing(p1(head, tip), '.slipway');
});

test('a gate folder committed as a submodule link, with no .gitmodules change, is a gate change', () => {
  const from = git('rev-parse', 'HEAD');
  git('update-index', '--add', '--cacheinfo', `160000,${base},ci`);
  git('commit', '-q', '-m', 'submodule link');
  const tip = git('rev-parse', 'HEAD');
  const c = changes(from, tip, repo);
  assert.deepEqual(c.files, ['ci']);
  assert.deepEqual(c.links, ['ci']);
  missing(p1(from, tip), 'ci');
});

test('a link outside every gate folder counts too, as the harness counts it since #148', () => {
  const from = git('rev-parse', 'HEAD');
  mkdirSync(join(repo, 'docs'), { recursive: true });
  symlinkSync('../tools', join(repo, 'docs/elsewhere'));
  git('add', 'docs/elsewhere'); // not -A: the submodule link has no folder on disk, and -A would remove it
  git('commit', '-q', '-m', 'link elsewhere');
  const tip = git('rev-parse', 'HEAD');
  assert.deepEqual(changes(from, tip, repo).links, ['docs/elsewhere']);
  missing(p1(from, tip), 'docs/elsewhere');
});

test('a link removed, or replaced by a folder, counts', () => {
  const from = git('rev-parse', 'HEAD');
  git('rm', '-q', '.slipway');
  put('.slipway/notes.txt', 'x');
  git('add', '.slipway');
  git('commit', '-q', '-m', 'folder again');
  const tip = git('rev-parse', 'HEAD');
  assert.deepEqual(changes(from, tip, repo).links, ['.slipway']);
  missing(p1(from, tip), '.slipway');
});

test('the script refuses anything but commit ids', () => {
  const r = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), '--output=x', head], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /commit ids/);
  const ok = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), base, head], { cwd: repo, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(Object.keys(JSON.parse(ok.stdout)), ['files', 'scripts', 'globs', 'links', 'specs', 'gate']);
});

// #362: `/work-ticket` reviews a diff on the strongest tier when the script's `gate` names a file.
test('the script prints the gate files of the diff under `gate`: the list P1 asks a line for, a lookalike too, and null when the rules cannot be read', () => {
  const ok = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), base, head], { cwd: repo, encoding: 'utf8' });
  const out = JSON.parse(ok.stdout);
  const c = changes(base, head, repo);
  assert.deepEqual(out.gate, gateListed(c, settings));
  assert.deepEqual(out.gate, gateTouched(c), 'with no lookalike in the diff, it is the list P1 computes');
  assert.ok(out.gate.length > 0 && out.gate.length < out.files.length + out.links.length + out.scripts.length, `the fixture changes gate files and others: ${ok.stdout}`);
  // A path a case-insensitive disk opens as a gate file: P1 refuses it, and it starts the second review all the same.
  const odd = { files: ['.NPMRC', 'CI/checks/x.mjs', '.Claude/agents/a.md', 'Agent.md', 'src/app.ts'], scripts: [], links: [], globs: [] };
  assert.deepEqual(gateTouched(odd, settings), [], 'P1\'s list holds exact spellings only');
  assert.deepEqual(gateListed(odd, settings), ['.NPMRC', 'CI/checks/x.mjs', '.Claude/agents/a.md', 'Agent.md']);
  // No rules, no list: never an empty one that reads as "no gate file".
  const one = { files: ['ci/verify.mjs'], scripts: [], links: [], globs: [] };
  assert.deepEqual(gateListed(one, settings), ['ci/verify.mjs']);
  for (const [why, text] of [['missing', null], ['unparsable', 'not json'], ['no ask rules', '{}'], ['no Edit rule', JSON.stringify({ permissions: { ask: ['Bash(git push:*)'] } })]]) assert.equal(gateListed(one, text), null, `rules ${why}`);
});

// P1 on a real diff of the fixture repository: a body with `gate` as its `## Gate changes` section, or none.
const prBody = (gate) => `## What\nLane: bounded.\n\n## Verification\n\`\`\`\npnpm meta\n\`\`\`\n${gate ? `\n## Gate changes\n${gate}\n` : ''}\n## Links\nCloses #1\n`;
const runP1 = (from, tip, gate) => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-files-p1-'));
  try {
    writeFileSync(join(dir, 'body.md'), prBody(gate));
    writeFileSync(join(dir, 'body.changes.json'), JSON.stringify(changes(from, tip, repo)));
    return spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/p1-pr-body.mjs'), dir], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
// One commit on the current branch: [the commit before it, the commit it makes].
const step = (what, run) => {
  const from = git('rev-parse', 'HEAD');
  run();
  git('add', '-A');
  git('commit', '-q', '-m', what);
  return [from, git('rev-parse', 'HEAD')];
};

// #405: a changed review is a gate change. P1 on a real diff: written at the folder's top and in a sub-folder, edited,
// renamed and deleted, each asks for a `## Gate changes` line naming the file; with the line, P1 is quiet.
test('a review under docs/reviews/ is a gate file: P1 asks for its Gate changes line, at any depth, and is quiet with it', () => {
  git('switch', '-q', '-c', 'reviews', head);
  const cases = [
    ['a review written at the top of the folder', 'docs/reviews/2026-10-13-a-0.1.md', () => put('docs/reviews/2026-10-13-a-0.1.md', 'one\n')],
    ['a review written in a sub-folder', 'docs/reviews/old/2026-10-13-b-0.1.md', () => put('docs/reviews/old/2026-10-13-b-0.1.md', 'one\n')],
    ['a review edited', 'docs/reviews/2026-10-13-a-0.1.md', () => put('docs/reviews/2026-10-13-a-0.1.md', 'two\n')],
    ['a review deleted', 'docs/reviews/2026-10-13-a-0.1.md', () => git('rm', '-q', 'docs/reviews/2026-10-13-a-0.1.md')],
  ];
  for (const [what, path, run] of cases) {
    const [from, tip] = step(what, run);
    assert.deepEqual(changes(from, tip, repo).files, [path], what);
    missing(runP1(from, tip, ''), path);
    const ok = runP1(from, tip, `- \`${path}\` — the same: a review file, written by \`/review-doc\`.`);
    assert.equal(ok.status, 0, `${what}, with its line: ${ok.stdout}${ok.stderr}`);
  }
  // A rename is a delete and an add: both paths are listed (the diff runs with --no-renames), and P1 asks for both.
  const [from, tip] = step('a review renamed', () => git('mv', 'docs/reviews/old/2026-10-13-b-0.1.md', 'docs/reviews/old/2026-10-13-c-0.1.md'));
  assert.deepEqual(changes(from, tip, repo).files.sort(), ['docs/reviews/old/2026-10-13-b-0.1.md', 'docs/reviews/old/2026-10-13-c-0.1.md']);
  missing(runP1(from, tip, ''), 'docs/reviews/old/2026-10-13-b-0.1.md');
  // Known limitation: a file in the folder that is not Markdown is not a gate file (no check reads one).
  const [f2, t2] = step('a non-Markdown file in the folder', () => put('docs/reviews/notes.txt', 'x\n'));
  assert.equal(runP1(f2, t2, '').status, 0);
});

// #548 (F-16 §10, D-051): the prose check ships to projects as managed, so a project's agent cannot loosen its own
// linter. Each of its three kinds of file, written then edited, asks for a `## Gate changes` line naming it.
test('the prose check\'s config, script and rules are gate files: P1 asks for a Gate changes line naming each, and is quiet with it', () => {
  git('switch', '-q', '-c', 'prose', head);
  const gate = gateMatcher(settings);
  for (const path of ['.vale.ini', 'ci/prose.mjs', 'ci/prose/Slipway/Chatbot.yml']) {
    assert.ok(gate(path), `${path} should be a gate file`);
    for (const [what, text] of [['written', 'one\n'], ['edited', 'two\n']]) {
      const [from, tip] = step(`${path} ${what}`, () => put(path, text));
      assert.deepEqual(changes(from, tip, repo).files, [path], `${path} ${what}`);
      missing(runP1(from, tip, ''), path);
      const ok = runP1(from, tip, `- \`${path}\` — the same: the prose check's ${what} file.`);
      assert.equal(ok.status, 0, `${path} ${what}, with its line: ${ok.stdout}${ok.stderr}`);
    }
  }
});

// #464: `specs` lists the feature docs whose `Version:` lines a pull request moves, and the optional fourth argument
// is the draft flag P1 reads beside it.
test('changes() lists a feature doc whose Version line moved, and the script passes the draft flag on', () => {
  git('switch', '-q', '-c', 'specs', head);
  const step = (what, edit) => {
    const from = git('rev-parse', 'HEAD');
    edit();
    git('add', '-A');
    git('commit', '-q', '-m', what);
    return [from, git('rev-parse', 'HEAD')];
  };
  const doc = (v, text) => `# F-1 — f\n\nVersion: ${v}\n\n${text}\n`;
  const [f1, t1] = step('a feature doc added', () => put('docs/features/x.md', doc('0.1', 'a')));
  assert.deepEqual(changes(f1, t1, repo).specs, [{ path: 'docs/features/x.md', versions: ['Version: 0.1'] }]);
  const [f2, t2] = step('text moves, version does not', () => put('docs/features/x.md', doc('0.1', 'b')));
  assert.deepEqual(changes(f2, t2, repo).specs, []);
  const [f3, t3] = step('version moves', () => put('docs/features/x.md', doc('0.2', 'b')));
  assert.deepEqual(changes(f3, t3, repo).specs, [{ path: 'docs/features/x.md', versions: ['Version: 0.2'] }]);
  const [f4, t4] = step('a review of a doc already there', () => put('docs/reviews/2026-10-14-x-0.2.md', '# R\n\nReviewed: docs/features/x.md @ abc\nVersion line: `Version: 0.2`\n'));
  assert.deepEqual(changes(f4, t4, repo).specs, []);
  const [f7, t7] = step('the Version line is indented', () => put('docs/features/x.md', `# F\n\n  Version: 0.2\n\nb\n`));
  assert.deepEqual(changes(f7, t7, repo).specs, [{ path: 'docs/features/x.md', versions: [] }], 'a doc that lost its version line is listed, not skipped');
  put('docs/features/x.md', doc('0.2', 'b'));
  git('add', '-A');
  git('commit', '-q', '-m', 'restore');
  const [f5, t5] = step('a doc deleted', () => git('rm', '-q', 'docs/features/x.md'));
  assert.deepEqual(changes(f5, t5, repo).specs, []);
  const [f6, t6] = step('a fixture holds a feature doc', () => put('ci/fixtures/known-bad/p1/y.tree/docs/features/x.md', doc('0.1', 'a')));
  assert.deepEqual(changes(f6, t6, repo).specs, [], 'a fixture\'s doc is test data, not a spec');
  // D-049, narrowed 2026-10-22: a feature doc whose only change is one added Version line is not a move; a new doc still
  // is, and so is a doc that gains two lines, or a line and any other edit.
  const [f8, t8] = step('a feature doc with no Version line', () => put('docs/features/z.md', '# F-2 — z\n\nz\n'));
  assert.deepEqual(changes(f8, t8, repo).specs, []);
  const [f9, t9] = step('it gains its first Version line', () => put('docs/features/z.md', '# F-2 — z\n\nVersion: 0.1\n\nz\n'));
  assert.deepEqual(changes(f9, t9, repo).specs, [], 'an existing doc gaining its first Version line is not a move');
  assert.deepEqual(changes(f8, t9, repo).specs, [{ path: 'docs/features/z.md', versions: ['Version: 0.1'] }], 'a doc new since the base is held');
  const [, t10] = step('a second doc with none, given two lines at once', () => put('docs/features/w.md', '# F-3 — w\n\nw\n'));
  const [, t11] = step('two lines', () => put('docs/features/w.md', '# F\n\nVersion: 0.1\nVersion: 0.2\n'));
  assert.deepEqual(changes(t10, t11, repo).specs, [{ path: 'docs/features/w.md', versions: ['Version: 0.1', 'Version: 0.2'] }]);
  // Only a feature doc at the base: a notes file or a companion that becomes a feature doc with its first line is a new doc.
  const [, t12] = step('a notes file in the folder', () => put('docs/features/n.md', '# Notes\n\nn\n'));
  const [, t13] = step('it becomes a feature doc with a Version line', () => put('docs/features/n.md', doc('0.1', 'n')));
  assert.deepEqual(changes(t12, t13, repo).specs, [{ path: 'docs/features/n.md', versions: ['Version: 0.1'] }], 'a file that was not a feature doc is a new doc');
  const [, t14] = step('a companion', () => put('docs/features/c.md', '---\ncompanion-of: docs/features/x.md\n---\n\n# F-1 — notes\n\nc\n'));
  const [, t15] = step('it becomes a primary with a Version line', () => put('docs/features/c.md', '# F-21 — c\n\nVersion: 0.1\n\nc\n'));
  assert.deepEqual(changes(t14, t15, repo).specs, [{ path: 'docs/features/c.md', versions: ['Version: 0.1'] }], 'a companion that becomes a primary is a new doc');
  // The line and any other edit to the doc: held.
  const [, t19] = step('a doc with no line', () => put('docs/features/e.md', '# F-5 — e\n\ne\n'));
  const [, t20] = step('its first line and a changed Contract', () => put('docs/features/e.md', '# F-5 — e\n\nVersion: 0.1\n\ne, rewritten\n'));
  assert.deepEqual(changes(t19, t20, repo).specs, [{ path: 'docs/features/e.md', versions: ['Version: 0.1'] }], 'a first line with another edit is a move');
  const [, t21] = step('only the line, and no blank line beside it', () => put('docs/features/e.md', '# F-5 — e\nVersion: 0.1\n\ne\n'));
  assert.deepEqual(changes(t19, t21, repo).specs, [], 'the line alone, with no blank line added');
  // Only a feature doc at the merge base: a notes file or a companion given only a line is held.
  const [, t26] = step('a notes file and a companion', () => {
    put('docs/features/notes2.md', '# Notes\n\nn\n');
    put('docs/features/comp.md', '---\ncompanion-of: docs/features/e.md\n---\n\n# F-5 — notes\n\nc\n');
  });
  const [, t27] = step('each gains only a line', () => {
    put('docs/features/notes2.md', '# Notes\n\nVersion: 0.1\n\nn\n');
    put('docs/features/comp.md', '---\ncompanion-of: docs/features/e.md\n---\n\n# F-5 — notes\n\nVersion: 0.1\n\nc\n');
  });
  assert.deepEqual(changes(t26, t27, repo).specs.map((x) => x.path).sort(), ['docs/features/comp.md', 'docs/features/notes2.md'], 'not a feature doc at the base');
  // The line and one more line beside it that is not blank: held.
  const [, t28] = step('a doc', () => put('docs/features/g.md', '# F-8 — g\n\ng\n'));
  const [, t29] = step('its line and a sentence beside it', () => put('docs/features/g.md', '# F-8 — g\n\nVersion: 0.1\nA new rule.\ng\n'));
  assert.deepEqual(changes(t28, t29, repo).specs, [{ path: 'docs/features/g.md', versions: ['Version: 0.1'] }], 'only a blank line may come with it');
  // A features/ folder other than the two is not one readFeatureFiles reads: held.
  const [, t22] = step('a doc in another features/ folder', () => put('app/features/old.md', '# F-6 — old\n\nold\n'));
  const [, t23] = step('it gains a line', () => put('app/features/old.md', '# F-6 — old\n\nVersion: 0.1\n\nold\n'));
  assert.deepEqual(changes(t22, t23, repo).specs, [{ path: 'app/features/old.md', versions: ['Version: 0.1'] }], 'only docs/features/ and dev/features/ are feature folders');
  // The base commit given, and the tip GitHub merged into, are read too. Each branch below adds only the line.
  const [, t16] = step('a doc with no Version line', () => put('docs/features/u.md', '# F-4 — u\n\nu\n'));
  const [, t17] = step('the base gives it its first line', () => put('docs/features/u.md', '# F-4 — u\n\nVersion: 0.1\n\nu\n'));
  git('switch', '-q', '--detach', t16);
  const [, t18] = step('a branch from before that gives it another, at the end', () => put('docs/features/u.md', '# F-4 — u\n\nu\n\nVersion: 0.2\n'));
  assert.deepEqual(changes(t17, t18, repo).specs, [{ path: 'docs/features/u.md', versions: ['Version: 0.2'] }], 'the base given has a Version line, so this is a move');
  assert.deepEqual(changes(t16, t18, repo).specs, [], 'on a base with no line, and checked out as the branch, it is not');
  // Checked out as GitHub's merge of the branch into the tip: the base given is stale, and the tip's line holds it.
  git('switch', '-q', '--detach', t17);
  git('merge', '-q', '--no-ff', '-m', 'merge', t18);
  assert.equal(versionLines(readFileSync(join(repo, 'docs/features/u.md'), 'utf8')).length, 2, 'the merge holds both lines');
  assert.deepEqual(changes(t16, t18, repo).specs, [{ path: 'docs/features/u.md', versions: ['Version: 0.2'] }], 'the tip merged into has a Version line, so this is a move');
  git('switch', '-q', 'specs');
  // A header that cannot be read is still a feature doc by readFeatureFiles' rule: the line alone is not a move.
  const [, t24] = step('a doc whose header reads two ways', () => put('docs/features/h.md', `---\nnote: x${String.fromCodePoint(13)}status: draft\n---\n\n# F-7 — h\n\nh\n`));
  const [, t25] = step('it gains only a line', () => put('docs/features/h.md', `---\nnote: x${String.fromCodePoint(13)}status: draft\n---\n\n# F-7 — h\n\nVersion: 0.1\n\nh\n`));
  assert.deepEqual(changes(t24, t25, repo).specs, []);
  const run = (...flag) => spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), f3, t3, ...flag], { cwd: repo, encoding: 'utf8' });
  assert.equal('draft' in JSON.parse(run().stdout), false, 'no argument, no key: P1 reads that as ready');
  assert.equal(JSON.parse(run('true').stdout).draft, true);
  assert.equal(JSON.parse(run('false').stdout).draft, false);
  assert.equal(run('maybe').status, 2);
});

test('pr-body.yml re-runs when a pull request leaves or returns to draft, and writes the draft flag into the sidecar (#464)', () => {
  const wf = readFileSync(join(SRC, '.github/workflows/pr-body.yml'), 'utf8');
  assert.match(wf, /types: \[[^\]]*\bready_for_review\b[^\]]*\]/, 'marking a pull request ready would not re-run P1');
  assert.match(wf, /types: \[[^\]]*\bconverted_to_draft\b[^\]]*\]/);
  assert.match(wf, /DRAFT: \$\{\{ github\.run_attempt == 1 && github\.event\.pull_request\.draft \}\}/, 'a re-run of a draft-era run would keep saying draft');
  assert.match(wf, /gate-files\.mjs "\$BASE_SHA" "\$HEAD_SHA" "\$DRAFT" >/);
});

// #464: each clause of the rule P1 reads, against a tree built here.
test('unreviewedSpecs holds a ready PR whose spec has no current review of that very doc, and fails closed on what it cannot read', () => {
  const root = mkdtempSync(join(tmpdir(), 'spec-review-'));
  try {
    const V = 'Version: 0.1 (2026-10-14)';
    const w = (p, t) => {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), t);
    };
    const review = (name, doc, line = V) => w(`docs/reviews/${name}.md`, `# R\n\nReviewed: ${doc} @ abc\nVersion line: \`${line}\`\n`);
    w('docs/features/a.md', `# A\n\n${V}\n`);
    w('docs/features/b.md', `# B\n\n${V}\n`);
    w('docs/features/two.md', `# T\n\n${V}\nVersion: 0.2\n`);
    symlinkSync('a.md', join(root, 'docs/features/link.md'));
    const ids = (c) => unreviewedSpecs({ files: [], ...c }, root).map((f) => f.id);
    const spec = (p) => ({ path: p, versions: [V] });
    // A review of another doc, quoting the same line, does not count for this one.
    review('b', 'docs/features/b.md');
    assert.deepEqual(ids({ specs: [spec('docs/features/a.md')] }), ['spec/unreviewed:docs/features/a.md']);
    assert.deepEqual(ids({ specs: [spec('docs/features/b.md')] }), []);
    const [held] = unreviewedSpecs({ files: [], specs: [spec('docs/features/a.md')] }, root);
    assert.ok(held.detail.includes('docs/features/a.md') && held.detail.includes(V), 'the finding names the doc and the version');
    // A draft holds nothing; an absent or odd draft flag reads as ready.
    assert.deepEqual(ids({ draft: true, specs: [spec('docs/features/a.md')] }), []);
    for (const draft of [undefined, false, 'true', 1, null]) assert.equal(ids({ draft, specs: [spec('docs/features/a.md')] }).length, 1, `draft ${String(draft)} is ready`);
    // A doc with two Version lines has no current review, whatever a review quotes.
    review('two', 'docs/features/two.md');
    assert.deepEqual(ids({ specs: [spec('docs/features/two.md')] }), ['spec/unreviewed:docs/features/two.md']);
    // No `specs` list: unreadable when a feature doc changed, silent otherwise.
    assert.deepEqual(ids({ files: ['docs/features/a.md'] }), ['specs/unreadable']);
    assert.deepEqual(ids({ files: ['src/a.ts'] }), []);
    // A link, a missing doc, and a path that is no feature doc are findings, never a read.
    assert.deepEqual(ids({ specs: [spec('docs/features/link.md')] }), ['spec/unreadable:docs/features/link.md']);
    assert.deepEqual(ids({ specs: [spec('docs/features/none.md')] }), ['spec/unreadable:docs/features/none.md']);
    assert.deepEqual(ids({ specs: [spec('../outside/features/a.md'), spec('src/a.md'), null] }), ['specs/unreadable', 'specs/unreadable', 'specs/unreadable']);
    // The template and README are no feature docs, and the folder name is read in any case.
    assert.ok(!SPEC_PATH.test('docs/features/TEMPLATE.md') && !SPEC_PATH.test('dev/features/README.md'));
    assert.ok(SPEC_PATH.test('docs/Features/x.md') && SPEC_PATH.test('dev/features/x.md'));
    assert.ok(SPEC_PATH.test('docs/features/.md'), 'a doc named only .md is a feature doc to feature-docs.mjs, so it is held');
    assert.ok(SPEC_PATH.test('docs/features/readme.md') && SPEC_PATH.test('dev/features/Template.md'), 'only the exact names TEMPLATE.md and README.md are skipped, as feature-docs.mjs skips them');
    // A doc whose Version line was indented or removed has no version line, so a review quoting the old line is not current.
    w('docs/features/c.md', `# C\n\n  ${V}\n`);
    review('c', 'docs/features/c.md');
    assert.deepEqual(ids({ specs: [{ path: 'docs/features/c.md', versions: [] }] }), ['spec/unreviewed:docs/features/c.md']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.after(() => rmSync(repo, { recursive: true, force: true }));
