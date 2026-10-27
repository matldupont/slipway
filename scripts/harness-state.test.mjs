#!/usr/bin/env node
// STATE.md is kept current by the guarded hooks (#374): the SessionStart hook writes the text it hands the agent, the
// Stop hook rewrites it at the end of each turn, and when the guard does not run the working tree's hooks the file is
// left as it was. The real session-state.sh, stop-verify.sh and ci/ are committed to the fixture's origin, so the
// guard runs them from a pinned base. Fixture: harness-fixture.mjs. Internal: `pnpm meta` runs it in slipway, never in
// a project.

import assert from 'node:assert/strict';
import { appendFileSync, chmodSync, unlinkSync, closeSync, openSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gitignoreText } from './lib/install.mjs';
import test from 'node:test';
import { SRC, SID, T, commands, work, git, put, reset, run, commit, unpin, pinOf, marks } from './harness-fixture.mjs';

// A hook PATH holds node and a pnpm that answers `-v`, as the gate's runner does: the Stop hook says so and prints otherwise.
// Asked to run a task, it fails in a folder that holds a file named RED, and says which folder (#481).
const BIN = mkdtempSync(join(tmpdir(), 'harness-state-bin-'));
writeFileSync(join(BIN, 'pnpm'), '#!/bin/sh\n[ "$1" = -v ] && { echo 0.0.0; exit 0; }\n[ -e RED ] && { echo "red in $(pwd -P)"; exit 1; }\nexit 0\n');
chmodSync(join(BIN, 'pnpm'), 0o755);
test.after(() => rmSync(BIN, { recursive: true, force: true }));
const PATH = `${BIN}:/usr/bin:/bin:${dirname(process.execPath)}`; // the stub first: node's folder may hold a real pnpm
const REAL = ['session-state.sh', 'stop-verify.sh', 'stop-verify.mjs', 'find-node.sh'];

// The base: the fixture's, with the real hooks and the real ci/ in it, and the ignore rules a project has.
git('-C', work, 'checkout', '-q', 'main');
for (const h of REAL) cpSync(join(SRC, 'process/harness/hooks', h), join(work, 'process/harness/hooks', h));
rmSync(join(work, 'ci'), { recursive: true, force: true });
cpSync(join(SRC, 'ci'), join(work, 'ci'), { recursive: true, filter: (p) => !p.includes('/fixtures') && !p.includes('node_modules') });
writeFileSync(join(work, '.gitignore'), gitignoreText(SRC));
git('-C', work, 'add', '-A');
commit('real hooks');
git('-C', work, 'push', '-q', 'origin', 'main');

