#!/usr/bin/env node
// The harness runs no code from a checkout's changed gate files (#126). Every hook command in
// process/harness/settings.json loads process/harness/hooks/base-guard.sh from origin/HEAD's commit, which runs
// the working tree's hook only when the gate files are origin/HEAD's, or the owner's yes to exactly that diff is
// recorded. Each case runs the command as settings.json writes it, with /bin/sh's bare PATH, against a
// throwaway clone whose stub hooks write a marker. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SETTINGS = JSON.parse(readFileSync(join(SRC, 'process/harness/settings.json'), 'utf8'));
const HOOKS = ['session-state.sh', 'intake-reminder.sh', 'lessons-first.sh', 'absence-search.sh', 'stop-verify.sh'];
const GUARD = 'sh -c "$(git -C "$CLAUDE_PROJECT_DIR" cat-file blob refs/remotes/origin/HEAD:process/harness/hooks/base-guard.sh';

// hook file → the command settings.json runs for it.
const commands = new Map();
for (const entries of Object.values(SETTINGS.hooks)) {
  for (const h of entries.flatMap((e) => e.hooks)) commands.set(h.command.match(/ base-guard ([a-z-]+\.sh)$/)?.[1] ?? h.command, h.command);
}

test('every hook in settings.json runs through the base\'s guard, and none from the working tree', () => {
  assert.deepEqual([...commands.keys()].sort(), [...HOOKS].sort());
  for (const [hook, cmd] of commands) {
    assert.ok(cmd.startsWith(GUARD), `${hook} does not load base-guard.sh from origin/HEAD: ${cmd}`);
    assert.doesNotMatch(cmd, /"\$CLAUDE_PROJECT_DIR"\/process/, `${hook} runs a working-tree script directly`);
  }
});

const T = mkdtempSync(join(tmpdir(), 'harness-'));
const MARK = join(T, 'marks');
const YES = join(T, 'yes');
const origin = join(T, 'origin.git');
const work = join(T, 'work');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (p, body) => {
  mkdirSync(dirname(join(work, p)), { recursive: true });
  writeFileSync(join(work, p), body);
};
const stub = (hook, name = hook) => `#!/bin/sh\ncat >/dev/null\n: > '${join(MARK, name)}'\n`;
const marks = () => (existsSync(MARK) ? execFileSync('ls', [MARK], { encoding: 'utf8' }).split('\n').filter(Boolean) : []);
const reset = () => {
  rmSync(MARK, { recursive: true, force: true });
  mkdirSync(MARK);
};

// origin: the real guard and settings, stub hooks, a package.json and a ci/ file; `work` is a clone of it.
{
  const seed = join(T, 'seed');
  mkdirSync(seed);
  git('-C', seed, 'init', '-q', '-b', 'main');
  const w = (p, body) => {
    mkdirSync(dirname(join(seed, p)), { recursive: true });
    writeFileSync(join(seed, p), body);
  };
  w('process/harness/settings.json', readFileSync(join(SRC, 'process/harness/settings.json'), 'utf8'));
  w('process/harness/hooks/base-guard.sh', readFileSync(join(SRC, 'process/harness/hooks/base-guard.sh'), 'utf8'));
  for (const h of HOOKS) w(`process/harness/hooks/${h}`, stub(h));
  w('process/harness/README.md', '# harness\n');
  w('package.json', '{ "scripts": { "verify": "node ci/verify.mjs" } }\n');
  w('ci/verify.mjs', '// the gate\n');
  w('src/app.ts', 'export {};\n');
  git('-C', seed, 'add', '-A');
  git('-C', seed, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'base');
  git('clone', '-q', '--bare', seed, origin);
  git('clone', '-q', origin, work);
}

