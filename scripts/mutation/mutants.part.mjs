// scripts/mutation.test.mjs, part: what the run asks of ci/checks/lib/mutants.mjs beyond step 2 — the test forms
// spans() reads, a deep modifier chain, the paths a test file imports, the guards no change is made in, and the call
// each test the runner places belongs to.

import assert from 'node:assert/strict';
import test from 'node:test';
import { imports, mutants, spans } from '../../ci/checks/lib/mutants.mjs';
import { mayHide, newTests } from '../../ci/checks/lib/mutation-tests.mjs';

test('spans() reads it.fails, .sequential, .for, .skipIf and .runIf as test calls, and their inner call as none', () => {
  const count = (code) => spans('a.js', code).tests.length;
  for (const call of ["it.fails('x', f)", "test.sequential('x', f)", "it.for([1])('x', f)", "it.for`a`('x', f)", "it.skipIf(c)('x', f)", "test.runIf(c)('x', f)", "it.skipIf(c).each([1])('x', f)", "it.concurrent.fails('x', f)"]) {
    assert.equal(count(call), 1, call);
  }
  for (const call of ['it.skipIf(c)', 'it.for([1])', "test.extend({})('x', f)", "myTest('x', f)", "it.skipIf`a`('x', f)"]) assert.equal(count(call), 0, call);
});

test('a chain of 20,000 modifier links is read, not a RangeError', () => {
  const code = `it${'.only'.repeat(20000)}('x', () => {});`;
  assert.deepEqual(spans('a.js', code).tests.map(({ points, ...t }) => t), [{ first: 1, last: 1, start: 0, end: code.length - 1, skip: false }]);
});

test('imports() gives what a file imports and re-exports from, and leaves type-only imports out', () => {
  const code = "import a from './a';\nimport './side';\nimport type { T } from './types';\nimport { b } from 'pkg';\nexport * from './c';\nexport type { U } from './u';\n";
  assert.deepEqual(imports('a.ts', code), ['./a', './side', 'pkg', './c']);
  assert.deepEqual(imports('a.md', code), { unreadable: 'not JavaScript or TypeScript' });
});

test('no change is made in a guard that reads the environment; the rest of the file keeps its changes', () => {
  const code = [
    'export function pick(x) {',
    "  if (process.env.Y) return a(x);",
    "  const where = import.meta.env.MODE === 'test' ? 'a' : 'b';",
    "  if (globalThis.process.env.X && x > 1) return x;",
    '  if (x > 2) return false;',
    '  return where;',
    '}',
  ].join('\n');
  const changes = mutants('a.js', code);
  const on = (line) => changes.filter((c) => c.line === line && c.kind !== 'body').map((c) => c.kind);
  assert.deepEqual(on(2), [], 'the if that reads process.env');
  assert.deepEqual(on(3), [], 'the ternary and the === that read import.meta.env');
  assert.deepEqual(on(4), [], 'the && that reads it, and the > inside it');
  assert.deepEqual(on(5).sort(), ['condition', 'condition', 'literal', 'operator']);
  assert.ok(changes.some((c) => c.kind === 'body' && c.line === 1), 'the function body is still changed');
  assert.ok(mutants('a.js', 'if (env.X) f();').some((c) => c.kind === 'condition'), 'a name that is not process.env is changed');
});

test('spans() marks a test skip only when its own call or a describe whose function it sits in says skip, todo, skipIf or runIf (#652)', () => {
  const code = [
    "it('a', () => {});", "it.skip('b', () => {});", "it.todo('c');", "it.skipIf(x)('d', () => {});", "it.runIf(x).each([1])('e', () => {});",
    "describe.skip('s', () => {", "  it('f', () => { on('x', () => {}); });", "});", "describe.skipIf(x)('t', () => { describe('u', () => { it('g', () => {}); }); });",
    "it('h', { skip: true }, () => {});", "it.only('i', () => {});", "describe.shuffle.skip('v', () => { it('j', () => {}); });",
  ].join('\n');
  assert.deepEqual(spans('a.js', code).tests.map((t) => t.skip), [false, true, true, true, true, true, true, false, false, true]);
});

