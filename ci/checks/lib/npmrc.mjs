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
// What it will not guess at throws, so LK1 exits BROKEN and never passes on a file it could not read: two
// `registry=` lines, an empty or spaced value, a `${VAR}` it cannot resolve, a value the URL parser rejects.
// An `http:` registry, or one with no `registry=` line at all, trusts no host: LK1 then judges every `tarball:` as
// it did before.

export const NPMRC = '.npmrc';

const FIX = 'LK1 trusts the one host `registry=` names — keep a single `registry=https://host/` line with no variable in it, or remove the line and excuse each entry in ci/exceptions.yaml';

/**
 * @param {string} text  the contents of the root .npmrc
 * @returns {string | null}  the host (with its port, when not the scheme's default, lower case) tarballs may come from, or null
 */
export function registryHost(text) {
  const values = [];
  for (const raw of text.split(/\r\n|\n|\r/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith(';') || line.startsWith('#')) continue;
    const m = /^registry\s*=(.*)$/.exec(line);
    if (m) values.push(m[1].trim());
  }
  if (values.length === 0) return null;
  if (values.length > 1) throw new Error(`${NPMRC} has ${values.length} registry= lines, so which host is the registry is unknown — ${FIX}`);
  let value = values[0];
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
  if (!/^\S+$/.test(value) || value.includes('${')) throw new Error(`${NPMRC} has a registry= line this check cannot read as an address (empty, spaced, or a variable) — ${FIX}`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${NPMRC} has a registry= line that is not an address — ${FIX}`);
  }
  return url.protocol === 'https:' ? url.host : null;
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
