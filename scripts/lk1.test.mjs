#!/usr/bin/env node
// LK1 (ci/checks/meta/lk1-lockfile.mjs) and the lockfile reader it stands on (ci/checks/lib/pnpm-lock.mjs).
// PC1 covers the known-bad lockfiles, one per resolution kind; these cover what a fixture cannot: a real
// lockfile pnpm 10.25 wrote, the shapes the reader refuses, a green run and its denominator, the exception
// registry, and what FO1 leaves to LK1. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { expiryProblem } from '../ci/checks/lib/exceptions.mjs';
import { checkLockfile, parseLockfile } from '../ci/checks/lib/pnpm-lock.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HASH = `sha512-${'A'.repeat(86)}==`;
const HEAD = "lockfileVersion: '9.0'\n\n";

// A project folder: package.json, pnpm-lock.yaml, and whatever else `files` names.
const project = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'lk1-'));
  for (const [p, body] of Object.entries({ 'package.json': JSON.stringify({ name: 'p', private: true, dependencies: { a: '^1.0.0' } }), ...files })) {
    if (body === null) continue;
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
};
const run = (script, dir, env = {}) => {
  const r = spawnSync(process.execPath, [join(SRC, script), dir], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1', ...env } });
  const line = r.stdout.split('\n').findLast((l) => l.startsWith('@@json '));
  return { status: r.status, out: r.stdout, json: line ? JSON.parse(line.slice('@@json '.length)) : null };
};
const lk1 = (dir, env) => run('ci/checks/meta/lk1-lockfile.mjs', dir, env);
const done = (dir) => rmSync(dir, { recursive: true, force: true });

const registry = (name = 'a', version = '1.0.0') => `  ${name}@${version}:\n    resolution: {integrity: ${HASH}}\n\n`;
const lockfile = ({ deps = [['a', '^1.0.0', '1.0.0']], packages = registry(), snapshots = '  a@1.0.0: {}\n' } = {}) =>
  `${HEAD}importers:\n\n  .:\n    dependencies:\n${deps.map(([n, s, v]) => `      ${n}:\n        specifier: ${s}\n        version: ${v}\n`).join('')}\npackages:\n\n${packages}snapshots:\n\n${snapshots}`;

// --- the reader, on a lockfile pnpm 10.25 wrote ---

test('a real pnpm 10.25 lockfile is read whole, and only what is not a registry release is a problem', () => {
  const doc = parseLockfile(readFileSync(join(SRC, 'scripts/fixtures/lk1/pnpm10-real.lock.yaml'), 'utf8'));
  const { entries, problems } = checkLockfile(doc, new Set(['.', 'packages/a', 'packages/b']));
  assert.deepEqual(
    problems.map((p) => [p.kind, p.id]).sort(),
    [
      ['file', 'dirdep@file:dirdep'],
      ['file', 'dirdep@file:dirtgz-1.0.0.tgz'],
      ['link', 'importers/./linked@link:ext'],
      ['link', 'snapshots/is-number@3.0.0/kind-of@link:ext'],
      ['tarball', 'is-obj@https://codeload.github.com/sindresorhus/is-obj/tar.gz/e8f8abd81d2207a2d130b1d792cb7385f9ef0f00'],
      ['tarball', 'is-plain-obj@https://codeload.github.com/sindresorhus/is-plain-obj/tar.gz/666df7c10035f7e26f27ec214fe5ae3173435f34'],
    ]
  );
  assert.equal(entries, doc.get('packages').size + [...doc.get('importers').values()].reduce((n, i) => n + (i.get('dependencies')?.size ?? 0), 0));
});

test('a workspace: dependency passes only when its link lands on a workspace package folder', () => {
  const text = lockfile({ deps: [['w', 'workspace:*', 'link:packages/w']], packages: '', snapshots: '' }).replace('packages:\n\nsnapshots', 'packages: {}\n\nsnapshots');
  assert.deepEqual(checkLockfile(parseLockfile(text), new Set(['.', 'packages/w'])).problems, []);
  assert.deepEqual(checkLockfile(parseLockfile(text), new Set(['.'])).problems.map((p) => p.kind), ['link']);
  const sneaky = text.replace('workspace:*', '^1.0.0');
  assert.deepEqual(checkLockfile(parseLockfile(sneaky), new Set(['.', 'packages/w'])).problems.map((p) => p.kind), ['link'], 'a link: without a workspace: specifier is a link');
});

test('a resolution written another way is still read as what it is', () => {
  const kinds = (resolution) => checkLockfile(parseLockfile(lockfile({ packages: `  a@1.0.0:\n${resolution}\n` })), new Set(['.'])).problems.map((p) => p.kind);
  assert.deepEqual(kinds(`    resolution: {integrity: ${HASH}}`), []);
  assert.deepEqual(kinds(`    resolution:\n      tarball: https://example.invalid/a.tgz`), ['tarball'], 'a block mapping');
  assert.deepEqual(kinds(`    'resolution': {tarball: https://example.invalid/a.tgz}`), ['tarball'], 'a quoted key');
  assert.deepEqual(kinds(`    resolution: {integrity: ${HASH}, tarball: file:a.tgz}`), ['file'], 'an integrity beside a tarball');
  assert.deepEqual(kinds(`    resolution: {integrity: ${HASH}, type: git}`), ['git']);
  assert.deepEqual(kinds(`    resolution: {integrity: sha512-short}`), ['other'], 'an integrity that is not a whole hash');
  assert.deepEqual(kinds(`    resolution: {commit: 0123, repo: 'https://example.invalid/a.git', type: git}`), ['git']);
  assert.deepEqual(kinds(`    engines: {node: '>=1'}`), ['other'], 'no resolution at all');
});

test('a package named __proto__ is an entry, not the prototype', () => {
  const { entries, problems } = checkLockfile(parseLockfile(lockfile({ deps: [], packages: registry('__proto__'), snapshots: '' })), new Set(['.']));
  assert.equal(entries, 1);
  assert.deepEqual(problems, []);
});

// --- what the reader refuses: each would be read one way here and another way by a YAML reader ---

const refused = {
  'a repeated key': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: ${HASH}}\n    resolution: {tarball: https://example.invalid/a.tgz}\n`, /repeats a key/],
  'a repeated key in a flow mapping': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: ${HASH}, integrity: x}\n`, /repeats a key/],
  'an anchor': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: &r {integrity: ${HASH}}\n`, /anchor, alias, tag/],
  'an alias': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: *r\n`, /anchor, alias, tag/],
  'a tag': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: !!map {integrity: ${HASH}}\n`, /anchor, alias, tag/],
  'a block scalar': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: |\n      text\n`, /block scalar/],
  'a merge key': [`${HEAD}packages:\n  <<: {a: b}\n`, /key this reader does not take/],
  'a multi-line quoted value': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: 'one\n      two'\n`, /quoted value/],
  'a backslash in a double-quoted value': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: "a\\nb"\n`, /quoted value/],
  'a tab in the indentation': [`${HEAD}packages:\n\ta@1.0.0: {}\n`, /tab/],
  'a value indented under a scalar': [`${HEAD}packages:\n  a@1.0.0: x\n    resolution: y\n`, /takes no lines/],
  'a sequence at its key\'s indent': [`${HEAD}packages:\n- a\n`, /not a "key: value"|sequence/],
  'a document marker': [`---\n${HEAD}`, /"key: value"|key this reader/],
  'a complex key': [`${HEAD}? a\n: b\n`, /"key: value"|key this reader/],
  'a plain value holding "key: value"': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: a: b\n`, /"key: value" text/],
  'a flow mapping that does not close': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: x\n`, /does not close/],
  'text after a flow mapping': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: x} y\n`, /after a flow/],
  'a carriage return': [`${HEAD.replace('\n\n', '\r\n\r\n')}packages: {}\n`, /U\+000D/],
  'a right-to-left override': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: \u202eevil\n`, /U\+202E/],
  'a next-line character': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: a\u0085b\n`, /U\+0085/],
  'a line separator': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: a\u2028b\n`, /U\+2028/],
  'an empty file': ['\n# only a comment\n', /is empty/],
  'a lockfile that starts indented': ['  lockfileVersion: 9\n', /left edge/],
};
for (const [what, [text, message]] of Object.entries(refused)) {
  test(`the reader refuses ${what}`, () => assert.throws(() => parseLockfile(text), message));
}

test('a version other than 9.0 is refused, so an older format is never read as this one', () => {
  for (const v of ["'6.0'", "'9.1'", '9', "''"]) assert.throws(() => checkLockfile(parseLockfile(`lockfileVersion: ${v}\n`), new Set(['.'])), /reads only 9\.0/);
  assert.throws(() => checkLockfile(parseLockfile('settings: {}\n'), new Set(['.'])), /reads only 9\.0/);
});

// --- the check ---

test('an all-registry lockfile passes and says how many entries it read', () => {
  const dir = project({ 'pnpm-lock.yaml': lockfile({ packages: registry('a') + registry('b', '2.0.0'), snapshots: '  a@1.0.0: {}\n\n  b@2.0.0: {}\n' }) });
  try {
    const r = lk1(dir);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /LK1: scanned 3 lockfile entries/, 'two packages and one importer dependency');
    assert.match(r.out, /LK1: PASS/);
  } finally {
    done(dir);
  }
});

test('a project that declares nothing and has no lockfile passes, counting its package.json files', () => {
  const dir = project({ 'package.json': JSON.stringify({ name: 'p', private: true }), 'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n", 'packages/x/package.json': '{"name":"x"}' });
  try {
    const r = lk1(dir);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /LK1: scanned 2 package\.json files/);
  } finally {
    done(dir);
  }
});

test('a dependency declared in a workspace package, with no lockfile, is BROKEN', () => {
  const dir = project({
    'package.json': JSON.stringify({ name: 'p', private: true }),
    'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
    'packages/x/package.json': JSON.stringify({ name: 'x', devDependencies: { z: '1.0.0' } }),
  });
  try {
    const r = lk1(dir);
    assert.equal(r.status, 2, r.out);
    assert.match(r.json.broken, /ask for 1 package\(s\) and there is no pnpm-lock\.yaml/);
  } finally {
    done(dir);
  }
});

test('a lockfile that is a link is BROKEN, and so is one that cannot be read', () => {
  const dir = project({ 'real.yaml': lockfile() });
  try {
    symlinkSync(join(dir, 'real.yaml'), join(dir, 'pnpm-lock.yaml'));
    const r = lk1(dir);
    assert.equal(r.status, 2, r.out);
    assert.match(r.json.broken, /not a regular file/);
  } finally {
    done(dir);
  }
  const bad = project({ 'pnpm-lock.yaml': `${HEAD}packages: [\n` });
  try {
    const r = lk1(bad);
    assert.equal(r.status, 2, r.out);
    assert.match(r.json.broken, /^pnpm-lock\.yaml line 3/);
  } finally {
    done(bad);
  }
});

const TARBALL = 'https://example.invalid/t-1.0.0.tgz';
const withTarball = () =>
  lockfile({ deps: [['a', '^1.0.0', '1.0.0'], ['t', TARBALL, `t@${TARBALL}`]], packages: `${registry()}  t@${TARBALL}:\n    resolution: {tarball: ${TARBALL}}\n\n`, snapshots: `  a@1.0.0: {}\n\n  t@${TARBALL}: {}\n` });
const entry = (over = '') => `  - id: pnpm-lock.yaml#t@${TARBALL}\n    reason: a fork\n    owner: me\n    expires: 2026-12-31\n${over}`;

test('an entry in ci/exceptions.yaml excuses exactly the entry it names, and is listed', () => {
  const dir = project({ 'pnpm-lock.yaml': withTarball(), 'ci/exceptions.yaml': `exceptions:\n${entry()}` });
  try {
    const r = lk1(dir, { CHECK_TODAY: '2026-09-30' });
    assert.equal(r.status, 0, r.out);
    assert.deepEqual(r.json.exempted, [`pnpm-lock.yaml#t@${TARBALL}`]);
    assert.match(r.out, /1 exempted by ci\/exceptions\.yaml/);
    // the day it runs out, it is red again for both reasons
    const late = lk1(dir, { CHECK_TODAY: '2026-12-31' });
    assert.equal(late.status, 1, late.out);
    assert.deepEqual(late.json.findings.map((f) => f.where).sort(), [`pnpm-lock.yaml#t@${TARBALL}`, `registry:pnpm-lock.yaml#t@${TARBALL}`]);
  } finally {
    done(dir);
  }
});

test('an entry whose package is gone from the lockfile is a finding, never a quiet leftover', () => {
  const dir = project({ 'pnpm-lock.yaml': lockfile(), 'ci/exceptions.yaml': `exceptions:\n${entry()}` });
  try {
    const r = lk1(dir, { CHECK_TODAY: '2026-09-30' });
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.json.findings.map((f) => f.where), [`registry:pnpm-lock.yaml#t@${TARBALL}`]);
    assert.match(r.json.findings[0].detail, /matches no entry/);
  } finally {
    done(dir);
  }
});

