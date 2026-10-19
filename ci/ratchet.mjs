#!/usr/bin/env node
// ratchet — a code-health number may go down, never up.
//
// Existing debt is not a reason to block work; new debt is. A ratchet compares one number
// from a tool's JSON report with the baseline committed in ci/baselines.json:
//
//   higher than the baseline   exit 1 — this change added debt
//   equal                      exit 0
//   lower                      exit 0, and says to tighten: `--update` writes the new value, so
//                              the improvement is locked in and cannot quietly regress
//   no baseline yet            exit 2 BROKEN — run once with `--update` to record one
//
//   node ci/ratchet.mjs <name> <report.json> <dot.path.to.number> [--update]
//
// Example, as a root script CI runs (W1 fails a `check:*` script no workflow invokes):
//   "check:duplication": "jscpd apps packages --reporters json --output .jscpd --silent &&
//                         node ci/ratchet.mjs duplication .jscpd/jscpd-report.json statistics.total.duplicatedLines"
//
// A number that cannot be read — missing report, wrong path, not a number — is BROKEN, never
// green: a ratchet that reads nothing would pass forever (the vacuous-green class).

import { existsSync, readFileSync } from 'node:fs';
import { BASELINES, compare, mayRecord, readBaselines, writeBaselines } from './checks/lib/ratchet.mjs';
import { report } from './checks/lib/report.mjs';

const args = process.argv.slice(2);
const update = args.includes('--update');
const [name, reportPath, path] = args.filter((a) => !a.startsWith('--'));
const baselinePath = BASELINES;
const UNIT = 'metric';
const broken = (why) => process.exit(report({ id: 'RATCHET', claim: '', scanned: 0, unit: UNIT, broken: why }));

if (!name || !reportPath || !path) broken('usage: ratchet <name> <report.json> <dot.path> [--update]');
if (!existsSync(reportPath)) broken(`${reportPath} does not exist — did the tool run?`);
let value;
try {
  value = path.split('.').reduce((o, k) => o?.[k], JSON.parse(readFileSync(reportPath, 'utf8')));
} catch {
  broken(`${reportPath} is not JSON`); // never the parser's message: it quotes the file
}
if (typeof value !== 'number' || !Number.isFinite(value)) broken(`${path} in ${reportPath} is ${JSON.stringify(value)}, not a number`);

// The rule and the file's one reader and writer are shared with the Fit count (checks/lib/ratchet.mjs).
let baselines;
try {
  baselines = readBaselines();
} catch (e) {
  broken(e.message);
}
const base = baselines[name];

if (update) {
  if (!mayRecord(value, base)) {
    process.exit(report({ id: 'RATCHET', claim: '', scanned: 1, unit: UNIT, findings: [{ where: name, detail: `--update refuses to raise the baseline (${base} → ${value}); raising it is a decision — edit ci/baselines.json in a reviewed PR` }] }));
  }
  baselines[name] = value;
  writeBaselines('.', baselines);
  process.exit(report({ id: 'RATCHET', claim: `${name} baseline recorded at ${value}`, scanned: 1, unit: UNIT }));
}
const outcome = compare(value, base);
if (outcome === 'none') broken(`no baseline for "${name}" in ${baselinePath} — run once with --update`);

const findings = outcome === 'above' ? [{ where: name, detail: `${value} is above the baseline ${base}: this change added ${value - base}` }] : [];
if (outcome === 'below') process.stdout.write(`RATCHET: ${name} improved ${base} → ${value}; run with --update to lock it in\n`);
process.exit(report({ id: 'RATCHET', claim: `${name} is ${value}, not above its baseline ${base}`, scanned: 1, unit: UNIT, findings }));
