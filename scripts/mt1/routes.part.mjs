// scripts/mt1.test.mjs, part: #652's routes to a pass with a new test left out of the run. A new test the runner
// leaves out is the owner's skip only when its own call, or a describe around it, says skip or todo (§3.5, §3.8).
// One inert stand-in fixture per route, each judged by MT1 --run: a script the step cannot read stops the run, and any
// other route ends as narrowed, which the owner did not give, so nothing-judged fires.

import assert from 'node:assert/strict';
import test from 'node:test';
import { CART, project, testFile } from '../mutation/project.mjs';
import { CHANGED, FILE, mt1, removeAll } from './run.part.mjs';

const STOPS = /`app`'s `test` script is not a plain call to the test runner/;
const it = (name, opts = '') => `it('${name}', ${opts}() => {\n  expect(add(1, 2)).toBe(3);\n});\n`;
const HEAD = "import { describe, it, expect } from 'vitest';\nimport { add } from './cart';\n\n";
// The base has a test the route lets through, so the file stays listed and the new test is left out of a listed file.
const routed = (o) => project({ base: { 'pkgs/app/src/cart.ts': CART, [FILE]: o.base ?? testFile(['old']) }, test: o.test, config: { tests: { adds: { failsWhen: CHANGED } }, ...o.config } });

for (const [what, script] of [
  ['a name filter set through the prototype key', 'vitest run --__proto__.testNamePattern=nomatch'],
  ['a file filter set through the parser\'s list of left-behind words', 'vitest run --_=src/other.test.ts'],
  ['a plain -t', 'vitest run -t nomatch'],
  ['a bare --', 'vitest run --'],
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

const NARROWED = [1, ['nothing-judged'], [`${FILE}#not-judged/narrowed`]];
for (const [what, o, adds] of [
  ['a name filter in the Vitest config', { config: { namePattern: '^old$' } }, it('adds')],
  ['a value on a true/false flag (the runner keeps it as a file:line filter)', { test: 'vitest run --passWithNoTests=src/cart.test.ts:4' }, it('adds')],
  ['a tags filter in the Vitest config', { config: { tagsFilter: ['old'] }, base: HEAD + it('old', "{ tags: ['old'] }, ") }, it('adds')],
  ['a tag the Vitest config skips', { config: { tags: [{ name: 'slow', skip: true }] } }, it('adds', "{ tags: ['slow'] }, ")],
  ['an alias of it.skip the step cannot read', {}, `const later = it.skip;\nlater('adds', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`],
]) {
  test(`${what} leaves a new test out: narrowed, and nothing-judged, never the owner's skip (#652)`, (t) => {
    const p = routed(o);
    removeAll(t, p);
    p.commit({ [FILE]: `${o.base ?? testFile(['old'])}\n${adds}` });
    const r = mt1(p);
    assert.deepEqual([r.status, r.ids, r.warned], NARROWED, r.out);
    assert.match(r.json.warnings[0].fix, /^Remove the config filter or `\.only` that drops it/);
    assert.match(r.json.findings[0].fix, /^Remove the filter or `\.only` that leaves the new tests out/);
  });
}

test('beside a narrowed test, one its own call skips stays the owner\'s skip (#652)', (t) => {
  const p = routed({ config: { namePattern: '^old$' } });
  removeAll(t, p);
  p.commit({ [FILE]: `${testFile(['old', 'adds'])}\nit.skip('later', () => {});\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [1, ['nothing-judged'], [`${FILE}#not-judged/narrowed`, `${FILE}#not-judged/skipped`]], r.out);
});

test('a new test inside describe.skip is the owner\'s skip: the run passes, naming it (#652)', (t) => {
  const p = routed({});
  removeAll(t, p);
  p.commit({ [FILE]: `${HEAD}${it('old')}\ndescribe.skip('later', () => {\n  ${it('adds').trimEnd().split('\n').join('\n  ')}\n});\n` });
  const r = mt1(p);
  assert.deepEqual([r.status, r.ids, r.warned], [0, [], [`${FILE}#not-judged/skipped`]], r.out);
});
