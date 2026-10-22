#!/usr/bin/env node
// #495: every check and status reads a document's header through one reader, ci/checks/lib/frontmatter.mjs. The
// callers are listed here, and a file under ci/ (or the sync, which reads lessons) that finds a header block itself
// fails, so a second reader cannot come back unnoticed. A header that reads the same as LF in CRLF reads the same to
// the checks and to status. Every file here is inert text in a temporary folder. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  'ci/checks/lib/gate-files.mjs',
  'ci/checks/lib/markdown.mjs',
  'ci/checks/lib/milestones.mjs',
  'ci/checks/lib/spec-review.mjs',
  'ci/checks/meta/k1-frame.mjs',
  'ci/checks/meta/l1-lessons.mjs',
  'ci/checks/meta/ms1-milestones.mjs',
  'ci/status.mjs',
  'scripts/adopt.mjs',
];

// What finding a header block looks like in a script: any `---`, or three dashes counted (`-{3}`), on a line that is not
// a comment. The few lines that write `---` for something other than a markdown header are named, each with why.
const OWN_READER = /---|-\{3/;
const NOT_A_HEADER = {
  'ci/status.mjs': [/'\|---\|---\|---\|---\|---\|'/], // a markdown table's rule row, written out
  'ci/checks/lib/workflow-yaml.mjs': [/^\s*if \(\/\^\[ \\t\]\+---/], // a YAML document marker, in a workflow
  'ci/checks/lib/vendor/js-yaml.mjs': [/./], // the vendored YAML parser: YAML's own document markers
};
const ownReaders = (p, js) => js.split('\n').flatMap((line, i) => {
  if (/^\s*(?:\/\/|\*|\/\*)/.test(line) || !OWN_READER.test(line)) return [];
  return (NOT_A_HEADER[p] ?? []).some((ok) => ok.test(line)) ? [] : [`${p}:${i + 1}`];
});

test('the header readers: one parser, and the files that call it, listed', () => {
  const calls = SOURCES.filter((p) => {
    const js = readFileSync(join(SRC, p), 'utf8');
    return p !== READER && /\b(?:frontmatter|withoutHeader)\(/.test(js) && /from ['"`][^'"`]*\/frontmatter\.mjs['"`]/.test(js);
  });
  assert.deepEqual(calls, CALLERS);
});

test('no script but the one reader finds a header block itself', () => {
  const own = SOURCES.filter((p) => p !== READER).flatMap((p) => ownReaders(p, readFileSync(join(SRC, p), 'utf8')));
  assert.deepEqual(own, []);
  assert.ok(ownReaders('x.mjs', readFileSync(join(SRC, READER), 'utf8')).length > 0, 'the pattern this test looks for is the one the reader uses');
  for (const shape of ["md.match(/^-{3}\\r?\\n/)", "lines[0] === '---'", "md.split(/\\n---\\n/)", "md.startsWith('---')", "/^\\uFEFF?---/"]) {
    assert.deepEqual(ownReaders('x.mjs', shape), ['x.mjs:1'], shape);
  }
  assert.deepEqual(ownReaders('x.mjs', '// a comment about ---'), [], 'a comment is not a reader');
});

// Each call of the reader in `js`, with the text of its argument: what is between the call's own parentheses.
const calls = (js) => [...js.matchAll(/\b(?:frontmatter|withoutHeader)\(/g)].map((m) => {
  let depth = 1;
  let at = m.index + m[0].length;
  for (; at < js.length && depth; at++) depth += js[at] === '(' ? 1 : js[at] === ')' ? -1 : 0;
  return js.slice(m.index + m[0].length, at - 1);
});
// A text rewritten on its way in: the old second reader was frontmatter() of the text with its line ends rewritten.
const REWRITE = /\.(?:replace|replaceAll|split|normalize|slice|substring|trim\w*)\(/;

test('no caller rewrites the text it hands the reader', () => {
  const rewritten = SOURCES.filter((p) => p !== READER).flatMap((p) => calls(readFileSync(join(SRC, p), 'utf8')).filter((arg) => REWRITE.test(arg)).map((arg) => `${p}: ${arg}`));
  assert.deepEqual(rewritten, []);
  assert.deepEqual(calls("frontmatter(md.replace(/\\r/g, '\\n'))").filter((arg) => REWRITE.test(arg)).length, 1, 'the scan sees a rewrite');
  assert.deepEqual(calls("frontmatter(readFileSync(join(dir, f), 'utf8'))").filter((arg) => REWRITE.test(arg)).length, 0, 'a nested call is not a rewrite');
});

test('a header in CRLF reads as in LF; one readers could split two ways reads as nothing', () => {
  const lf = '---\nid: M1\nstatus: shaping\nparent:\n  child: x\n---\n\n# M1\n';
  assert.deepEqual(frontmatter(lf.replace(/\n/g, '\r\n')), frontmatter(lf));
  assert.deepEqual(frontmatter(`﻿${lf}`), frontmatter(lf), 'a byte-order mark is not part of the document');
  assert.equal(withoutHeader(lf.replace(/\n/g, '\r\n')), '\r\n\r\n# M1\r\n');
  assert.equal(withoutHeader(`\uFEFF${lf}`), withoutHeader(lf), 'the block frontmatter() reads, a byte-order mark before it included');
  assert.equal(withoutHeader('\uFEFF# no header\n'), '\uFEFF# no header\n', 'a mark with no header after it stays');
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
    // Never through a link: a link in a case would have the CRLF pass rewrite the file it points at.
    const walk = (d) => readdirSync(d).forEach((f) => {
      const p = join(d, f);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw new Error(`${p} is a link: a case is plain files only`);
      if (st.isDirectory()) return walk(p);
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
    detail: /carriage return[\s\S]*LF or CRLF line endings/,
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
