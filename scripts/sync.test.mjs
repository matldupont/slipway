#!/usr/bin/env node
// sync (F-01 steps 3–5). The plan: one row kind per case, the preflight refusals, the content resolver,
// and a run that leaves every byte of the project as it was. --apply: one case per Acceptance line of
// #17. --adopt: one case per Acceptance line of #18. Internal: `pnpm meta` runs it in slipway only.
//
// Every case builds real repositories in a temp dir: a small slipway (this checkout's sync code, a
// fixture map and fixture files) with a base commit and a target commit, and a project new-project
// created from the base. `source` is that local slipway, so nothing reaches a network.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, chmodSync, copyFileSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify, loadOwnership } from '../ci/checks/lib/ownership.mjs';
import { MANIFEST, readProjectFile, sha256 } from '../ci/checks/lib/manifest.mjs';
import { ownDecisions } from './adopt.mjs';
import { resolveBase, sourceClone } from './lib/base.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED = join(SRC, 'scripts', 'fixtures', 'sync-plan.txt');
const EXPECTED_SUMMARY = join(SRC, 'scripts', 'fixtures', 'sync-plan-summary.txt');
const EXPECTED_ADOPT_SUMMARY = join(SRC, 'scripts', 'fixtures', 'adopt-plan-summary.txt');
// The code a slipway needs to run new-project and sync. Its fixture map makes all of it internal, so the
// plan lists fixture files only and does not change when this code does.
const CODE = ['scripts/new-project.mjs', 'scripts/sync.mjs', 'scripts/adopt.mjs', 'scripts/lib', 'ci/checks/lib', 'ci/checks/meta/d1-drift.mjs'];

const root = mkdtempSync(join(tmpdir(), 'slipway-sync-'));
test.after(() => rmSync(root, { recursive: true, force: true }));
// A known identity, no personal git config, and the clone cache inside this run's temp dir.
Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'slipway test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'slipway test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
  TMPDIR: root,
});
delete process.env.CLAUDECODE; // --apply refuses under an agent; one case sets it back

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (dir, files) => {
  for (const [p, body] of Object.entries(files)) {
    if (body === null) rmSync(join(dir, p));
    else {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
  }
};
const commit = (dir, msg) => {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', msg);
  return git(dir, 'rev-parse', 'HEAD');
};
function copyCode(to) {
  const cp = (rel) => {
    const from = join(SRC, rel);
    if (lstatSync(from).isDirectory()) readdirSync(from).forEach((e) => cp(join(rel, e)));
    else {
      mkdirSync(dirname(join(to, rel)), { recursive: true });
      copyFileSync(from, join(to, rel));
    }
  };
  CODE.forEach(cp);
}

const MAP_YAML = `paths:
  - glob: dev/**
    class: internal
  - glob: scripts/**
    class: internal
  - glob: ci/checks/**
    class: internal
  - glob: process/**
    class: managed
  - glob: .gitattributes
    class: managed
  - glob: docs/**
    class: seeded
  - glob: README.md
    class: internal
  - glob: .gitignore
    class: seeded
  - glob: package.json
    class: merged
`;
const pkg = (scripts) => `${JSON.stringify({ name: 'create-slipway', version: '0.0.0-fixture', bin: { 'create-slipway': 'scripts/new-project.mjs' }, scripts }, null, 2)}\n`;

// slipway: A (base) → A0 (seeded and scripts only: the same managed blobs as A, so a tie) → A1 (adds one managed
// file, nothing else) → B (target).
const slip = join(root, 'slipway');
mkdirSync(slip);
git(slip, 'init', '-q', '-b', 'main');
copyCode(slip);
put(slip, {
  'dev/ownership.yaml': MAP_YAML,
  '.gitignore': 'node_modules/\n',
  '.gitattributes': '* text=auto eol=lf\n',
  'README.md': '# slipway\n',
  'package.json': pkg({ a: 'echo a', b: 'echo b', d: 'echo d', e: 'echo e', drop: 'echo drop', gone: 'node scripts/x.mjs' }),
  'process/replace.md': 'v1\n',
  'process/same.md': 'same\n',
  'process/merge.md': 'one\ntwo\n',
  'process/delete.md': 'delete me\n',
  'process/kept.md': 'kept\n',
  'process/ours.md': 'ours\n',
  'process/harness/settings.json': '{ "harness": 1 }\n',
  'process/dir': 'a file, then a folder\n',
  'docs/PRD.md': '# PRD v1\n',
  'docs/same.md': 'seeded, never changed\n',
});
const A = commit(slip, 'A');
put(slip, { 'docs/PRD.md': '# PRD v1.1\n', 'package.json': pkg({ a: 'echo a1', b: 'echo b', d: 'echo d', e: 'echo e', drop: 'echo drop', gone: 'node scripts/x.mjs' }) });
const A0 = commit(slip, 'A0: seeded and scripts only');
put(slip, { 'process/new.md': 'new\n' });
const A1 = commit(slip, 'A1: one managed file added');
put(slip, {
  'package.json': pkg({ a: 'echo a2', b: 'echo b2', c: 'echo c', d: 'echo d', e: 'echo e2', gone: 'node scripts/y.mjs' }),
  'process/replace.md': 'v2\n',
  'process/merge.md': 'one\ntwo, upstream\n',
  'process/delete.md': null,
  'process/kept.md': null,
  'process/clash.md': 'slipway clash\n',
  'process/harness/settings.json': '{ "harness": 2 }\n',
  'docs/PRD.md': '# PRD v2\n',
  'README.md': '# slipway\n\n<img src="dev/assets/logo-lockup.png">\n',
  'process/hooks/new.sh': '#!/bin/sh\necho new hook\n',
  'process/dir': null,
  'process/dir/index.md': 'now a folder\n',
});
chmodSync(join(slip, 'process/hooks/new.sh'), 0o755);
const B = commit(slip, 'B');

// The project, from A, then edited by its owner in every way the plan distinguishes.
git(slip, 'checkout', '-q', A);
const base = join(root, 'base-project');
const np = spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), base, '--no-github', '--no-harness'], {
  encoding: 'utf8',
  env: { ...process.env, SLIPWAY_SOURCE: slip },
});
assert.equal(np.status, 0, `new-project failed:\n${np.stdout}\n${np.stderr}`);
git(slip, 'checkout', '-q', 'main');
const baseManifest = JSON.parse(readFileSync(join(base, MANIFEST), 'utf8'));
assert.equal(baseManifest.slipway, A);
const projPkg = JSON.parse(readFileSync(join(base, 'package.json'), 'utf8'));
projPkg.scripts.b = 'echo mine';
projPkg.scripts.e = 'echo e2'; // already upstream's new value
put(base, {
  'package.json': `${JSON.stringify(projPkg, null, 2)}\n`,
  'process/merge.md': 'one\ntwo\nthree, ours\n',
  'process/kept.md': 'kept, edited\n',
  'process/ours.md': 'ours, edited\n',
  'process/clash.md': 'our own file\n',
  'docs/PRD.md': '# Our PRD\n',
  '.slipway/overrides.yaml': 'overrides:\n  - path: process/merge.md\n    reason: our third line\n  - path: process/kept.md\n    reason: we still use it\n  - path: process/ours.md\n    reason: our wording\n',
});
commit(base, 'owner edits');

