#!/usr/bin/env node
// M6 — the positive-control harness. The keystone check.
//
// Runs every registered check against its known-bad fixture and asserts it goes red
// FOR EXACTLY THE EXPECTED REASONS: expected.json names the exit code, every finding
// id, and every exempted id. A fixture is either one case (expected.json at its top)
// or several (each subdirectory with its own expected.json).
//
// v1 asserted only "exit code is 1". That cannot tell a precise check from one that
// flags everything: a check regressed to matching every line still goes red on its
// fixture and still passes. Comparing sets closes that.
//
// Why a harness exists at all: a declared-but-not-installed gate — a hook manager
// configured and never installed, a blocking hook wired to no settings file, a hook
// framework with events and no rules — is indistinguishable from a working gate until
// someone goes looking.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXIT, report } from '../lib/report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = resolve(here, '..', '..', 'fixtures', 'known-bad');

const checks = readdirSync(here)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('m6-'))
  .sort()
  .map((f) => ({ file: join(here, f), id: f.split('-')[0] }));

const setDiff = (want, got) => ({
  missing: want.filter((x) => !got.includes(x)),
  unexpected: got.filter((x) => !want.includes(x)),
});

const findings = [];
let caseCount = 0;

function runCase(check, name, dir) {
  let expected;
  try {
    expected = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8'));
  } catch (e) {
    findings.push({ where: name, detail: `expected.json is not valid JSON: ${e.message}` });
    return;
  }
  const r = spawnSync(process.execPath, [check.file, dir], {
    encoding: 'utf8',
    env: { ...process.env, ...(expected.env ?? {}), CHECK_JSON: '1' },
  });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@json '));
  if (!line) {
    const tail = (r.stderr || r.stdout || '').trim().split('\n').pop();
    findings.push({ where: name, detail: `check emitted no @@json report (exit ${r.status}): ${tail}` });
    return;
  }
  const got = JSON.parse(line.slice('@@json '.length));
  if (got.exit === EXIT.GREEN) {
    findings.push({ where: name, detail: 'PASSED its known-bad fixture — the check cannot fail, so its green means nothing' });
    return;
  }
  if (got.exit !== expected.exit) {
    findings.push({ where: name, detail: `exit ${got.exit} on its fixture, expected ${expected.exit}${got.broken ? ` (${got.broken})` : ''}` });
    return;
  }
  const f = setDiff(expected.findings ?? [], got.findings.map((x) => x.where));
  const x = setDiff(expected.exempted ?? [], got.exempted ?? []);
  const wrong = [];
  if (f.missing.length) wrong.push(`missed ${JSON.stringify(f.missing)}`);
  if (f.unexpected.length) wrong.push(`flagged unexpected ${JSON.stringify(f.unexpected)}`);
  if (x.missing.length || x.unexpected.length) {
    wrong.push(`exemptions differ: missing ${JSON.stringify(x.missing)}, unexpected ${JSON.stringify(x.unexpected)}`);
  }
  if (wrong.length) findings.push({ where: name, detail: `red for the wrong reasons — ${wrong.join('; ')}` });
}

for (const c of checks) {
  const fixture = join(fixturesRoot, c.id);
  if (!existsSync(fixture)) {
    findings.push({ where: c.id, detail: `no known-bad fixture at ci/fixtures/known-bad/${c.id}` });
    continue;
  }
  const cases = existsSync(join(fixture, 'expected.json'))
    ? [{ name: c.id, dir: fixture }]
    : readdirSync(fixture)
        .sort()
        .map((d) => ({ name: `${c.id}/${d}`, dir: join(fixture, d) }))
        .filter((k) => statSync(k.dir).isDirectory() && existsSync(join(k.dir, 'expected.json')));
  if (cases.length === 0) {
    findings.push({ where: c.id, detail: 'fixture has no expected.json — "red for some reason" is not a control' });
    continue;
  }
  for (const k of cases) {
    caseCount++;
    runCase(c, k.name, k.dir);
  }
}

process.exit(
  report({
    id: 'M6',
    claim: `every registered check goes red on its fixtures (${caseCount} cases) for exactly the expected reasons`,
    scanned: checks.length,
    unit: 'registered checks',
    findings,
  })
);
