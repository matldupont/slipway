// ci/exceptions.yaml, the exception registry: one dated entry per excused finding. FO1 reads the entries that
// excuse a `continue-on-error`; LK1 reads the ones whose id starts `pnpm-lock.yaml#` (lib/pnpm-lock.mjs).
// Both judge an entry's date by expiryProblem, so one rule decides when an excuse has ended.

import { existsSync, readFileSync } from 'node:fs';
import { readList } from './yaml-list.mjs';

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