let n = 0;
// A fresh clone of the edited project per case, on main.
function project(edit) {
  const dir = join(root, `project-${++n}`);
  git(root, 'clone', '-q', base, dir);
  if (edit) edit(dir);
  return dir;
}
const sync = (dir, ...args) =>
  spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync', ...args], { cwd: dir, encoding: 'utf8' });
const rows = (stdout) => Object.fromEntries([...stdout.matchAll(/^ {2}(\S.*?) {2,}(\S+(?: scripts\.\S+)?)$/gm)].map((m) => [m[2], m[1]]));
const normalise = (stdout) => stdout.replaceAll(slip, '<slipway>').replaceAll(A, '<A>').replaceAll(B, '<B>').replaceAll(B.slice(0, 12), '<B>');

// Every file under `dir`, .git included, with its bytes: what "nothing was written" means.
function treeHash(dir) {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const e of readdirSync(d).sort()) {
      const p = join(d, e);
      const st = lstatSync(p);
      h.update(`${p.slice(dir.length)}\0${st.mode}\0`);
      if (st.isDirectory()) walk(p);
      else h.update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest('hex');
}

test('the plan from base A to target B equals the checked-in plan, and writes nothing', () => {
  const dir = project();
  // A tracked file newer than the index: a plain `git status` would rewrite the index to refresh it.
  const later = new Date(Date.now() + 60_000);
  utimesSync(join(dir, 'process/same.md'), later, later);
  const before = treeHash(dir);
  const r = sync(dir, '--verbose');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(treeHash(dir), before, 'sync wrote to the project');
  assert.equal(git(dir, 'status', '--porcelain'), '');
  assert.equal(normalise(r.stdout), readFileSync(EXPECTED, 'utf8'));
});

test('the default plan is a summary: no per-path row for a bucket that needs nothing, each owner row with its next command, the base explained; --verbose is the checked-in list above', () => {
  const dir = project();
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(normalise(r.stdout), readFileSync(EXPECTED_SUMMARY, 'utf8'));
  assert.doesNotMatch(r.stdout, /process\/same\.md/);
});

// One case per row kind: which fixture path produces it, and why.
const KIND_CASES = [
  ['replace', 'process/replace.md', 'managed, pristine, changed upstream'],
  ['merge', 'process/merge.md', 'managed, overridden, changed upstream'],
  ['add', 'process/new.md', 'new upstream, absent in the project'],
  ['delete', 'process/delete.md', 'removed upstream, pristine'],
  ['keep (edited)', 'process/kept.md', 'removed upstream, edited under an override'],
  ['collision', 'process/clash.md', 'new upstream, the project has its own file there'],
  ['seeded: upstream changed', 'docs/PRD.md', 'seeded, slipway changed its copy'],
  ['merged: key updated', 'package.json scripts.a', 'the project still has the base value'],
  ['merged: key updated', 'package.json scripts.c', 'a key new upstream'],
  ['merged: key updated', 'package.json scripts.drop', 'a key removed upstream, still at its base value'],
  ['merged: key reported', 'package.json scripts.b', 'the project changed the value'],
  ['unchanged', 'process/same.md', 'managed, same on both sides'],
  ['unchanged', 'process/ours.md', 'managed, overridden, unchanged upstream: nothing to merge'],
  ['unchanged', 'docs/same.md', 'seeded, same on both sides'],
];
const planned = rows(sync(project(), '--verbose').stdout);
for (const [kind, path, why] of KIND_CASES) {
  test(`row ${kind}: ${path} — ${why}`, () => assert.equal(planned[path], kind));
}
test('a key that calls an internal path on both sides (changed upstream), an unchanged key, and one the project already has at the target value make no row', () => {
  assert.equal(planned['package.json scripts.gone'], undefined);
  assert.equal(planned['package.json scripts.e'], undefined);
  assert.equal(planned['package.json scripts.d'], undefined);
});

test('refuses a dirty tree, a detached HEAD, D1 red and a missing manifest — each by name, writing nothing', () => {
  const cases = [
    [(d) => put(d, { 'notes.txt': 'untracked\n' }), /the working tree is not clean \(1 path\(s\)\)[\s\S]*notes\.txt/],
    [(d) => git(d, 'checkout', '-q', '--detach'), /HEAD is detached/],
    [(d) => { put(d, { 'process/same.md': 'edited without an override\n' }); commit(d, 'drift'); }, /D1 is red[\s\S]*drift\/process\/same\.md/],
    [(d) => { rmSync(join(d, MANIFEST)); commit(d, 'no manifest'); }, /no \.slipway\/manifest\.json — run `sync --adopt`/],
    [(d) => {
      const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
      m.files['docs/x\n\nharness — installed'] = { class: 'seeded', sha256: '0'.repeat(64) };
      put(d, { [MANIFEST]: JSON.stringify(m) });
      commit(d, 'planted path');
    }, /"docs\/x\\u000a\\u000aharness — installed" holds a control character/],
  ];
  for (const [edit, why] of cases) {
    const dir = project(edit);
    const before = treeHash(dir);
    const status = git(dir, 'status', '--porcelain');
    for (const args of [[], ['--apply']]) {
      const r = sync(dir, ...args);
      assert.equal(r.status, 1, `${why} ${args}: exit ${r.status}\n${r.stdout}`);
      assert.match(r.stderr, why);
      assert.equal(r.stdout, '');
      assert.doesNotMatch(r.stderr, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/, `${why}: raw control character in the refusal`);
      assert.equal(treeHash(dir), before, `${args} wrote to the project`);
      assert.equal(git(dir, 'status', '--porcelain'), status);
    }
  }
});

test('with "slipway": null the base is found by blobs alone: the newest exact commit — A0, which shares A\'s managed blobs, never A1', () => {
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.slipway = null;
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    commit(d, 'no hint');
  });
  const r = sync(dir, '--verbose');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`base: {3}${A0} `));
  // The known limitation (F-01): the tie changes only advisory rows — here scripts.a, which A0 changed.
  const got = rows(r.stdout);
  assert.equal(got['package.json scripts.a'], 'merged: key reported');
  for (const [path, kind] of Object.entries(planned)) if (path !== 'package.json scripts.a') assert.equal(got[path], kind, path);
});

test('a manifest whose blobs match no commit exactly stops, naming the closest commit and its count', () => {
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.files['process/same.md'].blob = '0'.repeat(40);
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    commit(d, 'a blob from nowhere');
  });
  const total = Object.values(baseManifest.files).filter((f) => f.class === 'managed').length;
  const r = sync(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, new RegExp(`no slipway commit holds exactly the manifest's ${total} managed files; closest ${A.slice(0, 12)} \\(${total - 1} of ${total} managed files at their blob\\), then ${A0.slice(0, 12)} \\(${total - 1} of ${total} managed files at their blob\\)`));
});

