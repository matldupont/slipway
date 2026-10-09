#!/usr/bin/env node
// readRegister() (ci/checks/lib/register.mjs): the one reader of a review's findings register, used by `pnpm status`
// (#376). Columns are found by header; a Tracker cell is filled by the rule the risks table uses; a Blocks cell
// names a milestone only as an `M<n>` token. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
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
  assert.equal(readRegister(doc(...FULL, '| AR-1 | | | | | |')).state, 'unparsed');
});

test('a Blocks cell names a milestone only as an M<n> token', () => {
  assert.deepEqual(milestonesNamed('M1 and m3, M1'), ['M1', 'M3']);
  assert.deepEqual(milestonesNamed('before launch'), []);
  assert.deepEqual(milestonesNamed('MX1, AM2, M'), []);
  assert.deepEqual(milestonesNamed(''), []);
});

test('status counts the register by severity on the Where things stand list', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'ci', 'fixtures', 'status', 'review-register-untracked');
  const r = spawnSync(process.execPath, [resolve(root, '..', '..', '..', 'status.mjs'), root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10' } });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes('- Review register: prd-review.md: S0 0 with a tracker, 1 without · S1 1 with a tracker, 2 without · S2 0 with a tracker, 1 without\n'), r.stdout);
});
