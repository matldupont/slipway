// The FRAME Risks table and the evidence files behind it. Shared by K1 and `pnpm status`, so the
// two can never disagree about whether a risk is tested, scheduled or untested.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PLACEHOLDER } from './frontmatter.mjs';
import { section } from './markdown.mjs';
import { parseAppetite } from './milestones.mjs';

// Where the real answer is being chased: an issue (#14, owner/repo#14), a PRD open decision (OD-3)
// or a decision (D-7).
export const TRACKER = /(?:[\w.-]+\/[\w.-]+)?#\d+|\b(?:OD|D)-\d+\b/;

export const filled = (c) => !!c && !PLACEHOLDER.test(c);

// Columns are found by their header, so a FRAME written before a column existed still parses. The
// order here is the template's: a column whose header was renamed takes its template position, unless
// another recognised header already holds that position, or the table has more unrecognised headers than
// renamed columns (an added column shifts the positions, so none can be trusted). Then it is `missing`,
// and K1 says so rather than read the wrong cell. Tracker has no position: a table without the header
// has no Tracker column.
const COLUMNS = [
  ['id', /^id$/i],
  ['assumption', /^assumption/i],
  ['category', /^category/i],
  ['impact', /^impact/i],
  ['test', /^cheapest test/i],
  ['threshold', /^threshold/i],
  ['result', /^result/i],
  ['tracker', /^tracker/i],
];

// The columns a check reads; the others only help a person.
const REQUIRED = ['id', 'category', 'threshold', 'result'];

const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());
const plain = (c) => c.replace(/[*_`]/g, '').trim();

// docs/product/evidence/*.md, README.md excluded. A file named `RISK-n-…` or a `RISK-n` heading opens
// that risk, until a heading at the same or a higher level closes it; `Tracked: #n` and
// `Window: <from>..<to>` lines inside belong to it. The first of each wins. A window that does not parse
// is kept as 'unreadable' so status can say so.
function readEvidence(root) {
  const dir = join(root, 'docs', 'product', 'evidence');
  const out = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()) {
    const fileId = f.match(/^(RISK-\d+)\b/i)?.[1].toUpperCase() ?? null;
    let id = fileId;
    let level = 0; // 0: opened by the file name, so no heading closes it
    const lines = readFileSync(join(dir, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.replace(/\*\*/g, '');
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const risk = heading[2].match(/^(RISK-\d+)\b/i);
        if (risk) [id, level] = [risk[1].toUpperCase(), heading[1].length];
        else if (heading[1].length <= level) [id, level] = [fileId, 0];
        continue;
      }
      if (!id) continue;
      const e = (out[id] ??= {});
      const tracked = line.match(/^[\s>*_-]*Tracked:\s*(.*)$/i);
      if (tracked && !e.tracker) e.tracker = tracked[1].match(TRACKER)?.[0] ?? null;
      const window = line.match(/^[\s>*_-]*Window:\s*(.*)$/i);
      if (window && !e.window) e.window = parseAppetite(window[1].trim()) ?? 'unreadable';
    }
  }
  return out;
}

// `rows`: one entry per `| RISK-n |` row. Its `tracker` is FRAME's Tracker cell, or the evidence file's
// `Tracked:` line when the cell names none; `window` comes from the evidence file only.
// `missing`: the columns a check reads that the table has no readable header for.
export function readRisks(root, frameMd) {
  const lines = (section(frameMd, 'Risks', 2) ?? '').split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
  // The header is the row above the last |---| separator before the first RISK row, so another table
  // above the risk table (a legend) is not read as its header.
  const firstRow = lines.findIndex((l) => /^\|\s*RISK-\d+\s*\|/.test(l));
  const sep = lines.slice(0, firstRow < 0 ? lines.length : firstRow).findLastIndex((l) => /^\|[\s:|-]+\|$/.test(l.trim()));
  const header = sep > 0 ? cells(lines[sep - 1]).map(plain) : null;
  const matched = Object.fromEntries(COLUMNS.map(([key, re]) => [key, header ? header.findIndex((h) => re.test(h)) : -1]));
  const claimed = new Set(Object.values(matched).filter((n) => n >= 0));
  const unrecognised = header ? header.filter((_, n) => !claimed.has(n)).length : 0;
  const renamed = COLUMNS.filter(([key]) => key !== 'tracker' && matched[key] < 0).length;
  const at = {};
  const missing = [];
  COLUMNS.forEach(([key], i) => {
    if (matched[key] >= 0) at[key] = matched[key];
    else if (key === 'tracker') return;
    else if (!claimed.has(i) && unrecognised <= renamed) at[key] = i;
    else if (REQUIRED.includes(key)) missing.push(key);
  });
  const evidence = readEvidence(root);
  const rows = lines
    .filter((l) => /^\|\s*RISK-\d+\s*\|/.test(l))
    .map((l) => {
      const c = cells(l);
      const row = Object.fromEntries(Object.entries(at).map(([key, n]) => [key, c[n] ?? '']));
      const ev = evidence[(row.id ?? '').toUpperCase()] ?? {};
      return {
        ...row,
        value: /\bvalue\b/i.test(row.category ?? ''),
        tested: filled(row.result),
        tracker: (filled(row.tracker) && row.tracker.match(TRACKER)?.[0]) || ev.tracker || null,
        window: ev.window ?? null,
      };
    });
  return { rows, missing };
}
