// Which files of a pull request are gate files: the paths the harness asks before editing
// (process/harness/settings.json, `Edit(...)` rules, case ignored), plus a `package.json` whose run keys changed
// (RUN_KEYS, and a dependency on local code or a runtime): what a gate command runs, the pnpm and node that run
// it, and pnpm's settings. Read by P1. One list: a gate path added to the harness is a gate path here.
//
// As a script, `node gate-files.mjs <base> <head>` prints `{"files":[…],"scripts":[…],"globs":[…]}` for the pull
// request's diff (base...head): every changed path, each package.json whose run keys (RUN_KEYS) differ, and the gate
// paths the base branch's harness asked about.
// pr-body.yml writes it beside the PR body.
//
// Not shared with ownership.mjs: that file is slipway's own and never ships to a project.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SETTINGS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'process', 'harness', 'settings.json');

const rules = (text, tool) =>
  (JSON.parse(text).permissions?.ask ?? []).flatMap((r) => {
    const m = r.match(new RegExp(`^${tool}\\((.+)\\)$`));
    return m ? [m[1]] : [];
  });

// The globs the harness asks before editing a file at.
export const gateGlobs = (settingsText) => rules(settingsText, 'Edit');

// Globs with an `Edit(...)` ask and no `Write(...)` ask: creating that file would not prompt.
export const missingWriteTwins = (settingsText) => {
  const writes = new Set(rules(settingsText, 'Write'));
  return gateGlobs(settingsText).filter((g) => !writes.has(g));
};

// `**` for any number of segments, `*` within one segment: all the harness globs use.
export function globToRegExp(glob) {
  const segs = glob.split('/');
  const body = segs.map((s, i) => {
    const last = i === segs.length - 1;
    if (s === '**') return last ? '[\\s\\S]+' : '(?:[^/]+/)*';
    const seg = s.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '[^/]*');
    return last ? seg : `${seg}/`;
  });
  return new RegExp(`^${body.join('')}$`);
}

// The paths in `settings` (the harness's rules) plus `more` globs: P1 adds the base branch's rules, so a PR
// that removes a rule from the harness is still held to it.
export function gateMatcher(settingsText = readFileSync(SETTINGS, 'utf8'), more = []) {
  // Case ignored: a case-insensitive disk checks NODE_MODULES/ or .NPMRC out as the file the rule names.
  const res = [...new Set([...gateGlobs(settingsText), ...more])].map((g) => new RegExp(globToRegExp(g).source, 'i'));
  // A markdown file is a document: it cannot change what a gate checks, even under ci/ or process/harness/.
  return (path) => !/\.md$/i.test(path) && res.some((re) => re.test(path));
}

const SHA = /^[0-9a-f]{7,64}$/;

// The package.json keys that decide what a gate command runs, the pnpm and node that run it, and pnpm's
// settings (`resolutions` pnpm reads as overrides; `engines` and `devEngines` can name a node for pnpm to fetch).
// The sidecar still calls the list `scripts`.
export const RUN_KEYS = ['scripts', 'packageManager', 'pnpm', 'resolutions', 'engines', 'devEngines'];
// A dependency whose version names code in the repository, or a runtime, rather than a registry release: its
// `bin` lands in node_modules/.bin, where it can stand in for a gate tool. Registry entries are the lockfile's
// question (#138).
const DEP_KEYS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const LOCAL_SPEC = /^\s*(link:|file:|runtime:|\.{0,2}\/|~\/)/i;

const sorted = (v) =>
  Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v;
// A package.json's run keys, key order ignored; absent, `null` and an empty `{}` are the same.
const runKeys = (pkg) =>
  JSON.stringify([
    ...RUN_KEYS.map((k) => {
      const v = pkg?.[k];
      return v == null || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) ? null : sorted(v);
    }),
    sorted(
      DEP_KEYS.flatMap((k) =>
        pkg?.[k] && typeof pkg[k] === 'object' ? Object.entries(pkg[k]).filter(([, s]) => typeof s !== 'string' || LOCAL_SPEC.test(s)).map(([n, s]) => [k, n, s]) : []
      ).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1))
    ),
  ]);

export function changes(base, head, cwd = process.cwd()) {
  if (!SHA.test(base) || !SHA.test(head)) throw new Error('base and head must be commit ids');
  const git = (...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', maxBuffer: 256 << 20 });
  const files = git('diff', '--name-only', '--no-renames', '-z', `${base}...${head}`).split('\0').filter(Boolean);
  const from = git('merge-base', base, head).trim();
  const scriptsAt = (rev, path) => {
    let text;
    try {
      text = git('show', `${rev}:${path}`);
    } catch {
      return runKeys(null); // absent at that revision
    }
    try {
      return runKeys(JSON.parse(text));
    } catch {
      return `unreadable:${text}`; // pnpm may read what JSON.parse cannot (a BOM): any change to it counts
    }
  };
  let globs = [];
  try {
    globs = gateGlobs(git('show', `${from}:process/harness/settings.json`)); // absent before the harness existed
  } catch {}
  const scripts = files.filter((f) => f.split('/').pop() === 'package.json' && scriptsAt(from, f) !== scriptsAt(head, f));
  return { files, scripts, globs };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(changes(process.argv[2], process.argv[3])) + '\n');
}
