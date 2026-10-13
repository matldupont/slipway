#!/usr/bin/env node
// The Fit count (ci/checks/lib/fit.mjs; F-12, dev/features/feature-fit.md §2): what is held, what lacks Fit, and
// the numbers sync and the check both read. Module level: the check's own cases go through its command, in its
// own test. Every file here is inert text. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { isFeatureDoc, readFeatureFiles } from '../ci/checks/lib/feature-docs.mjs';
import { fitCount } from '../ci/checks/lib/fit.mjs';
import { PLACEHOLDER } from '../ci/checks/lib/frontmatter.mjs';
import { citedFeatures } from '../ci/checks/lib/milestones.mjs';

// The section as Contract §1 gives it for docs/features/TEMPLATE.md.
const TEMPLATE_FIT = `## Fit

What this feature takes from the product it joins. A feature that reuses nothing writes one bullet, \`nothing\`,
with what was searched, by behaviour; one that shows a person no number writes \`none shown\`; one that adds
nothing existing code lacks writes \`none\`.

Reuses:
- <…a pattern or helper this reuses, and where it lives: a path, or the docs/conventions.md row…>

Numbers:
- <…each number this feature shows a person, and the one place it is calculated…>

New: <…anything this adds that nothing existing does, and why reuse was not possible…>
`;
const FILLED = '## Fit\n\nReuses:\n- `total()` in lib/money.ts\n\nNumbers:\n- the invoice total, in lib/money.ts\n\nNew: the export button; nothing existing writes a file.\n';
const fit = (reuses, numbers, fresh) => `## Fit\n\n${reuses}\n\n${numbers}\n\n${fresh}\n`;
const front = (status) => (status === null ? '' : `---\n${status === undefined ? 'prd-ref: none' : `status: ${status}`}\n---\n\n`);
const doc = (status, body = '', n = 1) => `${front(status)}# F-${n} — x\n\n## Problem\n\nx\n\n${body}\n## Contract\n\nx\n`;
const review = (path) => `# Review\n\nReviewed: ${path} @ abc1234\nVersion line: Version: 0.1\n\nText.\n`;
const milestone = (status, item) => `---\nid: M1\nstatus: ${status}\n---\n\n# M1 — x\n\n## Contents\n\n1. ${item}\n`;

const A = 'docs/features/a.md';
function count(files, after = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'fit-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    after(dir);
    return fitCount(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const reasons = (files) => count(files).docs.find((d) => d.path === A).reasons;
const rules = (files, path = A) => count(files).docs.find((d) => d.path === path).heldBy.map((h) => h.rule);

test("the template's section, byte for byte: each of the three lines holds a placeholder, and a held doc with it lacks all three", () => {
  for (const label of ['Reuses:', 'Numbers:', 'New:']) {
    const at = TEMPLATE_FIT.indexOf(`\n${label}`);
    const next = TEMPLATE_FIT.indexOf('\n\n', at + 1);
    assert.match(TEMPLATE_FIT.slice(at, next < 0 ? undefined : next), PLACEHOLDER, label);
  }
  assert.deepEqual(reasons({ [A]: doc('shipped', TEMPLATE_FIT) }), ['fit/unfilled/reuses', 'fit/unfilled/numbers', 'fit/unfilled/new']);
});

test('a filled Fit has no reason, and the guidance paragraph above the labels is not read', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', FILLED) }), []);
  assert.deepEqual(reasons({ [A]: doc('shipped', FILLED.replace('## Fit\n', '## Fit\n\nGuidance with a <…placeholder…> in it.\n')) }), []);
});

test('held by status: shipped and any unknown word are held; draft in any case is not; a draft with no Fit asks nothing', () => {
  assert.deepEqual(rules({ [A]: doc('shipped') }), ['status']);
  assert.deepEqual(rules({ [A]: doc('review') }), ['status']);
  for (const draft of ['draft', 'Draft', 'DRAFT', '"draft"']) {
    const r = count({ [A]: doc(draft) });
    assert.deepEqual([r.docs[0].heldBy, r.docs[0].reasons, r.count, r.held, r.drafts], [[], [], 0, 0, [A]], draft);
  }
});

test('held as unreadable: no frontmatter, no status line, an empty status — counted whatever the Fit says', () => {
  for (const status of [null, undefined, '']) {
    const r = count({ [A]: doc(status, FILLED) });
    assert.deepEqual([r.docs[0].heldBy.map((h) => h.rule), r.docs[0].reasons, r.count], [['unreadable'], ['frontmatter/unreadable'], 1], String(status));
  }
  assert.deepEqual(reasons({ [A]: doc(null) }), ['frontmatter/unreadable', 'fit/missing']);
});

test('held by a review: one that names the doc, under any spelling R1 normalises alike; not one of another doc, and not the template', () => {
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/r.md': review(A) }), ['review']);
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/r.md': review(`./${A}`) }), ['review'], 'a path written ./docs/… holds the doc');
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/r.md': review('docs//features/./a.md') }), ['review']);
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/r.md': review(`\`${A}\``) }), ['review'], 'a quoted path');
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/features/b.md': doc('draft', '', 2), 'docs/reviews/r.md': review('docs/features/b.md') }), []);
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/TEMPLATE.md': review(A) }), []);
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/r.md': `Text first.\n\n${review(A)}` }), [], 'a Reviewed: line below the header is text the review carries');
  // Any review counts, current or not: the version line it quotes is not read here.
  assert.deepEqual(rules({ [A]: doc('draft'), 'docs/reviews/old.md': review(A), 'docs/reviews/new.md': review(A) }), ['review', 'review']);
  assert.deepEqual(count({ [A]: doc('draft'), 'docs/reviews/r.md': review(A) }).docs[0].heldBy, [{ rule: 'review', by: 'docs/reviews/r.md' }]);
});

test('held by a milestone: an active or closed one that cites its F-id in Contents; never a shaping or killed one, or a citation elsewhere', () => {
  const m = 'docs/milestones/M1.md';
  assert.deepEqual(rules({ [A]: doc('draft'), [m]: milestone('active', 'the export (F-01)') }), ['milestone']);
  assert.deepEqual(rules({ [A]: doc('draft'), [m]: milestone('closed', 'the export (F-1)') }), ['milestone']);
  assert.deepEqual(rules({ [A]: doc('draft'), [m]: milestone('shaping', 'the export (F-01)') }), []);
  assert.deepEqual(rules({ [A]: doc('draft'), [m]: milestone('killed', 'the export (F-01)') }), []);
  assert.deepEqual(rules({ [A]: doc('draft'), [m]: milestone('active', 'another (F-02)') }), []);
  assert.deepEqual(rules({ [A]: doc('draft'), [m]: `${milestone('active', 'another (F-02)')}\n## No-gos\n\n- not F-01\n` }), [], 'cited outside Contents');
  assert.deepEqual(citedFeatures('the export (F-01), then F-12 and F-2; not RF-3x or F-x'), [1, 12, 2]);
});

test('lacks Fit, one id per case: no section, a label absent, empty bullets, a label written with a mark, a placeholder word', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped') }), ['fit/missing']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- a', 'Numbers:\n- b', '')) }), ['fit/unfilled/new']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- a', 'Numbers:\n- \n*\n', 'New: c')) }), ['fit/unfilled/numbers']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('- Reuses:\n- a', '**Numbers:**\n- b', 'New: c')) }), ['fit/unfilled/reuses', 'fit/unfilled/numbers']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('reuses:\n- a', 'Numbers:\n- b', 'New: c')) }), ['fit/unfilled/reuses'], 'another case is not the label');
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Guidance.\n\n Reuses:\n- a', 'Numbers:\n- b', 'New: c')) }), ['fit/unfilled/reuses'], 'a label starts at the first column');
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- a', 'Numbers:\n- TBD', 'New: c')) }), ['fit/unfilled/numbers']);
});

