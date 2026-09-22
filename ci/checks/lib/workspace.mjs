// Discovers the pnpm workspace with zero dependencies.
//
// Supported in pnpm-workspace.yaml: an exact directory or `<dir>/*`, either optionally
// negated with `!`. Anything else throws, because every coverage claim built on a
// misread workspace would be wrong.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function patterns(root) {
  const p = join(root, 'pnpm-workspace.yaml');
  if (!existsSync(p)) return [];
  const out = [];
  let inPackages = false;
  for (const raw of readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (/^\s*(#.*)?$/.test(raw)) continue;
    if (/^\S/.test(raw)) { inPackages = /^packages\s*:\s*$/.test(raw); continue; }
    if (!inPackages) continue;
    const m = raw.match(/^\s*-\s*(['"]?)(.+?)\1\s*(#.*)?$/);
    if (!m) throw new Error(`pnpm-workspace.yaml: cannot read "${raw.trim()}"`);
    out.push(m[2]);
  }
  return out;
}

function expand(root, pattern) {
  const clean = pattern.replace(/\/+$/, '');
  if (/[*?[\]{}]/.test(clean.replace(/\/\*$/, ''))) {
    throw new Error(`pnpm-workspace.yaml: unsupported glob "${pattern}" — use <dir> or <dir>/*`);
  }
  if (clean.endsWith('/*')) {
    const dir = join(root, clean.slice(0, -2));
    if (!existsSync(dir)) return [];
    return readdirSync(dir).map((e) => join(dir, e)).filter((d) => statSync(d).isDirectory());
  }
  return [join(root, clean)];
}

export function discoverWorkspace(root) {
  const rootPkgPath = join(root, 'package.json');
  if (!existsSync(rootPkgPath)) throw new Error('no root package.json');
  const rootPkg = readJson(rootPkgPath);
  const include = new Set();
  const exclude = new Set();
  for (const pat of patterns(root)) {
    const negated = pat.startsWith('!');
    for (const d of expand(root, negated ? pat.slice(1) : pat)) (negated ? exclude : include).add(d);
  }
  const packages = [...include]
    .filter((d) => !exclude.has(d) && existsSync(join(d, 'package.json')))
    .sort()
    .map((d) => {
      const pkg = readJson(join(d, 'package.json'));
      return { name: pkg.name ?? relative(root, d), dir: relative(root, d), scripts: pkg.scripts ?? {} };
    });
  return { root: { name: rootPkg.name ?? '(root)', dir: '.', scripts: rootPkg.scripts ?? {} }, packages };
}
