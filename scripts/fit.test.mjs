#!/usr/bin/env node
// The Fit count (ci/checks/lib/fit.mjs; F-12, dev/features/feature-fit.md §2): what is held, what lacks Fit, and
// the numbers sync and the check both read. Module level: the check's own cases go through its command, in its
// own test. Every file here is inert text. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isFeatureDoc, readFeatureFiles } from '../ci/checks/lib/feature-docs.mjs';
import { fitCount } from '../ci/checks/lib/fit.mjs';
import { frontmatter, hasPlaceholder, lineRest, PLACEHOLDER, UNREADABLE } from '../ci/checks/lib/frontmatter.mjs';
import { commentCrossesHeading, commentSpans, prose, repeatedHeadings, section, sectionLines } from '../ci/checks/lib/markdown.mjs';
import { citedFeatures, contents } from '../ci/checks/lib/milestones.mjs';
import { parseBaselines, serialiseBaselines } from '../ci/checks/lib/ratchet.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

test("docs/features/TEMPLATE.md: its Fit section is the one this file holds, and each of its three lines holds a placeholder", () => {
  const template = readFileSync(join(SRC, 'docs', 'features', 'TEMPLATE.md'), 'utf8');
  const own = sectionLines(template, 'Fit', 2);
  assert.deepEqual(own, sectionLines(`${TEMPLATE_FIT}\n## Contract\n`, 'Fit', 2), 'TEMPLATE_FIT below is the template\'s section, line for line');
  for (const label of ['Reuses:', 'Numbers:', 'New:']) {
    const at = own.findIndex((l) => l.startsWith(label));
    const end = own.findIndex((l, i) => i > at && l === '');
    assert.match(own.slice(at, end < 0 ? undefined : end).join('\n'), PLACEHOLDER, `${label} in the template`);
  }
});

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

test('text under `Reuses:` with no list mark is an item, wherever it starts: `nothing` on the next line with `New: none` is unfilled/new', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\nnothing, searched lib/ by behaviour', 'Numbers:\n- b', 'New: none')) }), ['fit/unfilled/new']);
  assert.equal(count({ [A]: doc('shipped', fit('Reuses:\n\nnothing, searched lib/\n  by behaviour', 'Numbers:\n- b', 'New: c')) }).short.reusesNothing, 1);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\nthe date helper in lib/dates.ts', 'Numbers:\n- b', 'New: none')) }), []);
});

test('an unfilled label is never also a short answer: an empty `Reuses:` with `New: none` lacks reuses only, and a doc with any label unfilled gave no short answer', () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:', 'Numbers:\n- b', 'New: none')) }), ['fit/unfilled/reuses']);
  const r = count({ [A]: doc('shipped', fit('Reuses:\n- nothing, searched lib/', 'Numbers:', 'New: c')) });
  assert.deepEqual([r.docs[0].reasons, r.docs[0].reusesNothing, r.short], [['fit/unfilled/numbers'], false, { reusesNothing: 0, noNumbers: 0, nothingNew: 0 }]);
});

test('a line no person writes is read as unfilled, in bounded time: a label line of 200,000 unclosed placeholders', () => {
  const started = Date.now();
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses: ${'<…'.repeat(200_000)}`, 'Numbers:\n- b', 'New: c')) }), ['fit/unfilled/reuses']);
  assert.ok(Date.now() - started < 3_000, `took ${Date.now() - started} ms`);
  // A bullet line of spaces, then text, then a line separator: the mark is matched alone, so the line is read once.
  const again = Date.now();
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- ${' '.repeat(150_000)}a helper\u2028in lib/x`, 'Numbers:\n- b', 'New: c')) }), ['fit/unfilled/reuses'], 'over the line cap, so unfilled');
  assert.ok(Date.now() - again < 3_000, `took ${Date.now() - again} ms`);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- ${'a helper. '.repeat(600)}`, 'Numbers:\n- b', 'New: c')) }), ['fit/unfilled/reuses'], 'over the line cap');
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- ${'a helper. '.repeat(400)}`, 'Numbers:\n- b', 'New: c')) }), [], 'a long line under the cap is read');
});

