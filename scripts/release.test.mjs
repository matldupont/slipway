#!/usr/bin/env node
// The release rule and the workflow that runs it (F-10, #232): scripts/release.mjs through its command line, with
// a package.json and an npm of the test's own, and .github/workflows/release.yml read for what it must never
// hold. Internal: `pnpm meta` runs it in slipway, never in a project. Nothing here reaches npm or the network:
// the `npm` it starts is a two-line script that prints a version.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify, loadOwnership } from '../ci/checks/lib/ownership.mjs';
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
  cpSync(join(SRC, 'scripts', 'lib', 'ui.mjs'), join(dir, 'scripts', 'lib', 'ui.mjs'));
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
  // the label is the version's: a pre-release version under a plain tag is a mismatch, never `latest`
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

const PACK = { name: 'use-slipway', version: '0.2.0', integrity: 'sha512-abc==', shasum: '0123abcd', entryCount: 3, files: [{ path: 'package.json' }, { path: 'scripts/sync.mjs' }, { path: 'a```b\u001B[2K.md' }] };

test('the summary shows the package, its hashes, the file count and every file, as text', () => {
  const r = release('0.2.0', null, ['--summary'], JSON.stringify([PACK]));
  assert.equal(r.status, 0, r.stderr);
  for (const text of ['use-slipway', '0.2.0', 'sha512-abc==', '0123abcd', 'files:     3', 'package.json', 'scripts/sync.mjs']) assert.ok(r.stdout.includes(text), text);
  // a file's name cannot close the block it is shown in, and holds no control character
  assert.ok(r.stdout.includes('a```b[2K.md'), r.stdout);
  assert.equal(r.stdout.split('\n').filter((l) => l === '````').length, 4, r.stdout);
  assert.ok(!r.stdout.split('\n').includes('```'));
  assert.equal(summary(JSON.stringify([{ ...PACK, files: [{ path: 'x' }] }])).split('\n').filter((l) => l === '```').length, 4);
});

test('a summary of anything but npm\'s list is refused', () => {
  for (const input of ['', 'not json', '[]', '{}', JSON.stringify([{ ...PACK, integrity: undefined }]), JSON.stringify([{ ...PACK, files: [] }]), JSON.stringify([{ ...PACK, files: [{}] }])]) {
    refused(release('0.2.0', null, ['--summary'], input), 'npm pack --dry-run --json');
  }
});

// What release.yml must never hold, read from its text: [] when it keeps the rules. `run:` lines are read whole,
// comments included: GitHub fills `${{ }}` in before the shell sees a comment.
function workflowProblems(text) {
  const problems = [];
  const lines = text.split(/\r?\n/);
  const indentOf = (l) => l.length - l.trimStart().length;
  const unquote = (v) => v.replace(/\s+#.*$/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
  const key = (name) => new RegExp(`^\\s*(?:-\\s+)?["']?${name}["']?\\s*:\\s*(.*)$`);
  const holders = [];
  let inJobs = false;
  let job = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(#.*)?$/.test(line)) continue;
    const ind = indentOf(line);
    if (ind === 0) {
      inJobs = /^jobs\s*:/.test(line);
      job = null;
    } else if (inJobs && ind === 2) {
      job = line.trim().replace(/\s*:.*$/, '');
    }
    const where = job ?? 'the top level';
    const token = key('id-token').exec(line);
    if (token && unquote(token[1]) !== 'none') holders.push(where);
    const uses = key('uses').exec(line);
    if (uses) {
      const action = unquote(uses[1]);
      if (!/@[0-9a-f]{40}$/.test(action)) problems.push(`${where}: ${action} is not pinned by a 40-character commit sha`);
      if (job === 'publish' && !action.startsWith('actions/')) problems.push(`publish: ${action} is not one of GitHub's own actions`);
    }
    const run = key('run').exec(line);
    if (run) {
      const body = [run[1]];
      while (i + 1 < lines.length && (/^\s*$/.test(lines[i + 1]) || indentOf(lines[i + 1]) > ind)) body.push(lines[++i]);
      if (body.some((l) => l.includes('${{'))) problems.push(`${where}: a run: line holds \${{`);
    }
  }
  if (holders.join() !== 'publish') problems.push(`id-token is held by ${holders.join(', ') || 'nothing'}, not by publish alone`);
  return problems;
}

test('release.yml: only publish holds the identity, every action is pinned by sha, no run: line takes event text, and publish uses GitHub\'s own actions', () => {
  const yml = readFileSync(join(SRC, WORKFLOW), 'utf8');
  assert.deepEqual(workflowProblems(yml), []);
  assert.ok(/^ {6}id-token: write$/m.test(yml) && (yml.match(/uses:/g) ?? []).length >= 5 && (yml.match(/run:/g) ?? []).length >= 6, 'the reader has something to read');

  // Each rule, broken on a copy: the reader must say so.
  const sha = 'a'.repeat(40);
  const broken = (from, to, expected) => {
    assert.ok(yml.includes(from), `release.yml no longer holds ${JSON.stringify(from)}`);
    const found = workflowProblems(yml.replace(from, to));
    assert.ok(found.some((p) => expected.test(p)), `${JSON.stringify(to)} went unnoticed: ${JSON.stringify(found)}`);
  };
  broken('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    permissions:\n      id-token: write\n', /held by check, publish/);
  broken('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  id-token: write\n', /held by the top level, publish/);
  broken('      id-token: write\n', '', /held by nothing/);
  broken(/actions\/checkout@[0-9a-f]{40}/.exec(yml)[0], 'actions/checkout@v7', /check: actions\/checkout@v7 is not pinned/);
  broken(/actions\/setup-node@[0-9a-f]{40}/.exec(yml)[0], `actions/setup-node@${sha.slice(1)}`, /is not pinned/);
  broken('run: pnpm meta', 'run: echo ${{ github.ref_name }}', /check: a run: line holds/);
  broken('run: pnpm meta', 'run: |\n          pnpm meta\n          # ${{ github.event.head_commit.message }}', /check: a run: line holds/);
  broken('run: node scripts/release.mjs "$TAG"', 'run: node scripts/release.mjs "${{ github.ref_name }}"', /publish: a run: line holds/);
  broken('          registry-url:', `          registry-url: x\n      - uses: pnpm/action-setup@${sha}\n        with:\n          registry-url:`, /publish: pnpm\/action-setup@a+ is not one of GitHub's own/);
});

test('release.yml is slipway\'s own, and this file is on the meta line', () => {
  assert.equal(classify(loadOwnership(SRC), WORKFLOW), 'internal');
  const meta = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).scripts.meta.split(/\s*&&\s*/);
  assert.ok(meta.includes('node scripts/release.test.mjs'), 'scripts/release.test.mjs is not in the meta script');
});
