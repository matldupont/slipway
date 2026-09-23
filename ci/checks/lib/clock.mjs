// "Today" for `pnpm status` and the checks that compare dates. Read in the project's zone, not UTC: a
// UTC date stamps tomorrow from 20:00 in Toronto, and an owner who copies it into a change log or a
// decision dates it in the future.
//
// The zone is the `Timezone` row of AGENT.md §Skill Configuration — an IANA zone (America/Toronto) or
// `local`. No row, `local` or an unfilled `<…>` reads the machine's zone; a zone Intl does not know
// throws, rather than quietly falling back to one nobody chose. CHECK_TODAY (yyyy-mm-dd) fixes
// the date outright; CHECK_NOW (an ISO instant) fixes the clock and still applies the zone, so a fixture
// can prove the zone is read.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function zone(root) {
  const p = join(root, 'AGENT.md');
  const agent = existsSync(p) ? readFileSync(p, 'utf8') : '';
  // The value is the cell's first `code` span, or its first word; the rest of the cell may explain it.
  const cell = agent.match(/^\|\s*Timezone\s*\|\s*([^|]*?)\s*\|/im)?.[1] ?? '';
  const value = (cell.match(/`([^`]+)`/)?.[1] ?? cell.split(/\s/)[0]).trim();
  return !value || value === 'local' || value.startsWith('<') ? undefined : value;
}

export function today(root) {
  if (process.env.CHECK_TODAY) return process.env.CHECK_TODAY;
  const now = process.env.CHECK_NOW ? new Date(process.env.CHECK_NOW) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`CHECK_NOW "${process.env.CHECK_NOW}" is not an ISO instant`);
  const tz = zone(root);
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  } catch {
    throw new Error(`AGENT.md Timezone "${tz}" is not an IANA zone (America/Toronto) or local`);
  }
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
