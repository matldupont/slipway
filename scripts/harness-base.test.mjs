#!/usr/bin/env node
// The harness's base (#145, #154): the commit the session's first SessionStart found at origin/HEAD is pinned outside
// the repository, and the guard and the base every hook compares against are that commit's, never the live ref; with
// no pin, no origin/HEAD or no guard to load, no hook runs and the Stop hook blocks once, but for the one state D-034
// lets through (#262, harness-no-pin.test.mjs): no pin at all, nothing changed, HEAD at origin/HEAD. Fixture:
// harness-fixture.mjs.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { SRC, SETTINGS, HOOKS, TRUST, T, SID, MARK, origin, work, git, put, stub, marks, reset, run, BASE, start, pinOf, unpin, clean, say, commit, quiet, change, stopJson } from './harness-fixture.mjs';

// #154: with no guard to load, the Stop hook cannot run stop-verify, so it blocks once and has the agent run the gate.
// The fallback text once sat inside `$( … || echo '…')`, and /bin/sh is bash 3.2 on a Mac: a `, ` in it, inside braces,
// made that shell run the whole guard several times and pass the wrong arguments. It is a quoted variable now (#145);
// these cases catch the text breaking.
const stopFallback = (r) => {
  assert.equal(r.status, 0);
  const out = JSON.parse(r.out);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /Run pnpm verify:fast yourself and report its result/);
  assert.equal(run('stop-verify.sh', '{"stop_hook_active":true}').out, '', 'a second block in one stop');
  assert.equal(run('stop-verify.sh', '{"stop_hook_active": true}').out, '', 'a second block in one stop, spaced');
  assert.match(JSON.parse(start().out).systemMessage, /no hook ran/);
  for (const h of ['intake-reminder.sh', 'lessons-first.sh', 'absence-search.sh', TRUST]) assert.equal(run(h, say('trust gates')).out, '');
  assert.deepEqual(marks(), []);
  assert.ok(!existsSync(join(T, '.claude')), 'a session with no guard to load wrote a pin or a yes');
};

test('no origin/HEAD at session start: nothing is pinned and no hook runs; the Stop hook blocks once, SessionStart says why, the advisory ones stay quiet', () => {
  clean();
  unpin();
  git('-C', work, 'remote', 'set-head', 'origin', '-d');
  try {
    start();
    stopFallback(run('stop-verify.sh'));
  } finally {
    git('-C', work, 'remote', 'set-head', 'origin', 'main');
  }
});

