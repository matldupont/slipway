#!/usr/bin/env node
// The decisions reader (ci/checks/lib/decisions.mjs, F-15 §2): labelled lines, heading clauses, events, what is owed,
// fired and unreadable, positions and the prose count, against F-15's Contract at 0.3 and build step 1's lines (AR-1,
// AR-2 and AR-4 of the 0.3 review). Every decision id here is invented, every file inert text in a temporary folder.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { mask, namesDecision, parseDecisions, parseEvent, readDecisions } from '../ci/checks/lib/decisions.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tree = (files, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'decisions-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return fn(readDecisions(dir), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const one = (md) => parseDecisions(md).entries[0];
const doc = (n, { version = '0.2', status = 'draft', body = '' } = {}) => `---\nstatus: ${status}\n---\n\n# F-${n} — x\n\nVersion: ${version}\n\n${body}\n`;
const review = (path, version) => `# Review\n\nReviewed: ${path} @ abc1234\nVersion line: Version: ${version}\n\nBody.\n`;
const milestone = (id, status, items) => `---\nid: ${id}\nstatus: ${status}\n---\n\n# ${id} — x\n\n## Contents\n\n${items.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;
const ids = (list) => list.map((x) => x.id);

test('labelled lines are read: Amends (several, both joins), Reopens when and Closes when, each readable', () => {
  const e = one('## PD-7 — t *(decided 2026-03-01)*\n\nAmends: F-07, F-09 and F-11\nReopens when: F-07 is reviewed\nCloses when: `M2 is closed`.\n');
  assert.deepEqual(e.conditions.map((c) => [c.kind, c.where, c.line, c.readable]), [['changes', 'line', 3, true], ['reopens', 'line', 4, true], ['closes', 'line', 5, true]]);
  assert.deepEqual(e.conditions[0].features, [7, 9, 11]);
  assert.deepEqual(e.conditions[2].events.map((ev) => ev.said), ['M2 is closed']);
  assert.equal(e.prose, false);
});

test('the three outcome lines are read as nothing, and a heading whose clause was removed reads as nothing', () => {
  const e = one('## PD-7 — t *(decided 2026-03-01)*\n\nReopened 2026-03-05: reopens when M2 is active\nClosed 2026-03-06: x\nReviewed 2026-03-07: stands — closes when M3 is closed\n');
  assert.deepEqual([e.conditions, e.prose], [[], false]);
});

test('heading clauses in each accepted spelling are conditions; the first clause is the status, never one', () => {
  const spellings = [['reopens when', 'reopens'], ['Reopens if', 'reopens'], ['closes when', 'closes'], ['CLOSES IF', 'closes'], ['provisional until', 'reopens']];
  for (const [w, kind] of spellings) {
    const e = one(`## PD-3 — t *(decided 2026-03-01 · ${w} M2 is activated)*\n`);
    assert.deepEqual(e.conditions.map((c) => [c.kind, c.where, c.readable, c.events[0]?.said]), [[kind, 'heading', true, 'M2 is active']], w);
  }
  // The first clause is never read as a condition; one holding a clause opening is unreadable (the owner, #466).
  assert.deepEqual(one('## PD-3 — t *(reopens when M2 is active)*\n').conditions.map((c) => [c.where, c.readable]), [['heading', false]]);
  assert.deepEqual(one('## PD-3 — t *(open — week 1)*\n').conditions, []);
  const unreadable = one('## PD-3 — t *(decided 2026-03-01 · provisional until the supplier confirms in writing)*\n');
  assert.deepEqual(unreadable.conditions.map((c) => [c.kind, c.readable]), [['reopens', false]]);
});

test('a lookalike label is prose; a labelled line inside a fenced block under a decision is unreadable (the owner, #466)', () => {
  for (const line of ['- Reopens when: F-07 has a doc', '**Amends:** F-07', ' Amends: F-07', 'amends: F-07']) {
    assert.deepEqual(one(`## PD-1 — t *(decided 2026-03-01)*\n\n${line}\n`).conditions, [], line);
  }
  assert.equal(one('## PD-1 — t *(decided 2026-03-01)*\n\n- Reopens when: F-07 has a doc\n').prose, true);
  assert.deepEqual(one('## PD-1 — t *(decided 2026-03-01)*\n\n```markdown\nAmends: F-07\nReopens when: F-07 has a doc\n```\n').conditions.map((c) => [c.kind, c.readable]), [['changes', false], ['reopens', false]]);
});