test('a manifest recorded before slipway rewrote its history: names the closest commit, each differing file and the command, and the command re-points the project', () => {
  const old = 'the text before the rewrite\n';
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.files['process/same.md'].blob = execFileSync('git', ['hash-object', '--stdin'], { input: old, encoding: 'utf8' }).trim();
    m.files['process/ours.md'].blob = '0'.repeat(40); // the project's own edit: matches neither the record nor the commit
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    m.files['process/same.md'].sha256 = sha256(Buffer.from(old));
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    put(d, { 'process/same.md': old });
    commit(d, 'as adopted before the rewrite');
  });
  const before = treeHash(dir);
  const r = sync(dir);
  assert.equal(r.status, 1);
  assert.equal(treeHash(dir), before, 'sync wrote to the project');
  const [first] = r.stderr.split('\n');
  assert.match(first, /^sync: slipway's history was changed after this project recorded its version/);
  assert.doesNotMatch(first, /[0-9a-f]{40}|\b[A-Z]\d\b/, 'a blob id or check id in the first line');
  assert.match(r.stderr, new RegExp(`nearest one is ${A.slice(0, 12)}, which differs in:\\n {2}process/same\\.md\\n {2}process/ours\\.md`));
  const cmd = `git switch -c slipway/re-point && git rm -q ${MANIFEST} && git commit -qm "chore: drop the slipway record for a rewritten history" && sync --adopt --apply --base ${A} --revert process/same.md\n`;
  assert.ok(r.stderr.includes(cmd), r.stderr);
  assert.match(r.stderr, /You changed this file yourself[^\n]*\n {2}process\/ours\.md/);
  assert.doesNotMatch(cmd, /process\/ours\.md/, 'a file the project edited is restored silently');
  assert.match(r.stderr, /Nothing was written\.$/m);

  // The printed command works: the record is re-pointed and slipway's copy is back.
  git(dir, 'switch', '-c', 'slipway/re-point');
  git(dir, 'rm', '-q', MANIFEST);
  git(dir, 'commit', '-qm', 'drop the record');
  const a = adopt(dir, '--apply', '--base', A, '--revert', 'process/same.md');
  assert.equal(a.status, 0, a.stderr);
  assert.equal(bytes(dir, 'process/same.md').toString(), show(A, 'process/same.md').toString());
  assert.equal(manifestOf(dir).slipway, A);
});

test('resolveBase: closest-match mode ranks every commit and names the runner-up', () => {
  const gitDir = sourceClone(slip);
  const blobs = new Map([['process/replace.md', git(slip, 'rev-parse', `${A}:process/replace.md`)]]);
  const r = resolveBase(gitDir, blobs);
  assert.equal(r.exact, null);
  assert.equal(r.total, 1);
  assert.deepEqual(r.best, { sha: A0, matched: 1, extra: 8 });
  assert.deepEqual(r.runnerUp, { sha: A, matched: 1, extra: 8 });
});

test('from a packed install (no .git, no .gitignore) of B: the target is B by content, and .gitignore is compared with B\'s own', () => {
  const pkgDir = join(root, 'packed-b');
  mkdirSync(pkgDir);
  execFileSync('tar', ['-x', '-C', pkgDir], { input: execFileSync('git', ['-C', slip, 'archive', B]) });
  rmSync(join(pkgDir, '.gitignore'));
  const r = spawnSync(process.execPath, [join(pkgDir, 'scripts', 'new-project.mjs'), 'sync', '--verbose'], { cwd: project(), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`target: ${B}\n`));
  assert.equal(rows(r.stdout)['.gitignore'], 'unchanged');
  assert.doesNotMatch(r.stdout, /note:/);
});

test('the clone of slipway is gone when sync exits, and when it is interrupted', () => {
  const clones = (tmp) => readdirSync(tmp).filter((e) => e.startsWith('slipway-sync-'));
  const plain = mkdtempSync(join(root, 'tmp-'));
  const r = spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync'], { cwd: project(), encoding: 'utf8', env: { ...process.env, TMPDIR: plain } });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(clones(plain), []);
  const killed = mkdtempSync(join(root, 'tmp-'));
  const code = `const { sourceClone } = await import(${JSON.stringify(join(slip, 'scripts', 'lib', 'base.mjs'))}); sourceClone(${JSON.stringify(slip)}); process.kill(process.pid, 'SIGINT'); await new Promise((r) => setTimeout(r, 5000));`;
  const k = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env: { ...process.env, TMPDIR: killed } });
  assert.equal(k.status, 130, k.stderr);
  assert.deepEqual(clones(killed), []);
});

test('an empty source is a named refusal, not a stack trace', () => {
  const empty = join(root, 'empty-slipway');
  mkdirSync(empty);
  git(empty, 'init', '-q', '-b', 'main');
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.source = empty;
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    commit(d, 'an empty source');
  });
  const r = sync(dir);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /^sync: (cannot read slipway's history from|could not fetch slipway from) /);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
});

test('the bin dispatches sync and sync --adopt; --plan with --apply is refused; a sync source that reads as an option is refused', () => {
  assert.match(sync(root, '--help').stdout, /^usage: sync \[--plan \| --apply\]/);
  assert.match(sync(root, '--adopt', '--help').stdout, /^usage: sync --adopt /);
  assert.match(sync(project(), '--plan', '--apply').stderr, /--plan and --apply: choose one/);
  assert.throws(() => sourceClone('--upload-pack=touch x'), /reads as a git option/);
  // A transport prefix would carry a token past the redaction into the header and the manifest.
  assert.throws(() => sourceClone('https::https://u:TOKEN@example.invalid/r.git'), (e) => /names a git transport helper/.test(e.message) && !e.message.includes('TOKEN'));
  // git's own failure message quotes the URL; the error does not carry the token.
  // git drops userinfo from its own messages itself, but keeps a query: that part is sync's to redact.
  assert.throws(() => sourceClone('https://u:TOKEN@unreachable.invalid/r.git?token=SECRET'), (e) => /could not fetch slipway from https:\/\/unreachable\.invalid\/r\.git: /.test(e.message) && !/TOKEN|SECRET/.test(e.message));
});

// ---- --apply (F-01 step 4, #17): one case per Acceptance line

const short = (sha) => sha.slice(0, 12);
const BRANCH = `slipway/sync-${short(B)}`;
const show = (sha, p) => execFileSync('git', ['-C', slip, 'show', `${sha}:${p}`]);
const bytes = (dir, p) => readFileSync(join(dir, p));
const manifestOf = (dir) => JSON.parse(readFileSync(join(dir, MANIFEST), 'utf8'));
// Slipway B's managed files, by the fixture map: process/** and .gitattributes.
const managedAtB = git(slip, 'ls-tree', '-r', '--name-only', B).split('\n').filter((p) => p.startsWith('process/') || p === '.gitattributes');

