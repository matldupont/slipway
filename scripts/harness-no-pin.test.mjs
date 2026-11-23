#!/usr/bin/env node
// A session with no pin (#262, D-034). The Stop hook cannot load the guard for it, so it blocks once a turn (#154,
// harness-base.test.mjs), but for one state: a usable session id, no pin at all, nothing changed, and HEAD the commit
// origin/HEAD names. Each condition broken blocks as before, a pinned session is untouched, and the session cannot
// give itself a pin. Fixture: harness-fixture.mjs. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { SETTINGS, HOOKS, TRUST, T, SID, work, git, put, marks, run, BASE, start, pinOf, pinTo, unpin, clean, say, commit, quiet, change, stopJson, atBase, hookEnv, verifyRuns, endsAtOnce, gated, body } from './harness-fixture.mjs';

// Nothing runs, so a gate that is red for a reason outside the session blocks nothing.
test('no pin at all, nothing changed, HEAD at origin/HEAD: the turn ends with no hand run, and nothing runs or pins', () => {
  clean();
  unpin();
  quiet('main at origin/HEAD');
  for (const source of ['resume', 'compact']) {
    start(SID, source);
    quiet(`after a ${source}`);
  }
  git('-C', work, 'checkout', '-q', '--detach', 'origin/HEAD');
  quiet('detached at origin/HEAD');
  const exclude = join(work, '.git/info/exclude');
  const before = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
  try {
    writeFileSync(exclude, `${before}\nignored/\n`);
    put('ignored/dep.js', '// an ignored folder, as node_modules is\n');
    quiet('an ignored file');
  } finally {
    writeFileSync(exclude, before);
  }
});

