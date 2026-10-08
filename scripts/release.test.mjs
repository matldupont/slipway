#!/usr/bin/env node
// The release rule (F-10, #232): scripts/release.mjs through its command line, with a package.json and an npm of
// the test's own, and what ci.yml must keep for it. .github/workflows/release.yml itself is held by
// scripts/release-workflow.test.mjs. Internal: `pnpm meta` runs it in slipway, never in a project.
// Nothing here reaches npm or the network: the `npm` it starts is a two-line script that prints a version.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { label, NPM_MIN, summary } from './release.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = '.github/workflows/release.yml';
const work = mkdtempSync(join(tmpdir(), 'slipway-release-'));
test.after(() => rmSync(work, { recursive: true, force: true }));

// A copy of the script beside a package.json at `version`, with `npm` printing `npmVersion` (null: no npm).
let n = 0;
function release(version, npmVersion, args, input = '') {
  const dir = join(work, `case-${n++}`);
  mkdirSync(join(dir, 'bin'), { recursive: true });
  cpSync(join(SRC, 'scripts', 'release.mjs'), join(dir, 'scripts', 'release.mjs'));
  if (version !== null) writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'use-slipway', version }));
  if (npmVersion !== null) {
    writeFileSync(join(dir, 'bin', 'npm'), `#!/bin/sh\necho ${npmVersion}\n`);
    chmodSync(join(dir, 'bin', 'npm'), 0o755);
  }
  // Run from another folder: the version is the one beside the script, not the working directory's.
  return spawnSync(process.execPath, [join(dir, 'scripts', 'release.mjs'), ...args], { cwd: work, input, encoding: 'utf8', env: { PATH: join(dir, 'bin') } });
}
const refused = (r, ...named) => {
  assert.equal(r.status, 1, r.stderr);
  assert.equal(r.stdout, '', 'a refusal prints nothing on stdout');
  for (const text of named) assert.ok(r.stderr.includes(text), `stderr does not name ${text}:\n${r.stderr}`);
};

test('a tag equal to a plain version is staged as latest', () => {
  const r = release('0.2.0', '11.19.0', ['v0.2.0']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'label=latest\n');
});

test('a tag equal to a pre-release version is staged as next', () => {
  const r = release('0.2.0-rc.1', '11.19.0', ['v0.2.0-rc.1']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, 'label=next\n');
});

test('a tag that is not this version, or not a release tag, is refused with both named', () => {
  refused(release('0.2.1', '11.19.0', ['v0.2.0']), '"v0.2.0"', '"0.2.1"');
  refused(release('0.2.0', '11.19.0', ['0.2.0']), '"0.2.0"');
  refused(release('0.2.0', '11.19.0', ['v0.2']), '"v0.2"', '"0.2.0"');
  refused(release('0.2.0', '11.19.0', ['v0.2.0+build']), '"v0.2.0+build"', '"0.2.0"');
  refused(release('0.2.0+build', '11.19.0', ['v0.2.0+build']), '"v0.2.0+build"', '"0.2.0+build"');
  refused(release('0.2.0', '11.19.0', ['v0.2.0\n']), '"v0.2.0\\n"', '"0.2.0"');
  refused(release('0.2.0', '11.19.0', ['v0.2.0\nlabel=latest']), '"v0.2.0\\nlabel=latest"');
  refused(release('0.2.0-', '11.19.0', ['v0.2.0-']), '"v0.2.0-"');
  refused(release('0.2.0', '11.19.0', ['V0.2.0']), '"V0.2.0"');
  // a pre-release version under a plain tag is a mismatch, never `latest`
  refused(release('0.2.0-rc.1', '11.19.0', ['v0.2.0']), '"v0.2.0"', '"0.2.0-rc.1"');
});

