// The ownership map: which class owns each path slipway ships (F-01, dev/features/template-sync.md).
// Read by O1 and by scripts/new-project.mjs, so the check and the copy can never disagree about
// what ships.
//
// `dev/ownership.yaml` is an ordered `paths:` list of `{ glob, class }` in the declared YAML subset
// (lib/yaml-list.mjs); the first matching glob wins. A map this code cannot read exactly throws,
// because every class decision built on a misread map would be wrong.
//
// Globs are a declared subset too: `*` and `?` within one segment, `**` for any number of segments.
// Dot-segments match like any other — `ci/**` owns `ci/fixtures/…/.github/workflows/ci.yml`, which
// `path.matchesGlob` would not. Brackets, braces and `!` throw.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { readList } from './yaml-list.mjs';

export const MAP = 'dev/ownership.yaml';
export const CLASSES = ['managed', 'seeded', 'merged', 'internal'];

export function globToRegExp(glob) {
  if (/[[\]{}!]/.test(glob)) throw new Error(`${MAP}: unsupported glob "${glob}" — only *, ? and ** are read`);
  const segs = glob.split('/');
  const body = segs.map((s, i) => {
    const last = i === segs.length - 1;
    if (s === '**') return last ? '.+' : '(?:[^/]+/)*';
    const seg = s.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
    return last ? seg : `${seg}/`;
  });
  return new RegExp(`^${body.join('')}$`);
}

// Throws when the map is missing, empty, or has an entry without a glob or with an unknown class.
export function loadOwnership(root) {
  const p = join(root, MAP);
  if (!existsSync(p)) throw new Error(`no ${MAP}`);
  const entries = readList(readFileSync(p, 'utf8'), ['glob', 'class']);
  if (entries.length === 0) throw new Error(`${MAP} declares no paths`);
  return entries.map((e) => {
    if (!e.glob) throw new Error(`${MAP}:${e.line}: entry has an empty glob`);
    if (!CLASSES.includes(e.class)) {
      throw new Error(`${MAP}:${e.line}: "${e.glob}" has class "${e.class ?? ''}" — expected one of ${CLASSES.join(', ')}`);
    }
    return { glob: e.glob, class: e.class, re: globToRegExp(e.glob) };
  });
}

// The class of a repo-relative, `/`-separated path, or null when no glob matches.
export function classify(rules, path) {
  return rules.find((r) => r.re.test(path))?.class ?? null;
}

// Every file `new-project` would take from `root`, sorted: git's tracked files that still exist in a
// checkout, otherwise every file on disk (under `npx github:…` the package has no .git). `.gitignore`
// is always in the list — new-project writes it even when npm did not pack one.
export function shippedPaths(root) {
  let files;
  try {
    files = execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\0')
      .filter((f) => f && existsSync(join(root, f)));
  } catch {
    files = walk(root, root);
  }
  return [...new Set([...files, '.gitignore'])].sort();
}

function walk(root, dir) {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(root, p) : [relative(root, p).split(sep).join('/')];
  });
}
