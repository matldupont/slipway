// scripts/mutation.test.mjs, part: what ci/mutation.mjs starts and leaves (§1, §3.4, #439) — ci/before-verify.sh and
// its services, the groups a runner's workers are stopped with, a process that leaves its group, SIGTERM's wait, the
// signals to the step, a SIGKILL to it and the next run's clean-up, and a pgrep that cannot answer.

import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SIGNAL_STOP_MS } from '../../ci/mutation.mjs';
import { killPids, namingFolder } from '../../ci/checks/lib/mutation-processes.mjs';
import { CART, project, testFile } from './project.mjs';

const FILE = 'pkgs/app/src/cart.test.ts';
const CHANGED = [{ file: 'pkgs/app/src/cart.ts', line: 2, has: 'return a + b' }];
// The step's folders in a temporary directory; node keeps a compile cache of its own there.
const copies = (tmp) => readdirSync(tmp).filter((name) => name.startsWith('tests-can-fail-'));
const folderOf = (stderr) => /copying \w+ to (.+)$/m.exec(stderr)?.[1];
const until = async (done, ms = 30_000) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 50))) if (done()) return;
  throw new Error('timed out waiting');
};
const scratch = (t, name = 'mutation-tmp-') => {
  const dir = mkdtempSync(join(tmpdir(), name));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('ci/before-verify.sh makes what the tests need, its GITHUB_ENV reaches the runner, its service is stopped at the end', (t) => {
  const out = scratch(t);
  const env = join(out, 'env.json');
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { envDump: env, tests: { needs: { needsFile: 'pkgs/app/generated.txt' } } } });
  t.after(() => p.remove());
  const script = '#!/usr/bin/env bash\nset -e\necho made > pkgs/app/generated.txt\necho "TCF_PROBE=1" >> "$GITHUB_ENV"\nnode "$PWD/standin/worker.mjs" &\n';
  p.commit({ 'ci/before-verify.sh': script, [FILE]: testFile(['needs']) });
  let { status, record, stderr } = p.run([], { TCF_OWN: '1' });
  assert.equal(status, 0, record.stopped);
  assert.deepEqual(record.tests.map((x) => [x.name, x.state]), [['needs', 'judged']]);
  const keys = JSON.parse(readFileSync(env, 'utf8'));
  assert.ok(keys.includes('TCF_PROBE'), 'a GITHUB_ENV line reaches the runner call');
  assert.equal(keys.includes('TCF_OWN'), false, "the step's own variable does not");
  assert.deepEqual(namingFolder(folderOf(stderr)), [], 'the service the script started is stopped');
  p.git(['rm', '-q', 'ci/before-verify.sh']);
  p.commit({});
  ({ status, record } = p.run());
  assert.equal(status, 2);
  assert.match(record.stopped, /"needs" is red in a clean copy of this commit, before anything is changed\. If it passes in your checkout, it needs a file that git does not track/);
});

test('a port in use when ci/before-verify.sh runs is named as a service from an earlier run (AR-1)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART } });
  t.after(() => p.remove());
  p.commit({ 'ci/before-verify.sh': 'echo "Error: listen EADDRINUSE: address already in use :::5432" >&2\nexit 1\n', [FILE]: testFile(['a']) });
  const { status, record } = p.run();
  assert.equal(status, 2);
  assert.match(record.stopped, /^`ci\/before-verify\.sh` failed because a port it needs is in use: a service from an earlier run may still be running\. Stop it/);
});