test('a label written twice: the first line is the one read, and its text ends at the second', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:', 'Numbers:\n- b', 'New: c\n\nReuses:\n- a')) }), ['fit/unfilled/reuses']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- a', 'Numbers:\n- b', 'New: c\n\nNumbers:\n- <…later…>')) }), []);
});

test('the first `## Fit` is the one read, fenced or not: the template quoted in a fence above a filled section reads as unfilled', () => {
  const fenced = `\`\`\`markdown\n${TEMPLATE_FIT}\`\`\`\n\n${FILLED}`;
  assert.deepEqual(reasons({ [A]: doc('shipped', fenced) }), ['fit/unfilled/reuses', 'fit/unfilled/numbers', 'fit/unfilled/new']);
});

test('the short answers pass, each alone, and are counted; `nothing` with `none` is unfilled/new', () => {
  const nothing = 'Reuses:\n- nothing: searched for a date range picker by behaviour, found none';
  const r = count({
    [A]: doc('shipped', fit(nothing, 'Numbers: none shown', 'New: the picker, since nothing existing picks a range.')),
    'docs/features/b.md': doc('shipped', fit('Reuses:\n- `total()` in lib/money.ts', 'Numbers:\n- `None shown`.', 'New: `none`.'), 2),
    'docs/features/c.md': doc('shipped', FILLED, 3),
    'docs/features/d.md': doc('draft', fit(nothing, 'Numbers: none shown', 'New: x'), 4),
  });
  assert.deepEqual([r.count, r.held, r.short], [0, 3, { reusesNothing: 1, noNumbers: 2, nothingNew: 1 }], 'a draft not yet held is in none of the three');
  assert.deepEqual(r.docs.map((d) => [d.reusesNothing, d.noNumbers, d.nothingNew]), [[true, true, false], [false, true, true], [false, false, false], [true, true, false]]);

  assert.deepEqual(reasons({ [A]: doc('shipped', fit(nothing, 'Numbers:\n- b', 'New: none')) }), ['fit/unfilled/new']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- Nothing\n* nothing either', 'Numbers:\n- b', 'New:\n- None.')) }), ['fit/unfilled/new'], 'case, both list marks, and a bulleted none');
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- nothing\n- `total()` in lib/money.ts', 'Numbers:\n- b', 'New: none')) }), [], 'one bullet names something reused');
});

test('`Reuses:` with its text on the label line and no bullets is one item, so a filled line with `New: none` is filled (0.2 review, AR-10 item 1)', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses: the date helper in lib/dates.ts', 'Numbers:\n- b', 'New: none')) }), []);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses: nothing, searched by behaviour', 'Numbers:\n- b', 'New: none')) }), ['fit/unfilled/new']);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses: the date helper\n  in lib/dates.ts\n- nothing else', 'Numbers:\n- b', 'New: none')) }), [], 'the label line and a bullet are two items');
});