test('a stray backtick above a label in its paragraph never hides it', () => {
  const e = one('## PD-7 — t *(decided 2026-03-01)*\n\nAmends: `F-07\nReopens when: F-07 is reviewed\nCloses when: M2 is closed\n');
  assert.deepEqual(e.conditions.map((c) => [c.kind, c.readable]), [['changes', true], ['reopens', true], ['closes', true]]);
  const f = one('## PD-8 — t\n\nWe chose the ` key.\nReopens when: M2 is active\n');
  assert.deepEqual(f.conditions.map((c) => c.readable), [true]);
});

test('invisible characters before a label, or inside its word, are taken out: the line is read as a label', () => {
  for (const line of ['​Amends: F-07', '﻿Amends: F-07', 'Am​ends: F-07', '⁠Reopens when: F-07 has a doc']) {
    const e = one(`## PD-1 — t *(decided 2026-03-01)*\n\n${line}\n`);
    assert.equal(e.conditions.length, 1, JSON.stringify(line));
    assert.equal(e.conditions[0].readable, true);
  }
});

test('an entry ends at the next decision heading or the next level-1 or level-2 heading; a heading in a fence is an entry', () => {
  const { entries } = parseDecisions('## PD-1 — a *(decided 2026-03-01)*\n\n### Notes\nAmends: F-01\n\n## Week 1 — decide\n\nAmends: F-02\n\n### PD-2 — b *(open)*\nAmends: F-03\n```\n## PD-3 — c\n```\n');
  assert.deepEqual(entries.map((e) => [e.id, e.conditions.flatMap((c) => c.features ?? [])]), [['PD-1', [1]], ['PD-2', [3]], ['PD-3', []]]);
  assert.deepEqual(parseDecisions('# Decisions\n\nNo entries yet.\n').entries, []);
});

test('Amends with any token that is not an F-id is unreadable; so is an event outside the table', () => {
  for (const t of ['the roadmap', 'F-07 or later', 'F-07,', '', 'f-07']) {
    assert.equal(one(`## PD-1 — t\n\nAmends: ${t}\n`).conditions[0].readable, false, t);
  }
  for (const t of ['the page shows live state', 'F-07 has a doc or soon', 'M2 is done', '2026-02-30 passes', 'm2 is active', 'F-07 constructor', 'F-07 __proto__', 'M2 constructor', 'M2 toString', 'F-07 hasOwnProperty']) {
    assert.equal(one(`## PD-1 — t\n\nReopens when: ${t}\n`).conditions[0].readable, false, t);
  }
});

test('events: every form of the table, case-folded verbs, ids in their case, a closing stop and backticks removed', () => {
  const said = (s) => parseEvent(s)?.said ?? null;
  assert.deepEqual(['F-7 has a doc', 'F-07 HAS A FEATURE DOC', 'F-07 is reviewed', 'F-07 is shipped', 'M2 is activated', 'M2 goes active', 'M2 closes', '2026-03-09 has passed', 'acme/app#12 lands', '#12 is closed'].map(said),
    ['F-07 has a doc', 'F-07 has a doc', 'F-07 is reviewed', 'F-07 is shipped', 'M2 is active', 'M2 is active', 'M2 is closed', '2026-03-09 passes', '#12 closes', '#12 closes']);
  assert.deepEqual(parseEvent('acme/app#12 lands'), { kind: 'issue', issue: 12, readable: false, said: '#12 closes' });
  const c = one('## PD-1 — t\n\nReopens when: `F-07 has a doc`  or  M2 is active.\n').conditions[0];
  assert.deepEqual([c.readable, c.events.map((e) => e.kind)], [true, ['doc', 'active']]);
});

test('ids compare by prefix and number: D-44 is D-044, never D-4, D-440 or PD-44', () => {
  assert.equal(namesDecision('see D-044.', 'D-44'), true);
  for (const t of ['D-4', 'D-440', 'PD-44', 'XD-44', 'D-44x']) assert.equal(namesDecision(t, 'D-44'), false, t);
  assert.equal(namesDecision('PD-007', 'PD-7'), true);
  assert.deepEqual([one('## D-044 — t\n').id, one('## D-044 — t\n').key], ['D-044', 'D-44']);
});

