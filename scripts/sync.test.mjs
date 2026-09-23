#!/usr/bin/env node
// sync's plan (F-01 step 3): one row kind per case, the preflight refusals, the content resolver, and a
// run that leaves every byte of the project as it was. Internal: `pnpm meta` runs it in slipway only.
//
// Every case builds real repositories in a temp dir: a small slipway (this checkout's sync code, a
// fixture map and fixture files) with a base commit and a target commit, and a project new-project
// created from the base. `source` is that local slipway, so nothing reaches a network.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MANIFEST } from '../ci/checks/lib/manifest.mjs';
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

// slipway: A (base) → A1 (adds one managed file, nothing else) → B (target).
const slip = join(root, 'slipway');
mkdirSync(slip);
git(slip, 'init', '-q', '-b', 'main');
copyCode(slip);
put(slip, {
  'dev/ownership.yaml': MAP_YAML,
  '.gitignore': 'node_modules/\n',
  '.gitattributes': '* text=auto eol=lf\n',
  'README.md': '# slipway\n',
  'package.json': pkg({ a: 'echo a', b: 'echo b', d: 'echo d', gone: 'node scripts/x.mjs' }),
  'process/replace.md': 'v1\n',
  'process/same.md': 'same\n',
  'process/merge.md': 'one\ntwo\n',
  'process/delete.md': 'delete me\n',
  'process/kept.md': 'kept\n',
  'docs/PRD.md': '# PRD v1\n',
  'docs/same.md': 'seeded, never changed\n',
});
const A = commit(slip, 'A');
put(slip, { 'process/new.md': 'new\n' });
const A1 = commit(slip, 'A1: one managed file added');
put(slip, {
  'package.json': pkg({ a: 'echo a2', b: 'echo b2', c: 'echo c', d: 'echo d' }),
  'process/replace.md': 'v2\n',
  'process/merge.md': 'one\ntwo, upstream\n',
  'process/delete.md': null,
  'process/kept.md': null,
  'process/clash.md': 'slipway clash\n',
  'docs/PRD.md': '# PRD v2\n',
});
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
put(base, {
  'package.json': `${JSON.stringify(projPkg, null, 2)}\n`,
  'process/merge.md': 'one\ntwo\nthree, ours\n',
  'process/kept.md': 'kept, edited\n',
  'process/clash.md': 'our own file\n',
  '.slipway/overrides.yaml': 'overrides:\n  - path: process/merge.md\n    reason: our third line\n  - path: process/kept.md\n    reason: we still use it\n',
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
  // The test's own status runs first and last: it may refresh the index, which sync must not.
  const statusBefore = git(dir, 'status', '--porcelain');
  const before = treeHash(dir);
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(treeHash(dir), before, 'sync wrote to the project');
  assert.equal(git(dir, 'status', '--porcelain'), statusBefore);
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
  ['merged: key reported', 'package.json scripts.b', 'the project changed the value'],
  ['unchanged', 'process/same.md', 'managed, same on both sides'],
  ['unchanged', 'docs/same.md', 'seeded, same on both sides'],
];
const planned = rows(sync(project()).stdout);
for (const [kind, path, why] of KIND_CASES) {
  test(`row ${kind}: ${path} — ${why}`, () => assert.equal(planned[path], kind));
}
test('a key the target derivation drops (calls an internal path) and an unchanged key make no row', () => {
  assert.equal(planned['package.json scripts.gone'], undefined);
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
    const r = sync(dir);
    assert.equal(r.status, 1, `${why}: exit ${r.status}\n${r.stdout}`);
    assert.match(r.stderr, why);
    assert.equal(r.stdout, '');
    assert.equal(treeHash(dir), before);
  }
});

test('with "slipway": null the base is found by blobs alone — A, not A1, which ships one managed file more', () => {
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.slipway = null;
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    commit(d, 'no hint');
  });
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`base: {3}${A} `));
  assert.deepEqual(rows(r.stdout), planned);
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
  assert.match(r.stderr, new RegExp(`no slipway commit holds exactly the manifest's ${total} managed files; closest ${A.slice(0, 12)} \\(${total - 1} of ${total} managed files at their blob\\), then ${A1.slice(0, 12)} \\(${total - 1} of ${total} managed files at their blob, 1 more it ships\\)`));
});

test('resolveBase: closest-match mode ranks every commit and names the runner-up', () => {
  const gitDir = sourceClone(slip);
  const blobs = new Map([['process/replace.md', git(slip, 'rev-parse', `${A}:process/replace.md`)]]);
  const r = resolveBase(gitDir, blobs);
  assert.equal(r.exact, null);
  assert.equal(r.total, 1);
  assert.deepEqual(r.best, { sha: A, matched: 1, extra: 5 });
  assert.deepEqual(r.runnerUp, { sha: A1, matched: 1, extra: 6 });
});

test('the bin dispatches sync; --apply and --adopt are refused until their steps land; a sync source that reads as an option is refused', () => {
  assert.match(sync(root, '--help').stdout, /^usage: sync/);
  assert.match(sync(project(), '--apply').stderr, /--apply arrives in F-01 step 4/);
  assert.match(sync(project(), '--adopt').stderr, /--adopt arrives in F-01 step 5/);
  assert.throws(() => sourceClone('--upload-pack=touch x'), /reads as a git option/);
});