test('an entry that names a package by a different address excuses nothing', () => {
  const dir = project({ 'pnpm-lock.yaml': withTarball(), 'ci/exceptions.yaml': `exceptions:\n${entry().replace('t-1.0.0', 't-9.9.9')}` });
  try {
    const r = lk1(dir, { CHECK_TODAY: '2026-09-30' });
    assert.equal(r.status, 1, r.out);
    assert.equal(r.json.findings.length, 2, 'the package and the stale entry');
    assert.deepEqual(r.json.exempted, []);
  } finally {
    done(dir);
  }
});

test('FO1 leaves the lockfile entries in ci/exceptions.yaml to LK1', () => {
  const dir = project({
    '.github/workflows/ci.yml': 'name: ci\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n',
    'ci/exceptions.yaml': `exceptions:\n${entry()}`,
  });
  try {
    const r = run('ci/checks/meta/fo1-fail-open.mjs', dir, { CHECK_TODAY: '2026-09-30' });
    assert.equal(r.status, 0, r.out);
    const other = project({
      '.github/workflows/ci.yml': 'name: ci\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n',
      'ci/exceptions.yaml': 'exceptions:\n  - id: .github/workflows/ci.yml#a/gone\n    expires: 2026-12-31\n',
    });
    try {
      assert.equal(run('ci/checks/meta/fo1-fail-open.mjs', other, { CHECK_TODAY: '2026-09-30' }).status, 1, 'an entry that is not a lockfile entry is still judged');
    } finally {
      done(other);
    }
  } finally {
    done(dir);
  }
});

