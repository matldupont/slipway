#!/usr/bin/env node
// #495: every check and status reads a document's header through one reader, ci/checks/lib/frontmatter.mjs. The
// callers are listed here, and a file under ci/ (or the sync, which reads lessons) that finds a header block itself
// fails, so a second reader cannot come back unnoticed. A header that reads the same as LF in CRLF reads the same to
// the checks and to status. Every file here is inert text in a temporary folder. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { frontmatter, isUnreadable, UNREADABLE, withoutHeader } from '../ci/checks/lib/frontmatter.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const READER = 'ci/checks/lib/frontmatter.mjs';

// Every script under ci/ but the fixtures, and the sync's reader of lessons.
const scripts = (dir) => readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((e) => {
  const p = `${dir}/${e.name}`;
  if (e.isDirectory()) return p === 'ci/fixtures' ? [] : scripts(p);
  return /\.m?js$/.test(e.name) ? [p] : [];
});
const SOURCES = [...scripts('ci'), 'scripts/adopt.mjs'].sort();

// The files that read a header, each through the one reader. A new caller is added here on purpose.
const CALLERS = [
  'ci/checks/lib/decisions.mjs',
  'ci/checks/lib/feature-docs.mjs',
  'ci/checks/lib/fit.mjs',
  'ci/checks/lib/markdown.mjs',
  'ci/checks/lib/milestones.mjs',
  'ci/checks/meta/k1-frame.mjs',
  'ci/checks/meta/l1-lessons.mjs',
  'ci/checks/meta/ms1-milestones.mjs',
  'ci/status.mjs',
  'scripts/adopt.mjs',
];

