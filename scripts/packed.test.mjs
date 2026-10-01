#!/usr/bin/env node
// What a project receives (#207): slipway is packed as `npx github:…` packs it, installed from that tarball into
// a temp folder, and a project is created from the installed copy. The project's own `meta` commands, PC1 among
// them, must pass there: a file npm leaves out, or the ownership map withholds, shows up here as a known-bad
// case going green or red for another reason. PK1 names such a file; this proves the result. Internal: `pnpm
// meta` runs it in slipway, never in a project. Nothing here reaches the network: npm packs and installs a
// local tarball with no dependencies, offline.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NAME = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).name;
// A known identity and no personal git or npm config, for everything this file spawns.
const env = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'slipway test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'slipway test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
  SLIPWAY_SOURCE: '',
};
const run = (cmd, args, cwd, extra = {}) => spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...env, ...extra }, maxBuffer: 64 * 1024 * 1024 });
const ok = (r, what) => assert.equal(r.status, 0, `${what} failed (${r.error?.code ?? r.status}):\n${r.stdout}\n${r.stderr}`);

const work = mkdtempSync(join(tmpdir(), 'slipway-packed-'));
test.after(() => rmSync(work, { recursive: true, force: true }));

test('a project created from the packed, installed package passes its own meta, every known-bad case included', () => {
  const packed = run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], SRC);
  ok(packed, 'npm pack');
  const tarball = join(work, JSON.parse(packed.stdout)[0].filename);
  ok(run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', '--prefix', join(work, 'inst'), tarball], work), 'npm install of the tarball');
  const pkg = join(work, 'inst', 'node_modules', NAME);

  // The lockfile cases that need a registry file arrive whole, under a name npm packs.
  const lk1 = join(pkg, 'ci', 'fixtures', 'known-bad', 'lk1');
  const placed = readdirSync(lk1).filter((c) => JSON.parse(readFileSync(join(lk1, c, 'expected.json'), 'utf8')).files);
  assert.ok(placed.length > 0, 'no lockfile case places a registry file');
  for (const c of placed) assert.ok(existsSync(join(lk1, c, 'npmrc')), `${c}/npmrc is not in the installed package`);

  const dest = join(work, 'probe');
  ok(run(process.execPath, [join(pkg, 'scripts', 'new-project.mjs'), dest, '--no-github', '--no-harness'], work), 'new-project from the installed package');
  for (const c of placed) assert.ok(existsSync(join(dest, 'ci', 'fixtures', 'known-bad', 'lk1', c, 'npmrc')), `${c}/npmrc did not reach the project`);

  // PC1 with no argument reads the project's own fixtures (an argument would name another fixtures root).
  const pc1 = run(process.execPath, [join(dest, 'ci', 'checks', 'meta', 'pc1-positive-control.mjs')], dest, { CHECK_JSON: '1' });
  ok(pc1, 'PC1 in the project');
  const cases = Number(/\((\d+) cases\)/.exec(pc1.stdout)?.[1]);
  assert.ok(cases >= placed.length, `PC1 ran ${cases} cases`);

  // The project's whole meta, command by command, as `pnpm meta` would run it.
  const meta = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).scripts.meta.split(/\s*&&\s*/);
  assert.ok(meta.some((c) => c.includes('lk1-lockfile.mjs')) && !meta.some((c) => c.includes('pk1-packed.mjs')), meta.join('\n'));
  for (const c of meta) {
    const [node, ...args] = c.split(/\s+/);
    assert.equal(node, 'node', c);
    ok(run(process.execPath, args, dest), c);
  }
});