test('apply, pristine project: every managed file equals the target, the manifest records B, one commit on slipway/sync-<B>, main unchanged', () => {
  const dir = project((d) => git(d, 'reset', '-q', '--hard', 'HEAD~1')); // before the owner's edits
  const main = git(dir, 'rev-parse', 'main');
  const mainTree = git(dir, 'rev-parse', 'main^{tree}');
  const r = sync(dir, '--apply');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(git(dir, 'symbolic-ref', '--short', 'HEAD'), BRANCH);
  assert.equal(git(dir, 'rev-parse', 'main'), main);
  assert.equal(git(dir, 'rev-parse', 'main^{tree}'), mainTree);
  assert.equal(git(dir, 'rev-parse', 'HEAD~1'), main);
  assert.equal(git(dir, 'status', '--porcelain'), '');
  const m = manifestOf(dir);
  assert.equal(m.slipway, B);
  for (const p of managedAtB) {
    assert.deepEqual(bytes(dir, p), show(B, p), p);
    assert.equal(m.files[p].blob, git(slip, 'rev-parse', `${B}:${p}`), p);
  }
  const managed = Object.entries(m.files).filter(([, f]) => f.class === 'managed').map(([p]) => p);
  assert.deepEqual(managed.sort(), [...managedAtB].sort());
  assert.equal(readProjectFile(dir, 'process/delete.md'), null);
  // A file slipway ships executable arrives executable: a hook it adds must run.
  assert.ok(statSync(join(dir, 'process/hooks/new.sh')).mode & 0o100, 'process/hooks/new.sh lost its executable bit');
  assert.match(git(dir, 'ls-tree', 'HEAD', 'process/hooks/new.sh'), /^100755 /);
  assert.deepEqual(JSON.parse(bytes(dir, 'package.json')).scripts, { a: 'echo a2', b: 'echo b2', c: 'echo c', d: 'echo d', e: 'echo e2' });
  // --no-harness: nothing installed, so nothing to update, and the owner is told how.
  assert.equal(readProjectFile(dir, '.claude/settings.json'), null);
  assert.match(r.stdout, /\.claude\/settings\.json is not installed, so it was left out/);
  // The rewritten manifest resolves: the next sync finds B as its base and has nothing to do.
  const again = sync(dir, '--verbose');
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, new RegExp(`base: {3}${B} `));
  assert.deepEqual(new Set(Object.values(rows(again.stdout))), new Set(['unchanged']));
  const noop = sync(dir, '--apply');
  assert.equal(noop.status, 0, noop.stderr);
  assert.match(noop.stdout, /Already at .* nothing to apply, nothing written/);
  assert.equal(git(dir, 'symbolic-ref', '--short', 'HEAD'), BRANCH);
});

// The owner-edited project, applied once; each case below reads its result.
const edited = project();
const editedMain = git(edited, 'rev-parse', 'main');
const kept = ['docs/PRD.md', 'process/kept.md', 'process/clash.md', '.slipway/overrides.yaml'].map((p) => [p, bytes(edited, p)]);
const ourMerge = bytes(edited, 'process/merge.md').toString('utf8');
const manifestBefore = manifestOf(edited);
const applied = sync(edited, '--apply', '--verbose');

test('apply, edited project: exits 1 — rows need the owner — with main unchanged and the tree clean', () => {
  assert.equal(applied.status, 1, applied.stdout + applied.stderr);
  assert.match(applied.stdout, /Sync exits 1/);
  assert.equal(git(edited, 'rev-parse', 'main'), editedMain);
  assert.equal(git(edited, 'symbolic-ref', '--short', 'HEAD'), BRANCH);
  assert.equal(git(edited, 'status', '--porcelain'), '');
});

test('apply: seeded, collision and keep (edited) files are byte-identical; overrides.yaml too', () => {
  for (const [p, before] of kept) assert.deepEqual(bytes(edited, p), before, p);
});

test('apply: a seeded file slipway changed gets slipway\'s base → target diff in .slipway/upstream/<path>.diff', () => {
  const diff = join(edited, '.slipway/upstream/docs/PRD.md.diff');
  const at = mkdtempSync(join(root, 'patch-'));
  put(at, { 'docs/PRD.md': show(A, 'docs/PRD.md') });
  execFileSync('git', ['apply', diff], { cwd: at });
  assert.deepEqual(bytes(at, 'docs/PRD.md'), show(B, 'docs/PRD.md'));
  assert.match(applied.stdout, /seeded: upstream changed — [^\n]*\n {2}\.slipway\/upstream\/docs\/PRD\.md\.diff\n/);
});

test('README.md is slipway\'s own: a change to it is no row and no .slipway/upstream diff, and the real map classes it internal', () => {
  const r = sync(project());
  assert.equal(rows(r.stdout)['README.md'], undefined, r.stdout);
  assert.doesNotMatch(r.stdout, /README\.md/);
  const dir = project();
  sync(dir, '--apply');
  assert.equal(existsSync(join(dir, '.slipway/upstream/README.md.diff')), false);
  assert.equal(classify(loadOwnership(SRC), 'README.md'), 'internal');
});

test('apply: an overridden file that conflicts holds markers with both sides and every line of the project\'s version', () => {
  const merged = bytes(edited, 'process/merge.md').toString('utf8');
  assert.match(merged, /^<{7} project\n[\s\S]*^={7}\n[\s\S]*^>{7} slipway\n/m);
  assert.ok(merged.includes('two, upstream\n'), 'slipway\'s side');
  const lines = merged.split('\n');
  for (const l of ourMerge.split('\n')) assert.ok(lines.includes(l), `lost: ${l}`);
  assert.match(applied.stdout, /merge — conflict markers[^\n]*\n {2}process\/merge\.md \(1 conflict\)/);
  // It keeps its old hash, so D1 still sees it as the override it is; its blob is the target's, so the base resolves.
  const f = manifestOf(edited).files['process/merge.md'];
  assert.equal(f.sha256, manifestBefore.files['process/merge.md'].sha256);
  assert.equal(f.blob, git(slip, 'rev-parse', `${B}:process/merge.md`));
});

test('apply: a file removed upstream that the project edited is kept, reported as keep (edited), and its override is named, not edited', () => {
  assert.equal(rows(applied.stdout)['process/kept.md'], 'keep (edited)');
  assert.match(applied.stdout, /keep \(edited\) — slipway removed it[^\n]*\n {2}process\/kept\.md\n/);
  assert.match(applied.stdout, /stale override — [^\n]*\n {2}\.slipway\/overrides\.yaml:4 {2}path: process\/kept\.md\n/);
  assert.equal(manifestOf(edited).files['process/kept.md'], undefined);
});

test('apply: a new upstream file at a path the project has is reported as collision and recorded at slipway\'s hash, so D1 flags it', () => {
  assert.equal(rows(applied.stdout)['process/clash.md'], 'collision');
  assert.match(applied.stdout, /collision — [^\n]*\n {2}process\/clash\.md\n/);
  assert.equal(manifestOf(edited).files['process/clash.md'].blob, git(slip, 'rev-parse', `${B}:process/clash.md`));
});

test('apply: the manifest and the file changes land in one commit', () => {
  assert.equal(git(edited, 'rev-list', '--count', `main..${BRANCH}`), '1');
  const stat = git(edited, 'show', '--stat=200', '--format=%s', 'HEAD');
  assert.match(stat, new RegExp(`^chore: sync slipway ${short(A)}\\.\\.${short(B)}\n`));
  for (const p of [MANIFEST, 'process/replace.md', 'process/merge.md', 'process/delete.md', 'process/new.md', 'package.json', '.slipway/upstream/docs/PRD.md.diff']) {
    assert.ok(stat.includes(` ${p} `), `${p} is not in the commit:\n${stat}`);
  }
});

test('apply: the harness — an installed copy is updated because the owner ran sync; an edited one is left and exits 1', () => {
  const installed = (body) => project((d) => { put(d, { '.claude/settings.json': body }); commit(d, 'install the harness'); });
  const dir = installed(show(A, 'process/harness/settings.json'));
  const r = sync(dir, '--apply');
  assert.deepEqual(bytes(dir, 'process/harness/settings.json'), show(B, 'process/harness/settings.json'));
  assert.deepEqual(bytes(dir, '.claude/settings.json'), show(B, 'process/harness/settings.json'));
  assert.match(r.stdout, /you installed it as \.claude\/settings\.json by running sync --apply\. The owner runs this step; an agent must not/);
  assert.match(git(dir, 'show', '--stat=200', '--format=', 'HEAD'), /^\s*\.claude\/settings\.json\s+\|/m);

  const mine = installed('{ "mine": true }\n');
  const e = sync(mine, '--apply');
  assert.equal(e.status, 1);
  assert.deepEqual(bytes(mine, '.claude/settings.json'), Buffer.from('{ "mine": true }\n'));
  assert.match(e.stdout, /\.claude\/settings\.json was edited, so it was left as it is/);
});

