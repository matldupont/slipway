// scripts/mt1.test.mjs, part: #655's places. A test is known by where the runner places it (its line and column,
// inside its own call) and its name together, never by its name or its line alone, and each is judged on its own.
// One inert stand-in fixture per case, each judged by MT1 --run.

import assert from 'node:assert/strict';
import test from 'node:test';
import { CART, project, testFile } from '../mutation/project.mjs';
import { CHANGED, FILE, mt1, removeAll } from './run.part.mjs';

const HEAD = "import { describe, it, expect } from 'vitest';\nimport { add } from './cart';\n\n";
const it = (name) => `it('${name}', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
const at = (o) => project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: o.base ?? testFile(['old']) }, config: { tests: { adds: { failsWhen: CHANGED } }, ...o.config } });

test('a new test with the name of an old one is judged on its own, never by the old one failing (#655)', (t) => {
  // The old `adds` at line 4 fails on a change; the new one, at line 8, asserts nothing.
  const p = at({ base: HEAD + it('adds'), config: { tests: { 'adds@4': { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${HEAD}${it('adds')}\nit('adds', () => {\n  add(1, 2);\n});\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, [`${FILE}:8#kills-nothing`]], r.out);
});

test('a second test on the line of a first is judged on its own (#655)', (t) => {
  const p = at({});
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\nit('adds', () => { expect(add(1, 2)).toBe(3); }); it('later', () => { add(1, 2); });\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids], [1, [`${FILE}:8#kills-nothing`]], r.out);
  assert.match(r.json.findings[0].detail, /› "later" passed on all/);
});

test('a new test that opens on the line of a describe is still judged, with the same result (#655)', (t) => {
  const p = at({});
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\ndescribe('cart', () => { it('adds', () => {\n  expect(add(1, 2)).toBe(3);\n}); });\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], []], r.out);
});

test('two tests at one place with one name stop the run, never a pass (#655)', (t) => {
  const p = at({ config: { rows: { adds: 2 }, tests: { adds: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\nit.each([[1, 2], [2, 3]])('adds', (a, b) => {\n  expect(add(a, 1)).toBe(b);\n});\n` });
  const r = mt1(p);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /has two tests named "adds" at line \d+, column \d+, so this step cannot tell them apart/);
});

test('a run whose report places no test stops the run, never a match by name (#655)', (t) => {
  // The listing places every test, so nothing may hide and the step reads no report before the baseline.
  const p = at({ config: { noReportColumn: true } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['old', 'adds']) });
  const r = mt1(p);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /report of `pkgs\/app\/src\/cart\.test\.ts` gives no line and column for "old"/);
});
