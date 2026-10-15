#!/usr/bin/env node
// F2 (ci/checks/meta/f2-feature-fit.mjs; F-12, dev/features/feature-fit.md §4), through the command: its green
// cases, what it prints at, below and above the recorded count, what --update writes and refuses, and what a
// BROKEN run prints. Its red cases are the known-bad fixtures PC1 runs (ci/fixtures/known-bad/f2/). Every file
// here is inert text. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { fitCount } from '../ci/checks/lib/fit.mjs';
import { section } from '../ci/checks/lib/markdown.mjs';
import { excerpt } from '../ci/checks/lib/report.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const F2 = join(SRC, 'ci', 'checks', 'meta', 'f2-feature-fit.mjs');
const BASELINES = 'ci/baselines.json';
const UPDATE = 'node ci/checks/meta/f2-feature-fit.mjs . --update';

const FILLED = '## Fit\n\nReuses:\n- `total()` in lib/money.ts\n\nNumbers:\n- the invoice total, in lib/money.ts\n\nNew: the export button; nothing existing writes a file.\n';
const doc = (status, body = '', n = 1) => `---\nstatus: ${status}\n---\n\n# F-${n} — x\n\n## Problem\n\nx\n\n${body}\n## Contract\n\nx\n`;
const review = (path, version = 'Version: 0.1') => `# Review\n\nReviewed: ${path} @ abc1234\nVersion line: ${version}\n\nText.\n`;
const milestone = (status, item) => `---\nid: M1\nstatus: ${status}\n---\n\n# M1 — x\n\n## Contents\n\n1. ${item}\n`;
const baseline = (n) => `${JSON.stringify({ 'feature-fit': n }, null, 2)}\n`;
const A = 'docs/features/a.md';
const B = 'docs/features/b.md';
const C = 'docs/features/c.md';