function run(hook, input = '{}', extra = []) {
  const cmd = commands.get(hook) ?? `${GUARD})" base-guard ${hook}`;
  const r = spawnSync('/bin/sh', ['-c', cmd, ...extra], {
    input,
    encoding: 'utf8',
    cwd: work,
    env: { PATH: '/usr/bin:/bin', HOME: T, CLAUDE_PROJECT_DIR: work, SLIPWAY_GATE_YES_DIR: YES },
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}
const clean = () => {
  git('-C', work, 'checkout', '-q', '-f', 'main');
  git('-C', work, 'reset', '-q', '--hard', 'origin/main');
  git('-C', work, 'clean', '-q', '-fdx');
  rmSync(YES, { recursive: true, force: true });
  reset();
};
const recordYes = () => run('--yes');

test('control: with the gate files origin/HEAD\'s, every hook runs, as the working tree has it', () => {
  clean();
  for (const h of HOOKS) run(h);
  assert.deepEqual(marks().sort(), [...HOOKS].sort());
  put('src/app.ts', 'export const x = 1;\n');
  put('docs/notes.md', '# notes\n');
  reset();
  run('stop-verify.sh');
  assert.deepEqual(marks(), ['stop-verify.sh'], 'code and a doc outside the gate paths are not gate files');
});

test('probe: a branch whose Stop hook writes a marker leaves none, and the Stop hook blocks once', () => {
  clean();
  git('-C', work, 'checkout', '-q', '-b', 'probe');
  put('process/harness/hooks/stop-verify.sh', stub('stop-verify.sh', 'PROBE'));
  git('-C', work, 'add', '-A');
  git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'probe');
  const r = run('stop-verify.sh');
  assert.deepEqual(marks(), [], 'the branch\'s Stop hook ran');
  const out = JSON.parse(r.out);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /process\/harness\/hooks\/stop-verify\.sh/);
  assert.match(out.reason, /Ask the owner; once they say yes/);
  assert.equal(run('stop-verify.sh', '{"stop_hook_active":true}').out, '', 'a second block in one stop');
  for (const h of HOOKS.filter((x) => x !== 'stop-verify.sh')) run(h);
  assert.deepEqual(marks(), [], 'another hook ran on the probe branch');
  assert.match(JSON.parse(run('session-state.sh').out).hookSpecificOutput.additionalContext, /session-state did not run/);
});

test('each kind of gate file stops the hooks: a hook, ci/, a package.json, .npmrc untracked, a case-folded name, .claude/', () => {
  const cases = [
    () => put('process/harness/hooks/lessons-first.sh', stub('lessons-first.sh', 'PROBE')),
    () => put('ci/verify.mjs', '// changed\n'),
    () => put('package.json', '{ "scripts": { "verify": "node x.mjs" } }\n'),
    () => put('apps/web/.npmrc', 'script-shell=/tmp/x\n'),
    () => put('.NPMRC', 'node-options=--require /tmp/x\n'),
    () => put('.claude/settings.json', '{}\n'),
    () => put('node_modules/.bin/tsc', '#!/bin/sh\n'),
    () => put('process/harness/README.md', '# a doc under a gate path counts too\n'),
    () => put('.claude/commands/x.md', '!`echo x`\n'),
    () => put('.gitmodules', '[submodule "ci/tool"]\n\tpath = ci/tool\n\tignore = all\n'),
    () => put('.gitattributes', '*.sh text eol=crlf\n'),
  ];
  for (const [i, change] of cases.entries()) {
    clean();
    change();
    for (const h of HOOKS) run(h);
    assert.deepEqual(marks(), [], `case ${i}: a hook ran`);
  }
});

test('a file name reaches the message only as safe characters, and the output stays JSON', () => {
  clean();
  put('ci/x","decision":"approve.mjs', '');
  const out = JSON.parse(run('stop-verify.sh').out);
  assert.equal(out.decision, 'block');
  assert.doesNotMatch(out.reason, /approve"/);
});

test('the owner\'s recorded yes lets the hooks run, until a gate file changes again', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  run('stop-verify.sh');
  assert.deepEqual(marks(), []);
  const y = recordYes();
  assert.equal(y.status, 0, y.out);
  assert.match(y.out, /ci\/verify\.mjs/);
  run('stop-verify.sh');
  assert.deepEqual(marks(), ['stop-verify.sh'], 'the recorded yes did not let the Stop hook run');
  reset();
  put('ci/verify.mjs', '// changed again\n');
  assert.equal(JSON.parse(run('stop-verify.sh').out).decision, 'block', 'a yes outlived a change');
  assert.deepEqual(marks(), []);
  reset();
  put('ci/verify.mjs', '// changed\n');
  put('.envrc', 'export PATH=/tmp/x:$PATH\n');
  run('stop-verify.sh');
  assert.deepEqual(marks(), [], 'a yes outlived a new untracked gate file');
});