test('an npm that cannot stage is refused, naming the version needed and the one found', () => {
  refused(release('0.2.0', '11.14.9', ['v0.2.0']), '11.15.0', '11.14.9');
  refused(release('0.2.0', '10.99.99', ['v0.2.0']), '11.15.0', '10.99.99');
  assert.equal(release('0.2.0', '11.15.0', ['v0.2.0']).stdout, 'label=latest\n');
  assert.equal(release('0.2.0', '12.0.0', ['v0.2.0']).stdout, 'label=latest\n');
  assert.equal(NPM_MIN, '11.15.0');
  // a version it cannot compare is not a pass
  refused(release('0.2.0', '11.15.0-pre.1', ['v0.2.0']), '11.15.0', '11.15.0-pre.1');
  refused(release('0.2.0', null, ['v0.2.0']), '11.15.0', 'ENOENT');
  assert.throws(() => label('v0.2.0', '0.2.0', undefined), /11\.15\.0/);
});

test('no tag, two arguments or no readable version is refused', () => {
  refused(release('0.2.0', '11.19.0', []), 'usage');
  refused(release('0.2.0', '11.19.0', ['v0.2.0', 'v0.2.0']), 'usage');
  refused(release(null, '11.19.0', ['v0.2.0']), '"v0.2.0"', 'ENOENT');
  assert.throws(() => label('v0.2.0', undefined, '11.19.0'), /"v0\.2\.0"/);
  assert.throws(() => label(undefined, '0.2.0', '11.19.0'), /"0\.2\.0"/);
});

const PACK = { name: 'use-slipway', version: '0.2.0', integrity: 'sha512-abc==', shasum: '0123abcd', entryCount: 3, files: [{ path: 'package.json' }, { path: 'scripts/sync.mjs' }, { path: 'a```b\u001B[2K.md' }, { path: 'gpj\u202E.exe\u200B\u2028x' }] };

test('the summary shows the package, its hashes, the file count and every file, as text', () => {
  const r = release('0.2.0', null, ['--summary'], JSON.stringify([PACK]));
  assert.equal(r.status, 0, r.stderr);
  for (const text of ['use-slipway', '0.2.0', 'sha512-abc==', '0123abcd', 'files:     4', 'package.json', 'scripts/sync.mjs']) assert.ok(r.stdout.includes(text), text);
  // a file's name cannot close the block it is shown in, and holds no control character
  assert.ok(r.stdout.includes('a```b[2K.md'), r.stdout);
  // nor one that reorders or hides text, or starts a line
  assert.ok(r.stdout.includes('\ngpj.exe x\n'), r.stdout);
  assert.equal(r.stdout.split('\n').filter((l) => l === '````').length, 4, r.stdout);
  assert.ok(!r.stdout.split('\n').includes('```'));
  assert.equal(summary(JSON.stringify([{ ...PACK, files: [{ path: 'x' }] }])).split('\n').filter((l) => l === '```').length, 4);
});

test('a summary of anything but npm\'s list is refused', () => {
  for (const input of ['', 'not json', '[]', '{}', JSON.stringify([{ ...PACK, integrity: undefined }]), JSON.stringify([{ ...PACK, shasum: '' }]), JSON.stringify([{ ...PACK, files: [] }]), JSON.stringify([{ ...PACK, files: [{}] }])]) {
    refused(release('0.2.0', null, ['--summary'], input), 'npm pack --dry-run --json');
  }
});