// The check run on a folder holding `files`, with `flags`: its exit code, its lines, its JSON report and the
// baselines file as it is afterwards (null when there is none).
function f2(files, ...flags) {
  return f2With(files, () => {}, ...flags);
}
// The same, with `arrange(dir)` run after the files are written, for what a file cannot be: a link, a folder, a mode.
function f2With(files, arrange, ...flags) {
  const dir = mkdtempSync(join(tmpdir(), 'f2-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    arrange(dir);
    const r = spawnSync(process.execPath, [F2, dir, ...flags], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
    const all = r.stdout.trimEnd().split('\n');
    const json = JSON.parse(all.findLast((l) => l.startsWith('@@json ')).slice('@@json '.length));
    const plain = existsSync(join(dir, BASELINES)) && lstatSync(join(dir, BASELINES)).isFile() && (lstatSync(join(dir, BASELINES)).mode & 0o400) !== 0;
    return { status: r.status, out: r.stdout, err: r.stderr, lines: all.filter((l) => !l.startsWith('@@json ')), json, file: plain ? readFileSync(join(dir, BASELINES), 'utf8') : null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const ids = (list) => list.map((x) => x.where);
const last = (r) => r.lines.at(-1);

test('no feature doc at all, count 0: exit 0 with the claim "no feature doc is held yet", the baseline file being the one thing read', () => {
  const r = f2({ [BASELINES]: baseline(0) });
  assert.equal(r.status, 0);
  assert.deepEqual(r.lines.slice(0, 1), ['F2: scanned 1 files (ci/baselines.json, and each *.md in docs/features/ and dev/features/)']);
  assert.match(last(r), /^F2: PASS — green proves: no feature doc is held yet \(0 feature docs, /);
  assert.match(last(r), /read docs\/features\/ and dev\/features\/\)$/, 'the claim names the folders read');
});

test('a draft with no Fit, no review and no milestone citing it: exit 0, not counted, and named on its own line', () => {
  const r = f2({ [A]: doc('draft'), [BASELINES]: baseline(0) });
  assert.equal(r.status, 0);
  assert.deepEqual(ids(r.json.warnings), [`${A}#fit/draft`]);
  assert.equal(r.lines[1], `F2: warning: ${A}#fit/draft: \`${A}\` is a draft nothing holds yet and has no filled Fit: not counted until it is reviewed, scheduled or shipped`);
  assert.match(last(r), /no feature doc is held yet \(1 feature doc, each a draft nothing holds; the count is 0 against 0; /);
});

test('a draft with a filled Fit is not named: the line is only for a draft that would be counted', () => {
  assert.deepEqual(f2({ [A]: doc('draft', FILLED), [BASELINES]: baseline(0) }).json.warnings, []);
});

test('a shipped doc with Fit filled, count 0: exit 0, no warning', () => {
  const r = f2({ [A]: doc('shipped', FILLED), [BASELINES]: baseline(0) });
  assert.deepEqual([r.status, r.json.warnings, r.json.findings], [0, [], []]);
  assert.equal(last(r), 'F2: PASS — green proves: 1 feature doc held (shipped, reviewed or scheduled), 0 with no filled Fit, not above the recorded 0; of the other 1, 0 reuse nothing, 0 show no numbers and 0 add nothing new; 0 files not a feature doc; read docs/features/ and dev/features/');
});

test('2 counted docs against a count of 2: exit 0, each of the 2 a warning line that names the doc, why it is held and the next action, with no check id', () => {
  const r = f2({ [A]: doc('shipped'), [B]: doc('shipped', FILLED.replace('Numbers:\n- the invoice total, in lib/money.ts\n\n', ''), 2), [BASELINES]: baseline(2) });
  assert.equal(r.status, 0);
  assert.deepEqual(ids(r.json.warnings), [`${A}#fit/missing`, `${B}#fit/unfilled/numbers`]);
  assert.equal(r.json.warnings[1].detail, `\`${B}\` is shipped and its Fit has no filled \`Numbers:\` line — say where each number it shows is calculated, or \`none shown\``);
  for (const w of r.json.warnings) assert.doesNotMatch(w.detail, /\bF2\b|fit\/|\.md#/,'a detail is in the project\'s words');
  assert.equal(r.lines.some((l) => l.includes('improved')), false);
  assert.match(last(r), /2 feature docs held .*, 2 with no filled Fit, not above the recorded 2; of the other 0, .* \(2 warning\(s\) above\)$/);
});

test('2 counted docs against a count of 3: exit 0, the same warnings, and an F2: line saying to run --update; --update then writes 2', () => {
  const files = { [A]: doc('shipped'), [B]: doc('shipped', '', 2), [BASELINES]: baseline(3) };
  const r = f2(files);
  assert.equal(r.status, 0);
  assert.deepEqual(ids(r.json.warnings), [`${A}#fit/missing`, `${B}#fit/missing`]);
  assert.equal(r.lines[0], `F2: feature-fit improved 3 → 2; run ${UPDATE} to lock it in`);
  assert.equal(r.file, baseline(3), 'a run without --update writes nothing');
  const u = f2(files, '--update');
  assert.deepEqual([u.status, u.file], [0, baseline(2)]);
  assert.equal(last(u), 'F2: PASS — green proves: feature-fit recorded at 2 in ci/baselines.json');
});

test('a third counted doc against a count of 2: exit 1 with findings for all 3; --update exits 1, names 2 and 3, and writes nothing', () => {
  const files = { [A]: doc('shipped'), [B]: doc('shipped', '', 2), [C]: doc('shipped', '', 3), [BASELINES]: baseline(2) };
  const r = f2(files);
  assert.equal(r.status, 1);
  assert.deepEqual(ids(r.json.findings), [`${A}#fit/missing`, `${B}#fit/missing`, `${C}#fit/missing`]);
  assert.deepEqual(r.json.warnings, [], 'a counted doc is a finding or a warning, never both');
  const u = f2(files, '--update');
  assert.equal(u.status, 1);
  assert.equal(u.lines[1], 'F2: feature-fit: --update refuses to raise the count (2 → 3); fill in the Fit section of the docs the check names instead');
  assert.equal(u.file, baseline(2));
});

test('--update keeps every other count in the file as it was, and its order', () => {
  const u = f2({ [A]: doc('shipped'), [BASELINES]: '{\n  "duplication": 12,\n  "feature-fit": 4,\n  "dead-code": 3\n}\n' }, '--update');
  assert.deepEqual([u.status, u.file], [0, '{\n  "duplication": 12,\n  "feature-fit": 1,\n  "dead-code": 3\n}\n']);
});

test('a file that is not a feature doc is a warning and in the claim, never counted; a companion is neither', () => {
  const r = f2({
    'docs/features/notes.md': '# Notes\n\nNo id.\n',
    'docs/features/table.md': `---\ncompanion-of: ${A}\n---\n\n# F-1 — the table\n`,
    [A]: doc('shipped', FILLED),
    [BASELINES]: baseline(0),
  });
  assert.equal(r.status, 0);
  assert.deepEqual(r.json.warnings, [{ where: 'docs/features/notes.md#not-a-feature-doc', detail: '`docs/features/notes.md` is not a feature doc (no `F-<n>` title), so its Fit is not checked' }]);
  assert.match(last(r), /1 feature doc held .*; 1 file not a feature doc; /);
  assert.equal(r.json.scanned, 4, 'the baseline file and the three *.md');
});

test('dev/features/ is read beside docs/features/ when it is there, and its absence is not an error', () => {
  const both = f2({ [A]: doc('shipped'), 'dev/features/g.md': doc('shipped', '', 2), [BASELINES]: baseline(2) });
  assert.deepEqual(ids(both.json.warnings), [`${A}#fit/missing`, 'dev/features/g.md#fit/missing']);
  assert.equal(f2({ 'dev/features/g.md': doc('shipped', FILLED, 2), [BASELINES]: baseline(0) }).status, 0);
});

test("the claim's counts: held, lacking Fit, and of the rest how many reuse nothing, show no numbers and add nothing new", () => {
  const short = (reuses, numbers, fresh) => `## Fit\n\nReuses:\n- ${reuses}\n\nNumbers:\n- ${numbers}\n\nNew: ${fresh}\n`;
  const r = f2({
    [A]: doc('shipped', short('nothing; searched for a file writer', 'none shown', 'the export button')),
    [B]: doc('shipped', short('`total()` in lib/money.ts', 'none shown', 'none'), 2),
    [C]: doc('shipped', '', 3),
    'docs/features/d.md': doc('draft', '', 4),
    [BASELINES]: baseline(1),
  });
  assert.equal(r.status, 0);
  assert.match(last(r), /3 feature docs held \(shipped, reviewed or scheduled\), 1 with no filled Fit, not above the recorded 1; of the other 2, 1 reuse nothing, 2 show no numbers and 1 add nothing new; 0 files not a feature doc; /);
});

// The clauses of "held" the fixtures do not reach (0.2 review, AR-6), each through the command.
test('held by a milestone: a closed one holds a draft like an active one; a shaping or a killed one does not', () => {
  const m = 'docs/milestones/M1.md';
  const closed = f2({ [A]: doc('draft'), [m]: milestone('closed', 'the export (F-01)'), [BASELINES]: baseline(0) });
  assert.deepEqual([closed.status, ids(closed.json.findings)], [1, [`${A}#fit/missing`]]);
  assert.match(closed.json.findings[0].detail, /is scheduled \(docs\/milestones\/M1\.md\) and has no `## Fit` section/);
  for (const status of ['shaping', 'killed']) {
    const r = f2({ [A]: doc('draft'), [m]: milestone(status, 'the export (F-01)'), [BASELINES]: baseline(0) });
    assert.deepEqual([r.status, ids(r.json.warnings)], [0, [`${A}#fit/draft`]], status);
  }
});

test('held by a review: one of another doc holds nothing; one whose version line is no longer the doc\'s still holds', () => {
  const other = f2({ [A]: doc('draft'), [B]: doc('draft', FILLED, 2), 'docs/reviews/r.md': review(B), [BASELINES]: baseline(0) });
  assert.deepEqual([other.status, ids(other.json.warnings)], [0, [`${A}#fit/draft`]]);
  const versioned = doc('draft').replace('## Problem', 'Version: 0.3\n\n## Problem');
  const stale = f2({ [A]: versioned, 'docs/reviews/r.md': review(A, 'Version: 0.1'), [BASELINES]: baseline(0) });
  assert.deepEqual([stale.status, ids(stale.json.findings)], [1, [`${A}#fit/missing`]]);
  assert.match(stale.json.findings[0].detail, /is reviewed \(docs\/reviews\/r\.md\)/);
});

test('a finding says every reason a doc is held, and names one review with how many more there are', () => {
  const r = f2({ [A]: doc('shipped'), 'docs/reviews/r1.md': review(A), 'docs/reviews/r2.md': review(A), 'docs/milestones/M1.md': milestone('active', 'the export (F-1)'), [BASELINES]: baseline(0) });
  assert.equal(r.json.findings[0].detail, `\`${A}\` is shipped, is reviewed (docs/reviews/r1.md and 1 more), is scheduled (docs/milestones/M1.md) and has no \`## Fit\` section — add it after \`## Problem\`, with \`Reuses:\`, \`Numbers:\` and \`New:\` filled in`);
});

// What a BROKEN run prints (0.2 review, AR-8): its two lines, and none of the warnings a run that could compare prints.
test('no ci/baselines.json, a count written as text, a negative or a fractional one: exit 2 in two lines, naming the --update command', () => {
  const files = { [A]: doc('shipped', FILLED), 'docs/features/notes.md': '# Notes\n', 'docs/features/d.md': doc('draft', '', 2) };
  for (const [name, text] of [['absent', null], ['text', '{"feature-fit": "3"}'], ['negative', baseline(-1)], ['fraction', baseline(1.5)], ['another key only', '{"duplication": 3}'], ['inherited', '{"__proto__": {"feature-fit": 0}}']]) {
    const r = f2(text === null ? files : { ...files, [BASELINES]: text });
    assert.equal(r.status, 2, name);
    assert.deepEqual(r.lines, ['F2: scanned 4 files (ci/baselines.json, and each *.md in docs/features/ and dev/features/)', `F2: BROKEN — ci/baselines.json has no feature-fit count — a sync records it in a project; to record it by hand, run ${UPDATE}`], name);
    assert.deepEqual([r.json.findings, r.json.warnings], [[], []], name);
  }
});

test('a ci/baselines.json that is not JSON, or not an object: exit 2 naming the file and none of its text, with and without --update, and nothing is written (0.2 review, AR-10 item 6)', () => {
  for (const text of ['{ "feature-fit": 0,', '[0]', 'null', '', 'MARKER_ONE {', '{ "feature-fit": 0, MARKER_TWO']) {
    for (const flags of [[], ['--update']]) {
      const r = f2({ [A]: doc('shipped', FILLED), [BASELINES]: text }, ...flags);
      assert.equal(r.status, 2, text);
      assert.equal(r.lines[1], 'F2: BROKEN — ci/baselines.json is not a JSON object of counts', text);
      assert.doesNotMatch(r.out + r.err, /MARK|Unexpected|token/, 'no word of the file, and none of the parser\'s, is printed');
      assert.equal(r.lines.length, 2);
      assert.equal(r.err, '', 'never a stack trace');
      assert.equal(r.file, text);
    }
  }
});

test('--update with no count recorded writes the current one, whatever it is: the one path with no ratchet, named in the feature doc', () => {
  const files = { [A]: doc('shipped'), [B]: doc('shipped', '', 2) };
  assert.equal(f2(files, '--update').file, baseline(2));
  assert.equal(f2({ ...files, [BASELINES]: '{\n  "duplication": 3\n}\n' }, '--update').file, '{\n  "duplication": 3,\n  "feature-fit": 2\n}\n');
});

test('a file name that carries a control character is printed escaped, on one line', () => {
  const name = 'docs/features/a\u001b[31m\u202eb.md';
  const r = f2({ [name]: '# Notes\n', [BASELINES]: baseline(0) });
  assert.equal(r.status, 0);
  assert.equal(r.lines.length, 3);
  assert.match(r.lines[1], /docs\/features\/a\\u001b\[31m\\u202eb\.md#not-a-feature-doc/);
});

// docs/features/TEMPLATE.md and the fixture that is its section byte for byte.
test("the template has `## Fit` after `## Problem` and before `## Contract`, and the fixture template-untouched holds that section byte for byte", () => {
  const template = readFileSync(join(SRC, 'docs', 'features', 'TEMPLATE.md'), 'utf8');
  const headings = template.split('\n').filter((l) => l.startsWith('## '));
  assert.deepEqual(headings.slice(0, 3), ['## Problem', '## Fit', '## Contract']);
  const fixture = readFileSync(join(SRC, 'ci', 'fixtures', 'known-bad', 'f2', 'template-untouched', 'docs', 'features', 'export.md'), 'utf8');
  const fit = section(template, 'Fit', 2);
  assert.ok(fit.length > 0);
  assert.equal(section(fixture, 'Fit', 2), fit);
  const fenced = readFileSync(join(SRC, 'ci', 'fixtures', 'known-bad', 'f2', 'fenced-heading', 'docs', 'features', 'export.md'), 'utf8');
  for (const label of ['Reuses:', 'Numbers:', 'New:']) assert.ok(fenced.includes(template.split('\n').find((l, i, all) => l.startsWith(label) && (l.includes('<…') || all[i + 1].includes('<…')))), label);
});

test('the fixture has the sixteen cases of Contract §4, each with its expected.json', () => {
  const dir = join(SRC, 'ci', 'fixtures', 'known-bad', 'f2');
  const cases = readdirSync(dir).filter((d) => existsSync(join(dir, d, 'expected.json'))).sort();
  assert.deepEqual(cases, ['above-nonzero', 'baseline-not-a-number', 'bullets-empty', 'fenced-heading', 'label-absent', 'label-marked', 'missing', 'no-baseline', 'no-frontmatter', 'no-status', 'nothing-and-none', 'reviewed-draft', 'scheduled-draft', 'status-case', 'template-untouched', 'unknown-status']);
});

// Slipway's own tree: the count recorded is the count the check gives, so nothing is left to lock in.
test("slipway's own ci/baselines.json holds the count the check gives at this head, and landing-page-qa.md is a warning", () => {
  const r = spawnSync(process.execPath, [F2, '.'], { cwd: SRC, encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
  assert.equal(r.status, 0, r.stdout);
  const count = fitCount(SRC).count;
  assert.equal(JSON.parse(readFileSync(join(SRC, BASELINES), 'utf8'))['feature-fit'], count);
  assert.equal(r.stdout.includes('improved'), false);
  const json = JSON.parse(r.stdout.split('\n').findLast((l) => l.startsWith('@@json ')).slice('@@json '.length));
  assert.ok(ids(json.warnings).includes('dev/features/landing-page-qa.md#not-a-feature-doc'));
});

// The count's file is a plain file of the repository or it is not read and not written.
const UNDER = 'is under a ci/ that is a link or not a folder';
test('a link or a folder at ci/baselines.json, or a ci/ reached through a link: exit 2 before any read, and --update writes nowhere', () => {
  const files = { [A]: doc('shipped') };
  const outside = mkdtempSync(join(tmpdir(), 'f2-outside-'));
  try {
    const target = join(outside, 'target.json');
    const arrangements = {
      'a link to a file': [(dir) => (mkdirSync(join(dir, 'ci')), writeFileSync(target, 'MARKER_THREE'), symlinkSync(target, join(dir, BASELINES))), 'is a link, not a file'],
      'a link to counts elsewhere': [(dir) => (mkdirSync(join(dir, 'ci')), writeFileSync(target, baseline(5)), symlinkSync(target, join(dir, BASELINES))), 'is a link, not a file'],
      'a link to nothing': [(dir) => (mkdirSync(join(dir, 'ci')), rmSync(target, { force: true }), symlinkSync(target, join(dir, BASELINES))), 'is a link, not a file'],
      'a folder': [(dir) => mkdirSync(join(dir, BASELINES), { recursive: true }), 'is not a regular file'],
      'ci/ is a link': [(dir) => (rmSync(target, { force: true }), mkdirSync(join(outside, 'ci'), { recursive: true }), symlinkSync(join(outside, 'ci'), join(dir, 'ci'))), UNDER],
      'ci/ is a link to nothing': [(dir) => (rmSync(target, { force: true }), symlinkSync(join(outside, 'gone'), join(dir, 'ci'))), UNDER],
      'ci/ is a file': [(dir) => (rmSync(target, { force: true }), writeFileSync(join(dir, 'ci'), 'MARKER_FOUR')), UNDER],
    };
    for (const [name, [arrange, why]] of Object.entries(arrangements)) {
      for (const flags of [[], ['--update']]) {
        let before;
        const r = f2With(files, (dir) => (arrange(dir), (before = existsSync(target) ? readFileSync(target, 'utf8') : null)), ...flags);
        assert.equal(r.status, 2, name);
        assert.deepEqual(r.lines.slice(1), [why === UNDER ? `F2: BROKEN — ci/baselines.json ${UNDER}, so it is neither read nor written — make ci/ a plain folder` : `F2: BROKEN — ci/baselines.json ${why}, so it is neither read nor written — make it a plain file`], name);
        assert.doesNotMatch(r.out + r.err, /MARK/, name);
        assert.equal(existsSync(target) ? readFileSync(target, 'utf8') : null, before, `${name}: the link's target is as it was`);
        assert.equal(existsSync(join(outside, 'ci', 'baselines.json')), false, name);
      }
    }
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test('a ci/baselines.json nobody may read: exit 2 by the error\'s code', { skip: process.getuid?.() === 0 }, () => {
  const r = f2With({ [A]: doc('shipped', FILLED), [BASELINES]: baseline(0) }, (dir) => chmodSync(join(dir, BASELINES), 0o000));
  assert.deepEqual([r.status, r.lines[1]], [2, 'F2: BROKEN — ci/baselines.json cannot be read (EACCES)']);
});

test('--update at the recorded count writes it again and passes; no ci/ folder yet is made by --update', () => {
  const u = f2({ [A]: doc('shipped'), [BASELINES]: baseline(1) }, '--update');
  assert.deepEqual([u.status, u.file, last(u)], [0, baseline(1), 'F2: PASS — green proves: feature-fit recorded at 1 in ci/baselines.json']);
  assert.equal(f2({ [A]: doc('shipped', FILLED) }, '--update').file, baseline(0));
});

test('a status word is quoted cut to 30 characters, and a folder or a link among the docs is named as one', () => {
  const long = 'in review by the whole product team since march';
  const r = f2With({ [A]: doc(long), [BASELINES]: baseline(0) }, (dir) => mkdirSync(join(dir, 'docs', 'features', 'folder.md')));
  assert.equal(r.status, 1);
  assert.ok(excerpt(long, 30).length <= 30 && excerpt(long, 30) !== long);
  assert.ok(r.json.findings[0].detail.startsWith(`\`${A}\` has the status "${excerpt(long, 30)}", which is not draft and has no`), r.json.findings[0].detail);
  assert.deepEqual(r.json.warnings, [{ where: 'docs/features/folder.md#not-a-feature-doc', detail: '`docs/features/folder.md` is a link or a folder, not a file, so it is not read and its Fit is not checked' }]);
});

// #430: F2's --update goes through the one writer, and refuses a file whose rewrite would lose an entry with its
// own BROKEN line, writing nothing.
test('--update on a baselines file that gives a name twice: BROKEN, and the file is as it was', () => {
  const twice = '{\n  "feature-fit": 3,\n  "other": 1,\n  "other": 2\n}\n';
  const r = f2({ [BASELINES]: twice }, '--update');
  assert.equal(r.status, 2, r.out + r.err);
  assert.match(r.out, /BROKEN — .*ci\/baselines\.json holds an entry a rewrite would lose or change/);
  assert.equal(r.file, twice);
});

// #430's second pull request (items 2, 12): an input F2 would count from that is a link, under one, or not a plain
// folder or file is BROKEN, before any count is compared or written; only its path is printed, never what it holds.
test('a linked feature folder, a feature folder that is a file, and a linked milestone file: BROKEN, naming the path, and --update writes nothing', () => {
  const outside = mkdtempSync(join(tmpdir(), 'f2-outside-'));
  try {
    writeFileSync(join(outside, 'secret.md'), '---\nstatus: a-private-word\n---\n\n# F-9 — x\n');
    const cases = [
      ['linked folder', {}, (d) => symlinkSync(outside, join(d, 'docs/features')), '`docs/features` is'],
      ['folder that is a file', { 'docs/features': 'x' }, () => {}, '`docs/features` is'],
      ['linked milestone', { 'docs/milestones/keep.md': '# kept\n' }, (d) => symlinkSync(join(outside, 'secret.md'), join(d, 'docs/milestones/m1.md')), '`docs/milestones/m1.md` is'],
    ];
    for (const [name, files, arrange, named] of cases) {
      for (const flags of [[], ['--update']]) {
        const r = f2With({ 'docs/.keep': '', [BASELINES]: baseline(0), ...files }, arrange, ...flags);
        assert.equal(r.status, 2, `${name} ${flags}`);
        assert.equal(r.lines.at(-1), `F2: BROKEN — ${named} a link, under one, or not a plain folder or file, so F2 does not read it and cannot count the docs — make each a plain folder or file`, name);
        assert.doesNotMatch(r.out, /a-private-word/, name);
        assert.equal(r.file, baseline(0), `${name}: nothing written`);
      }
    }
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

// Item 10: a file name is printed in a code span no backtick in it can close.
test('a doc whose name holds backticks is printed in a code span they cannot close', () => {
  const name = 'docs/features/a`b``c.md';
  const r = f2({ [name]: doc('shipped'), [BASELINES]: baseline(1) });
  assert.equal(r.status, 0, r.out);
  assert.ok(r.lines.some((l) => l.includes('```docs/features/a`b``c.md``` is shipped and has no `## Fit` section')), r.out);
});

// The status warning is true of a `status:` line with nothing after it too (item 4's class).
test('a held doc whose status line is empty: the warning says it has no readable status line, and how to give it one', () => {
  const r = f2({ [A]: `---\nstatus:\n---\n\n# F-1 — x\n\n${FILLED}`, [BASELINES]: baseline(1) });
  assert.equal(r.status, 0, r.out);
  assert.ok(r.lines.includes(`F2: warning: ${A}#frontmatter/unreadable: \`${A}\` has no readable status line and nothing says it is a draft, so it is counted whatever its Fit says — give its frontmatter a \`status:\` line with its status after it (\`draft\`, \`shipped\`)`), r.out);
});

test('a held doc whose comment runs across a heading: counted, with the reason and the way out', () => {
  const r = f2({ [A]: `---\nstatus: shipped\n---\n\n# F-1 — x\n\n${FILLED.replace('New: ', 'New: `<!--` ')}\n## Problem\n\nThe \`-->\` x\n`, [BASELINES]: baseline(1) });
  assert.equal(r.status, 0, r.out);
  assert.ok(r.lines.some((l) => l.startsWith(`F2: warning: ${A}#fit/unfilled/unreadable: \`${A}\` is shipped and an HTML comment (\`<!--\` … \`-->\`) runs across a heading line`)), r.out);
});
