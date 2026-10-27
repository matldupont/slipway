// A project's own prose count (F-16 §10, #549), taken by new-project and sync. They count only with Vale at the version
// CI pins, so the number they record is the one CI measures; with any other Vale, or none, they write nothing and print
// the one command, whose number CI's prose job gives. Zero dependencies (D-004).

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { trustedEnvAt } from '../../ci/checks/lib/manifest.mjs';
import { recordCommand, VALE_PIN } from '../../ci/prose.mjs';

// The workflow that pins Vale (ci/prose.mjs, VALE_PIN).
export const CI_WORKFLOW = VALE_PIN.path;

// The Vale version a workflow's text pins, or null.
export const valePin = (text) => new RegExp(`${VALE_PIN.key}: (\\d+\\.\\d+\\.\\d+)\\b`).exec(text ?? '')?.[1] ?? null;

// Vale is found as git and gh are (lib/manifest.mjs): on PATH's absolute entries outside the checkout that holds `root`
// and outside any node_modules, from a folder outside it, so no program a project holds can stand in for it (#133). For
// new-project, `root` is not a checkout yet: it holds only slipway's own files, and the checkout above it, if any, is left
// out. null when no such entry is left.
const valeEnv = (root) => {
  try {
    return trustedEnvAt(root);
  } catch {
    return null;
  }
};

// Whether `vale` on the path is the pinned version: `{ ok, why }`, where `why` says in the owner's words why no count is
// taken. With no pin there is no prose job to count for, and `why` is null: nothing to say. `root` is the project's folder.
export function valeAtPin(pin, root) {
  if (!pin) return { ok: false, why: null };
  const env = valeEnv(root);
  if (!env) return { ok: false, why: 'Vale is not installed here' };
  const r = spawnSync('vale', ['--version'], { cwd: tmpdir(), encoding: 'utf8', env });
  if (r.error || r.status !== 0) return { ok: false, why: 'Vale is not installed here' };
  const version = /^vale version (\S+)\s*$/.exec(r.stdout)?.[1];
  return version === pin ? { ok: true } : { ok: false, why: `Vale here is ${version ?? 'a version it does not name'}, not the ${pin} CI pins` };
}

// The warnings Vale finds in `files` ([path, bytes]), read by `prose` (a ci/prose.mjs) with that copy's rules, with Vale
// found as valeAtPin finds it for the project at `root`. Throws when the check cannot run.
export function countWarnings(prose, files, root) {
  const env = valeEnv(root);
  if (!env) throw new Error('no PATH entry outside the project to find Vale on');
  const dir = mkdtempSync(join(tmpdir(), 'prose-count-'));
  try {
    for (const [p, bytes] of files) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), bytes);
    }
    const r = spawnSync(process.execPath, [prose, '--dir', dir], { cwd: tmpdir(), encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 && r.status !== 1) throw new Error(`the prose check could not run (exit ${r.status})`);
    return JSON.parse(r.stdout).alerts.filter((a) => a.severity !== 'error').length;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// What the owner reads when no count was taken: why, and the one command, with CI's number.
export const notRecorded = (why) => `no prose count was recorded: ${why}. CI's prose job measures it and prints the one command to record it, ${recordCommand('<n>')}, to run in a reviewed PR and list under Gate changes.`;
