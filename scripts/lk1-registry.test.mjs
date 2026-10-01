#!/usr/bin/env node
// LK1 and a private registry (#147): a `tarball:` beside an integrity passes on the host the root .npmrc `registry=`
// names, and a workspace package installed by copy (`name@file:<folder>`) passes when the folder is a workspace
// package. PC1 covers the known-bad lockfiles (ci/fixtures/known-bad/lk1/tarball-*, file-*, npmrc-*); these cover the
// green runs, the host comparison and the .npmrc reader. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import test from 'node:test';
import { onHost, registryHost } from '../ci/checks/lib/npmrc.mjs';
import { done, HASH, HEAD, lk1, lockfile, project } from './lib/lk1-lockfile.mjs';

const HOST = 'mirror.example.invalid';
const tarballAt = (url, integrity = `integrity: ${HASH}, `) =>
  lockfile({ deps: [['m', '1.0.0', '1.0.0']], packages: `  m@1.0.0:\n    resolution: {${integrity}tarball: ${url}}\n\n`, snapshots: '  m@1.0.0: {}\n' });
const mirrorProject = (tarball, npmrc = `registry=https://${HOST}/\n`) =>
  project({ 'package.json': JSON.stringify({ name: 'p', private: true, dependencies: { m: '1.0.0' } }), 'pnpm-lock.yaml': tarball, ...(npmrc === null ? {} : { '.npmrc': npmrc }) });

// --- a tarball on the registry's host ---

test('a tarball on the host .npmrc names passes, counted with its entries', () => {
  const dir = mirrorProject(tarballAt(`https://${HOST}/m/-/m-1.0.0.tgz`));
  try {
    const r = lk1(dir);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /LK1: scanned 2 lockfile entries/);
  } finally {
    done(dir);
  }
});

test('the same lockfile fails with no .npmrc, with no registry= line, and with another host named', () => {
  const lock = tarballAt(`https://${HOST}/m/-/m-1.0.0.tgz`);
  for (const [what, npmrc] of [['no .npmrc', null], ['no registry= line', '; nothing here\n@acme:registry=https://elsewhere.example.invalid/\n'], ['another host', 'registry=https://other.example.invalid/\n'], ['an http registry', `registry=http://${HOST}/\n`]]) {
    const dir = mirrorProject(lock, npmrc);
    try {
      const r = lk1(dir);
      assert.equal(r.status, 1, `${what}: ${r.out}`);
      assert.deepEqual(r.json.findings.map((f) => f.where), [`pnpm-lock.yaml#m@1.0.0{tarball=https://${HOST}/m/-/m-1.0.0.tgz}`], what);
    } finally {
      done(dir);
    }
  }
});

test('a tarball that only looks like the registry host fails', () => {
  const lookalikes = [
    `http://${HOST}/m.tgz`,
    `https://${HOST}.other.example.invalid/m.tgz`,
    `https://other.example.invalid/${HOST}/m.tgz`,
    `https://user:pw@${HOST}/m.tgz`,
    `https://${HOST}@other.example.invalid/m.tgz`,
    `https://other.example.invalid\\@${HOST}/m.tgz`,
    `https://${HOST}:8443/m.tgz`,
    `https://${HOST}./m.tgz`,
    `https://x${HOST}/m.tgz`,
    `file:${HOST}/m.tgz`,
  ];
  for (const url of lookalikes) {
    const dir = mirrorProject(tarballAt(url));
    try {
      assert.equal(lk1(dir).status, 1, url);
    } finally {
      done(dir);
    }
  }
});

test('the host is compared as the URL parser reads it: case and a default port do not matter', () => {
  for (const url of [`https://${HOST.toUpperCase()}/m.tgz`, `https://${HOST}:443/m.tgz`]) {
    const dir = mirrorProject(tarballAt(url));
    try {
      assert.equal(lk1(dir).status, 0, url);
    } finally {
      done(dir);
    }
  }
});