test('release.mjs imports nothing but node: built-ins, so the identity job runs one file of the repository', () => {
  const src = readFileSync(join(SRC, 'scripts', 'release.mjs'), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  assert.ok(specifiers.length >= 4, 'no import was read');
  assert.deepEqual(specifiers.filter((s) => !s.startsWith('node:')), []);
  assert.ok(!/\bimport\s*\(\s*[^'")\s]/.test(src), 'an import() of a computed name');
});

// What ci.yml's meta job must keep that W1 does not read: [] when it does. W1 holds the rule this test once held
// for it: a gate counts only when a workflow that runs on a pull request or a push to a branch runs it, so
// release.yml's own `pnpm meta`, on tags, no longer covers for that step gone from ci.yml (#239). WHY THESE STAY:
// W1 counts either event, any branch, and the left side of `||`, and reads no step order and no `if:`. So this
// still requires both triggers with the push on main, N1 before `pnpm meta`, `pnpm meta` alone on its line, and
// a meta job nothing switches off.
function ciProblems(text) {
  const problems = [];
  const on = /^on:\n((?:(?: .*)?\n)+)/m.exec(text)?.[1] ?? '';
  if (!/^ {2}pull_request:/m.test(on)) problems.push('ci.yml does not run on pull requests');
  if (!/^ {2}push:\n {4}branches: \[main\]/m.test(on)) problems.push('ci.yml does not run on a push to main');
  const meta = /^ {2}meta:\n((?:(?: {3}.*)?\n)+)/m.exec(text)?.[1] ?? '';
  const lines = meta.split('\n').filter((l) => !/^\s*#/.test(l));
  const at = (re) => lines.findIndex((l) => re.test(l));
  // No `pnpm meta` step at all is W1's finding, not one of these.
  const gate = at(/^ {6,8}(?:- )?run: pnpm meta(\s|$)/);
  const n1 = at(/^ {8}run: node ci\/checks\/meta\/n1-node-modules\.mjs \.\s*$/);
  if (gate >= 0 && !/run: pnpm meta\s*$/.test(lines[gate])) problems.push('ci.yml\'s meta job runs pnpm meta with something after it');
  if (n1 < 0 || (gate >= 0 && n1 > gate)) problems.push('ci.yml\'s meta job does not run N1 before pnpm meta');
  if (/^ {4}(if|continue-on-error)\s*:/m.test(meta)) problems.push('ci.yml\'s meta job is conditional');
  return problems;
}

test('ci.yml keeps what W1 does not read: both triggers, main, N1 before pnpm meta, nothing after it, no condition', () => {
  const yml = readFileSync(join(SRC, '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.deepEqual(ciProblems(yml), []);
  const broken = (from, to, expected) => {
    assert.ok(yml.includes(from), `ci.yml no longer holds ${JSON.stringify(from)}`);
    const found = ciProblems(yml.replace(from, to));
    assert.ok(found.some((p) => expected.test(p)), `${JSON.stringify(to)} went unnoticed: ${JSON.stringify(found)}`);
  };
  broken('      - run: pnpm meta\n', '      - run: pnpm meta || true\n', /with something after it/);
  broken('      - run: pnpm meta\n', '      - name: gate\n        run: pnpm meta || true\n', /with something after it/);
  broken('        run: node ci/checks/meta/n1-node-modules.mjs .\n      - run: pnpm meta\n', '        run: echo skipped\n      - run: pnpm meta\n', /does not run N1 before/);
  broken('        run: node ci/checks/meta/n1-node-modules.mjs .\n      - run: pnpm meta\n', '        run: echo skipped\n', /does not run N1 before/);
  broken('  pull_request:\n', '', /does not run on pull requests/);
  broken('    branches: [main]', '    branches: [release]', /does not run on a push to main/);
  broken('    name: meta\n', '    name: meta\n    if: false\n', /meta job is conditional/);
});

// The case that moved to W1, on a copy of slipway's own workflows: with `pnpm meta` gone from ci.yml and
// release.yml still running it on tags, nothing that runs on a pull request or a push to a branch runs a check.
test('W1 fails a copy of the workflows whose ci.yml no longer runs pnpm meta, whatever release.yml runs', () => {
  const dir = join(work, 'w1-copy');
  for (const p of ['package.json', 'dev/ownership.yaml', 'scripts/new-project.mjs', '.github/workflows', 'ci/checks/meta']) {
    cpSync(join(SRC, p), join(dir, p), { recursive: true });
  }
  const w1 = () => spawnSync(process.execPath, [join(SRC, 'ci', 'checks', 'meta', 'w1-declared-vs-invoked.mjs'), dir], { encoding: 'utf8' });
  const ci = join(dir, '.github', 'workflows', 'ci.yml');
  const yml = readFileSync(ci, 'utf8');
  assert.match(readFileSync(join(dir, WORKFLOW), 'utf8'), /^ +- run: pnpm meta$/m);
  const whole = w1();
  assert.doesNotMatch(whole.stdout, /check:w1-declared-vs-invoked\.mjs/, whole.stdout);
  assert.ok(yml.includes('      - run: pnpm meta\n'));
  writeFileSync(ci, yml.replace('      - run: pnpm meta\n', ''));
  const cut = w1();
  assert.equal(cut.status, 1, cut.stdout + cut.stderr);
  assert.match(cut.stdout, /check:w1-declared-vs-invoked\.mjs: the check exists, but no CI workflow runs it on a pull request or a push to a branch/);
});