test('a line is cut at 500 characters before any pattern reads it', () => {
  const pad = 'x'.repeat(495);
  assert.deepEqual(one(`## PD-1 — t\n\n${pad} M2 item 4\n`).positions, []);
  assert.equal(one(`## PD-1 — t\n\nReopens when: F-07 has a doc ${'y'.repeat(600)}\n`).conditions[0].text.length <= 500, true);
  assert.equal(one(`## PD-1 — t\n\n${' '.repeat(50000)}x\n`).prose, false);
});

test('positions: the five shapes in a heading clause or body; not with no milestone id, nor in a code span or fence', () => {
  const at = (md) => one(md).positions.map((p) => [p.line, p.milestone, p.item]);
  for (const s of ['M2 item 4', "M2's item 4", 'M2 Contents item 4', "M2's Contents item 4", 'item 4 of M2', 'M2’s item 4']) {
    assert.deepEqual(at(`## PD-3 — t\n\nThis was ${s}.\n`), [[3, 2, 4]], s);
  }
  assert.deepEqual(at("## PD-4 — t *(decided 2026-03-01 · reopens when M2 item 4's feature doc is written)*\n\nClean.\n"), [[1, 2, 4]]);
  for (const s of ['item 4 alone', 'm2 item 4', 'M2  item 4', 'an id `D-044` in a span', '`M2 item 4`', 'a span `that\ncrosses M2 item 4` a break', 'a stray ` that never closes M2 item 4']) {
    assert.deepEqual(at(`## PD-3 — t\n\n${s}\n`), [], s);
  }
  assert.deepEqual(at('## PD-3 — t\n\n```\nM2 item 4\n```\n'), []);
  assert.deepEqual(at('## PD-3 — t\n\na span `that\ncrosses` a break, then M2 item 4\n'), [[4, 2, 4]]);
  assert.deepEqual(at('## PD-3 — t\n\na stray `\n\nnext paragraph M2 item 4\n'), [[5, 2, 4]]);
});

test('the heading is read masked: a position or prose in its code span is not counted, and a span never runs past it', () => {
  assert.deepEqual(one('## PD-1 — about `M2 item 4` *(decided 2026-03-01)*\n').positions, []);
  assert.equal(one('## PD-1 — t *(decided 2026-03-01 · see `revisit when` above)*\n').prose, false);
  assert.deepEqual(one('## PD-1 — t `stray\nM2 item 4\n').positions.map((p) => p.line), [2]);
});

test('mask keeps every column, blanks fences whole and spans across a paragraph only', () => {
  const lines = ['a `b', 'c` d', '', '```', 'e', '```', 'f'];
  const m = mask(lines);
  assert.deepEqual(m.map((l) => l.length), lines.map((l) => l.length));
  assert.deepEqual(m, ['a   ', '   d', '', '   ', ' ', '   ', 'f']);
  assert.deepEqual(mask(['x `😀` y']), ['x      y']);
});

test('prose: the pattern\'s hits and misses, in an entry with no readable condition', () => {
  const p = (body, head = '*(decided 2026-03-01)*') => one(`## PD-1 — t ${head}\n\n${body}\n`).prose;
  for (const s of ['We revisit this when CI time is a measured problem.', 'Reopens if the vendor changes terms.', 'It closes once the pilot ends.', 'Provisional until the supplier confirms.', 'revisited after launch', 'reopened when asked']) assert.equal(p(s), true, s);
  for (const s of ['What reopens it: what the pass finds.', 'moving platform reopens intake', 'reopening when it comes', 'a "reopens when" quoted', 'in a `reopens when` span', '```\nrevisit when x\n```', 'Reopened 2026-03-01: revisit when x']) assert.equal(p(s), false, s);
  assert.equal(p('Revisit when CI time is a measured problem.\nReopens when: M2 is active'), false);
  assert.equal(p('Revisit when CI time is a measured problem.\nAmends: F-07'), true);
});

