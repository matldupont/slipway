#!/usr/bin/env node
// new-project's install record (F-01 step 2): the manifest it writes, the slipway sha it resolves, and
// D1 and M1 in the project it creates. Internal: `pnpm meta` runs it in slipway, never in a project.
//
// Every case builds real repositories in the OS temp dir. new-project makes no network call, so
// nothing here reaches one either.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MANIFEST, readManifest, sha256 } from '../ci/checks/lib/manifest.mjs';
import { classify, loadOwnership, shippedPaths } from '../ci/checks/lib/ownership.mjs';
import { blobSha, derivePackageJson, publicSource, resolveSlipway } from './lib/install.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rules = loadOwnership(SRC);
const PKG_VERSION = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).version;

// A known identity and no personal git config, for every git this file runs or spawns.
Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'slipway test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'slipway test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
});

const temps = [];
test.after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'slipway-np-'));
  temps.push(d);
  return d;
};
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const check = (dir, file) => spawnSync(process.execPath, [join(dir, 'ci', 'checks', 'meta', file), dir], { encoding: 'utf8' });

function newProject(src, dest, env = {}) {
  const r = spawnSync(process.execPath, [join(src, 'scripts', 'new-project.mjs'), dest, '--no-github', '--no-harness'], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.equal(r.status, 0, `new-project failed:\n${r.stdout}\n${r.stderr}`);
  return {
    manifest: JSON.parse(readFileSync(join(dest, MANIFEST), 'utf8')),
    subject: git(dest, 'log', '-1', '--format=%s'),
    readme: readFileSync(join(dest, 'README.md'), 'utf8'),
  };
}

// Every path slipway's own checkout ships, internal ones included: what `npx github:…` downloads.
function copyTemplate(to) {
  for (const p of shippedPaths(SRC, rules)) {
    if (p === '.gitignore') continue;
    mkdirSync(dirname(join(to, p)), { recursive: true });
    copyFileSync(join(SRC, p), join(to, p));
  }
}

test('the manifest lists every shipped path with its class, sha256 and blob as written; D1 and M1 pass', () => {
  const dest = join(tmp(), 'probe');
  const { manifest, subject, readme } = newProject(SRC, dest, { SLIPWAY_SOURCE: '' });

  const want = shippedPaths(SRC, rules).filter((p) => classify(rules, p) !== 'internal');
  assert.deepEqual(Object.keys(manifest.files), want);
  for (const [p, f] of Object.entries(manifest.files)) {
    assert.equal(f.class, classify(rules, p), p);
    const buf = readFileSync(join(dest, p));
    assert.equal(f.sha256, sha256(buf), p);
    assert.equal(f.blob, blobSha(buf), p);
  }
  assert.deepEqual(manifest.answers, { name: 'Probe', repo: null });
  assert.equal(manifest.source, 'github:matldupont/slipway');
  // Shape only: whether this checkout is clean is not this test's business (the checkout test is).
  assert.equal(manifest.version, PKG_VERSION);
  if (manifest.slipway === null) assert.match(subject, new RegExp(`^chore: start from slipway ([0-9a-f]{40}-dirty|${PKG_VERSION})$`));
  else {
    assert.match(manifest.slipway, /^[0-9a-f]{40}$/);
    assert.equal(subject, `chore: start from slipway ${manifest.slipway}`);
  }

  // The project's own meta, the command its CI runs, calls nothing slipway kept back.
  const meta = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).scripts.meta;
  assert.match(meta, /d1-drift\.mjs/);
  assert.doesNotMatch(meta, /scripts\//);
  assert.equal(readme.includes('Built on [slipway](SLIPWAY.md) '), true);

  for (const f of ['d1-drift.mjs', 'm1-declared-vs-invoked.mjs']) {
    const r = check(dest, f);
    assert.equal(r.status, 0, `${f} in a fresh project:\n${r.stdout}`);
  }

  appendFileSync(join(dest, 'SLIPWAY.md'), '\nedited\n');
  let r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /D1: drift\/SLIPWAY\.md: edited/);

  // A whitespace-only reason is empty: it excuses nothing.
  writeFileSync(join(dest, '.slipway', 'overrides.yaml'), 'overrides:\n  - path: SLIPWAY.md\n    reason: "  "\n');
  r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /override\/reason\/SLIPWAY\.md[\s\S]*drift\/SLIPWAY\.md/);

  // A directory where a managed file was is drift, reported, not a crash.
  rmSync(join(dest, 'BOOTSTRAP.md'));
  mkdirSync(join(dest, 'BOOTSTRAP.md'));
  r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /drift\/BOOTSTRAP\.md: replaced by a non-file/);
  rmSync(join(dest, 'BOOTSTRAP.md'), { recursive: true });
  git(dest, 'checkout', '--', 'BOOTSTRAP.md');
  // A symlink is never followed out of the project.
  rmSync(join(dest, 'BOOTSTRAP.md'));
  symlinkSync(join(SRC, 'BOOTSTRAP.md'), join(dest, 'BOOTSTRAP.md'));
  assert.match(check(dest, 'd1-drift.mjs').stdout, /drift\/BOOTSTRAP\.md: replaced by a non-file/);
  rmSync(join(dest, 'BOOTSTRAP.md'));
  git(dest, 'checkout', '--', 'BOOTSTRAP.md');

  writeFileSync(join(dest, '.slipway', 'overrides.yaml'), 'overrides:\n  - path: SLIPWAY.md\n    reason: a local note\n');
  assert.equal(check(dest, 'd1-drift.mjs').status, 0);

  unlinkSync(join(dest, MANIFEST));
  r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 2);
  assert.match(r.stdout, /BROKEN — manifest\/missing/);
});

