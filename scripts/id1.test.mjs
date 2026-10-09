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

test('distinct ids pass, and an id quoted in a body paragraph or a list item is not a declaration', () => {
  const r = id1({
    'decisions.md': '## D-1 — a\n\nSee D-1.\n\n- D-1 again\n\n## D-2 — d *(open — week 1)*\n',
    [A]: doc('1'),
    'docs/features/b.md': doc('2'),
  });
  assert.deepEqual([r.status, r.findings, r.json.scanned], [0, [], 4]);
});

test('nothing is skipped: a heading in a fence, a comment, front matter or behind <!--> still counts, with CR, LF or CRLF', () => {
  for (const hidden of ['```\n## D-1 — b\n```', '<!--\n## D-1 — b\n-->', '<!-->\n## D-1 — b', '`<!--` as text\n## D-1 — b']) {
    for (const nl of ['\n', '\r\n', '\r']) {
      const r = id1({ 'decisions.md': `## D-1 — a\n${hidden}\n`.replaceAll('\n', nl) });
      assert.deepEqual(r.findings, ['decisions.md#decision/duplicate/D-1'], JSON.stringify([hidden, nl]));
    }
  }
  const r = id1({ [A]: doc('3'), 'docs/features/b.md': '---\nstatus: draft\n---\n\n<!-->\n# F-3 — b\n' });
  assert.deepEqual(r.findings, ['docs/features/b.md#feature/duplicate/F-03']);
});

test('a decoy F-heading before the real one does not decide the doc\'s id; a BOM, a quote or list marker, and look-alike characters hide nothing', () => {
  const dup = { [A]: doc('3') };
  for (const body of ['<!--\n# F-77 — decoy\n-->\n# F-3 — b', '# F-77 — note\n# F-3 — b', '---\n# F-12 — was the parent idea\n---\n# F-3 — b', '```\n# F-7 — example\n```\n# F-3 — b', '\uFEFF# F-3 — b', '> # F-3 — b', '- # F-3 — b', '# F\u200b-3 — b', '# F\u2011\uFF13 — b']) {
    const r = id1({ ...dup, 'docs/features/b.md': body + '\n' });
    assert.deepEqual(r.findings, ['docs/features/b.md#feature/duplicate/F-03'], JSON.stringify(body));
  }
  assert.deepEqual(id1({ 'decisions.md': '\uFEFF## D-1 — a\n> ## D-1 — b\n' }).findings, ['decisions.md#decision/duplicate/D-1']);
});

test('several invisible characters, list markers of every kind, and a quote after a list marker hide nothing', () => {
  for (const line of ['## D\u200b-\u200b1 — b', '## D\u00ad-\u200b1 — b', '## D\u200d-1 — b', '## D\ufe0f-1 — b', '## D-\ufe0e1 — b', '\uFEFF\uFEFF\uFEFF## D-1 — b', '- > ## D-1 — b', '> - > ## D-1 — b', '1. > ## D-1 — b', '2) ## D-1 — b', '* ## D-1 — b', '+ ## D-1 — b']) {
    assert.deepEqual(id1({ 'decisions.md': '## D-1 — a\n' + line + '\n' }).findings, ['decisions.md#decision/duplicate/D-1'], JSON.stringify(line));
  }
  assert.deepEqual(id1({ [A]: doc('12'), 'docs/features/b.md': '# F-1\u200b\u200b2 — b\n' }).findings, ['docs/features/b.md#feature/duplicate/F-12']);
  for (const line of ['-## D-1 — b', '- D-1 — b', 'see D-1']) assert.deepEqual(id1({ 'decisions.md': '## D-1 — a\n' + line + '\n' }).findings, [], line);
});

test('a decisions.md heading inside front matter, a fence or a comment counts', () => {
  for (const hidden of ['---\n## D-1 — b\n---', '```\n## D-1 — b\n```', '<!--\n## D-1 — b\n-->']) {
    assert.deepEqual(id1({ 'decisions.md': '## D-1 — a\n' + hidden + '\n' }).findings, ['decisions.md#decision/duplicate/D-1'], hidden);
  }
});

test('a companion declared in a CR-only file is read', () => {
  const r = id1({ [A]: doc('3'), 'docs/features/b.md': doc('3', A).replaceAll('\n', '\r') });
  assert.deepEqual([r.status, r.findings], [0, []]);
});

test('a companion may carry only its primary\'s ids', () => {
  const r = id1({ [A]: doc('3'), 'docs/features/b.md': doc('3', A) + '\n# F-4 — a second id\n' });
  assert.deepEqual(r.findings, ['docs/features/b.md#companion/id-differs']);
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
  assert.deepEqual(r.findings.sort(), ['docs/features/dd.md#companion/missing', 'docs/features/l.md#companion/missing', 'docs/features/link.md#feature/unreadable']);
});

test('a feature doc that is a link is a finding, not skipped; a companion with no F-id heading is a finding', () => {
  const r = id1({ [A]: doc('6'), 'docs/features/n.md': '---\ncompanion-of: docs/features/a.md\n---\n\nno heading\n' }, (dir) => symlinkSync(join(dir, A), join(dir, 'docs/features/b.md')));
  assert.deepEqual(r.findings, ['docs/features/b.md#feature/unreadable', 'docs/features/n.md#companion/id-differs']);
});

test('every accepted companion pair is printed as an exemption', () => {
  const r = id1({ [A]: doc('7'), 'docs/features/b.md': doc('7', A) });
  assert.deepEqual(r.json.exempted, [`docs/features/b.md (companion of ${A})`]);
});

test('hostile input costs linear time: 100k comment openers in one file, 80k comments on one line', () => {
  const t0 = Date.now();
  const r = id1({ 'decisions.md': '## D-1 — a\n' + '<!--\n'.repeat(100000) + '## D-2 — b\n' });
  assert.deepEqual([r.status, r.findings], [0, []]);
  assert.deepEqual(id1({ 'decisions.md': '## D-1 — a\n' + '<!---->'.repeat(80000) + '\n' }).findings, []);
  assert.ok(Date.now() - t0 < 5000, 'took ' + (Date.now() - t0) + ' ms');
});

test('line numbers survive a multi-line comment, CRLF and lone CR', () => {
  for (const nl of ['\n', '\r\n', '\r']) {
    const r = id1({ 'decisions.md': ['## D-1 — a', '<!--', 'x', '-->', '', '## D-1 — b', ''].join(nl) });
    assert.match(r.json.findings[0].detail, /line 1 and on line 6/);
  }
});

test('the duplicate message says a companion needs the owner\'s yes', () => {
  const r = id1({ [A]: doc('8'), 'docs/features/b.md': doc('8') });
  assert.match(r.json.findings[0].detail, /the owner's yes; every accepted pair is printed/);
});

test('an empty companion-of is a missing companion, not "[object Object]"', () => {
  const r = id1({ [A]: doc('9'), 'docs/features/b.md': '---\ncompanion-of:\n---\n\n# F-9 — x\n' });
  assert.deepEqual(r.findings, ['docs/features/b.md#companion/missing']);
  assert.ok(!r.json.findings[0].detail.includes('[object'));
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
