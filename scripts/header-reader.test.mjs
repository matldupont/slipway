#!/usr/bin/env node
// #495: every check and status reads a document's header through one reader, ci/checks/lib/frontmatter.mjs. The
// callers are listed here, and a file under ci/ (or the sync, which reads lessons) that finds a header block itself
// fails, so a second reader cannot come back unnoticed. A header that reads the same as LF in CRLF reads the same to
// the checks and to status. Every file here is inert text in a temporary folder. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
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

// Each file of a case, in CRLF, in a temporary copy: the case reads as it does in LF.
const inCrlf = (from, run) => {
  const dir = mkdtempSync(join(tmpdir(), 'header-reader-'));
  try {
    cpSync(from, dir, { recursive: true });
    const walk = (d) => readdirSync(d).forEach((f) => {
      const p = join(d, f);
      if (statSync(p).isDirectory()) return walk(p);
      if (p.endsWith('.md')) writeFileSync(p, readFileSync(p, 'utf8').replace(/\r?\n/g, '\r\n'));
    });
    walk(dir);
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const node = (args, env = {}) => spawnSync(process.execPath, args, { cwd: SRC, encoding: 'utf8', env: { ...process.env, ...env } });

test('in CRLF, status prints what it prints in LF, for the two cases and their controls', () => {
  for (const c of ['decisions-fired-milestone', 'decisions-unreadable-header', 'decisions-fired-shipped', 'decisions-unreadable-shipped']) {
    const from = join(SRC, 'ci/fixtures/status', c);
    const today = JSON.parse(readFileSync(join(from, 'expect.json'), 'utf8')).today;
    const lf = node(['ci/status.mjs', from], { CHECK_TODAY: today });
    const crlf = inCrlf(from, (dir) => node(['ci/status.mjs', dir], { CHECK_TODAY: today }));
    assert.equal(lf.status, 0, c);
    assert.equal(crlf.stdout, lf.stdout, c);
  }
});

test('in CRLF, each check reports the unreadable header it reports in LF', () => {
  const cases = { ms1: 'ms1-milestones', k1: 'k1-frame', l1: 'l1-lessons', f2: 'f2-feature-fit' };
  for (const [id, check] of Object.entries(cases)) {
    const from = join(SRC, 'ci/fixtures/known-bad', id, 'unreadable-header');
    const expected = JSON.parse(readFileSync(join(from, 'expected.json'), 'utf8'));
    const run = (dir) => node([`ci/checks/meta/${check}.mjs`, dir], expected.env ?? {});
    const lf = run(from);
    const crlf = inCrlf(from, run);
    assert.equal(lf.status, 1, `${id}: ${lf.stdout}${lf.stderr}`);
    assert.equal(crlf.status, 1, id);
    for (const f of expected.findings) assert.match(crlf.stdout + crlf.stderr, new RegExp(f.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')), `${id} in CRLF: ${relative(SRC, from)}`);
  }
});
