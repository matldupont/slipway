#!/usr/bin/env node
// The Stop hook's red cache (#484): an unchanged red tree blocks at once from .git/stop-verify-red, without running
// verify again, and the cache expires, is replaced by a new red run, and is removed by a green one. The hook runs
// directly in a throwaway project whose ci/verify.mjs counts its runs and exits with the code it is told. Internal:
// `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const T = mkdtempSync(join(tmpdir(), 'stop-verify-cache-'));
test.after(() => rmSync(T, { recursive: true, force: true }));
const BIN = join(T, 'bin');
const root = join(T, 'project');
const runs = join(T, 'runs');
const exitCode = join(T, 'exit');
const put = (p, body) => {
  mkdirSync(dirname(join(root, p)), { recursive: true });
  writeFileSync(join(root, p), body);
};
const git = (...a) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' }).trim();

mkdirSync(BIN, { recursive: true });
writeFileSync(join(BIN, 'pnpm'), '#!/bin/sh\necho 0.0.0\n');
chmodSync(join(BIN, 'pnpm'), 0o755);
cpSync(join(SRC, 'process/harness/hooks/stop-verify.mjs'), join(root, 'process/harness/hooks/stop-verify.mjs'));
cpSync(join(SRC, 'ci/checks/lib/workspace.mjs'), join(root, 'ci/checks/lib/workspace.mjs'));
put('package.json', '{ "name": "p", "private": true }\n');
put('.gitignore', '');
// The gate: counts each run, and prints a failure tail and exits with the code in T/exit.
put('ci/verify.mjs', `import { appendFileSync, readFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(runs)}, 'x');
const code = Number(readFileSync(${JSON.stringify(exitCode)}, 'utf8'));
if (code) console.log('FAIL tests/slow.test.ts > times out in 5000ms');
process.exit(code);
`);
git('init', '-q', '-b', 'main');
git('add', '-A');
git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'base');
const red = join(git('rev-parse', '--absolute-git-dir'), 'stop-verify-red');
const ok = join(git('rev-parse', '--absolute-git-dir'), 'stop-verify-ok');

