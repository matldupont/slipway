#!/usr/bin/env node
// ID1 (ci/checks/meta/id1-ids.mjs): the green runs and the file kinds a fixture cannot hold (a link, a directory);
// PC1 covers ID1's known-bad fixtures (ci/fixtures/known-bad/id1/*). Also pins the Planning-flow bullet that tells a
// session how to claim an id (#368). Every file here is inert text. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from './lib/lk1-lockfile.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const doc = (n, companion) => `---\nstatus: draft\n${companion ? `companion-of: ${companion}\n` : ''}---\n\n# F-${n} — x\n`;
const id1 = (files, after = () => {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'id1-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    after(dir);
    const r = run('ci/checks/meta/id1-ids.mjs', dir);
    return { status: r.status, findings: (r.json?.findings ?? []).map((f) => f.where), json: r.json };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const A = 'docs/features/a.md';

test('distinct ids pass, and a quoted or fenced id is not a declaration', () => {
  const r = id1({
    'decisions.md': '## D-1 — a\n\nSee D-1.\n\n```\n## D-1 — b\n```\n\n<!--\n## D-1 — c\n-->\n\n## D-2 — d *(open — week 1)*\n',
    [A]: doc('1'),
    'docs/features/b.md': doc('2'),
  });
  assert.deepEqual([r.status, r.findings, r.json.scanned], [0, [], 4]);
});

test('ids compare by number: D-9 and D-009, F-2 and F-02', () => {
  assert.deepEqual(id1({ 'decisions.md': '## D-9 — a\n\n## D-009 — b\n' }).findings, ['decisions.md#decision/duplicate/D-9']);
  assert.deepEqual(id1({ [A]: doc('2'), 'docs/features/b.md': doc('02') }).findings, ['docs/features/b.md#feature/duplicate/F-02']);
});

test('several companions of one primary pass; a companion in the other folder passes', () => {
  const r = id1({ [A]: doc('3'), 'docs/features/b.md': doc('3', A), 'dev/features/c.md': doc('3', A), 'dev/features/d.md': doc('3', A) });
  assert.deepEqual([r.status, r.findings], [0, []]);
});

test('three docs with one id fail unless all but one name the primary', () => {
  const r = id1({ [A]: doc('3'), 'docs/features/b.md': doc('3', A), 'docs/features/c.md': doc('3') });
  assert.deepEqual(r.findings, ['docs/features/c.md#feature/duplicate/F-03']);
});

test('a companion that names a link or a directory is missing: the check never passes what it cannot read', () => {
  const r = id1({ [A]: doc('4'), 'docs/features/l.md': doc('4', 'docs/features/link.md'), 'docs/features/dd.md': doc('4', 'docs/features/sub') }, (dir) => {
    symlinkSync(join(dir, A), join(dir, 'docs/features/link.md'));
    mkdirSync(join(dir, 'docs/features/sub'));
  });
  assert.deepEqual(r.findings, ['docs/features/dd.md#companion/missing', 'docs/features/l.md#companion/missing']);
});

test('a doc that names itself is a chain', () => {
  assert.deepEqual(id1({ [A]: doc('5', A) }).findings, [`${A}#companion/chain`]);
});

test('nothing to read is broken, not green', () => {
  assert.equal(id1({ 'README.md': 'x\n' }).status, 2);
});

test('process/slipway-rules.md tells a session how to claim an id (#368)', () => {
  const rules = readFileSync(join(SRC, 'process', 'slipway-rules.md'), 'utf8').replace(/\s*\n\s*/g, ' ');
  assert.match(
    rules,
    /A session taking a new decision or feature id reads `main`, the open pull requests and the remote's branches first, makes the entry that carries the id its first commit, and pushes the branch before any further work \(ID1 holds two of one id apart\)\./,
  );
});