// FO1 skips every `pnpm-lock.yaml#` entry, so LK1 must fail each unsound one: whatever FO1 lets by is judged here.
const unsound = {
  'no date': [entry().replace('    expires: 2026-12-31\n', ''), /no expires/],
  'no reason': [entry().replace('    reason: a fork\n', ''), /no reason/],
  'no owner': [entry().replace('    owner: me\n', ''), /no owner/],
  'an empty owner': [entry().replace('owner: me', 'owner:'), /no owner/],
  'a date that is text': [entry().replace('2026-12-31', 'never'), /not a yyyy-mm-dd day/],
  'a day that does not exist': [entry().replace('2026-12-31', '2026-99-99'), /not a yyyy-mm-dd day/],
  'a day in the past': [entry().replace('2026-12-31', '2026-06-30'), /expired 2026-06-30/],
  'the day it ends': [entry().replace('2026-12-31', '2026-09-30'), /expired 2026-09-30/],
  'a package the lockfile no longer has': [entry().replace('t-1.0.0', 'gone-1.0.0'), /matches no entry/],
  'an id that is only the prefix': [entry().replace(`t@${TARBALL}`, ''), /matches no entry/],
};
for (const [what, [body, message]] of Object.entries(unsound)) {
  test(`LK1 fails an excuse with ${what}, and FO1 (which skips it) does not`, () => {
    const files = {
      'pnpm-lock.yaml': body.includes('gone-1.0.0') || !body.includes(`t@${TARBALL}`) ? lockfile() : withTarball(),
      'ci/exceptions.yaml': `exceptions:\n${body}`,
      '.github/workflows/ci.yml': 'name: ci\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n',
    };
    const dir = project(files);
    try {
      const env = { CHECK_TODAY: '2026-09-30' };
      assert.equal(run('ci/checks/meta/fo1-fail-open.mjs', dir, env).status, 0, 'FO1 skips it');
      const r = lk1(dir, env);
      assert.equal(r.status, 1, r.out);
      const registryFinding = r.json.findings.find((f) => f.where.startsWith('registry:'));
      assert.ok(registryFinding, JSON.stringify(r.json.findings));
      assert.match(registryFinding.detail, message);
      assert.deepEqual(r.json.exempted, [], 'nothing is excused by an unsound entry');
    } finally {
      done(dir);
    }
  });
}