test('a parenthesis inside the suffix, or text after its close, never hides a clause', () => {
  const e = one('## PD-1 — t *(decided 2026-03-01 · reopens when the vendor (Acme) changes terms)*\n');
  assert.deepEqual([e.conditions.length, e.conditions[0]?.readable], [1, false]);
  const f = one('## PD-2 — t *(decided 2026-03-01 · reopens when M2 is activated)* see below\n');
  assert.deepEqual(f.conditions.map((c) => c.readable), [false]);
  assert.equal(one('## PD-3 — t *(decided 2026-03-01 · revisit when the vendor (Acme) changes)*\n').prose, true);
  assert.deepEqual(one('## PD-4 — t *(decided 2026-03-01 · reopens when M2 is activated\n').conditions.map((c) => c.readable), [true]);
  assert.deepEqual(one('## PD-5 — t\n').clauses, []);
  assert.deepEqual(one('## PD-6 — t *(decided 2026-03-01 · reopens when M2 is activated)*\n').clauses, [{ text: 'decided 2026-03-01' }, { text: 'reopens when M2 is activated' }]);
});

test('a second group, a span holding *( or a wide character in a span never hides a heading clause', () => {
  assert.deepEqual(one('## PD-1 — t *(decided 2026-03-01 · reopens when M2 is closed)* *(note)*\n').conditions.map((c) => [c.readable, c.events[0]?.said]), [[true, 'M2 is closed']]);
  assert.equal(one('## PD-2 — t *(decided 2026-03-01 · revisit when x)* *(see PD-4)*\n').prose, true);
  assert.deepEqual(one('## PD-3 — about `*(x)` *(decided 2026-03-01 · reopens when M2 is closed)*\n').conditions.map((c) => c.readable), [true]);
  // A suffix only quoted in a code span is not read as clauses; the backstop makes the decision unreadable instead.
  assert.deepEqual(one('## PD-6 — the form `*(decided 2026-03-01 · reopens when M2 is activated)*` quoted\n').conditions.map((c) => [c.where, c.readable]), [['heading', false]]);
  assert.equal(one('## PD-4 — `𠀀` *(decided 2026-03-01 · revisit when X)*\n').prose, true);
  // Twenty wide characters in a span: the prose window must not drift onto the unreadable clause after it.
  const wide = one(`## PD-5 — \`${"😀".repeat(20)}\` *(decided 2026-03-01 · reopens when the PRD changes)*\n`);
  assert.deepEqual([wide.prose, wide.conditions.map((c) => c.readable)], [false, [false]]);
});

test('the backstop: a clause opening a typo hid from the suffix reading makes the decision unreadable, never silent', () => {
  const read = (h) => one(`## ${h}\n`).conditions.map((c) => [c.where, c.readable]);
  // A stray backtick in the title masks the rest of the heading, suffix included.
  assert.deepEqual(read('PD-1 — keep the ` key *(decided 2026-03-01 · reopens when M2 is closed)*'), [['heading', false]]);
  assert.deepEqual(read('PD-2 — keep the ` key *(decided 2026-03-01 · provisional until the owner signs)*'), [['heading', false]]);
  // No suffix at all, the clause written into the title.
  assert.deepEqual(read('PD-3 — t, closes when M2 is closed'), [['heading', false]]);
  // Read normally: nothing extra.
  assert.deepEqual(read('PD-4 — t *(decided 2026-03-01 · reopens when M2 is closed)*'), [['heading', true]]);
  assert.deepEqual(read('PD-5 — t *(decided 2026-03-01 — reopens when M2 is activated)*'), [['heading', false]]);
  assert.deepEqual(read('PD-6 — when it reopens or closes *(decided 2026-03-01)*'), []);
  // A heading in a fence is an entry, its suffix is not read, and a clause opening in it is unreadable (the owner, #466).
  assert.deepEqual(parseDecisions('## PD-7 — t\n\n```\n## PD-8 — x *(decided 2026-03-01 · reopens when M2 is closed)*\n```\n').entries.map((e) => e.conditions.map((c) => c.readable)), [[], [false]]);
  assert.deepEqual(parseDecisions('## PD-7 — t\n\n```\n## PD-8 — x *(decided 2026-03-01)*\n```\n').entries.map((e) => e.conditions.length), [0, 0]);
  tree({ 'decisions.md': '## PD-1 — keep the ` key *(decided 2026-03-01 · reopens when M2 is closed)*\n' }, (r) => assert.deepEqual(r.unreadable().map((u) => [u.id, u.issueOnly]), [['PD-1', false]]));
});

