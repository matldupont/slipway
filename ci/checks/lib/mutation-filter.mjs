// The filtered screen of the tests-can-fail run (dev/features/tests-can-fail.md §3.9, D-057, #681). A run filtered to the
// new tests still open only says a change left them all passing. It never credits a kill: anything else it shows sends
// the same change to a whole-file run, which alone decides.

import { Stop } from './mutation-calls.mjs';
import { escapeRegExp } from './mutation-processes.mjs';

// In bytes: Linux refuses one argument of 128 KiB. Past this the file runs whole.
export const FILTER_MAX = 64 * 1024;

// A test of a run is known by its place (line and column) and its name together, never by one alone (#655).
export const keyOf = (t) => `${t.line}:${t.column}\u0000${t.name}`;

/**
 * The name filter for these tests, each name escaped and anchored, so a name with pattern characters matches only
 * itself. Vitest 4 matches a test's titles joined by a space and Vitest 5 by ` > `, so the filter holds both spellings.
 * A second test that one spelling also matches runs too and is not read. Null when a test has neither, a name holds a
 * NUL (no process can be passed one), or the filter is too long.
 * @param {Array<{ name?: string, fullName?: string | null }>} tests
 * @returns {string | null}
 */
export function nameFilter(tests) {
  const spellings = tests.map((t) => [t.name, t.fullName].filter((n) => typeof n === 'string' && n));
  if (!tests.length || spellings.some((s) => !s.length || s.some((n) => n.includes('\0')))) return null;
  const filter = `^(?:${[...new Set(spellings.flat())].map(escapeRegExp).join('|')})$`;
  return Buffer.byteLength(filter) > FILTER_MAX ? null : filter;
}

/** Whether a run loaded the file and every one of these tests passed in it. A skipped or missing test did not. */
export function allPassed(res, open) {
  if (res.hung || res.none || !res.loaded) return false;
  const passed = new Set(res.tests.filter((t) => t.status === 'passed').map(keyOf));
  return open.every((g) => passed.has(g.key));
}

/** D-057: a filtered run counts only beside a clean run with the same filter; any other stops the run, never a pass. */
export function sameFilter(clean, filter) {
  if (clean?.filter !== filter) throw new Stop('A filtered run of a test file had no clean run with the same filter, so this step cannot read it. This is a fault in the step, not in your tests: tell the owner, who reports it to slipway without file or test names of the project.');
}
