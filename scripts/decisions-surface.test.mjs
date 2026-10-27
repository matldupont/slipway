#!/usr/bin/env node
// What shows the decisions record (F-15 §5 and §6, build step 3): DC1 run as a command, the stray condition lines the
// reader finds, and the lines `pnpm status` prints from it (ci/checks/lib/decision-lines.mjs). The status fixtures under
// ci/fixtures/status/decisions-* pin each line whole through S1; these pin what a fixture cannot show cheaply: the
// caps, which ids and paths may be printed, and DC1's green runs. Every decision id here is invented, every file inert
// text in a temporary folder. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { decisionLines } from '../ci/checks/lib/decision-lines.mjs';
import { parseDecisions, readDecisions } from '../ci/checks/lib/decisions.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DC1 = join(SRC, 'ci/checks/meta/dc1-decisions.mjs');
const inTree = (files, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'decisions-surface-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const dc1 = (dir) => {
  const r = spawnSync(process.execPath, [DC1, dir], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
  const json = JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice(7));
  return { exit: r.status, findings: json.findings.map((f) => f.where), warnings: json.warnings.map((w) => w.where), details: json.findings.map((f) => f.detail), out: r.stdout };
};
const record = (md) => inTree({ 'decisions.md': md }, (dir) => dc1(dir));
const lines = (files, today = '2026-03-10') => inTree(files, (dir) => decisionLines(readDecisions(dir), today));
const milestone = (id, status, items) => `---\nid: ${id}\nstatus: ${status}\n---\n\n# ${id} — x\n\n## Contents\n\n${items.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`;

test('DC1 is green on every shape the reader reads without a position (§5\'s green cases)', () => {
  const greens = [
    '## PD-1 — t *(decided 2026-03-01)*\n\nAmends: F-07, F-09\nReopens when: F-07 is reviewed\nCloses when: M2 is closed\n',
    '## PD-1 — t *(decided 2026-03-01)*\n\nReopened 2026-03-01: x\n\n## PD-2 — u\n\nClosed 2026-03-02: x\n\n## PD-3 — v\n\nReviewed 2026-03-03: stands — x\n',
    '## PD-1 — t *(decided 2026-03-01 · reopens when M2 is activated · closes if M3 closes · provisional until F-07 is reviewed)*\n',
    '## PD-1 — t *(decided 2026-03-01)*\n\nReopened 2026-03-05: x\n',
    '## PD-1 — t\n\n- Reopens when: F-07 has a doc\n**Amends:** F-07\n',
    '## PD-1 — t\n\n```\nAmends: F-07\n```\n',
    '## PD-1 — t\n\nSee item 4 for the details, and `D-044` in a span.\n',
    '## PD-1 — t\n\nQuoted, `M2 item 4`, and:\n\n```\nM2 item 4\n```\n',
    '## PD-1 — t\n\nA span `that\ncrosses M2 item 4` a break.\n',
    '## PD-1 — t\n\n​Amends: F-07\n',
    `## PD-1 — t\n\nAmends: F-07 ${'x'.repeat(600)}\n`,
    '## D-44 — t\n\nAmends: F-07\n\n## D-4 — u\n\n## D-440 — v\n',
    '## PD-1 — t\n\nWe revisit this when the vendor moves; it does not reopen intake.\n',
    '# Decisions\n\nNo entries yet.\n',
  ];
  for (const md of greens) {
    const r = record(md);
    assert.equal(r.exit, 0, `${md}\n${r.out}`);
    assert.deepEqual(r.findings, [], md);
  }
});

test('DC1 prints the two counts as one info line: ids only, never red, none when empty (build step 4)', () => {
  const info = (md) => record(md).out.split('\n').find((l) => l.startsWith('DC1: info'));
  assert.equal(info('## PD-1 — t\n\nWe revisit this when the vendor moves.\n\n## PD-2 — u\n\nCloses when: #12 lands\n\n## PD-3 — v\n\nReopens when: F-07 has a doc\n'), 'DC1: info — in prose only: PD-1 (1); waiting on an issue: PD-2 (1)');
  assert.equal(info('## PD-1 — t\n\nBody.\n'), 'DC1: info — in prose only: none; waiting on an issue: none');
  const crowd = record(Array.from({ length: 25 }, (_, i) => `## PD-${i + 1} — t\n\nWe revisit this when it hurts.\n`).join('\n')).out;
  assert.match(crowd, /^DC1: info — in prose only: PD-1, .*PD-20 and 5 more \(25\); waiting on an issue: none$/m);
  const r = record('## PD-1 — t\n\nWe revisit this when `a\u001b[31mhostile` text.\n\nCloses when: #12 lands\n');
  assert.deepEqual([r.exit, r.out.includes('\u001b')], [0, false]);
});