test('a stray heading inside an entry is counted once, as a stray: its words never make the entry prose too (build step 4)', () => {
  const md = '## PD-1 — t *(decided 2026-03-01)*\n\n### PD3 — u *(decided 2026-03-01 · reopens when M2 is activated)*\n';
  const r = parseDecisions(md);
  assert.deepEqual([r.strays, r.entries[0].prose], [[3], false]);
  // The same words in the body of the entry still count as prose, once.
  assert.equal(one('## PD-1 — t *(decided 2026-03-01)*\n\nIt reopens when M2 is activated.\n').prose, true);
});

test('the decisions waiting on an issue: a condition naming one, readable or not, in a line or a heading clause; an outcome or Amends: line is not one (build step 4)', () => {
  const ids = (md) => tree({ 'decisions.md': md }, (r) => r.awaitingIssue());
  assert.deepEqual(ids('## PD-1 — t\n\nCloses when: #12 lands\n\n## PD-2 — u *(decided 2026-03-01 · closes when owner/repo#7 is closed)*\n\n## PD-3 — v\n\nReopens when: F-07 has a doc or #9 closes\n'), ['PD-1', 'PD-2', 'PD-3']);
  assert.deepEqual(ids('## PD-1 — t\n\nClosed 2026-03-10: done\n\n## PD-2 — u\n\nAmends: F-07\n\n## PD-3 — v\n\nReopens when: F-07 has a doc\n\n## PD-4 — w\n\n- Closes when: #12 lands\n'), []);
  assert.deepEqual(ids('## PD-1 — t\n\n```\nCloses when: #12 lands\n```\n'), [], 'a fenced condition is unreadable and names no issue');
  tree({}, (r) => assert.deepEqual(r.awaitingIssue(), []));
});

test('AR-4: the heading suffix is read by the prose pattern outside every condition clause', () => {
  assert.equal(one('## PD-1 — t *(decided 2026-03-01 · revisit when M2 is activated)*\n').prose, true);
  // A clause opening in the first clause makes the decision unreadable, so it is counted there, not as prose too.
  assert.equal(one('## PD-1 — t *(decided 2026-03-01 — reopens when M2 is activated)*\n').prose, false);
  assert.equal(one('## PD-1 — t *(open — week 1)*\n').prose, false);
  // Read literally, the build line would count an unreadable clause twice, here and in the Unreadable line.
  const e = one('## PD-1 — t *(decided 2026-03-01 · provisional until the supplier confirms in writing)*\n');
  assert.deepEqual([e.prose, e.conditions[0].readable], [false, false]);
});

test('no decisions.md, or one that is not a regular file: an empty record that says why', () => {
  tree({}, (r) => assert.deepEqual([r.missing, r.entries, r.owed(), r.fired('2026-03-10'), r.unreadable(), r.proseCount()], ['does not exist', [], [], [], [], []]));
  tree({ 'real.md': '## PD-1 — t\n\nAmends: F-01\n' }, (_, dir) => {
    symlinkSync(join(dir, 'real.md'), join(dir, 'decisions.md'));
    assert.deepEqual([readDecisions(dir).missing, readDecisions(dir).entries], ['is a link, not a file', []]);
  });
  tree({ 'decisions.md': '# Decisions\n' }, (r) => assert.deepEqual([r.missing, r.entries], [null, []]));
});

