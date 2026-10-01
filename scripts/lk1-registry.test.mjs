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

test('two registry= lines are BROKEN, and the .npmrc text is never printed', () => {
  const dir = mirrorProject(tarballAt(`https://${HOST}/m.tgz`), `registry=https://user:SECRETTOKEN@${HOST}/\nregistry=https://other.example.invalid/\n`);
  try {
    const r = lk1(dir);
    assert.equal(r.status, 2, r.out);
    assert.match(r.json.broken, /^\.npmrc has 2 registry= lines/);
    assert.doesNotMatch(r.out, /SECRETTOKEN/);
  } finally {
    done(dir);
  }
});

// Where npm's ini reader and a URL parser could name different hosts, no host is trusted: the tarball fails, with the reason.
const AMBIGUOUS = {
  'a ; that ends the value for ini': `registry=https://good.example.invalid;@${HOST}/\n`,
  'a # comment after the value': `registry=https://${HOST}/ # note\n`,
  'a variable': `registry=\${REGISTRY}\n`,
  'a user and a password': `registry=https://user:SECRETTOKEN@${HOST}/\n`,
  'an escape': `registry=https://${HOST}\\;/\n`,
  'a space in the value': 'registry=not an address\n',
  'a value that is not an address': 'registry=nothost\n',
  'an empty value': 'registry=\n',
  'a [section] before the line': `[s]\nregistry=https://${HOST}/\n`,
  'a [section] after the line': `registry=https://${HOST}/\n[s]\nx=y\n`,
  'a no-break space around the key': `registry\u00a0=https://${HOST}/\n`,
  'a no-break space inside the value': `registry=https://${HOST}/\u00a0x\n`,
};
test('a registry= line this check could read differently from npm trusts no host', () => {
  const lock = tarballAt(`https://${HOST}/m.tgz`);
  for (const [what, npmrc] of Object.entries(AMBIGUOUS)) {
    const dir = mirrorProject(lock, npmrc);
    try {
      const r = lk1(dir);
      assert.equal(r.status, 1, `${what}: ${r.out}`);
      assert.match(r.json.findings[0].detail, /no tarball host is trusted because \.npmrc /, what);
      assert.doesNotMatch(r.out, /SECRETTOKEN|nothost/, what);
    } finally {
      done(dir);
    }
  }
});

test('the same .npmrc lines do not stop a project whose lockfile has no tarball: it passes as before', () => {
  const plain = lockfile({ deps: [['m', '1.0.0', '1.0.0']], packages: `  m@1.0.0:\n    resolution: {integrity: ${HASH}}\n\n`, snapshots: '  m@1.0.0: {}\n' });
  for (const [what, npmrc] of Object.entries(AMBIGUOUS)) {
    const dir = mirrorProject(plain, npmrc);
    try {
      assert.equal(lk1(dir).status, 0, what);
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
  const host = (t) => registryHost(t).host;
  assert.deepEqual(registryHost(''), { host: null, why: null });
  assert.equal(host('cache=/x\n//host/:_authToken=abc\n@s:registry=https://s.example.invalid/\n'), null, 'scoped and auth lines are not read');
  assert.equal(host('; registry=https://a.example.invalid/\n# registry=https://b.example.invalid/\n'), null, 'comments');
  assert.equal(host('registry=https://A.Example.invalid/path/\n'), 'a.example.invalid');
  assert.equal(host('  registry = "https://a.example.invalid:8443/"\r\n'), 'a.example.invalid:8443');
  assert.equal(host('"registry"=https://a.example.invalid/\n'), 'a.example.invalid', 'ini reads a quoted key as the key');
  assert.match(registryHost('registry=http://a.example.invalid/\n').why, /not https/);
  assert.throws(() => registryHost('registry=https://a.example.invalid/\nregistry=https://b.example.invalid/\n'), /2 registry= lines/);
  assert.throws(() => registryHost('registry=https://a.example.invalid/\n"registry"=https://b.example.invalid/\n'), /2 registry= lines/, 'a quoted key is a second line');
  for (const text of ['registry=https://a.example.invalid;@b.example.invalid/', 'registry=https://a.example.invalid/ ;x', 'registry=${R}', 'registry=a b', 'registry=nothost', 'registry=', '[s]\nregistry=https://a.example.invalid/', 'registry\u00a0=https://a.example.invalid/']) {
    const r = registryHost(text);
    assert.equal(r.host, null, text);
    assert.ok(r.why, text);
    assert.doesNotMatch(r.why, /example|nothost/, 'the reason holds no value of the file');
  }
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
