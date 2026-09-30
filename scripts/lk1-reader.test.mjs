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
  const { entries, problems } = checkLockfile(doc, new Set(['packages/a', 'packages/b']));
  assert.deepEqual(
    problems.map((p) => [p.kind, p.id]).sort(),
    [
      ['file', 'dirdep@file:dirdep{directory=dirdep;type=directory}'],
      ['file', 'dirdep@file:dirtgz-1.0.0.tgz{tarball=file:dirtgz-1.0.0.tgz}'],
      ['link', 'importers/./linked@link:ext'],
      ['link', 'snapshots/is-number@3.0.0/kind-of@link:ext'],
      ['tarball', 'is-obj@https://codeload.github.com/sindresorhus/is-obj/tar.gz/e8f8abd81d2207a2d130b1d792cb7385f9ef0f00{tarball=https://codeload.github.com/sindresorhus/is-obj/tar.gz/e8f8abd81d2207a2d130b1d792cb7385f9ef0f00}'],
      ['tarball', 'is-plain-obj@https://codeload.github.com/sindresorhus/is-plain-obj/tar.gz/666df7c10035f7e26f27ec214fe5ae3173435f34{tarball=https://codeload.github.com/sindresorhus/is-plain-obj/tar.gz/666df7c10035f7e26f27ec214fe5ae3173435f34}'],
    ]
  );
  assert.equal(entries, doc.get('packages').size + [...doc.get('importers').values()].reduce((n, i) => n + (i.get('dependencies')?.size ?? 0), 0));
});

// pnpm writes `link:<path>` for every workspace dependency, whatever the specifier says (`workspace:*`, `link:…`, a range).
// A link passes when its target is a workspace package folder: inside the repository root, matched by a
// `pnpm-workspace.yaml` glob, with its own package.json. LK1 hands the folders it found in `dirs`.
const WORKSPACE = ['apps/api', 'packages/db'];
const linkKinds = (importer, version, { specifier = 'workspace:*', dirs = WORKSPACE, snapshot = false } = {}) => {
  const text = snapshot
    ? lockfile({ deps: [], packages: registry(), snapshots: `  a@1.0.0:\n    dependencies:\n      db: ${version}\n` })
    : `${HEAD}importers:\n\n  ${importer}:\n    dependencies:\n      db:\n        specifier: ${specifier}\n        version: ${version}\n\npackages: {}\n\nsnapshots: {}\n`;
  return checkLockfile(parseLockfile(text), new Set(dirs)).problems.map((p) => p.kind);
};

test('a link: passes when its target is a workspace package folder, whatever the specifier', () => {
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/db'), [], 'the shape pnpm writes for a workspace dependency');
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/db', { specifier: 'link:../../packages/db' }), [], 'a link: specifier');
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/db', { specifier: '^1.0.0' }), [], 'the target decides, not the specifier');
  assert.deepEqual(linkKinds('.', 'link:packages/db'), [], 'from the root importer');
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/../packages/db'), [], 'a path that folds to the folder');
  assert.deepEqual(linkKinds('x', 'link:packages/db', { snapshot: true }), [], 'an override link in a snapshot, relative to the root');
});

