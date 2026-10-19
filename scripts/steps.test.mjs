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
import { readRisks, settled } from '../ci/checks/lib/risks.mjs';
import { nextFormBreaks } from '../ci/checks/lib/next-form.mjs';
import { STATES, STEPS, stepLines, stepStates } from '../ci/checks/lib/steps.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('the path table in SLIPWAY.md says each step as the list does: number, name, who and how long', () => {
  const rows = [...readFileSync(join(SRC, 'SLIPWAY.md'), 'utf8').matchAll(/^\|\s*\*\*(\d) · ([^*]+?)\*\*\s*\|([^|]*)\|([^|]*)\|/gm)].map((m) => ({ n: Number(m[1]), name: m[2], who: m[3].trim(), time: m[4].trim() }));
  assert.deepEqual(rows, STEPS);
});

test('the who and how-long cells are plain text: no markup, no digits written as a range with a dash', () => {
  for (const { who, time } of STEPS) for (const cell of [who, time]) assert.match(cell, /^[a-z0-9][a-z0-9 ]*$/, cell);
});

test('status prints no step name of its own', () => {
  const src = readFileSync(join(SRC, 'ci', 'status.mjs'), 'utf8');
  for (const { name } of STEPS) assert.ok(!src.includes(`— ${name}`), `ci/status.mjs spells "${name}" instead of reading it from the list`);
});

test('status spells no who or how-long of its own: the last sentence of a Next line comes from the list', () => {
  const src = readFileSync(join(SRC, 'ci', 'status.mjs'), 'utf8');
  for (const { who, time } of STEPS) {
    assert.ok(!src.toLowerCase().includes(`${who}, ${time}`), `ci/status.mjs spells "${who}, ${time}" instead of reading it from the list`);
    assert.ok(!new RegExp(`\\b${time}\\.`).test(src), `ci/status.mjs ends a sentence with "${time}." instead of reading it from the list`);
  }
});

// The form of the Next line, one clause at a time (ci/checks/lib/next-form.mjs): each must trip on its own, so deleting any one
// of them turns a case here red. S1 holds the same function to every status fixture.
test('the Next-line form: a good line passes, and each clause trips alone', () => {
  const good = 'Run /kickoff to finish docs/product/FRAME.md. Its open questions need an answer. You, an afternoon.';
  assert.deepEqual(nextFormBreaks(good), []);
  const trips = {
    'too few sentences': ['Run /kickoff now.', /sentences/],
    'too many sentences': ['Run /kickoff. Its questions wait. Nothing else waits. The frame is next. You, an afternoon.', /5 sentences/],
    'first sentence': [`Run the kickoff and then finish every part of the frame document with real people today please. Its open questions wait. You, an afternoon.`, /first sentence/],
    'semicolon': ['Run /kickoff; it finishes the frame. Its questions wait. You, an afternoon.', /semicolon/],
    'dash': ['Run /kickoff — it finishes the frame. Its questions wait. You, an afternoon.', /dash/],
    'step number': ['Run /kickoff for Step 1. Its questions wait. You, an afternoon.', /step number/],
    'check id': ['Run /kickoff to clear K1. Its questions wait. You, an afternoon.', /check id/],
    'decision id': ['Run /kickoff to settle D-005. Its questions wait. You, an afternoon.', /decision id/],
    'length': [`Run /kickoff. ${'Its questions wait. '.repeat(14)}You, an afternoon.`, /over 260/],
    'who': ['Run /kickoff. Its questions wait. The frame is yours.', /say who/],
  };
  for (const [clause, [line, re]] of Object.entries(trips)) {
    const broken = nextFormBreaks(line);
    assert.ok(broken.some((b) => re.test(b)), `${clause}: ${JSON.stringify(broken)}`);
  }
  // The 260 counts the quoted spans; the other rules do not.
  assert.ok(nextFormBreaks(`Test RISK-1, "${'a'.repeat(250)}" now. Nothing waits. You, an afternoon.`).some((b) => /over 260/.test(b)));
  // A quoted span is project text the rules cannot govern.
  assert.deepEqual(nextFormBreaks('Test RISK-1, "a; b — K1 D-005 Step 1" with real people. Nothing waits. Yours, days to weeks.'), []);
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
  // The skeleton is underway, not a bet: step 5 is not in hand, and it still waits on the open value risk.
  assert.equal(states({ milestones: [{ status: 'active', kind: 'skeleton' }], valueRisks: 1 })[5], 'waiting');
  assert.equal(states({ milestones: [{ status: 'active', kind: 'skeleton' }], valueRisks: 1, settled: 1 })[5], 'not started');
});

test('a closed skeleton with a value risk still open reads step 4 done, step 2 not done and step 5 waiting', () => {
  const s = states({ frame: 'framed', valueRisks: 1, settled: 0, scheduled: 1, milestones: [{ status: 'closed', kind: 'skeleton' }] });
  assert.deepEqual([s[2], s[4], s[5]], ['in hand', 'done', 'waiting']);
});

test('a step line carries the number, the name and the state', () => {
  assert.equal(stepLines(base)[6], '- Step 6 · Close the milestone: each milestone');
});

