#!/usr/bin/env node
// LK1 — the lockfile resolves every package from the registry, with an integrity hash.
//
// Reads pnpm-lock.yaml at the given directory and reports `pnpm-lock.yaml#<entry>` for every package that
// resolves any other way: a git repository, a tarball URL, `link:` or `file:` (lib/pnpm-lock.mjs says what
// passes). An entry ci/exceptions.yaml excuses, with that id, a reason, an owner and a date, is exempted;
// an entry that excuses nothing, has no reason or date, or has expired is a finding of its own.
//
// WHY: `pnpm install --frozen-lockfile` checks that the lockfile matches package.json, not where each
// package comes from. A pull request can change the lockfile to fetch a git repository or a tarball, or to
// link a folder it adds, and the install runs that package's scripts, in CI too (#138). Registry releases
// are checked by hash; this check makes "from the registry, with a hash" the only unexcused answer. Which
// registry packages a project may use, and their contents, are out of its scope.
//
// It reads the file, never a checkout's history, so it can run before pnpm does anything: CI runs it with
// the runner's node before `pnpm install`, as N1 runs before pnpm (#133). Nothing it cannot read is a pass:
// a lockfile outside the subset the parser takes, a version other than 9.0, a link in its place, or a
// project that declares dependencies and has no lockfile is BROKEN. A project that declares none, and has
// no lockfile, has nothing to resolve: that passes, counting the package.json files it read.
//
// `pnpm.overrides`, `.pnpmfile.cjs` hooks and `patchedDependencies` change what a name means, or a
// package's files, without changing where it resolves from; they are not read here.

import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { today as localToday } from '../lib/clock.mjs';
import { loadRegistry } from '../lib/exceptions.mjs';
import { checkLockfile, ID_PREFIX, KINDS, LOCKFILE, parseLockfile } from '../lib/pnpm-lock.mjs';
import { report } from '../lib/report.mjs';
import { discoverWorkspace } from '../lib/workspace.mjs';

const root = process.argv[2] ?? '.';
const UNIT = 'lockfile entries';
const CLAIM =
  'every package the lockfile lists resolves from the registry with an integrity hash, is a workspace package, or is excused by a dated entry in ci/exceptions.yaml keyed to it, and no such entry is stale, expired, undated or without a reason';
const stop = (broken) => process.exit(report({ id: 'LK1', claim: CLAIM, scanned: 0, unit: UNIT, broken }));
const lstatOrNull = (p) => {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
};

let ws;
try {
  ws = discoverWorkspace(root);
} catch (e) {
  stop(`cannot read the workspace (${e.message}), so it is unknown how many packages the project asks for`);
}
const manifests = 1 + ws.packages.length;
const declared = ws.root.dependencies + ws.packages.reduce((n, p) => n + p.dependencies, 0);

const path = join(root, LOCKFILE);
let entries = 0;
let problems = [];
const st = lstatOrNull(path);
if (st) {
  if (!st.isFile()) stop(`${LOCKFILE} is not a regular file (a link or folder), so what it lists cannot be read from here`);
  try {
    const workspaceDirs = new Set(['.', ...ws.packages.map((p) => p.dir.split('\\').join('/'))]);
    ({ entries, problems } = checkLockfile(parseLockfile(readFileSync(path, 'utf8')), workspaceDirs));
  } catch (e) {
    stop(e.message);
  }
  if (entries === 0 && declared > 0) stop(`package.json files ask for ${declared} package(s) and ${LOCKFILE} lists none, so nothing was examined`);
} else if (declared > 0) {
  stop(`package.json files ask for ${declared} package(s) and there is no ${LOCKFILE}: \`pnpm install --frozen-lockfile\` has nothing to install from`);
}

const findings = [];
const exempted = [];
const today = localToday(root);
const ids = new Set(problems.map((p) => `${ID_PREFIX}${p.id}`));
const live = new Set();
for (const e of loadRegistry(join(root, 'ci', 'exceptions.yaml'))) {
  if (!e.id.startsWith(ID_PREFIX)) continue;
  const where = `registry:${e.id}`;
  if (!e.expires) findings.push({ where, detail: 'the entry in ci/exceptions.yaml has no expires: date — every excuse must end' });
  else if (!e.reason) findings.push({ where, detail: 'the entry in ci/exceptions.yaml has no reason: — say why this package may come from outside the registry' });
  else if (e.expires <= today) findings.push({ where, detail: `the entry in ci/exceptions.yaml expired ${e.expires} — move the package to the registry, or extend the date with a reason` });
  else if (!ids.has(e.id)) findings.push({ where, detail: `the entry in ci/exceptions.yaml matches no entry of ${LOCKFILE} — remove it` });
  else live.add(e.id);
}
for (const p of problems) {
  const id = `${ID_PREFIX}${p.id}`;
  if (live.has(id)) {
    exempted.push(id);
    continue;
  }
  findings.push({
    where: id,
    detail: `${KINDS[p.kind]}, not from the registry with an integrity hash — publish it to the registry, or add a dated entry with id: ${id}, a reason and an owner to ci/exceptions.yaml`,
  });
}

// With nothing declared and no lockfile the package.json files are what was read.
const nothingToResolve = entries === 0;
process.exit(
  report({
    id: 'LK1',
    claim: nothingToResolve ? `no package.json declares a package and there is no ${LOCKFILE}, so nothing resolves from anywhere but the registry` : CLAIM,
    scanned: nothingToResolve ? manifests : entries,
    unit: nothingToResolve ? 'package.json files' : UNIT,
    findings,
    exempted,
    exemptedBy: 'ci/exceptions.yaml',
  })
);
