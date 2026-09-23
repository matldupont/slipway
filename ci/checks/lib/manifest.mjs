// The install manifest and its overrides (F-01, dev/features/template-sync.md). Ships to every project:
// D1 reads both, new-project writes the manifest, and sync (F-01 step 4) rewrites it.
//
// `.slipway/manifest.json` records the slipway sha a project was built from and the sha256 of every
// file slipway wrote, as written. `.slipway/overrides.yaml` lists the managed files the project
// changed on purpose, in the declared YAML subset (lib/yaml-list.mjs):
//
//   overrides:
//     - path: ci/checks/meta/k1-frame.mjs
//       reason: our FRAME.md has no metrics section

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readList } from './yaml-list.mjs';

export const MANIFEST = '.slipway/manifest.json';
export const OVERRIDES = '.slipway/overrides.yaml';

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// null when the project has no manifest. Throws when it has one this code cannot trust: every drift
// finding built on a misread manifest would be wrong, and a path outside the project is never read.
export function readManifest(root) {
  const p = join(root, MANIFEST);
  if (!existsSync(p)) return null;
  let m;
  try {
    m = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    throw new Error(`${MANIFEST} is not valid JSON: ${e.message}`);
  }
  if (!m || typeof m.files !== 'object' || m.files === null || Array.isArray(m.files)) throw new Error(`${MANIFEST} has no files map`);
  for (const [path, f] of Object.entries(m.files)) {
    if (/[\\:]/.test(path) || path.startsWith('/') || path.split('/').some((s) => s === '..' || s === '' || s === '.')) {
      throw new Error(`${MANIFEST}: "${path}" is not a plain relative path`);
    }
    if (typeof f?.class !== 'string' || !/^[0-9a-f]{64}$/.test(f?.sha256 ?? '')) {
      throw new Error(`${MANIFEST}: "${path}" needs a class and a sha256`);
    }
  }
  return m;
}

// [] when there is no overrides file. Throws on a line the declared subset cannot read.
export function readOverrides(root) {
  const p = join(root, OVERRIDES);
  if (!existsSync(p)) return [];
  try {
    return readList(readFileSync(p, 'utf8'), ['path', 'reason'], { strict: true });
  } catch (e) {
    throw new Error(`${OVERRIDES}: ${e.message}`);
  }
}
