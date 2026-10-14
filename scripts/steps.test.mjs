#!/usr/bin/env node
// The step list (ci/checks/lib/steps.mjs, #385): the path table in SLIPWAY.md says the names it exports, each state rule
// of `pnpm status` has a case here, and S1 refuses a fixture whose step lines differ from what it expects.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { STATES, STEPS, stepLines, stepStates } from '../ci/checks/lib/steps.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('the path table in SLIPWAY.md names each step as the list does', () => {
  const rows = [...readFileSync(join(SRC, 'SLIPWAY.md'), 'utf8').matchAll(/^\|\s*\*\*(\d) · ([^*]+?)\*\*/gm)].map((m) => ({ n: Number(m[1]), name: m[2] }));
  assert.deepEqual(rows, STEPS);
});

test('status prints no step name of its own', () => {
  const src = readFileSync(join(SRC, 'ci', 'status.mjs'), 'utf8');
  for (const { name } of STEPS) assert.ok(!src.includes(`— ${name}`), `ci/status.mjs spells "${name}" instead of reading it from the list`);
});

// A project that is bootstrapped and has no frame, no PRD and no milestone yet.
const base = { bootstrapped: true, packages: 1, frame: 'missing', frameTouched: false, valueRisks: 0, settled: 0, scheduled: 0, prdStatus: 'missing', prdTouched: false, milestones: [] };
const states = (over) => stepStates({ ...base, ...over });

test('every state is one of the five, and steps 6 and 7 are never done', () => {
  for (const over of [{}, { frame: 'framed', prdStatus: 'approved', milestones: [{ status: 'closed', kind: 'skeleton' }] }]) {
    const s = states(over);
    assert.equal(s.length, 8);
    assert.ok(s.every((x) => STATES.includes(x)));
    assert.deepEqual(s.slice(6), ['each milestone', 'each milestone']);
  }
});

test('step 0 is done with a filled AGENT.md and 1 package or more', () => {
  assert.equal(states({})[0], 'done');
  assert.equal(states({ packages: 0 })[0], 'in hand');
  assert.equal(states({ bootstrapped: false })[0], 'in hand');
});

test('step 1 is done when framed, in hand when written, else not started', () => {
  assert.equal(states({ frame: 'framed' })[1], 'done');
  assert.equal(states({ frame: 'draft', frameTouched: true })[1], 'in hand');
  assert.equal(states({ frame: 'draft', frameTouched: false })[1], 'not started');
  assert.equal(states({ frame: 'missing', frameTouched: true })[1], 'not started');
});

test('step 2: done when every value risk is settled, in hand when one is scheduled, else not started', () => {
  assert.equal(states({ frame: 'framed', valueRisks: 2, settled: 2 })[2], 'done');
  assert.equal(states({ frame: 'framed', valueRisks: 2, settled: 1, scheduled: 1 })[2], 'in hand');
  assert.equal(states({ frame: 'framed', valueRisks: 2, settled: 1, scheduled: 0 })[2], 'not started');
  assert.equal(states({ frame: 'framed', valueRisks: 2, settled: 0, scheduled: 2 })[2], 'in hand');
});

test('step 2 with no value risk written is done only once the frame is', () => {
  assert.equal(states({ frame: 'framed' })[2], 'done');
  assert.equal(states({ frame: 'draft', frameTouched: true })[2], 'not started');
  assert.equal(states({})[2], 'not started');
});

test('step 3 is done once the PRD leaves draft, in hand while a written draft, else not started', () => {
  assert.equal(states({ prdStatus: 'approved' })[3], 'done');
  assert.equal(states({ prdStatus: 'draft', prdTouched: true })[3], 'in hand');
  assert.equal(states({ prdStatus: 'draft', prdTouched: false })[3], 'not started');
  assert.equal(states({ prdStatus: 'missing' })[3], 'not started');
});

test('step 4 is done when a skeleton has closed, in hand while one is active', () => {
  assert.equal(states({ milestones: [{ status: 'closed', kind: 'skeleton' }] })[4], 'done');
  assert.equal(states({ milestones: [{ status: 'active', kind: 'skeleton' }] })[4], 'in hand');
  assert.equal(states({ milestones: [{ status: 'shaping', kind: 'skeleton' }] })[4], 'not started');
  assert.equal(states({ milestones: [{ status: 'closed', kind: 'bet' }] })[4], 'not started');
});

test('step 5 is in hand while a bet is active, waiting while none is and a value risk is open', () => {
  assert.equal(states({ milestones: [{ status: 'active', kind: 'bet' }], valueRisks: 1 })[5], 'in hand');
  assert.equal(states({ milestones: [{ status: 'closed', kind: 'skeleton' }], valueRisks: 1, settled: 0 })[5], 'waiting');
  assert.equal(states({ milestones: [{ status: 'closed', kind: 'skeleton' }], valueRisks: 1, settled: 1 })[5], 'not started');
  // The skeleton is underway, not a bet: step 5 is not in hand, and nothing waits while a milestone is active.
  assert.equal(states({ milestones: [{ status: 'active', kind: 'skeleton' }], valueRisks: 1 })[5], 'not started');
});

test('a closed skeleton with a value risk still open reads step 4 done, step 2 not done and step 5 waiting', () => {
  const s = states({ frame: 'framed', valueRisks: 1, settled: 0, scheduled: 1, milestones: [{ status: 'closed', kind: 'skeleton' }] });
  assert.deepEqual([s[2], s[4], s[5]], ['in hand', 'done', 'waiting']);
});

test('a step line carries the number, the name and the state', () => {
  assert.equal(stepLines(base)[6], '- Step 6 · Close the milestone: each milestone');
});

test('S1 fails a case whose step lines differ from steps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'steps-'));
  try {
    cpSync(join(SRC, 'ci', 'fixtures', 'status', 'skeleton-closed-risk-open'), join(dir, 'case'), { recursive: true });
    const run = () => spawnSync(process.execPath, [join(SRC, 'ci', 'checks', 'meta', 's1-status.mjs'), dir], { encoding: 'utf8' });
    assert.equal(run().status, 0);
    const file = join(dir, 'case', 'expect.json');
    const expect = JSON.parse(readFileSync(file, 'utf8'));
    expect.steps[4] = 'Step 4 · Walking skeleton: in hand';
    writeFileSync(file, JSON.stringify(expect));
    const r = run();
    assert.notEqual(r.status, 0);
    assert.match(r.stdout + r.stderr, /case#steps/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
