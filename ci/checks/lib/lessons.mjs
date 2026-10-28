// Lesson review dates, read by L1 (and by status for its note, after #501's status rewrite).
//
// A fixed review date on one of slipway's lessons is slipway's clock, not the project's: the project cannot move it
// without editing a file slipway maintains, and a sync brings the reviewed lists (the owner, 2026-10-27, AR-6 of
// docs/reviews/2026-10-26-plain-language-0.6.md). Which lessons are slipway's comes from the list sync uses, the
// project's .slipway/manifest.json, never a second list here. A `+<N>d` date counts from the project's own start
// (process/anchor), so it stays the project's question. The project answers it in a file of its own,
// process/lesson-reviews.yaml (#554): a review line moves that lesson's clock to the review's day, with no edit to the
// lesson, so D1 never sees one.

import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { said } from './exceptions.mjs';
import { readManifest, readOverrides, readProjectFile, sha256 } from './manifest.mjs';
import { readList } from './yaml-list.mjs';

export const LESSONS_DIR = 'process/lessons';
export const REVIEWS = 'process/lesson-reviews.yaml';
export const FIXED_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const RELATIVE = /^\+(\d+)d$/;

// `day` plus `n` days, as YYYY-MM-DD; null when `day` is not a date.
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// A real YYYY-MM-DD day: one that reads back as itself, so 2026-02-30 and 2026-9-30 are not.
export const isDay = (v) => FIXED_DATE.test(String(v)) && addDays(v, 0) === v;

// A review-by as a YYYY-MM-DD day: a fixed date as written, `+<N>d` counted from `anchor`, or from `reviewed`, the
// latest review the project recorded for the lesson (latestReviews), when there is one. 'invalid' for any other form,
// null for a relative date with no anchor and no review.
export function dueDate(value, anchor, reviewed = null) {
  if (FIXED_DATE.test(value)) return value;
  const m = value.match(RELATIVE);
  if (!m) return 'invalid';
  const from = reviewed ?? anchor;
  if (!from) return null;
  return addDays(from, Number(m[1])) ?? 'invalid';
}

// The project's review lines, process/lesson-reviews.yaml, read strictly (lib/yaml-list.mjs). No file is no answers:
// a project made before #554 has none until a sync adds slipway's empty copy. A file that is there but cannot be read
// (a mistyped key, a directory, a link: it is read only as a regular file) gives `error`, the reason with its line, and never reads as
// no answers.
export function readReviews(root) {
  const p = join(root, REVIEWS);
  try {
    if (!lstatSync(p).isFile()) return { exists: true, reviews: [], error: 'not a regular file' };
  } catch (e) {
    if (e.code === 'ENOENT') return { exists: false, reviews: [], error: null };
    return { exists: true, reviews: [], error: e.code ?? String(e) };
  }
  try {
    return { exists: true, reviews: readList(readFileSync(p, 'utf8'), ['lesson', 'reviewed', 'reason'], { strict: true }), error: null };
  } catch (e) {
    return { exists: true, reviews: [], error: e.code ?? e.message };
  }
}

// What is wrong with one review line, as [rule, detail], or null. `lessons` maps each lesson id to its review-by.
export function reviewProblem(r, lessons, today) {
  if (!r.lesson || !r.reviewed || !said(r.reason)) return ['reviews/invalid', 'needs lesson, reviewed (YYYY-MM-DD) and reason ("still holds", or what changed)'];
  if (!isDay(r.reviewed)) return ['reviews/invalid', `reviewed "${r.reviewed}" is not a real YYYY-MM-DD day`];
  if (!lessons.has(r.lesson)) return ['reviews/unknown-lesson', `no lesson in process/lessons has the id ${r.lesson}`];
  if (!RELATIVE.test(String(lessons.get(r.lesson)))) return ['reviews/fixed-date', `${r.lesson}'s review-by is a fixed date, not +<N>d, so no review line moves it: in a project, slipway's fixed dates are slipway's to move by sync (#548), and a project's own lesson moves its date in the lesson`];
  if (r.reviewed > today) return ['reviews/future', `reviewed ${r.reviewed} is after today (${today}): record a review on the day it was made`];
  return null;
}

// The latest review day per lesson id, from the lines with no problem. Latest by date, not by place in the file, so a
// line added later for an earlier day never moves a clock back.
export function latestReviews(reviews, lessons, today) {
  const latest = new Map();
  for (const r of reviews) {
    if (reviewProblem(r, lessons, today)) continue;
    if (!latest.has(r.lesson) || r.reviewed >= latest.get(r.lesson)) latest.set(r.lesson, r.reviewed);
  }
  return latest;
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
