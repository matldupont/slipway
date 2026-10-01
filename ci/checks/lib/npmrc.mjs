// .npmrc, read for LK1 (ci/checks/meta/lk1-lockfile.mjs): the one host a lockfile's `tarball:` addresses may be on.
//
// A registry that serves tarballs from a non-default address (Artifactory, Verdaccio, a proxy) makes pnpm write
// `tarball: <url>` beside each package's integrity. LK1 trusts that address only on the host the project's root
// `.npmrc` names with `registry=`. Trusting it is the owner's decision (#147): a pull request can change `.npmrc`
// and the lockfile together, so `.npmrc` is a gate file (process/harness/settings.json), and the change reaches
// the owner as a `## Gate changes` line instead of arriving unseen.
//
// What is read: the `registry=` line, nothing else. Scoped `@scope:registry=` lines are not read, so a scoped
// private registry is still excused entry by entry. Credentials and auth settings (`//host/:_authToken=`) are
// never read, and no value of this file is ever printed: a registry URL can carry a user and password.
//
// The host LK1 trusts must be the one pnpm uses, and pnpm reads this file with the `ini` package. Where this reader
// and `ini` could name different hosts, no host is trusted and `why` says so, so LK1 judges every `tarball:` as it
// did before: a `;` or `#` (ini ends the value there, a URL parser reads `good.invalid;@bad.invalid` as a user and
// a host), a `\` or `@` or a space in the value, a `${VAR}`, a `[section]` anywhere (ini nests what follows),
// and a space other than a plain one around the key. Two `registry=` lines are BROKEN: which is the registry is
// unknown. An `http:` registry, or one with no `registry=` line, trusts no host either.

export const NPMRC = '.npmrc';

const FIX = 'LK1 trusts the one host `registry=` names — keep a single `registry=https://host/` line, or remove it and excuse each entry in ci/exceptions.yaml';
const none = (why) => ({ host: null, why });
const trimmed = (v) => v.replace(/^[ \t]+|[ \t]+$/g, '');

/**
 * @param {string} text  the contents of the root .npmrc
 * @returns {{ host: string | null, why: string | null }}  the host (with its port, when not the scheme's default, lower case) tarballs may come from, or null with a one-line reason that never holds a value of the file
 */
export function registryHost(text) {
  const values = [];
  for (const raw of text.split(/\r\n|\n|\r/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith(';') || line.startsWith('#')) continue;
    if (line.startsWith('[')) return none('has a [section] header, which npm reads as settings of that section');
    const m = /^(["']?)registry\1(\s*)=(.*)$/.exec(line);
    if (!m) continue;
    if (/[^ \t]/.test(m[2])) return none('has a registry= line spaced with a character other than a plain space');
    values.push(trimmed(m[3]));
  }
  if (values.length === 0) return none(null);
  if (values.length > 1) throw new Error(`${NPMRC} has ${values.length} registry= lines, so which host is the registry is unknown — ${FIX}`);
  let value = values[0];
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
  if (!/^[^\s;#\\@$]+$/.test(value)) return none('has a registry= line this check cannot read as one plain address (a comment, a variable, a space, a user or an escape in it)');
  let url;
  try {
    url = new URL(value);
  } catch {
    return none('has a registry= line that is not an address');
  }
  return url.protocol === 'https:' ? { host: url.host, why: null } : none('names a registry that is not https');
}

/**
 * Whether a lockfile's `tarball:` value is an https address on `host`: parsed as a URL, never matched as text, with no
 * user or password, no whitespace or control characters (the parser would drop them), and the host equal as parsed.
 * @param {unknown} tarball
 * @param {string | null} host  from registryHost
 */
export function onHost(tarball, host) {
  if (host === null || typeof tarball !== 'string' || /[\s\u0000-\u001f\u007f]/.test(tarball)) return false;
  let url;
  try {
    url = new URL(tarball);
  } catch {
    return false;
  }
  return url.protocol === 'https:' && url.username === '' && url.password === '' && url.host === host;
}
