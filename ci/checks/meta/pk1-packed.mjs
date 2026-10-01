#!/usr/bin/env node
// PK1 — packed. Slipway only: this file is `internal` in dev/ownership.yaml and never ships.
//
// A project takes slipway through `npx github:…`, so what arrives is what npm packs, less what the ownership
// map withholds. Reports:
//   unpacked/<path>   a path the map ships to projects (lib/ownership.mjs) that `npm pack` leaves out: npm never
//                     packs `.npmrc`, `*.orig`, `.DS_Store` and a few more, whatever the package says
//   withheld/<path>   a file of a known-bad case whose expected.json ships, while the file itself is `internal`:
//                     the case arrives in the project with a hole
//
// WHY: either way a project receives a fixture, or a check, without one of its files, and PC1 there fails or
// passes for a reason nobody wrote. #198 added nine fixtures each holding an `.npmrc`, which npm does not pack and
// the map withholds; slipway's own `pnpm meta` stayed green, because its checkout had the files, and every
// project's went red on its next sync (#207).
//
// It asks npm, never a copy of npm's rules: `npm pack --dry-run --json --ignore-scripts`, which writes nothing,
// runs no script of the package and reaches no network. No npm, a non-zero exit or output that is not the list
// it prints is BROKEN, never a pass.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { classify, loadOwnership, MAP, shippedPaths } from '../lib/ownership.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const UNIT = 'paths slipway ships to projects';
const CLAIM = `every path ${MAP} ships to a project is in what npm packs, and every file of a known-bad case that ships is shipped with it`;
// npm never packs a .gitignore; new-project writes the project's instead of copying one (scripts/lib/install.mjs
// gitignoreText), so the root one is expected to be missing from the pack.
const WRITTEN_NOT_COPIED = ['.gitignore'];
const KNOWN_BAD = 'ci/fixtures/known-bad/';
const stop = (broken) => process.exit(report({ id: 'PK1', claim: CLAIM, scanned: 0, unit: UNIT, broken }));

// The paths npm would pack from `root`. Without a package.json of its own npm packs the nearest one above.
function packed() {
  if (!existsSync(join(root, 'package.json'))) stop('there is no package.json here, so npm has nothing to pack');
  const r = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) stop(`npm pack could not start (${r.error.code ?? r.error.message}), so what a project receives is unknown`);
  if (r.status !== 0) stop(`npm pack exited ${r.status}, so what a project receives is unknown`);
  let files;
  try {
    files = JSON.parse(r.stdout)[0].files.map((f) => f.path);
  } catch {
    files = null;
  }
  if (!Array.isArray(files) || files.length === 0 || files.some((f) => typeof f !== 'string')) stop('npm pack printed no list of files, so what a project receives is unknown');
  return new Set(files);
}

let rules;
let all;
try {
  rules = loadOwnership(root);
  all = shippedPaths(root, rules);
} catch (e) {
  stop(e.message);
}
const ships = (p) => classify(rules, p) !== 'internal';
const shipped = all.filter((p) => ships(p) && !WRITTEN_NOT_COPIED.includes(p));
const inPack = packed();

const findings = [];
for (const p of shipped) {
  if (!inPack.has(p)) findings.push({ where: `unpacked/${p}`, detail: 'ships to projects, and npm leaves it out of the package they install from — rename it (PC1 can place a fixture file under another name: `files` in expected.json)' });
}
// PC1's cases: known-bad/<check>/expected.json, or known-bad/<check>/<case>/expected.json.
const caseOf = (p) => {
  const [check, sub] = p.slice(KNOWN_BAD.length).split('/');
  return [`${KNOWN_BAD}${check}`, `${KNOWN_BAD}${check}/${sub}`].find((dir) => p.startsWith(`${dir}/`) && all.includes(`${dir}/expected.json`) && ships(`${dir}/expected.json`));
};
for (const p of all) {
  if (!p.startsWith(KNOWN_BAD) || ships(p)) continue;
  const dir = caseOf(p);
  if (dir) findings.push({ where: `withheld/${p}`, detail: `is internal in ${MAP}, and the case it belongs to (${dir}) ships without it — rename it, or make the whole case internal` });
}

process.exit(report({ id: 'PK1', claim: CLAIM, scanned: shipped.length, unit: UNIT, findings }));