test('under npx, untracked inside another repository: no sha from the enclosing HEAD, no network — null plus version', () => {
  const root = tmp();
  const outer = join(root, 'outer');
  mkdirSync(outer);
  git(outer, 'init', '-q', '-b', 'main');
  writeFileSync(join(outer, 'x.md'), 'another project\n');
  git(outer, 'add', '-A');
  git(outer, 'commit', '-q', '-m', 'outer');
  const outerSha = git(outer, 'rev-parse', 'HEAD');
  const pkg = join(outer, 'vendor', 'slipway');
  copyTemplate(pkg);

  // An unreachable source: a network call would fail or hang, and none is made.
  const fork = 'https://me:secret@unreachable.invalid/me/slipway.git?private_token=x';
  const { manifest, subject, readme } = newProject(pkg, join(root, 'project'), { SLIPWAY_SOURCE: fork });
  assert.equal(manifest.slipway, null);
  assert.equal(manifest.version, PKG_VERSION);
  assert.equal(manifest.source, 'https://unreachable.invalid/me/slipway.git');
  assert.ok(!JSON.stringify(manifest).includes(outerSha));
  assert.equal(subject, `chore: start from slipway ${PKG_VERSION}`);
  assert.ok(readme.includes(`Built on [slipway](SLIPWAY.md) ${PKG_VERSION}.`));
  for (const [p, f] of Object.entries(manifest.files)) assert.equal(f.blob, blobSha(readFileSync(join(root, 'project', p))), p);
});

test('in an edited slipway checkout: no sha in the manifest, and the commit and README say <sha>-dirty', () => {
  const root = tmp();
  const checkout = join(root, 'slipway');
  copyTemplate(checkout);
  git(checkout, 'init', '-q', '-b', 'main');
  git(checkout, 'add', '-A');
  git(checkout, 'commit', '-q', '-m', 'slipway');
  const head = git(checkout, 'rev-parse', 'HEAD');

  const clean = newProject(checkout, join(root, 'clean'), { SLIPWAY_SOURCE: '' });
  assert.equal(clean.manifest.slipway, head);
  assert.equal(clean.subject, `chore: start from slipway ${head}`);
  assert.ok(clean.readme.includes(`Built on [slipway](SLIPWAY.md) ${head}.`));

  appendFileSync(join(checkout, 'SLIPWAY.md'), '\nuncommitted\n');
  const edited = newProject(checkout, join(root, 'edited'), { SLIPWAY_SOURCE: '' });
  assert.equal(edited.manifest.slipway, null);
  assert.equal(edited.manifest.version, PKG_VERSION);
  assert.equal(edited.subject, `chore: start from slipway ${head}-dirty`);
  assert.ok(edited.readme.includes(`Built on [slipway](SLIPWAY.md) ${head}-dirty.`));
});

test('resolveSlipway: no hint outside a checkout, and an edited or thinned checkout names its candidate', () => {
  const walked = tmp();
  writeFileSync(join(walked, 'a.md'), 'a\n');
  assert.deepEqual(resolveSlipway(walked, ['a.md'], { rules }), {
    sha: null, candidate: null, why: 'not a slipway checkout (no .git at the template top)',
  });

  const checkout = tmp();
  writeFileSync(join(checkout, 'a.md'), 'a\n');
  git(checkout, 'init', '-q', '-b', 'main');
  git(checkout, 'add', '-A');
  git(checkout, 'commit', '-q', '-m', 'a');
  const head = git(checkout, 'rev-parse', 'HEAD');
  assert.equal(resolveSlipway(checkout, ['a.md'], { rules }).sha, head);
  // A file the commit ships but the install did not take (deleted from the checkout) is a difference.
  writeFileSync(join(checkout, 'b.md'), 'b\n');
  git(checkout, 'add', '-A');
  git(checkout, 'commit', '-q', '-m', 'b');
  const thinned = resolveSlipway(checkout, ['a.md'], { rules });
  assert.equal(thinned.sha, null);
  assert.match(thinned.why, /1 file\(s\) differ from [0-9a-f]{12}: b\.md/);
  writeFileSync(join(checkout, 'a.md'), 'edited\n');
  const dirty = resolveSlipway(checkout, ['a.md', 'b.md'], { rules });
  assert.equal(dirty.sha, null);
  assert.equal(dirty.candidate, git(checkout, 'rev-parse', 'HEAD'));
  assert.match(dirty.why, /1 file\(s\) differ from [0-9a-f]{12}: a\.md/);
});

