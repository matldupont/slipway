// ci/exceptions.yaml, the exception registry: one dated entry per excused finding. FO1 reads the entries that
// excuse a `continue-on-error`; LK1 reads the ones whose id starts `pnpm-lock.yaml#` (lib/pnpm-lock.mjs); DS1 the
// ones whose id starts `docs/milestones#` (MILESTONE_PREFIX). All judge an entry's date by expiryProblem, so one rule
// decides when an excuse has ended, and LK1 and DS1 judge its reason and owner by said().

import { existsSync, readFileSync } from 'node:fs';
import { readList } from './yaml-list.mjs';

// DS1's entries: `docs/milestones#<id>/accessibility`, a milestone whose screens cannot yet show how they meet
// WCAG 2.2 AA (F-14 §3). Every id with this prefix is DS1's to judge, a malformed one included; FO1 skips them.
export const MILESTONE_PREFIX = 'docs/milestones#';

// Text that says something: a word or number, not blank, YAML's spellings of no value, or an indicator (`|`, `[]`,
// `&a`, `!!null`).
export const said = (v) => typeof v === 'string' && /[\p{L}\p{N}]/u.test(v) && !/^[\s|>&*!%@`[{]/.test(v) && !['null', '~'].includes(v.trim().toLowerCase());

// Read strictly: a line that is not an entry, a named field or the list's own key throws, so a mistyped key can
// never fold the lines after it into the entry above. The message names the file and the line.
export function loadRegistry(path) {
  if (!existsSync(path)) return [];
  try {
    return readList(readFileSync(path, 'utf8'), ['id', 'expires', 'reason', 'owner'], { strict: true });
  } catch (e) {
    throw new Error(`ci/exceptions.yaml: ${e.message}`);
  }
}

/**
 * When an entry's `expires:` has ended, as text: null while it still applies, else why not.
 * `expires` is the first day the excuse no longer applies, so today is already past it. A value that is not
 * a real yyyy-mm-dd day is refused outright: compared as text, `never` sorts after every year and
 * `2026-99-99` after every real day, and either would excuse forever.
 * @param {string | undefined} expires
 * @param {string} today  yyyy-mm-dd, from lib/clock.mjs
 * @returns {null | 'none' | 'not-a-day' | 'expired'}
 */
export function expiryProblem(expires, today) {
  if (!expires) return 'none';
  const day = new Date(`${expires}T00:00:00Z`);
  // a real day reads back as itself, which also fixes the spelling: 2026-9-30 and 2026-02-30 do not
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== expires) return 'not-a-day';
  return expires <= today ? 'expired' : null;
}