// One rule for a date in ci/exceptions.yaml, whichever check reads the entry.
test('expiryProblem: only a real day in the future applies; today is already ended', () => {
  const today = '2026-09-30';
  assert.equal(expiryProblem('2026-10-01', today), null);
  assert.equal(expiryProblem('2026-09-30', today), 'expired');
  assert.equal(expiryProblem('2026-09-29', today), 'expired');
  for (const v of [undefined, '']) assert.equal(expiryProblem(v, today), 'none');
  for (const v of ['never', 'soon', '2026-99-99', '2026-02-30', '2026-9-30', '20261231', '2026-12-31T00:00', ' 2026-12-31', '9999-12-31x', '+2026-12-31']) {
    assert.equal(expiryProblem(v, today), 'not-a-day', v);
  }
  assert.equal(expiryProblem('2028-02-29', today), null, 'a leap day is a day');
});

test('FO1 refuses a continue-on-error excuse dated `never`, as LK1 refuses a lockfile one', () => {
  const wf = 'name: ci\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - id: s\n        run: echo hi\n        continue-on-error: true\n';
  const dir = project({ '.github/workflows/ci.yml': wf, 'ci/exceptions.yaml': 'exceptions:\n  - id: .github/workflows/ci.yml#a/s\n    expires: never\n' });
  try {
    const r = run('ci/checks/meta/fo1-fail-open.mjs', dir, { CHECK_TODAY: '2026-09-30' });
    assert.equal(r.status, 1, r.out);
    assert.match(r.json.findings.find((f) => f.where.startsWith('registry:')).detail, /not a yyyy-mm-dd day/);
  } finally {
    done(dir);
  }
});
