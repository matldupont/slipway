#!/usr/bin/env node
// The lockfile reader LK1 stands on (ci/checks/lib/pnpm-lock.mjs): a real lockfile pnpm 10.25 wrote, the
// resolution shapes it reads, and the constructs it refuses because a YAML reader and this one could take
// them two ways. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkLockfile, parseLockfile } from '../ci/checks/lib/pnpm-lock.mjs';
import { HASH, HEAD, lockfile, registry } from './lib/lk1-lockfile.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
