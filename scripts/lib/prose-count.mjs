// A project's own prose count (F-16 §10, #549), taken by new-project and sync. They count only with Vale at the version
// CI pins, so the number they record is the one CI measures; with any other Vale, or none, they write nothing and print
// the one command, whose number CI's prose job gives. Zero dependencies (D-004).

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { recordCommand } from '../../ci/prose.mjs';

// The workflow that pins Vale; scripts/prose.test.mjs keeps pr-body.yml's pin equal to it.
export const CI_WORKFLOW = '.github/workflows/ci.yml';

// The Vale version a workflow's text pins, or null.
export const valePin = (text) => /VALE_VERSION: (\d+\.\d+\.\d+)\b/.exec(text ?? '')?.[1] ?? null;

// PATH without its node_modules folders: under `pnpm run`, a project's node_modules/.bin comes first, and a program there
// must not stand in for `vale` (#133).
const cleanEnv = (env) => ({ ...env, PATH: (env.PATH ?? '').split(delimiter).filter((d) => d && !d.split(/[\\/]/).includes('node_modules')).join(delimiter) });

// Whether `vale` on the path is the pinned version: `{ ok, why }`, where `why` says in the owner's words why no count is
// taken. With no pin there is no prose job to count for, and `why` is null: nothing to say.
export function valeAtPin(pin, env = process.env) {
  if (!pin) return { ok: false, why: null };
  const r = spawnSync('vale', ['--version'], { encoding: 'utf8', env: cleanEnv(env) });
  if (r.error || r.status !== 0) return { ok: false, why: 'Vale is not installed here' };
  const version = /^vale version (\S+)\s*$/.exec(r.stdout)?.[1];
  return version === pin ? { ok: true } : { ok: false, why: `Vale here is ${version ?? 'a version it does not name'}, not the ${pin} CI pins` };
}

// The warnings Vale finds in `files` ([path, bytes]), read by `prose` (a ci/prose.mjs) with that copy's rules. Throws
// when the check cannot run.
export function countWarnings(prose, files, env = process.env) {
  const dir = mkdtempSync(join(tmpdir(), 'prose-count-'));
  try {
    for (const [p, bytes] of files) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), bytes);
    }
    const r = spawnSync(process.execPath, [prose, '--dir', dir], { encoding: 'utf8', env: cleanEnv(env), maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 && r.status !== 1) throw new Error(`the prose check could not run (exit ${r.status})`);
    return JSON.parse(r.stdout).alerts.filter((a) => a.severity !== 'error').length;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// What the owner reads when no count was taken: why, and the one command, with CI's number.
export const notRecorded = (why) => `no prose count was recorded: ${why}. CI's prose job measures it and prints the one command to record it, ${recordCommand('<n>')}, to run in a reviewed PR and list under Gate changes.`;