const state = join(work, 'STATE.md');
const fresh = () => {
  git('-C', work, 'checkout', '-q', '-f', 'main');
  git('-C', work, 'reset', '-q', '--hard', 'origin/main');
  git('-C', work, 'clean', '-q', '-ffdx');
  unpin();
  run('session-state.sh', JSON.stringify({ session_id: SID, cwd: work, hook_event_name: 'SessionStart', source: 'startup' }), SID, { PATH });
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

test('a refresh killed between the write and the rename leaves nothing git sees, here and in the .gitignore a project gets', () => {
  fresh();
  start();
  writeFileSync(join(work, '.STATE.md.12345.tmp'), 'half\n');
  assert.equal(git('-C', work, 'status', '--porcelain'), '', 'the temporary file shows up as untracked');
  const out = stop();
  assert.equal(`${out.status} ${out.out}`, '0 ', 'a leftover temporary file blocked the Stop hook');
  // The rule is in the text a new project and a sync write, not only in this repository's file.
  const none = mkdtempSync(join(tmpdir(), 'harness-state-ignore-'));
  try {
    assert.match(gitignoreText(none), /^\.STATE\.md\.\*\.tmp$/m);
  } finally {
    rmSync(none, { recursive: true, force: true });
  }
});

test('a write that fails removes its temporary file, and still reports the failure', () => {
  fresh();
  mkdirSync(state); // the rename onto a folder fails after the temporary file is written
  mkdirSync(join(state, 'keep'));
  const node = spawnSync(process.execPath, [join(work, 'ci/status.mjs'), '--write', work], { encoding: 'utf8' });
  assert.notEqual(node.status, 0);
  assert.deepEqual(readdirSync(work).filter((f) => f.startsWith('.STATE.md.')), [], 'the temporary file was left behind');
  assert.ok(lstatSync(state).isDirectory(), 'the folder at STATE.md was replaced');
});

test('a turn-end refresh that never returns is cut off after 20 s, and the Stop hook prints what it prints today', { timeout: 60000 }, () => {
  fresh();
  start();
  const base = stop();
  assert.equal(`${base.status} ${base.out}`, '0 ');
  // process/anchor, since status stopped reading anything but a regular file under docs/ (#501). A follow-up closes the
  // read status still makes here and moves this test to a stand-in that hangs, in the same pull request.
  const fifo = join(work, 'process/anchor');
  rmSync(fifo, { force: true });
  assert.equal(spawnSync('mkfifo', [fifo]).status, 0); // a read of a pipe with no writer never returns
  appendFileSync(join(work, '.git/info/exclude'), 'process/anchor\n'); // git and the gate never read it; only status does
  try {
    // Run here rather than through run(): with no limit the hook never returns, and the test must fail, not hang.
    const t0 = Date.now();
    const spawned = spawnSync('/bin/sh', ['-c', commands.get('stop-verify.sh')], {
      input: '{}', encoding: 'utf8', cwd: work, timeout: 30000, killSignal: 'SIGKILL',
      env: { PATH, HOME: T, CLAUDE_PROJECT_DIR: work, CLAUDE_CODE_SESSION_ID: SID },
    });
    const took = Date.now() - t0;
    assert.ok(took >= 19000 && took <= 25000, `the refresh ran ${took} ms, not the 20 s limit`);
    assert.equal(spawned.status, 0);
    assert.equal(`${spawned.stdout}${spawned.stderr}`, base.out);
  } finally {
    try { closeSync(openSync(fifo, 'r+')); } catch { /* lets a reader a failed run left behind see the end of the file */ }
    rmSync(fifo, { force: true });
    writeFileSync(join(work, '.git/info/exclude'), '');
  }
});

// #481 — a session in a git worktree of the project. Claude Code names the main checkout in CLAUDE_PROJECT_DIR; the
// guard pins the folder the session started in and checks that tree, never the main checkout. Last in this file: it
// commits a workspace to the base, so verify has a package to run.
// #506 — the session's folder is the input's `cwd`. The hook process runs in the main checkout, as it does in the app,
// so a guard that read its own folder would pin the main checkout here.
const wt = join(T, 'wt');
const PIN = join(T, '.claude/slipway/sessions', SID, 'tree');
const opening = (cwd) => JSON.stringify({ session_id: SID, transcript_path: '/x.jsonl', cwd, hook_event_name: 'SessionStart', source: 'startup' });
const startWith = (input) => (unpin(), run('session-state.sh', input, SID, { PATH }, work));
const begin = (cwd) => startWith(opening(cwd));
const FALLBACK = /^base-guard: this session's folder could not be read from its SessionStart input, so its hooks check the project folder/;
const stopIn = (cwd, input = '{}') => run('stop-verify.sh', input, SID, { PATH }, cwd);
const decision = (r) => JSON.parse(r.out.split('\n').find((l) => l.startsWith('{')) ?? '{}');
let workspace = false;
const worktree = () => {
  git('-C', work, 'checkout', '-q', '-f', 'main');
  git('-C', work, 'reset', '-q', '--hard', 'origin/main');
  git('-C', work, 'clean', '-q', '-ffdx');
  if (!workspace) {
    put('pnpm-workspace.yaml', 'packages:\n  - apps/*\n');
    put('apps/a/package.json', '{ "name": "a", "scripts": { "check": "true", "test": "true" } }\n');
    put('apps/a/a.test.mjs', '// a test file, so verify has one to count\n');
    git('-C', work, 'add', '-A');
    commit('a workspace');
    git('-C', work, 'push', '-q', 'origin', 'main');
    workspace = true;
  }
  rmSync(wt, { recursive: true, force: true });
  git('-C', work, 'worktree', 'prune');
  git('-C', work, 'worktree', 'add', '-q', '--detach', wt, 'origin/main');
  assert.equal(begin(wt).status, 0);
  assert.equal(readFileSync(PIN, 'utf8'), `${realpathSync(wt)}\n`, 'the session did not pin its worktree');
  rmSync(join(work, 'STATE.md'), { force: true });
  reset();
};

test('a worktree session: the Stop hook runs verify on the worktree, a red main checkout does not block it, and a cd elsewhere does not move it', () => {
  worktree();
  writeFileSync(join(work, 'RED'), '');
  const green = stopIn(wt);
  assert.equal(`${green.status} ${green.out}`, '0 ', 'the main checkout\'s failure blocked the worktree');
  assert.ok(existsSync(join(wt, 'STATE.md')), 'the turn-end refresh did not write the worktree\'s STATE.md');
  assert.ok(!existsSync(join(work, 'STATE.md')), 'the turn-end refresh wrote the main checkout\'s STATE.md');
  rmSync(join(work, 'RED'));
  writeFileSync(join(wt, 'RED'), '');
  const red = decision(stopIn(wt));
  assert.equal(red.decision, 'block', 'a red worktree ended its turn');
  assert.ok(red.reason.includes(`red in ${realpathSync(wt)}`), `verify did not run in the worktree: ${red.reason}`);
  // The pin, not the shell's folder: a session whose shell ended in the main checkout still checks its worktree.
  assert.equal(decision(stopIn(work)).decision, 'block', 'a cd into the main checkout moved the gate');
  assert.equal(`${stopIn(wt, '{"stop_hook_active":true}').status}`, '0');
});

test('a worktree session: SessionStart prints the worktree\'s state, and the guard reads the worktree\'s gate files', () => {
  worktree();
  put('docs/PRD.md', '# PRD in the main checkout only\n');
  const s = run('session-state.sh', JSON.stringify({ session_id: SID, hook_event_name: 'SessionStart', source: 'resume' }), SID, { PATH }, wt);
  assert.equal(readFileSync(join(wt, 'STATE.md'), 'utf8'), `${context(s.out)}\n`, 'status was not printed for the worktree');
  assert.ok(!existsSync(join(work, 'STATE.md')), 'status was written for the main checkout');
  // A gate file changed only in the main checkout holds back nothing here; one changed in the worktree does.
  put('ci/extra.mjs', '// a gate file the base does not have\n');
  assert.equal(`${stopIn(wt).out}`, '', 'the main checkout\'s gate file held back the worktree\'s hooks');
  rmSync(join(work, 'ci/extra.mjs'));
  writeFileSync(join(wt, 'ci/extra.mjs'), '// a gate file the base does not have\n');
  assert.match(decision(stopIn(wt)).reason, /Gate files: ci\/extra\.mjs/);
  assert.match(run('session-state.sh', '{"source":"resume"}', SID, { PATH }, wt).out, /session-state did not run/);
});

test('a session started outside a worktree of the project pins the project folder, and runs as before', () => {
  const other = join(T, 'other');
  git('init', '-q', other);
  for (const [why, cwd] of [['the main checkout', work], ['a folder in no repository', T], ['another repository', other], ['a folder that is not there', join(T, 'nowhere')]]) {
    const r = begin(cwd);
    assert.equal(r.status, 0, why);
    assert.equal(readFileSync(PIN, 'utf8'), `${realpathSync(work)}\n`, `${why}: the project folder was not pinned`);
    assert.doesNotMatch(r.out, /could not be read from its SessionStart input/, `${why}: a folder that was read was called unreadable`);
  }
  worktree();
  writeFileSync(join(wt, 'RED'), '');
  begin(work);
  assert.equal(`${stopIn(work).out}`, '', 'a main checkout session was blocked by a worktree');
  writeFileSync(join(work, 'RED'), '');
  assert.equal(decision(stopIn(work)).decision, 'block', 'a red main checkout ended its turn');
});

test('a pinned tree that is gone, no longer a worktree top, or a missing or unreadable pin blocks once and never falls back', () => {
  worktree();
  const top = realpathSync(work);
  for (const [why, write] of [
    ['the worktree removed', () => git('-C', work, 'worktree', 'remove', '--force', wt)],
    ['a plain folder where the worktree was', () => mkdirSync(wt)],
    ['a subfolder of the main checkout', () => writeFileSync(PIN, `${join(top, 'src')}\n`)],
    ['a relative path', () => writeFileSync(PIN, 'work\n')],
    ['two lines', () => writeFileSync(PIN, `${top}\n${top}\n`)],
    ['an empty file', () => writeFileSync(PIN, '')],
    ['no file, its base still pinned', () => rmSync(PIN)],
    ['a clone of the project, its own repository', () => { git('clone', '-q', work, join(T, 'clone')); writeFileSync(PIN, `${realpathSync(join(T, 'clone'))}\n`); }],
    ['a link', () => { rmSync(PIN); writeFileSync(join(T, 'elsewhere'), `${top}\n`); symlinkSync(join(T, 'elsewhere'), PIN); }],
  ]) {
    write();
    reset();
    const r = decision(stopIn(work));
    assert.equal(r.decision, 'block', why);
    assert.match(r.reason, /folder this session started in is gone, unreadable or no longer a worktree/, why);
    assert.equal(`${stopIn(work, '{"stop_hook_active":true}').out}`, '', `${why}: blocked twice in one stop`);
    assert.match(run('session-state.sh', '{"source":"resume"}', SID, { PATH }).out, /session-state did not run/, why);
    run('lessons-first.sh', '{}', SID, { PATH });
    assert.deepEqual(marks(), [], `${why}: a hook ran`);
  }
});

test('the worktree is pinned from the input when the hook runs in the main checkout, through a link too', () => {
  worktree(); // begin() runs the hook in the main checkout and names the worktree in the input
  begin(join(wt, 'apps/a'));
  assert.equal(readFileSync(PIN, 'utf8'), `${realpathSync(wt)}\n`, 'a subfolder of the worktree did not pin its top');
  const link = join(T, 'wt-link');
  try { unlinkSync(link); } catch {}
  symlinkSync(wt, link);
  assert.equal(begin(link).status, 0);
  assert.equal(readFileSync(PIN, 'utf8'), `${realpathSync(wt)}\n`, 'a link to the worktree did not pin the worktree');
  unlinkSync(link);
});

// An input the guard cannot read the folder from without parsing a string pins the project folder, and says so where
// the owner sees it, in one fixed sentence that quotes nothing from the input.
test('a cwd that is missing, relative, escaped or given twice pins the project folder, and SessionStart says so', () => {
  worktree();
  const plain = opening(wt);
  for (const [why, input] of [
    ['no cwd', JSON.stringify({ session_id: SID, hook_event_name: 'SessionStart', source: 'startup' })],
    ['a relative cwd', opening('wt')],
    ['an escaped cwd', plain.replace(`"cwd":"${wt}"`, `"cwd":"${wt.replaceAll('/', '\\/')}"`)],
    ['a quote in the cwd', opening(`${wt}"x`)],
    ['a backslash after the first character', opening(`${wt}\\x`)],
    ['two cwd members', plain.replace('"hook_event_name"', `"cwd":"${wt}","hook_event_name"`)],
    ['a cwd nested in another member', plain.replace('"hook_event_name"', `"extra":{"cwd":"${T}"},"hook_event_name"`)],
  ]) {
    assert.notEqual(input, plain, `${why}: the case is the plain input`);
    const r = startWith(input);
    assert.equal(r.status, 0, why);
    assert.equal(readFileSync(PIN, 'utf8'), `${realpathSync(work)}\n`, `${why}: the project folder was not pinned`);
    const lines = r.out.split('\n').filter(Boolean);
    assert.equal(lines.length, 1, `${why}: more than the one JSON line: ${r.out}`);
    const out = JSON.parse(lines[0]);
    assert.match(out.systemMessage, FALLBACK, why);
    assert.ok(!out.systemMessage.includes(wt) && !out.systemMessage.includes(T), `${why}: the sentence quoted the input`);
    assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart', `${why}: session-state's own output was lost`);
  }
});

// The sentence goes in only where it keeps the output valid: spliced into session-state's one-line object, after plain
// text, and on stderr for any other shape, which is left byte for byte as it was.
test('the fallback sentence is spliced, appended or sent to stderr by the shape of session-state\'s output', () => {
  worktree();
  const missing = JSON.stringify({ session_id: SID, hook_event_name: 'SessionStart', source: 'startup' });
  const hook = join(work, 'process/harness/hooks/session-state.sh');
  const real = readFileSync(hook, 'utf8');
  const shaped = (body) => {
    writeFileSync(hook, `#!/bin/sh\ncat >/dev/null\n${body}\n`);
    git('-C', work, 'add', '-A');
    commit('session-state, another shape');
    git('-C', work, 'push', '-q', 'origin', 'main');
    git('-C', work, 'remote', 'set-head', 'origin', 'main');
    return spawnSync('/bin/sh', ['-c', commands.get('session-state.sh')], { input: missing, encoding: 'utf8', cwd: work, env: { PATH, HOME: T, CLAUDE_PROJECT_DIR: work, CLAUDE_CODE_SESSION_ID: SID } });
  };
  try {
    unpin();
    let r = shaped("printf '%s\\n' 'node is not on the hook PATH'");
    assert.equal(r.stdout, `node is not on the hook PATH\n${r.stdout.split('\n')[1]}\n`);
    assert.match(r.stdout.split('\n')[1], FALLBACK, 'plain text did not get the sentence as a line');
    for (const body of [
      `printf '%s\\n' '{"systemMessage":"already","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"x"}}'`,
      `printf '%s\\n' '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"x"},"systemMessage":"already"}'`,
      `printf '%s\\n%s\\n' '{"hookSpecificOutput":{"hookEventName":"SessionStart",' '"additionalContext":"x"}}'`,
      `printf '%s\\n' '{"continue":true}'`,
    ]) {
      unpin();
      r = shaped(body);
      const want = spawnSync('/bin/sh', ['-c', body], { encoding: 'utf8' }).stdout;
      assert.equal(r.stdout, want, `another shape was changed: ${body}`);
      assert.match(r.stderr, /could not be read from its SessionStart input/, `the sentence did not go to stderr: ${body}`);
    }
  } finally {
    writeFileSync(hook, real);
    git('-C', work, 'add', '-A');
    commit('session-state, real again');
    git('-C', work, 'push', '-q', 'origin', 'main');
  }
});

// A fallback session whose checkout's gate files differ from the base is held at SessionStart, the #506 symptom: the
// held output carries the sentence too, as one JSON object.
test('a held SessionStart in a fallback session says so in its systemMessage', () => {
  worktree();
  put('ci/extra.mjs', '// a gate file the base does not have\n');
  const r = startWith(JSON.stringify({ session_id: SID, hook_event_name: 'SessionStart', source: 'startup' }));
  const lines = r.out.split('\n').filter(Boolean);
  assert.equal(lines.length, 1, r.out);
  const out = JSON.parse(lines[0]);
  assert.match(out.systemMessage, FALLBACK);
  assert.match(out.hookSpecificOutput.additionalContext, /^session-state did not run: .*Gate files: ci\/extra\.mjs/);
  rmSync(join(work, 'ci/extra.mjs'));
});
