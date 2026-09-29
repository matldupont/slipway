// Milestone documents: docs/milestones/*.md. Shared by MS1, K1, F1 and `pnpm status`, so they
// can never disagree about which milestone is active or what its Contents are.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from './frontmatter.mjs';
import { section } from './markdown.mjs';

export const MILESTONE_STATUSES = ['shaping', 'active', 'closed', 'killed'];
export const MILESTONE_KINDS = ['skeleton', 'mvp', 'release', 'bet'];

// appetite: `YYYY-MM-DD..YYYY-MM-DD`, both days inclusive.
export function parseAppetite(value) {
  const m = (value ?? '').match(/^(\d{4}-\d{2}-\d{2})\s*\.\.\s*(\d{4}-\d{2}-\d{2})$/);
  return m && m[1] <= m[2] ? { start: m[1], end: m[2] } : null;
}

// Every milestone document, TEMPLATE.md and README.md excluded. `fm` is null when the
// document has no frontmatter.
export function readMilestones(root) {
  const dir = join(root, 'docs', 'milestones');
  if (!existsSync(dir)) return { dir, files: [], milestones: [] };
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  const milestones = files
    .filter((f) => f !== 'TEMPLATE.md' && f !== 'README.md')
    .map((f) => {
      const md = readFileSync(join(dir, f), 'utf8');
      return { file: f, md, fm: frontmatter(md) };
    });
  return { dir, files, milestones };
}

// Contents items: a line starting `N.` opens an item; indented lines continue it. `n` is the number
// written, so a list numbered `1. 1. 1.` gives three items numbered 1.
export function contents(md) {
  const items = [];
  for (const line of (section(md, 'Contents', 2) ?? '').split(/\r?\n/)) {
    const open = line.match(/^(\d+)\.\s+(.*)$/);
    if (open) items.push({ n: Number(open[1]), text: open[2] });
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1].text += ' ' + line.trim();
  }
  return items;
}

// A Contents item is started when its line ends with the marker /log-feature writes once the item's issue is
// filed (process/intake.md → Milestone item): ` · #12`, or ` · owner/repo#12`. Only the marker counts: an issue
// named anywhere else in the line is a constraint on the slice (`accepts only allowed Origins (#23)`). Status
// runs this in every session's hook, so it reads only the line's last 200 characters, and the pattern is
// anchored at the end.
const MARKER = /(?:^|\s)·\s*(?:[\w.-]+\/[\w.-]+)?#\d+$/;
export function started(text) {
  return MARKER.test(text.trimEnd().slice(-200));
}
