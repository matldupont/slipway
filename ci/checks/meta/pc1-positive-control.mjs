#!/usr/bin/env node
// PC1 — the positive-control harness. The keystone check.
//
// Runs every registered check against its known-bad fixture and asserts it goes red
// FOR EXACTLY THE EXPECTED REASONS: expected.json names the exit code, every finding
// id, every exempted id and every warning id. A BROKEN case (exit 2) may also name the
// start of its `broken` message, so an unrelated failure cannot satisfy it. A fixture is either one case (expected.json
// at its top) or several (each subdirectory with its own expected.json).
//
// v1 asserted only "exit code is 1". That cannot tell a precise check from one that
// flags everything: a check regressed to matching every line still goes red on its
// fixture and still passes. Comparing sets closes that.
//
// Why a harness exists at all: a declared-but-not-installed gate — a hook manager
// configured and never installed, a blocking hook wired to no settings file, a hook
// framework with events and no rules — is indistinguishable from a working gate until
// someone goes looking.
//
// A fixture reaches the check it starts through two fields only. `env` may set the names in FIXTURE_ENV and no
// other: a fixture that asks for NODE_OPTIONS or PATH is a finding, and its check is not started. `tracked`
// lists paths PC1 writes, one inert line each, into a throwaway git repository (git add -f), and the check runs
// on that repository instead of the fixture folder: how N1's fixture has git track a file under node_modules/
// without slipway or a project ever committing one.
//
// `node pc1-positive-control.mjs <fixtures root>` reads another root, and runs only the checks with a folder
// there: slipway's own test of these two fields (scripts/pc1.test.mjs).

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trustedGit } from '../lib/manifest.mjs';
import { rawCharacters } from '../lib/raw-output.mjs';
import { escapeControl, EXIT, report } from '../lib/report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ownRoot = process.argv[2] === undefined;
const fixturesRoot = ownRoot ? resolve(here, '..', '..', 'fixtures', 'known-bad') : resolve(process.argv[2]);

// The only environment a fixture may set: the dates the clock checks read, and W1's template-fixture switch
// (it lifts the top-of-checkout condition only; slipway's root commit is still required).
const FIXTURE_ENV = ['CHECK_TODAY', 'CHECK_NOW', 'SLIPWAY_TEMPLATE_FIXTURE'];
const INERT = 'inert placeholder written by PC1 for a known-bad fixture\n';
// A tracked path is relative, stays inside the repository, and names no part of .git.
const safePath = (p) =>
  typeof p === 'string' && p !== '' && !/[\u0000-\u001f\u007f\\:]/.test(p) && !p.startsWith('/') && p.split('/').every((s) => s !== '' && s !== '.' && s !== '..' && s.toLowerCase() !== '.git');

const checks = readdirSync(here)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('pc1-'))
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
  const env = expected.env ?? {};
  const refused = typeof env === 'object' && !Array.isArray(env) ? Object.keys(env).filter((k) => !FIXTURE_ENV.includes(k) || typeof env[k] !== 'string') : ['(env is not an object)'];
  if (refused.length) {
    findings.push({ where: name, detail: `expected.json sets ${refused.map((k) => escapeControl(k)).join(', ')}; a fixture may set only ${FIXTURE_ENV.join(', ')} (as text), so the check was not started` });
    return;
  }
  let target = dir;
  let scratch = null;
  if (expected.tracked !== undefined) {
    const bad = Array.isArray(expected.tracked) && expected.tracked.length ? expected.tracked.filter((p) => !safePath(p)) : ['(tracked is not a list of paths)'];
    if (bad.length) {
      findings.push({ where: name, detail: `expected.json tracks ${bad.map((p) => JSON.stringify(escapeControl(String(p)))).join(', ')}; each tracked path is relative and stays inside the repository` });
      return;
    }
    try {
      scratch = mkdtempSync(join(tmpdir(), 'pc1-tracked-'));
      trustedGit(scratch, ['init', '-q'], scratch);
      for (const p of expected.tracked) {
        mkdirSync(dirname(join(scratch, p)), { recursive: true });
        writeFileSync(join(scratch, p), INERT, { mode: 0o644 });
      }
      trustedGit(scratch, ['add', '-f', '--', ...expected.tracked]);
      target = scratch;
    } catch (e) {
      if (scratch) rmSync(scratch, { recursive: true, force: true });
      findings.push({ where: name, detail: `could not build the throwaway repository its tracked paths need: ${String(e.message).split('\n')[0]}` });
      return;
    }
  }
  const r = spawnSync(process.execPath, [check.file, target], {
    encoding: 'utf8',
    env: { ...process.env, ...env, CHECK_JSON: '1' },
  });
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('@@json '));
  if (!line) {
    const tail = (r.stderr || r.stdout || '').trim().split('\n').pop();
    findings.push({ where: name, detail: `check emitted no @@json report (exit ${r.status}): ${tail}` });
    return;
  }
  printedRaw(name, r);
  const got = JSON.parse(line.slice('@@json '.length));
  if (got.exit === EXIT.GREEN) {
    findings.push({ where: name, detail: 'PASSED its known-bad fixture — the check cannot fail, so its green means nothing' });
    return;
  }
  if (got.exit !== expected.exit) {
    findings.push({ where: name, detail: `exit ${got.exit} on its fixture, expected ${expected.exit}${got.broken ? ` (${got.broken})` : ''}` });
    return;
  }
  if (expected.broken !== undefined && !(got.broken ?? '').startsWith(expected.broken)) {
    findings.push({
      where: name,
      detail: `BROKEN for the wrong reason — expected a message starting ${JSON.stringify(expected.broken)}, got ${JSON.stringify(got.broken ?? '')}`,
    });
    return;
  }
  const f = setDiff(expected.findings ?? [], got.findings.map((x) => x.where));
  const x = setDiff(expected.exempted ?? [], got.exempted ?? []);
  const w = setDiff(expected.warnings ?? [], (got.warnings ?? []).map((x) => x.where));
  const wrong = [];
  if (f.missing.length) wrong.push(`missed ${JSON.stringify(f.missing)}`);
  if (f.unexpected.length) wrong.push(`flagged unexpected ${JSON.stringify(f.unexpected)}`);
  if (x.missing.length || x.unexpected.length) {
    wrong.push(`exemptions differ: missing ${JSON.stringify(x.missing)}, unexpected ${JSON.stringify(x.unexpected)}`);
  }
  if (w.missing.length || w.unexpected.length) {
    wrong.push(`warnings differ: missing ${JSON.stringify(w.missing)}, unexpected ${JSON.stringify(w.unexpected)}`);
  }
  if (wrong.length) findings.push({ where: name, detail: `red for the wrong reasons — ${wrong.join('; ')}` });
}

// A check prints project text, so a fixture may hold control, bidi and separator characters: none may reach
// the output raw, where a CI log or the next agent's context would act on it.
function printedRaw(name, r) {
  const raw = rawCharacters(r.stdout, r.stderr);
  if (raw) findings.push({ where: name, detail: `printed ${raw} raw: escape it where the check prints (report() does)` });
}

for (const c of checks) {
  const fixture = join(fixturesRoot, c.id);
  if (!existsSync(fixture)) {
    if (!ownRoot) continue;
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
    id: 'PC1',
    claim: `every check goes red on its known-bad fixtures (${caseCount} cases) for exactly the expected reasons`,
    scanned: checks.length,
    unit: 'checks',
    findings,
  })
);
