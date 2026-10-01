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
import { strictSection } from './markdown.mjs';

// The value of an AGENT.md table row: the cell's first `code` span, or its first word; the rest of the cell may
// explain it. '' when there is no row. `row` is matched as written, whole and case-insensitive, in the raw text:
// the first such row wins, a commented or fenced one included, so nothing that publishes reads through this
// (ci/roadmap.mjs has its own switch). `within` names the `##` section the row must sit in; without it, any row
// counts. `file` names another file under `root` with the same table (slipway's own dev/skill-configuration.md).
export function agentRow(root, row, within, file = 'AGENT.md') {
  const p = join(root, file);
  const text = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const agent = within ? strictSection(text, within, 2) ?? '' : text;
  const name = row.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // The cell is one greedy run up to the next `|` (a line break included, as before), trimmed after: with no `\s*`
  // on either side to trade characters with, a long cell with no closing `|` cannot backtrack.
  const cell = (agent.match(new RegExp(`^\\|[ \\t]*${name}[ \\t]*\\|([^|]*)\\|`, 'im'))?.[1] ?? '').trim();
  return (cell.match(/`([^`]+)`/)?.[1] ?? cell.split(/\s/)[0]).trim();
}

export function zone(root) {
  const value = agentRow(root, 'Timezone');
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
