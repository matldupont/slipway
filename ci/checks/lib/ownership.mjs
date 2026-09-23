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
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { readList } from './yaml-list.mjs';

export const MAP = 'dev/ownership.yaml';
export const CLASSES = ['managed', 'seeded', 'merged', 'internal'];

export function globToRegExp(glob) {
  if (/[[\]{}!]/.test(glob)) throw new Error(`${MAP}: unsupported glob "${glob}" — only *, ? and ** are read`);
  // At most one `*` per segment, and repeated `**` segments collapse to one: the RegExp then cannot
  // backtrack exponentially on a map typo.
  const segs = glob.split('/').map((s) => (s === '**' ? s : s.replace(/\*+/g, '*'))).filter((s, i, a) => !(s === '**' && a[i - 1] === '**'));
  if (segs.some((s) => s === '')) throw new Error(`${MAP}: unsupported glob "${glob}" — empty segment`);
  if (segs.some((s) => s !== '**' && s.split('*').length > 2)) throw new Error(`${MAP}: unsupported glob "${glob}" — at most one * per segment`);
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
  let entries;
  try {
    entries = readList(readFileSync(p, 'utf8'), ['glob', 'class'], { strict: true });
  } catch (e) {
    throw new Error(`${MAP}: ${e.message}`);
  }
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

// Every file `new-project` would take from `root`, sorted. When `root` is the top of a git checkout:
// git's tracked files that still exist. Otherwise — under `npx github:…` the package has no .git, and
// may sit untracked inside someone else's repository — every file on disk. `.gitignore` is always in
// the list: new-project writes it even when npm did not pack one. Throws on a symlink that is not
// internal, which a copy would either dereference (shipping a file from outside the template) or break.
export function shippedPaths(root, rules) {
  const files = listSource(root) === 'git' ? tracked(root) : walk(root, root);
  const links = files.filter((f) => classify(rules, f) !== 'internal' && lstatSync(join(root, f)).isSymbolicLink());
  if (links.length) throw new Error(`symlinks are never shipped: ${links.join(', ')}`);
  return [...new Set([...files, '.gitignore'])].sort();
}

// Where shippedPaths takes its list from: 'git' (tracked files) or 'walk' (every file on disk).
export function listSource(root) {
  return gitTop(root) === realpathSync.native(root) ? 'git' : 'walk';
}

function gitTop(root) {
  try {
    const top = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return realpathSync.native(top.trim());
  } catch {
    return null;
  }
}

function tracked(root) {
  return execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\0')
    .filter((f) => f && lexists(join(root, f)));
}

const lexists = (p) => {
  try {
    return !!lstatSync(p);
  } catch {
    return false;
  }
};

function walk(root, dir) {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    const st = lstatSync(p);
    return st.isDirectory() ? walk(root, p) : [relative(root, p).split(sep).join('/')];
  });
}
