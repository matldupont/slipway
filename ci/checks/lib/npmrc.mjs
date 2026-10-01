// .npmrc, read for LK1 (ci/checks/meta/lk1-lockfile.mjs): the one host a lockfile's `tarball:` addresses may be on.
//
// A registry that serves tarballs from a non-default address (Artifactory, Verdaccio, a proxy) makes pnpm write
// `tarball: <url>` beside each package's integrity. LK1 trusts that address only on the host the project's root
// `.npmrc` names with `registry=`. Trusting it is the owner's decision (#147, D-026): a pull request can change
// `.npmrc` and the lockfile together, so `.npmrc` is a gate file (process/harness/settings.json), and the change
// reaches the owner as a `## Gate changes` line instead of arriving unseen.
//
// The guarantee is this, and no more: every `tarball:` the lockfile passes is an https address on the one host this
// reader read from the root `.npmrc`, and it reads a host only from a file in the plain form below. It does not say
// that host is the registry pnpm resolves from: the environment, the home folder's `.npmrc` and scoped lines change
// that, and are not read. If another registry is in force, the lockfile's tarballs sit on a host this reader does
// not trust and LK1 fails them.
//
// The plain form: every line is blank, a comment (`#` or `;` in the first column), or `key=value` where the key is
// made of letters, digits and `_ @ : / . -` and a plain space or tab may surround the `=`. The one key `registry`
// names the host, and its value is `https://host[:port][/path]` with a host of letters, digits, dots and hyphens and
// a path of letters, digits and `._~/-`. Anything else (a `[section]`, an indented line, a quoted or odd key such as
// `registry;x`, a `$`, a quote, `;`, `#`, `@`, a space or a non-ASCII character in the value) trusts no host: LK1
// then judges every `tarball:` as it did before, and its finding says why. That keeps this reader from reading a
// line differently from npm's `ini` reader in a way that makes it trust a host the owner would not recognise in the
// diff. Two `registry=` lines are BROKEN: which is the registry is unknown. Scoped `@scope:registry=` lines are not
// the registry, so a scoped private registry is excused entry by entry.
//
// Credentials and auth settings (`//host/:_authToken=`) are never read, and no value of this file is ever printed: a
// registry URL can carry a user and password.

export const NPMRC = '.npmrc';

// What LK1's finding says when no host is trusted.
export const PLAIN_FORM = 'is not in the plain form this check reads — packages from a private registry need a dated exception, or simplify the file to one registry=https://host/ line';

const FIX = 'LK1 trusts the one host `registry=` names — keep a single `registry=https://host/` line, or remove it and excuse each entry in ci/exceptions.yaml';
const none = (why) => ({ host: null, why });
const SETTING = /^([A-Za-z0-9_@:/.-]+)[ \t]*=[ \t]*(.*?)[ \t]*$/;
const ADDRESS = /^(https?):\/\/([A-Za-z0-9.-]+(?::[0-9]{1,5})?)(?:\/[A-Za-z0-9._~/-]*)?$/;

/**
 * @param {string} text  the contents of the root .npmrc
 * @returns {{ host: string | null, why: string | null }}  the host (with its port, when not the scheme's default, lower case) tarballs may come from, or null with a one-line reason that never holds a value of the file
 */
export function registryHost(text) {
  const values = [];
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (/^[ \t]*$/.test(line) || /^[#;]/.test(line)) continue;
    const m = SETTING.exec(line);
    if (!m) return none(PLAIN_FORM);
    if (m[1] === 'registry') values.push(m[2]);
  }
  if (values.length === 0) return none(null);
  if (values.length > 1) throw new Error(`${NPMRC} has ${values.length} registry= lines, so which host is the registry is unknown — ${FIX}`);
  const a = ADDRESS.exec(values[0]);
  if (!a) return none(PLAIN_FORM);
  if (a[1] !== 'https') return none('names a registry that is not https');
  let url;
  try {
    url = new URL(values[0]);
  } catch {
    return none(PLAIN_FORM);
  }
  return url.host === a[2].toLowerCase() ? { host: url.host, why: null } : none(PLAIN_FORM);
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
