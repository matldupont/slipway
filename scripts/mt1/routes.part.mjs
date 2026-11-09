// scripts/mt1.test.mjs, part: #652's routes to a pass with a new test left out of the run. A new test the runner
// leaves out is the owner's skip only when its own call, or a describe around it, says skip or todo (§3.5, §3.8).
// One inert stand-in fixture per route, each judged by MT1 --run: a script the step cannot read stops the run, and any
// other route ends as narrowed, which the owner did not give, so nothing-judged fires.

import assert from 'node:assert/strict';
import test from 'node:test';
import { CART, project, testFile } from '../mutation/project.mjs';
import { CHANGED, EXCEPTION, FILE, mt1, removeAll } from './run.part.mjs';

const STOPS = /`app`'s `test` script is not a plain call to the test runner/;
const it = (name, opts = '') => `it('${name}', ${opts}() => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
const HEAD = "import { describe, it, expect } from 'vitest';\nimport { add } from './cart';\n\n";
// The base has a test the route lets through, so the file stays listed and the new test is left out of a listed file.
const routed = (o) => project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: o.base ?? testFile(['old']) }, test: o.test, config: { tests: { adds: { failsWhen: CHANGED } }, ...o.config } });

for (const [what, script] of [
  ['a name filter set through the prototype key', 'vitest run --__proto__.testNamePattern=nomatch'],
  ['a file filter set through the parser\'s list of left-behind words', 'vitest run --_=src/other.test.ts'],
  ['a plain -t', 'vitest run -t=nomatch'],
  ['a bare --', 'vitest run --'],
  ['a refused option negated with a dotted key', 'vitest run --no-testNamePattern.x'],
]) {
  test(`${what} in the test script is refused: the run stops, never a pass (#652)`, (t) => {
    const p = project({ base: { 'pkgs/app/src/cart.ts': CART }, test: script, config: { tests: { adds: { failsWhen: CHANGED } } } });
    removeAll(t, p);
    p.commit({ [FILE]: testFile(['adds']) });
    const r = mt1(p);
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, STOPS);
  });
}