test('a tree a pull request shaped never makes the reader throw: a folder named x.md, a file where a folder goes, links', () => {
  const rec = '## PD-1 — a\n\nAmends: F-07\nReopens when: F-07 is reviewed\n\n## PD-2 — b\n\nReopens when: M2 is active\n';
  tree({ 'decisions.md': rec, 'docs/reviews': 'not a folder', 'outside.md': milestone('M2', 'active', ['F-07 per PD-1']) }, (r, dir) => {
    mkdirSync(join(dir, 'docs/milestones/x.md'), { recursive: true });
    symlinkSync(join(dir, 'outside.md'), join(dir, 'docs/milestones/M2-link.md'));
    assert.deepEqual([r.owed().map((o) => o.feature), r.fired('2026-03-10')], [[7], []]);
  });
  for (const folder of ['docs/features', 'dev/features']) {
    tree({ 'decisions.md': rec, [folder]: 'a file' }, (r) => assert.deepEqual([r.owed().map((o) => o.feature), r.fired('2026-03-10')], [[7], []]));
  }
  tree({ 'decisions.md': rec, 'real/M2.md': milestone('M2', 'active', ['x']) }, (_, dir) => {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    symlinkSync(join(dir, 'real'), join(dir, 'docs/milestones'));
    assert.deepEqual(readDecisions(dir).fired('2026-03-10'), []);
  });
});

test('owed() and fired() stay linear: many entries asking about one large doc full of ids', () => {
  const rec = Array.from({ length: 2000 }, (_, i) => `## PD-${i + 1} — t\n\nAmends: F-01\nReopens when: F-01 is reviewed\n`).join('\n');
  const body = Array.from({ length: 4000 }, (_, i) => `D-${i} PD-${i + 5000} D-${i}`).join('\n');
  tree({ 'decisions.md': rec, 'dev/features/one.md': doc(1, { body }), 'docs/reviews/r.md': review('dev/features/one.md', '0.2') }, (r) => {
    const start = Date.now();
    assert.equal(r.owed().length, 2000);
    assert.deepEqual(r.fired('2026-03-10'), []);
    assert.ok(Date.now() - start < 2000, `took ${Date.now() - start}ms`);
  });
});

test('is reviewed and Contents citations stay linear: many events, many reviews, many items', () => {
  const rec = Array.from({ length: 200 }, (_, i) => `## PD-${i + 1} — t\n\nAmends: ${Array.from({ length: 40 }, (_, k) => `F-${k + 1}`).join(', ')}\n${Array.from({ length: 20 }, () => 'Reopens when: F-01 is reviewed').join('\n')}\n`).join('\n');
  const files = { 'decisions.md': rec, 'dev/features/one.md': doc(1, { body: 'Per PD-1.\n' + 'x '.repeat(200000) }) };
  for (let i = 0; i < 50; i++) files[`docs/reviews/r${i}.md`] = review('dev/features/one.md', '0.2');
  files['docs/milestones/M2-a.md'] = milestone('M2', 'active', Array.from({ length: 5000 }, (_, i) => `F-${(i % 40) + 1} per PD-${i}`));
  tree(files, (r) => {
    const start = Date.now();
    // F-01 is cited for PD-1 by its doc and for every 40th decision by a Contents item, so those fire (AR-1).
    assert.deepEqual([...new Set(r.fired('2026-03-10').map((f) => f.id))], ['PD-1', 'PD-40', 'PD-80', 'PD-120', 'PD-160', 'PD-200']);
    r.owed();
    assert.ok(Date.now() - start < 3000, `took ${Date.now() - start}ms`);
  });
});

test('the Contents index stays linear: many items citing one feature, each naming another decision', () => {
  const items = Array.from({ length: 20000 }, (_, i) => `F-01 per PD-${i + 1}`);
  const reviews = {};
  for (let i = 0; i < 30; i++) reviews[`docs/reviews/r${i}.md`] = review('dev/features/one.md', '0.1');
  tree({ 'decisions.md': '## PD-1 — t\n\nAmends: F-01\nReopens when: F-01 is reviewed\n', 'dev/features/one.md': doc(1), 'docs/milestones/M2-a.md': milestone('M2', 'active', items), ...reviews }, (r) => {
    const start = Date.now();
    assert.deepEqual([r.owed(), r.fired('2026-03-10')], [[], []]);
    assert.ok(Date.now() - start < 2000, `took ${Date.now() - start}ms`);
  });
});

test('a frontmatter status that is not a string never throws, and is not shipped', () => {
  tree({ 'decisions.md': '## PD-1 — t\n\nCloses when: F-07 is shipped\n', 'dev/features/seven.md': '---\nstatus:\n  toString: x\n---\n\n# F-07 — x\n' }, (r) => assert.deepEqual(r.fired('2026-03-10'), []));
});