test('publicSource: credentials never reach the manifest, and an option-shaped source is refused', () => {
  assert.equal(publicSource('github:matldupont/slipway'), 'github:matldupont/slipway');
  assert.equal(publicSource('https://x-access-token:ghp_secret@github.com/me/slipway.git'), 'https://github.com/me/slipway.git');
  assert.equal(publicSource('https://host/r.git?private_token=x#y'), 'https://host/r.git');
  assert.equal(publicSource('/tmp/slipway'), '/tmp/slipway');
  assert.throws(() => publicSource('--upload-pack=touch x'), /reads as a git option/);
});

test('readManifest refuses a manifest it cannot trust', () => {
  const put = (m) => {
    const d = tmp();
    mkdirSync(join(d, '.slipway'));
    writeFileSync(join(d, MANIFEST), typeof m === 'string' ? m : JSON.stringify(m));
    return d;
  };
  const file = { class: 'managed', sha256: 'a'.repeat(64) };
  assert.equal(readManifest(tmp()), null);
  assert.throws(() => readManifest(put('{')), /not valid JSON/);
  assert.throws(() => readManifest(put({ slipway: null })), /no files map/);
  for (const p of ['/etc/passwd', '../x', 'a/../../x', 'a//b', './a', 'a\\..\\x', 'C:x']) {
    assert.throws(() => readManifest(put({ files: { [p]: file } })), /not a plain relative path/, p);
  }
  assert.throws(() => readManifest(put({ files: { 'a.md': { class: 'managed', sha256: 'short' } } })), /needs a class .* and a sha256/);
  assert.throws(() => readManifest(put({ files: { 'a.md': { class: 'Managed', sha256: 'a'.repeat(64) } } })), /needs a class .* and a sha256/);
  assert.equal(readManifest(put({ files: { 'a/b.md': file } })).files['a/b.md'].class, 'managed');
});

test('derivePackageJson: the project gets its own name and no command that calls an internal path', () => {
  const pkg = derivePackageJson(
    {
      name: 'create-slipway', version: '0.1.0', description: 'x', bin: { x: 'scripts/new-project.mjs' },
      scripts: { meta: 'node ci/checks/meta/d1-drift.mjs . && node scripts/new-project.test.mjs', dev: 'node scripts/x.mjs' },
    },
    { name: 'acme', rules },
  );
  assert.deepEqual(pkg, { name: 'acme', private: true, scripts: { meta: 'node ci/checks/meta/d1-drift.mjs .' } });
});

test('.gitattributes ships as managed, under a checkout and a packed install; a CRLF re-checkout stays LF and D1-green; raw CRLF is drift', () => {
  assert.equal(classify(rules, '.gitattributes'), 'managed');

  // Packed install: no .git at the template top, the file arrives like any other shipped path.
  const root = tmp();
  const pkg = join(root, 'pkg');
  copyTemplate(pkg);
  assert.equal(readFileSync(join(pkg, '.gitattributes'), 'utf8'), '* text=auto eol=lf\n');
  const { manifest } = newProject(pkg, join(root, 'project'), { SLIPWAY_SOURCE: '' });
  assert.equal(manifest.files['.gitattributes'].class, 'managed');
  assert.equal(readFileSync(join(root, 'project', '.gitattributes'), 'utf8'), '* text=auto eol=lf\n');

  // Re-checkout the committed project the way a Windows clone would.
  const clone = join(root, 'clone');
  git(root, '-c', 'core.autocrlf=true', 'clone', '-q', join(root, 'project'), clone);
  for (const p of Object.keys(manifest.files)) {
    assert.ok(!readFileSync(join(clone, p)).includes(0x0d), `${p} has CR bytes after an autocrlf checkout`);
  }
  assert.equal(check(clone, 'd1-drift.mjs').status, 0);

  // D1 still hashes raw bytes: CRLF written into the working tree is drift.
  writeFileSync(join(clone, 'SLIPWAY.md'), readFileSync(join(clone, 'SLIPWAY.md'), 'utf8').replaceAll('\n', '\r\n'));
  const r = check(clone, 'd1-drift.mjs');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /D1: drift\/SLIPWAY\.md: edited/);
});
