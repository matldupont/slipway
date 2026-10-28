#!/usr/bin/env node
// #476: a milestone inserted between two others takes M<n>.<k>, so numbers stay in time order. The id shape
// (ci/checks/lib/milestones.mjs: MILESTONE_ID, milestoneKey, milestoneId, compareMilestones), the milestone reader's
// order, and each reader of an id that has no test file of its own: status, a risk's "before" cell, K1 and MS1. The
// register, the decisions record, DC1, the roadmap and intake have their cases in their own test files. Every file
// here is inert text in a temporary folder. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareMilestones, milestoneId, milestoneKey, readMilestoneModel, readMilestones } from '../ci/checks/lib/milestones.mjs';
import { readDeadlines } from '../ci/checks/lib/risks.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Every reader of an id takes M1.1 as it takes M2. Each case below has an M1.1 and an M10 after M2: file names sort M10
// before M2, and a reader of `M\d+` misses M1.1.
const inTree = (files, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
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
const ms = (id, status, appetite, title = 'x') => `---\nid: ${id}\nstatus: ${status}\nkind: bet\n${appetite ? `appetite: ${appetite}\n` : ''}---\n\n# ${id} — ${title}\n`;
const run = (script, root, env = {}) => spawnSync(process.execPath, [join(SRC, script), root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10', CHECK_NOW: '', TZ: 'UTC', ...env } });
const json = (r) => JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice(7));

test('an id is M<n> or M<n>.<k>, read as numbers and compared by number, then sub-number', () => {
  assert.deepEqual(['M1', 'M1.1', 'm02', 'M01.10', 'M1.0'].map(milestoneKey), [[1, -1], [1, 1], [2, -1], [1, 10], [1, 0]]);
  assert.deepEqual(['M1.1', 'm02', 'M01.10'].map(milestoneId), ['M1.1', 'M2', 'M1.10']);
  for (const id of ['M1.1.1', 'M1b', 'M', 'M1.', '1.1', 'M 1', 'Beta', '', null, 2]) assert.equal(milestoneKey(id), null, String(id));
  assert.deepEqual(['M10', 'M2', 'M1.10', 'M1.2', 'M1', 'M1.1'].sort(compareMilestones), ['M1', 'M1.1', 'M1.2', 'M1.10', 'M2', 'M10']);
  assert.ok(Number.isNaN(compareMilestones('M1', 'Beta')), 'an id of another shape compares as nothing, so <, >= and <= are false');
});

test('the milestone reader lists M1, M1.1, M2, M10 by id, not by file name; an id of another shape comes last', () => {
  const files = {
    'docs/milestones/M10-later.md': ms('M10', 'shaping'),
    'docs/milestones/M2-next.md': ms('M2', 'shaping'),
    'docs/milestones/A-odd.md': ms('Beta', 'shaping'),
    'docs/milestones/M1.1-inserted.md': ms('M1.1', 'shaping', null, 'Inserted'),
    'docs/milestones/M1-first.md': ms('M1', 'closed'),
  };
  inTree(files, (root) => {
    assert.deepEqual(readMilestones(root).milestones.map((m) => m.fm.id), ['M1', 'M1.1', 'M2', 'M10', 'Beta']);
    const model = readMilestoneModel(root, '2026-03-10');
    assert.deepEqual(model.map((m) => [m.id, m.title]), [['M1', 'x'], ['M1.1', 'Inserted'], ['M2', 'x'], ['M10', 'x'], ['Beta', null]], 'the title is read from `# M1.1 — …` as from `# M2 — …`');
  });
});

test('status: an active M1.1 is named in Next and its owed checks; the table lists M1, M1.1, M2, M10', () => {
  const fixture = join(SRC, 'ci', 'fixtures', 'status', 'build-loop-next-item');
  const booking = readFileSync(join(fixture, 'docs', 'milestones', 'M2-booking.md'), 'utf8');
  const root = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
  try {
    cpSync(fixture, root, { recursive: true });
    rmSync(join(root, 'docs', 'milestones', 'M2-booking.md'));
    const dir = join(root, 'docs', 'milestones');
    writeFileSync(join(dir, 'M1.1-booking.md'), booking.replace('id: M2', 'id: M1.1').replace("walks (F-01) · #12", "walks (F-01) · #12\n   Owed: the booking journey — staging"));
    writeFileSync(join(dir, 'M2-later.md'), ms('M2', 'shaping'));
    writeFileSync(join(dir, 'M10-last.md'), ms('M10', 'shaping'));
    const r = run('ci/status.mjs', root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Start item 2 of M1\.1 in a fresh session with \/log-feature M1\.1#2\./);
    assert.match(r.stdout, /^- Owed checks \(docs\/milestones\/M1\.1-booking\.md\):/m);
    assert.match(r.stdout, /^- #12 · item 1 · 1 owed · staging$/m);
    const table = r.stdout.split('\n').filter((l) => /^\| M/.test(l)).map((l) => l.split('|')[1].trim());
    assert.deepEqual(table, ['M1', 'M1.1', 'M2', 'M10']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a risk "before M1.1" cell names M1.1, and K1 holds it due once a later milestone is underway', () => {
  const prd = (cell) => `| ID | Risk | Test | Resolves by |\n|---|---|---|---|\n| RISK-1 | r | t | ${cell} |\n`;
  for (const [cell, id] of [['before M1.1', 'M1.1'], ['before m1.1 starts (lead time)', 'M1.1'], ['before M10', 'M10'], ['before M1.1.1', null], ['before M1.', null]]) {
    assert.equal(readDeadlines(prd(cell)).get('RISK-1').before, id, cell);
  }
  const fixture = join(SRC, 'ci', 'fixtures', 'known-bad', 'k1', 'overdue');
  const root = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
  try {
    cpSync(fixture, root, { recursive: true });
    // M2 (killed) becomes M1.1, and the deadlines before M2 become before M1.1: M3 is active, so they are due.
    const m2 = join(root, 'docs', 'milestones', 'M2.md');
    writeFileSync(m2, readFileSync(m2, 'utf8').replace('id: M2', 'id: M1.1'));
    const p = join(root, 'docs', 'PRD.md');
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('before M2', 'before M1.1'));
    const due = json(run('ci/checks/meta/k1-frame.mjs', root, { CHECK_JSON: '1' })).findings.map((f) => f.where);
    assert.deepEqual(due.filter((w) => /overdue/.test(w)), ['RISK-1#risk/overdue', 'RISK-4#risk/overdue', 'RISK-8#risk/overdue']);
    // M10 is after M2 and M4: with M2 killed and M10 the active one, the deadlines before M2 and M4 are due.
    writeFileSync(m2, readFileSync(join(fixture, 'docs', 'milestones', 'M2.md'), 'utf8'));
    writeFileSync(p, readFileSync(join(fixture, 'docs', 'PRD.md'), 'utf8'));
    const m3 = join(root, 'docs', 'milestones', 'M3.md');
    writeFileSync(m3, readFileSync(m3, 'utf8').replace('id: M3', 'id: M10'));
    const after = json(run('ci/checks/meta/k1-frame.mjs', root, { CHECK_JSON: '1' })).findings.map((f) => f.where);
    assert.deepEqual(after.filter((w) => /overdue/.test(w)), ['RISK-1#risk/overdue', 'RISK-3#risk/overdue', 'RISK-4#risk/overdue', 'RISK-8#risk/overdue']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('MS1 warns once, naming both, when two neighbours in id order start the other way round; it stays green', () => {
  const ms1 = (files) => inTree(files, (root) => {
    const r = run('ci/checks/meta/ms1-milestones.mjs', root, { CHECK_JSON: '1' });
    return { exit: r.status, warnings: json(r).warnings.filter((w) => /order/.test(w.where)), out: r.stdout };
  });
  const out = ms1({
    'docs/milestones/M1-a.md': ms('M1', 'shaping', '2026-03-01..2026-03-14'),
    'docs/milestones/M1.1-b.md': ms('M1.1', 'shaping', '2026-02-01..2026-02-14'),
  });
  assert.equal(out.exit, 0, out.out);
  assert.deepEqual(out.warnings.map((w) => w.where), ['M1.1-b.md#order/appetite']);
  assert.match(out.warnings[0].detail, /^M1\.1 starts 2026-02-01, before M1 \(M1-a\.md\) starts 2026-03-01/);
  // In order by number, though M10 sorts before M2 by file name; a milestone with no appetite is passed over.
  const inOrder = ms1({
    'docs/milestones/M1-a.md': ms('M1', 'shaping', '2026-01-01..2026-01-14'),
    'docs/milestones/M1.1-b.md': ms('M1.1', 'shaping', '2026-02-01..2026-02-14'),
    'docs/milestones/M2-c.md': ms('M2', 'shaping', '2026-03-01..2026-03-14'),
    'docs/milestones/M3-d.md': ms('M3', 'shaping'),
    'docs/milestones/M10-e.md': ms('M10', 'shaping', '2026-04-01..2026-04-14'),
  });
  assert.deepEqual([inOrder.exit, inOrder.warnings], [0, []], inOrder.out);
});

test("status reads a risk's \"before M1.1\" cell and an M1.1 bet: the first bet is M1.1, and a test due before it is on time", () => {
  const fixture = join(SRC, 'ci', 'fixtures', 'status', 'deadlines-toronto');
  const root = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
  try {
    cpSync(fixture, root, { recursive: true });
    writeFileSync(join(root, 'docs', 'milestones', 'M1.1-deposits.md'), ms('M1.1', 'shaping'));
    const prd = join(root, 'docs', 'PRD.md');
    writeFileSync(prd, readFileSync(prd, 'utf8').replace('| pre-application call | before M4 |', '| pre-application call | before M1.1 |'));
    const r = run('ci/status.mjs', root, { CHECK_TODAY: '', CHECK_NOW: '2026-03-10T23:30:00-04:00' });
    assert.equal(r.status, 0, r.stderr);
    const lines = r.stdout.split('\n').filter((l) => /Existential risk: RISK-[45]\b/.test(l));
    // RISK-4 is due before M1.1, the first bet: on time. RISK-5, before M2 starts, is now after it.
    assert.deepEqual(lines.map((l) => l.match(/RISK-\d is existential and untested, and [^:]*/)[0]), ['RISK-5 is existential and untested, and resolves "before M2 starts", after M1.1 starts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('MS1 holds M01 and m1 to be M1: a second document with either is id/duplicate', () => {
  for (const id of ['M01', 'm1', 'M1']) {
    inTree({ 'docs/milestones/M1-a.md': ms('M1', 'shaping'), 'docs/milestones/0-b.md': ms(id, 'shaping') }, (root) => {
      const r = run('ci/checks/meta/ms1-milestones.mjs', root, { CHECK_JSON: '1' });
      assert.deepEqual([r.status, json(r).findings.map((f) => f.where)], [1, ['M1-a.md#id/duplicate']], id);
    });
  }
  inTree({ 'docs/milestones/M1-a.md': ms('M1', 'shaping'), 'docs/milestones/M1.1-b.md': ms('M1.1', 'shaping') }, (root) => {
    assert.equal(run('ci/checks/meta/ms1-milestones.mjs', root).status, 0, 'M1.1 is not M1');
  });
});

test('MS1 compares no milestone whose id is another shape: it sorts last, so its appetite says nothing about order', () => {
  inTree({
    'docs/milestones/M1-a.md': ms('M1', 'shaping', '2026-02-01..2026-02-14'),
    'docs/milestones/M2-b.md': ms('M2', 'shaping', '2026-03-01..2026-03-14'),
    'docs/milestones/Z-beta.md': ms('Beta', 'shaping', '2026-01-01..2026-01-14'),
  }, (root) => {
    const r = run('ci/checks/meta/ms1-milestones.mjs', root, { CHECK_JSON: '1' });
    assert.deepEqual([r.status, json(r).warnings.filter((w) => /order/.test(w.where))], [0, []], r.stdout);
  });
});
