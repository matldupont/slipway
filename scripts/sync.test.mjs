#!/usr/bin/env node
// sync (F-01 steps 3–4). The plan: one row kind per case, the preflight refusals, the content resolver,
// and a run that leaves every byte of the project as it was. --apply: one case per Acceptance line of
// #17. Internal: `pnpm meta` runs it in slipway only.
//
// Every case builds real repositories in a temp dir: a small slipway (this checkout's sync code, a
// fixture map and fixture files) with a base commit and a target commit, and a project new-project
// created from the base. `source` is that local slipway, so nothing reaches a network.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MANIFEST, readProjectFile } from '../ci/checks/lib/manifest.mjs';
import { resolveBase, sourceClone } from './lib/base.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED = join(SRC, 'scripts', 'fixtures', 'sync-plan.txt');
// The code a slipway needs to run new-project and sync. Its fixture map makes all of it internal, so the
// plan lists fixture files only and does not change when this code does.
const CODE = ['scripts/new-project.mjs', 'scripts/sync.mjs', 'scripts/lib', 'ci/checks/lib', 'ci/checks/meta/d1-drift.mjs'];

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
    class: seeded
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
const normalise = (stdout) => stdout.replaceAll(slip, '<slipway>').replaceAll(A, '<A>').replaceAll(B, '<B>');

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
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(treeHash(dir), before, 'sync wrote to the project');
  assert.equal(git(dir, 'status', '--porcelain'), '');
  assert.equal(normalise(r.stdout), readFileSync(EXPECTED, 'utf8'));
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
const planned = rows(sync(project()).stdout);
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
  const r = sync(dir);
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
  const r = spawnSync(process.execPath, [join(pkgDir, 'scripts', 'new-project.mjs'), 'sync'], { cwd: project(), encoding: 'utf8' });
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

test('the bin dispatches sync; --adopt is refused until its step lands, and so are --plan with --apply; a sync source that reads as an option is refused', () => {
  assert.match(sync(root, '--help').stdout, /^usage: sync \[--plan \| --apply\]/);
  assert.match(sync(project(), '--adopt').stderr, /--adopt arrives in F-01 step 5/);
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
  const again = sync(dir);
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
const applied = sync(edited, '--apply');

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
  for (const cmd of ['npx github:matldupont/slipway#main sync --apply', 'node scripts/new-project.mjs sync --apply', 'node ../slipway/scripts/new-project.mjs sync --apply']) {
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
