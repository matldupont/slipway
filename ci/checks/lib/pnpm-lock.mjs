// pnpm-lock.yaml, read for LK1 (ci/checks/meta/lk1-lockfile.mjs): where each package in it comes from.
//
// Two halves. `parseLockfile` reads the file in a declared YAML subset (D-004: no dependency, and anything
// outside the subset throws, so LK1 exits BROKEN and never guesses). `checkLockfile` walks what it read.
//
// The subset is what pnpm 10 writes (lockfileVersion 9.0): block mappings and sequences by two-space
// indentation, single-line plain, single-quoted and double-quoted scalars, single-line flow mappings and
// sequences (`resolution: {integrity: sha512-…}`), comments. Refused, by throwing: anchors, aliases, tags,
// merge keys, block and multi-line scalars, document markers, a tab in indentation, a repeated key, a
// sequence level with the key above it, and any control, line-break or hidden character (UNSAFE, which
// includes a carriage return: pnpm writes LF only). The file is hostile input — a pull request can change
// it — and a program that reads it differently from pnpm is a way to hide an entry, so a construct the
// reader could take two ways is never accepted. Mappings are Maps, so a package named `__proto__` is a key.
//
// What passes: a `packages` entry whose key is `name@x.y.z` and whose `resolution` is exactly
// `{integrity: <sha hash>}`. Anything else is a problem, named by its kind (git, tarball, link, file, other):
// the test is the one shape pnpm writes for a registry release, not a list of the shapes to refuse.
// `tarball:` beside an integrity is a problem, because `file:x.tgz` is written that way too.
// Dependencies point at `packages` entries by key, so a `packages` problem is reported once, where it is
// judged. What has no entry there is judged where it is written: a `link:` in an importer or in a snapshot
// (a `pnpm.overrides` link lands there), and a version no entry answers to. A `workspace:` dependency's
// `link:` is the project's own code (reviewed in its diff) and passes only when it lands on a workspace
// package folder.

import { posix } from 'node:path';
import { UNSAFE } from './report.mjs';

export const LOCKFILE = 'pnpm-lock.yaml';
// The prefix of an id in ci/exceptions.yaml that excuses a lockfile entry: `pnpm-lock.yaml#<entry id>`.
export const ID_PREFIX = `${LOCKFILE}#`;
export const VERSION = '9.0';

const at = (n, what) => new Error(`${LOCKFILE} line ${n}: ${what}`);
const SPECIAL = /[&*!|>%@`]/;

function flow(s, n) {
  let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const scalar = (isKey) => {
    const quoted = s[i] === "'" ? /'((?:[^']|'')*)'/y : s[i] === '"' ? /"([^"\\]*)"/y : null;
    if (quoted) {
      quoted.lastIndex = i;
      const r = quoted.exec(s);
      if (!r) throw at(n, 'has a quoted value this reader does not take (unterminated, or a backslash)');
      i = quoted.lastIndex;
      return r[1].replaceAll("''", "'");
    }
    const plain = /[^,[\]{}]+/y;
    plain.lastIndex = i;
    let run = plain.exec(s)?.[0].replace(/ +$/, '') ?? '';
    if (isKey) {
      const c = /:(?: |$)/.exec(run);
      if (!c) throw at(n, 'has a flow entry with no "key: value"');
      run = run.slice(0, c.index);
    } else if (/:(?: |$)/.test(run)) {
      throw at(n, 'has "key: value" text where one value is expected');
    }
    if (run === '' || SPECIAL.test(run[0]) || /\s#/.test(run)) throw at(n, 'has a flow value this reader does not take');
    i += run.length;
    return run;
  };
  const value = () => {
    ws();
    if (s[i] === '{') {
      i++;
      const map = new Map();
      ws();
      if (s[i] === '}') { i++; return map; }
      for (;;) {
        ws();
        const k = scalar(true);
        ws();
        if (s[i] !== ':' || s[i + 1] !== ' ') throw at(n, 'has a flow entry with no "key: value"');
        i++;
        const v = value();
        if (map.has(k)) throw at(n, 'repeats a key');
        map.set(k, v);
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === '}') { i++; return map; }
        throw at(n, 'has a flow mapping that does not close on its line');
      }
    }
    if (s[i] === '[') {
      i++;
      const seq = [];
      ws();
      if (s[i] === ']') { i++; return seq; }
      for (;;) {
        seq.push(value());
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ']') { i++; return seq; }
        throw at(n, 'has a flow sequence that does not close on its line');
      }
    }
    return scalar(false);
  };
  const v = value();
  return [v, i];
}

function inline(v, n) {
  if (v[0] === '{' || v[0] === '[') {
    const [val, end] = flow(v, n);
    if (!/^(?:\s+#.*)?$/.test(v.slice(end))) throw at(n, 'has text after a flow collection');
    return val;
  }
  if (v[0] === "'" || v[0] === '"') {
    const m = (v[0] === "'" ? /^'((?:[^']|'')*)'(?:\s+#.*)?$/ : /^"([^"\\]*)"(?:\s+#.*)?$/).exec(v);
    if (!m) throw at(n, 'has a quoted value this reader does not take (multi-line, unterminated, or a backslash)');
    return m[1].replaceAll("''", "'");
  }
  if (SPECIAL.test(v[0]) || /^[-?:](?: |$)/.test(v)) throw at(n, 'has a value this reader does not take (an anchor, alias, tag, block scalar or indicator)');
  const plain = v.replace(/\s+#.*$/, '').trim();
  if (/:(?: |$)/.test(plain)) throw at(n, 'has "key: value" text where one value is expected');
  return plain;
}

function keyOf({ n, text }) {
  let key;
  let rest;
  const quoted = text[0] === "'" ? /^'((?:[^']|'')*)'/ : text[0] === '"' ? /^"([^"\\]*)"/ : null;
  if (quoted) {
    const m = quoted.exec(text);
    if (!m) throw at(n, 'has a quoted key this reader does not take');
    key = m[1].replaceAll("''", "'");
    rest = text.slice(m[0].length);
  } else {
    const m = /:(?: |$)/.exec(text);
    if (!m) throw at(n, 'is not a "key: value" line');
    key = text.slice(0, m.index).trimEnd();
    rest = text.slice(m.index);
    if (key === '' || key === '<<' || /^[&*!|>%@`#'"[\]{},?:]/.test(key) || /^-(?: |$)/.test(key) || / #/.test(key)) throw at(n, 'has a key this reader does not take');
  }
  if (!/^:(?: |$)/.test(rest)) throw at(n, 'is not a "key: value" line');
  return { key, rest: rest.slice(1).trim() };
}