test('spans() reads a test through an optional call, a TypeScript assertion or a sequence, never a member on another object; a condition whose text skips nothing is no skip, and .only wins (#652)', () => {
  const code = [
    "it?.('a', () => {});", "it!('b', () => {});", "(it as any)('c', () => {});", "(0, it)('d', () => {});",
    "it.runIf(true)('e', () => {});", "it.skipIf(false)('f', () => {});", "it.skipIf(0)('g', () => {});", "it.skipIf()('h', () => {});", "it.runIf(!0)('i', () => {});",
    "it.only.skip('j', () => {});", "describe.skip('s', () => {}, it('k', () => {}));", "it.skip?.('l', () => {});", "it.runIf(null)('m', () => {});", "it.skipIf(cond)('n', () => {});",
    "const ok = /^a/.test('abc');", "v.it('o', () => {});", "schema.test('p', 'msg', () => true);", "it.runIf(/darwin/.test(process.platform))('q', () => {});",
  ].join('\n');
  const tests = spans('a.ts', code).tests.map((t) => [t.first, t.skip]);
  assert.deepEqual(tests, [[1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [8, false], [9, false], [10, false], [11, false], [12, true], [13, true], [14, true], [18, true]]);
});

// #655: a test belongs to the call that holds its place (its line and column, as Vitest gives them), never to a call it
// only shares a line with. Read on real text.
const placed = (text, line, name, status) => ({ name, line, column: text.split('\n')[line - 1].indexOf(name) + 1, status });
test('two test calls on one line are two tests, and a second the runner places nothing in is still named (#655)', () => {
  const text = "import { it, expect } from 'vitest';\nit('a', () => { expect(1).toBe(1); }); if (env) it('b', () => { expect(2).toBe(2); });\n";
  const lines = { added: new Set([2]), removedAfter: [] };
  const a = placed(text, 2, "it('a'");
  const b = placed(text, 2, "it('b'");
  const both = newTests([{ ...a, name: 'a' }, { ...b, name: 'b' }], spans('a.test.ts', text), lines, text);
  assert.deepEqual([both.groups.map((g) => [g.name, g.line, g.read]), both.unreported, both.every], [[['a', 2, true], ['b', 2, true]], [], false]);
  const one = newTests([{ ...a, name: 'a' }], spans('a.test.ts', text), lines, text);
  assert.deepEqual([one.groups.map((g) => g.name), one.unreported], [['a'], [{ line: 2, skip: false }]]);
});

test('a skip the step cannot read, on the closing line of a listed test, reads the report and makes every test new (#655)', () => {
  const text = "import { it, expect } from 'vitest';\nconst fixtureTest = it;\nit('c', () => {\n  expect(3).toBe(3);\n}); fixtureTest.skip('d', () => {});\n";
  const read = spans('a.test.ts', text);
  const lines = { added: new Set([5]), removedAfter: [] };
  const c = { ...placed(text, 3, "it('c'"), name: 'c' };
  assert.equal(mayHide([c], read, lines, text), true);
  const found = newTests([c, { ...placed(text, 5, "skip('d'"), name: 'd', status: 'skipped' }], read, lines, text);
  assert.deepEqual([found.every, found.groups.map((g) => [g.name, g.run, g.read])], [true, [['c', true, true], ['d', false, false]]]);
  // What a call leaves on its own lines is closing text only: nothing hides there.
  const closed = "import { it, expect } from 'vitest';\nit('c', () => {\n  expect(3).toBe(3);\n}); // done\n";
  assert.equal(mayHide([{ ...placed(closed, 2, "it('c'"), name: 'c' }], spans('a.test.ts', closed), { added: new Set([4]), removedAfter: [] }, closed), false);
});

test('spans() gives each test call the points Vitest places a test at: its name, each property and each opening parenthesis, and nothing between them (#655)', () => {
  const code = "it('a', f);\nit.skip.each([1])('b', f);\n(0, it)('c', f);\nit.each`\n  x\n  ${1}\n`('d', f);\n";
  const at = (t) => t.points.map((o) => code.slice(o, o + 4));
  const [a, b, c, d] = spans('a.js', code).tests;
  assert.deepEqual([at(a), at(b), at(c), at(d)], [["('a'", "it('"], ["('b'", "([1]", 'each', 'skip', 'it.s'], ["('c'"], ["('d'", 'each', 'it.e']]);
  assert.deepEqual([a.tagged, b.tagged, c.tagged, d.tagged], [undefined, undefined, undefined, true]);
});

// Vitest 5.0.3's own places for this text, read off a real run: the tagged tables' rows sit lines below their calls,
// inside other ones. No place in a file with a tagged table is trusted, so every test in it is new (#655).
test('a file with a tagged-template table trusts none of its places: every test is new, each on its own (#655)', () => {
  const text = [
    "import { it, expect } from 'vitest';", "import { double } from './num';", "it('a', () => { expect(double(1)).toBe(2); });",
    'it.each`', '  x', '  ${1}', '  ${2}', "`('zero $x', ({ x }) => { expect(double(x)).toBe(x * 2); });",
    'it.each`', '  x', '  ${1}', '  ${2}', "`('two $x', ({ x }) => { double(x); expect(true).toBe(true); });",
    "it('v1', () => {", '  expect(1).toBe(1);', '});', "it('v2', () => {", '  expect(1).toBe(1);', '});', '',
  ].join('\n');
  const reported = [['a', 3, 1], ['zero 1', 12, 2], ['zero 2', 12, 2], ['two 1', 19, 2], ['two 2', 19, 2], ['v1', 14, 1], ['v2', 17, 1]].map(([name, line, column]) => ({ name, line, column, status: 'passed' }));
  const found = newTests(reported, spans('a.test.ts', text), { added: new Set([9, 10, 11, 12, 13]), removedAfter: [] }, text);
  assert.deepEqual([found.every, found.tagged, found.groups.map((g) => g.name)], [true, true, reported.map((t) => t.name)]);
  // A row placed exactly at a point of another call (here the `(` after `zero`'s table) is still not trusted.
  const onPoint = reported.map((t) => (t.name.startsWith('two') ? { ...t, line: 8, column: 2 } : t));
  assert.equal(newTests(onPoint, spans('a.test.ts', text), { added: new Set([9, 10, 11, 12, 13]), removedAfter: [] }, text).every, true);
});
