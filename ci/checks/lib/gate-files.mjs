// Which files of a pull request are gate files: the paths the harness asks before editing
// (process/harness/settings.json, `Edit(...)` rules, matched exactly; a lookalike spelling is refused; markdown only when
// owner-only), the paths the base guard adds to them (GUARD_GLOBS), plus a `package.json` whose run keys changed
// (RUN_KEYS, and a dependency on local code or a runtime): what a gate command runs, the pnpm and node that run
// it, and pnpm's settings. Read by P1. One list: a gate path added to the harness is a gate path here.
// Two owner-only documents have no fixed path: AGENT.md names them (NAMED_ROWS), and its rows at the base commit and
// in the checked-out tree add them. A row the check cannot read fails it; a project fixes the row in a PR, which is then held to its own.
//
// As a script, `node gate-files.mjs <base> <head>` prints `{"files":[…],"scripts":[…],"globs":[…],"links":[…]}` for
// the pull request's diff (base...head): every changed path, each package.json whose run keys (RUN_KEYS) differ, the
// gate paths the base branch's harness asked about and the documents AGENT.md names (at the base and as checked out), and each symlink or submodule link added, removed or changed.
// pr-body.yml writes it beside the PR body.
//
// Not shared with ownership.mjs: that file is slipway's own and never ships to a project.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rowValue } from './clock.mjs';

export const SETTINGS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'process', 'harness', 'settings.json');

const rules = (text, tool) =>
  (JSON.parse(text).permissions?.ask ?? []).flatMap((r) => {
    const m = r.match(new RegExp(`^${tool}\\((.+)\\)$`));
    return m ? [m[1]] : [];
  });

// The globs the harness asks before editing a file at, or creating one: an `Edit(...)` rule covers every
// file-writing tool (process/harness/README.md → Permissions, #307).
export const gateGlobs = (settingsText) => rules(settingsText, 'Edit');

// `Write(...)` ask rules: Claude Code matches none of them and warns about each, so the harness carries none.
export const writeRules = (settingsText) => rules(settingsText, 'Write');

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

// A name's canonical form: NFKC, then lower case. It approximates how a case-insensitive disk (macOS) folds
// names, so `.NPMRC`, `NODE_MODULES` and a long-s `node_moduleſ` all read as the name they would open as. An
// approximation: a folding it misses matters only on a Mac that runs a branch's code, which #114 and #126
// exist to prevent. N1 and P1 compare with it.
export const canonical = (s) => s.normalize('NFKC').toLowerCase();

// The paths the base guard (process/harness/hooks/base-guard.sh) counts beyond the harness's `Edit(...)` rules, and
// P1 counts with it (#174): git's own settings files. `.gitattributes` names the filters and drivers git runs a
// file through; `.gitmodules` names where a submodule's code comes from. The harness has no ask rule for either.
// scripts/gate-files.test.mjs reads the guard's list and fails when it holds a path that is neither here nor
// excepted in process/harness/README.md.
export const GUARD_GLOBS = ['**/.gitmodules', '**/.gitattributes'];

// The paths in `settings` (the harness's rules), the guard's own (GUARD_GLOBS) and `more` globs: P1 adds the base
// branch's rules and the documents its AGENT.md named, so a PR that removes a rule or renames a row is still held to it. Matching is exact. `lookalike(path)` names the
// gate path a path is not, but reads as in canonical form (`.NPMRC`, `PACKAGE.JSON`): P1 refuses those
// outright rather than count them as gate files.
export function gateMatcher(settingsText = readFileSync(SETTINGS, 'utf8'), more = []) {
  const globs = [...new Set([...gateGlobs(settingsText), ...GUARD_GLOBS, ...more])];
  const exact = globs.map(globToRegExp);
  const folded = globs.map((g) => [g, globToRegExp(canonical(g))]);
  // A markdown file is a document: it cannot change what a gate checks, even under ci/ or process/harness/. Except
  // an owner-only one (process/slipway-rules.md → Gates, #163): a file a glob names by its `.md` name (CLAUDE.md,
  // AGENT.md, the rules) or one under .claude/, where Claude Code reads markdown as instructions (skills, agents,
  // commands). Those are what an agent follows, and a shell write reaches them without an ask, so the PR line is
  // the backstop. Compared in canonical form, so a lookalike (`.CLAUDE/`, `Claude.md`) is refused, not exempt.
  const named = globs.filter((g) => /\.md$/i.test(g.split('/').pop())).map((g) => globToRegExp(canonical(g)));
  const doc = (path) => {
    const c = canonical(path);
    return /\.md$/.test(c) && !/(^|\/)\.claude\//.test(c) && !named.some((re) => re.test(c));
  };
  const isGate = (path) => !doc(path) && exact.some((re) => re.test(path));
  isGate.lookalike = (path) => {
    if (doc(path) || isGate(path)) return null;
    const c = canonical(path);
    const hit = folded.find(([, re]) => re.test(c));
    if (hit) return hit[0];
    const base = path.split('/').pop();
    return base !== 'package.json' && canonical(base) === 'package.json' ? 'package.json' : null;
  };
  return isGate;
}

