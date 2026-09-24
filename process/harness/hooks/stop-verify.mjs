// Stop hook body. Blocks the end of a turn while `node ci/verify.mjs --fast` is red.
//
// - Once per stop: when Claude Code reports stop_hook_active (the agent already got one
//   red result this stop), let it end — it must then say plainly what is failing.
// - Before an app exists (verify: "no workspace packages") there is nothing to prove, and
//   the hook stays quiet so planning sessions are not nagged.
// - A tree already verified green is not re-verified: the fingerprint of HEAD, the diff and
//   untracked files is cached in .git/stop-verify-ok.
// - Anything that stops the gate from running (no pnpm) is reported, never swallowed (L-34).
// - A package that declares dependencies but has no node_modules (a fresh worktree) blocks
//   with the install command, not the raw `tsc: command not found` it would produce. It is
//   checked before the cache, and never counts as green.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverWorkspace } from '../../../ci/checks/lib/workspace.mjs';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const say = (o) => process.stdout.write(JSON.stringify(o) + '\n');
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
if (input.stop_hook_active) process.exit(0);

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
const fp = fingerprint();
if (fp && cache && existsSync(cache) && readFileSync(cache, 'utf8') === fp) process.exit(0);

if (spawnSync('pnpm', ['-v']).error) {
  say({ systemMessage: 'stop-verify: pnpm is not on the hook PATH, so the gate did not run. Run pnpm verify:fast yourself.' });
  process.exit(0);
}

const r = spawnSync(process.execPath, [join(root, 'ci', 'verify.mjs'), '--fast', root], { cwd: root, encoding: 'utf8' });
const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
if (r.status === 2 && /no workspace packages/.test(out)) process.exit(0);
if (r.status === 0) {
  if (fp && cache) writeFileSync(cache, fp);
  process.exit(0);
}
const tail = out.trim().split('\n').slice(-30).join('\n');
say({
  decision: 'block',
  reason: `stop-verify: \`pnpm verify:fast\` is red (exit ${r.status}).\n${tail}\n\nFix it before finishing. If it is out of scope for this turn, say exactly what is failing and why.`,
});
