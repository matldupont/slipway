// pnpm-lock.yaml, read for LK1 (ci/checks/meta/lk1-lockfile.mjs): where each package in it comes from.
//
// Two halves. `parseLockfile` (lib/lockfile-yaml.mjs) reads the file in a declared YAML subset (D-004: no
// dependency, and anything outside the subset throws, so LK1 exits BROKEN and never guesses). `checkLockfile`
// walks what it read.
//
// What passes: a `packages` entry whose key is `name@x.y.z` and whose `resolution` is exactly
// `{integrity: <sha hash>}`, or that plus a `tarball:` on the host the project's `.npmrc` `registry=` names
// (lib/npmrc.mjs: https, no user, the host equal as parsed; #147). Anything else is a problem, named by its kind
// (git, tarball, link, file, other): the test is the shapes pnpm writes for a registry release, not a list of the
// shapes to refuse. A `tarball:` on any other host is a problem, and so is one with no integrity, because
// `file:x.tgz` is written beside an integrity too. A workspace package that pnpm installs by copy
// (`injected`) is written `name@file:<folder>` with `{directory: <folder>, type: directory}`: that is the
// project's own code, so it passes when the folder is a workspace package folder (below), written as the set
// holds it: a `..`, `.` or trailing-slash spelling of one is not in the set, so it fails.
// Dependencies point at `packages` entries by key, so a `packages` problem is reported once, where it is
// judged. What has no entry there is judged where it is written: a `link:` in an importer or in a snapshot
// (a `pnpm.overrides` link lands there), and a version no entry answers to. pnpm writes a `link:` for every
// workspace dependency; that is the project's own code (reviewed in its diff), so a `link:` passes when its
// target is a workspace package folder: inside the repository root (`workspaceFolders`, by where the folder
// really is), matched by a `pnpm-workspace.yaml` `packages` glob, with its own package.json. A link outside
// the root, an absolute one, or to any other folder is a problem.

import { realpathSync } from 'node:fs';
import { isAbsolute, join, posix, relative, sep } from 'node:path';
import { LOCKFILE, parseLockfile } from './lockfile-yaml.mjs';
import { onHost } from './npmrc.mjs';

export { LOCKFILE, parseLockfile };
// The prefix of an id in ci/exceptions.yaml that excuses a lockfile entry: `pnpm-lock.yaml#<entry id>`.
export const ID_PREFIX = `${LOCKFILE}#`;
export const VERSION = '9.0';

const NAME = String.raw`(?:@[A-Za-z0-9._~-]+/)?[A-Za-z0-9._~-]+`;
const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`;
const REGISTRY_KEY = new RegExp(`^${NAME}@${SEMVER}$`);
const FILE_KEY = new RegExp(`^${NAME}@file:(.+)$`);
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
// A value is escaped (`\;`, `\=`, `\{`…), so two different resolutions never print as the same id.
const esc = (t) => String(t).replace(/[\\;={}[\]]/g, '\\$&');
const show = (v) =>
  v instanceof Map ? `{${[...v].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => `${esc(k)}=${show(x)}`).join(';')}}` : Array.isArray(v) ? `[${v.map(show).join(';')}]` : esc(v);
const source = (res) => show(new Map(res instanceof Map ? [...res].filter(([k]) => k !== 'integrity') : []));

/**
 * The folders a `link:` may land on: workspace package folders that are inside the repository root, as pnpm
 * lays it out. `pnpm-workspace.yaml` can name a folder outside the root (`../x`), and a folder can be a
 * symlink to one; pnpm counts both as workspace packages, and a link to them leaves the checkout. pnpm skips
 * `node_modules` and `bower_components` folders, and the root itself is not a package to link to.
 * @param {string} root  the repository root
 * @param {string[]} dirs  the folders `discoverWorkspace` found, relative to root
 */
export function workspaceFolders(root, dirs) {
  const top = realpathSync(root);
  const inside = (d) => {
    try {
      const real = relative(top, realpathSync(join(root, d)));
      return real !== '' && real !== '..' && !real.startsWith(`..${sep}`) && !isAbsolute(real);
    } catch {
      return false;
    }
  };
  return new Set(
    dirs
      .map((d) => d.split('\\').join('/'))
      .filter((d) => d !== '' && d !== '.' && !isAbsolute(d) && !d.split('/').some((seg) => ['..', 'node_modules', 'bower_components'].includes(seg)) && inside(d))
  );
}

const mapOf = (v, name) => {
  if (v == null) return new Map();
  if (v instanceof Map) return v;
  throw new Error(`${LOCKFILE}: "${name}" is not a mapping`);
};
const DEP_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

// A `name@file:<folder>` entry for a workspace package folder, as pnpm writes an injected workspace package.
function workspaceCopy(key, res, workspaceDirs) {
  const m = FILE_KEY.exec(key);
  if (!m || !(res instanceof Map) || res.size !== 2) return false;
  const dir = res.get('directory');
  return res.get('type') === 'directory' && typeof dir === 'string' && dir === m[1] && workspaceDirs.has(dir);
}

/**
 * @param {Map<string, any>} doc  from parseLockfile
 * @param {Set<string>} workspaceDirs  folders of the workspace packages, posix, relative to the repository root (not the root itself)
 * @param {string | null} [registryHost]  the host `tarball:` addresses may be on (registryHost in lib/npmrc.mjs); null trusts none
 * @returns {{ entries: number, problems: Array<{ id: string, kind: string }> }}
 */
export function checkLockfile(doc, workspaceDirs, registryHost = null) {
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
    const integrity = res instanceof Map ? res.get('integrity') : undefined;
    const shape = res instanceof Map && (res.size === 1 || (res.size === 2 && onHost(res.get('tarball'), registryHost)));
    if (REGISTRY_KEY.test(key) && shape && typeof integrity === 'string' && INTEGRITY.test(integrity)) continue;
    if (workspaceCopy(key, res, workspaceDirs)) continue;
    problems.push({ id: `${key}${source(res)}`, kind: kindOfEntry(key, res) });
  }

  // null when the reference is fine, else the problem's kind
  const badReference = (name, value, { importer }) => {
    if (value.startsWith('link:')) {
      const target = value.slice('link:'.length);
      // an absolute or Windows path is not relative to anything: pnpm resolves it as written, so it is never a workspace folder
      if (/^[\\/]|\\|^[A-Za-z]:/.test(target)) return 'link';
      // relative to the importer's folder (a snapshot's, to the repository root); a workspace package folder passes
      return workspaceDirs.has(posix.normalize(posix.join(importer, target))) ? null : 'link';
    }
    // a version names its entry as `x.y.z` (with the dependency's name), or in full as `name@…`
    const base = value.split('(')[0];
    return packages.has(`${name}@${base}`) || packages.has(base) ? null : kindOfText(base);
  };
  const walk = (deps, where, ctx) => {
    for (const [name, d] of mapOf(deps, where)) {
      const value = d instanceof Map ? d.get('version') : d;
      if (typeof value !== 'string') throw new Error(`${LOCKFILE}: ${where}/${name} has no version this check can read`);
      const kind = badReference(name, value, ctx);
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
    for (const section of ['dependencies', 'optionalDependencies']) walk(mapOf(snapshot, `snapshots/${key}`).get(section), `snapshots/${key}`, { importer: '.' });
  }
  return { entries, problems };
}