test('a doc is read as ID1 reads it: a byte-order mark is not part of it, and a header two readers could read two ways is unreadable to all of them (#495)', () => {
  const bom = count({ [A]: `﻿${doc('draft')}` });
  assert.deepEqual([bom.docs[0].heldBy, bom.count], [[], 0], 'a draft saved with a byte-order mark is still a draft');
  assert.deepEqual(reasons({ [A]: doc('shipped', FILLED).replace(/\n/g, '\r') }), ['frontmatter/unreadable']);
  assert.deepEqual(reasons({ [A]: doc('shipped', FILLED).replace(/\n/g, '\r\n') }), []);
});

test('a review that is a link is not read, so it holds nothing', () => {
  const r = count({ [A]: doc('draft'), 'elsewhere/r.md': review(A) }, (dir) => {
    mkdirSync(join(dir, 'docs/reviews'), { recursive: true });
    symlinkSync(join(dir, 'elsewhere/r.md'), join(dir, 'docs/reviews/r.md'));
  });
  assert.deepEqual(r.docs[0].heldBy, []);
});

// The shared reader and writer of ci/baselines.json (ci/checks/lib/ratchet.mjs).
test('parseBaselines and serialiseBaselines: an object of names comes back in the one form; anything else is refused by name', () => {
  assert.equal(serialiseBaselines(parseBaselines('{"dup":12,\t"feature-fit":0}')), '{\n  "dup": 12,\n  "feature-fit": 0\n}\n');
  assert.throws(() => parseBaselines('[1]'), /^Error: ci\/baselines\.json is not a JSON object of name → number$/);
  assert.throws(() => parseBaselines('null'), /not a JSON object/);
  assert.throws(() => parseBaselines('{'), /^Error: ci\/baselines\.json is not valid JSON: /);
});

