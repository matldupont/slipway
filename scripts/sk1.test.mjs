#!/usr/bin/env node
// SK1 (ci/checks/meta/sk1-skipped-tests.mjs) and the skipped-test line `pnpm verify` prints (ci/verify.mjs), on
// workspaces built here: what stays green, what is not read, and that a count is printed for every package that
// declares `test`. The failing cases are SK1's known-bad fixture, which PC1 runs. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (script, root, ...args) => spawnSync(process.execPath, [join(SRC, script), ...args, root], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
const sk1 = (root) => run('ci/checks/meta/sk1-skipped-tests.mjs', root);

function workspace(files) {
  const root = mkdtempSync(join(tmpdir(), 'sk1-'));
  const put = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  put('package.json', '{"name":"root","private":true}');
  put('pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n');
  for (const [path, text] of Object.entries(files)) put(path, text);
  return root;
}
const app = (extra = {}) => ({ 'packages/app/package.json': '{"name":"app","scripts":{"test":"x"}}', ...extra });

test('a repository with no packages is green, and says it read 0 test files in 0 packages', () => {
  const root = mkdtempSync(join(tmpdir(), 'sk1-'));
  writeFileSync(join(root, 'package.json'), '{"name":"root"}');
  const r = sk1(root);
  rmSync(root, { recursive: true });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /0 test files in 0 packages/);
});

test('a skip with an issue on its line is green, and counted', () => {
  const root = workspace(app({ 'packages/app/a.test.ts': "it.skip('x', () => {}); // #12\n" }));
  const r = sk1(root);
  rmSync(root, { recursive: true });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /1 test files in 1 packages read; 1 skipped-test markers/);
});

test('a skip in node_modules or behind a link is not read', () => {
  const outside = mkdtempSync(join(tmpdir(), 'sk1-out-'));
  writeFileSync(join(outside, 'z.test.ts'), "it.skip('outside', () => {});\n");
  const root = workspace(app({
    'packages/app/node_modules/dep/x.test.js': "it.skip('dep', () => {});\n",
    'packages/app/a.test.ts': "it('fine', () => {});\n",
  }));
  symlinkSync(outside, join(root, 'packages/app/linked'));
  const r = sk1(root);
  rmSync(root, { recursive: true });
  rmSync(outside, { recursive: true });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /1 test files in 1 packages/);
});

test('verify prints a markers line for every package that declares test, zero included', () => {
  const root = workspace({
    ...app({ 'packages/app/a.test.ts': "it.skip('x', () => {});\nit.skip('y', () => {}); // #3\n" }),
    'packages/bare/package.json': '{"name":"bare","scripts":{"test":"x"}}',
    'packages/notest/package.json': '{"name":"notest"}',
  });
  const r = run('ci/verify.mjs', root, '--plan');
  rmSync(root, { recursive: true });
  assert.match(r.stdout, /VERIFY: skipped-test markers — app: 2 in 1 test files \(1 with no issue\)/);
  assert.match(r.stdout, /VERIFY: skipped-test markers — bare: 0 test files/);
  assert.doesNotMatch(r.stdout, /markers — notest/);
});