/** @returns {Map<string, any>} nested Maps, arrays and strings; an empty value is null */
export function parseLockfile(text) {
  const bad = text.search(UNSAFE);
  if (bad >= 0) {
    const cp = text.codePointAt(bad).toString(16).toUpperCase().padStart(4, '0');
    throw at(text.slice(0, bad).split('\n').length, `holds the control, line-break or hidden character U+${cp}, which a YAML reader and this check could read differently`);
  }
  const items = [];
  text.split('\n').forEach((raw, i) => {
    if (/^\s*(#.*)?$/.test(raw)) return;
    if (/^ *\t/.test(raw)) throw at(i + 1, 'is indented with a tab');
    const indent = /^ */.exec(raw)[0].length;
    items.push({ n: i + 1, indent, text: raw.slice(indent).trimEnd() });
  });
  if (items.length === 0) throw new Error(`${LOCKFILE} is empty`);

  let pos = 0;
  const isSeq = (it) => /^-(?: |$)/.test(it.text);
  const block = (indent) => (isSeq(items[pos]) ? sequence(indent) : mapping(indent));
  function mapping(indent) {
    const map = new Map();
    while (pos < items.length && items[pos].indent === indent) {
      const it = items[pos++];
      const { key, rest } = keyOf(it);
      if (map.has(key)) throw at(it.n, 'repeats a key');
      const empty = rest === '' || rest.startsWith('#');
      map.set(key, empty ? (pos < items.length && items[pos].indent > indent ? block(items[pos].indent) : null) : inline(rest, it.n));
    }
    if (pos < items.length && items[pos].indent > indent) throw at(items[pos].n, 'is indented under a value that takes no lines');
    return map;
  }
  function sequence(indent) {
    const seq = [];
    while (pos < items.length && items[pos].indent === indent && isSeq(items[pos])) {
      const it = items[pos++];
      const v = it.text.slice(1).trim();
      if (v === '') throw at(it.n, 'has an empty sequence item');
      seq.push(inline(v, it.n));
    }
    if (pos < items.length && items[pos].indent >= indent) throw at(items[pos].n, 'is not a sequence item, or is indented under one');
    return seq;
  }
  if (items[0].indent !== 0) throw at(items[0].n, 'does not start at the left edge');
  const doc = block(0);
  if (pos < items.length) throw at(items[pos].n, 'is not part of the lockfile structure');
  if (!(doc instanceof Map)) throw new Error(`${LOCKFILE} is not a mapping`);
  return doc;
}

const NAME = String.raw`(?:@[A-Za-z0-9._~-]+/)?[A-Za-z0-9._~-]+`;
const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`;
const REGISTRY_KEY = new RegExp(`^${NAME}@${SEMVER}$`);
// base64 of a sha1, sha256, sha384 and sha512 digest, at their exact lengths
const INTEGRITY = /^sha(?:1-[A-Za-z0-9+/]{27}=|256-[A-Za-z0-9+/]{43}=|384-[A-Za-z0-9+/]{64}|512-[A-Za-z0-9+/]{86}==)$/;

export const KINDS = {
  git: 'resolves from a git repository',
  tarball: 'resolves from a tarball URL',
  link: 'links a local folder (link:)',
  file: 'installs a local file or folder (file:)',
  other: 'does not resolve as a registry release',
};

// The kind a problem entry is named by. It only labels: an entry is a problem because it is not the one
// registry shape, whatever this returns.
function kindOfText(t) {
  if (/^link:/.test(t)) return 'link';
  if (/(^|@)file:/.test(t)) return 'file';
  if (/(^|@)(?:git\+|git:|github:|gitlab:|bitbucket:|ssh:)/.test(t)) return 'git';
  if (/(^|@)https?:/.test(t)) return 'tarball';
  return 'other';
}
function kindOfEntry(key, res) {
  if (res instanceof Map) {
    if (res.get('type') === 'git' || res.has('commit') || res.has('repo')) return 'git';
    if (res.get('type') === 'directory' || res.has('directory')) return 'file';
    const tarball = res.get('tarball');
    if (typeof tarball === 'string') return tarball.startsWith('file:') ? 'file' : 'tarball';
  }
  return kindOfText(key);
}

const mapOf = (v, name) => {
  if (v == null) return new Map();
  if (v instanceof Map) return v;
  throw new Error(`${LOCKFILE}: "${name}" is not a mapping`);
};
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

/**
 * @param {Map<string, any>} doc  from parseLockfile
 * @param {Set<string>} workspaceDirs  folders of the workspace packages, posix, relative to the repository root
 * @returns {{ entries: number, problems: Array<{ id: string, kind: string }> }}
 */
export function checkLockfile(doc, workspaceDirs) {
  const version = doc.get('lockfileVersion');
  if (version !== VERSION) {
    throw new Error(`${LOCKFILE} says lockfileVersion ${typeof version === 'string' ? JSON.stringify(version.slice(0, 20)) : 'nothing readable'}; this check reads only ${VERSION}, the version pnpm 10 writes`);
  }
  const packages = mapOf(doc.get('packages'), 'packages');
  const importers = mapOf(doc.get('importers'), 'importers');
  const snapshots = mapOf(doc.get('snapshots'), 'snapshots');
  const problems = [];
  let entries = packages.size;

  for (const [key, entry] of packages) {
    const res = entry instanceof Map ? entry.get('resolution') : undefined;
    const integrity = res instanceof Map && res.size === 1 ? res.get('integrity') : undefined;
    if (REGISTRY_KEY.test(key) && typeof integrity === 'string' && INTEGRITY.test(integrity)) continue;
    problems.push({ id: key, kind: kindOfEntry(key, res) });
  }

  // null when the reference is fine, else the problem's kind
  const badReference = (name, value, { specifier, importer } = {}) => {
    if (value.startsWith('link:')) {
      const target = importer === undefined ? null : posix.normalize(posix.join(importer, value.slice('link:'.length)));
      return specifier?.startsWith('workspace:') && workspaceDirs.has(target) ? null : 'link';
    }
    // a version names its entry as `x.y.z` (with the dependency's name), or in full as `name@…`
    const base = value.split('(')[0];
    return packages.has(`${name}@${base}`) || packages.has(base) ? null : kindOfText(base);
  };
  const walk = (deps, where, ctx) => {
    for (const [name, d] of mapOf(deps, where)) {
      const value = d instanceof Map ? d.get('version') : d;
      if (typeof value !== 'string') throw new Error(`${LOCKFILE}: ${where}/${name} has no version this check can read`);
      const kind = badReference(name, value, { ...ctx, specifier: d instanceof Map ? d.get('specifier') : undefined });
      if (kind) problems.push({ id: `${where}/${name}@${value}`, kind });
    }
  };
  for (const [path, importer] of importers) {
    for (const section of DEP_SECTIONS) {
      const deps = mapOf(importer, `importers/${path}`).get(section);
      entries += mapOf(deps, `importers/${path}/${section}`).size;
      walk(deps, `importers/${path}`, { importer: path });
    }
  }
  for (const [key, snapshot] of snapshots) {
    for (const section of ['dependencies', 'optionalDependencies']) walk(mapOf(snapshot, `snapshots/${key}`).get(section), `snapshots/${key}`, {});
  }
  return { entries, problems };
}
