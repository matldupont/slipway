// pnpm-lock.yaml, read for LK1 (ci/checks/meta/lk1-lockfile.mjs): where each package in it comes from.
//
// Two halves. `parseLockfile` (lib/lockfile-yaml.mjs) reads the file in a declared YAML subset (D-004: no
// dependency, and anything outside the subset throws, so LK1 exits BROKEN and never guesses). `checkLockfile`
// walks what it read.
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
import { LOCKFILE, parseLockfile } from './lockfile-yaml.mjs';

export { LOCKFILE, parseLockfile };
// The prefix of an id in ci/exceptions.yaml that excuses a lockfile entry: `pnpm-lock.yaml#<entry id>`.
export const ID_PREFIX = `${LOCKFILE}#`;
export const VERSION = '9.0';

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

// What a resolution says beside its integrity, in a fixed order: `{tarball=https://…}`, `{commit=…;repo=…;type=git}`.
// An entry's id carries it, so an excuse names where the package comes from and not only its key: `foo@1.0.0`
// says nothing about a tarball address, and the entry under it could be changed to another source.
const show = (v) =>
  v instanceof Map ? `{${[...v].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => `${k}=${show(x)}`).join(';')}}` : Array.isArray(v) ? `[${v.map(show).join(';')}]` : String(v);
const source = (res) => show(new Map(res instanceof Map ? [...res].filter(([k]) => k !== 'integrity') : []));

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
    problems.push({ id: `${key}${source(res)}`, kind: kindOfEntry(key, res) });
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
