// The install manifest and its overrides (F-01, dev/features/template-sync.md). Ships to every project:
// D1 reads both, new-project writes the manifest, and sync (F-01 step 4) rewrites it.
//
// `.slipway/manifest.json` records the slipway sha a project was built from and the sha256 of every
// file slipway wrote, as written. `.slipway/overrides.yaml` lists the managed files the project
// changed on purpose, in the declared YAML subset (lib/yaml-list.mjs):
//
//   overrides:
//     - path: ci/checks/meta/k1-frame.mjs
//       reason: our FRAME.md has no metrics section

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { CONTROL, escapeControl } from './report.mjs';
import { readList } from './yaml-list.mjs';

export const MANIFEST = '.slipway/manifest.json';
export const OVERRIDES = '.slipway/overrides.yaml';
// The classes a manifest can record: `internal` never ships, so it is never in one.
export const RECORDED = ['managed', 'seeded', 'merged'];

// Slipway itself, not an install. D1 goes green in template mode; W1 checks slipway's own tests; sync
// refuses to run. All three conditions hold, and anything this cannot tell is "not slipway":
//   - both markers: internal files new-project never copies, so a project's own `dev/` folder is not enough;
//   - `root` is the top of its git checkout. SLIPWAY_TEMPLATE_FIXTURE=1 lifts this one condition, for the
//     known-bad fixtures inside slipway's own checkout; a project's history still fails the next one;
//   - that checkout's history has exactly one root commit, SLIPWAY_ROOT_COMMIT. A project can add files;
//     it cannot make a commit id. A shallow clone lists its boundary commit as a root, so it is not slipway.
// Git is found outside the repository and runs with every GIT_* variable dropped, and replace refs and
// grafts ignored: nothing the repository holds or the environment sets can stand in for git, point it at
// another repository, or give a commit other parents.
//
// SLIPWAY_ROOT_COMMIT is the root of slipway's history after the 2026-09-24 rewrite. A project starts
// its own history (new-project runs git init). Any future rewrite of slipway's history must update it.
export const SLIPWAY_ROOT_COMMIT = 'fa6b1b7468259792180683f6e7cd360475ba04fd';
export const TEMPLATE_MARKERS = ['dev/ownership.yaml', 'scripts/new-project.mjs'];
export const hasTemplateMarkers = (root) => TEMPLATE_MARKERS.every((m) => existsSync(join(root, m)));

// Git comes from PATH without any entry inside the repository or any node_modules: `pnpm run` puts
// node_modules/.bin first, and a `git` committed there would answer for the project. It runs from outside
// the repository (-C), so no platform finds a git in the folder it runs in. No grafts file either:
// .git/info/grafts can give a commit any parents, as replace refs can.
const real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
};
const inside = (dir, p) => {
  const r = relative(dir, real(p));
  return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
};
function gitEnv(dir) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_/i.test(k)));
  const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  env[key] = (env[key] ?? '')
    .split(delimiter)
    .filter((p) => isAbsolute(p) && !p.split(/[\\/]/).includes('node_modules') && !inside(dir, p))
    .join(delimiter);
  return { ...env, GIT_GRAFT_FILE: '/dev/null' };
}
const gitOut = (dir, args) =>
  execFileSync('git', ['--no-replace-objects', '-C', dir, ...args], { cwd: tmpdir(), env: gitEnv(dir), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const slipwayHistory = new Map();
function isSlipwayHistory(root) {
  let dir;
  try {
    dir = realpathSync(root);
  } catch {
    return false;
  }
  if (!slipwayHistory.has(dir)) {
    let yes = false;
    try {
      const top = realpathSync(gitOut(dir, ['rev-parse', '--show-toplevel']));
      yes = (top === dir || process.env.SLIPWAY_TEMPLATE_FIXTURE === '1') && gitOut(top, ['rev-list', '--max-parents=0', 'HEAD']) === SLIPWAY_ROOT_COMMIT;
    } catch {}
    slipwayHistory.set(dir, yes);
  }
  return slipwayHistory.get(dir);
}
export const isTemplate = (root) => hasTemplateMarkers(root) && isSlipwayHistory(root);

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// null when the project has no manifest. Throws when it has one this code cannot trust: every drift
// finding built on a misread manifest would be wrong, and a path outside the project is never read.
export function readManifest(root) {
  const p = join(root, MANIFEST);
  if (!existsSync(p)) return null;
  let m;
  try {
    m = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`${MANIFEST} is not valid JSON: ${e.message}`);
  }
  if (!m || typeof m.files !== 'object' || m.files === null || Array.isArray(m.files)) throw new Error(`${MANIFEST} has no files map`);
  for (const [path, f] of Object.entries(m.files)) {
    if (CONTROL.test(path)) throw new Error(`${MANIFEST}: "${escapeControl(path)}" holds a control character — restore a good copy from git (git log -- ${MANIFEST} shows the commit that wrote it; git checkout <that sha>~1 -- ${MANIFEST} takes the copy before it); sync refuses to read it as it is`);
    if (/[\\:]/.test(path) || path.startsWith('/') || path.split('/').some((s) => s === '..' || s === '' || s === '.')) {
      throw new Error(`${MANIFEST}: "${escapeControl(path)}" is not a plain relative path`);
    }
    if (!RECORDED.includes(f?.class) || !/^[0-9a-f]{64}$/.test(f?.sha256 ?? '')) {
      throw new Error(`${MANIFEST}: "${path}" needs a class (${RECORDED.join(', ')}) and a sha256`);
    }
  }
  return m;
}

// [] when there is no overrides file. Throws on a line the declared subset cannot read.
export function readOverrides(root) {
  const p = join(root, OVERRIDES);
  if (!existsSync(p)) return [];
  try {
    return readList(readFileSync(p, 'utf8'), ['path', 'reason'], { strict: true });
  } catch (e) {
    throw new Error(`${OVERRIDES}: ${e.message}`);
  }
}

// A project file's bytes as D1 and sync read them: null when absent; NOT_A_FILE for a directory,
// symlink or other non-file in its place, which is never followed. Symlinks are checked on the last
// path component only: a symlinked parent directory is still followed (a known limitation, F-01).
export const NOT_A_FILE = Symbol('not a file');
export function readProjectFile(root, p) {
  const abs = join(root, p);
  let st;
  try {
    st = lstatSync(abs);
  } catch {
    return null;
  }
  return st.isFile() ? readFileSync(abs) : NOT_A_FILE;
}

// An override excuses its file only with a reason; a whitespace-only one is empty.
export const hasReason = (o) => Boolean(o.reason?.trim());
