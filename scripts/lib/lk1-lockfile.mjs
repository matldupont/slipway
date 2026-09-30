// What the LK1 tests share: a lockfile in the shape pnpm 10 writes, built from a few parts.
export const HASH = `sha512-${'A'.repeat(86)}==`;
export const HEAD = "lockfileVersion: '9.0'\n\n";
export const registry = (name = 'a', version = '1.0.0') => `  ${name}@${version}:\n    resolution: {integrity: ${HASH}}\n\n`;
export const lockfile = ({ deps = [['a', '^1.0.0', '1.0.0']], packages = registry(), snapshots = '  a@1.0.0: {}\n' } = {}) =>
  `${HEAD}importers:\n\n  .:\n    dependencies:\n${deps.map(([n, s, v]) => `      ${n}:\n        specifier: ${s}\n        version: ${v}\n`).join('')}\npackages:\n\n${packages}snapshots:\n\n${snapshots}`;
