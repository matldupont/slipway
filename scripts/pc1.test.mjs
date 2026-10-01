#!/usr/bin/env node
// PC1's fixture fields (ci/checks/meta/pc1-positive-control.mjs): a fixture's `env` reaches the check only
// for the allowlisted names, and `tracked` and `files` paths stay inside the throwaway folder PC1 builds. PC1 skips
// itself when it runs the checks, so it has no known-bad fixture of its own; these are it. Internal: `pnpm
// meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(SRC, 'scripts', 'fixtures', 'pc1');
const pc1 = (root) =>
  spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/pc1-positive-control.mjs'), root], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
const json = (r) => JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice('@@json '.length));

test('a fixture asking for a variable outside the allowlist fails PC1, named, and its check is not started', () => {
  const r = pc1(join(FIXTURES, 'env-refused'));
  assert.equal(r.status, 1, r.stdout);
  const f = json(r).findings;
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.equal(f[0].where, 'l1');
  assert.match(f[0].detail, /sets NODE_OPTIONS;/);
  assert.match(f[0].detail, /was not started/);
  assert.doesNotMatch(f[0].detail, /CHECK_TODAY;/);
});

test('a tracked path leaving the throwaway repository fails PC1 before anything is written', () => {
  const r = pc1(join(FIXTURES, 'tracked-escapes'));
  assert.equal(r.status, 1, r.stdout);
  const f = json(r).findings;
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.match(f[0].detail, /tracks "\.\.\/outside\.txt"/);
  assert.ok(!existsSync(join(tmpdir(), 'outside.txt')));
});

test('a file placed outside the throwaway folder fails PC1 before anything is copied', () => {
  const r = pc1(join(FIXTURES, 'files-escapes'));
  assert.equal(r.status, 1, r.stdout);
  const f = json(r).findings;
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.equal(f[0].where, 'lk1');
  assert.match(f[0].detail, /places "npmrc" at "\.\.\/outside\.txt"/);
  assert.match(f[0].detail, /was not started/);
  assert.ok(!existsSync(join(tmpdir(), 'outside.txt')));
});

test('details pins why a case fails: matching text passes, other text is its own finding, an unexpected id is refused', () => {
  const match = pc1(join(FIXTURES, 'details-match'));
  assert.equal(match.status, 0, match.stdout);
  assert.match(match.stdout, /\(1 cases\)/);

  const miss = pc1(join(FIXTURES, 'details-miss'));
  assert.equal(miss.status, 1, miss.stdout);
  let f = json(miss).findings;
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.match(f[0].detail, /^failed, but not for the reason its fixture names/);
  assert.doesNotMatch(f[0].detail, /PASSED its known-bad fixture/);

  const stray = pc1(join(FIXTURES, 'details-stray'));
  assert.equal(stray.status, 1, stray.stdout);
  f = json(stray).findings;
  assert.equal(f.length, 1, JSON.stringify(f));
  assert.match(f[0].detail, /details names "pnpm-lock\.yaml#no-such-entry"/);
  assert.match(f[0].detail, /was not started/);
});

test('N1 on a folder with no git checkout is BROKEN, never a pass', () => {
  const dir = mkdtempSync(join(tmpdir(), 'n1-no-git-'));
  try {
    const r = spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/n1-node-modules.mjs'), dir], { encoding: 'utf8' });
    assert.equal(r.status, 2, r.stdout);
    assert.match(r.stdout, /N1: BROKEN — git cannot list what/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
