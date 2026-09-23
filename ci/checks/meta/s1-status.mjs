#!/usr/bin/env node
// S1 — status says what the repository says.
//
// `pnpm status` is the line every agent reads first, so a wrong word in it steers the whole session. S1
// runs `node ci/status.mjs <case>` against fixture roots with the clock fixed, and compares the lines
// that carry the FRAME risk states — `**Next:**` and `- Frame:` — to the text written down in each
// case's expect.json:
//
//   { "today": "yyyy-mm-dd", "next": "<text after **Next:**>", "frame": "<text after - Frame:>" }
//
//   node ci/checks/meta/s1-status.mjs <dir>    every subdirectory of <dir> is a case
//
// Findings, per case:
//   <case>#next  <case>#frame   the line differs from the expected text, or status printed none
//   <case>#expect               expect.json is missing, unreadable, lacks next or frame, or has no
//                               yyyy-mm-dd today — without a fixed clock, overran depends on the run date
//   <case>#run                  status exited non-zero
//
// Only the risk-bearing lines are compared, not the whole output: a snapshot of everything turns red
// on every wording change and gets regenerated without being read.
//
// WHY: status reports each risk as tested, scheduled or untested, and whether its evidence Window
// overran or is unreadable. Nothing checked that. Evidence parsing could be switched off entirely and
// every other gate stayed green, while status told the owner a risk was on schedule.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { report } from '../lib/report.mjs';

const dir = process.argv[2];
const status = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'status.mjs');
const UNIT = 'status fixture roots';

if (!dir || !existsSync(dir)) {
  process.exit(report({ id: 'S1', claim: '', scanned: 0, unit: UNIT, broken: `no fixture directory at ${dir ?? '(none given)'}` }));
}

// Every subdirectory is a case, so a misnamed expect.json is a finding rather than a case skipped.
const cases = readdirSync(dir)
  .sort()
  .filter((d) => statSync(join(dir, d)).isDirectory());

const LINES = [
  ['next', '**Next:** '],
  ['frame', '- Frame: '],
];

const findings = [];
for (const name of cases) {
  const root = resolve(dir, name);
  if (!existsSync(join(root, 'expect.json'))) {
    findings.push({ where: `${name}#expect`, detail: 'no expect.json' });
    continue;
  }
  let expect;
  try {
    expect = JSON.parse(readFileSync(join(root, 'expect.json'), 'utf8'));
  } catch (e) {
    findings.push({ where: `${name}#expect`, detail: `expect.json is not valid JSON: ${e.message}` });
    continue;
  }
  if (!expect || typeof expect !== 'object' || Array.isArray(expect)) {
    findings.push({ where: `${name}#expect`, detail: 'expect.json is not an object' });
    continue;
  }
  const absent = [
    ...(/^\d{4}-\d{2}-\d{2}$/.test(expect.today ?? '') ? [] : ['yyyy-mm-dd today']),
    ...LINES.map(([key]) => key).filter((k) => typeof expect[k] !== 'string'),
  ];
  if (absent.length) {
    findings.push({ where: `${name}#expect`, detail: `expect.json has no ${absent.join(', ')}` });
    continue;
  }
  const r = spawnSync(process.execPath, [status, root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: expect.today } });
  if (r.status !== 0) {
    const tail = (r.stderr || r.stdout || '').trim().split('\n').pop();
    findings.push({ where: `${name}#run`, detail: `status exited ${r.status}: ${tail}` });
    continue;
  }
  const out = r.stdout.split('\n');
  for (const [key, prefix] of LINES) {
    const got = out.find((l) => l.startsWith(prefix))?.slice(prefix.length);
    if (got === undefined) findings.push({ where: `${name}#${key}`, detail: `status printed no "${prefix.trim()}" line` });
    else if (got !== expect[key]) findings.push({ where: `${name}#${key}`, detail: `\n  expected: ${expect[key]}\n  got:      ${got}` });
  }
}

process.exit(
  report({
    id: 'S1',
    claim: `status prints the expected Next and Frame lines — the FRAME risk states — for ${cases.length} fixture roots`,
    scanned: cases.length,
    unit: UNIT,
    findings,
  })
);
