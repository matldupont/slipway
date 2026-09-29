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

// A Contents item is started when its tail — the text after its last `(F-…)` or `(no feature: …)` group, or
// all of it when it has none — names an issue: `#12` or `owner/repo#12`, after a space, `(`, `,`, `;` or `·`.
// An issue named before the citation is a constraint on the slice (`accepts only allowed Origins (#23)`), not
// the slice's own; `M1#2` is not an issue. /log-feature writes the marker as ` · #{issue}`
// (process/intake.md → Milestone item).
// `[^()]*` on both sides of the F-ID keeps the match linear: status runs this in every session's hook.
const CITATION = /\([^()]*\bF-\d+[^()]*\)|\(\s*no feature:[^)]*\)/gi;
const ISSUE = /(?:^|[\s(,;·])(?:[\w.-]+\/[\w.-]+)?#\d+\b/;
export function started(text) {
  const cites = [...text.matchAll(CITATION)];
  const last = cites.at(-1);
  return ISSUE.test(last ? text.slice(last.index + last[0].length) : text);
}