// The owner-only documents a project names in AGENT.md's settings table (process/slipway-rules.md → Gates, #259), and
// the path a missing row stands for: `Cold review` has a default the skills use (process/intake.md → Configuration;
// scripts/gate-files-named.test.mjs holds the two equal), `Domain invariants doc` has none.
export const COLD_REVIEW_DEFAULT = 'process/cold-review.md';
export const NAMED_ROWS = [['Domain invariants doc', null], ['Cold review', COLD_REVIEW_DEFAULT]];
// A path the check can compare: printable ASCII, no leading `/`, no empty or dot-only segment, and none of the marks
// that mean the cell holds something else (a glob, a markdown link, an anchor, a `<…>`). The value is only ever
// compared with the changed paths, never passed to a command, so `@`, `+` and a space are fine. Not accepted: a name
// outside ASCII. AGENT.md and git may store one in different Unicode forms, and the check would then never match it.
const PATH_CHARS = /^[\x20-\x7e]+$/;
const NOT_A_PATH = /[*\\`#[\]()<>]/;
const isPath = (p) => PATH_CHARS.test(p) && !NOT_A_PATH.test(p) && !p.startsWith('/') && p.split('/').every((seg) => seg.trim() && !/^\.+$/.test(seg));
// A row's text in a message is data: no control, line-separator or direction marks reach the log (P1's `shown`, wider).
const UNSHOWN = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const HOW = 'Write the file\'s path in backticks (`docs/rules.md`), or none. Letters, digits, spaces and most punctuation are fine; * \\ # [ ] ( ) < >, a leading / and letters outside ASCII are not';

// The paths those rows name in `agentText` (the root AGENT.md), each a gate path matched exactly. A row is a table
// line whose first cell is the row's name, wherever it sits: under any heading, and inside a code fence or a comment
// too, so an example row is counted beside the real one. `none` and an unfilled `<…>` name nothing; a row on no line
// names its default, when it has one. A value written as a path is taken as one, whether or not a file is there: a
// bare word (`TBD`) names a file nobody has. A row whose value is not such a path, or that the reader cannot take
// (an empty cell, a bold or indented key, a cell that runs past its line), throws, in the owner's terms: the check
// cannot tell which file is meant, so it fails rather than count none. `where` says whose AGENT.md, for that message.
export function namedDocs(agentText, where = '') {
  const paths = NAMED_ROWS.flatMap(([row, whenMissing]) => {
    const key = (line) => (line.match(/^[ \t]*\|([^|]*)\|/)?.[1] ?? '').replace(/[*_`]/g, '').trim().toLowerCase();
    const lines = agentText.split(/\r\n|\r|\n/).filter((l) => key(l) === row.toLowerCase());
    if (!lines.length) return whenMissing ? [whenMissing] : [];
    return lines.flatMap((line) => {
      const raw = rowValue(line, row);
      const fail = (what) => new Error(`AGENT.md${where}, row "${row}": ${what.replace(UNSHOWN, '?')}. ${HOW}`);
      if (!raw) throw fail(`the check for pull requests cannot read this row (${JSON.stringify(line.trim().slice(0, 80))})`);
      if (/^none[,.;:]?$/i.test(raw) || raw.startsWith('<')) return [];
      const path = raw.replace(/^(?:\.\/)+/, '');
      if (!isPath(path)) throw fail(`${JSON.stringify(raw.slice(0, 80))} is not a file path the check for pull requests can read`);
      return [path];
    });
  });
  return [...new Set(paths)];
}

const SHA = /^[0-9a-f]{7,64}$/;