test('a base with no guard at session start: nothing is pinned; the Stop hook blocks once and names pnpm verify:fast; the branch\'s own Stop hook does not run', () => {
  clean();
  unpin();
  git('-C', work, 'checkout', '-q', '-b', 'noguard');
  git('-C', work, 'rm', '-q', 'process/harness/hooks/base-guard.sh');
  git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'a base before the guard');
  git('-C', work, 'update-ref', 'refs/remotes/origin/noguard', 'HEAD');
  git('-C', work, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/noguard');
  try {
    start();
    quiet('nothing changed at a base with no guard: the fallback cannot tell why there is no pin (D-034)');
    change(); // #154 as it happens: the checkout differs from a base that holds no guard yet
    stopFallback(run('stop-verify.sh'));
  } finally {
    git('-C', work, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
    git('-C', work, 'update-ref', '-d', 'refs/remotes/origin/noguard');
  }
});

test('the harness asks before an agent moves the base the guard trusts', () => {
  const ask = SETTINGS.permissions.ask;
  for (const r of ['Bash(git remote set-head:*)', 'Bash(git update-ref:*)', 'Bash(git replace:*)', 'Bash(*refs/remotes/origin*)']) assert.ok(ask.includes(r), `no ask rule ${r}`);
});

// #145 — the pin. The guard and the base every hook compares against are the commit the session's first SessionStart
// found at origin/HEAD, read from a file outside the repository, never the live ref.
const stopBlocksOnce = (sid = SID) => {
  const out = stopJson(sid);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /no base is pinned for this session.*Run pnpm verify:fast yourself and report its result/);
  assert.equal(run('stop-verify.sh', '{"stop_hook_active":true}', sid).out, '');
  for (const h of ['intake-reminder.sh', 'lessons-first.sh', 'absence-search.sh']) assert.equal(run(h, '{}', sid).out, '');
  assert.deepEqual(marks(), [], 'a hook ran in a session with no pin');
};
// A second base, B: its guard and its Stop hook are stubs that write a marker. origin/HEAD is moved to it mid-session.
const moveBase = (then) => {
  git('-C', work, 'checkout', '-q', '-B', 'moved');
  put('process/harness/hooks/base-guard.sh', `#!/bin/sh\n: > '${join(MARK, 'B-GUARD')}'\n`);
  put('process/harness/hooks/stop-verify.sh', stub('stop-verify.sh', 'B-STOP'));
  git('-C', work, 'add', '-A');
  commit('B');
  git('-C', work, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  try {
    assert.notEqual(git('-C', work, 'rev-parse', 'origin/HEAD'), BASE);
    then();
  } finally {
    git('-C', work, 'update-ref', 'refs/remotes/origin/main', BASE);
  }
};

test('a session pins origin/HEAD once, outside the repository; origin/HEAD moved mid-session moves neither the guard nor the base', () => {
  clean();
  assert.equal(statSync(pinOf()).mode & 0o777, 0o600);
  assert.equal(git('-C', work, 'status', '--porcelain', '--ignored'), '', 'the pin is inside the repository');
  for (const [sid, source] of [['sess-C', 'clear'], ['sess-F', 'fork']]) { // the other two sources that come with a new id
    start(sid, source);
    assert.equal(readFileSync(pinOf(sid), 'utf8'), `${BASE}\n`, `source ${source} did not pin`);
  }
  reset();
  moveBase(() => {
    for (const h of HOOKS) run(h);
    assert.deepEqual(marks(), [], 'the moved base\'s guard or the branch\'s hook ran');
    const out = JSON.parse(run('stop-verify.sh').out);
    assert.equal(out.decision, 'block', 'the checkout is B, and it was compared with B, not with the pin');
    assert.match(out.reason, /process\/harness\/hooks\/base-guard\.sh process\/harness\/hooks\/stop-verify\.sh /);
    for (const source of ['startup', 'resume', 'compact', 'clear']) start(SID, source);
    assert.equal(readFileSync(pinOf(), 'utf8'), `${BASE}\n`, 'a later SessionStart re-pinned');
    assert.deepEqual(marks(), []);
  });
});

test('a compaction or a resume never pins: with no pin no hook runs, the moved base\'s guard included, and Stop and SessionStart say so', () => {
  for (const source of ['compact', 'resume', 'nonsense', null]) {
    clean();
    unpin();
    moveBase(() => {
      assert.match(JSON.parse(start(SID, source).out).systemMessage, /no base is pinned for this session.*no hook ran/, `source ${source}`);
      assert.ok(!existsSync(join(T, '.claude')), `source ${source} pinned`);
      change(); // with nothing changed at the moved origin/HEAD the turn ends: D-034, "one limit is wider than it was"
      stopBlocksOnce();
    });
  }
});

test('a pin that is empty, not a commit id, a link, or names no commit runs no hook, and never loads the index\'s guard', () => {
  const other = join(T, 'other-pin');
  writeFileSync(other, `${BASE}\n`);
  for (const pin of ['', 'zz\n', `${BASE.slice(1)}\n`, `${BASE}x\n`, `${'f'.repeat(40)}\n`, `--help\n`, null]) {
    clean();
    put('process/harness/hooks/base-guard.sh', `#!/bin/sh\n: > '${join(MARK, 'INDEX-GUARD')}'\n`);
    git('-C', work, 'add', '-A'); // `:path` with no revision would read this copy
    rmSync(pinOf());
    if (pin === null) symlinkSync(other, pinOf());
    else writeFileSync(pinOf(), pin);
    assert.match(JSON.parse(start(SID, 'resume').out).systemMessage, /no hook ran/, `pin ${JSON.stringify(pin)}`);
    stopBlocksOnce();
  }
});

test('a session id that is unset, too long or could leave the sessions folder pins nothing and runs no hook', () => {
  for (const sid of [null, '', '../x', 'a/b', 'a b', '.', 'x'.repeat(65)]) {
    clean();
    unpin();
    assert.match(JSON.parse(start(sid).out).systemMessage, /no hook ran/, `session id ${JSON.stringify(sid)}`);
    assert.ok(!existsSync(join(T, '.claude')), `session id ${JSON.stringify(sid)} wrote a pin`);
    stopBlocksOnce(sid);
  }
});

test('a replace ref for the pinned guard is not followed', () => {
  clean();
  const stubGuard = join(T, 'replace-guard');
  writeFileSync(stubGuard, `#!/bin/sh\n: > '${join(MARK, 'REPLACED')}'\n`);
  const real = git('-C', work, 'rev-parse', `${BASE}:process/harness/hooks/base-guard.sh`);
  // The guard's own reads too: a replaced settings.json with no gate paths would stop every hook.
  const empty = join(T, 'replace-settings');
  writeFileSync(empty, '{}\n');
  const settings = git('-C', work, 'rev-parse', `${BASE}:process/harness/settings.json`);
  git('-C', work, 'replace', real, git('-C', work, 'hash-object', '-w', stubGuard));
  git('-C', work, 'replace', settings, git('-C', work, 'hash-object', '-w', empty));
  try {
    for (const h of HOOKS) run(h);
    assert.deepEqual(marks().sort(), [...HOOKS].sort());
  } finally {
    git('-C', work, 'replace', '-d', real);
    git('-C', work, 'replace', '-d', settings);
  }
});

// The guard repeats what the loaders check, for a guard run any other way: read from the working tree here, with
// no loader in front of it.
test('the guard itself refuses a bad session id, a pin that is a link or no commit id, and a compaction with no pin', () => {
  const text = readFileSync(join(SRC, 'process/harness/hooks/base-guard.sh'), 'utf8');
  const guard = (hook, input, sid = SID) => spawnSync('/bin/sh', ['-c', text, 'base-guard', hook], { input, encoding: 'utf8', cwd: work, env: { PATH: '/usr/bin:/bin', HOME: T, CLAUDE_PROJECT_DIR: work, ...(sid === null ? {} : { CLAUDE_CODE_SESSION_ID: sid }) } }).stdout;
  const started = (source) => JSON.stringify({ hook_event_name: 'SessionStart', source });
  for (const sid of [null, '../x', 'x'.repeat(65)]) {
    clean();
    unpin();
    assert.match(JSON.parse(guard('session-state.sh', started('startup'), sid)).systemMessage, /no session id/, `session id ${JSON.stringify(sid)}`);
    assert.ok(!existsSync(join(T, '.claude')));
  }
  for (const source of ['compact', 'resume']) {
    clean();
    unpin();
    assert.match(JSON.parse(guard('session-state.sh', started(source))).systemMessage, /no base is pinned for this session/, source);
    assert.ok(!existsSync(join(T, '.claude')), `the guard pinned on ${source}`);
  }
  const elsewhere = join(T, 'guard-pin');
  writeFileSync(elsewhere, `${BASE}\n`);
  for (const pin of [null, `${BASE.slice(1)}\n`, `${BASE}x\n`, `${'f'.repeat(40)}\n`]) {
    clean();
    rmSync(pinOf());
    if (pin === null) symlinkSync(elsewhere, pinOf());
    else writeFileSync(pinOf(), pin);
    for (const source of ['startup', 'resume']) assert.match(JSON.parse(guard('session-state.sh', started(source))).systemMessage, /no base is pinned for this session/, `pin ${JSON.stringify(pin)}`);
    assert.match(JSON.parse(guard('stop-verify.sh', '{}')).systemMessage, /no base is pinned for this session/);
    assert.deepEqual(marks(), []);
  }
  clean(); // and with a good pin it runs the hook, so the cases above stopped for their reason
  guard('stop-verify.sh', '{}');
  assert.deepEqual(marks(), ['stop-verify.sh']);
});
