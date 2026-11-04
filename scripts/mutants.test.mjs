#!/usr/bin/env node
// The parser under the tests-can-fail step (dev/features/tests-can-fail.md §2, D-037, #630): the vendored
// @babel/parser is the release its record says it is, unedited, and the pin fails on a file one byte away. The
// file is hashed, never run: ci/checks/lib/mutants.mjs is to be the only file that imports it.
// Build step 2 adds the tests of what ci/checks/lib/mutants.mjs reads with it (its fixtures: scripts/fixtures/mutants/).
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from '../ci/checks/lib/vendor/babel-parser.mjs';
import { mutants, reExports, spans } from '../ci/checks/lib/mutants.mjs';

const VENDOR = fileURLToPath(new URL('../ci/checks/lib/vendor/', import.meta.url));
const PARSER = '7d39f3039056b4e4e05daecd69c4391beeed1769429128a2ba3d3113dffe4072';
const LICENCE = '2e97627cb278aa7556fb9e8817368302301a595b6c7582512b8d74c57b773652';
const NOT_PINNED = 'babel-parser.mjs is not the pinned release: it is replaced whole by the rule in D-033, never edited';

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const assertPinned = (path) => assert.equal(sha(path), PARSER, NOT_PINNED);

test('the vendored parser is the pinned release, unedited, with its licence and its record beside it', () => {
  assertPinned(join(VENDOR, 'babel-parser.mjs'));
  assert.equal(sha(join(VENDOR, 'babel-parser.LICENSE')), LICENCE);
  const record = readFileSync(join(VENDOR, 'README.md'), 'utf8');
  const section = record.slice(record.indexOf('## @babel/parser'));
  for (const said of [PARSER, LICENCE, 'parser-8.0.7.tgz']) assert.ok(section.includes(said), said);
  // The Version row names each newer release it did not take, and why (the 14-day rule of D-033).
  const version = section.split('\n').find((line) => line.startsWith('| Version | 8.0.7,'));
  assert.ok(version, 'the table has no Version row for 8.0.7');
  for (const said of ['8.1.0', '8.0.10', '8.0.8', '7.29.11', '7.29.12', 'under 14 days old', 'not taken']) assert.ok(version.includes(said), `the Version row does not say ${said}`);
});