test('a registry on a port trusts that port only', () => {
  const rc = `registry=https://${HOST}:8443/\n`;
  const on = mirrorProject(tarballAt(`https://${HOST}:8443/m.tgz`), rc);
  const off = mirrorProject(tarballAt(`https://${HOST}/m.tgz`), rc);
  try {
    assert.equal(lk1(on).status, 0);
    assert.equal(lk1(off).status, 1);
  } finally {
    done(on);
    done(off);
  }
});

test('a file: tarball fails, whatever .npmrc says', () => {
  const dir = mirrorProject(tarballAt('file:vendor/m.tgz'));
  try {
    assert.equal(lk1(dir).status, 1);
  } finally {
    done(dir);
  }
});

test('a tarball on the registry host with a third key beside the integrity and tarball fails', () => {
  const dir = mirrorProject(tarballAt(`https://${HOST}/m.tgz`, `integrity: ${HASH}, commit: 0123456789abcdef0123456789abcdef01234567, `));
  try {
    assert.equal(lk1(dir).status, 1);
  } finally {
    done(dir);
  }
});

test('an .npmrc LK1 cannot read is BROKEN, and its text is never printed', () => {
  const lock = tarballAt(`https://${HOST}/m.tgz`);
  const secret = 'https://user:SECRETTOKEN@mirror.example.invalid/';
  for (const npmrc of [`registry=https://${HOST}/\nregistry=https://other.example.invalid/\n`, 'registry=\n', `registry=\${REGISTRY}\n`, 'registry=not an address\n', 'registry=nothost\n', `registry=${secret} ;comment\n`]) {
    const dir = mirrorProject(lock, npmrc);
    try {
      const r = lk1(dir);
      assert.equal(r.status, 2, `${JSON.stringify(npmrc)}: ${r.out}`);
      assert.match(r.json.broken, /^\.npmrc /);
      assert.doesNotMatch(r.out, /SECRETTOKEN|REGISTRY\}|nothost/);
    } finally {
      done(dir);
    }
  }
});

test('an .npmrc that is not a regular file is BROKEN', () => {
  const dir = project({ 'package.json': JSON.stringify({ name: 'p', private: true, dependencies: { m: '1.0.0' } }), 'pnpm-lock.yaml': tarballAt(`https://${HOST}/m.tgz`), '.npmrc/x': 'a folder named .npmrc' });
  try {
    const r = lk1(dir);
    assert.equal(r.status, 2, r.out);
    assert.match(r.json.broken, /\.npmrc is not a regular file/);
  } finally {
    done(dir);
  }
});

test('only the root .npmrc is read: a registry named in a workspace package folder trusts nothing', () => {
  const dir = project({
    'package.json': JSON.stringify({ name: 'root', private: true }),
    'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
    'packages/x/package.json': JSON.stringify({ name: 'x', dependencies: { m: '1.0.0' } }),
    'packages/x/.npmrc': `registry=https://${HOST}/\n`,
    'pnpm-lock.yaml': `${HEAD}importers:\n\n  .: {}\n\n  packages/x:\n    dependencies:\n      m:\n        specifier: 1.0.0\n        version: 1.0.0\n\npackages:\n\n  m@1.0.0:\n    resolution: {integrity: ${HASH}, tarball: https://${HOST}/m.tgz}\n\nsnapshots:\n\n  m@1.0.0: {}\n`,
  });
  try {
    assert.equal(lk1(dir).status, 1);
  } finally {
    done(dir);
  }
});

test('a project with no registry= line reads as it did: an integrity alone passes, a tarball does not', () => {
  const plain = mirrorProject(lockfile({ deps: [['m', '1.0.0', '1.0.0']], packages: `  m@1.0.0:\n    resolution: {integrity: ${HASH}}\n\n`, snapshots: '  m@1.0.0: {}\n' }), 'cache=/tmp/x\n');
  try {
    assert.equal(lk1(plain).status, 0);
  } finally {
    done(plain);
  }
});

// --- a workspace package installed by copy ---

