// A project made by new-project, for the tests that run the prose check in one (scripts/prose.test.mjs,
// scripts/prose-job.test.mjs). Internal: scripts/** never ships.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// new-project commits, so a runner with no git identity (CI's) is given one, and no one's global git config is read.
Object.assign(process.env, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' });
// A project made by new-project, `withVale` on the path or not; its main branch holds one commit.
export const NO_VALE = { ...process.env, PATH: `${dirname(process.execPath)}:/usr/bin:/bin` };
export function newProject(withVale) {
  const dir = join(mkdtempSync(join(tmpdir(), 'prose-project-')), 'p');
  const r = spawnSync(process.execPath, [join(SRC, 'scripts', 'new-project.mjs'), dir, '--no-github', '--no-harness'], { encoding: 'utf8', env: withVale ? process.env : NO_VALE });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return { dir, out: r.stdout };
}
export const inProject = (dir, args, env = process.env) => spawnSync(process.execPath, [join(dir, 'ci', 'prose.mjs'), ...args], { cwd: dir, encoding: 'utf8', env });
export const sh = (dir, ...args) => assert.equal(spawnSync('git', args, { cwd: dir, encoding: 'utf8' }).status, 0, `git ${args.join(' ')}`);
export const commitAll = (dir, msg) => {
  sh(dir, 'add', '-A');
  sh(dir, '-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', msg);
};
export const counts = (dir) => JSON.parse(readFileSync(join(dir, 'ci', 'baselines.json'), 'utf8'));
export const LONG = `${Array.from({ length: 40 }, () => 'word').join(' ')}.\n`;
