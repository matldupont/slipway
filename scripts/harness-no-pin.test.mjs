#!/usr/bin/env node
// A session with no pin (#262, D-034). The Stop hook cannot load the guard for it, so it blocks once a turn (#154,
// harness-base.test.mjs), but for one state: a usable session id, no pin at all, nothing changed, and HEAD the commit
// origin/HEAD names. Each condition broken blocks as before, a pinned session is untouched, and the session cannot
// give itself a pin. Fixture: harness-fixture.mjs. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { SETTINGS, HOOKS, TRUST, T, SID, work, git, put, marks, run, BASE, start, pinOf, unpin, clean, say, commit, quiet, change, stopJson } from './harness-fixture.mjs';

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