test('DC1 fails a position after a span that crossed a line break and closed; it names the first match only', () => {
  const r = record('## PD-3 — t\n\na span `that\ncrosses` a break, then M2 item 4, and item 5 of M2\n');
  assert.deepEqual([r.exit, r.findings], [1, ['decisions.md#decision/position/PD-3']]);
  assert.match(r.details[0], /^PD-3 names M2 item 4 \(line 4\)\./);
  assert.match(r.details[0], /There is no M2 item 4 to read a feature from/);
});

test('DC1 reads the item a position names from the milestone: its F-ids, or that it cites none', () => {
  const md = '## PD-3 — t\n\nAs item 2 of M2 says.\n';
  inTree({ 'decisions.md': md, 'docs/milestones/M2-a.md': milestone('M2', 'shaping', ['x (F-01)', 'y (F-07, F-9)']) }, (dir) => {
    assert.match(dc1(dir).details[0], /M2 item 2 builds F-07, F-09 today \(docs\/milestones\/M2-a\.md\): write `Amends: F-07, F-09` under PD-3$/);
  });
  inTree({ 'decisions.md': md, 'docs/milestones/M2-a.md': milestone('M2', 'shaping', ['x (F-01)', 'y, no feature']) }, (dir) => {
    assert.match(dc1(dir).details[0], /name the feature instead\. M2 item 2 cites no F-id \(docs\/milestones\/M2-a\.md\): in place of "M2 item 2", quote the item's words, or cite its feature once it has one$/);
  });
  inTree({ 'decisions.md': md, 'docs/milestones/M2-a.md': milestone('M2', 'shaping', ['x (F-01)']) }, (dir) => {
    assert.match(dc1(dir).details[0], /There is no M2 item 2 to read a feature from: write `Amends: F-<n>`/);
  });
});

test('DC1 skips a position in a closed or killed milestone, whose items never move; it fails the first one elsewhere', () => {
  const ms = { 'docs/milestones/M1-a.md': milestone('M1', 'closed', ['x (F-01)']), 'docs/milestones/M3-c.md': milestone('M3', 'killed', ['z (F-03)']) };
  inTree({ 'decisions.md': '## PD-1 — t\n\nAs M1 item 1 and item 1 of M3 said.\n', ...ms }, (dir) => assert.deepEqual([dc1(dir).exit, dc1(dir).findings], [0, []]));
  const open = { ...ms, 'docs/milestones/M2-b.md': milestone('M2', 'shaping', ['y (F-02)']) };
  inTree({ 'decisions.md': '## PD-1 — t\n\nAs M1 item 1 said, and M2 item 1.\n', ...open }, (dir) => {
    const r = dc1(dir);
    assert.deepEqual([r.exit, r.findings], [1, ['decisions.md#decision/position/PD-1']]);
    assert.match(r.details[0], /^PD-1 names M2 item 1 \(line 3\)\..* M2 item 1 builds F-02 today/);
  });
  // A milestone with no file is not settled: the position still fails.
  inTree({ 'decisions.md': '## PD-1 — t\n\nAs M9 item 1 said.\n', ...ms }, (dir) => assert.equal(dc1(dir).exit, 1));
});

// #476: an inserted milestone's items are read as M2's are, and M1.1 is not M1, nor M10 M1.
test('DC1 reads an M1.1 position from M1.1, not M1; it skips a closed M1.1; M10 is its own milestone', () => {
  const ms = { 'docs/milestones/M1-a.md': milestone('M1', 'closed', ['x (F-01)', 'w (F-04)']), 'docs/milestones/M1.1-b.md': milestone('M1.1', 'shaping', ['y (F-02)', 'z (F-07)']) };
  inTree({ 'decisions.md': '## PD-3 — t\n\nAs M1.1 item 2 says.\n', ...ms }, (dir) => {
    const r = dc1(dir);
    assert.deepEqual([r.exit, r.findings], [1, ['decisions.md#decision/position/PD-3']]);
    assert.match(r.details[0], /^PD-3 names M1\.1 item 2 \(line 3\)\..* M1\.1 item 2 builds F-07 today \(docs\/milestones\/M1\.1-b\.md\): write `Amends: F-07` under PD-3$/);
  });
  const closed = { ...ms, 'docs/milestones/M1.1-b.md': milestone('M1.1', 'closed', ['y (F-02)']) };
  inTree({ 'decisions.md': '## PD-3 — t\n\nAs M1.1 item 1 says.\n', ...closed }, (dir) => assert.deepEqual([dc1(dir).exit, dc1(dir).findings], [0, []]));
  inTree({ 'decisions.md': '## PD-3 — t\n\nAs M10 item 1 says.\n', ...ms, 'docs/milestones/M10-c.md': milestone('M10', 'shaping', ['v (F-10)']) }, (dir) => {
    assert.match(dc1(dir).details[0], /M10 item 1 builds F-10 today \(docs\/milestones\/M10-c\.md\)/);
  });
});

test('DC1 reads an id as the readers do: `m1.1` is M1.1; a closed `M01` beside an open M1 settles nothing', () => {
  inTree({ 'decisions.md': '## PD-3 — t\n\nAs M1.1 item 1 says.\n', 'docs/milestones/M1.1-b.md': milestone('m1.1', 'shaping', ['y (F-02)']) }, (dir) => {
    assert.match(dc1(dir).details[0], /M1\.1 item 1 builds F-02 today \(docs\/milestones\/M1\.1-b\.md\)/);
  });
  const decoy = { 'docs/milestones/0-decoy.md': milestone('M01', 'closed', ['z (F-09)']), 'docs/milestones/M1-a.md': milestone('M1', 'shaping', ['x (F-01)']) };
  inTree({ 'decisions.md': '## PD-3 — t\n\nAs M1 item 1 says.\n', ...decoy }, (dir) => {
    assert.deepEqual([dc1(dir).exit, dc1(dir).findings], [1, ['decisions.md#decision/position/PD-3']]);
  });
});

test('status fires M1.1 is active from M1.1, never from M1', () => {
  const md = '## PD-1 — t *(decided 2026-03-01)*\n\nReopens when: M1.1 is active\n';
  const fired = (status) => lines({ 'decisions.md': md, 'docs/milestones/M1-a.md': milestone('M1', 'active', ['x']), 'docs/milestones/M1.1-b.md': milestone('M1.1', status, ['y']) });
  assert.ok(fired('active').some((l) => l.includes('Its condition has happened (M1.1 is active)')), fired('active').join('\n'));
  assert.ok(!fired('shaping').some((l) => l.includes('Its condition has happened (M1')), fired('shaping').join('\n'));
});

test('DC1 warns on an unreadable condition and stays green; it prints no record text', () => {
  const r = record('## PD-1 — SECRETTITLE *(decided 2026-03-01)*\n\nReopens when: SECRETWORD happens\n\n## PD-2 — t\n\nCloses when: #12 lands\n');
  assert.deepEqual([r.exit, r.findings, r.warnings], [0, [], ['decisions.md#decision/unreadable/PD-1']]);
  assert.equal(/SECRET/.test(r.out), false);
  assert.match(r.out, /PD-1 \(line 1\) has a condition or Amends: line status cannot read: say what brings it back/);
});

test("DC1 is green on slipway's own record", () => {
  const r = dc1(SRC);
  assert.deepEqual([r.exit, r.findings], [0, []], r.out);
});

test('strays: a labelled line in no entry, fenced too once an entry has begun; a fenced example above the first is not one', () => {
  const strays = (md) => parseDecisions(md).strays;
  assert.deepEqual(strays('# Decisions\n\n```\nAmends: F-07\nReopens when: F-07 has a doc\n```\n\n## PD-1 — t\n\nAmends: F-07\n'), []);
  assert.deepEqual(strays('# Decisions\n\nAmends: F-07\n\n## PD-1 — t\n'), [3]);
  assert.deepEqual(strays('## PD-1 — t\n\n## Notes\n\nCloses when: M2 is closed\n```\nAmends: F-07\n```\n'), [5, 7]);
  assert.deepEqual(strays('## PD1 — t\n\nReopens when: M2 is active\n'), [3]);
  assert.deepEqual(strays('## PD-1 — t\n\n```markdown\n## Example\nAmends: F-07\n```\n\nCloses when: M2 is closed\n'), [5, 8]);
  // Under a level-3 heading the entry goes on; a lookalike label is prose wherever it sits.
  assert.deepEqual(strays('## PD-1 — t\n\n### Notes\n\nAmends: F-07\n\n## Notes\n\n- Amends: F-07\n**Closes when:** M2 is closed\n'), []);
  inTree({ 'decisions.md': '## PD1 — t\n\nReopens when: M2 is active\n' }, (dir) => assert.deepEqual(readDecisions(dir).strays, [3]));
  // A heading with no id it can read that holds a clause opening is a stray too, at any level; one with none is not.
  assert.deepEqual(strays('## PD-1 — t\n\n## PD3 — u *(decided 2026-03-01 · reopens when M2 is active)*\n\n### PD4 — v, provisional until the vendor signs\n\n## Week 1 — decide before M1 closes\n'), [3, 5]);
  assert.deepEqual(strays('# Decisions\n\n```\n## PD3 — u *(decided 2026-03-01 · reopens when M2 is active)*\n```\n\n## PD-1 — t\n'), []);
  // Inside an entry too (the cold review of #475, round 2): a typo'd `### PD3` is read as PD-1's body and is a stray.
  const inEntry = parseDecisions('## PD-1 — t\n\nReopens when: M2 is active\n\n### PD3 — u *(decided 2026-03-01 · reopens when M3 is active)*\n\n### Notes\n');
  assert.deepEqual([inEntry.strays, inEntry.entries.length, inEntry.entries[0].conditions.length], [[5], 1, 1]);
  // The clause opening is read on the whole line, past the cut at 500 characters.
  assert.deepEqual(strays(`## PD-1 — t\n\n## Notes ${'x'.repeat(600)} reopens when M2 is active\n`), [3]);
});

test('a folder above a folder the reader reads (docs, dev) that is a link is named unread, never read through', () => {
  inTree({ 'decisions.md': '## PD-1 — t\n\nAmends: F-06\nReopens when: M2 is active\n', 'elsewhere/features/six.md': '# F-06 — x\n', 'elsewhere/milestones/M2-a.md': milestone('M2', 'active', ['x (F-06)']) }, (dir) => {
    symlinkSync(join(dir, 'elsewhere'), join(dir, 'dev'));
    symlinkSync(join(dir, 'elsewhere'), join(dir, 'docs'));
    const r = readDecisions(dir);
    assert.deepEqual(r.owed().map((o) => o.docs), [[]]);
    assert.deepEqual(r.fired('2026-03-10'), []);
    assert.deepEqual(r.unreadFolders(), ['dev/features', 'docs/features', 'docs/milestones', 'docs/reviews']);
  });
});

test('status lines: none without a record; the Unreadable and stray lines cap at 20, then say how many more', () => {
  assert.deepEqual(decisionLines(readDecisions(join(tmpdir(), 'no-such-root-for-decisions')), '2026-03-10'), []);
  const many = Array.from({ length: 23 }, (_, i) => `## PD-${i + 1} — t\n\nReopens when: the moon is full\n`).join('\n');
  const [u] = lines({ 'decisions.md': many });
  assert.match(u, /^\(you or an agent\) Say what should bring each decision back, or which feature it changes\. 23 decisions say /);
  assert.match(u, /\(PD-1, PD-2, .*PD-19, PD-20 and 3 more\)/);
  assert.equal(u.includes('PD-21'), false);
  const strays = Array.from({ length: 22 }, () => 'Amends: F-07').join('\n');
  const [s] = lines({ 'decisions.md': `# Decisions\n\n${strays}\n` });
  assert.match(s, /^\(you or an agent\) Move each condition line in decisions\.md under its decision's heading, .* Lines 3, 4, .*, 22 and 2 more hold conditions under no decision heading /);
  assert.match(lines({ 'decisions.md': '# Decisions\n\nAmends: F-07\n' })[0], /Line 3 holds a condition under no decision heading .* correct a heading's id, .* nothing reads it until then\. It waits on nothing\.$/);
});

test('status lines: every line says who acts first, then what it blocks and what it waits on, in the writing standard\'s form, and prints no record text', () => {
  const files = {
    'decisions.md': [
      '## PD-1 — SECRETTITLE *(decided 2026-03-01)*\n\nAmends: F-06\nReopens when: 2026-03-01 passes\nCloses when: M2 is closed',
      '## PD-2 — t *(decided 2026-03-01 · provisional until SECRETWORD)*',
      '## PD3 — SECRETTITLE\n\nAmends: F-07',
    ].join('\n\n'),
    'dev/features/six.md': '# F-06 — SECRETDOC\n\nVersion: 0.1\n',
    'docs/milestones/M2-a.md': milestone('M2', 'closed', ['x (F-06)']),
    'docs/reviews': 'a file where the folder goes',
  };
  const out = lines(files);
  const kind = (l) => [['Owed citation', /^\(you or an agent\) Write what the decision /], ['Decision reopens', /^\(you\) Re-read the decision /], ['Decision closes', /^\(you or an agent\) Close the decision /], ['Unreadable condition', /^\(you or an agent\) Say what should bring /], ['Stray condition line', /^\(you or an agent\) Move each condition line /], ['Unread folder', /^\(you or an agent\) Make /]].find(([, re]) => re.test(l))?.[0];
  assert.deepEqual(out.map(kind), ['Owed citation', 'Decision reopens', 'Decision closes', 'Unreadable condition', 'Stray condition line', 'Unread folder']);
  for (const l of out) {
    assert.match(l, / It blocks [^.]+\. It waits on [^.]+\.$/, l);
    assert.equal(/SECRET/.test(l), false, l);
    // F-16 rule 3: no dash between clauses and no semicolon outside a quoted span.
    assert.equal(/ — /.test(l.replace(/"[^"]*"/g, '')), false, l);
    assert.equal(/;/.test(l), false, l);
  }
});

test('status lines: an id or a path outside the printable shape is never printed', () => {
  const owed = (docs) => decisionLines({ missing: null, strays: [], owed: () => [{ id: 'PD-1', feature: 6, docs }], fired: () => [], unreadable: () => [], unreadFolders: () => [] }, '2026-03-10');
  assert.match(owed(['dev/features/a.md', 'dev/features/a b.md', 'docs/features/../x.md'])[0], /into dev\/features\/a\.md, the feature's doc\. It amends/);
  assert.match(owed(['dev/features/sub/a.md'])[0], /into the feature's doc\. It amends/);
  const odd = decisionLines({ missing: null, strays: [], owed: () => [{ id: 'PD-1\n- Next: x', feature: 6, docs: [] }], fired: () => [{ id: 'X-1', kind: 'reopens', where: 'line', events: [{ said: 'M2 is active' }] }], unreadable: () => [{ id: 'PD-1 x' }], unreadFolders: () => ['docs/other', '../x'] }, '2026-03-10');
  assert.deepEqual(odd, []);
});

test("status lines: AR-1, the current review is said to cover the decision only when the doc names it", () => {
  const rec = '## PD-1 — a\n\nReopens when: F-07 is reviewed\n\n## PD-2 — b\n\nAmends: F-08\nReopens when: F-08 is reviewed\n';
  const doc = (n, body = '') => `# F-${n} — x\n\nVersion: 0.2\n${body}`;
  const review = (path) => `# Review\n\nReviewed: ${path} @ abc1234\nVersion line: Version: 0.2\n`;
  const out = lines({ 'decisions.md': rec, 'dev/features/seven.md': doc('07'), 'dev/features/eight.md': doc('08', '\nPD-2 is in its Contract.\n'), 'docs/reviews/a.md': review('dev/features/seven.md'), 'docs/reviews/b.md': review('dev/features/eight.md') });
  assert.equal(out.length, 2);
  assert.match(out[0], /^\(you\) Re-read the decision \(PD-1\) and say whether it still holds\. Its condition has happened \(F-07 is reviewed\)\. /);
  assert.match(out[1], /^\(you\) Re-read the decision \(PD-2\) and say whether it still holds\. Its condition has happened \(F-08 is reviewed, and that review already covers the decision\)\. /);
});

test("slipway's own record: §10's Amends lines are in place, and status owes nothing from it but D-044's two citations and D-052's one", () => {
  const r = readDecisions(SRC);
  const amends = Object.fromEntries(r.entries.map((e) => [e.id, e.conditions.filter((c) => c.kind === 'changes').flatMap((c) => c.features)]));
  const want = { 'D-015': [1], 'D-017': [2], 'D-018': [4], 'D-019': [5], 'D-020': [6], 'D-022': [7], 'D-024': [9], 'D-027': [10], 'D-036': [12], 'D-037': [13], 'D-042': [14], 'D-044': [4, 6], 'D-045': [15], 'D-046': [16] };
  for (const [id, fs] of Object.entries(want)) assert.deepEqual(amends[id], fs, id);
  assert.deepEqual([r.strays, r.unreadable(), r.fired('2999-01-01').map((f) => f.id), r.unreadFolders()], [[], [], [], []]);
  // D-044's citations are the honest debt its prose records; one in each doc clears them, and nothing else may be owed.
  // D-052 amends F-16, which stays at 0.6 until its as-built rewrite (#552) names it (the owner, 2026-10-27): pinned
  // exactly, so the rewrite fails this line and drops it.
  const later = r.owed().filter((o) => o.id !== 'D-044');
  assert.deepEqual(later.map((o) => [o.id, o.feature, o.docs]), [['D-052', 16, ['dev/features/plain-language.md']]]);
});