test('quote removal is one pass: a line of unclosed quotes costs no more than its length', () => {
  const start = Date.now();
  for (let i = 0; i < 2000; i++) one(`## PD-1 — t\n\n${'“'.repeat(480)} revisit when\n`);
  assert.ok(Date.now() - start < 2000);
  assert.equal(one('## PD-1 — t\n\n“unclosed revisit when x\n').prose, true);
  assert.equal(one('## PD-1 — t\n\n"a" then revisit when x "b"\n').prose, true);
});

test('owed: an Amends: feature stays owed until its doc (a companion included) or a Contents line not killed names the decision', () => {
  const rec = '## D-044 — t *(decided 2026-03-01)*\n\nAmends: F-06, F-07, F-08, F-09, F-10, F-11\n';
  tree({
    'decisions.md': rec,
    'dev/features/six.md': doc(6),
    'dev/features/seven.md': doc(7, { body: '## Changes\n\n- D-44 tightened it.' }),
    'dev/features/seven-table.md': '---\ncompanion-of: dev/features/seven.md\n---\n\n# F-07 — table\n',
    'docs/features/ten-table.md': '---\ncompanion-of: docs/features/ten.md\n---\n\n# F-10 — table\n\nPer D-044.\n',
    'docs/features/ten.md': doc(10),
    'docs/milestones/M2-x.md': milestone('M2', 'shaping', ['Build F-08 per D-044']),
    'docs/milestones/M3-x.md': milestone('M3', 'killed', ['Build F-11 per D-044']),
  }, (r) => {
    assert.deepEqual(r.owed().map((o) => [o.id, o.feature, o.docs]), [['D-044', 6, ['dev/features/six.md']], ['D-044', 9, []], ['D-044', 11, []]]);
  });
  tree({ 'decisions.md': rec.replace('D-044', 'D-4'), 'dev/features/six.md': doc(6, { body: 'D-44 and D-440' }) }, (r) => assert.equal(r.owed().some((o) => o.feature === 6), true));
});

test('fired: has a doc, is shipped, a date after today only', () => {
  tree({
    'decisions.md': '## PD-1 — a\n\nReopens when: F-07 has a doc\n\n## PD-2 — b\n\nCloses when: F-07 is shipped\n\n## PD-3 — c\n\nReopens when: F-08 has a doc\nCloses when: F-08 is shipped\n\n## PD-4 — d\n\nReopens when: 2026-03-09 passes\n\n## PD-5 — e\n\nReopens when: 2026-03-10 passes\n',
    'dev/features/seven.md': doc(7, { status: 'Shipped' }),
    'dev/features/eight-table.md': '---\ncompanion-of: dev/features/seven.md\n---\n\n# F-08 — not a feature doc\n',
  }, (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => [f.id, f.kind, f.events.map((e) => e.said)]), [['PD-1', 'reopens', ['F-07 has a doc']], ['PD-2', 'closes', ['F-07 is shipped']], ['PD-4', 'reopens', ['2026-03-09 passes']]]);
  });
});

test('fired: is reviewed only on a current review; AR-1, not while the same decision owes that feature a citation', () => {
  const files = (rec, seven) => ({
    'decisions.md': rec,
    'dev/features/seven.md': seven,
    'dev/features/eight.md': doc(8),
    'docs/reviews/2026-03-01-seven.md': review('dev/features/seven.md', '0.1'),
    'docs/reviews/2026-03-02-eight.md': review('./dev/features/eight.md', '0.2'),
  });
  const rec = '## PD-1 — a\n\nReopens when: F-07 is reviewed\n\n## PD-2 — b\n\nReopens when: F-08 is reviewed\n\n## PD-3 — c\n\nAmends: F-08\nReopens when: F-08 is reviewed\n';
  tree(files(rec, doc(7)), (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => [f.id, f.events[0].named]), [['PD-2', false]]);
    assert.deepEqual(r.owed().map((o) => [o.id, o.feature]), [['PD-3', 8]]);
  });
  tree({ ...files(rec, doc(7)), 'dev/features/eight.md': doc(8, { body: 'Per PD-3.' }) }, (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => [f.id, f.events[0].named]), [['PD-2', false], ['PD-3', true]]);
  });
});

