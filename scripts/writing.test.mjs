#!/usr/bin/env node
// The writing standard (process/writing.md, F-16 §1): it exists, is one page, holds eight numbered rules each with a
// before/after pair that names a file, and the two files that tell a reader to follow it say so. Internal: `pnpm meta`
// runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(SRC, p), 'utf8');
const RULES = /^(\d)\. \*\*/;

test('process/writing.md exists and is under 600 words', () => {
  assert.ok(existsSync(join(SRC, 'process/writing.md')));
  const words = read('process/writing.md').split(/\s+/).filter(Boolean).length;
  assert.ok(words < 600, `${words} words`);
});

test('it holds eight numbered rules, in order, each with a Pair: that names a file', () => {
  const lines = read('process/writing.md').split('\n');
  const starts = lines.flatMap((l, i) => (RULES.test(l) ? [{ n: Number(l.match(RULES)[1]), i }] : []));
  assert.deepEqual(starts.map((s) => s.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  starts.forEach((s, k) => {
    const body = lines.slice(s.i, k + 1 < starts.length ? starts[k + 1].i : undefined).join('\n');
    assert.match(body, /\bPair:/, `rule ${s.n} has no Pair:`);
    const pair = body.slice(body.indexOf('Pair:'));
    const path = [...pair.matchAll(/`([^`\s]+\.(?:mjs|md|json|yml|yaml))`/g)].map((m) => m[1]).find((p) => existsSync(join(SRC, p)));
    assert.ok(path, `rule ${s.n}'s Pair: names no file that exists`);
  });
});

test("the eight rules carry the Contract's titles, in the Contract's order", () => {
  const titles = read('process/writing.md').split('\n').flatMap((l) => (RULES.test(l) ? [l.match(/^\d\. \*\*(.+?)\.\*\*/)?.[1]] : []));
  assert.deepEqual(titles, ['Action first', "The project's words", 'One idea per sentence', 'Something concrete behind every claim', 'Say what was not done or checked', "Keep the owner's words", 'Length matches the need', 'Subjects and titles']);
});

// F-16 §1: rule 7's pair carries no count, since a count in an example goes stale and nothing holds it. Each phrase it
// quotes is still in SLIPWAY.md, so a reworded row fails here.
test("rule 7's pair carries no count, and quotes SLIPWAY.md as it reads", () => {
  const lines = read('process/writing.md').split('\n');
  const at = lines.findIndex((l) => l.startsWith('7. **'));
  const next = lines.findIndex((l, i) => i > at && RULES.test(l));
  const pair = lines.slice(at, next).join(' ').split('Pair:')[1];
  assert.ok(pair, 'rule 7 has no Pair:');
  assert.doesNotMatch(pair, /\d/, `rule 7's pair holds a count: ${pair}`);
  const quoted = [...pair.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/\.$/, ''));
  assert.equal(quoted.length, 2, `rule 7's pair quotes ${quoted.length} phrases`);
  for (const q of quoted) assert.ok(read('SLIPWAY.md').includes(q), `SLIPWAY.md no longer says "${q}"`);
});

test('process/intake.md and process/slipway-rules.md each point to it', () => {
  assert.ok(read('process/intake.md').includes('The form follows `process/writing.md`.'));
  assert.ok(read('process/slipway-rules.md').includes("What a person reads follows `process/writing.md`: action first, the project's words, one idea per sentence."));
});
