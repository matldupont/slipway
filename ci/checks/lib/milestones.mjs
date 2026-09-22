// Milestone documents: docs/milestones/*.md. Shared by MS1, K1 and `pnpm status`, so the
// three can never disagree about which milestone is active.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from './frontmatter.mjs';

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
