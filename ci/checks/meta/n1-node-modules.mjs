#!/usr/bin/env node
// N1 — nothing under node_modules/ is tracked.
//
// Reports `tracked/<path>` for every path `git ls-files` lists under the given directory that has a
// `node_modules` segment, at any depth, and `lookalike/<path>` for one whose segment only reads as
// node_modules in canonical form (gate-files.mjs `canonical`).
//
// WHY: `pnpm run` puts the repository's own node_modules/.bin first on PATH, whether or not anything was
// installed. .gitignore keeps node_modules/ out of an ordinary commit, but a pull request can still add a file
// there, and a program found there runs in place of the tool a gate command calls, in CI too (#133).
//
// One mode only: it asks git what the directory tracks, using the git manifest.mjs trusts (found outside the
// repository, GIT_* dropped). No checkout, or a git that cannot answer, is BROKEN, never a pass. PC1 builds a
// throwaway repository for its known-bad fixture; this check never reads a list of paths from a file.

import { canonical } from '../lib/gate-files.mjs';
import { trustedGit } from '../lib/manifest.mjs';
import { escapeControl, report } from '../lib/report.mjs';

const dir = process.argv[2] ?? '.';

let broken = null;
let paths = [];
try {
  paths = trustedGit(dir, ['ls-files', '-z']).split('\0').filter(Boolean);
} catch (e) {
  broken = `git cannot list what ${dir} tracks (${String(e.message).split('\n')[0]}), so nothing under node_modules/ can be ruled out`;
}

// A segment spelled node_modules is tracked; one that only reads as node_modules in canonical form
// (`Node_Modules`, a long-s `node_moduleſ`) is refused as a lookalike: a Mac opens it as node_modules/.
const findings = paths.flatMap((p) => {
  const segs = p.split('/');
  if (segs.includes('node_modules')) {
    return [{ where: `tracked/${escapeControl(p)}`, detail: 'git tracks a file under node_modules/; a program there can run in place of a gate tool — remove it from the index (git rm --cached)' }];
  }
  if (segs.some((s) => canonical(s) === 'node_modules')) {
    return [{ where: `lookalike/${escapeControl(p)}`, detail: "looks like node_modules but isn't spelled that way; a case-insensitive disk opens it as node_modules/ — remove it" }];
  }
  return [];
});

process.exit(
  report({
    id: 'N1',
    claim: 'git tracks no file under any node_modules/ folder, or a folder a case-insensitive disk would open as one',
    scanned: paths.length,
    unit: 'tracked files',
    findings,
    broken,
  })
);
