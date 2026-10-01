#!/usr/bin/env node
// The list reader behind the exception registry, the ownership map and the sync manifest
// (ci/checks/lib/yaml-list.mjs): linear on a hostile line, and strict about a line that is not an item.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRegistry } from '../ci/checks/lib/exceptions.mjs';
import { readList, scalar } from '../ci/checks/lib/yaml-list.mjs';

const KEYS = ['id', 'expires', 'reason', 'owner'];
const ENTRY = '  - id: a\n    reason: why\n    owner: me\n    expires: 2099-01-01\n';

test('a value followed by 400,000 spaces and a character is read in under 3 seconds', () => {
  const run = ' '.repeat(400000);
  for (const src of [`exceptions:\n  - id: a\n    expires: 2099-01-01${run}x\n`, `exceptions:\n  - id: a${run}x\n`, `  - id: a\n    reason: b # c${run}x\n`]) {
    for (const strict of [false, true]) {
      const t = Date.now();
      try {
        readList(src, KEYS, { strict });
      } catch {
        // an unreadable line may throw; it must still be quick
      }
      assert.ok(Date.now() - t < 3000, `strict ${strict} took ${Date.now() - t} ms`);
    }
  }
  const t = Date.now();
  scalar(`value${run}x`);
  assert.ok(Date.now() - t < 3000, 'scalar');
});

test('a trailing comment, quotes and a lone trailing carriage return read as before', () => {
  assert.equal(scalar('a # note'), 'a');
  assert.equal(scalar('a#b'), 'a#b');
  assert.equal(scalar('"a b" # c'), 'a b');
  assert.equal(scalar('#x'), '#x');
  const [e] = readList(`exceptions:\n  - id: a # c\r\n    expires: 2099-01-01\r`, KEYS, { strict: true });
  assert.deepEqual([e.id, e.expires, e.line], ['a', '2099-01-01', 2]);
});

test('strict reads the registry every project ships: an empty list, and the entries its header describes', () => {
  assert.deepEqual(readList('# none yet\nexceptions: []\n', KEYS, { strict: true }), []);
  assert.deepEqual(readList('exceptions:\n', KEYS, { strict: true }), []);
  const [e] = readList(`# header\n#   - id: x\nexceptions:\n${ENTRY}`, KEYS, { strict: true });
  assert.deepEqual([e.id, e.reason, e.owner, e.expires, e.line], ['a', 'why', 'me', '2099-01-01', 4]);
});

test('strict throws and names the line for a mistyped first key', () => {
  assert.throws(() => readList(`exceptions:\n  - idd: a\n    expires: 2099-01-01\n`, KEYS, { strict: true }), /line 2: cannot read "- idd: a"/);
});

test('strict throws and names the line for a mistyped key after the first', () => {
  assert.throws(() => readList(`exceptions:\n${ENTRY}    expirse: 2099-01-01\n`, KEYS, { strict: true }), /line 6: cannot read "expirse: 2099-01-01"/);
});

test('strict throws and names the line for a carriage return or a line separator inside a line', () => {
  assert.throws(() => readList('exceptions:\n  - id: a\r  - id: b\n', KEYS, { strict: true }), /line 2: cannot read a line with a line break/);
  assert.throws(() => readList('exceptions:\n  - id: a     expires: 2099-01-01\n', KEYS, { strict: true }), /line 2:/);
});

test('without strict, a line it cannot read is still dropped, as it always was', () => {
  const got = readList(`exceptions:\n  - idd: a\n  - id: b\n    expirse: 1\n    expires: 2099-01-01\n`, KEYS);
  assert.deepEqual(got.map((e) => [e.id, e.expires]), [['b', '2099-01-01']]);
});

test('loadRegistry names the file and the line, and reads a missing or empty registry as no entries', () => {
  const dir = mkdtempSync(join(tmpdir(), 'yl-'));
  try {
    assert.deepEqual(loadRegistry(join(dir, 'none.yaml')), []);
    writeFileSync(join(dir, 'ok.yaml'), `exceptions:\n${ENTRY}`);
    assert.equal(loadRegistry(join(dir, 'ok.yaml'))[0].id, 'a');
    writeFileSync(join(dir, 'bad.yaml'), `exceptions:\n${ENTRY}    expirse: 2099-01-01\n`);
    assert.throws(() => loadRegistry(join(dir, 'bad.yaml')), /^Error: ci\/exceptions\.yaml: line 6: cannot read/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
