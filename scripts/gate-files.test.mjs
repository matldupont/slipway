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
  '**/.npmrc', '**/.pnpmfile.cjs', '**/pnpm-workspace.yaml', '**/node_modules/**', '**/.envrc', '**/mise.toml',
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
    'if (!match(l, /(^"?|\\/)\\.claude\\/skills\\/[^\\/]+\\//)) next;', '!changes { if (l ~ /\\/\\.claude-plugin(\\/|"?$)/) plugins[folder] = 1; next }',
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
  assert.deepEqual(Object.keys(JSON.parse(ok.stdout)), ['files', 'scripts', 'globs', 'links', 'gate']);
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

test.after(() => rmSync(repo, { recursive: true, force: true }));
