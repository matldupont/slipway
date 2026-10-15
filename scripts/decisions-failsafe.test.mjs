#!/usr/bin/env node
// The decisions reader's fail-safe (ci/checks/lib/decisions.mjs, F-15 §2; the owner's calls of 2026-10-14 on #454 and
// #466): a typo can make a condition louder, never silent, and a tree a pull request shaped never hides what it holds.
// Split from decisions.test.mjs for its size. Every decision id here is invented, every file inert text in a temporary
// folder. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { frontmatter } from '../ci/checks/lib/frontmatter.mjs';
import { indexBy, parseDecisions, readDecisions } from '../ci/checks/lib/decisions.mjs';

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
// What the heading's conditions read as, `[where, readable]` each.
const read = (h) => one(`## ${h}\n`).conditions.map((c) => [c.where, c.readable]);
// Whether the decision under heading `h` is listed unreadable, beside a readable labelled line that fires nothing.
const listed = (h) => tree({ 'decisions.md': `## ${h}\n\nCloses when: 2999-01-01 passes\n` }, (r) => r.unreadable().map((u) => u.id));

test('the fail-safe holds, case 1 of 10', () => {
  for (const clause of ['`reopens when M2 is closed`', '`reopens` when M2 is closed', '"reopens when M2 is closed"', '“reopens when M2 is closed”', '*reopens when M2 is closed*', '(reopens when M2 is closed)']) {
    const h = `PD-1 — t *(decided 2026-03-01 · ${clause})*`;
    assert.deepEqual(read(h), [['heading', false]], clause);
    assert.equal(one(`## ${h}\n`).prose, false, clause);
    assert.deepEqual(listed(h), ['PD-1'], clause);
  }
  // A later clause with no clause opening stays what it was: prose, or nothing.
  assert.deepEqual(read('PD-2 — t *(decided 2026-03-01 · `see PD-4`)*'), []);
  assert.equal(one('## PD-3 — t *(decided 2026-03-01 · "revisit when" the vendor moves)*\n').prose, false);
});

test('the fail-safe holds, case 2 of 10', () => {
  for (const h of [
    'PD-1 — t *(decided 2026-03-01 — reopens when M2 is closed)*',
    'PD-1 — t *(decided 2026-03-01, closes when M2 is closed)*',
    'PD-1 — t *(decided 2026-03-01·reopens when M2 is closed)*',
    'PD-1 — t *(reopens when M2 is closed)*',
    'PD-1 — t *(note)* reopens when M2 is closed',
  ]) {
    assert.deepEqual(read(h), [['heading', false]], h);
    assert.deepEqual(listed(h), ['PD-1'], h);
  }
  // The status alone, a dash in it included, stays green.
  for (const h of ['PD-2 — t *(open — week 1)*', 'PD-2 — t *(decided 2026-03-01 — after the vendor call)*']) assert.deepEqual(listed(h), [], h);
});

test('the fail-safe holds, case 3 of 10', () => {
  for (const gap of ['  ', '\t', ' \t ']) {
    const e = one(`## PD-1 — t *(decided 2026-03-01 · reopens${gap}when M2 is closed)*\n`);
    assert.deepEqual(e.conditions.map((c) => [c.kind, c.readable, c.events[0]?.said]), [['reopens', true, 'M2 is closed']], JSON.stringify(gap));
    assert.deepEqual(one(`## PD-1 — t *(decided 2026-03-01 · closes${gap}if M2 is closed)*\n`).conditions.map((c) => c.kind), ['closes']);
    assert.deepEqual(one(`## PD-1 — t *(decided 2026-03-01 · provisional${gap}until M2 is closed)*\n`).conditions.map((c) => c.kind), ['reopens']);
    assert.deepEqual(read(`PD-2 — t, closes${gap}when M2 is closed`), [['heading', false]], JSON.stringify(gap));
    assert.equal(one(`## PD-3 — t\n\nWe revisit${gap}when the vendor moves.\n`).prose, true, JSON.stringify(gap));
    assert.equal(one(`## PD-3 — t\n\nWe reopen it${gap}if the vendor moves.\n`).prose, true, JSON.stringify(gap));
  }
});

