#!/usr/bin/env node
// readRegister() (ci/checks/lib/register.mjs): the one reader of a review's findings register, used by `pnpm status`
// (#376). Columns are found by header; a Tracker cell is filled by the rule the risks table uses; a Blocks cell
// names a milestone only as an `M<n>` token. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { milestonesNamed, readRegister } from '../ci/checks/lib/register.mjs';

const doc = (...lines) => ['# Adversarial review — PRD 0.3.0', '', '## Register', '', ...lines, '', '## Findings'].join('\n');
const FULL = ['| ID | Finding | Sev | Owner | Blocks | Tracker |', '|---|---|---|---|---|---|'];

test('a filled register reads each finding with its severity and whether it has a tracker', () => {
  const r = readRegister(doc(...FULL, '| AR-1 | a | S0 | o | M2 | #14 |', '| AR-2 | b | S2 | o | none | OD-3 |', '| AR-3 | c | S1 | o | none | owner/repo#9 |'));
  assert.equal(r.state, 'ok');
  assert.equal(r.hasTracker, true);
  assert.deepEqual(r.rows.map((f) => [f.id, f.sev, f.tracked]), [['AR-1', 'S0', true], ['AR-2', 'S2', true], ['AR-3', 'S1', true]]);
});

test('an empty Tracker, a placeholder and a cell that names no tracker are not tracked', () => {
  const r = readRegister(doc(...FULL, '| AR-1 | a | S0 | o | | |', '| AR-2 | b | S1 | o | | TBD |', '| AR-3 | c | S1 | o | | <…> |', '| AR-4 | d | S1 | o | | later |'));
  assert.deepEqual(r.rows.map((f) => f.tracked), [false, false, false, false]);
});

test('a register with no Tracker column says so and marks nothing untracked', () => {
  const r = readRegister(doc('| ID | Finding | Sev | Owner | Blocks |', '|---|---|---|---|---|', '| AR-1 | a | S0 | o | M1 |'));
  assert.equal(r.state, 'ok');
  assert.equal(r.hasTracker, false);
  assert.equal(r.rows[0].tracked, false);
});

test('a renamed header is found by its start; one that cannot be found leaves the register unparsed', () => {
  const renamed = readRegister(doc('| Id | Finding | Severity | Owner | Blocking | Tracked |', '|---|---|---|---|---|---|', '| AR-1 | a | s1 | o | M2 | #5 |'));
  assert.deepEqual(renamed.rows, [{ id: 'AR-1', sev: 'S1', blocks: 'M2', tracked: true }]);
  assert.equal(readRegister(doc('| ID | Finding | Level | Tracker |', '|---|---|---|---|', '| AR-1 | a | S1 | #5 |')).state, 'unparsed');
  assert.equal(readRegister(doc(...FULL, '| AR-1 | a | high | o | | |')).state, 'unparsed');
});

test('no Register section, or one with no table, is none; the template row is no finding', () => {
  assert.equal(readRegister('# Review\n\n## Findings\n').state, 'none');
  assert.equal(readRegister(doc('nothing here')).state, 'none');
  assert.equal(readRegister(doc(...FULL, '| AR-1 | | | | | |')).state, 'ok');
  assert.equal(readRegister(doc(...FULL)).rows.length, 0);
});

test('a Blocks cell names a milestone only as an M<n> token', () => {
  assert.deepEqual(milestonesNamed('M1 and M3, M1'), ['M1', 'M3']);
  assert.deepEqual(milestonesNamed('before launch'), []);
  assert.deepEqual(milestonesNamed('MX1, AM2, M, m2, 40 m2'), []);
  assert.deepEqual(milestonesNamed(''), []);
});

test('a severity written with more than the level is read; one that reads none is counted, not dropped', () => {
  const r = readRegister(doc(...FULL, '| AR-1 | a | S0 (blocker) | o | | |', '| AR-2 | b | S1 / money | o | | |', '| AR-3 | c | high | o | | |', '| AR-4 | d | S12 | o | | |'));
  assert.deepEqual(r.rows.map((f) => f.sev), ['S0', 'S1']);
  assert.equal(r.skipped, 2);
});

