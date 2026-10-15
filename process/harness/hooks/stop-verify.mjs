// Stop hook body. Blocks the end of a turn while `node ci/verify.mjs --fast` is red.
//
// - Once per stop: when Claude Code reports stop_hook_active (the agent already got one
//   red result this stop), let it end — it must then say plainly what is failing.
// - Before an app exists (verify: "no workspace packages") there is nothing to prove, and
//   the hook stays quiet so planning sessions are not nagged.
// - A tree already verified green is not re-verified: the fingerprint of HEAD, the diff and
//   untracked files is cached in .git/stop-verify-ok.
// - A tree verified red is not re-verified while it is unchanged (#484): the fingerprint, the time and the failure
//   lines go to .git/stop-verify-red, and the hook blocks at once with those lines. It still blocks: a red turn does
//   not end silently. The cache expires after RED_TTL_MS, so a load-sensitive failure is run again, not held.
// - Anything that stops the gate from running (no pnpm) is reported, never swallowed (L-34).
// - A package that declares dependencies but has no node_modules (a fresh worktree) blocks
//   with the install command, not the raw `tsc: command not found` it would produce. It is
//   checked before the cache, and never counts as green.
// - Fails closed: any error the hook throws blocks the turn with one plain line naming its class, never a crash
//   that Claude Code would read as a non-blocking error (a red tree ending unblocked).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, constants, existsSync, fstatSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const say = (o) => process.stdout.write(JSON.stringify(o) + '\n');
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
if (input?.stop_hook_active) process.exit(0);

try {
  await main();
} catch (e) {
  // The class only: an error's message can quote a file it read.
  const kind = /^[A-Z][A-Z0-9_]{1,40}$/.test(e?.code ?? '') ? e.code : /^[A-Za-z]{1,40}$/.test(e?.name ?? '') ? e.name : 'unknown error';
  say({ decision: 'block', reason: `stop-verify could not run: ${kind}; the tree was not checked. Run pnpm verify:fast yourself and report its result.` });
}

async function main() {
const { discoverWorkspace } = await import('../../../ci/checks/lib/workspace.mjs');

function notInstalled() {
  let ws;
  try { ws = discoverWorkspace(root); } catch { return []; } // verify reports a broken workspace itself
  if (ws.packages.length === 0) return []; // no app yet: stay quiet, as below
  return [ws.root, ...ws.packages].filter((p) => {
    const pkg = JSON.parse(readFileSync(join(root, p.dir, 'package.json'), 'utf8'));
    const deps = ['dependencies', 'devDependencies', 'optionalDependencies'].some((k) => Object.keys(pkg[k] ?? {}).length);
    return deps && !existsSync(join(root, p.dir, 'node_modules'));
  }).map((p) => p.dir);
}
const missing = notInstalled();
if (missing.length) {
  say({
    decision: 'block',
    reason: `stop-verify: dependencies are not installed — no node_modules in ${missing.join(', ')} (a fresh worktree?), so \`pnpm verify:fast\` cannot run.\n\nRun \`pnpm install --frozen-lockfile\`, then let the gate run again. If you cannot install this turn, say so plainly: the gate did not run.`,
  });
  process.exit(0);
}

const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
function fingerprint() {
  const head = git('rev-parse', 'HEAD');
  if (head.status !== 0) return null;
  const h = createHash('sha256').update(head.stdout).update(git('diff', 'HEAD').stdout ?? '');
  for (const f of (git('ls-files', '-o', '--exclude-standard').stdout ?? '').split('\n').filter(Boolean)) {
    try { h.update(f).update(readFileSync(join(root, f))); } catch { h.update(f); }
  }
  return h.digest('hex');
}
const gitDir = git('rev-parse', '--absolute-git-dir').stdout?.trim();
const cache = gitDir ? join(gitDir, 'stop-verify-ok') : null;
const redCache = gitDir ? join(gitDir, 'stop-verify-red') : null;
const RED_TTL_MS = 10 * 60 * 1000;
const RED_MAX_BYTES = 64 * 1024;
const fp = fingerprint();
if (fp && cache && existsSync(cache) && readFileSync(cache, 'utf8') === fp) process.exit(0);

const redReason = (status, tail, note = '') =>
  `stop-verify: \`pnpm verify:fast\` is red (exit ${status}).${note}\n${tail}\n\nFix it before finishing. If it is out of scope for this turn, say exactly what is failing and why.`;
// The one reader of the red cache: a file anyone with the git dir can write. It hands on plain checked fields or null,
// and null runs verify. Only a regular file (no link followed), under RED_MAX_BYTES, that is JSON of exactly the shape
// the hook writes is used; nothing of a rejected file is printed.
function readRed() {
  let fd;
  try {
    fd = openSync(redCache, constants.O_RDONLY | constants.O_NOFOLLOW);
    const st = fstatSync(fd);
    if (!st.isFile() || st.size > RED_MAX_BYTES) return null;
    const v = JSON.parse(readFileSync(fd, 'utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const keys = Object.keys(v).sort().join(',');
    if (keys !== 'at,fp,status,tail') return null;
    if (typeof v.fp !== 'string' || !/^[0-9a-f]{64}$/.test(v.fp)) return null;
    if (!Number.isSafeInteger(v.at) || v.at < 0 || v.at > Date.now()) return null;
    if (!Number.isSafeInteger(v.status) || v.status < 1 || v.status > 255) return null;
    if (typeof v.tail !== 'string' || v.tail.length > RED_MAX_BYTES) return null;
    return { fp: v.fp, at: v.at, status: v.status, tail: v.tail };
  } catch {
    return null; // none, a link, unreadable or not JSON
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch { /* closed */ }
  }
}
const red = fp && redCache ? readRed() : null;
const age = red ? Date.now() - red.at : NaN;
// No process.exit after a block: exit cuts a pipe write off at 64 KB, and a cut JSON is no block at all.
if (red?.fp === fp && age >= 0 && age < RED_TTL_MS) {
  const when = new Date(red.at).toISOString().slice(11, 19);
  say({ decision: 'block', reason: redReason(red.status, red.tail, ` Cached from ${when} UTC: the tree has not changed since, so verify did not run again. Any change to the tree, or ${RED_TTL_MS / 60000} minutes, runs it again.`) });
} else {
  verifyNow();
}

function verifyNow() {
  if (spawnSync('pnpm', ['-v']).error) {
    say({ systemMessage: 'stop-verify: pnpm is not on the hook PATH, so the gate did not run. Run pnpm verify:fast yourself.' });
    return;
  }
  const r = spawnSync(process.execPath, [join(root, 'ci', 'verify.mjs'), '--fast', root], { cwd: root, encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.status === 2 && /no workspace packages/.test(out)) return;
  if (r.status === 0) {
    if (fp && cache) writeFileSync(cache, fp);
    try { if (redCache) rmSync(redCache, { force: true }); } catch { /* a path it cannot remove: the fingerprint no longer matches it */ }
    return;
  }
  const tail = out.trim().split('\n').slice(-30).join('\n');
  // A cache that cannot be written must never cost the block. Removed first, so a link there is not followed and the
  // new file is 0600; one too big for the reader is not written.
  try {
    const body = JSON.stringify({ fp, at: Date.now(), status: r.status, tail });
    if (fp && redCache && Number.isSafeInteger(r.status) && Buffer.byteLength(body) <= RED_MAX_BYTES) {
      rmSync(redCache, { force: true });
      writeFileSync(redCache, body, { mode: 0o600, flag: 'wx' });
    }
  } catch { /* run again next stop */ }
  say({ decision: 'block', reason: redReason(r.status, tail) });
}
}