test('apply refuses an existing sync branch before writing anything', () => {
  const dir = project((d) => git(d, 'branch', BRANCH));
  const before = treeHash(dir);
  const r = sync(dir, '--apply');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /branch slipway\/sync-\S+ already exists/);
  assert.equal(treeHash(dir), before);
});

// One owner row per project, each alone: sync exits 1 on it, and 0 when nothing needs the owner.
const pristine = (edit) => project((d) => {
  git(d, 'reset', '-q', '--hard', 'HEAD~1');
  edit(d);
  commit(d, 'one owner row');
});
const override = (p) => `overrides:\n  - path: ${p}\n    reason: ours\n`;
for (const [why, edit, code] of [
  ['a merge that conflicts', (d) => put(d, { 'process/merge.md': 'one\ntwo, ours\n', '.slipway/overrides.yaml': override('process/merge.md') }), 1],
  ['a collision', (d) => put(d, { 'process/clash.md': 'ours\n' }), 1],
  ['keep (edited)', (d) => put(d, { 'process/kept.md': 'kept, ours\n', '.slipway/overrides.yaml': override('process/kept.md') }), 1],
  ['keep (edited) alone (deleted here under an override, changed upstream)', (d) => put(d, { 'process/replace.md': null, '.slipway/overrides.yaml': override('process/replace.md') }), 1],
  ['a key reported', (d) => put(d, { 'package.json': bytes(d, 'package.json').toString('utf8').replace('"echo b"', '"echo mine"') }), 1],
  ['an override made stale (the file deleted here, and upstream)', (d) => put(d, { 'process/kept.md': null, '.slipway/overrides.yaml': override('process/kept.md') }), 1],
  ['an edited harness copy', (d) => put(d, { '.claude/settings.json': '{ "mine": true }\n' }), 1],
  ['an installed harness copy, and nothing else', (d) => put(d, { '.claude/settings.json': show(A, 'process/harness/settings.json') }), 0],
]) {
  test(`apply exits ${code} on ${why}`, () => {
    const r = sync(pristine(edit), '--apply');
    assert.equal(r.status, code, r.stdout + r.stderr);
  });
}

test('apply never writes through a symlink: a diff path or the manifest that is one is refused, and the file it points to is intact', () => {
  for (const at of ['.slipway/upstream/docs/PRD.md.diff', MANIFEST]) {
    const outside = join(mkdtempSync(join(root, 'outside-')), 'precious.txt');
    const dir = project((d) => {
      if (at === MANIFEST) writeFileSync(outside, readFileSync(join(d, MANIFEST)));
      else writeFileSync(outside, 'precious\n');
      rmSync(join(d, at), { force: true });
      mkdirSync(dirname(join(d, at)), { recursive: true });
      symlinkSync(outside, join(d, at));
      commit(d, `a symlink at ${at}`);
    });
    const before = [treeHash(dir), readFileSync(outside)];
    const r = sync(dir, '--apply');
    assert.equal(r.status, 1, `${at}: ${r.stdout}`);
    assert.match(r.stderr, new RegExp(`symlinks or directories[\\s\\S]*${at.replaceAll('.', '\\.')}`));
    assert.deepEqual([treeHash(dir), readFileSync(outside)], before);
  }
});

test('apply refuses before branching when a file of the project sits where it must write a folder', () => {
  const cases = [
    ['.slipway/upstream', (d) => put(d, { '.slipway/upstream': 'mine\n' })],
    ['process/dir', (d) => { git(d, 'reset', '-q', '--hard', 'HEAD~1'); put(d, { 'process/dir': 'ours\n', '.slipway/overrides.yaml': override('process/dir') }); }],
  ];
  for (const [at, edit] of cases) {
    const dir = project((d) => { edit(d); commit(d, `a file at ${at}`); });
    const before = treeHash(dir);
    const r = sync(dir, '--apply');
    assert.equal(r.status, 1, `${at}: ${r.stdout}`);
    assert.match(r.stderr, new RegExp(`each is a file of yours[\\s\\S]*\n  ${at.replaceAll('.', '\\.')}\n`));
    assert.equal(treeHash(dir), before);
  }
});

test('apply refuses a write the project ignores before branching, naming it', () => {
  const dir = project((d) => { put(d, { '.gitignore': 'node_modules/\n.slipway/upstream/\n' }); commit(d, 'ignore upstream diffs'); });
  const before = treeHash(dir);
  const r = sync(dir, '--apply');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /the project ignores paths sync would write[\s\S]*\.slipway\/upstream\/docs\/PRD\.md\.diff/);
  assert.equal(treeHash(dir), before);
});

test('apply refuses under an agent (CLAUDECODE set), writing nothing; the harness asks before either form of the command', () => {
  const dir = project();
  const before = treeHash(dir);
  const r = spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync', '--apply'], { cwd: dir, encoding: 'utf8', env: { ...process.env, CLAUDECODE: '1' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /the owner runs it in their own terminal, not an agent \(CLAUDECODE is set\)/);
  assert.equal(treeHash(dir), before);
  // Claude Code's Bash rules: `*` matches anything, `:*` a trailing prefix.
  const asks = JSON.parse(readFileSync(join(SRC, 'process/harness/settings.json'), 'utf8')).permissions.ask
    .filter((a) => a.startsWith('Bash('))
    .map((a) => new RegExp(`^${a.slice(5, -1).replace(/:\*$/, '*').replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`));
  for (const cmd of ['npx github:matldupont/slipway#main sync --apply', 'node scripts/new-project.mjs sync --apply', 'node ../slipway/scripts/new-project.mjs sync --apply', 'npx github:matldupont/slipway#main sync --adopt --apply --base abc', 'node ../slipway/scripts/new-project.mjs sync --apply --adopt']) {
    assert.ok(asks.some((re) => re.test(cmd)), `no ask rule matches: ${cmd}`);
  }
});

test('apply only moves forward: a target older than the base is refused', () => {
  const dir = project((d) => git(d, 'reset', '-q', '--hard', 'HEAD~1'));
  assert.equal(sync(dir, '--apply').status, 0); // now at B
  const older = join(root, 'packed-a');
  mkdirSync(older);
  execFileSync('tar', ['-x', '-C', older], { input: execFileSync('git', ['-C', slip, 'archive', A]) });
  git(dir, 'switch', '-q', 'main');
  git(dir, 'merge', '-q', '--ff-only', BRANCH);
  git(dir, 'branch', '-q', '-D', BRANCH);
  const before = treeHash(dir);
  const r = spawnSync(process.execPath, [join(older, 'scripts', 'new-project.mjs'), 'sync', '--apply'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /is not newer than the base .* sync only moves forward/);
  assert.equal(treeHash(dir), before);
});

// ---- --adopt (F-01 step 5, #18): one case per Acceptance line

const adopt = (dir, ...args) =>
  spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync', '--adopt', ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, SLIPWAY_SOURCE: slip } });
// The edited project with its .slipway/ gone: what a project created before the manifest looks like.
// Its first commit is new-project's `chore: start from slipway <A>`.
const unadopted = (edit) => project((d) => {
  rmSync(join(d, '.slipway'), { recursive: true });
  if (edit) edit(d);
  commit(d, 'before the manifest');
});
const DIFFERS = ['process/kept.md', 'process/merge.md', 'process/ours.md'];

test('adopt, sha in the first commit: that sha is the base, every file is listed as pristine or differing, and the tree hash is unchanged', () => {
  const dir = unadopted();
  const before = treeHash(dir);
  const r = adopt(dir, '--verbose');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`base: {3}${A} \\(from the first commit\\)`));
  const got = rows(r.stdout);
  for (const p of git(slip, 'ls-tree', '-r', '--name-only', A).split('\n').filter((p) => p.startsWith('process/') || p === '.gitattributes')) {
    assert.equal(got[p], DIFFERS.includes(p) ? 'differs' : 'pristine', p);
  }
  for (const p of ['docs/PRD.md', 'docs/same.md', '.gitignore']) assert.equal(got[p], 'seeded', p);
  assert.equal(got['package.json'], 'merged');
  assert.equal(got['process/clash.md'], undefined, 'a file the base does not ship is the project\'s own');
  assert.equal(treeHash(dir), before, 'adopt wrote to the project');
  assert.equal(git(dir, 'status', '--porcelain'), '');
});