test('a runner killed at its limit has its worker stopped with its group; a process that leaves its group is stopped and named', (t) => {
  // The temporary directory holds a + and a (: pgrep reads the folder as a pattern, so it is escaped.
  const tmp = join(scratch(t), 'a+b(c');
  mkdirSync(tmp);
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { worker: true, detachedWorker: true, changedSleepMs: 60_000, tests: { a: { failsWhen: CHANGED } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  const { status, record, stderr } = p.run(['--limit-seconds', '8'], { TMPDIR: tmp });
  assert.equal(status, 2);
  assert.equal(record.outOfTime, true);
  assert.equal(record.leftProcesses, 1);
  assert.match(record.stopped, /^1 processes this check started were still running and were stopped\./);
  assert.deepEqual(namingFolder(folderOf(stderr)), []);
  assert.deepEqual(copies(tmp), [], 'the copy is removed');
});

test('a group is stopped by SIGTERM, a wait, then SIGKILL, and what is left is looked for after the wait (AR-3)', (t) => {
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { slowStop: 1000, changedSleepMs: 60_000, tests: { a: { failsWhen: CHANGED } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  const { record, stderr } = p.run(['--limit-seconds', '6']);
  assert.deepEqual([record.outOfTime, record.leftProcesses, record.stopped], [true, 0, null]);
  assert.deepEqual(namingFolder(folderOf(stderr)), []);
});

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  test(`${signal} to the step ends the run within ${SIGNAL_STOP_MS / 1000} s and leaves nothing running`, async (t) => {
    const out = scratch(t);
    const marker = join(out, 'changed');
    const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { worker: true, marker, changedSleepMs: 60_000, tests: { a: { failsWhen: CHANGED } } } });
    t.after(() => p.remove());
    p.commit({ [FILE]: testFile(['a']) });
    const child = p.start();
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    const exited = new Promise((done) => child.once('exit', (code, sig) => done({ code, sig })));
    await until(() => existsSync(marker));
    const folder = folderOf(stderr);
    assert.ok(namingFolder(folder).length > 0, 'the runner is started by a path inside the copy');
    const sent = Date.now();
    child.kill(signal);
    const { code } = await exited;
    assert.ok(Date.now() - sent < SIGNAL_STOP_MS, 'it ends within the set time');
    assert.equal(code, 128 + { SIGHUP: 1, SIGINT: 2, SIGTERM: 15 }[signal]);
    assert.deepEqual(namingFolder(folder), []);
    assert.equal(existsSync(folder), false, 'the copy is removed');
  });
}

test('a SIGKILL leaves the project as it was, and the next run removes a copy more than a day old and keeps a newer one', async (t) => {
  const tmp = scratch(t);
  const marker = join(tmp, '..', `${tmp.split('/').pop()}-changed`);
  t.after(() => rmSync(marker, { force: true }));
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, config: { marker, changedSleepMs: 60_000, tests: { a: { failsWhen: CHANGED } } } });
  t.after(() => p.remove());
  p.commit({ [FILE]: testFile(['a']) });
  const status = p.git(['status', '--porcelain', '--ignored']);
  const child = p.start([], { TMPDIR: tmp });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });
  await until(() => existsSync(marker));
  child.kill('SIGKILL');
  await new Promise((done) => child.once('exit', done));
  const left = folderOf(stderr);
  t.after(() => killPids(namingFolder(left) ?? []));
  killPids(namingFolder(left));
  assert.equal(p.git(['status', '--porcelain', '--ignored']), status, 'nothing in the project that the run made');
  assert.equal(p.git(['worktree', 'list']).trim().split('\n').length, 1);
  const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  utimesSync(left, old, old);
  mkdirSync(join(tmp, 'tests-can-fail-newer'));
  p.config({}).commit({});
  p.run([], { TMPDIR: tmp });
  assert.deepEqual(copies(tmp), ['tests-can-fail-newer']);
});

test('pgrep is asked for this user\'s processes only, and an answer other than none or some, or no pgrep, is null', (t) => {
  const bin = scratch(t, 'mutation-bin-');
  const args = join(bin, 'args');
  writeFileSync(join(bin, 'pgrep'), `#!/bin/sh\necho "$@" > "${args}"\n[ "$PGREP_EXIT" = 0 ] && echo 4242\nexit "$PGREP_EXIT"\n`);
  chmodSync(join(bin, 'pgrep'), 0o755);
  const path = process.env.PATH;
  t.after(() => { process.env.PATH = path; delete process.env.PGREP_EXIT; });
  process.env.PATH = bin;
  for (const [exit, says] of [['1', []], ['0', [4242]], ['2', null], ['3', null]]) {
    process.env.PGREP_EXIT = exit;
    assert.deepEqual(namingFolder('/tmp/a+b'), says, `exit ${exit}`);
  }
  assert.equal(readFileSync(args, 'utf8').trim(), `-U ${process.getuid()} -f \\/tmp\\/a\\+b`);
  process.env.PATH = join(bin, 'none');
  assert.equal(namingFolder('/tmp/x'), null, 'no pgrep');
});
