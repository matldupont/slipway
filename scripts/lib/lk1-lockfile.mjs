// What the LK1 tests share: a lockfile in the shape pnpm 10 writes, built from a few parts, and a way to run LK1
// on a project folder.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const HASH = `sha512-${'A'.repeat(86)}==`;
export const HEAD = "lockfileVersion: '9.0'\n\n";
export const registry = (name = 'a', version = '1.0.0') => `  ${name}@${version}:\n    resolution: {integrity: ${HASH}}\n\n`;
export const lockfile = ({ deps = [['a', '^1.0.0', '1.0.0']], packages = registry(), snapshots = '  a@1.0.0: {}\n' } = {}) =>
  `${HEAD}importers:\n\n  .:\n    dependencies:\n${deps.map(([n, s, v]) => `      ${n}:\n        specifier: ${s}\n        version: ${v}\n`).join('')}\npackages:\n\n${packages}snapshots:\n\n${snapshots}`;

// A project folder: package.json, pnpm-lock.yaml, and whatever else `files` names (null leaves one out).
export const project = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'lk1-'));
  for (const [p, body] of Object.entries({ 'package.json': JSON.stringify({ name: 'p', private: true, dependencies: { a: '^1.0.0' } }), ...files })) {
    if (body === null) continue;
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  return dir;
};
export const run = (script, dir, env = {}) => {
  const r = spawnSync(process.execPath, [join(SRC, script), dir], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1', ...env } });
  const line = r.stdout.split('\n').findLast((l) => l.startsWith('@@json '));
  return { status: r.status, out: r.stdout, json: line ? JSON.parse(line.slice('@@json '.length)) : null };
};
export const lk1 = (dir, env) => run('ci/checks/meta/lk1-lockfile.mjs', dir, env);
export const done = (dir) => rmSync(dir, { recursive: true, force: true });

// A monorepo: pnpm writes a link: for each workspace dependency, whatever its specifier says.
export const monorepo = (specifier = 'workspace:*', link = 'link:../../packages/db', workspace = "packages:\n  - 'apps/*'\n  - 'packages/*'\n") => ({
  'package.json': JSON.stringify({ name: 'root', private: true }),
  'pnpm-workspace.yaml': workspace,
  'apps/api/package.json': JSON.stringify({ name: '@s/api', dependencies: { '@s/db': specifier, a: '^1.0.0' } }),
  'packages/db/package.json': JSON.stringify({ name: '@s/db' }),
  'pnpm-lock.yaml': `${HEAD}importers:\n\n  .: {}\n\n  apps/api:\n    dependencies:\n      '@s/db':\n        specifier: ${specifier}\n        version: ${link}\n      a:\n        specifier: ^1.0.0\n        version: 1.0.0\n\n  packages/db: {}\n\npackages:\n\n${registry()}snapshots:\n\n  a@1.0.0: {}\n`,
});