test('the pin fails on a parser one byte away from the release', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutants-pin-'));
  try {
    const bytes = readFileSync(join(VENDOR, 'babel-parser.mjs'));
    for (const at of [0, bytes.length >> 1, bytes.length - 1]) {
      const changed = Buffer.from(bytes);
      changed[at] ^= 1;
      const path = join(dir, 'babel-parser.mjs');
      writeFileSync(path, changed);
      assert.throws(() => assertPinned(path), (e) => e.message.startsWith(NOT_PINNED), `byte ${at}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const FIXTURES = fileURLToPath(new URL('./fixtures/mutants/', import.meta.url));
const fixture = (name) => readFileSync(join(FIXTURES, name), 'utf8');
const PLUGINS = (name) => (/\.[cm]?ts$/.test(name) ? ['typescript'] : ['typescript', 'jsx']);
const apply = (text, change) => text.slice(0, change.start) + change.replacement + text.slice(change.end);
const lineOf = (text, offset) => text.slice(0, offset).split('\n').length;
const ORDER = ['body', 'condition', 'operator', 'literal'];

for (const name of ['sample.ts', 'sample.tsx', 'sample.js', 'sample.jsx']) {
  test(`mutants() gives ${name} exactly the changes its expected file lists`, () => {
    const text = fixture(name);
    const changes = mutants(name, text);
    assert.deepEqual(changes, JSON.parse(fixture(`${name}.expected.json`)));
    assert.ok(changes.length > 0);
    // Each change applies to give a text the parser reads again.
    for (const change of changes) {
      assert.doesNotThrow(() => parse(apply(text, change), { sourceType: 'unambiguous', plugins: PLUGINS(name) }), JSON.stringify(change));
      assert.equal(lineOf(text, change.start), change.line);
    }
    // A line marked "no change" is an import, a type or a string: nothing is changed on it.
    const marked = text.split('\n').flatMap((line, at) => (line.endsWith('// no change') ? [at + 1] : []));
    assert.ok(marked.length > 0);
    for (const change of changes) {
      assert.ok(!marked.includes(lineOf(text, change.start)) && !marked.includes(lineOf(text, change.end)), `a change on a line marked "no change": ${JSON.stringify(change)}`);
    }
    // The changes come in the order they are tried.
    const ranks = changes.map((change) => ORDER.indexOf(change.kind));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  });
}

test('an exported function and an exported constant get their changes like any other (AR-13)', () => {
  const text = fixture('sample.ts');
  const lines = text.split('\n');
  assert.ok(lines[3].startsWith('export function clamp') && lines[9].startsWith('export const ready'));
  const bodies = mutants('sample.ts', text).filter((change) => change.kind === 'body');
  assert.deepEqual(bodies.map((change) => change.line), [4, 10]);
  assert.deepEqual(bodies.map((change) => change.replacement), ['{}', 'undefined']);
});

test('mutants() makes the change each kind of the table says', () => {
  const of = (code) => mutants('a.js', code).map((change) => [change.kind, change.replacement]);
  assert.deepEqual(of('function f() { return 1 }'), [['body', '{}']]);
  assert.deepEqual(of('const f = () => g()'), [['body', 'undefined']]);
  assert.deepEqual(of('if (x) {}'), [['condition', 'true'], ['condition', 'false']]);
  assert.deepEqual(of('x = y ? 1 : 2'), [['condition', 'true'], ['condition', 'false']]);
  assert.deepEqual(of('a === b'), [['operator', '!==']]);
  assert.deepEqual(of('a !== b'), [['operator', '===']]);
  assert.deepEqual(of('a == b'), [['operator', '!=']]);
  assert.deepEqual(of('a != b'), [['operator', '==']]);
  assert.deepEqual(of('a < b'), [['operator', '<=']]);
  assert.deepEqual(of('a <= b'), [['operator', '<']]);
  assert.deepEqual(of('a > b'), [['operator', '>=']]);
  assert.deepEqual(of('a >= b'), [['operator', '>']]);
  assert.deepEqual(of('a && b'), [['operator', '||']]);
  assert.deepEqual(of('a || b'), [['operator', '&&']]);
  assert.deepEqual(of('a + b'), [['operator', '-']]);
  assert.deepEqual(of('a - b'), [['operator', '+']]);
  assert.deepEqual(of('a * b'), [['operator', '/']]);
  assert.deepEqual(of('a / b'), [['operator', '*']]);
  assert.deepEqual(of('x = true'), [['literal', 'false']]);
  assert.deepEqual(of('x = false'), [['literal', 'true']]);
  // Nothing to change: an empty body, a body that is already undefined, a condition that is already the change.
  assert.deepEqual(of('function f() {}'), []);
  assert.deepEqual(of('const f = () => undefined'), []);
});

test('mutants() finds the operator past parentheses and comments', () => {
  const text = '(a) /* c */ + (b)';
  const [change] = mutants('a.js', text);
  assert.equal(text.slice(change.start, change.end), '+');
});

test('mutants() changes nothing inside an import, a re-export, a type or a string', () => {
  for (const code of [
    "import { a } from './a'; import type { B } from './b';",
    "export * from './a'; export { a } from './b';",
    'type T = true | ((x: number) => void); interface I { f(x: number): boolean }',
    "const s = 'a === b'; const t = `x`;",
  ]) assert.deepEqual(mutants('a.ts', code), [], code);
});

test('a source the parser cannot read is unreadable with the parser\'s reason; a .svelte file is not JavaScript or TypeScript', () => {
  const broken = fixture('broken.fixture.ts');
  const reason = mutants('broken.fixture.ts', broken);
  assert.deepEqual(Object.keys(reason), ['unreadable']);
  assert.match(reason.unreadable, /Unexpected token/);
  assert.deepEqual(spans('broken.fixture.ts', broken), reason);
  assert.deepEqual(reExports('broken.fixture.ts', broken), reason);
  const NOT = { unreadable: 'not JavaScript or TypeScript' };
  const svelte = fixture('Widget.svelte');
  assert.deepEqual(mutants('Widget.svelte', svelte), NOT);
  assert.deepEqual(spans('Widget.svelte', svelte), NOT);
  assert.deepEqual(reExports('Widget.svelte', svelte), NOT);
});

test('spans() gives the lines of each test call and each expect call, and none for a hook or a helper', () => {
  assert.deepEqual(spans('tests.fixture.ts', fixture('tests.fixture.ts')), {
    tests: [{ first: 8, last: 10 }, { first: 11, last: 18 }, { first: 19, last: 25 }],
    expects: [{ first: 9, last: 9 }, { first: 12, last: 17 }, { first: 24, last: 24 }],
  });
});

test('spans() reads the modifiers and the each forms of a test call', () => {
  const tests = (code) => spans('a.js', code).tests.length;
  for (const call of ["it('x', f)", "test('x', f)", "it.only('x', f)", "it.skip('x', f)", "it.todo('x')", "test.concurrent('x', f)", "it.each([1])('x', f)", "it.each`a`('x', f)", "it.concurrent.each([1])('x', f)", "test.skip.each([1])('x', f)"]) {
    assert.equal(tests(call), 1, call);
  }
  assert.equal(tests("describe('x', () => { it('y', f) })"), 1);
  assert.equal(tests('beforeEach(f); it.each([1])'), 0);
  assert.equal(spans('a.js', 'expect(a).toBe(1)').expects.length, 1);
});

test('reExports() gives the relative paths a file re-exports from', () => {
  assert.deepEqual(reExports('index.ts', fixture('reexports.fixture.ts')), ['./a', './b']);
});
