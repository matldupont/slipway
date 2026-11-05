// scripts/mutation.test.mjs, part: what the run asks of ci/checks/lib/mutants.mjs beyond step 2 — the test forms
// spans() reads, a deep modifier chain, the paths a test file imports, and the guards no change is made in.

import assert from 'node:assert/strict';
import test from 'node:test';
import { imports, mutants, spans } from '../../ci/checks/lib/mutants.mjs';

test('spans() reads it.fails, .sequential, .for, .skipIf and .runIf as test calls, and their inner call as none', () => {
  const count = (code) => spans('a.js', code).tests.length;
  for (const call of ["it.fails('x', f)", "test.sequential('x', f)", "it.for([1])('x', f)", "it.for`a`('x', f)", "it.skipIf(c)('x', f)", "test.runIf(c)('x', f)", "it.skipIf(c).each([1])('x', f)", "it.concurrent.fails('x', f)"]) {
    assert.equal(count(call), 1, call);
  }
  for (const call of ['it.skipIf(c)', 'it.for([1])', "test.extend({})('x', f)", "myTest('x', f)", "it.skipIf`a`('x', f)"]) assert.equal(count(call), 0, call);
});

test('a chain of 20,000 modifier links is read, not a RangeError', () => {
  const code = `it${'.only'.repeat(20000)}('x', () => {});`;
  assert.deepEqual(spans('a.js', code).tests, [{ first: 1, last: 1, skip: false }]);
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

test('spans() marks a test skip only when its own call or a describe around it says skip, todo, skipIf or runIf (#652)', () => {
  const code = [
    "it('a', () => {});", "it.skip('b', () => {});", "it.todo('c');", "it.skipIf(x)('d', () => {});", "it.runIf(x).each([1])('e', () => {});",
    "describe.skip('s', () => {", "  it('f', () => { on('x', () => {}); });", "});", "describe.skipIf(x)('t', () => { describe('u', () => { it('g', () => {}); }); });",
    "it('h', { skip: true }, () => {});", "it.only('i', () => {});",
  ].join('\n');
  assert.deepEqual(spans('a.js', code).tests.map((t) => t.skip), [false, true, true, true, true, true, true, false, false]);
  assert.deepEqual(spans('a.js', code).others, [], 'a call inside a test is not one');
});

test('spans() gives a call shaped like a test it cannot read as one: an alias of it or test, a marked chain, a computed modifier; never a route, a mock or a helper (#652)', () => {
  const code = [
    "import { it as each, describe } from 'vitest';", "const later = it.skip;", "const adds = (n, f) => it(n, f);", "later('a', () => {});", "myTest.skip('b', async () => {});",
    "it[mode]('c', function () {});", "each('d', () => {});", "helper.each([1])('e', () => {});", "later('f', fnRef);", "later(name, () => {});",
    "describe.skip('s', () => { later('g', () => {}); });",
    // Never one: a route, a mock, a test inside a wrapper, a helper on another name, one inside a hook, the wrapper's own call.
    "app.get('/x', () => {});", "vi.mock('./x', () => ({}));", "vi['mock']('./y', () => ({}));", "wrap('h', () => { it('i', () => {}); });",
    "registerHandler('/x', () => {});", "beforeEach(() => { addEventListener('message', () => {}); });", "adds('j', () => {});",
  ].join('\n');
  assert.deepEqual(spans('a.ts', code).others, [4, 5, 6, 7, 8, 9, 10, 11].map((n) => ({ first: n, last: n, skip: n === 11 })));
});

test('spans() reads a test through a namespace, a global, an optional call, a TypeScript assertion or a sequence, and gives the callee forms it cannot read; skipIf(false), runIf(true) and .only skip nothing (#652)', () => {
  const code = [
    "v.it('a', () => {});", "globalThis.test('b', () => {});", "it?.('c', () => {});", "it!('d', () => {});", "(it as any)('e', () => {});", "(0, it)('f', () => {});",
    "it.runIf(true)('g', () => {});", "it.skipIf(false)('h', () => {});", "it.only.skip('i', () => {});", "describe.skip('s', () => {}, it('j', () => {}));", "it.skip?.('k', () => {});",
    "it.call(null, 'l', () => {});", "[it][0]('m', () => {});", "later('n', fnRef);", "later(name, () => {});", "const myTest = test.extend({ a: async ({}, use) => use(1) });",
    "const later = it.skip;",
  ].join('\n');
  const read = spans('a.test.ts', code);
  assert.deepEqual(read.tests.map((t) => [t.first, t.skip]), [[1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [8, false], [9, false], [10, false], [11, true]]);
  assert.deepEqual(read.others.map((o) => o.first), [12, 13, 14, 15]);
});
