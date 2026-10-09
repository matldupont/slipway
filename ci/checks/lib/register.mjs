// A review's findings register (docs/reviews/TEMPLATE.md → Register): `| ID | Finding | Sev | Owner | Blocks |
// Tracker |`. The one reader of it, used by `pnpm status`. Columns are found by their header, as the risks table's
// are, so a review written before the Tracker column existed still parses. A Tracker cell counts as filled by the
// rule the risks table uses (lib/risks.mjs): it names an issue, a PRD open decision or a decision.

import { cells, plain, section } from './markdown.mjs';
import { filled, TRACKER } from './risks.mjs';

const COLUMNS = [
  ['id', /^id$/i],
  ['sev', /^sev/i],
  ['blocks', /^block/i],
  ['tracker', /^track/i],
];

const SEVERITY = /^S[0-3]$/;
const isSep = (l) => /^\|[\s:|-]+\|$/.test(l.trim());

// `state` is one of
//   none        the review has no Register section, or the section holds no table
//   unparsed    a table with no ID or Sev header, or with no row whose severity reads S0 to S3
//   ok          `rows` holds one entry per readable row; `hasTracker` is false when the table has no Tracker header
// A row: `{ id, sev, blocks, tracked }`. `id` and `blocks` are the cells as written (plain text); `sev` is S0 to
// S3; `tracked` is true when the Tracker cell is filled with a tracker. A row whose severity does not read S0 to
// S3 (the template's empty row, a placeholder) is left out.
export function readRegister(md) {
  const lines = (section(md, 'Register', 2) ?? '').split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
  const sep = lines.findIndex(isSep);
  if (sep < 1) return { state: 'none', rows: [], hasTracker: false };
  const header = cells(lines[sep - 1]).map(plain);
  const at = Object.fromEntries(COLUMNS.map(([key, re]) => [key, header.findIndex((h) => re.test(h))]));
  if (at.id < 0 || at.sev < 0) return { state: 'unparsed', rows: [], hasTracker: at.tracker >= 0 };
  const rows = [];
  for (const l of lines.slice(sep + 1)) {
    if (isSep(l)) continue;
    const c = cells(l);
    const sev = plain(c[at.sev] ?? '').toUpperCase();
    if (!SEVERITY.test(sev)) continue;
    const tracker = at.tracker >= 0 ? c[at.tracker] ?? '' : '';
    rows.push({
      id: plain(c[at.id] ?? ''),
      sev,
      blocks: at.blocks >= 0 ? plain(c[at.blocks] ?? '') : '',
      tracked: filled(tracker) && TRACKER.test(plain(tracker)),
    });
  }
  return { state: rows.length ? 'ok' : 'unparsed', rows, hasTracker: at.tracker >= 0 };
}

// The milestone ids a Blocks cell names, as `M<n>` tokens only: free text is never guessed at.
export const milestonesNamed = (blocks) => [...new Set([...blocks.matchAll(/\bM\d+\b/gi)].map((m) => m[0].toUpperCase()))];