test('a record directory that is not private is ignored, and --yes refuses to write to it', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  assert.equal(recordYes().status, 0);
  chmodSync(YES, 0o755);
  run('stop-verify.sh');
  assert.deepEqual(marks(), [], 'a group-readable record directory was trusted');
  assert.equal(recordYes().status, 1);
});

test('with a clean tree there is nothing to record', () => {
  clean();
  assert.match(recordYes().out, /nothing to record/);
  assert.ok(!existsSync(YES), 'a record directory was made with nothing to record');
});

test('no origin/HEAD: no hook runs; the Stop and SessionStart hooks say why, the advisory ones stay quiet', () => {
  clean();
  git('-C', work, 'remote', 'set-head', 'origin', '-d');
  try {
    for (const h of ['stop-verify.sh', 'session-state.sh']) assert.match(JSON.parse(run(h).out).systemMessage, /no hook ran/);
    for (const h of ['intake-reminder.sh', 'lessons-first.sh', 'absence-search.sh']) assert.equal(run(h).out, '');
    assert.deepEqual(marks(), []);
  } finally {
    git('-C', work, 'remote', 'set-head', 'origin', 'main');
  }
});

test('a lookalike name counts as a gate file, is named apart in the message, and a recorded yes covers it', () => {
  clean();
  git('-C', work, 'checkout', '-q', '-b', 'lookalike');
  put('node_moduleſ/.bin/node', '#!/bin/sh\n');
  git('-C', work, 'add', '-A');
  git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'lookalike');
  const out = JSON.parse(run('stop-verify.sh').out);
  assert.equal(out.decision, 'block');
  assert.match(out.reason, /Non-ASCII names; on a Mac one may stand in for a gate path like node_modules\/: \?node_module#305#277\/\.bin\/node\?/);
  assert.deepEqual(marks(), []);
  assert.equal(recordYes().status, 0);
  run('stop-verify.sh');
  assert.deepEqual(marks(), ['stop-verify.sh'], 'the recorded yes did not cover the lookalike');
  reset();
  put('src/app.ts', 'export const y = 2;\n');
  assert.equal(JSON.parse(run('stop-verify.sh').out).decision, 'block', 'with a lookalike present, the yes covers the whole tree');
});

test('a recorded yes covers exact content: a quoted name\'s content, or content moved between files, asks again', () => {
  clean();
  put('ci/a"b.mjs', '// one\n');
  assert.equal(recordYes().status, 0);
  run('stop-verify.sh');
  assert.deepEqual(marks(), ['stop-verify.sh']);
  reset();
  put('ci/a"b.mjs', '// two\n');
  assert.equal(JSON.parse(run('stop-verify.sh').out).decision, 'block', 'a quoted name\'s new content ran on the old yes');
  clean();
  put('ci/a.mjs', 'X\nci/b.mjs\nEVIL\n');
  assert.equal(recordYes().status, 0);
  reset();
  put('ci/a.mjs', 'X\n');
  put('ci/b.mjs', 'EVIL\n');
  assert.equal(JSON.parse(run('stop-verify.sh').out).decision, 'block', 'content split across files ran on the old yes');
  assert.deepEqual(marks(), []);
});

test('the harness asks before an agent records a yes or moves the base the guard trusts', () => {
  const ask = SETTINGS.permissions.ask;
  for (const r of ['Bash(*base-guard*--yes*)', 'Bash(git remote set-head:*)', 'Bash(git update-ref:*)', 'Bash(git replace:*)', 'Bash(*refs/remotes/origin*)']) assert.ok(ask.includes(r), `no ask rule ${r}`);
  for (const t of ['Edit', 'Write']) for (const d of ['//tmp', '//private/tmp']) assert.ok(ask.includes(`${t}(${d}/slipway-gate-yes-*/**)`), `no ask rule ${t}(${d}/…)`);
});

test.after(() => rmSync(T, { recursive: true, force: true }));