const count = () => (existsSync(runs) ? readFileSync(runs, 'utf8').length : 0);
function stop(input = '{}') {
  const r = spawnSync(process.execPath, [join(root, 'process/harness/hooks/stop-verify.mjs')], {
    input,
    encoding: 'utf8',
    cwd: root,
    env: { PATH: `/usr/bin:/bin:${dirname(process.execPath)}:${BIN}`, HOME: T, CLAUDE_PROJECT_DIR: root },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}
const fresh = (code) => {
  writeFileSync(exitCode, String(code));
  rmSync(runs, { force: true });
  rmSync(red, { recursive: true, force: true });
  rmSync(ok, { force: true });
  git('checkout', '-q', '--', '.');
  git('clean', '-q', '-fd');
};

test('an unchanged red tree blocks from the cache, with the failure lines, and does not run verify again', () => {
  fresh(1);
  const first = stop();
  assert.equal(first.decision, 'block');
  assert.match(first.reason, /is red \(exit 1\)\.\nFAIL tests\/slow\.test\.ts/);
  assert.equal(count(), 1);
  assert.ok(existsSync(red), 'a red run wrote no red cache');
  const second = stop();
  assert.equal(second.decision, 'block', 'an unchanged red tree was let through');
  assert.match(second.reason, /is red \(exit 1\)\. Cached from \d\d:\d\d:\d\d UTC: the tree has not changed since/);
  assert.match(second.reason, /FAIL tests\/slow\.test\.ts/, 'the cached block lost the failure lines');
  assert.equal(count(), 1, 'verify ran again on an unchanged red tree');
  assert.ok(!existsSync(ok), 'a red tree was cached green');
});

test('a change to the tree runs verify again, and a red result rewrites the cache', () => {
  fresh(1);
  stop();
  const before = JSON.parse(readFileSync(red, 'utf8')).fp;
  put('src/app.ts', 'export const changed = 1;\n');
  assert.equal(stop().decision, 'block');
  assert.equal(count(), 2, 'a changed tree was answered from the cache');
  assert.notEqual(JSON.parse(readFileSync(red, 'utf8')).fp, before);
});

test('a red cache 10 minutes old runs verify again', () => {
  fresh(1);
  stop();
  const c = JSON.parse(readFileSync(red, 'utf8'));
  writeFileSync(red, JSON.stringify({ ...c, at: Date.now() - 10 * 60 * 1000 }));
  const out = stop();
  assert.equal(out.decision, 'block');
  assert.doesNotMatch(out.reason, /Cached from/);
  assert.equal(count(), 2, 'an expired red cache was used');
  // A cache dated in the future is not trusted either.
  writeFileSync(red, JSON.stringify({ ...c, at: Date.now() + 60 * 1000 }));
  stop();
  assert.equal(count(), 3, 'a red cache from the future was used');
});

test('a green run removes the red cache, and an unreadable cache runs verify', () => {
  fresh(1);
  stop();
  writeFileSync(exitCode, '0');
  writeFileSync(red, '{not json');
  assert.equal(stop(), null);
  assert.equal(count(), 2, 'an unreadable red cache was trusted');
  assert.ok(!existsSync(red), 'a green run left the red cache');
  assert.ok(existsSync(ok));
  assert.equal(stop(), null);
  assert.equal(count(), 2, 'a green tree ran verify again');
});

test('a second stop in one turn still ends the turn, and writes nothing', () => {
  fresh(1);
  assert.equal(stop('{"stop_hook_active":true}'), null);
  assert.equal(count(), 0);
  assert.ok(!existsSync(red));
});

test('a red cache that cannot be written, or one with a forged time, still blocks', () => {
  fresh(1);
  mkdirSync(red); // a directory where the cache goes: writing it throws
  assert.equal(stop().decision, 'block', 'an unwritable red cache let a red stop through');
  rmSync(red, { recursive: true, force: true });
  stop();
  const c = JSON.parse(readFileSync(red, 'utf8'));
  writeFileSync(red, JSON.stringify({ ...c, at: String(Date.now()) }));
  const out = stop();
  assert.equal(out.decision, 'block', 'a string time let a red stop through');
  assert.doesNotMatch(out.reason, /Cached from/, 'a string time was trusted');
  // A green run over a directory it cannot remove still ends the turn unblocked.
  writeFileSync(exitCode, '0');
  rmSync(red, { force: true });
  mkdirSync(red);
  put('src/green.ts', 'export {};\n');
  assert.equal(stop(), null);
  rmSync(red, { recursive: true, force: true });
});

test('a cached block with a 100 KB tail reaches Claude Code whole, and a cache with no string tail runs verify', () => {
  fresh(1);
  stop();
  const c = JSON.parse(readFileSync(red, 'utf8'));
  writeFileSync(red, JSON.stringify({ ...c, tail: 'x'.repeat(100_000) }));
  const out = stop(); // JSON.parse throws on a cut write
  assert.equal(out.decision, 'block');
  assert.ok(out.reason.includes('x'.repeat(100_000)), 'the cached tail was cut');
  assert.equal(count(), 1);
  writeFileSync(red, JSON.stringify({ ...c, tail: 42 }));
  stop();
  assert.equal(count(), 2, 'a cache with no string tail was trusted');
});

test('a planted red cache with an object, null or wrong-typed field runs verify and blocks, whatever its fingerprint', () => {
  fresh(1);
  stop();
  const c = JSON.parse(readFileSync(red, 'utf8'));
  const odd = { valueOf: 0, toString: 0 }; // JSON for a value that cannot become a primitive
  const planted = [
    { fp: 'other', at: odd },
    { ...c, at: odd },
    { ...c, status: odd },
    { ...c, status: '1' },
    { ...c, fp: odd },
    null,
    [],
  ];
  let runs = count();
  for (const p of planted) {
    writeFileSync(red, JSON.stringify(p));
    const out = stop(); // a crash fails here: stop() asserts exit 0
    assert.equal(out?.decision, 'block', `${JSON.stringify(p)} let a red stop through`);
    assert.equal(count(), ++runs, `${JSON.stringify(p)} was trusted`);
  }
});
