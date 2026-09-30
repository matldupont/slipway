#!/usr/bin/env node
// The harness's gate paths and a pull request's changed files (ci/checks/lib/gate-files.mjs, read by P1):
// creating a gate file asks like editing one, the matcher covers the paths the harness lists, and the
// changed-files list names a package.json only when its `scripts` differ. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { changes, gateGlobs, gateMatcher, missingWriteTwins, SETTINGS } from '../ci/checks/lib/gate-files.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(SETTINGS, 'utf8');

test('every gate path the harness asks before editing asks before creating', () => {
  assert.ok(gateGlobs(settings).length > 10, 'no Edit rules read');
  assert.deepEqual(missingWriteTwins(settings), []);
  assert.deepEqual(missingWriteTwins(JSON.stringify({ permissions: { ask: ['Edit(**/a.json)', 'Edit(**/b.json)', 'Write(**/a.json)'] } })), ['**/b.json']);
});

test('the matcher covers the harness paths, at any depth, and nothing else', () => {
  const gate = gateMatcher(settings);
  for (const p of ['tsconfig.json', 'packages/api/tsconfig.base.json', '.oxlintrc.json', 'apps/web/vite.config.ts', '.github/workflows/ci.yml', 'ci/verify.mjs', 'ci/fixtures/known-bad/p1/a.json', 'process/harness/settings.json', '.claude/settings.json', '.npmrc', 'apps/web/.npmrc', '.pnpmfile.cjs', 'pnpm-workspace.yaml', 'node_modules/x.txt', 'packages/api/node_modules/.bin/tsc', '.envrc', 'mise.toml', '.mise.toml', 'packages/x/package.yaml', 'package.json5', 'mise.local.toml', '.mise.local.toml', 'mise.ci.toml', '.config/mise.toml', '.config/mise/config.toml', '.config/mise/conf.d/node.toml', 'mise/config.toml', '.mise/config.toml', 'NODE_MODULES/x.txt', 'pkg/Node_Modules/.bin/tsc', '.NPMRC', 'PNPM-WORKSPACE.YAML']) {
    assert.ok(gate(p), `${p} should be a gate file`);
  }
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
for (const d of ['engines', 'resolutions', 'local-dep', 'registry-dep']) put(`tools/${d}/package.json`, pkg({}, { devDependencies: { left: '^1.0.0' } }));
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
git('rm', '-q', 'old/tsconfig.json'); // deleted gate file
git('add', '-A');
git('commit', '-q', '-m', 'work');
const head = git('rev-parse', 'HEAD');

test('changes lists every changed path, deletions included, and a package.json only when its run keys or a dependency on local code differ', () => {
  const c = changes(base, head, repo);
  assert.deepEqual(c.files.sort(), ['apps/web/package.json', 'old/tsconfig.json', 'package.json', 'packages/api/package.json', 'packages/api/tsconfig.json', 'tools/bom/package.json', 'tools/empty/package.json', 'tools/engines/package.json', 'tools/local-dep/package.json', 'tools/pm/package.json', 'tools/registry-dep/package.json', 'tools/resolutions/package.json', 'tools/settings/package.json']);
  assert.deepEqual(c.scripts.sort(), ['apps/web/package.json', 'packages/api/package.json', 'tools/bom/package.json', 'tools/engines/package.json', 'tools/local-dep/package.json', 'tools/pm/package.json', 'tools/resolutions/package.json', 'tools/settings/package.json']);
  assert.deepEqual(c.globs, ['**/x.cfg']); // the base commit's harness, not the PR's
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

test('the script refuses anything but commit ids', () => {
  const r = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), '--output=x', head], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /commit ids/);
  const ok = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), base, head], { cwd: repo, encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(Object.keys(JSON.parse(ok.stdout)), ['files', 'scripts', 'globs']);
});

test.after(() => rmSync(repo, { recursive: true, force: true }));
