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
// `details` in expected.json maps a finding id to text its detail must contain: two causes can give one id (LK1
// fails a tarball with or without a registry file), and only the detail says which (#207).
//
// A fixture reaches the check it starts through these fields only. `env` may set the names in FIXTURE_ENV and no
// other: a fixture that asks for NODE_OPTIONS or PATH is a finding, and its check is not started. `tracked`
// lists paths PC1 writes, one inert line each, into a throwaway git repository (git add -f), and the check runs
// on that repository instead of the fixture folder: how N1's fixture has git track a file under node_modules/
// without slipway or a project ever committing one. `files` maps a name the check reads to a file of the fixture
// (`{ ".npmrc": "npmrc" }`): PC1 copies the case into a throwaway folder, moves each file to that name there, and the
// check runs on the copy. A fixture file may not itself be named for a file npm leaves out of a packed package
// (`.npmrc`, `*.orig`, …) or one the ownership map withholds: it would not reach a project, and the case would pass
// or fail there for another reason (#207). PK1 (pk1-packed.mjs, slipway only) fails on either.
//
// `node pc1-positive-control.mjs <fixtures root>` reads another root, and runs only the checks with a folder
// there: slipway's own test of these two fields (scripts/pc1.test.mjs).

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { trustedGit } from '../lib/manifest.mjs';
import { rawCharacters, strayLine } from '../lib/raw-output.mjs';
import { EXIT, report } from '../lib/report.mjs';

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
    findings.push({ where: name, detail: `expected.json sets ${refused.join(', ')}; a fixture may set only ${FIXTURE_ENV.join(', ')} (as text), so the check was not started` });
    return;
  }
  // `details` pins why: the text each named finding's detail must contain. A key that is not an expected finding
  // would never be compared, so it is refused rather than read as a pass.
  const details = expected.details ?? {};
  const strayDetails = details !== null && typeof details === 'object' && !Array.isArray(details)
    ? Object.keys(details).filter((k) => !(expected.findings ?? []).includes(k) || typeof details[k] !== 'string' || details[k] === '')
    : ['(details is not a map of finding ids to text)'];
  if (strayDetails.length) {
    findings.push({ where: name, detail: `expected.json details names ${strayDetails.map((k) => JSON.stringify(k)).join(', ')}; each key is one of its expected findings and each value is text, so the check was not started` });
    return;
  }
  let target = dir;
  let scratch = null;
  if (expected.files !== undefined) {
    const map = expected.files;
    const entries = map !== null && typeof map === 'object' && !Array.isArray(map) ? Object.entries(map) : [];
    const isFile = (p) => lstatSync(join(dir, p), { throwIfNoEntry: false })?.isFile() === true;
    const bad = entries.length ? entries.filter(([to, from]) => !safePath(to) || !safePath(from) || !isFile(from)) : [['(files is not a map of names to fixture files)', '']];
    if (bad.length || expected.tracked !== undefined) {
      const what = bad.length ? `places ${bad.map(([to, from]) => `${JSON.stringify(String(from))} at ${JSON.stringify(to)}`).join(', ')}; each side is a relative path inside the case, and the file placed is a regular file of the fixture` : 'sets both files and tracked; a case takes one';
      findings.push({ where: name, detail: `expected.json ${what}, so the check was not started` });
      return;
    }
    try {
      scratch = mkdtempSync(join(tmpdir(), 'pc1-files-'));
      cpSync(dir, scratch, { recursive: true, verbatimSymlinks: true });
      // A folder of the fixture may be a link: neither side of a move may resolve outside the copy.
      const top = realpathSync.native(scratch);
      const inside = (p) => {
        const real = realpathSync.native(dirname(join(scratch, p)));
        if (real !== top && !real.startsWith(top + sep)) throw new Error(`${JSON.stringify(p)} resolves outside the case's copy`);
      };
      for (const [to, from] of entries) {
        inside(from);
        mkdirSync(dirname(join(scratch, to)), { recursive: true });
        inside(to);
        renameSync(join(scratch, from), join(scratch, to));
      }
      target = scratch;
    } catch (e) {
      if (scratch) rmSync(scratch, { recursive: true, force: true });
      findings.push({ where: name, detail: `could not build the throwaway folder its files need: ${String(e.message).split('\n')[0]}` });
      return;
    }
  }
  if (expected.tracked !== undefined) {
    const bad = Array.isArray(expected.tracked) && expected.tracked.length ? expected.tracked.filter((p) => !safePath(p)) : ['(tracked is not a list of paths)'];
    if (bad.length) {
      findings.push({ where: name, detail: `expected.json tracks ${bad.map((p) => JSON.stringify(String(p))).join(', ')}; each tracked path is relative and stays inside the repository` });
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
  // report() writes its @@json line last, so a line a project's text forged earlier is never the one read.
  const line = (r.stdout ?? '').split('\n').findLast((l) => l.startsWith('@@json '));
  if (!line) {
    const tail = (r.stderr || r.stdout || '').trim().split('\n').pop();
    findings.push({ where: name, detail: `check emitted no @@json report (exit ${r.status}): ${tail}` });
    return;
  }
  printedRaw(check, name, r);
  let got;
  try {
    got = JSON.parse(line.slice('@@json '.length));
  } catch (e) {
    findings.push({ where: name, detail: `its @@json report does not parse: ${e.message}` });
    return;
  }
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
  if (wrong.length) {
    findings.push({ where: name, detail: `red for the wrong reasons — ${wrong.join('; ')}` });
    return;
  }
  const off = Object.keys(details).filter((k) => !got.findings.some((x) => x.where === k && String(x.detail).includes(details[k])));
  if (off.length) findings.push({ where: name, detail: `failed, but not for the reason its fixture names — the detail of ${JSON.stringify(off)} does not contain the text expected.json details gives` });
}

// A check prints project text, so a fixture may hold control, bidi, format and separator characters, and an
// error message may hold a line break: none may reach the output raw, where a CI log or the next agent's
// context would act on it, and every line is one report() wrote.
function printedRaw(check, name, r) {
  const raw = rawCharacters(r.stdout, r.stderr);
  if (raw) findings.push({ where: name, detail: `printed ${raw} raw: escape it where the check prints (report() does)` });
  const stray = strayLine(r.stdout, check.id.toUpperCase());
  if (stray !== null) findings.push({ where: name, detail: `printed a line report() did not write: "${stray.slice(0, 60)}"` });
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
