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
  const p = at({ config: { noReportColumn: true } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['old', 'adds']) });
  const r = mt1(p);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /report of `pkgs\/app\/src\/cart\.test\.ts` gives no line and column for "old"/);
});

for (const [when, what] of [['changed', 'a run with a change'], ['after', 'the untouched run after the changes']]) {
  test(`${what} that places no test stops the run, never a match by name (#655)`, (t) => {
    const p = at({ config: { noColumnWhen: when } });
    removeAll(t, p);
    p.commit({ [FILE]: testFile(['old', 'adds']) });
    const r = mt1(p);
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /report of `pkgs\/app\/src\/cart\.test\.ts` gives no line and column for "old"/);
  });
}

test('a row the run skips, beside one it runs, is named once (#655)', (t) => {
  const each = (more) => `${testFile(['old'])}${more}it.each([[1, 2], [2, 3]])('loop %i', (a, b) => {\n  expect(add(a, 1)).toBe(b);\n});\n`;
  const p = at({ base: each(''), config: { rows: { 'loop %i': 2 }, tests: { 'loop 1': { skipped: true }, 'loop %i': { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: each('const later = 1;\n').replace('[2, 3]]', '[2, 3], ]') });
  const r = mt1(p);
  assert.equal(r.warned.filter((w) => w.endsWith('/loop 1')).length, 1, r.out);
});

test('two Vitest projects that run one file stop the run, naming the projects, not the test names (#655)', (t) => {
  const p = at({ config: { copies: 2 } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['old', 'adds']) });
  const r = mt1(p);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /is run by more than one Vitest project in `app`'s call/);
});

// Vitest 5 lists a file without running it, so a test called by another name is in its listing nowhere: the step reads
// the clean run's report for every changed test file, never the listing alone.
test('a test the listing leaves out, made live by removing the guard above it, is judged (#655)', (t) => {
  const guarded = (guard) => `${testFile(['old'])}const check = it;\n${guard}check('nothing', () => {\n  add(1, 2);\n});\n`;
  const p = at({ base: guarded('if (process.env.NOT_SET)\n'), config: { aliases: ['check'], unlistedAliases: true } });
  removeAll(t, p);
  p.commit({ [FILE]: guarded('') });
  const r = mt1(p);
  assert.equal(r.status, 1, r.out);
  assert.ok(r.ids.some((id) => id.endsWith('#kills-nothing')) && /"nothing" passed on all/.test(r.out), r.out);
});

test('in a file whose places are not trusted, a new test is judged and each changed call is named, saying why (#655)', (t) => {
  // Every test in the file is new, the old one too: each has a rule that fails on a change.
  const p = at({ base: `${testFile(['old'])}//# sourceMappingURL=cart.test.js.map\n`, config: { tests: { adds: { failsWhen: CHANGED }, old: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old', 'adds'])}//# sourceMappingURL=cart.test.js.map\n` });
  const r = mt1(p);
  assert.equal(r.status, 0, r.out);
  const w = r.json.warnings.find((x) => x.where === `${FILE}#not-judged/narrowed`);
  assert.match(w?.detail ?? '', /cannot tell whether the runner ran a test in the call at line \d+, since a source map comment in the file moves/, r.out);
  assert.match(w.fix, /^Take off any condition or empty table/);
  const u = r.json.warnings.find((x) => x.where === `${FILE}#unreadable`);
  assert.match(u?.detail ?? '', /has every test in it judged, old ones too: a source map comment in it moves where the runner says a test is/, r.out);
  assert.match(u.fix, /^Put new tests in a file with no tagged template or source map comment/);
});
