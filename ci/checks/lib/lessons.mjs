// Lesson review dates, read by L1 (and by status for its note, after #501's status rewrite).
//
// A fixed review date on one of slipway's lessons is slipway's clock, not the project's: the project cannot move it
// without editing a file slipway maintains, and a sync brings the reviewed lists (the owner, 2026-10-27, AR-6 of
// docs/reviews/2026-10-26-plain-language-0.6.md). Which lessons are slipway's comes from the list sync uses, the
// project's .slipway/manifest.json, never a second list here. A `+<N>d` date counts from the project's own start
// (process/anchor), so it stays the project's question.

import { readManifest, readOverrides, readProjectFile, sha256 } from './manifest.mjs';

export const LESSONS_DIR = 'process/lessons';
export const FIXED_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A review-by as a YYYY-MM-DD day: a fixed date as written, `+<N>d` counted from `anchor`. 'invalid' for any other
// form, null for a relative date with no anchor.
export function dueDate(value, anchor) {
  if (FIXED_DATE.test(value)) return value;
  const m = value.match(/^\+(\d+)d$/);
  if (!m) return 'invalid';
  if (!anchor) return null;
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(m[1]));
  return d.toISOString().slice(0, 10);
}

// The lesson files under process/lessons/ whose fixed review date is slipway's in this project: the manifest lists
// the file as managed, its bytes are the ones the manifest records, and .slipway/overrides.yaml does not name it.
// A lesson the project edited or keeps by override is the project's, and its date is the project's too. Slipway
// itself has no manifest, so every date there is its own. A manifest or overrides file that cannot be read gives
// none: the dates fail as they would without this.
export function slipwayLessons(root) {
  let manifest;
  let overridden;
  try {
    manifest = readManifest(root);
    overridden = new Set(readOverrides(root).map((o) => o.path));
  } catch {
    return new Set();
  }
  if (!manifest) return new Set();
  const held = new Set();
  for (const [p, f] of Object.entries(manifest.files)) {
    if (f.class !== 'managed' || overridden.has(p) || !p.startsWith(`${LESSONS_DIR}/`)) continue;
    const name = p.slice(LESSONS_DIR.length + 1);
    if (name.includes('/')) continue;
    const bytes = readProjectFile(root, p);
    if (Buffer.isBuffer(bytes) && sha256(bytes) === f.sha256) held.add(name);
  }
  return held;
}

// Whether a lesson's review date is slipway's to move in this project: one of `held` (slipwayLessons), with an id
// of slipway's form (L-<n>, never a project's PL-<n>) and a fixed date.
export const slipwaysDate = (held, file, id, reviewBy) => held.has(file) && /^L-\d+$/.test(String(id)) && FIXED_DATE.test(String(reviewBy));