test('no pin, and a change, a HEAD that is not origin/HEAD, a pin that cannot be used or git not answering: still blocked', () => {
  const blocked = (why, env) => {
    const out = stopJson(SID, env);
    assert.equal(out.decision, 'block', why);
    assert.match(out.reason, /Run pnpm verify:fast yourself and report its result.*fast-forwarded \(git pull --ff-only\)/, why);
    assert.deepEqual(marks(), [], `${why}: a hook ran`);
  };
  const cfg = (k, v) => git('-C', work, 'config', k, v);
  const uncfg = (k) => git('-C', work, 'config', '--unset', k);
  const hidden = (why) => assert.equal(git('-C', work, 'status', '--porcelain'), '', `${why}: the setting hides nothing, so the case proves nothing`);
  const ahead = (branch) => {
    if (branch) git('-C', work, 'checkout', '-q', '-B', branch);
    change();
    git('-C', work, 'add', '-A');
    commit('ahead');
  };
  const moved = () => git('-C', work, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  const back = () => git('-C', work, 'update-ref', 'refs/remotes/origin/main', BASE);
  const pin = (write) => {
    mkdirSync(dirname(pinOf()), { recursive: true });
    write(pinOf());
  };
  const monitor = join(T, 'monitor.sh'); // inert: it answers that nothing changed
  writeFileSync(monitor, '#!/bin/sh\nprintf \'tok\\0\'\n', { mode: 0o755 });
  const cases = [
    ['a changed tracked file', change],
    ['a staged change', () => { change(); git('-C', work, 'add', '-A'); }],
    ['a staged change a replace ref hides', () => {
      change();
      git('-C', work, 'add', '-A');
      const same = git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit-tree', '-m', 'the index', git('-C', work, 'write-tree'));
      git('-C', work, 'replace', BASE, same);
      hidden('replace');
    }, () => git('-C', work, 'replace', '-d', BASE)],
    ['a tracked file removed', () => rmSync(join(work, 'src/app.ts'))],
    ['an untracked file', () => put('notes.txt', 'x\n')],
    ['an untracked file a local setting hides', () => { cfg('status.showUntrackedFiles', 'no'); put('notes.txt', 'x\n'); hidden('showUntrackedFiles'); }, () => uncfg('status.showUntrackedFiles')],
    ['a commit ahead of origin/HEAD', () => ahead()],
    ['another branch with a commit', () => ahead('side')],
    ['nothing changed, behind origin/HEAD', () => { ahead('moved'); moved(); git('-C', work, 'checkout', '-q', 'main'); hidden('behind'); }, back],
    ['no origin/HEAD', () => git('-C', work, 'remote', 'set-head', 'origin', '-d'), () => git('-C', work, 'remote', 'set-head', 'origin', 'main')],
    ['a changed submodule a local setting ignores', () => {
      git('-C', work, 'checkout', '-q', '-B', 'moved');
      git('init', '-q', join(work, 'sub'));
      git('-C', join(work, 'sub'), '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'sub');
      git('-C', work, 'add', 'sub');
      commit('a submodule link');
      moved();
      cfg('diff.ignoreSubmodules', 'all');
      writeFileSync(join(work, 'sub/new'), 'x\n');
      hidden('ignoreSubmodules');
    }, () => { uncfg('diff.ignoreSubmodules'); back(); }],
    ['a tracked change a configured file monitor hides', () => {
      cfg('core.fsmonitor', monitor);
      git('-C', work, 'update-index', '--fsmonitor');
      git('-C', work, 'status', '--porcelain');
      change();
      hidden('fsmonitor');
    }, () => { uncfg('core.fsmonitor'); git('-C', work, 'update-index', '--no-fsmonitor'); }],
    ['an empty pin', () => pin((p) => writeFileSync(p, ''))],
    ['a pin that is a link to nothing', () => pin((p) => symlinkSync(join(T, 'nowhere'), p))],
  ];
  for (const [why, set, undo] of cases) {
    clean();
    unpin();
    try {
      set();
      blocked(why);
    } finally {
      undo?.();
    }
  }
  // What the hook's environment lacks, or a git that fails on the one command that reads the checkout.
  const bin = join(T, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'git'), '#!/bin/sh\nfor a; do [ "$a" = status ] && exit 1; done\nexec /usr/bin/git "$@"\n', { mode: 0o755 });
  const bare = join(T, 'bare'); // sh and grep, as the fallback needs, and no git
  mkdirSync(bare);
  symlinkSync('/bin/sh', join(bare, 'sh'));
  symlinkSync('/usr/bin/grep', join(bare, 'grep'));
  for (const [why, env] of [['no git', { PATH: bare }], ['git status failing', { PATH: `${bin}:/usr/bin:/bin` }], ['no HOME', { HOME: '' }], ['no project folder', { CLAUDE_PROJECT_DIR: '' }]]) {
    clean();
    unpin();
    blocked(why, env);
  }
});

test('a session with no pin cannot give itself one: no hook of its own writes it, and the harness asks before a file or a shell write', () => {
  clean();
  unpin();
  quiet('the turn that ends');
  for (const source of ['resume', 'compact']) start(SID, source);
  change();
  assert.equal(stopJson().decision, 'block', 'the turn that ended left the session a pass or a pin');
  for (const h of [...HOOKS, TRUST]) run(h, say('trust gates'));
  assert.ok(!existsSync(join(T, '.claude')), 'a hook of a session with no pin wrote one');
  for (const r of ['Edit(~/.claude/slipway/**)', 'Bash(*.claude/slipway*)', 'Bash(*base-guard*)']) assert.ok(SETTINGS.permissions.ask.includes(r), `no ask rule ${r}`);
});

test('a pinned session is untouched: with nothing changed at origin/HEAD its Stop hook still runs', () => {
  clean();
  assert.equal(run('stop-verify.sh').out, '');
  assert.deepEqual(marks(), ['stop-verify.sh']);
});

// #699, D-058: a session at its pinned base with nothing changed ends before the install check, the caches and the
// gate. The real Stop hook is committed and pinned (atBase, in the fixture), and its ci/verify.mjs counts each run.
test('at its pinned base with nothing changed, the Stop hook ends without running the gate', () => {
  atBase();
  put('.env', 'LOCAL=1\n'); // ignored, as build output is
  endsAtOnce('clean at base');
  assert.ok(!existsSync(join(work, '.git/stop-verify-ok')), 'the exit wrote a green result');
});

test('at its base, a session with no node_modules is not blocked', () => {
  atBase();
  rmSync(join(work, 'app/node_modules'), { recursive: true });
  assert.match(body().reason, /dependencies are not installed/, 'the case did not reach the install check');
  endsAtOnce('no node_modules');
});

test('at its base, a session with a cached red result is not blocked', () => {
  atBase();
  assert.equal(body().decision, 'block');
  assert.match(body().reason, /Cached from/, 'the case held no cached red result');
  endsAtOnce('a cached red result', 1);
});

test('a linked worktree at its pin takes the exit, a change in it runs the gate, and the main checkout beside it takes the exit', () => {
  atBase();
  const head = git('-C', work, 'rev-parse', 'HEAD');
  const tree = join(work, '.claude/worktrees/w');
  git('-C', work, 'worktree', 'add', '-q', '--detach', tree, head);
  try {
    mkdirSync(join(tree, 'app/node_modules'));
    pinTo(head, tree);
    endsAtOnce('a linked worktree');
    writeFileSync(join(tree, 'src/new.ts'), 'export {};\n');
    gated('a new file in the linked worktree');
    rmSync(join(tree, 'src/new.ts'));
    pinTo(head);
    endsAtOnce('the main checkout beside it', 1);
  } finally {
    git('-C', work, 'worktree', 'remove', '--force', tree);
  }
});

for (const [why, make] of [
  ['a commit past the base', () => { change(); git('-C', work, 'add', '-A'); commit('past the base'); }],
  ['an empty commit past the base', () => git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'empty')],
  ['a tracked change', change],
  ['a staged change the working file no longer shows', () => { change(); git('-C', work, 'add', 'src/app.ts'); put('src/app.ts', 'export {};\n'); }],
  ['an untracked file', () => put('src/new.ts', 'export {};\n')],
]) {
  test(`${why}: the gate runs and a red result blocks`, () => {
    atBase();
    make();
    gated(why);
  });
}