test('the ratchet command on a ci/baselines.json it cannot read: BROKEN, exit 2, naming the file — never a stack trace, never green, and --update writes nothing', () => {
  for (const [bytes, why] of [['[]\n', /BROKEN — ci\/baselines\.json is not a JSON object of name → number/], ['{ not json', /BROKEN — ci\/baselines\.json is not valid JSON: /]]) {
    for (const flags of [[], ['--update']]) {
      const dir = mkdtempSync(join(tmpdir(), 'fit-'));
      try {
        mkdirSync(join(dir, 'ci'));
        writeFileSync(join(dir, 'ci/baselines.json'), bytes);
        writeFileSync(join(dir, 'report.json'), '{"n": 1}');
        const r = spawnSync(process.execPath, [join(SRC, 'ci/ratchet.mjs'), 'dup', 'report.json', 'n', ...flags], { cwd: dir, encoding: 'utf8' });
        assert.deepEqual([r.status, r.stderr], [2, ''], `${bytes} ${flags}`);
        assert.match(r.stdout, why);
        assert.equal(readFileSync(join(dir, 'ci/baselines.json'), 'utf8'), bytes);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }
});

test('readFeatureFiles normalises what ID1 always has: a minus sign for the hyphen, a byte-order mark before the first heading', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fit-'));
  try {
    mkdirSync(join(dir, 'docs/features'), { recursive: true });
    writeFileSync(join(dir, A), '# F−3 — a minus sign\n');
    writeFileSync(join(dir, 'docs/features/b.md'), '﻿# F-4 — after a byte-order mark\n');
    assert.deepEqual(readFeatureFiles(dir).map((f) => f.ns), [[3], [4]]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a list mark with nothing after it is no item: `nothing` beside one, with `New: none`, is still unfilled/new', () => {
  for (const reuses of ['Reuses: nothing\n- ', 'Reuses:\n- nothing\n- ', 'Reuses:\n* \n- `nothing`; searched\n-\t', 'Reuses:\n- \n- nothing']) {
    assert.deepEqual(reasons({ [A]: doc('shipped', fit(reuses, 'Numbers:\n- the total, in lib/money.ts', 'New: none')) }), ['fit/unfilled/new'], JSON.stringify(reuses));
  }
  // An empty mark beside a real item changes nothing, and marks alone are still an empty label.
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- \n- `total()` in lib/money.ts', 'Numbers:\n- none shown', 'New: none')) }), []);
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n- \n* ', 'Numbers:\n- none shown', 'New: none')) }), ['fit/unfilled/reuses']);
});

// The readers the count goes through, each rewritten to read a line once (#430): the patterns they replace are
// kept here, and each reader gives what its pattern gave on text built from the pieces that matter to it.
// mulberry32: every pair of neighbouring pieces turns up, which a generator read by its low bits does not give.
const pick = (seed) => {
  let s = seed >>> 0;
  return (n) => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
};
const built = (pieces, seed, max = 12) => {
  const next = pick(seed);
  return Array.from({ length: 1 + next(max) }, () => pieces[next(pieces.length)]).join('');
};
const OLD_COMMENT = /<!--[\s\S]*?-->/g;
// prose() with closed comments only, as it was: its comment pattern, then the same pass over fences.
function oldProse(md) {
  const out = [];
  let fence = null;
  for (const line of md.replace(OLD_COMMENT, '').split(/\r?\n/)) {
    const mark = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && line.trim() === mark) fence = null;
    } else if (mark) fence = mark;
    else out.push(line);
  }
  return out.join('\n');
}
function oldFrontmatter(md) {
  const unquote = (s) => s.trim().replace(/^(['"])(.*)\1$/, '$2');
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  let parent = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (top) {
      parent = top[2].trim() === '' ? top[1] : null;
      out[top[1]] = parent ? {} : unquote(top[2]);
      continue;
    }
    const child = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (child && parent) out[parent][child[1]] = unquote(child[2]);
  }
  return out;
}

test('commentSpans: the spans the comment pattern matched, on 20,000 built texts; section() and commentCrossesHeading() read through it', () => {
  const pieces = ['<!--', '-->', '<!-', '->', '-', '>', '<', '!', 'a', '\n', '## H\n', '##', ' '];
  for (let seed = 1; seed <= 20000; seed++) {
    const md = built(pieces, seed);
    assert.deepEqual(commentSpans(md).map(([a, b]) => md.slice(a, b)), md.match(OLD_COMMENT) ?? [], JSON.stringify(md));
    assert.equal(commentCrossesHeading(md), (md.match(OLD_COMMENT) ?? []).some((span) => span.slice(0, -3).split('\n').slice(1).some((l) => /^#{1,6}(?:\s|$)/.test(l.trim()))), JSON.stringify(md));
    assert.equal(prose(md, { frontmatter: false, unclosed: false }), oldProse(md), JSON.stringify(md));
    assert.equal(section(`## T\n${md}`, 'T', 2), (() => {
      const lines = `## T\n${md}`.replace(OLD_COMMENT, '').split(/\r?\n/);
      const start = lines.findIndex((l) => /^##\s+T\s*$/i.test(l.trim()));
      if (start < 0) return null;
      const body = [];
      for (const l of lines.slice(start + 1)) {
        const h = l.match(/^(#{1,6})\s/);
        if (h && h[1].length <= 2) break;
        body.push(l);
      }
      return body.join('\n').trim();
    })(), JSON.stringify(md));
  }
});

test('frontmatter(): what the two header patterns read, on 20,000 built blocks — a line that holds a line or paragraph separator, or a lone CR, among them', () => {
  const pieces = ['key', 'a-b', ':', ': ', ' ', '  ', '\t', 'value', '"q"', "'", '#', '\u2028', '\u2029', '\r', '\n', '\n', '\n  ', '\u00a0'];
  for (let seed = 1; seed <= 20000; seed++) {
    const md = `---\n${built(pieces, seed, 16)}\n---\n`;
    // The two readers there were before #495: the header as written, and with every CR read as a line end. The one
    // reader never takes one side: what it reads, both read; where they differ, it reads nothing.
    const fm = frontmatter(md);
    const [asWritten, everyCr] = [oldFrontmatter(md), oldFrontmatter(md.replace(/\r\n|\r/g, '\n'))];
    if (!md.includes('\r')) assert.deepEqual(fm, asWritten, JSON.stringify(md));
    else if (fm !== UNREADABLE) assert.deepEqual([fm, fm], [asWritten, everyCr], JSON.stringify(md));
  }
});

test('contents(): the items the numbered-line pattern opened, on 20,000 built sections', () => {
  const pieces = ['1', '12', '.', '. ', ' ', '\t', 'text', '(F-01)', '\u2028', '\r', '\n', '\n', '\n  ', '\u00a0'];
  const old = (md) => {
    const items = [];
    for (const line of (section(md, 'Contents', 2) ?? '').split(/\r?\n/)) {
      const open = line.match(/^(\d+)\.\s+(.*)$/);
      if (open) items.push({ n: Number(open[1]), text: open[2] });
      else if (items.length && /^\s+\S/.test(line) && !/^\s*(?:owed|ran):/i.test(line)) items[items.length - 1].text += ' ' + line.trim();
    }
    return items;
  };
  for (let seed = 1; seed <= 20000; seed++) {
    const md = `## Contents\n\n${built(pieces, seed, 16)}\n`;
    assert.deepEqual(contents(md).map(({ n, text }) => ({ n, text })), old(md), JSON.stringify(md));
  }
});

test('hasPlaceholder(): PLACEHOLDER.test(), on 20,000 built texts', () => {
  const pieces = ['<…', '<', '…', '>', '\n', 'x', ' ', 'TBD', 'TBDs', '[NEEDS CLARIFICATION', '[NEEDS'];
  for (let seed = 1; seed <= 20000; seed++) {
    const text = built(pieces, seed);
    assert.equal(hasPlaceholder(text), PLACEHOLDER.test(text), JSON.stringify(text));
  }
});

// Each bound is many times what the reader takes and a small part of what its pattern took on the same text.
const within = (ms, run) => {
  const t = performance.now();
  run();
  const took = performance.now() - t;
  assert.ok(took < ms, `took ${Math.round(took)} ms, over ${ms}`);
};
test('text nobody writes is read in time that grows with its length: openers with no closer, a header line or a numbered line of spaces before a separator, a file of unclosed placeholders', () => {
  const openers = `## Fit\n${'<!--'.repeat(150000)}`;
  within(1500, () => assert.equal(section(openers, 'Fit', 2).length, 600000));
  within(1500, () => assert.equal(commentCrossesHeading(openers), false));
  const header = `---\nstatus:${' '.repeat(300000)}x\u2028\n---\n`;
  within(1500, () => assert.deepEqual(frontmatter(header), {}));
  const item = `## Contents\n\n1.${' '.repeat(300000)}x\u2028y\n`;
  within(1500, () => assert.deepEqual(contents(item), []));
  within(1500, () => assert.equal(hasPlaceholder(`${'<…\n'.repeat(300000)}>`), false));
  within(1500, () => assert.equal(hasPlaceholder(`${'<…'.repeat(300000)}\n>`), false));
  within(1500, () => assert.deepEqual(repeatedHeadings(`## A\n${'<!--'.repeat(150000)}`), []));
  const line = '<…x'.repeat(1666);
  const lines = `${front('shipped')}# F-1 — x\n\n## Fit\n\nReuses:\n${`${line}\n`.repeat(1000)}\nNumbers:\n- x\n\nNew: x\n`;
  within(1500, () => assert.deepEqual(reasons({ [A]: lines }), [], 'an unclosed placeholder opener is not a placeholder'));
});

test("a label is a label only at the first column, on the section's first line too: an indented `Reuses:` straight under the heading reads as absent", () => {
  const indented = (lead) => `## Fit\n${lead}Reuses:\n- \`total()\` in lib/money.ts\n\nNumbers:\n- none shown\n\nNew: the export button\n`;
  for (const lead of ['  ', '\t', '\n    ']) assert.deepEqual(reasons({ [A]: doc('shipped', indented(lead)) }), ['fit/unfilled/reuses'], JSON.stringify(lead));
  assert.deepEqual(reasons({ [A]: doc('shipped', indented('')) }), []);
  assert.deepEqual(reasons({ [A]: doc('shipped', indented('\n\n')) }), [], 'blank lines under the heading change nothing');
});

test('section() is sectionLines() joined and trimmed, and null for the same documents', () => {
  const md = '# T\n\n## One\n\n  first\nsecond  \n\n## Two\nx\n';
  assert.deepEqual(sectionLines(md, 'One', 2), ['', '  first', 'second  ', '']);
  assert.equal(section(md, 'One', 2), 'first\nsecond');
  assert.deepEqual([section(md, 'Three', 2), sectionLines(md, 'Three', 2)], [null, null]);
});

test('a closer on the heading\'s own line, a comment that hides a repeated heading, and a lone CR in a header: the three lines of the rewritten readers no built text reaches', () => {
  assert.equal(commentCrossesHeading('<!--\n##-->'), true, 'the closer is cut before the line is read as a heading');
  assert.deepEqual(repeatedHeadings('## A\n<!--\n## A\n-->\n'), [], 'a heading in a closed comment is not a repeat');
  assert.deepEqual(repeatedHeadings('## A\n<!--\n## A\n').map((h) => h.title), ['A'], 'an unclosed comment hides nothing');
  const CR = String.fromCodePoint(13);
  assert.equal(lineRest(` a${CR}b`), null);
  assert.equal(lineRest(`${CR} a b `), 'a b ', 'a line end in the leading whitespace is whitespace');
  assert.equal(frontmatter(`---\nkey: a${CR}b\nother: c\n---\n`), UNREADABLE, 'unreadable, never the keys one reading finds (#495)');
});

// Filled means: says something. A label's text, and an item under it, counts only when it holds a letter or a digit.
test('a label whose text holds no letter and no digit is unfilled: characters nobody sees, punctuation, a symbol, list marks', () => {
  const blank = [0x200b, 0x2060, 0x3164, 0x2800, 0xad, 0xfeff, 0x200d].map((c) => String.fromCodePoint(c));
  for (const x of [...blank, blank.join(''), '—', '...', '- -', '* *', '✅', '&', '-', '*']) {
    assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- ${x}`, `Numbers: ${x}`, `New: ${x}`)) }), ['fit/unfilled/reuses', 'fit/unfilled/numbers', 'fit/unfilled/new'], JSON.stringify(x));
  }
  for (const x of ['a', '3', 'é', '再利用', 'lib/x.ts', `a${blank[0]}`]) {
    assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- ${x}`, `Numbers: ${x}`, `New: ${x}`)) }), [], JSON.stringify(x));
  }
});

test('a line that says nothing is no item, with or without a space after its mark: `nothing` beside one, with `New: none`, is unfilled/new', () => {
  const ZW = String.fromCodePoint(0x200b);
  for (const other of ['-', '*', '- ', '-\t', `- ${ZW}`, ZW, '- —', '...', '  -  ']) {
    for (const reuses of [`Reuses:\n${other}\n- nothing`, `Reuses:\n- nothing\n${other}`, `Reuses:\n\n${other}\n\n- \`nothing\`; searched\n`, `Reuses: nothing\n${other}`]) {
      assert.deepEqual(reasons({ [A]: doc('shipped', fit(reuses, 'Numbers:\n- the total, in lib/money.ts', 'New: none')) }), ['fit/unfilled/new'], JSON.stringify(reuses));
    }
  }
  // A second line that says something is an item, or continues one: the doc reuses something.
  assert.deepEqual(reasons({ [A]: doc('shipped', fit('Reuses:\n-\n- nothing\n- `total()` in lib/money.ts', 'Numbers:\n- none shown', 'New: none')) }), []);
  // `nothing` hidden behind a character nobody sees is still `nothing`.
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- ${ZW}nothing`, 'Numbers:\n- none shown', `New: no${ZW}ne`)) }), ['fit/unfilled/new']);
});

test('a list mark is looked for on the line as written: a wrapped line that opens with a dash continues its item, and a space nobody sees after a mark is a space', () => {
  const cp = (...c) => String.fromCodePoint(...c);
  for (const dash of [cp(0x2014), cp(0x2013), cp(0x2212), cp(0xff0d), cp(0xff0a)]) {
    for (const reuses of [`Reuses:\n- nothing; searched ci/checks/lib/ by behaviour\n  ${dash} no reader of a count exists there`, `Reuses: nothing\n${dash} searched ci/checks/lib/`]) {
      assert.deepEqual(reasons({ [A]: doc('shipped', fit(reuses, 'Numbers:\n- none shown', 'New: none')) }), ['fit/unfilled/new'], JSON.stringify(reuses));
    }
  }
  for (const space of [cp(0x0b), cp(0x0c), cp(0xfeff), cp(0x2028)]) {
    assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n-${space}nothing`, 'Numbers:\n- none shown', `New: -${space}none`)) }), ['fit/unfilled/new'], JSON.stringify(space));
  }
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses:\n- nothing${cp(0x301)}`, 'Numbers:\n- none shown', 'New: none')) }), ['fit/unfilled/new'], 'a combining mark after the word');
});

test("the label's own line and the Numbers answer go through the same reading: punctuation alone there is no item, and `none shown` with a character nobody sees is counted as none shown", () => {
  assert.deepEqual(reasons({ [A]: doc('shipped', fit(`Reuses: ${String.fromCodePoint(0x2014)}\n- nothing`, 'Numbers:\n- the total, in lib/money.ts', 'New: none')) }), ['fit/unfilled/new']);
  const short = count({ [A]: doc('shipped', fit('Reuses:\n- `total()` in lib/money.ts', `Numbers:\n- none${String.fromCodePoint(0x200b)} shown`, 'New: the export button')) }).short;
  assert.deepEqual(short, { reusesNothing: 0, noNumbers: 1, nothingNew: 0 });
});
