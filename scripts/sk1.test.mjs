#!/usr/bin/env node
// SK1 (ci/checks/meta/sk1-skipped-tests.mjs) and the skipped-test line `pnpm verify` prints (ci/verify.mjs), on
// workspaces built here: what stays green, what is not read, and that a count is printed for every package that
// declares `test`. The failing cases are SK1's known-bad fixture, which PC1 runs. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { markersIn, summary } from '../ci/checks/lib/skips.mjs';

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

test('a skip in node_modules is not read', () => {
  const root = workspace(app({
    'packages/app/node_modules/dep/x.test.js': "it.skip('dep', () => {});\n",
    'packages/app/a.test.ts': "it('fine', () => {});\n",
  }));
  const r = sk1(root);
  rmSync(root, { recursive: true });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /1 test files in 1 packages/);
});

test('a symbolic link to a test file or a folder is named, never followed', () => {
  const outside = mkdtempSync(join(tmpdir(), 'sk1-out-'));
  writeFileSync(join(outside, 'z.test.ts'), "it.skip('outside', () => {});\n");
  const root = workspace(app({ 'packages/app/a.test.ts': "it('fine', () => {});\n" }));
  symlinkSync(join(outside, 'z.test.ts'), join(root, 'packages/app/b.test.ts'));
  symlinkSync(outside, join(root, 'packages/app/linked'));
  const r = sk1(root);
  rmSync(root, { recursive: true });
  rmSync(outside, { recursive: true });
  assert.equal(r.status, 1, r.stdout);
  const found = JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice(7)).findings.map((f) => f.where);
  assert.deepEqual(found.sort(), ['packages/app/b.test.ts#unread', 'packages/app/linked#unread']);
  assert.doesNotMatch(r.stdout, /z\.test\.ts/);
  assert.match(r.stdout, /do not move a test out of its package/);
});

