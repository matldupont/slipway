// ci/exceptions.yaml, the exception registry: one dated entry per excused finding. FO1 reads the entries that
// excuse a `continue-on-error`; LK1 reads the ones whose id starts `pnpm-lock.yaml#` (lib/pnpm-lock.mjs).
// Both judge an entry's date by expiryProblem, so one rule decides when an excuse has ended.

import { existsSync, readFileSync } from 'node:fs';
import { readList } from './yaml-list.mjs';

export function loadRegistry(path) {
  if (!existsSync(path)) return [];
  return readList(readFileSync(path, 'utf8'), ['id', 'expires', 'reason', 'owner']);
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== expires) return 'not-a-day';
  return expires <= today ? 'expired' : null;
}