test('a folder git cannot read does not take the exit', () => {
  atBase();
  put('unread/new.ts', 'export {};\n');
  chmodSync(join(work, 'unread'), 0);
  try {
    const r = run('stop-verify.sh', '{}', SID, hookEnv);
    assert.notEqual(`${r.status} ${r.out}`, '0 ', 'an unreadable folder ended the turn quietly');
  } finally {
    chmodSync(join(work, 'unread'), 0o755);
  }
});

test('a warning from git status runs the gate', () => {
  atBase();
  const bin = join(T, 'warn-git');
  const real = spawnSync('/bin/sh', ['-c', 'command -v git'], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin' } }).stdout.trim();
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nfor a; do [ "$a" = status ] && echo 'warning: a path was skipped' >&2; done\nexec '${real}' "$@"\n`, { mode: 0o755 });
  assert.equal(stopJson(SID, { PATH: `${bin}:${hookEnv.PATH}` }).decision, 'block', 'a warning took the exit');
  assert.equal(verifyRuns(), 1, 'the gate did not run');
});

test('a pin that is missing, unreadable or malformed does not take the exit', () => {
  for (const [why, spoil] of [['missing', () => rmSync(pinOf())], ['unreadable', () => chmodSync(pinOf(), 0)], ['malformed', () => writeFileSync(pinOf(), 'zz\n')]]) {
    atBase();
    spoil();
    assert.match(stopJson(SID, hookEnv).reason ?? '', /no base is pinned for this session/, why);
    assert.equal(verifyRuns(), 0, `${why}: a hook ran`);
  }
});

test('known-bad: origin/HEAD moved onto a commit past the pin does not make that commit the base', () => {
  atBase();
  change();
  git('-C', work, 'add', '-A');
  commit('past the pin');
  git('-C', work, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  try {
    assert.equal(git('-C', work, 'rev-parse', 'origin/HEAD'), git('-C', work, 'rev-parse', 'HEAD'));
    gated('a moved origin/HEAD');
  } finally {
    git('-C', work, 'update-ref', 'refs/remotes/origin/main', BASE);
  }
});