// The package.json keys that decide what a gate command runs, the pnpm and node that run it, and pnpm's
// settings (`resolutions` pnpm reads as overrides; `engines` and `devEngines` can name a node for pnpm to fetch;
// `bin` and `directories.bin` name the programs a package puts in node_modules/.bin).
// CONFIG_KEYS are the keys a gate tool reads its settings from in place of its own file (`prettier` for `.prettierrc*`,
// `eslintConfig` for `.eslintrc*`, a test runner's or a coverage tool's), and the two that change how node loads the
// gate's code (`type`, `imports`). A list: a tool that reads another key is not seen (process/harness/README.md).
// The sidecar still calls the list `scripts`.
export const CONFIG_KEYS = ['type', 'imports', 'prettier', 'eslintConfig', 'stylelint', 'jest', 'mocha', 'ava', 'c8', 'nyc'];
export const RUN_KEYS = ['scripts', 'packageManager', 'pnpm', 'resolutions', 'engines', 'devEngines', 'bin', 'directories', ...CONFIG_KEYS];
// A dependency whose version names code in the repository, or a runtime, rather than a registry release: its
// `bin` lands in node_modules/.bin, where it can stand in for a gate tool. Registry entries are the lockfile's
// question (#138).
const DEP_KEYS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const LOCAL_SPEC = /^\s*(link:|file:|workspace:|runtime:|\.{0,2}\/|~\/)/i;

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
  const git = (...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
  // stderr is piped, not inherited: `git show` on a file the base lacks fails by design (scriptsAt), and its `fatal:` line
  // must not reach the log. A real failure still throws, with git's message in the error.
  // Every changed path with its modes (`:old new sha sha status\0path\0`). A symlink (120000) or a submodule link
  // (160000) on either side is a link: the folder it stands for may hold gate files no pattern can name (#149).
  const raw = git('diff', '--raw', '--no-renames', '--no-abbrev', '--ignore-submodules=none', '-z', `${base}...${head}`).split('\0');
  raw.pop(); // the trailing NUL
  if (raw.length % 2) throw new Error('git diff --raw: unexpected output');
  const files = [];
  const links = [];
  for (let i = 0; i < raw.length; i += 2) {
    const modes = raw[i].match(/^:([0-7]{6}) ([0-7]{6}) /);
    if (!modes) throw new Error('git diff --raw: unexpected output');
    files.push(raw[i + 1]);
    if ([modes[1], modes[2]].some((m) => m === '120000' || m === '160000')) links.push(raw[i + 1]);
  }
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
  // The two documents AGENT.md names are read from two places, as P1 reads the harness's rules from two: AGENT.md at
  // the base commit given, so a PR that rewrites a row is held to the path the base names; and AGENT.md in the
  // checked-out tree, which in CI is the PR merged into the base branch's tip as it is now (pr-body.yml checks out the
  // pull request's merge ref), so a PR opened before the base named a document is held to it too. The base commit a
  // pull request event gives is the tip when the PR was opened or last took the base, not the tip now. Both sources
  // count: the list is their union. A PR that rewrites a row the base named after it was opened conflicts in
  // AGENT.md, so it has no merge to check until it takes the base, and then the base given names the path.
  // Run by hand, the tree is the branch itself, so the second source adds only the branch's own rows.
  // Absent at a commit or in the tree: no row there, so the cold-review default still counts.
  // The head's rows are read too, only to refuse one that cannot be read: a PR that writes such a row is red, and is
  // fixed in that PR. When the base's own rows cannot be read (a project whose row was written before this check),
  // every PR is red but one that changes AGENT.md so that its rows read: it is held to the head's paths and the
  // defaults, and says so. AGENT.md is a gate file with its own line to write. None of this is inside a try that passes.
  const agentAt = (rev) => {
    try {
      return git('show', `${rev}:AGENT.md`);
    } catch {
      return '';
    }
  };
  const atHead = namedDocs(agentAt(head), ' in this pull request');
  let named;
  try {
    named = namedDocs(agentAt(base), ' on the base branch');
  } catch (e) {
    if (!files.includes('AGENT.md')) throw e; // not the repair: a PR that leaves the row as it is stays red
    named = [...new Set([...atHead, ...NAMED_ROWS.flatMap(([, whenMissing]) => (whenMissing ? [whenMissing] : []))])];
    process.stderr.write(`gate-files: ${e.message.split('. ')[0]}. This pull request repairs it, so its own rows were used: ${named.join(', ')}\n`);
  }
  let tree = '';
  try {
    tree = readFileSync(join(git('rev-parse', '--show-toplevel').trim(), 'AGENT.md'), 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  globs = [...new Set([...globs, ...named, ...namedDocs(tree, ' as checked out')])];
  const scripts = files.filter((f) => f.split('/').pop() === 'package.json' && scriptsAt(from, f) !== scriptsAt(head, f));
  return { files, scripts, globs, links };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(changes(process.argv[2], process.argv[3])) + '\n');
}