test('a link: to anything but a workspace package folder is a problem', () => {
  assert.deepEqual(linkKinds('apps/api', 'link:../../../outside'), ['link'], 'outside the repository root');
  assert.deepEqual(linkKinds('apps/api', 'link:../../tools/x'), ['link'], 'a folder in the repository that no workspace glob covers');
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/db/src'), ['link'], 'a folder inside a workspace package');
  assert.deepEqual(linkKinds('apps/api', 'link:../..'), ['link'], 'the repository root');
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/db', { dirs: ['apps/api'] }), ['link'], 'a folder the workspace does not include');
  assert.deepEqual(linkKinds('apps/api', 'link:../../packages/db', { dirs: [] }), ['link'], 'no workspace at all');
  assert.deepEqual(linkKinds('x', 'link:ext', { snapshot: true }), ['link'], 'an override link to a folder outside the workspace');
  assert.deepEqual(linkKinds('x', 'link:../../packages/db', { snapshot: true }), ['link'], 'a snapshot link that leaves the root');
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

test('an integrity hash does not make a registry release of an entry whose key names another source', () => {
  const kind = (key) => checkLockfile(parseLockfile(lockfile({ deps: [], packages: `  ${key}:\n    resolution: {integrity: ${HASH}}\n\n`, snapshots: '' })), new Set(['.'])).problems.map((p) => `${p.kind}:${p.id}`);
  assert.deepEqual(kind('a@1.0.0'), []);
  assert.deepEqual(kind('a@https://example.invalid/a.tgz'), ['tarball:a@https://example.invalid/a.tgz{}']);
  assert.deepEqual(kind('a@file:a.tgz'), ['file:a@file:a.tgz{}']);
  assert.deepEqual(kind('a@git+https://example.invalid/a.git#abc'), ['git:a@git+https://example.invalid/a.git#abc{}']);
  assert.deepEqual(kind('a@github:acme/a'), ['git:a@github:acme/a{}']);
  assert.deepEqual(kind('a@latest'), ['other:a@latest{}']);
  assert.deepEqual(kind("'@s/a@1.0.0'"), []);
});

test('a real pnpm 10.25 lockfile whose registry packages carry a multi-line deprecated message is a pass, not BROKEN', () => {
  const doc = parseLockfile(readFileSync(join(SRC, 'scripts/fixtures/lk1/pnpm10-deprecated.lock.yaml'), 'utf8'));
  const { entries, problems } = checkLockfile(doc, new Set(['.']));
  assert.deepEqual(problems, []);
  assert.match(doc.get('packages').get('graphql-tools@4.0.8').get('deprecated'), /block scalar/);
  assert.ok(entries > 10);
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
  'a block scalar as a sequence item': [`${HEAD}ignoredOptionalDependencies:\n  - |\n    text\n`, /block scalar as a sequence item/],
  'a value that is an indicator': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: - x\n`, /anchor, alias, tag/],
  'a merge key': [`${HEAD}packages:\n  <<: {a: b}\n`, /key this reader does not take/],
  'a multi-line quoted value': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: 'one\n      two'\n`, /quoted value/],
  'an escape YAML does not have': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: "a\\qb"\n`, /escape this reader does not take/],
  'a code point beyond Unicode': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: "\\U00110000"\n`, /beyond U\+10FFFF/],
  'a tab in the indentation': [`${HEAD}packages:\n\ta@1.0.0: {}\n`, /tab/],
  'a value indented under a scalar': [`${HEAD}packages:\n  a@1.0.0: x\n    resolution: y\n`, /takes no lines/],
  'a sequence at its key\'s indent': [`${HEAD}packages:\n- a\n`, /not a "key: value"|sequence/],
  'a document marker': [`---\n${HEAD}`, /"key: value"|key this reader/],
  'a complex key': [`${HEAD}? a\n: b\n`, /"key: value"|key this reader/],
  'a plain value holding "key: value"': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: a: b\n`, /"key: value" text/],
  'a flow mapping that does not close': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: x\n`, /does not close/],
  'text after a flow mapping': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: x} y\n`, /after a flow/],
  'a carriage return': [`${HEAD.replace('\n\n', '\r\n\r\n')}packages: {}\n`, /U\+000D/],
  'a right-to-left override in a package name': [`${HEAD}packages:\n  a\u202e@1.0.0: {}\n`, /hidden or formatting character U\+202E/],
  'a zero-width space in a resolution': [`${HEAD}packages:\n  a@1.0.0:\n    resolution: {integrity: x\u200b}\n`, /hidden or formatting character U\+200B/],
  'a next-line character in a message': [`${HEAD}packages:\n  a@1.0.0:\n    deprecated: |\n      a\u0085b\n`, /U\+0085/],
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

// --- text pnpm writes for free-form messages, and what must never be read into a structure ---

const problems = (text) => checkLockfile(parseLockfile(text), new Set(['.'])).problems;
const withEntry = (fields, extra = '') => lockfile({ packages: `  a@1.0.0:\n    resolution: {integrity: ${HASH}}\n${fields}\n${extra}` });

test('a deprecated message pnpm writes as a block scalar, quoted with escapes, or with a zero-width space, is read and judged as before', () => {
  const messages = [
    '    deprecated: |-\n      first line\n      second: line\n        # not a comment\n      resolution: {tarball: https://example.invalid/hidden.tgz}\n    hasBin: true',
    '    deprecated: >+\n      folded\n\n      text\n    hasBin: true',
    '    deprecated: |2-\n        indented first line\n    hasBin: true',
    '    deprecated: "tab\\there \\_ nbsp \\u00e9 \\" \\\\ \\x41"\n    hasBin: true',
    '    deprecated: soft\u00adhyphen and zero\u200bwidth and \u202e bidi\n    hasBin: true',
  ];
  for (const m of messages) {
    const doc = parseLockfile(withEntry(m));
    assert.deepEqual(problems(withEntry(m)), [], m);
    assert.equal(doc.get('packages').get('a@1.0.0').get('hasBin'), 'true', `the field after the message is read: ${m}`);
  }
  const doc = parseLockfile(withEntry(messages[3]));
  assert.equal(doc.get('packages').get('a@1.0.0').get('deprecated'), 'tab\there \u00a0 nbsp é " \\ A', 'YAML escapes are decoded');
});

test('a block scalar hides nothing that is outside it: its lines end at the key\'s indent, and its text is never read', () => {
  const after = `  a@1.0.0:\n    resolution: {integrity: ${HASH}}\n    deprecated: |\n      text\n  b@1.0.0:\n    resolution: {tarball: https://example.invalid/b.tgz}\n`;
  assert.deepEqual(problems(lockfile({ packages: after })).map((p) => p.kind), ['tarball'], 'the entry after a block scalar is read');
  assert.deepEqual(problems(lockfile({ packages: `  a@1.0.0:\n    resolution: |\n      {integrity: ${HASH}}\n` })).map((p) => p.kind), ['other'], 'a resolution that is a block scalar is not a registry release');
});