test('the fail-safe holds, case 4 of 10', () => {
  for (const words of ['REOPENS WHEN', 'Reopens If', 'reopens if', 'closes if', 'Closes If', 'PROVISIONAL UNTIL']) {
    assert.deepEqual(read(`PD-1 — t, ${words} M2 is closed`), [['heading', false]], words);
    assert.deepEqual(read(`PD-1 — keep the \` key *(decided 2026-03-01 · ${words} M2 is closed)*`), [['heading', false]], words);
  }
  assert.deepEqual(read('PD-2 — t, `closes` when M2 is closed'), [['heading', false]]);
});

test('the fail-safe holds, case 5 of 10', () => {
  const title = 'x'.repeat(490);
  assert.deepEqual(read(`PD-1 — ${title} *(decided 2026-03-01 · reopens when M2 is closed)*`), [['heading', false]]);
  assert.deepEqual(read(`PD-1 — ${title} and then it closes when M2 is closed`), [['heading', false]]);
  assert.deepEqual(read(`PD-1 — ${title}, provisional until M2 is closed`), [['heading', false]]);
  assert.deepEqual(read(`PD-1 — ${title}, and it Reopens when M2 is closed`), [['heading', false]]);
  assert.deepEqual(read(`PD-1 — ${title}${'y'.repeat(100)}`), []);
  // A heading under the cut is read as before.
  assert.deepEqual(read(`PD-1 — ${'x'.repeat(400)} *(decided 2026-03-01 · reopens when M2 is closed)*`), [['heading', true]]);
});

test('the fail-safe holds, case 6 of 10', () => {
  const fm = frontmatter('---\n__proto__:\n  status: shipped\nid: M2\n---\n');
  assert.equal(fm.status, undefined);
  assert.equal(Object.hasOwn(fm, '__proto__'), true);
  assert.equal(Object.getPrototypeOf(fm), Object.prototype);
  assert.deepEqual([fm.id, fm.__proto__.status], ['M2', 'shipped']);
  assert.deepEqual(frontmatter('---\nconstructor: x\nstatus: draft\n---\n'), { constructor: 'x', status: 'draft' });
  // A child key is its own too.
  assert.equal(Object.hasOwn(frontmatter('---\nmeta:\n  __proto__: x\n---\n').meta, '__proto__'), true);
  const doc = '---\n__proto__:\n  status: shipped\n---\n\n# F-01 — x\n\nVersion: 0.1\n';
  tree({ 'decisions.md': '## PD-1 — t\n\nReopens when: F-01 is shipped\n', 'dev/features/one.md': doc }, (r) => assert.deepEqual(r.fired('2026-03-10'), []));
});

test('the fail-safe holds, case 7 of 10', () => {
  const rec = '## PD-1 — t\n\nReopens when: F-07 has a doc\n';
  const doc = (n) => `---\nstatus: draft\n---\n\n# F-${n} — x\n\nVersion: 0.1\n`;
  tree({ 'decisions.md': rec, 'docs/features': 'a file', 'dev/features/seven.md': doc('07') }, (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => f.events[0].said), ['F-07 has a doc']);
    assert.deepEqual(r.unreadFolders(), ['docs/features']);
  });
  tree({ 'decisions.md': rec, 'docs/features/seven.md': doc('07'), 'dev/features': 'a file', 'docs/reviews': 'a file', 'docs/milestones': 'a file' }, (r) => {
    assert.deepEqual(r.fired('2026-03-10').map((f) => f.id), ['PD-1']);
    assert.deepEqual(r.unreadFolders(), ['dev/features', 'docs/milestones', 'docs/reviews']);
  });
  tree({ 'decisions.md': rec }, (r) => assert.deepEqual(r.unreadFolders(), []));
});