test('the default adopt plan is a summary: a count line per bucket, each differing path and project ID with its next command, the base explained', () => {
  const dir = unadopted((d) => put(d, { 'decisions.md': '# Decisions\n\n## D-099 — ours *(decided)*\n' }));
  const before = treeHash(dir);
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(normalise(r.stdout), readFileSync(EXPECTED_ADOPT_SUMMARY, 'utf8'));
  assert.doesNotMatch(r.stdout, /^ {2}pristine {2,}\S/m, 'a pristine row is printed');
  assert.equal(treeHash(dir), before, 'adopt wrote to the project');
});

test('a default adopt plan with nothing to decide says so in one line and prints the --apply command', () => {
  const dir = unadopted((d) => put(d, { 'process/kept.md': 'kept\n', 'process/merge.md': 'one\ntwo\n', 'process/ours.md': 'ours\n' }));
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Nothing needs a decision\.$/m);
  assert.match(r.stdout, new RegExp(`Plan only — nothing was written\\. Write it with: sync --adopt --apply --base ${A}\n$`));
  assert.doesNotMatch(r.stdout, /Needs you/);
});

// A project new-project made from a packed A: the first commit and README name a version, not a sha.
const versioned = join(root, 'versioned');
{
  const pkgDir = join(root, 'packed-a-adopt');
  mkdirSync(pkgDir);
  execFileSync('tar', ['-x', '-C', pkgDir], { input: execFileSync('git', ['-C', slip, 'archive', A]) });
  const r = spawnSync(process.execPath, [join(pkgDir, 'scripts', 'new-project.mjs'), versioned, '--no-github', '--no-harness'], { encoding: 'utf8', env: { ...process.env, SLIPWAY_SOURCE: slip } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  rmSync(join(versioned, '.slipway'), { recursive: true });
  commit(versioned, 'before the manifest');
}

test('adopt, a version in the first commit: proposes the closest commit with the runner-up\'s count, and writes nothing until --base confirms it', () => {
  assert.equal(git(versioned, 'log', '--format=%s', '--reverse').split('\n')[0], 'chore: start from slipway 0.0.0-fixture');
  const before = treeHash(versioned);
  for (const args of [[], ['--apply']]) {
    const r = adopt(versioned, ...args);
    assert.equal(r.status, 1, r.stdout);
    // A and A0 hold the same managed blobs; the walk is newest first, so A0 leads and A is the runner-up.
    const n = git(slip, 'ls-tree', '-r', '--name-only', A).split('\n').filter((p) => p.startsWith('process/') || p === '.gitattributes').length;
    assert.match(r.stderr, new RegExp(`no slipway sha in the first commit or README \\(chore: start from slipway 0\\.0\\.0-fixture\\)\\. Closest commit on \\S+'s main:\\n  ${A0} — ${n} managed file\\(s\\)[^\\n]*\\n[^\\n]*\\n  runner-up: ${A} — ${n} managed file\\(s\\)`));
    assert.match(r.stderr, new RegExp(`Confirm it \\(or name another\\) with: sync --adopt --base ${A0} — nothing was written`));
    assert.equal(treeHash(versioned), before);
  }
  const r = adopt(versioned, '--base', A.slice(0, 10));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`base: {3}${A} \\(from --base\\)`));
  assert.equal(treeHash(versioned), before);
});

test('adopt with no resolvable base and no --base exits non-zero and asks for --base <sha>, writing nothing', () => {
  // Nothing in common with slipway, and a version in the first commit.
  const lone = join(root, 'lone');
  mkdirSync(lone);
  git(lone, 'init', '-q', '-b', 'main');
  put(lone, { 'README.md': '# not from slipway\n' });
  commit(lone, 'chore: start from slipway 0.0.0-fixture');
  // A README naming a sha the source does not have (a fork's), on a history whose first commit names a version.
  const forked = unadopted((d) => put(d, { 'README.md': `Built on [slipway](SLIPWAY.md) ${'f'.repeat(40)}.\n` }));
  git(forked, 'checkout', '-q', '--orphan', 'fresh');
  commit(forked, 'chore: start from slipway 0.0.0-fixture');
  for (const [dir, args, why] of [
    [lone, [], /no commit on \S+'s main shares a managed file with this project — pass --base <sha>/],
    [forked, [], /README\.md names slipway f{40}, which \S+ does not have \(a fork, or never pushed\) — pass --base <sha>/],
    [forked, ['--base', 'e'.repeat(40)], /--base names slipway e{40}, which \S+ does not have/],
    [forked, ['--base', 'HEAD'], /--base "HEAD" is not a commit sha — pass --base <sha>/],
  ]) {
    const before = treeHash(dir);
    const r = adopt(dir, ...args);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr, why);
    assert.equal(treeHash(dir), before);
  }
});

test('adopt refuses a project that has a manifest, and --apply under an agent, writing nothing', () => {
  const has = project();
  assert.match(adopt(has).stderr, /\.slipway\/manifest\.json exists already — this project has adopted sync; run `sync`/);
  const dir = unadopted();
  const before = treeHash(dir);
  const r = spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync', '--adopt', '--apply', '--revert', 'process/kept.md'], { cwd: dir, encoding: 'utf8', env: { ...process.env, SLIPWAY_SOURCE: slip, CLAUDECODE: '1' } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /the owner runs it in their own terminal, not an agent \(CLAUDECODE is set\)/);
  assert.equal(treeHash(dir), before);
});

test('adopt --apply refuses until every differing managed file is kept or reverted, and refuses a choice for a file that needs none', () => {
  const dir = unadopted();
  const before = treeHash(dir);
  const cases = [
    [[], /needs --keep <path>=<reason> or --revert <path>, and \.slipway\/overrides\.yaml may list only those it keeps — nothing was written:\n {2}differs {5}process\/kept\.md\n {2}differs {5}process\/merge\.md\n {2}differs {5}process\/ours\.md$/m],
    [['--keep', 'process/same.md=ours', '--revert', 'process/kept.md'], /process\/same\.md already matches the base/],
    [['--keep', 'docs/PRD.md=ours'], /docs\/PRD\.md is not a managed file the base ships/],
    [['--keep', 'process/ours.md='], /give the reason after "="/],
    [['--keep', 'process/ours.md=x', '--revert', 'process/ours.md'], /--keep or --revert, not both/],
    [['--keep', 'process/ours.md=ours # and more', '--keep', 'process/merge.md=m', '--revert', 'process/kept.md'], /cannot be written as one plain line/],
  ];
  for (const [args, why] of cases) {
    const r = adopt(dir, '--apply', ...args);
    assert.equal(r.status, 1, `${why}\n${r.stdout}`);
    assert.match(r.stderr, why);
    assert.equal(treeHash(dir), before, `${args} wrote to the project`);
  }
});