test('an escaped key is the key YAML reads: "resol\\x75tion" is resolution', () => {
  assert.deepEqual(problems(lockfile({ packages: '  a@1.0.0:\n    "resol\\x75tion": {tarball: https://example.invalid/a.tgz}\n' })).map((p) => p.kind), ['tarball']);
});

test('a line that starts with a non-ASCII space and # is a key here, as it is to YAML, never a comment', () => {
  for (const space of ['\u00a0', '\u1680', '\u2000', '\u2003', '\u200a', '\u202f', '\u205f', '\u3000']) {
    const text = lockfile({ packages: `${registry()}  ${space}#foo@https://example.invalid/x.tgz: {resolution: {tarball: https://example.invalid/x.tgz}, version: 1.0.0}\n\n` });
    const found = problems(text).map((p) => p.kind);
    assert.deepEqual(found, ['tarball'], `U+${space.codePointAt(0).toString(16)}: the line is a package entry, not a comment`);
    assert.match(problems(text)[0].id, /^.#foo@https:/);
  }
  const trailing = lockfile({ packages: `  a@1.0.0:\n    resolution: {integrity: ${HASH}}\n    hasBin: true\u3000\n` });
  assert.equal(parseLockfile(trailing).get('packages').get('a@1.0.0').get('hasBin'), 'true\u3000', 'trailing non-ASCII space stays in the value');
});

test('a very long run of spaces is read in time proportional to its length', () => {
  const t = Date.now();
  parseLockfile(withEntry(`    deprecated: x${' '.repeat(400_000)}y`));
  assert.ok(Date.now() - t < 3000, `${Date.now() - t} ms`);
});

test('a reference no entry answers to is a problem where it is written', () => {
  const dangling = lockfile({ deps: [['a', 'https://example.invalid/a.tgz', 'a@https://example.invalid/a.tgz']], packages: '', snapshots: '' }).replace('packages:\n\nsnapshots', 'packages: {}\n\nsnapshots');
  assert.deepEqual(problems(dangling).map((p) => `${p.kind}:${p.id}`), ['tarball:importers/./a@a@https://example.invalid/a.tgz']);
  assert.deepEqual(problems(lockfile()), []);
});

test('an integrity is a whole sha hash, and a version is a semver', () => {
  const kinds = (resolutionOrKey) => {
    const [key, integrity] = Array.isArray(resolutionOrKey) ? resolutionOrKey : ['a@1.0.0', resolutionOrKey];
    return problems(lockfile({ deps: [], packages: `  ${key}:\n    resolution: {integrity: ${integrity}}\n`, snapshots: '' })).map((p) => p.kind);
  };
  assert.deepEqual(kinds(`sha1-${'A'.repeat(27)}=`), []);
  assert.deepEqual(kinds('sha1-short'), ['other']);
  assert.deepEqual(kinds(`sha1-${'A'.repeat(40)}`), ['other']);
  assert.deepEqual(kinds(`sha256-${'A'.repeat(43)}=`), []);
  assert.deepEqual(kinds(`sha384-${'A'.repeat(64)}`), []);
  assert.deepEqual(kinds(`sha512-${'A'.repeat(86)}=`), ['other']);
  assert.deepEqual(kinds(['a@1.0.0-beta.1+build.5', HASH]), []);
  assert.deepEqual(kinds(['a@1.0.0-be!ta', HASH]), ['other']);
  assert.deepEqual(kinds(['a@1.0', HASH]), ['other']);
});

test('two different resolutions never share an excuse id', () => {
  const id = (resolution) => problems(lockfile({ deps: [], packages: `  a@1.0.0:\n    resolution: ${resolution}\n`, snapshots: '' }))[0].id;
  assert.notEqual(id('{commit: abc, repo: https://example.invalid/r.git, type: git}'), id("{commit: abc, repo: 'https://example.invalid/r.git;type=git'}"));
  assert.notEqual(id("{tarball: 'https://example.invalid/a;b=c'}"), id("{tarball: 'https://example.invalid/a', b: c}"));
  assert.equal(id('{tarball: https://example.invalid/a.tgz}'), 'a@1.0.0{tarball=https://example.invalid/a.tgz}', 'an ordinary address is unchanged');
});

test('a flow value followed by a very long run of spaces is read in time proportional to its length', () => {
  const t = Date.now();
  assert.throws(() => parseLockfile(lockfile({ packages: `  a@1.0.0:\n    resolution: {integrity: ${HASH}, a: b${' '.repeat(400_000)}#}\n` })), /flow value/, 'the comment character is refused in a flow value');
  assert.ok(Date.now() - t < 3000, `${Date.now() - t} ms`);
});