test('only the first table of the Register section is read, with or without outer pipes', () => {
  const second = readRegister(doc(...FULL, '| AR-1 | a | S2 | o | | #1 |', '', 'Notes:', '', '| ID | Finding | Level |', '|---|---|---|', '| X | y | S0 |'));
  assert.deepEqual(second.rows.map((f) => f.id), ['AR-1']);
  const bare = readRegister(doc('ID | Finding | Sev | Tracker', '---|---|---|---', 'AR-1 | a | S0 | #3'));
  assert.deepEqual(bare.rows.map((f) => [f.id, f.sev, f.tracked]), [['AR-1', 'S0', true]]);
});

test('a long Tracker cell is read in bounded time and counts as not tracked; other cells are read whole', () => {
  const started = Date.now();
  const r = readRegister(doc(...FULL, `| AR-1 | a | S0 | o | | ${'a'.repeat(200000)} |`, `| AR-2 | b | S0 | o | | #12 ${'x'.repeat(300)} TBD |`));
  assert.deepEqual(r.rows.map((f) => f.tracked), [false, false]);
  assert.ok(Date.now() - started < 1000);
  // A token is never cut: `M12` names M12, and a milestone named late in a long cell is still named.
  const blocks = readRegister(doc(...FULL, `| AR-1 | a | S0 | o | ${'z'.repeat(197)} M12 and ${'z'.repeat(300)} M3 | |`)).rows[0].blocks;
  assert.deepEqual(milestonesNamed(blocks), ['M12', 'M3']);
});

test('a stray separator line inside the table is not a finding', () => {
  const r = readRegister(doc(...FULL, '| AR-1 | a | S0 | o | | |', '|---|---|---|---|---|---|', '| AR-2 | b | S1 | o | | |'));
  assert.equal(r.skipped, 0);
  assert.equal(r.rows.length, 2);
});

// status on a copy of a fixture whose review is replaced by `review`: its output and exit code.
function statusWith(review) {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'register-'));
  cpSync(resolve(here, '..', 'ci', 'fixtures', 'status', 'review-register-untracked'), root, { recursive: true });
  writeFileSync(join(root, 'docs', 'reviews', 'prd-review.md'), review);
  const r = spawnSync(process.execPath, [resolve(here, '..', 'ci', 'status.mjs'), root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10' } });
  return { code: r.status, out: r.stdout };
}
const header = ['# Adversarial review — PRD 0.3.0', '', 'Reviewed: docs/PRD.md @ 1a2b3c4', 'Version line: Version: 0.3.0', 'Review date: 2026-03-09', 'Status: x', '', '## Register', ''];

test('status says a register cannot be read, and still exits 0', () => {
  const r = statusWith([...header, '| Thing | Level |', '|---|---|', '| a | S1 |'].join('\n'));
  assert.equal(r.code, 0);
  assert.ok(r.out.includes('- Review register in prd-review.md cannot be read'), r.out);
});

test('status prints a finding id inside quotes with its quote and control characters gone', () => {
  const r = statusWith([...header, ...FULL, '| AR-1"\u202e\u001b[31m | a | S0 | o | | |'].join('\n'));
  assert.equal(r.code, 0);
  assert.ok(r.out.includes('- Review finding "AR-1\'[31m" (S0) in prd-review.md has no tracker\n'), r.out);
});

test('status counts the register by severity on the Where things stand list', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'ci', 'fixtures', 'status', 'review-register-untracked');
  const r = spawnSync(process.execPath, [resolve(root, '..', '..', '..', 'status.mjs'), root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10' } });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('- Review register: prd-review.md: S0 0 with a tracker, 1 without · S1 1 with a tracker, 2 without · S2 0 with a tracker, 1 without\n'), r.stdout);
});

test('status says how many severities it could not read, prints no register line for an empty register, and caps its lines', () => {
  const skipped = statusWith([...header, ...FULL, '| AR-1 | a | high | o | | |', '| AR-2 | b | S2 | o | | #1 |'].join('\n'));
  assert.ok(skipped.out.includes('- Review register in prd-review.md has 1 finding(s) whose severity reads none of S0 to S3'), skipped.out);
  const empty = statusWith([...header, ...FULL].join('\n'));
  assert.equal(empty.code, 0);
  assert.ok(!empty.out.includes('Review register'), empty.out);
  const many = statusWith([...header, ...FULL, ...Array.from({ length: 500 }, (_, n) => `| AR-${n} | a | S0 | o | | |`)].join('\n'));
  assert.equal(many.code, 0);
  assert.equal(many.out.split('\n').filter((l) => l.startsWith('- Review finding')).length, 20);
  assert.ok(many.out.includes('- Review register in prd-review.md: 480 more S0/S1 finding(s) with no tracker'), many.out);
});
