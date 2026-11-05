// Every process the tests-can-fail step starts, and how it is stopped (dev/features/tests-can-fail.md §1, #439). Each
// call starts in a process group of its own; a group is stopped by SIGTERM, a bounded wait, then SIGKILL; and before
// the record is returned, no process of this user whose command line names the copy's folder is alive. The check fails
// closed: pgrep's exit 1 is "none", any other answer, or no pgrep, is a check that could not run.

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, openSync, readFileSync } from 'node:fs';
import { trustedEnv } from './manifest.mjs';

// How long a group has between SIGTERM and SIGKILL.
export const STOP_WAIT_MS = 2000;

const alive = (pgid) => {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
};
const signalGroup = (pgid, signal) => {
  try {
    process.kill(-pgid, signal);
  } catch {
    /* gone already */
  }
};
const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export class Groups {
  constructor() {
    this.live = new Set();
  }

  /**
   * Runs `argv` in a group of its own, its output written to `log` (a file, never a pipe a service it leaves running
   * would hold), or its standard output to `out` and the rest to `log`. Resolves when it exits, or when `limitMs` passes and its group is stopped. `keep` leaves the group
   * alive after it exits, for ci/before-verify.sh's services; every other group is stopped as soon as its call ends.
   * @returns {Promise<{ status: number | null, signal: string | null, timedOut: boolean, error: Error | null }>}
   */
  run(argv, { cwd, env, log, out = log, limitMs, keep = false }) {
    const errFd = openSync(log, 'w');
    const outFd = out === log ? errFd : openSync(out, 'w');
    let child;
    try {
      child = spawn(argv[0], argv.slice(1), { cwd, env, detached: true, stdio: ['ignore', outFd, errFd] });
    } finally {
      closeSync(errFd);
      if (outFd !== errFd) closeSync(outFd);
    }
    const pgid = child.pid;
    if (pgid) this.live.add(pgid);
    this.current = pgid;
    return new Promise((resolve) => {
      let timedOut = false;
      let kill = null;
      const timer = limitMs === undefined ? null : setTimeout(() => {
        timedOut = true;
        signalGroup(pgid, 'SIGTERM');
        kill = setTimeout(() => signalGroup(pgid, 'SIGKILL'), STOP_WAIT_MS);
        kill.unref();
      }, Math.max(1, limitMs));
      const end = async (status, signal, error) => {
        if (timer) clearTimeout(timer);
        // A group that ended within the wait needs no SIGKILL, and its pgid may already be another group's.
        if (kill) clearTimeout(kill);
        if (this.current === pgid) this.current = null;
        if (pgid && !keep) await this.stop(pgid);
        resolve({ status, signal, timedOut, error });
      };
      child.once('error', (error) => end(null, null, error));
      child.once('exit', (status, signal) => end(status, signal, null));
    });
  }

  // SIGTERM to the group, a bounded wait, then SIGKILL.
  async stop(pgid) {
    signalGroup(pgid, 'SIGTERM');
    for (let waited = 0; waited < STOP_WAIT_MS && alive(pgid); waited += 50) await pause(50);
    if (alive(pgid)) signalGroup(pgid, 'SIGKILL');
    this.live.delete(pgid);
  }

  async stopAll() {
    await Promise.all([...this.live].map((pgid) => this.stop(pgid)));
  }
}

// pgrep reads its pattern as a regular expression: the folder's path is escaped, so a `+` or `(` from TMPDIR is a
// character and not an operator.
export const escapeRegExp = (text) => text.replace(/[\\^$.*+?()[\]{}|/-]/g, '\\$&');

/**
 * The pids of this user's processes whose command line names `folder`, or null when pgrep cannot say. `top` is the
 * checkout the step runs in, whose folders are kept off pgrep's PATH.
 * @returns {number[] | null}
 */
export function namingFolder(folder, top = null) {
  // pgrep is looked up on a PATH with no entry in the repository or under node_modules: under `pnpm tests-can-fail`
  // node_modules/.bin comes first, and a dependency's own `pgrep` there could answer "none" for it.
  let env;
  try {
    env = trustedEnv(top);
  } catch {
    return null;
  }
  const r = spawnSync('pgrep', ['-U', String(process.getuid()), '-f', escapeRegExp(folder)], { encoding: 'utf8', env });
  if (r.error || r.signal) return null;
  if (r.status === 1) return [];
  if (r.status !== 0) return null;
  return r.stdout.split('\n').filter(Boolean).map(Number).filter((pid) => pid !== process.pid);
}

// Kills each pid by SIGKILL; the ones already gone are no matter.
export function killPids(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone already */
    }
  }
}

// The last lines of a call's log, for an exit 2 that quotes them.
export function lastLines(log, n = 12) {
  try {
    return readFileSync(log, 'utf8').trimEnd().split('\n').slice(-n).join('\n');
  } catch {
    return '';
  }
}
