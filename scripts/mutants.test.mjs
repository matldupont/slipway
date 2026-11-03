#!/usr/bin/env node
// The parser under the tests-can-fail step (dev/features/tests-can-fail.md §2, D-037, #630): the vendored
// @babel/parser is the release its record says it is, unedited, and the pin fails on a file one byte away. The
// file is hashed, never run: ci/checks/lib/mutants.mjs is to be the only file that imports it.
// Build step 2 adds the tests of what ci/checks/lib/mutants.mjs reads with it.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  for (const said of [PARSER, LICENCE, '| Version | 8.0.7,', 'parser-8.0.7.tgz', 'not taken']) assert.ok(section.includes(said), said);
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