test('a file over 2 MB and a folder that cannot be listed fail as unread, and verify says so', (t) => {
  const root = workspace(app({
    'packages/app/big.test.ts': `it.skip('x');\n${'// pad\n'.repeat(400000)}`,
    'packages/app/tests/inner.test.ts': "it('ok');\n",
  }));
  chmodSync(join(root, 'packages/app/tests'), 0);
  const unreadable = spawnSync('ls', [join(root, 'packages/app/tests')]).status !== 0; // false when run as root
  const r = sk1(root);
  const v = run('ci/verify.mjs', root, '--plan');
  chmodSync(join(root, 'packages/app/tests'), 0o755);
  rmSync(root, { recursive: true });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /packages\/app\/big\.test\.ts#unread: .*is larger than 2 MB/);
  if (unreadable) assert.match(r.stdout, /packages\/app\/tests#unread: .*cannot be listed/);
  assert.match(v.stdout, /markers — app: 0 in 1 test files \(0 to fix, \d not read\)/);
});

test('a package inside another is counted once, for the inner one', () => {
  const root = workspace({
    'pnpm-workspace.yaml': 'packages:\n  - "packages/app"\n  - "packages/app/inner"\n',
    ...app({ 'packages/app/a.test.ts': "it('fine');\n", 'packages/app/inner/package.json': '{"name":"inner","scripts":{"test":"x"}}', 'packages/app/inner/b.test.ts': "it.skip('x'); // #1\n" }),
  });
  const v = run('ci/verify.mjs', root, '--plan');
  rmSync(root, { recursive: true });
  assert.match(v.stdout, /markers — app: 0 in 1 test files/);
  assert.match(v.stdout, /markers — inner: 1 in 1 test files \(0 to fix\)/);
});

test('a package name with a line break or an escape is printed escaped', () => {
  const root = workspace({ 'packages/app/package.json': JSON.stringify({ name: 'app\n::error::forged\u001b[2K', scripts: { test: 'x' } }) });
  const v = run('ci/verify.mjs', root, '--plan');
  rmSync(root, { recursive: true });
  assert.ok(!v.stdout.split('\n').some((l) => l.startsWith('::error')), v.stdout);
  assert.doesNotMatch(v.stdout, /\u001b/);
  assert.match(v.stdout, /app\\u000a::error::forged\\u001b\[2K/);
});

test('a marker on a line of its own is found whatever ends the line', () => {
  const text = ["it.skip('a');", "it.skip('b');", "it.skip('c'); // #1", "it.skip('d');"];
  for (const eol of ['\n', '\r\n', '\r', '\u2028', '\u2029']) {
    const m = markersIn(text.join(eol));
    assert.deepEqual(m.map((x) => [x.line, x.linked]), [[1, false], [2, false], [3, true], [4, false]], JSON.stringify(eol));
  }
});

test('two markers on one line count once; a hostile long line is read in well under a second', () => {
  assert.equal(markersIn("it.skip('a'); it.skip('b');").length, 1);
  for (const line of ['it.'.repeat(200000), `it.skip('x') ${'a/'.repeat(200000)}`, `it.skip('x') ${'a'.repeat(400000)}`]) {
    const t0 = Date.now();
    markersIn(line);
    assert.ok(Date.now() - t0 < 1000, `${line.slice(0, 12)}… took ${Date.now() - t0} ms`);
  }
});

test('verify counts a focused test as one to fix even with an issue beside it, and counts what it could not read', () => {
  const scan = { files: 2, markers: markersIn("it.only('a'); // #1\nit.skip('b'); // #2\nit.skip('c');"), unread: [{ path: 'x' }] };
  assert.equal(summary(scan), '3 in 2 test files (2 to fix, 1 not read)');
  assert.equal(summary({ files: 0, markers: [], unread: [] }), '0 test files');
});

test('verify prints a markers line for every package that declares test, zero included', () => {
  const root = workspace({
    ...app({ 'packages/app/a.test.ts': "it.skip('x', () => {});\nit.skip('y', () => {}); // #3\n" }),
    'packages/bare/package.json': '{"name":"bare","scripts":{"test":"x"}}',
    'packages/notest/package.json': '{"name":"notest"}',
  });
  const r = run('ci/verify.mjs', root, '--plan');
  rmSync(root, { recursive: true });
  assert.match(r.stdout, /VERIFY: skipped-test markers — app: 2 in 1 test files \(1 to fix\)/);
  assert.match(r.stdout, /VERIFY: skipped-test markers — bare: 0 test files/);
  assert.doesNotMatch(r.stdout, /markers — notest/);
});

test('the test file names the runners use by default are read', () => {
  const skip = "it.skip('x');\n";
  const names = ['x-test.mjs', 'y_test.mjs', 'test-z.mjs', 'a.e2e-spec.ts', 'b.spec.tsx', 'test.mjs', 'spec.ts', 'src/test.ts', 'test/q.js', '__test__/r.js'];
  const root = workspace(app({ ...Object.fromEntries(names.map((n) => [`packages/app/${n}`, skip])), 'packages/app/contest.mjs': skip, 'packages/app/latest.ts': skip, 'packages/app/mytest.mjs': skip }));
  const r = sk1(root);
  rmSync(root, { recursive: true });
  assert.equal(r.status, 1, r.stdout);
  const found = JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice(7)).findings.map((f) => f.where);
  assert.deepEqual(found.sort(), names.map((n) => `packages/app/${n}:1#skip/no-issue`).sort());
});

test('a symlinked node_modules is left alone, and a link message never says to copy from outside', () => {
  const outside = mkdtempSync(join(tmpdir(), 'sk1-out-'));
  const root = workspace(app({ 'packages/app/a.test.ts': "it('fine');\n" }));
  symlinkSync(outside, join(root, 'packages/app/node_modules'));
  symlinkSync(outside, join(root, 'packages/app/shared'));
  const r = sk1(root);
  rmSync(root, { recursive: true });
  rmSync(outside, { recursive: true });
  assert.equal(r.status, 1, r.stdout);
  assert.doesNotMatch(r.stdout, /node_modules#unread/);
  assert.match(r.stdout, /packages\/app\/shared#unread: .*Never copy files from outside the repository into it/);
});

test('a malformed package.json is BROKEN, with a next action', () => {
  const root = workspace({ 'packages/app/package.json': '{"name": }' });
  const r = sk1(root);
  rmSync(root, { recursive: true });
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stdout, /could not read the workspace .*Fix the file the message names/);
});

test('a hostile test file of long marker lines is read in a few seconds, not minutes', () => {
  const line = `it.skip('x') ${'a/'.repeat(2000)}\n`;
  const root = workspace(app({ 'packages/app/a.test.ts': line.repeat(Math.floor((2 * 1024 * 1024 - 1000) / line.length)) }));
  const t0 = Date.now();
  const r = sk1(root);
  const ms = Date.now() - t0;
  rmSync(root, { recursive: true });
  assert.equal(r.status, 1, r.stdout.slice(0, 300));
  assert.ok(ms < 3000, `${ms} ms`);
});