test('adopt --apply writes the manifest and an override per kept file, reverts in the same commit on slipway/adopt-<base>; D1 is green, and sync then finds the base exactly', () => {
  const dir = unadopted();
  const mainBefore = git(dir, 'rev-parse', 'main');
  const ours = bytes(dir, 'process/kept.md');
  const r = adopt(dir, '--apply', '--keep', 'process/merge.md=our third line', '--keep', 'process/ours.md=our wording', '--revert', 'process/kept.md');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(dir, 'branch', '--show-current'), `slipway/adopt-${short(A)}`);
  assert.equal(git(dir, 'rev-parse', 'main'), mainBefore);
  assert.equal(git(dir, 'rev-list', '--count', 'main..HEAD'), '1');
  assert.equal(git(dir, 'log', '-1', '--format=%s'), `chore: adopt slipway sync at ${short(A)}`);
  assert.deepEqual(git(dir, 'diff', '--name-only', 'main', 'HEAD').split('\n').sort(), ['.slipway/manifest.json', '.slipway/overrides.yaml', 'process/kept.md']);
  assert.equal(git(dir, 'status', '--porcelain'), '');
  // The project's version stays in history; the working tree has the base's.
  assert.deepEqual(execFileSync('git', ['-C', dir, 'show', 'main:process/kept.md']), ours);
  assert.deepEqual(bytes(dir, 'process/kept.md'), show(A, 'process/kept.md'));
  assert.equal(bytes(dir, '.slipway/overrides.yaml').toString('utf8'), 'overrides:\n  - path: process/merge.md\n    reason: our third line\n  - path: process/ours.md\n    reason: our wording\n');
  const m = manifestOf(dir);
  assert.equal(m.slipway, A);
  assert.equal(m.version, '0.0.0-fixture');
  for (const [p, f] of Object.entries(m.files)) if (f.class === 'managed') assert.equal(f.blob, git(slip, 'rev-parse', `${A}:${p}`), p);
  assert.equal(m.files['docs/PRD.md'].blob, git(dir, 'rev-parse', 'HEAD:docs/PRD.md'), 'a seeded file is recorded as the project has it');
  const d1 = spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/d1-drift.mjs'), dir], { encoding: 'utf8' });
  assert.equal(d1.status, 0, d1.stdout);
  const plan = sync(dir, '--verbose');
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, new RegExp(`base: {3}${A} `));
  assert.equal(rows(plan.stdout)['process/merge.md'], 'merge');
});

test('adopt lists the project\'s own lessons and decisions, still on L-/D-, for /sync-slipway to move', () => {
  const dir = unadopted((d) => put(d, {
    'process/lessons/L-99-ours.md': '---\nid: L-99\nrule: ours\nenforcement:\n  status: check\n  pointer: d1\n---\n',
    'process/lessons/PL-1-moved.md': '---\nid: PL-1\nrule: already moved\nenforcement:\n  status: check\n  pointer: d1\n---\n',
    'decisions.md': '# Decisions\n\n## D-099 — ours *(decided)*\n\n## PD-1 — moved *(decided)*\n',
  }));
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /The project's own IDs, for \/sync-slipway to move to PL-\/PD- [^\n]*\n {2}L-99 {2}process\/lessons\/L-99-ours\.md\n {2}D-099 {2}decisions\.md\n\n/);
});

test('resolveBase: a commit older than the ownership map is classified by the fallback map, so it can be exact', () => {
  const old = join(root, 'premap');
  mkdirSync(old);
  git(old, 'init', '-q', '-b', 'main');
  put(old, { 'process/a.md': 'a\n', 'docs/PRD.md': '# PRD\n' });
  const P = commit(old, 'before the map');
  const rules = [{ glob: 'process/**', class: 'managed', re: /^process\/.*$/ }, { glob: 'docs/**', class: 'seeded', re: /^docs\/.*$/ }];
  const blobs = new Map([['process/a.md', git(old, 'rev-parse', `${P}:process/a.md`)]]);
  const gitDir = join(old, '.git');
  assert.equal(resolveBase(gitDir, blobs).exact, null);
  assert.equal(resolveBase(gitDir, blobs, { fallback: rules }).exact, P);
});

test('adopt: a short sha in the first commit (new-project before the manifest wrote `rev-parse --short`) is the base', () => {
  const dir = unadopted();
  git(dir, 'checkout', '-q', '--orphan', 'short');
  commit(dir, `chore: start from slipway ${A.slice(0, 7)}`);
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`base: {3}${A} \\(from the first commit\\)`));
});

test('adopt: a differing file overrides.yaml already lists with a reason is kept; an override D1 would call stale stops --apply', () => {
  const listed = unadopted((d) => put(d, { '.slipway/overrides.yaml': 'overrides:\n  - path: process/merge.md\n    reason: our third line\n' }));
  const plan = adopt(listed, '--verbose');
  assert.equal(rows(plan.stdout)['process/merge.md'], 'differs → keep (.slipway/overrides.yaml)');
  assert.match(adopt(listed, '--apply', '--keep', 'process/merge.md=again').stderr, /process\/merge\.md is kept already by its entry in \.slipway\/overrides\.yaml — drop the --keep/);
  const r = adopt(listed, '--apply', '--keep', 'process/ours.md=our wording', '--revert', 'process/kept.md');
  assert.equal(r.status, 0, r.stderr);
  const d1 = spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/d1-drift.mjs'), listed], { encoding: 'utf8' });
  assert.equal(d1.status, 0, d1.stdout);

  const stale = unadopted((d) => put(d, { '.slipway/overrides.yaml': 'overrides:\n  - path: process/same.md\n    reason: pristine, so stale\n' }));
  const before = treeHash(stale);
  const s = adopt(stale, '--apply', '--keep', 'process/merge.md=m', '--keep', 'process/ours.md=o', '--revert', 'process/kept.md');
  assert.equal(s.status, 1, s.stdout);
  assert.match(s.stderr, /\.slipway\/overrides\.yaml:2 {2}process\/same\.md — not a managed file that differs from the base; remove it/);
  assert.equal(treeHash(stale), before);
});

test('ownDecisions: a base ID is slipway\'s; a target ID only under the target\'s own title, whatever its status (a reused number is the project\'s)', () => {
  const base = '## D-001 — Protect main *(open)*\n';
  const target = `${base}## D-015 — Projects take slipway updates *(decided)*\n## D-016 — Something newer *(decided)*\n`;
  const mine = '## D-001 — `main` is protected *(decided)*\n## D-015 — API framework: Fastify *(decided)*\n## D-016 — Something newer *(decided 2026-10-01)*\n## D-099 — Ours *(open)*\n## PD-1 — Moved *(open)*\n';
  // D-016 was copied in by hand and then decided: its status changed, its title did not, so it stays slipway's.
  assert.deepEqual(ownDecisions(mine, base, target.replace('Something newer *(decided)*', 'Something newer *(open — week 1)*')), ['D-015', 'D-099']);
});

