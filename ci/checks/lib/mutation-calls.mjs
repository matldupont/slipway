// The tests-can-fail step's calls to the test runner, in the copy (dev/features/tests-can-fail.md §3.4, §3.5, §3.9),
// and the messages of its exit 2. Each call is started by an absolute path inside the copy, so its command line names
// the copy's folder, and gets a fixed environment: the variables below and what ci/before-verify.sh writes to
// GITHUB_ENV, nothing else of the step's own.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { escapeControl } from './report.mjs';
import { lastLines } from './mutation-processes.mjs';
import { LISTING, readListing, readResult, RESULT, RunnerShape } from './runner-output.mjs';
import { within } from './mutation-tests.mjs';

// One runner call may take this long before it counts as hung, and never past the run's own limit.
export const CALL_LIMIT_MS = 120_000;
const KEPT = new Set(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TERM', 'CI']);

// The environment of every runner call: the variables above and LC_*, from the step's own, then the lines of GITHUB_ENV.
export function runnerEnv(githubEnv = '') {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => KEPT.has(k) || k.startsWith('LC_')));
  for (const line of githubEnv.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.replace(/\r$/, ''));
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export class Stop extends Error {}
export const esc = escapeControl;

const inside = (folder, path) => {
  const rel = relative(folder, path);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};

// The argument list of a call read by runnerCall(), with absolute paths inside the copy.
export function argvOf(copy, pkg, call) {
  const pkgDir = join(copy, pkg.dir);
  if (call.runner === 'vitest') return [process.execPath, join(pkgDir, 'node_modules/vitest/vitest.mjs')];
  const path = resolve(pkgDir, call.path);
  if (!inside(copy, path)) throw new Stop(`\`${esc(pkg.name)}\`'s call names a vitest.mjs outside the project: ${esc(call.path)}.`);
  return [process.execPath, ...call.flags, path];
}

export function vitestVersion(copy, pkg) {
  try {
    return JSON.parse(readFileSync(join(copy, pkg.dir, 'node_modules/vitest/package.json'), 'utf8')).version ?? null;
  } catch {
    return null;
  }
}

const parsed = (text, from) => {
  try {
    return JSON.parse(text.slice(Math.max(0, text.indexOf(from))));
  } catch {
    return undefined;
  }
};

/**
 * A call's listing (§3.5): each test's file (inside the repository), name and line.
 * @returns {Promise<Array<{ file: string, name: string, line: number }>>}
 */
export async function listTests(ctx, unit) {
  const out = join(ctx.dir, 'listing.json');
  const log = join(ctx.dir, 'listing.log');
  const r = await ctx.groups.run([...unit.argv, 'list', '--json', '--includeTaskLocation', ...unit.call.args], { cwd: join(ctx.copy, unit.pkg.dir), env: ctx.env, log, out, limitMs: ctx.callLimit() });
  ctx.checkpoint(r);
  const value = parsed(readFileSync(out, 'utf8'), '[');
  try {
    if (value === undefined) throw new RunnerShape(`The test runner did not ${LISTING}. This step was written for Vitest 4 and 5; ${esc(unit.pkg.name)} has ${esc(unit.version)}.`);
    return readListing(value, esc(unit.pkg.name), esc(unit.version)).map((t) => ({ ...t, file: relative(ctx.copy, t.file).split(sep).join('/') }));
  } catch (e) {
    if (e instanceof RunnerShape) throw new Stop(`${e.message}\n${esc(lastLines(log))}`);
    throw e;
  }
}

/**
 * One run of one test file (§3.8, §3.9). `hung` when the call passed its limit; `none` when it wrote no result.
 * @returns {Promise<{ hung: boolean, none: boolean, loaded: boolean, tests: Array<{ name: string, status: string, failureMessages: string[] }>, log: string }>}
 */
export async function runFile(ctx, unit) {
  const out = join(ctx.dir, 'result.json');
  const log = join(ctx.dir, 'run.log');
  rmSync(out, { force: true });
  const argv = [...unit.argv, 'run', within(unit.pkg, unit.file), '--reporter=json', `--outputFile=${out}`, ...unit.call.args];
  const r = await ctx.groups.run(argv, { cwd: join(ctx.copy, unit.pkg.dir), env: ctx.env, log, limitMs: ctx.callLimit() });
  ctx.checkpoint(r);
  if (r.timedOut) return { hung: true, none: false, loaded: false, tests: [], log };
  const value = existsSync(out) ? parsed(readFileSync(out, 'utf8'), '{') : undefined;
  if (value === undefined) return { hung: false, none: true, loaded: false, tests: [], log };
  let files;
  try {
    files = readResult(value, esc(unit.pkg.name), esc(unit.version));
  } catch (e) {
    if (e instanceof RunnerShape) throw new Stop(e.message);
    throw e;
  }
  const mine = files.filter((f) => f.file === join(ctx.copy, unit.file));
  return { hung: false, none: false, loaded: mine.length > 0 && mine.every((f) => f.loaded), tests: mine.flatMap((f) => f.tests), log };
}

// §3.8: red twice in a clean copy. Every new test red, or a connection error, names ci/before-verify.sh's services first (AR-1).
export function redMessage(unit, name, { everyRed, connection }) {
  const red = `\`${esc(unit.file)}\` › "${esc(name)}" is red in a clean copy of this commit, before anything is changed. If it passes in your checkout, it needs a file that git does not track and \`ci/before-verify.sh\` does not make, or a service that script starts and that did not come up. Make it pass there, then run \`pnpm tests-can-fail\` again.`;
  if (!everyRed && !connection) return red;
  const why = connection ? 'a test failed on a connection error' : 'every new test is red in a clean copy of this commit';
  return `A service \`ci/before-verify.sh\` starts may not be up, or one from an earlier run may still hold its port: ${why}. Check those services first. ${red}`;
}

// §3.4: the script failed. A port in use is named as a service from an earlier run (AR-1 of the 0.5 review).
export function setupMessage(lines) {
  if (/EADDRINUSE|address already in use/i.test(lines)) {
    return `\`ci/before-verify.sh\` failed because a port it needs is in use: a service from an earlier run may still be running. Stop it (\`lsof -i :<port>\` names it; the port is in the lines below), then run \`pnpm tests-can-fail\` again.\n${esc(lines)}`;
  }
  return `\`ci/before-verify.sh\` failed in the copy of this commit:\n${esc(lines)}`;
}

export const leftMessage = (n) =>
  `${n} processes this check started were still running and were stopped. Run \`pnpm tests-can-fail\` again; if it says this again, a test starts a process that leaves its group.`;