const NARROWED = [1, ['nothing-judged'], [`${FILE}#not-judged/narrowed/adds`]];
for (const [what, o, adds] of [
  ['a name filter in the Vitest config', { config: { namePattern: '^old$' } }, it('adds')],
  ['a value on a true/false flag (the runner keeps it as a file:line filter)', { test: 'vitest run --passWithNoTests=src/cart.test.ts:4' }, it('adds')],
  ['a tags filter in the Vitest config', { config: { tagsFilter: ['old'] }, base: HEAD + it('old', "{ tags: ['old'] }, ") }, it('adds')],
  ['a tag the Vitest config skips', { config: { tags: [{ name: 'slow', skip: true }] } }, it('adds', "{ tags: ['slow'] }, ")],
  ['an alias of it.skip the step cannot read', { config: { aliases: ['later'], tests: { adds: { skipped: true } } }, want: [1, [`${FILE}:4#kills-nothing`], [`${FILE}#not-judged/narrowed/adds`, `${FILE}#unreadable`]], fix: /^Write it as `it\(…\)` or `test\(…\)`/ }, `const later = it.skip;\nlater('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`],
  ['a test called through a namespace import', { config: { namePattern: '^old$', aliases: ['v'] }, want: [1, [`${FILE}:4#kills-nothing`], [`${FILE}#not-judged/narrowed/adds`, `${FILE}#unreadable`]], fix: /^Write it as `it\(…\)` or `test\(…\)`/ }, `import * as v from 'vitest';\nv.it('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`],
  ['an optional call of it', { config: { namePattern: '^old$' } }, `it?.('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`],
  ['a .only on the test the base has', { base: HEAD + `it.only('old', () => {\n  expect(add(1, 2)).toBe(3);\n});\n` }, it('adds')],
  ['a skipIf(false), which skips nothing', { config: { namePattern: '^old$' } }, `it.skipIf(false)('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`],
]) {
  test(`${what} leaves a new test out: narrowed, and nothing-judged, never the owner's skip (#652)`, (t) => {
    const p = routed(o);
    removeAll(t, p);
    p.commit({ [FILE]: `${o.base ?? testFile(['old'])}\n${adds}` });
    const r = mt1(p);
    assert.deepEqual([r.status, r.ids, r.warned.sort()], o.want ?? NARROWED, r.out);
    assert.match(r.json.warnings.find((w) => w.where.includes('narrowed')).fix, o.fix ?? /^Remove the filter, `\.only` or hook skipping it, or mark its call `\.skip`/);
    if (!o.want) assert.match(r.json.findings[0].fix, /^Read each new test's not-judged warning and do what it says, so it runs/);
  });
}

test('beside a narrowed test, one its own call skips stays the owner\'s skip (#652)', (t) => {
  const p = routed({ config: { namePattern: '^old$' } });
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old', 'adds'])}\nit.skip('later', () => {});\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${FILE}#not-judged/narrowed/adds`, `${FILE}#not-judged/skipped/later`]], r.out);
});

test('a new test inside describe.skip is the owner\'s skip: the run passes, naming it (#652)', (t) => {
  const p = routed({});
  removeAll(t, p);
  p.commit({ [FILE]: `${HEAD}${it('old')}\ndescribe.skip('later', () => {\n  ${it('adds').trimEnd().split('\n').join('\n  ')}\n});\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], [`${FILE}#not-judged/skipped/adds`]], r.out);
});

test('a new test the run skips with no skip on its own call is narrowed, never the owner\'s skip (#652)', (t) => {
  // The stand-in's skipped rule stands for a test a hook skips as it runs (`ctx.skip()` in a beforeEach).
  const p = routed({ config: { tests: { adds: { skipped: true } } } });
  removeAll(t, p);
  p.commit({ [FILE]: testFile(['old', 'adds']) });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${FILE}#not-judged/narrowed/adds`]], r.out);
});

test('a new test the run skips whose own call says skipIf stays the owner\'s skip: the run passes, naming it (#652)', (t) => {
  const p = routed({ config: { tests: { adds: { skipped: true } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\nit.skipIf(process.env.CI)('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], [`${FILE}#not-judged/skipped/adds`]], r.out);
});

// §3.5: where the listing may hide a test (here a changed line outside every listed test), the clean run's report is
// read from the file the runner writes. One missing, one that does not parse, or one without a test's line stops the run.
for (const [what, config, says] of [
  ['writes no report', { noResult: true }, /wrote no report of `pkgs\/app\/src\/cart\.test\.ts` at the path this step gave it/],
  ['writes a report that does not parse', { badReport: true }, /wrote no report of `pkgs\/app\/src\/cart\.test\.ts` at the path this step gave it/],
  ['reports a test with no line', { noReportLine: true }, /report of `pkgs\/app\/src\/cart\.test\.ts` gives no line and column for "old"/],
  ['lists the file but does not load it in its run', { tests: { old: { loadFailsWhen: [{ file: 'pkgs/app/src/cart.ts', line: 1, has: 'never there' }] } } }, /clean run of `pkgs\/app\/src\/cart\.test\.ts` did not load it/],
]) {
  test(`a runner that ${what} stops the run, never a pass (#652)`, (t) => {
    const p = routed({ config });
    removeAll(t, p);
    p.commit({ [FILE]: `${testFile(['old', 'adds'])}\nconst later = 1;\n` });
    const r = mt1(p);
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, says);
  });
}

test('a new test the run skips is narrowed by the report itself, before its subjects are read: one with no subject is not no-subject (#652)', (t) => {
  // No file beside it and no import: a test the run ran would be no-subject.
  const lone = 'pkgs/app/src/lone.test.ts';
  const bare = (names) => testFile(names, { imports: '' });
  const p = project({ base: { 'pkgs/app/src/cart.ts': CART, [lone]: bare(['old']) }, config: { namePattern: '^old$', tests: { adds: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [lone]: bare(['old', 'adds']) });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${lone}#not-judged/narrowed/adds`]], r.out);
});

// §3.5: a changed call the runner reports no test in (gated by a condition, an empty table, never called) is named by
// its line: the owner's skip when its call says skip, else narrowed. The stand-in, like Vitest here, collects no test
// from a call behind an `if`.
const gated = (mod = '') => `if (process.env.NOT_SET) it${mod}('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
test('a new test call the runner reports no test in is narrowed, never a silent pass (#652)', (t) => {
  const p = routed({});
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\n${gated()}` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${FILE}#not-judged/narrowed`]], r.out);
  const w = r.json.warnings[0];
  assert.match(w.detail, /the runner reports no test in the call at line \d+\.$/);
  assert.match(w.fix, /^Take the condition off its call, or mark it `\.skip`/);
  assert.ok(w.detail.replace(`\`${FILE}\``, '').length + 1 + w.fix.length <= 160, w.detail);
});

test('one the runner reports no test in, whose own call says skip, is the owner\'s skip (#652)', (t) => {
  const p = routed({});
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\n${gated('.skip')}` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], [`${FILE}#not-judged/skipped`]], r.out);
  assert.match(r.json.warnings[0].detail, /the runner reports no test in the call at line \d+, which says skip\.$/);
});

// The stand-in sees no test on an import's line, so this pins the naming; scripts/mutants.test.mjs pins mayHide's part.
test('a skipped new test on an import\'s line is named (#652)', (t) => {
  const p = routed({ base: HEAD + it('old') });
  removeAll(t, p);
  p.commit({ [FILE]: HEAD.replace("from 'vitest';", "from 'vitest'; it.skip('adds', () => {});") + it('old') });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], [`${FILE}#not-judged/skipped`]], r.out);
});

test('a test the listing hides, changed only by a line removed after a blank one, is narrowed (#652)', (t) => {
  const adds = (more) => `it('adds', () => {\n  expect(add(1, 2)).toBe(3);\n\n${more}});\n`;
  const p = routed({ config: { namePattern: '^old$' }, base: `${testFile(['old'])}\n${adds("  console.log('x');\n")}` });
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old'])}\n${adds('')}` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], NARROWED, r.out);
});

test('under the mechanical excuse, a new test the listing hides is still named (#652)', (t) => {
  const p = routed({});
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old', 'adds'])}\nit.skip('later', () => {});\n`, 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#mechanical') });
  const r = mt1(p);
  assert.deepEqual([r.status, r.warned.sort()], [0, [`${FILE}#not-judged/mechanical`, `${FILE}#not-judged/mechanical/adds`]], r.out);
});

// A file whose tests are all new, because one sits in no call the step reads (an alias, test.extend), still names a
// changed call the runner reports no test in.
const aliased = `${HEAD}const fixtureTest = it;\nfixtureTest('old', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
test('beside an alias test, a new call the runner reports no test in is still named (#652)', (t) => {
  const p = routed({ base: aliased, config: { tests: { old: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${aliased}\n${gated()}` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.warned.sort()], [0, [`${FILE}#not-judged/narrowed`, `${FILE}#unreadable`]], r.out);
});

test('beside an alias test, under the mechanical excuse, a new test the listing hides is still named (#652)', (t) => {
  const p = routed({ base: aliased, config: { tests: { old: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${aliased}\nit.skip('later', () => {});\n`, 'ci/exceptions.yaml': EXCEPTION('tests-can-fail#mechanical') });
  const r = mt1(p);
  assert.ok(r.warned.includes(`${FILE}#not-judged/mechanical`), r.out);
  assert.equal(r.status, 0, r.out);
});

// An import covers only the lines it has alone: a skip the step cannot read, written beside one, reads the report.
test('a skip the step cannot read, on the line of an import, is narrowed (#652)', (t) => {
  const base = `${HEAD}const fixtureTest = it;\n${it('old')}`;
  const p = routed({ base, config: { tests: { old: { failsWhen: CHANGED } } } });
  removeAll(t, p);
  p.commit({ [FILE]: `${base}fixtureTest.skip('adds', () => {}); import { add as plus } from './cart';\n` });
  const r = mt1(p);
  assert.ok(r.warned.includes(`${FILE}#not-judged/narrowed/adds`), r.out);
});
