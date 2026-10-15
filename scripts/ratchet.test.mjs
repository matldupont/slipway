#!/usr/bin/env node
// The ratchet (ci/ratchet.mjs), through the command: its four outcomes and its --update refusal, by exit code and
// message, and the bytes it writes. Written against the command before its rule moved into
// ci/checks/lib/ratchet.mjs (F-12, dev/features/feature-fit.md), so the move is held to change none of them.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINES = join('ci', 'baselines.json');

// A folder holding a tool's report with `value` at `stats.total`, and ci/baselines.json when `baselines` is given
// (an object is written as the command writes it; a string as it is).
function ratchet(value, baselines, ...flags) {
  const dir = mkdtempSync(join(tmpdir(), 'ratchet-'));
  try {
    writeFileSync(join(dir, 'report.json'), JSON.stringify({ stats: { total: value } }));
    mkdirSync(join(dir, 'ci')); // a project always has the folder: the command writes into it
    if (baselines !== undefined) {
      writeFileSync(join(dir, BASELINES), typeof baselines === 'string' ? baselines : `${JSON.stringify(baselines, null, 2)}\n`);
    }
    const r = spawnSync(process.execPath, [join(SRC, 'ci', 'ratchet.mjs'), 'dup', 'report.json', 'stats.total', ...flags], { cwd: dir, encoding: 'utf8' });
    return { status: r.status, out: r.stdout, err: r.stderr, file: existsSync(join(dir, BASELINES)) ? readFileSync(join(dir, BASELINES), 'utf8') : null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const lines = (out) => out.trimEnd().split('\n');

test('above the baseline: exit 1, naming both numbers and what was added, and nothing is written', () => {
  const r = ratchet(5, { dup: 3 });
  assert.equal(r.status, 1);
  assert.deepEqual(lines(r.out), ['RATCHET: scanned 1 metric', 'RATCHET: dup: 5 is above the baseline 3: this change added 2', 'RATCHET: FAIL — 1 finding(s) across 1 metric']);
  assert.equal(r.file, '{\n  "dup": 3\n}\n');
});

test('equal to the baseline: exit 0, and the claim names the number and its baseline', () => {
  const r = ratchet(3, { dup: 3 });
  assert.equal(r.status, 0);
  assert.deepEqual(lines(r.out), ['RATCHET: scanned 1 metric', 'RATCHET: PASS — green proves: dup is 3, not above its baseline 3']);
});

test('below the baseline: exit 0 with the line that says to lock it in, and nothing is written until --update', () => {
  const r = ratchet(2, { dup: 3 });
  assert.equal(r.status, 0);
  assert.deepEqual(lines(r.out), ['RATCHET: dup improved 3 → 2; run with --update to lock it in', 'RATCHET: scanned 1 metric', 'RATCHET: PASS — green proves: dup is 2, not above its baseline 3']);
  assert.equal(r.file, '{\n  "dup": 3\n}\n');
});

test('no baseline: exit 2 BROKEN, naming --update — with no file, and with a file that holds other names only', () => {
  for (const baselines of [undefined, { other: 1 }]) {
    const r = ratchet(4, baselines);
    assert.equal(r.status, 2);
    assert.deepEqual(lines(r.out), ['RATCHET: scanned 0 metric', 'RATCHET: BROKEN — no baseline for "dup" in ci/baselines.json — run once with --update']);
  }
  assert.equal(ratchet(4).file, null, 'a run without --update created the file');
});

test('--update refuses to raise a baseline: exit 1, naming both numbers, and the file is as it was', () => {
  const r = ratchet(5, { dup: 3 }, '--update');
  assert.equal(r.status, 1);
  assert.deepEqual(lines(r.out), [
    'RATCHET: scanned 1 metric',
    'RATCHET: dup: --update refuses to raise the baseline (3 → 5); raising it is a decision — edit ci/baselines.json in a reviewed PR',
    'RATCHET: FAIL — 1 finding(s) across 1 metric',
  ]);
  assert.equal(r.file, '{\n  "dup": 3\n}\n');
});

test('--update records a first baseline, lowers one and keeps one that is equal: two-space JSON, a final newline, every other name kept', () => {
  const first = ratchet(4, undefined, '--update');
  assert.equal(first.status, 0);
  assert.deepEqual(lines(first.out), ['RATCHET: scanned 1 metric', 'RATCHET: PASS — green proves: dup baseline recorded at 4']);
  assert.equal(first.file, '{\n  "dup": 4\n}\n');

  const lower = ratchet(2, { other: 7, dup: 3 }, '--update');
  assert.equal(lower.status, 0);
  assert.equal(lower.file, '{\n  "other": 7,\n  "dup": 2\n}\n');

  assert.equal(ratchet(3, { dup: 3 }, '--update').file, '{\n  "dup": 3\n}\n');
  assert.equal(ratchet(1, { other: 7 }, '--update').file, '{\n  "other": 7,\n  "dup": 1\n}\n', 'a name the file lacks is added after the ones it has');
});

test('a number that cannot be read is BROKEN, never green: a missing report, a path that holds no number', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ratchet-'));
  try {
    const run = (...args) => spawnSync(process.execPath, [join(SRC, 'ci', 'ratchet.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
    const missing = run('dup', 'report.json', 'stats.total');
    assert.deepEqual([missing.status, lines(missing.stdout)[1]], [2, 'RATCHET: BROKEN — report.json does not exist — did the tool run?']);
    writeFileSync(join(dir, 'report.json'), '{"stats":{}}');
    const absent = run('dup', 'report.json', 'stats.total');
    assert.deepEqual([absent.status, lines(absent.stdout)[1]], [2, 'RATCHET: BROKEN — stats.total in report.json is undefined, not a number']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Node 23 and 24's JSON.parse reads a one-character escaped name as `\` once the process has parsed an object with a
// `\` name at that place; this file does both. Rewriting it would replace the name and lose its entry (#430).
const MISREAD = `${JSON.stringify({ a: { o: 1, '\\': 2 }, b: { o: 1, '\n': 3 } }, null, 2)}\n`;
const misreads = !('\n' in JSON.parse(MISREAD).b);
const REFUSED = /ci\/baselines\.json holds an entry a rewrite would lose or change \(a name given twice, a name or number Node v\d+\.\d+\.\d+ does not read as written, or bytes that are not UTF-8\); nothing was written — fix the entry by hand/;
test('--update refuses a baselines file whose names this Node misreads, and writes nothing', { skip: misreads ? false : `JSON.parse on Node ${process.version} reads these names right` }, () => {
  const r = ratchet(1, MISREAD, '--update');
  assert.equal(r.status, 1);
  assert.match(r.err, REFUSED);
  assert.equal(r.file, MISREAD);
});

test('--update refuses a baselines file that gives a name twice, and writes nothing', () => {
  const twice = '{\n  "dup": 3,\n  "dup": 4\n}\n';
  const r = ratchet(1, twice, '--update');
  assert.equal(r.status, 1);
  assert.match(r.err, REFUSED);
  assert.equal(r.file, twice);
});

test('namesIn reads every name as written, at any depth, and no string that is a value', async () => {
  const { namesIn } = await import('../ci/checks/lib/ratchet.mjs');
  assert.deepEqual(namesIn(MISREAD), ['a', 'o', '\\', 'b', 'o', '\n']);
  assert.deepEqual(namesIn('{"k": "v:", "q\\"": ["x", {"in" : 1}], "e": "\\\\"}'), ['k', 'q"', 'in', 'e']);
});

// #430, round 1 of its review: an entry other than a name is lost or changed by a rewrite too.
test('--update refuses a baselines file holding a number JSON does not write back as read, and writes nothing', () => {
  for (const text of ['{\n  "dup": 3,\n  "huge": 1e400\n}\n', '{\n  "dup": 3,\n  "big": 9007199254740993\n}\n', '{\n  "dup": 3,\n  "big": [12345678901234567890]\n}\n']) {
    const r = ratchet(1, text, '--update');
    assert.equal(r.status, 1, JSON.stringify(text));
    assert.match(r.err, REFUSED);
    assert.equal(r.file, text);
  }
});

test('--update keeps a file of arrays and nested objects whose entries it can write back: no refusal', () => {
  const r = ratchet(1, { dup: 3, list: [1, { inner: 2 }], nested: { a: { b: 9007199254740991 } } }, '--update');
  assert.equal(r.status, 0, r.err);
  assert.deepEqual(JSON.parse(r.file), { dup: 1, list: [1, { inner: 2 }], nested: { a: { b: 9007199254740991 } } });
});

// A folder with a report and ci/, the baselines made by `make`, and the command run with --update.
function updateIn(make) {
  const dir = mkdtempSync(join(tmpdir(), 'ratchet-'));
  try {
    writeFileSync(join(dir, 'report.json'), JSON.stringify({ stats: { total: 1 } }));
    mkdirSync(join(dir, 'ci'));
    make(dir);
    const r = spawnSync(process.execPath, [join(SRC, 'ci', 'ratchet.mjs'), 'dup', 'report.json', 'stats.total', '--update'], { cwd: dir, encoding: 'utf8' });
    return { status: r.status, err: r.stderr, bytes: readFileSync(join(dir, BASELINES)), elsewhere: existsSync(join(dir, 'elsewhere.json')) ? readFileSync(join(dir, 'elsewhere.json'), 'utf8') : null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('--update refuses a baselines file whose bytes are not UTF-8, and writes nothing', () => {
  const bytes = Buffer.concat([Buffer.from('{\n  "dup": 3,\n  "caf'), Buffer.from([0xff]), Buffer.from('": 1\n}\n')]);
  const r = updateIn((dir) => writeFileSync(join(dir, BASELINES), bytes));
  assert.equal(r.status, 1);
  assert.match(r.err, REFUSED);
  assert.ok(r.bytes.equals(bytes));
});

test('--update refuses a ci/baselines.json that is a link, and writes nothing through it', () => {
  const r = updateIn((dir) => {
    writeFileSync(join(dir, 'elsewhere.json'), '{"dup":3}');
    symlinkSync(join(dir, 'elsewhere.json'), join(dir, BASELINES));
  });
  assert.equal(r.status, 1);
  assert.match(r.err, /ci\/baselines\.json is a link or not a plain file, so it is not rewritten; nothing was written — make it a plain file/);
  assert.equal(r.elsewhere, '{"dup":3}');
});
