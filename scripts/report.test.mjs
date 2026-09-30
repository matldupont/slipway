#!/usr/bin/env node
// The shared escaper (ci/checks/lib/report.mjs): every check prints through report(), and status through the
// same escapeOutput, so project text reaches a CI log or a session's context with no control, bidi or
// separator character raw. A lone CR is tested here, not in a known-bad fixture: a shipped file never carries a
// CR byte (new-project.test.mjs). Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { escapeControl, escapeOutput } from '../ci/checks/lib/report.mjs';

const REPORT = pathToFileURL(join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'ci', 'checks', 'lib', 'report.mjs')).href;
const u = (c) => `\\u${c.toString(16).padStart(4, '0')}`;

// Each range at both ends, and the separators.
const ESCAPED = [0x00, 0x08, 0x0b, 0x0d, 0x1b, 0x1f, 0x7f, 0x80, 0x85, 0x9f, 0x2028, 0x2029, 0x202a, 0x202e, 0x2066, 0x2069];
// Just outside each range, and ordinary text beyond ASCII.
const KEPT = [0x20, 0x7e, 0xa0, 0xe9, 0x2027, 0x202f, 0x2065, 0x206a, 0x200d, 0x1f600];

test('escapeOutput shows each control, bidi and separator character as \\uXXXX', () => {
  for (const c of ESCAPED) assert.equal(escapeOutput(`a${String.fromCharCode(c)}b`), `a${u(c)}b`, `U+${c.toString(16)}`);
});

test('a lone CR and a CRLF are both escaped: no line is rewritten from its start', () => {
  assert.equal(escapeOutput('RISK-1\r#risk/no-threshold'), 'RISK-1\\u000d#risk/no-threshold');
  assert.equal(escapeOutput('a\r\nb'), 'a\\u000d\nb');
});

test('escapeOutput keeps the newlines and tabs a report writes, and text outside the ranges', () => {
  assert.equal(escapeOutput('K1: a\n\tb'), 'K1: a\n\tb');
  for (const c of KEPT) assert.equal(escapeOutput(`a${String.fromCodePoint(c)}b`), `a${String.fromCodePoint(c)}b`, `U+${c.toString(16)}`);
});

test('escapeControl, for one quoted field, also escapes newline and tab', () => {
  assert.equal(escapeControl('a\nb\tc\rd\u202ee'), 'a\\u000ab\\u0009c\\u000dd\\u202ee');
});

test('report() prints a finding with a lone CR, an ESC and an override escaped, and its @@json line still parses back', () => {
  const where = '\u001b[31mX\rY#risk/no-threshold';
  const detail = 'Result "a\u202eb\u2028c"';
  const src = `import { report } from ${JSON.stringify(REPORT)}; process.exit(report({ id: 'T1', claim: 'c', scanned: 1, unit: 'u', findings: [{ where: ${JSON.stringify(where)}, detail: ${JSON.stringify(detail)} }] }));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', src], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
  assert.equal(r.status, 1, r.stderr);
  assert.doesNotMatch(r.stdout, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
  assert.match(r.stdout, /^T1: \\u001b\[31mX\\u000dY#risk\/no-threshold: Result "a\\u202eb\\u2028c"$/m);
  const json = JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice('@@json '.length));
  assert.deepEqual(json.findings, [{ where, detail }]);
});
