#!/usr/bin/env node
// A skill folder that is a plugin is gate code (#373, D-039): Claude Code loads what a folder with a `.claude-plugin`
// entry holds without anyone invoking the skill, so the guard counts that folder whole, and leaves every other skill
// as #173 left it (harness-gate-files.test.mjs). Every file written here is inert text in the fixture's temp folder,
// made at run time: no manifest and no hooks module is committed. Fixture: harness-fixture.mjs. Internal: `pnpm meta`
// runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { HOOKS, STATE, SID, work, git, put, marks, reset, run, clean, commit, commitAll, unpin } from './harness-fixture.mjs';

const INERT = '{}\n';
// The Stop hook ran no working-tree script, and its block names the file.
const stopped = (p, why) => {
  const r = run('stop-verify.sh');
  assert.deepEqual(marks(), [], `${why}: the Stop hook ran`);
  const out = JSON.parse(r.out);
  assert.equal(out.decision, 'block', why);
  assert.ok(out.reason.includes(p), `${why}: the block does not name ${p}: ${out.reason}`);
};
const ran = (why) => {
  run('stop-verify.sh');
  assert.deepEqual(marks(), ['stop-verify.sh'], why);
};

test('a plugin manifest under a skills tree stops the hooks and is named: untracked and committed, at the root and below it, in any letter case', () => {
  const manifests = ['.claude/skills/x/.claude-plugin/plugin.json', 'apps/web/.claude/skills/x/.claude-plugin/plugin.json',
    '.claude/skills/x/.Claude-Plugin/plugin.json', '.CLAUDE/Skills/x/.claude-plugin/plugin.json', '.claude/skills/x/sub/.claude-plugin/plugin.json'];
  for (const [i, p] of manifests.entries()) {
    clean();
    put(p, INERT);
    stopped(p, `${p}, untracked`);
    for (const h of HOOKS.filter((x) => x !== 'stop-verify.sh')) run(h);
    assert.deepEqual(marks(), [], `${p}, untracked, let another hook run`);
    commitAll(`plugin-${i}`, 'a plugin manifest, committed');
    reset();
    stopped(p, `${p}, committed`);
  }
});

test('every file in a skill folder that holds a .claude-plugin entry stops the hooks; the same file in a folder without one does not', () => {
  const files = ['hooks/hooks.json', 'hooks/register.ts', 'SKILL.md', 'scripts/y.mjs'];
  for (const root of ['.claude/skills/x', 'apps/web/.claude/skills/x']) {
    for (const f of root.startsWith('apps/') ? files.slice(0, 1) : files) {
      // The entry is the base's: only the other file differs from the pin.
      clean();
      put(`${root}/.claude-plugin/plugin.json`, INERT);
      put(`${root}/${f}`, '# inert\n');
      commitAll('with-plugin', 'a plugin folder');
      const pinned = git('-C', work, 'rev-parse', 'HEAD');
      unpin();
      mkdirSync(join(STATE, SID), { recursive: true });
      writeFileSync(join(STATE, SID, 'base'), `${pinned}\n`);
      reset();
      ran(`${root}: a plugin folder that is the pin's stopped the Stop hook`);
      reset();
      put(`${root}/${f}`, '# inert, changed\n');
      stopped(`${root}/${f}`, `${root}/${f}, changed beside the pin's entry`);
      // The entry is gone from the checkout and its index, and was the base's: the folder still counts.
      rmSync(join(work, root, '.claude-plugin'), { recursive: true });
      git('-C', work, 'add', '-A');
      commit('the entry removed');
      put(`${root}/${f}`, '# inert, changed again\n');
      reset();
      stopped(`${root}/${f}`, `${root}/${f}, with the entry only in the pin`);
      git('-C', work, 'checkout', '-q', '-f', 'main');
      git('-C', work, 'branch', '-q', '-D', 'with-plugin');
      // The entry is only the checkout's, untracked, in the other letter case.
      clean();
      put(`${root}/.Claude-Plugin/plugin.json`, INERT);
      put(`${root}/${f}`, '# inert\n');
      stopped(`${root}/${f}`, `${root}/${f}, beside an untracked entry`);
      // No entry: a skill, as #173 left it. A plugin folder beside it changes nothing for it.
      clean();
      put(`${root}/${f}`, '# inert\n');
      ran(`${root}/${f}, in a folder with no .claude-plugin entry, stopped the Stop hook`);
      clean();
      put(`${root}/${f}`, '# inert\n');
      put(`${dirname(root)}/other/.claude-plugin/plugin.json`, INERT);
      const reason = JSON.parse(run('stop-verify.sh').out).reason;
      assert.ok(!reason.includes(`${root}/${f}`), `a plugin folder beside ${root} made ${f} a gate file: ${reason}`);
    }
  }
});

test('a .claude-plugin entry that is a link or a plain file counts as one: the guard never passes what it cannot read', () => {
  clean(); // an untracked link: git reports the link, never what it stands for
  put('tools/plugin/plugin.json', INERT);
  put('.claude/skills/x/SKILL.md', '# inert\n');
  symlinkSync('../../../tools/plugin', join(work, '.claude/skills/x/.claude-plugin'));
  stopped('.claude/skills/x/SKILL.md', 'SKILL.md beside an untracked link at .claude-plugin');
  clean(); // a plain file at the name
  put('.claude/skills/x/.claude-plugin', 'inert\n');
  put('.claude/skills/x/SKILL.md', '# inert\n');
  stopped('.claude/skills/x/SKILL.md', 'SKILL.md beside a plain file at .claude-plugin');
  // An entry whose only name git has to quote, the pin's and unchanged: the plain names beside it still count.
  for (const root of ['.claude/skills/x', 'apps/web/.claude/skills/x']) {
    clean();
    put(`${root}/.claude-plugin/\u00fc.json`, INERT);
    put(`${root}/hooks/hooks.json`, INERT);
    commitAll('quoted-entry', 'a plugin folder whose entry has a quoted name');
    const pinned = git('-C', work, 'rev-parse', 'HEAD');
    unpin();
    mkdirSync(join(STATE, SID), { recursive: true });
    writeFileSync(join(STATE, SID, 'base'), `${pinned}\n`);
    put(`${root}/hooks/hooks.json`, '{ "inert": 1 }\n');
    reset();
    stopped(`${root}/hooks/hooks.json`, `${root}/hooks/hooks.json beside a pinned entry with a quoted name`);
    git('-C', work, 'checkout', '-q', '-f', 'main');
    git('-C', work, 'branch', '-q', '-D', 'quoted-entry');
  }
  clean(); // a name that only looks like it is not an entry
  put('.claude/skills/x/.claude-plugin.md', '# inert\n');
  put('.claude/skills/x/claude-plugin/plugin.json', INERT);
  put('.claude/skills/x/SKILL.md', '# inert\n');
  ran('a lookalike of .claude-plugin made a skill folder a plugin');
});
