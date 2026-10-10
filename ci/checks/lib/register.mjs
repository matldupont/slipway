// A review's findings register (docs/reviews/TEMPLATE.md → Register): `| ID | Finding | Sev | Owner | Blocks |
// Tracker |`. The one reader of it, used by `pnpm status`. Columns are found by their header, as the risks table's
// are, so a review written before the Tracker column existed still parses. A Tracker cell counts as filled by the
// rule the risks table uses (lib/risks.mjs): it names an issue, a PRD open decision or a decision.

import { plain, section, table } from './markdown.mjs';
import { filled, TRACKER } from './risks.mjs';

const COLUMNS = [
  ['id', /^id$/i],
  ['sev', /^sev/i],
  ['blocks', /^block/i],
  ['tracker', /^track/i],
];

// The severity is the cell's first word: `S1`, and also `S1 / money` or `S0 (blocker)`.
const SEVERITY = /^(S[0-3])(?![\w])/i;

// A Tracker cell longer than this is not read: the patterns that read it can retry the rest of the text from every
// position, so a review in a pull request could make status slow with one long cell. Such a cell counts as not
// tracked, so the error is one extra line, never a finding left out. No other cell is cut: a cut could split a
// token and name another milestone.
const MAX_TRACKER = 200;

// `state` is one of
//   none        the review has no Register section, or the section holds no table
//   unparsed    a table with no ID or Sev header, or with rows whose severity reads none of S0 to S3
//   ok          `rows` holds one entry per readable row; `hasTracker` is false when the table has no Tracker header;
//               `skipped` counts the rows with a severity cell that reads none of S0 to S3
// A row: `{ id, sev, blocks, tracked }`. `id` and `blocks` are the cells as written (plain text); `sev` is S0 to
// S3; `tracked` is true when the Tracker cell is filled with a tracker. A row with an empty Sev cell (the
// template's row) is no finding. Only the first table of the section is read.
export function readRegister(md) {
  const t = table(section(md, 'Register', 2) ?? '');
  if (!t) return { state: 'none', rows: [], hasTracker: false, skipped: 0 };
  const at = Object.fromEntries(COLUMNS.map(([key, re]) => [key, t.header.findIndex((h) => re.test(h))]));
  const hasTracker = at.tracker >= 0;
  if (at.id < 0 || at.sev < 0) return { state: 'unparsed', rows: [], hasTracker, skipped: 0 };
  const rows = [];
  let skipped = 0;
  for (const c of t.rows) {
    if (c.every((x) => /^:?-+:?$/.test(x))) continue; // a stray separator line
    const said = plain(c[at.sev] ?? '');
    const sev = said.match(SEVERITY)?.[1].toUpperCase();
    if (!sev) {
      if (said) skipped++;
      continue;
    }
    const tracker = hasTracker ? c[at.tracker] ?? '' : '';
    rows.push({
      id: plain(c[at.id] ?? ''),
      sev,
      blocks: at.blocks >= 0 ? plain(c[at.blocks] ?? '') : '',
      tracked: tracker.length <= MAX_TRACKER && filled(tracker) && TRACKER.test(plain(tracker)),
    });
  }
  return { state: !rows.length && skipped ? 'unparsed' : 'ok', rows, hasTracker, skipped };
}

// The milestone ids a Blocks cell names, as `M<n>` tokens only: free text is never guessed at.
export const milestonesNamed = (blocks) => [...new Set([...blocks.matchAll(/\bM\d+\b/g)].map((m) => m[0]))];