// What finding a header block looks like in a script: a pattern that starts at `^---`, or a test of a text's first
// three characters for `---`.
const OWN_READER = /\^---|startsWith\(\s*['"`]---|slice\(\s*0\s*,\s*3\s*\)\s*===?\s*['"`]---/;

test('the header readers: one parser, and the files that call it, listed', () => {
  const calls = SOURCES.filter((p) => {
    const js = readFileSync(join(SRC, p), 'utf8');
    return p !== READER && /\b(?:frontmatter|withoutHeader)\(/.test(js) && /from '[^']*\/frontmatter\.mjs'/.test(js);
  });
  assert.deepEqual(calls, CALLERS);
});

test('no script but the one reader finds a header block itself', () => {
  const own = SOURCES.filter((p) => p !== READER && OWN_READER.test(readFileSync(join(SRC, p), 'utf8')));
  assert.deepEqual(own, []);
  assert.match(readFileSync(join(SRC, READER), 'utf8'), OWN_READER, 'the pattern this test looks for is the one the reader uses');
});

test('a header in CRLF reads as in LF; one readers could split two ways reads as nothing', () => {
  const lf = '---\nid: M1\nstatus: shaping\nparent:\n  child: x\n---\n\n# M1\n';
  assert.deepEqual(frontmatter(lf.replace(/\n/g, '\r\n')), frontmatter(lf));
  assert.deepEqual(frontmatter(`﻿${lf}`), frontmatter(lf), 'a byte-order mark is not part of the document');
  assert.equal(withoutHeader(lf.replace(/\n/g, '\r\n')), '\r\n\r\n# M1\r\n');
  const two = lf.replace('status:', `note: x${String.fromCodePoint(13)}status:`);
  assert.equal(frontmatter(two), UNREADABLE);
  assert.equal(isUnreadable(frontmatter(two)), true);
  assert.deepEqual([UNREADABLE.id, UNREADABLE.status, Object.keys(UNREADABLE).length], [undefined, undefined, 0], 'a reader that does not ask reads no key from it');
  assert.equal(Object.isFrozen(UNREADABLE), true);
  assert.equal(frontmatter(`${lf}body${String.fromCodePoint(13)}text`).id, 'M1', 'the body is not the header');
});

// A case is inert text in a temporary folder: `files` maps a path to its text, `base` names a fixture folder copied in
// first. `crlf` writes every line end of every `.md` file as CRLF, leaving a lone CR as it is.
const inTree = ({ base, files = {} }, crlf, run) => {
  const dir = mkdtempSync(join(tmpdir(), 'header-reader-'));
  try {
    if (base) cpSync(join(SRC, base), dir, { recursive: true });
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    const walk = (d) => readdirSync(d).forEach((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) return walk(p);
      if (crlf && p.endsWith('.md')) writeFileSync(p, readFileSync(p, 'utf8').replace(/\r?\n/g, '\r\n'));
    });
    walk(dir);
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const node = (args, env = {}) => spawnSync(process.execPath, args, { cwd: SRC, encoding: 'utf8', env: { ...process.env, ...env } });
// What a check reported: its exit and its findings, from the line report() writes last.
const ran = (check, dir, env = {}) => {
  const r = node([`ci/checks/meta/${check}.mjs`, dir], { ...env, CHECK_JSON: '1' });
  const json = JSON.parse((r.stdout.split('\n').findLast((l) => l.startsWith('@@json ')) ?? '@@json null').slice(7));
  return { exit: r.status, findings: (json?.findings ?? []).map((f) => f.where), details: (json?.findings ?? []).map((f) => f.detail).join('\n') };
};

test('in CRLF, status prints what it prints in LF, for the two cases and their controls', () => {
  for (const c of ['decisions-fired-milestone', 'decisions-unreadable-header', 'decisions-fired-shipped', 'decisions-unreadable-shipped']) {
    const base = `ci/fixtures/status/${c}`;
    const today = JSON.parse(readFileSync(join(SRC, base, 'expect.json'), 'utf8')).today;
    const lf = inTree({ base }, false, (dir) => node(['ci/status.mjs', dir], { CHECK_TODAY: today }));
    const crlf = inTree({ base }, true, (dir) => node(['ci/status.mjs', dir], { CHECK_TODAY: today }));
    assert.equal(lf.status, 0, c);
    assert.equal(crlf.stdout, lf.stdout, c);
  }
});

// The four checks that own a header, each with a case whose header can be read two ways and a control that is the same
// header read one way. These live here, not under ci/fixtures/known-bad: those folders ship to projects, and a shipped
// file holds no CR byte after an autocrlf checkout (scripts/new-project.test.mjs). The case's finding is the only one,
// in LF and in CRLF; the control is green in both.
const CR = String.fromCodePoint(13);
const SPLIT = `note: x${CR}`;
const M1 = '---\nid: M1\nstatus: shaping\nkind: skeleton\nappetite: 2026-03-01..2026-03-28\n---\n\n# M1 — invented\n\n## Contents\n\n1. Deploy a hello page (no feature: skeleton)\n';
const FRAME = readFileSync(join(SRC, 'ci/fixtures/known-bad/k1/bad-status/docs/product/FRAME.md'), 'utf8');
const lesson = (split) => `---\nid: L-01\nrule: fixture rule\n${split}enforcement:\n  status: prose\n  pointer: docs/guide.md\n  review-by: 2099-01-01\n---\n\nWhy.\n`;
const feature = (split, status) => `---\n${split}status: ${status}\n---\n\n${readFileSync(join(SRC, 'ci/fixtures/known-bad/f2/no-frontmatter/docs/features/export.md'), 'utf8')}`;
const CASES = [
  {
    check: 'ms1-milestones',
    finding: 'notes.md#frontmatter/unreadable',
    tree: (split) => ({ files: { 'docs/milestones/M1-walking-skeleton.md': M1, 'docs/milestones/notes.md': `---\nid: ${split ? 'Beta' : 'M2'}\n${split}${split ? 'id: M01\nstatus: closed' : 'status: shaping'}\n---\n\n# Notes — invented\n` } }),
  },
  {
    check: 'k1-frame',
    finding: 'FRAME.md#frontmatter/unreadable',
    tree: (split) => ({ files: { 'docs/product/FRAME.md': FRAME.replace('---\nstatus: done\n---', `---\n${split}status: framed\n---`) } }),
  },
  {
    check: 'l1-lessons',
    finding: 'split.md#frontmatter/unreadable',
    tree: (split) => ({ files: { 'docs/guide.md': '# Guide\n', 'process/lessons/split.md': lesson(split) } }),
    env: { CHECK_TODAY: '2026-09-21' },
  },
  {
    check: 'f2-feature-fit',
    finding: 'docs/features/export.md#frontmatter/unreadable',
    detail: /carriage return/,
    tree: (split) => ({ files: { 'ci/baselines.json': '{\n  "feature-fit": 0\n}\n', 'docs/features/export.md': feature(split, split ? 'shipped' : 'draft') } }),
  },
];

test('each check that owns a header reports one that can be read two ways, in LF and in CRLF, and passes its control', () => {
  for (const c of CASES) {
    for (const crlf of [false, true]) {
      const bad = inTree(c.tree(SPLIT), crlf, (dir) => ran(c.check, dir, c.env));
      assert.deepEqual([bad.exit, bad.findings], [1, [c.finding]], `${c.check}${crlf ? ' in CRLF' : ''}`);
      if (c.detail) assert.match(bad.details, c.detail, c.check);
      const good = inTree(c.tree(''), crlf, (dir) => ran(c.check, dir, c.env));
      assert.deepEqual([good.exit, good.findings], [0, []], `${c.check} control${crlf ? ' in CRLF' : ''}`);
    }
  }
});