test('a risk is settled exactly when K1 raises no finding on its Result', () => {
  const dir = mkdtempSync(join(tmpdir(), 'steps-k1-'));
  try {
    cpSync(join(SRC, 'ci', 'fixtures', 'status', 'experience-settled'), dir, { recursive: true });
    const file = join(dir, 'docs', 'product', 'FRAME.md');
    // A measured Result with no Threshold: K1's no-threshold rule, which `settled` must share.
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^(\| RISK-5 .*)$/m, '$1\n| RISK-7 | Imports finish | value | slow | spike | | 0.4 s | |'));
    const k1 = spawnSync(process.execPath, [join(SRC, 'ci', 'checks', 'meta', 'k1-frame.mjs'), dir], { encoding: 'utf8' });
    const flagged = new Set([...(k1.stdout + k1.stderr).matchAll(/(RISK-\d+)#risk\/(?:experience-rationale|no-refutation|no-threshold)/g)].map((m) => m[1]));
    const rows = readRisks(dir, readFileSync(file, 'utf8')).rows;
    assert.ok(flagged.has('RISK-7') && flagged.has('RISK-3') && flagged.has('RISK-6'));
    for (const r of rows) assert.equal(settled(r), r.tested && !flagged.has(r.id), r.id);
    assert.ok(rows.some((r) => settled(r)) && rows.some((r) => !settled(r)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// #477: a kind: test milestone may go active while the risk it tests is untested, and status agrees with K1 about what
// that risk still holds. The green case PC1 cannot hold (a known-bad case that passes is a finding there).
test('an active test milestone passes K1 on its own risk, and status lists only the others as held', () => {
  const dir = mkdtempSync(join(tmpdir(), 'steps-test-milestone-'));
  try {
    cpSync(join(SRC, 'ci', 'fixtures', 'status', 'test-milestone-shaping'), dir, { recursive: true });
    const set = (file, status) => {
      const path = join(dir, 'docs', 'milestones', file);
      writeFileSync(path, readFileSync(path, 'utf8').replace(/^status: \w+$/m, `status: ${status}`));
    };
    const k1 = () => spawnSync(process.execPath, [join(SRC, 'ci', 'checks', 'meta', 'k1-frame.mjs'), dir], { encoding: 'utf8' });
    const frame = () => {
      const r = spawnSync(process.execPath, [join(SRC, 'ci', 'status.mjs'), dir], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-20', TZ: 'UTC' } });
      return r.stdout.match(/^- Frame: (.*)$/m)?.[1];
    };
    set('M1.1-concierge.md', 'active');
    const green = k1();
    assert.equal(green.status, 0, green.stdout + green.stderr);
    // Green says what it proved: RISK-1 is held only by its test milestone, never "tested".
    assert.match(green.stdout, /every value risk was tested against a bar set first or settled by experience, except RISK-1, which only its test milestone holds/);
    assert.equal(frame(), 'framed · risks: RISK-1 scheduled (#9), being tested in M1.1, RISK-2 untested · blocks M2, M3, M4 activation');
    // Closed before its test finished: K1 is red at the close, and status says the milestone is held again.
    set('M1.1-concierge.md', 'closed');
    assert.match(k1().stdout, /M1\.1#risk\/test-unfinished/);
    assert.equal(frame(), 'framed · risks: RISK-1 scheduled (#9), RISK-2 untested · M1.1 underway with it untested — pnpm meta is red until it has a Result');
    set('M1.1-concierge.md', 'active');
    // Without the owner's Starts: line, the decision starts nothing: K1 holds M1.1 for RISK-1, and status agrees.
    const decisions = join(dir, 'decisions.md');
    const record = readFileSync(decisions, 'utf8');
    writeFileSync(decisions, record.replace(/^Starts: M1\.1 · RISK-1\n/m, ''));
    const unstarted = k1();
    assert.equal(unstarted.status, 1);
    assert.match(unstarted.stdout, /RISK-1#risk\/unresolved: value risk untested while M1\.1 is underway/);
    assert.match(unstarted.stdout, /M1\.1#risk\/test-target: .*PD-1 has no "Starts: M1\.1 · RISK-n" line/);
    assert.equal(frame(), 'framed · risks: RISK-1 scheduled (#9), RISK-2 untested · M1.1 underway with it untested — pnpm meta is red until it has a Result');
    writeFileSync(decisions, record);
    // A lone carriage return above the Starts: line can hide it in the rendered file, so the line is not read (D-047). A
    // tracked fixture cannot hold one (a checkout normalises line endings), so the case is written here.
    writeFileSync(decisions, record.replace('# Decisions\n', '# Decisions\n\nA note ended by a lone carriage return.\rNext line.\n'));
    assert.match(k1().stdout, /M1\.1#risk\/test-target: .*is not read: line 3 above it holds a lone carriage return/);
    writeFileSync(decisions, record);
    // An existential RISK-1 due before M2: M1.1 runs its test, so status does not ask for it before M1.1.
    const framePath = join(dir, 'docs', 'product', 'FRAME.md');
    writeFileSync(framePath, readFileSync(framePath, 'utf8').replace('| value | no product |', '| value | Existential: no product |'));
    writeFileSync(join(dir, 'docs', 'PRD.md'), '# PRD\n\nStatus: approved\nVersion: 1.0.0\n\n## 8. Risks\n\n| ID | Risk | Resolves by |\n|---|---|---|\n| RISK-1 | Group texts | before M2 |\n');
    const st = spawnSync(process.execPath, [join(SRC, 'ci', 'status.mjs'), dir], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-20', TZ: 'UTC' } }).stdout;
    assert.doesNotMatch(st, /RISK-1 is existential and untested/);
    // A second milestone underway that is not the test milestone: K1 holds RISK-1 again, and status says so.
    set('M2-booking.md', 'active');
    const red = k1();
    assert.equal(red.status, 1);
    assert.match(red.stdout, /RISK-1#risk\/unresolved: value risk untested while M2 is underway/);
    assert.equal(frame(), 'framed · risks: RISK-1 scheduled (#9), being tested in M1.1, RISK-2 untested · M2 underway with it untested — pnpm meta is red until it has a Result');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
