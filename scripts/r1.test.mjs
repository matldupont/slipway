#!/usr/bin/env node
// R1 (ci/checks/meta/r1-review-provenance.mjs) and the reader it shares with `pnpm status`
// (ci/checks/lib/review-header.mjs). PC1 covers the known-bad reviews, r1/bounded among them; these cover what a
// shipped fixture cannot hold: a link (symlinks are never shipped), a real `.git/` folder, and the time one long
// line takes (#322, #336). Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAX_LINE, reviewedOf, reviewProvenance, unquote, versionOf } from '../ci/checks/lib/review-header.mjs';

const R1 = join(dirname(fileURLToPath(import.meta.url)), '..', 'ci', 'checks', 'meta', 'r1-review-provenance.mjs');
const LONG = 100_000;
const SPEC = '# Spec\n\nVersion: 0.2\n\nContent.\n';
const review = (path, version = 'Version: 0.2') => `# Review\n\nReviewed: ${path} @ 1a2b3c4\nVersion line: ${version}\n`;

// A throwaway project: `files` maps a path to its text, and `links` a path to what it points at.
const project = (files, links = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'r1-test-'));
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  for (const [p, to] of Object.entries(links)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    symlinkSync(to, join(dir, p));
  }
  return dir;
};
const r1 = (dir) => {
  const began = performance.now();
  const r = spawnSync(process.execPath, [R1, dir], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
  const line = r.stdout.split('\n').findLast((l) => l.startsWith('@@json '));
  return { status: r.status, out: r.stdout + r.stderr, ms: performance.now() - began, findings: line ? JSON.parse(line.slice(7)).findings : [] };
};
const timed = (fn) => {
  const began = performance.now();
  const value = fn();
  return { value, ms: performance.now() - began };
};

// --- the reviewed path ---

// The root is given through a link the test makes itself: a temporary folder is behind one on macOS only.
test('a plain file passes when the repository root is itself reached through a link', () => {
  const dir = project({ 'repo/docs/specs/a.md': SPEC, 'repo/docs/reviews/a.md': review('docs/specs/a.md') }, { linked: 'repo' });
  try {
    assert.notEqual(realpathSync(join(dir, 'linked')), join(dir, 'linked'));
    for (const root of [join(dir, 'repo'), join(dir, 'linked')]) {
      const r = r1(root);
      assert.equal(r.status, 0, r.out);
      assert.match(r.out, /R1: PASS/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a reviewed path that is a link, to a file, a folder or nothing, is target-missing and is not opened', () => {
  const dir = project(
    { 'docs/specs/a.md': SPEC, 'docs/reviews/file.md': review('docs/specs/link.md'), 'docs/reviews/folder.md': review('docs/linked'), 'docs/reviews/nothing.md': review('docs/specs/gone.md') },
    { 'docs/specs/link.md': 'a.md', 'docs/linked': 'specs', 'docs/specs/gone.md': 'not-there.md' },
  );
  try {
    const r = r1(dir);
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.findings.map((f) => f.where), ['file', 'folder', 'nothing'].map((n) => `docs/reviews/${n}.md#provenance/target-missing`));
    for (const f of r.findings) assert.match(f.detail, /is a link, not a file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a reviewed path that passes through a linked folder is target-missing, though the file it reaches is a document', () => {
  const dir = project({ 'docs/specs/a.md': SPEC, 'docs/reviews/through.md': review('docs/linked/a.md') }, { 'docs/linked': 'specs' });
  try {
    const r = r1(dir);
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.findings.map((f) => f.where), ['docs/reviews/through.md#provenance/target-missing']);
    assert.match(r.findings[0].detail, /docs\/linked\/a\.md is reached through a link/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a file inside git's own folder is target-missing under either spelling, though it exists and holds the version line", () => {
  const dir = project({ '.git/notes.md': SPEC, 'docs/reviews/lower.md': review('.git/notes.md'), 'docs/reviews/upper.md': review('docs/../.GIT/notes.md') });
  try {
    const r = r1(dir);
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.findings.map((f) => f.where), ['lower', 'upper'].map((n) => `docs/reviews/${n}.md#provenance/target-missing`));
    for (const f of r.findings) assert.match(f.detail, /is inside \.git\//);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("git's own folder is refused under each spelling a filesystem is known to take for it, and a name that only starts like it is not", () => {
  const refused = ['.git', '.GIT', '.git.', '.git ', '.git. .', 'GIT~1', 'git~1', '.g\u200cit', '.g\u200dit', '.gi\ufe0ft', '\ufeff.git'];
  const files = { 'docs/specs/a.md': SPEC, '.github/a.md': SPEC, '.gitx/a.md': SPEC, 'docs/reviews/ok-1.md': review('.github/a.md'), 'docs/reviews/ok-2.md': review('.gitx/a.md') };
  refused.forEach((seg, i) => {
    files[`docs/reviews/r${String(i).padStart(2, '0')}.md`] = review(`"${seg}/a.md"`);
    files[`docs/reviews/s${String(i).padStart(2, '0')}.md`] = review(`"docs/${seg}/a.md"`);
  });
  const dir = project(files);
  try {
    const r = r1(dir);
    assert.equal(r.status, 1, r.out);
    assert.equal(r.findings.length, refused.length * 2, r.out);
    for (const f of r.findings) assert.match(f.detail, /is inside \.git\//, f.where);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- the time one line takes ---

// The shapes that took seconds before: a run of quote marks inside a line, a run of spaces after `Reviewed:` with
// no ` @ ` behind it, a run of spaces before a `Version line:` value that holds a lone CR.
const quotes = `x${'"'.repeat(LONG)}y`;
const noAt = `Reviewed: a${' '.repeat(LONG)}b`;
const loneCr = `Version line:${' '.repeat(LONG)}a\rb`;

// The long lines come before the version line: R1 stops comparing at the first line that matches.
test('R1 finishes in under 2 seconds on a reviewed document with a 100,000-character line', () => {
  const dir = project({ 'docs/specs/a.md': `# Spec\n\n${quotes}\n${noAt}\n${loneCr}\n\nVersion: 0.2\n`, 'docs/reviews/a.md': review('docs/specs/a.md') });
  try {
    const r = r1(dir);
    assert.equal(r.status, 0, r.out);
    assert.ok(r.ms < 2000, `took ${Math.round(r.ms)} ms`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('R1 reports a review whose header line is 100,000 characters long, in under 2 seconds, and names the line', () => {
  const dir = project({ 'docs/specs/a.md': SPEC, 'docs/reviews/a.md': `# Review\n\n${noAt}\nVersion line: Version: 0.2\n` });
  try {
    const r = r1(dir);
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.findings.map((f) => f.where), ['docs/reviews/a.md#provenance/missing']);
    assert.match(r.findings[0].detail, new RegExp(`line 3 of this file is in the header and over ${MAX_LINE} characters`));
    assert.ok(r.ms < 2000, `took ${Math.round(r.ms)} ms`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reviewProvenance reads a header with 100,000-character lines in under 100 ms, and reads none of them', () => {
  const text = `# Review\n\n${noAt}\n${loneCr}\nSupersedes: ${quotes}\nReviewed: docs/specs/a.md @ 1a2b3c4\n`;
  reviewProvenance('# warm\n\nReviewed: a @ b\n');
  const { value, ms } = timed(() => reviewProvenance(text));
  assert.deepEqual(value, { reviewed: { path: 'docs/specs/a.md', ref: '1a2b3c4' }, version: null, supersedes: [], unread: [3, 4, 5], unreadSupersedes: [5] });
  assert.ok(ms < 100, `took ${Math.round(ms)} ms`);
});

// The limit alone would pass the tests above: each reader is also timed on a long line it is handed directly.
test('each reader of a line is linear without the limit: 100,000 characters in under 100 ms', () => {
  for (const [name, fn] of [['unquote', () => unquote(quotes)], ['reviewedOf', () => reviewedOf(noAt)], ['versionOf', () => versionOf(loneCr)]]) {
    const { ms } = timed(fn);
    assert.ok(ms < 100, `${name} took ${Math.round(ms)} ms`);
  }
  assert.equal(unquote(quotes), quotes);
  assert.equal(reviewedOf(noAt), null);
  assert.equal(versionOf(loneCr), null);
  assert.deepEqual(reviewedOf(`Reviewed: a${' '.repeat(LONG)}@ b`), { path: 'a', ref: 'b' });
});

// --- the readers read what the patterns they replace read ---

const WAS = {
  unquote: (s) => s.trim().replace(/^[`'"]+|[`'"]+$/g, ''),
  reviewed: (l) => {
    const m = l.match(/^Reviewed:\s*(.+?)\s+@\s+(\S+)/);
    return m ? { path: WAS.unquote(m[1]), ref: m[2] } : null;
  },
  version: (l) => (l.match(/^Version line:\s*(.+)$/) ?? [])[1] ?? null,
};

test('the readers agree with the patterns they replace on every ordinary line', () => {
  const values = ['docs/a.md', '`docs/a.md`', '"docs/a b.md"', "'x'", '``', '"', 'a @ b', 'a@b', 'a  @  b  c', 'a @ b @ c', 'a @', 'a\t@\tb', 'a \r b @ c', 'a\rb @ c', 'a @ b\rc', 'Version: 0.2', '"Version: 0.2', "it's", 'x\u2028y @ z', ''];
  for (const v of values) {
    assert.equal(unquote(v), WAS.unquote(v), JSON.stringify(v));
    for (const gap of ['', ' ', '   ', '\t']) {
      const r = `Reviewed:${gap}${v}`.trim();
      assert.deepEqual(reviewedOf(r), WAS.reviewed(r), JSON.stringify(r));
      const l = `Version line:${gap}${v}`.trim();
      assert.equal(versionOf(l), WAS.version(l), JSON.stringify(l));
    }
  }
  for (const other of ['Reviewed', 'reviewed: a @ b', ' Reviewed: a @ b', 'Version line', 'Supersedes: a']) {
    assert.equal(reviewedOf(other), null);
    assert.equal(versionOf(other), null);
  }
});

test('where the readers differ from the old patterns: a `Reviewed:` line with nothing before its ` @ ` names no path', () => {
  assert.deepEqual(WAS.reviewed('Reviewed:  @ b'), { path: '', ref: 'b' });
  assert.equal(reviewedOf('Reviewed:  @ b'), null);
});