test('fired: AR-2, M<n> is active on active, closed or killed and says which; M<n> is closed on closed or killed', () => {
  tree({
    'decisions.md': '## PD-1 — a\n\nReopens when: M2 is active\n\n## PD-2 — b\n\nCloses when: M3 is closed\n\n## PD-3 — c\n\nReopens when: M4 is active\n\n## PD-4 — d\n\nReopens when: M5 is active\n\n## PD-5 — e\n\nCloses when: M2 is closed\n\n## PD-6 — f\n\nReopens when: M6 is active\n\n## PD-7 — g\n\nCloses when: M6 is closed\n',
    'docs/milestones/M2-a.md': milestone('M2', 'active', ['x']),
    'docs/milestones/M3-a.md': milestone('M3', 'killed', ['x']),
    'docs/milestones/M4-a.md': milestone('M4', 'shaping', ['x']),
    'docs/milestones/M5-a.md': milestone('m5', 'killed', ['x']),
    'docs/milestones/M6-a.md': milestone('M6', 'closed', ['x']),
  }, (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => [f.id, f.events.map((e) => e.said)]), [['PD-1', ['M2 is active']], ['PD-2', ['M3 is killed']], ['PD-4', ['M5 is killed']], ['PD-6', ['M6 is closed']], ['PD-7', ['M6 is closed']]]);
  });
});

test('heading conditions fire like labelled lines; several events fire on any one and name those that fired', () => {
  tree({
    'decisions.md': '## PD-1 — a *(decided 2026-03-01 · reopens when M2 is activated)*\n\n## PD-2 — b\n\nReopens when: F-09 has a doc or M2 is active or 2026-03-09 passes\n',
    'docs/milestones/M2-a.md': milestone('M2', 'active', ['x']),
  }, (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => [f.id, f.where, f.events.map((e) => e.said)]), [['PD-1', 'heading', ['M2 is active']], ['PD-2', 'line', ['M2 is active', '2026-03-09 passes']]]);
  });
});

test('unreadable: in file order, ids only; an issue event is unreadable until step 5, flagged when it is the only reason', () => {
  tree({
    'decisions.md': [
      '## PD-3 — a *(decided 2026-03-01 · provisional until the supplier confirms in writing)*',
      '## PD-4 — b\n\nCloses when: #12 lands',
      '## PD-5 — c\n\nAmends: F-07 or later\nCloses when: acme/app#12 is closed',
      '## PD-6 — d\n\nReopens when: F-07 has a doc',
      '## PD-7 — e *(decided 2026-03-01 · closes when #12 lands)*\n\nReopens when: F-07 has a doc or #13 closes',
      '## PD-8 — f\n\nCloses when: #12 lands or soon',
    ].join('\n\n'),
    'dev/features/seven.md': doc(7),
  }, (r) => {
    assert.deepEqual(r.unreadable().map((u) => [u.id, u.issueOnly]), [['PD-3', false], ['PD-4', true], ['PD-5', false], ['PD-7', true], ['PD-8', false]]);
    // F-07 has a doc, so PD-6 fires; PD-7's condition holds the same event beside an issue, and is never fired until step 5.
    assert.deepEqual(r.fired('2026-03-10').map((f) => f.id), ['PD-6']);
  });
});

test('the module returns record text only in text fields', () => {
  const secret = 'SECRETWORD';
  const e = one(`## PD-1 — ${secret} *(decided 2026-03-01 · reopens when ${secret})*\n\nReopens when: M2 is active or ${secret}\nAmends: ${secret}\n${secret}\n`);
  const scrub = (v) => (Array.isArray(v) ? v.map(scrub) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'text').map(([k, x]) => [k, scrub(x)])) : v);
  assert.equal(JSON.stringify(scrub(e)).includes(secret), false);
});

test("slipway's own decisions.md: no position outside code, and the prose count is D-003, D-015 and D-017", () => {
  const r = readDecisions(SRC);
  assert.equal(r.missing, null);
  assert.deepEqual(r.entries.flatMap((e) => e.positions), []);
  assert.deepEqual(r.proseCount(), ['D-003', 'D-015', 'D-017']);
  assert.deepEqual(ids(r.unreadable()), []);
});
