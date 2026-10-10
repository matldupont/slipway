#!/usr/bin/env node
// STATE.md is kept current by the guarded hooks (#374): the SessionStart hook writes the text it hands the agent, the
// Stop hook rewrites it at the end of each turn, and when the guard does not run the working tree's hooks the file is
// left as it was. The real session-state.sh, stop-verify.sh and ci/ are committed to the fixture's origin, so the
// guard runs them from a pinned base. Fixture: harness-fixture.mjs. Internal: `pnpm meta` runs it in slipway, never in
// a project.

import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { SRC, SID, work, git, put, reset, run, commit, unpin, pinOf } from './harness-fixture.mjs';

// A hook PATH holds node and a pnpm that answers `-v`, as the gate's runner does: the Stop hook says so and prints otherwise.
const BIN = mkdtempSync(join(tmpdir(), 'harness-state-bin-'));
writeFileSync(join(BIN, 'pnpm'), '#!/bin/sh\necho 0.0.0\n');
chmodSync(join(BIN, 'pnpm'), 0o755);
test.after(() => rmSync(BIN, { recursive: true, force: true }));
const PATH = `/usr/bin:/bin:${dirname(process.execPath)}:${BIN}`;
const REAL = ['session-state.sh', 'stop-verify.sh', 'stop-verify.mjs', 'find-node.sh'];

// The base: the fixture's, with the real hooks and the real ci/ in it, and STATE.md ignored as it is in a project.
git('-C', work, 'checkout', '-q', 'main');
for (const h of REAL) cpSync(join(SRC, 'process/harness/hooks', h), join(work, 'process/harness/hooks', h));
rmSync(join(work, 'ci'), { recursive: true, force: true });
cpSync(join(SRC, 'ci'), join(work, 'ci'), { recursive: true, filter: (p) => !p.includes('/fixtures') && !p.includes('node_modules') });
writeFileSync(join(work, '.gitignore'), 'STATE.md\nnode_modules/\n');
git('-C', work, 'add', '-A');
commit('real hooks');
git('-C', work, 'push', '-q', 'origin', 'main');

const state = join(work, 'STATE.md');
const fresh = () => {
  git('-C', work, 'checkout', '-q', '-f', 'main');
  git('-C', work, 'reset', '-q', '--hard', 'origin/main');
  git('-C', work, 'clean', '-q', '-ffdx');
  unpin();
  run('session-state.sh', JSON.stringify({ session_id: SID, hook_event_name: 'SessionStart', source: 'startup' }), SID, { PATH });
  assert.ok(existsSync(pinOf()), 'a new session did not pin origin/HEAD');
  rmSync(state, { recursive: true, force: true });
  reset();
};
const start = () => run('session-state.sh', JSON.stringify({ session_id: SID, hook_event_name: 'SessionStart', source: 'resume' }), SID, { PATH });
const stop = () => run('stop-verify.sh', '{}', SID, { PATH });
const context = (out) => JSON.parse(out.split('\n').find((l) => l.startsWith('{'))).hookSpecificOutput.additionalContext;
const bytes = () => readFileSync(state);

test('SessionStart writes STATE.md with the text it hands the agent, and one final newline', () => {
  fresh();
  const r = start();
  assert.equal(r.status, 0);
  const text = context(r.out);
  assert.match(text, /^# STATE — generated/);
  assert.equal(readFileSync(state, 'utf8'), `${text}\n`);
  // The file is rewritten, not appended to.
  writeFileSync(state, 'stale\n');
  start();
  assert.equal(readFileSync(state, 'utf8'), `${text}\n`);
});

test('the end of a turn rewrites STATE.md from the repository as it is then, and a clean checkout stays clean', () => {
  fresh();
  start();
  const before = bytes().toString();
  put('docs/PRD.md', '# PRD\n');
  const r = stop();
  assert.equal(r.status, 0);
  assert.notEqual(bytes().toString(), before, 'the turn-end write did not follow the change');
  // Nothing but the ignored file was touched: a checkout with no change ends its turn unblocked.
  fresh();
  start();
  const out = stop();
  assert.equal(`${out.status} ${out.out}`, '0 ', 'a clean checkout was blocked or printed');
  assert.equal(git('-C', work, 'status', '--porcelain'), '');
});

test('when the guard does not run the working tree’s hooks, STATE.md is byte-for-byte what it was', () => {
  fresh();
  start();
  const before = bytes();
  put('ci/extra.mjs', '// a gate file the base does not have\n');
  put('docs/PRD.md', '# PRD, changed\n');
  const s = start();
  assert.match(s.out, /session-state did not run/);
  const t = stop();
  assert.equal(JSON.parse(t.out.split('\n').find((l) => l.startsWith('{'))).decision, 'block');
  assert.equal(Buffer.compare(bytes(), before), 0, 'a hook the guard held back wrote STATE.md');
});

test('a project folder that cannot write STATE.md: SessionStart still prints the context and exits 0; the turn-end write changes nothing the Stop hook says', () => {
  fresh();
  const good = start();
  assert.equal(readFileSync(state, 'utf8'), `${context(good.out)}\n`, 'a writable folder was not written');
  const goodStop = stop();
  fresh();
  mkdirSync(state); // a folder where the file goes: the write fails, whoever runs it
  const r = start();
  assert.equal(r.status, 0);
  assert.equal(context(r.out), context(good.out));
  const t = stop();
  assert.equal(t.status, 0);
  assert.equal(t.out, goodStop.out);
});

test('a link left at STATE.md is replaced, never written through, and a half-written file is never left behind', () => {
  fresh();
  const victim = join(work, '..', 'victim.txt');
  writeFileSync(victim, 'not the state\n');
  symlinkSync(victim, state);
  const r = start();
  assert.equal(r.status, 0);
  stop();
  assert.equal(readFileSync(victim, 'utf8'), 'not the state\n', 'the write followed the link');
  assert.ok(lstatSync(state).isFile(), 'the link was not replaced');
  assert.equal(readFileSync(state, 'utf8'), `${context(r.out)}\n`);
  assert.equal(git('-C', work, 'status', '--porcelain', '--ignored', '--untracked-files=all').split('\n').filter((l) => l.includes('.tmp')).length, 0, 'a temporary file was left behind');
});

test('node ci/status.mjs --write replaces a link at STATE.md and prints what it printed before', () => {
  fresh();
  const victim = join(work, '..', 'victim-write.txt');
  writeFileSync(victim, 'not the state\n');
  symlinkSync(victim, state);
  const node = (...a) => spawnSync(process.execPath, [join(work, 'ci/status.mjs'), ...a, work], { encoding: 'utf8' });
  const plain = node();
  const written = node('--write');
  assert.equal(written.status, 0);
  assert.equal(written.stdout, plain.stdout, '--write printed something other than the plain print');
  assert.equal(readFileSync(victim, 'utf8'), 'not the state\n', '--write followed the link');
  assert.equal(readFileSync(state, 'utf8'), plain.stdout);
  // A folder where the file goes is still an error here, where the hooks stay quiet.
  rmSync(state);
  mkdirSync(state);
  assert.notEqual(node('--write').status, 0);
  assert.deepEqual(readdirSync(work).filter((f) => f.endsWith('.tmp')), [], 'a temporary file was left behind');
});