test('the fail-safe holds, case 8 of 10', () => {
  const items = Array.from({ length: 200000 }, (_, i) => ({ i, keys: [1, i % 3] }));
  const start = Date.now();
  const map = indexBy(items, (x) => x.keys);
  assert.deepEqual([map.get(1).length, map.get(0).length, map.get(2).length], [200000 + 66667, 66667, 66666]);
  assert.ok(Date.now() - start < 1000, `took ${Date.now() - start}ms`);
});

test('the fail-safe holds, case 9 of 10', () => {
  for (const word of ['"reopens"', '“reopens”', '*reopens*', '_reopens_', "'reopens'", '‘reopens’', '[reopens]', '~~reopens~~', '**reopens**', 're`opens`']) {
    assert.deepEqual(read(`PD-1 — t *(decided 2026-03-01 · ${word} when M2 is closed)*`), [['heading', false]], word);
  }
  assert.deepEqual(read(`PD-2 — t *(decided 2026-03-01 · reopens${' \t'.repeat(15)}when M2 is closed)*`), [['heading', false]]);
  // A cut at 500: a clause split across it, or an event list it shortened, is never read short.
  const pre = (s) => `PD-3 — ${'x'.repeat(500 - 'PD-3 — '.length - 3 - s.length)}${s}`;
  assert.deepEqual(read(`${pre(' *(decided 2026-03-01 · reop')}ens when M2 is closed)*`), [['heading', false]]);
  assert.deepEqual(read(`${pre(', and it reop')}ens when M2 is closed`), [['heading', false]]);
  const list = read(`${pre(' *(decided 2026-03-01 · reopens when M2 is closed')} or F-09 is shipped)*`);
  assert.equal(list.some(([, ok]) => ok === false), true);
  // A labelled line whose cut lands right after an event: the spaces fill it to column 500, and squash drops them.
  const line = one(`## PD-4 — t\n\nReopens when: M1 is closed${' '.repeat(474)} or M2 is closed\n`);
  assert.deepEqual(line.conditions.map((c) => c.readable), [false]);
});

test('the fail-safe holds, case 10 of 10', () => {
  // A fence opened and never closed is a typo: the decisions below it are read.
  const e = parseDecisions('## PD-1 — t\n\n```\nstray\n\n## PD-2 — u *(decided 2026-03-01 · reopens when M2 is closed)*\n\nCloses when: M3 is closed\n').entries;
  assert.deepEqual(e[1].conditions.map((c) => [c.kind, c.readable]), [['reopens', true], ['closes', true]]);
  // A closed fence still hides what it quotes.
  assert.deepEqual(parseDecisions('## PD-1 — t\n\n```\nCloses when: M3 is closed\n```\n').entries[0].conditions, []);
  // A folder of the tree that is a link, a dangling one included, is named and not read.
  const rec = '## PD-1 — t\n\nReopens when: M2 is closed\n';
  const ms = '---\nid: M2\nstatus: closed\n---\n\n# M2 — x\n\n## Contents\n\n1. x\n';
  tree({ 'decisions.md': rec, 'real/M2.md': ms, 'realdocs/one.md': '# F-01 — x\n' }, (_, dir) => {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    mkdirSync(join(dir, 'dev'), { recursive: true });
    symlinkSync(join(dir, 'real'), join(dir, 'docs/milestones'));
    symlinkSync(join(dir, 'realdocs'), join(dir, 'docs/features'));
    symlinkSync(join(dir, 'gone'), join(dir, 'docs/reviews'));
    symlinkSync(join(dir, 'realdocs'), join(dir, 'dev/features'));
    const r = readDecisions(dir);
    assert.deepEqual(r.fired('2026-03-10'), []);
    assert.deepEqual(r.unreadFolders(), ['dev/features', 'docs/features', 'docs/milestones', 'docs/reviews']);
  });
});