test('backticks on `nothing` are removed before it is read, as the template writes the word (0.2 review, AR-10 item 2)', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- `nothing`, searched lib/ by behaviour', 'Numbers:\n- b', 'New: none')) }), ['fit/unfilled/new']);
  assert.equal(count({ [A]: doc('shipped', fit('Reuses:\n- `nothing`, searched lib/', 'Numbers:\n- b', 'New: c')) }).short.reusesNothing, 1);
});

test('a doc counts once, whatever its reasons', () => {
  const r = count({ [A]: doc(null, TEMPLATE_FIT) });
  assert.deepEqual([r.count, r.docs[0].reasons.length], [1, 4]);
});

test('not a feature doc: no F-<n> heading, a link, a folder — named and never counted; a companion, a subfolder, TEMPLATE.md and README.md are neither', () => {
  const r = count({
    [A]: doc('shipped', FILLED),
    'docs/features/notes.md': '# Notes\n\nNo id here.\n',
    'docs/features/claims.md': `---\nstatus: shipped\ncompanion-of: ${A}\n---\n\n# F-1 — the table\n`,
    'docs/features/TEMPLATE.md': doc('shipped'),
    'docs/features/README.md': doc('shipped'),
    'docs/features/sub/deep.md': doc('shipped', '', 9),
    'docs/features/folder.md/x': 'x',
    'dev/features/other.md': 'no heading\n',
    'elsewhere/target.md': doc('shipped', '', 8),
  }, (dir) => symlinkSync(join(dir, 'elsewhere/target.md'), join(dir, 'docs/features/link.md')));
  assert.deepEqual(r.others, [
    { path: 'docs/features/folder.md', why: 'not-a-file' },
    { path: 'docs/features/link.md', why: 'not-a-file' },
    { path: 'docs/features/notes.md', why: 'no-id' },
    { path: 'dev/features/other.md', why: 'no-id' },
  ]);
  assert.deepEqual([r.docs.map((d) => d.path), r.count, r.held, r.files], [[A], 0, 1, 6]);
});

test('the numbers of one pass: 3 held docs with no Fit, 2 drafts not yet held with none, 1 file that is not a feature doc', () => {
  const r = count({
    'docs/features/shipped.md': doc('shipped', '', 1),
    'docs/features/reviewed.md': doc('draft', '', 2),
    'docs/features/scheduled.md': doc('draft', '', 3),
    'docs/features/filled.md': doc('shipped', FILLED, 4),
    'docs/features/draft-a.md': doc('draft', '', 5),
    'dev/features/draft-b.md': doc('draft', TEMPLATE_FIT, 6),
    'docs/features/draft-filled.md': doc('draft', FILLED, 7),
    'docs/features/notes.md': '# Notes\n',
    'docs/reviews/r.md': review('docs/features/reviewed.md'),
    'docs/milestones/M1.md': milestone('active', 'the third (F-03)'),
  });
  assert.deepEqual([r.count, r.held, r.drafts, r.others.map((o) => o.path)], [3, 4, ['docs/features/draft-a.md', 'dev/features/draft-b.md'], ['docs/features/notes.md']]);
  assert.deepEqual(r.docs.filter((d) => d.reasons.length).map((d) => d.path), ['docs/features/reviewed.md', 'docs/features/scheduled.md', 'docs/features/shipped.md']);
});

test('a project with no feature doc, or neither folder: every number is 0', () => {
  for (const files of [{}, { 'docs/features/TEMPLATE.md': doc('shipped') }]) {
    const r = count(files);
    assert.deepEqual([r.count, r.held, r.drafts, r.others, r.files, r.docs], [0, 0, [], [], 0, []]);
  }
});

test('readFeatureFiles: every F-<n> a heading carries, the companion as written, and what a feature doc is', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fit-'));
  try {
    mkdirSync(join(dir, 'docs/features'), { recursive: true });
    writeFileSync(join(dir, A), '---\r\nstatus: draft\r\ncompanion-of: docs/features/b.md\r\n---\r\n\r\n# F-02 — x\r\n\r\n> ## F-7 — quoted\r\n');
    writeFileSync(join(dir, 'docs/features/b.md'), doc('draft', '', 2));
    const [a, b] = readFeatureFiles(dir);
    assert.deepEqual([a.path, a.regular, a.ns, a.companionOf, isFeatureDoc(a)], [A, true, [2, 7], 'docs/features/b.md', false]);
    assert.deepEqual([b.ns, b.companionOf, isFeatureDoc(b)], [[2], null, true]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