test('sync from a target the source does not have (an unpushed commit): the plan notes it and still prints; --apply refuses', () => {
  const ahead = join(root, 'slipway-ahead');
  git(root, 'clone', '-q', slip, ahead);
  put(ahead, { 'process/same.md': 'changed locally, never pushed\n' });
  commit(ahead, 'unpushed');
  const dir = project();
  const run = (...args) => spawnSync(process.execPath, [join(ahead, 'scripts', 'new-project.mjs'), 'sync', ...args], { cwd: dir, encoding: 'utf8' });
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /note: {3}slipway's commits base → target are not listed: \S+ is not in \S+ \(unpushed\?\)/);
  const a = run('--apply');
  assert.equal(a.status, 1);
  assert.match(a.stderr, /is not in \S+ — push it first; nothing was written/);
});

test('adopt, then sync, from a base older than the ownership map: classified by the target\'s map, D1 green, and sync finds that base exactly', () => {
  // A slipway whose first commit has no dev/ownership.yaml, then one that adds it.
  const old = join(root, 'slipway-premap');
  mkdirSync(old);
  git(old, 'init', '-q', '-b', 'main');
  copyCode(old);
  const files = {
    '.gitignore': 'node_modules/\n',
    'README.md': '# slipway\n',
    'package.json': pkg({ a: 'echo a' }),
    'process/one.md': 'one\n',
    'process/two.md': 'two\n',
    'docs/PRD.md': '# PRD\n',
  };
  put(old, files);
  const P0 = commit(old, 'before the map');
  put(old, { 'dev/ownership.yaml': MAP_YAML, 'process/one.md': 'one, upstream\n' });
  commit(old, 'the map');
  // A project copied from P0 by hand, as new-project did before the manifest: a version, no sha.
  const proj = join(root, 'premap-project');
  mkdirSync(proj);
  git(proj, 'init', '-q', '-b', 'main');
  put(proj, { ...files, 'README.md': '# Ours\n\nBuilt on [slipway](SLIPWAY.md) 0.0.0-fixture.\n', 'process/two.md': 'two, ours\n' });
  commit(proj, 'chore: start from slipway 0.0.0-fixture');
  const run = (...args) => spawnSync(process.execPath, [join(old, 'scripts', 'new-project.mjs'), 'sync', ...args], { cwd: proj, encoding: 'utf8', env: { ...process.env, SLIPWAY_SOURCE: old } });
  const proposed = run('--adopt');
  assert.equal(proposed.status, 1);
  assert.match(proposed.stderr, new RegExp(`Closest commit on \\S+'s main:\\n  ${P0} — 1 managed file`));
  const a = run('--adopt', '--apply', '--base', P0, '--keep', 'process/two.md=ours');
  assert.equal(a.status, 0, a.stderr);
  assert.match(a.stdout, /map: {4}the target's — the base predates dev\/ownership\.yaml/);
  const d1 = spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/d1-drift.mjs'), proj], { encoding: 'utf8' });
  assert.equal(d1.status, 0, d1.stdout);
  const plan = run('--verbose');
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, new RegExp(`base: {3}${P0} `));
  assert.equal(rows(plan.stdout)['process/one.md'], 'replace');
});

test('adopt: a lesson the target ships under another file name (same id, same rule) is slipway\'s, not listed', () => {
  const renamed = join(root, 'slipway-renamed-lesson');
  git(root, 'clone', '-q', slip, renamed);
  const lesson = (rule) => `---\nid: L-05\nrule: ${rule}\nenforcement:\n  status: check\n  pointer: d1\n---\n`;
  put(renamed, { 'process/lessons/L-05-new-name.md': lesson('slipway rule') });
  commit(renamed, 'a lesson, renamed');
  const run = (dir) => spawnSync(process.execPath, [join(renamed, 'scripts', 'new-project.mjs'), 'sync', '--adopt'], { cwd: dir, encoding: 'utf8', env: { ...process.env, SLIPWAY_SOURCE: slip } });
  const copied = run(unadopted((d) => put(d, { 'process/lessons/L-05-old-name.md': lesson('slipway rule') })));
  assert.equal(copied.status, 0, copied.stderr);
  assert.doesNotMatch(copied.stdout, /L-05/);
  const own = run(unadopted((d) => put(d, { 'process/lessons/L-05-old-name.md': lesson('our own rule') })));
  assert.match(own.stdout, /^ {2}L-05 {2}process\/lessons\/L-05-old-name\.md$/m);
});

// ---- the remote check (#61): a warning, never a gate

// A project cloned from its own upstream, so a case can move the upstream without touching `base`.
function withUpstream() {
  const up = join(root, `upstream-${++n}`);
  git(root, 'clone', '-q', base, up);
  const dir = project();
  git(dir, 'remote', 'set-url', 'origin', up);
  git(dir, 'fetch', '-q');
  return { up, dir };
}
const remoteLine = (stdout) => stdout.match(/^ {2}remote: (.*)$/m)?.[1];

test('behind its upstream: sync and sync --adopt print one warning with the count and `git pull`, before the plan; --apply still applies', () => {
  const { up, dir } = withUpstream();
  put(up, { 'notes.md': 'one\n' });
  commit(up, 'merged on the remote');
  put(up, { 'notes.md': 'two\n' });
  commit(up, 'and another');
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(remoteLine(r.stdout), /^WARNING — main is 2 commits behind origin\/main; run `git pull` first$/);
  assert.equal(r.stdout.match(/remote:/g).length, 1);
  assert.ok(r.stdout.indexOf('remote:') < r.stdout.indexOf('rows:'), 'the warning comes before the plan');
  const a = adopt(unadopted2(dir));
  assert.match(remoteLine(a.stdout), /2 commits behind origin\/main; run `git pull`/);
  const again = withUpstream();
  put(again.up, { 'notes.md': 'one\n' });
  commit(again.up, 'merged on the remote');
  const applied = spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync', '--apply'], { cwd: again.dir, encoding: 'utf8' });
  assert.match(applied.stdout, /Applied on slipway\/sync-/);
  assert.match(remoteLine(applied.stdout), /behind/);
});
// The behind project as one that predates the manifest, for adopt: its .slipway removed and committed.
function unadopted2(dir) {
  rmSync(join(dir, '.slipway'), { recursive: true });
  commit(dir, 'before the manifest');
  return dir;
}

test('level with its upstream: no remote line, the plan as before', () => {
  const { dir } = withUpstream();
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(remoteLine(r.stdout), undefined);
  assert.equal(normalise(r.stdout), readFileSync(EXPECTED_SUMMARY, 'utf8'));
});

test('no upstream, or a fetch that fails: the plan prints, plus one line saying the remote was not checked', () => {
  const none = project();
  git(none, 'branch', '--unset-upstream');
  const r = sync(none);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(remoteLine(r.stdout), 'not checked — main has no upstream');
  assert.match(adopt(unadopted2(none)).stdout, /remote: not checked — main has no upstream/);

  const { dir } = withUpstream();
  git(dir, 'remote', 'set-url', 'origin', join(root, 'gone'));
  const off = sync(dir);
  assert.equal(off.status, 0, off.stderr);
  assert.match(remoteLine(off.stdout), /^not checked — could not fetch origin\/main: /);
  assert.match(off.stdout, /\d+ rows:/);
});