const copyOf = (folder, { key = folder, res = `{directory: ${folder}, type: directory}` } = {}) =>
  project({
    'package.json': JSON.stringify({ name: 'root', private: true, dependencies: { lib: `file:./${folder}` } }),
    'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
    'packages/lib/package.json': JSON.stringify({ name: 'lib' }),
    'pnpm-lock.yaml': `${HEAD}importers:\n\n  .:\n    dependencies:\n      lib:\n        specifier: file:./${folder}\n        version: lib@file:${key}\n\n  packages/lib: {}\n\npackages:\n\n  lib@file:${key}:\n    resolution: ${res}\n\nsnapshots:\n\n  lib@file:${key}: {}\n`,
  });

test('a package copied from a workspace package folder passes; any other file: still fails', () => {
  const ok = copyOf('packages/lib');
  try {
    const r = lk1(ok);
    assert.equal(r.status, 0, r.out);
  } finally {
    done(ok);
  }
  const cases = {
    'a folder outside every workspace folder': copyOf('vendor/lib'),
    'a .. segment that lands on a workspace folder': copyOf('packages/x/../lib'),
    'a ./ segment': copyOf('./packages/lib'),
    'a trailing slash': copyOf('packages/lib/'),
    'a folder above the root': copyOf('../lib'),
    'an absolute folder': copyOf('/packages/lib'),
    'a directory that is not the key': copyOf('packages/lib', { key: 'vendor/lib' }),
    'a tarball in place of a directory': copyOf('packages/lib', { res: `{integrity: ${HASH}, tarball: file:packages/lib.tgz}` }),
    'a third key': copyOf('packages/lib', { res: '{directory: packages/lib, type: directory, commit: 0123456789abcdef0123456789abcdef01234567}' }),
    'another type': copyOf('packages/lib', { res: '{directory: packages/lib, type: git}' }),
  };
  for (const [what, dir] of Object.entries(cases)) {
    try {
      const r = lk1(dir);
      assert.equal(r.status, 1, `${what}: ${r.out}`);
    } finally {
      done(dir);
    }
  }
});

// --- the .npmrc reader and the host comparison ---

test('registryHost reads the one registry= line and nothing else', () => {
  assert.equal(registryHost(''), null);
  assert.equal(registryHost('cache=/x\n//host/:_authToken=abc\n@s:registry=https://s.example.invalid/\n'), null, 'scoped and auth lines are not read');
  assert.equal(registryHost('; registry=https://a.example.invalid/\n# registry=https://b.example.invalid/\n'), null, 'comments');
  assert.equal(registryHost('registry=https://A.Example.invalid/path/\n'), 'a.example.invalid');
  assert.equal(registryHost('  registry = "https://a.example.invalid:8443/"\r\n'), 'a.example.invalid:8443');
  assert.equal(registryHost('registry=http://a.example.invalid/\n'), null, 'http trusts no host');
  assert.throws(() => registryHost('registry=https://a.example.invalid/\nregistry=https://b.example.invalid/\n'), /2 registry= lines/);
  assert.throws(() => registryHost('registry=\n'), /cannot read/);
  assert.throws(() => registryHost('registry=https://${HOST}/\n'), /cannot read/);
  assert.throws(() => registryHost('registry=a b\n'), /cannot read/);
  assert.throws(() => registryHost('registry=nothost\n'), /not an address/);
});

test('onHost: https, no user, the parsed host equal, nothing the parser would drop', () => {
  assert.equal(onHost('https://a.example.invalid/x.tgz', 'a.example.invalid'), true);
  assert.equal(onHost('https://a.example.invalid/x.tgz', null), false, 'no host trusted');
  assert.equal(onHost(undefined, 'a.example.invalid'), false);
  assert.equal(onHost({}, 'a.example.invalid'), false);
  assert.equal(onHost('https://a.example.invalid\t/x.tgz', 'a.example.invalid'), false);
  assert.equal(onHost('https://u@a.example.invalid/x.tgz', 'a.example.invalid'), false);
  assert.equal(onHost('https://:p@a.example.invalid/x.tgz', 'a.example.invalid'), false);
  assert.equal(onHost('https://b.example.invalid/x.tgz', 'a.example.invalid'), false);
});
