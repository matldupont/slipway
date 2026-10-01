// Milestone documents: docs/milestones/*.md. Shared by MS1, K1, F1 and `pnpm status`, so they
// can never disagree about which milestone is active or what its Contents are.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter, PLACEHOLDER } from './frontmatter.mjs';
import { plain, prose, section, strictSection } from './markdown.mjs';

export const MILESTONE_STATUSES = ['shaping', 'active', 'closed', 'killed'];
export const MILESTONE_KINDS = ['skeleton', 'mvp', 'release', 'bet'];

// appetite: `YYYY-MM-DD..YYYY-MM-DD`, both days inclusive.
export function parseAppetite(value) {
  const m = (value ?? '').match(/^(\d{4}-\d{2}-\d{2})\s*\.\.\s*(\d{4}-\d{2}-\d{2})$/);
  return m && m[1] <= m[2] ? { start: m[1], end: m[2] } : null;
}

// Where today sits in an appetite from parseAppetite: day `day` of `of`, both counted from 1, and `overrun` once
// today is past `end`. Shared by `pnpm status` and the roadmap page, so they never count the days differently.
// Before the start, `day` is 0 or less; the caller decides what to show.
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export function appetiteClock(appetite, today) {
  return { day: days(appetite.start, today) + 1, of: days(appetite.start, appetite.end) + 1, end: appetite.end, overrun: appetite.end < today };
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

// Bullets under `## No-gos`: a line starting `-` or `*` opens one; indented lines continue it. Read from the prose
// only, and the heading must start its line, so a `## No-gos` in a code fence, a comment or indented under another
// section's list is never taken for the section. It ends at the next `#` or `##` heading that starts a line.
export function noGos(md) {
  const items = [];
  for (const line of (strictSection(prose(md), 'No-gos', 2) ?? '').split(/\r?\n/)) {
    const open = line.match(/^[-*]\s+(.*)$/);
    if (open) items.push(open[1]);
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += ' ' + line.trim();
  }
  return items;
}

// The title without reading the body: frontmatter `title:`, else the body's first line only when it is exactly
// `# M<n> — <title>`, the template's shape, and the title holds none of `<`, `>`, a backtick, `[` or `]` (a comment,
// code or a link could hide text). Anything else, or anything before it, means no title.
function titleOf(md, fm) {
  if (fm.title) return fm.title;
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  const first = body.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const title = first.match(/^# M\d+ — (.+)$/)?.[1].trim();
  return title && !/[<>`[\]]/.test(title) ? title : null;
}

// The milestones as data, for a view to project from: each document with a frontmatter `id` and a known status,
// in file order. Text is plain (markdown.mjs plain()), on one line, and a value still holding a template
// placeholder is null (or left out of a list). `clock` is set for an active milestone with a valid appetite.
//
// This holds no allowlist, and a view must not pass it through whole. Each view picks the fields it shows by name
// (ci/roadmap.mjs → project()), so a field added here for one view reaches no other. Only `noGos` is read from
// the body's sections; a public view must not show it (D-017, revised 2026-09-30).
export function readMilestoneModel(root, today) {
  const text = (v) => {
    if (typeof v !== 'string') return null;
    const t = plain(v.replace(/\s+/g, ' '));
    return t && !PLACEHOLDER.test(t) ? t : null;
  };
  return readMilestones(root)
    .milestones.filter((m) => m.fm?.id && MILESTONE_STATUSES.includes(m.fm.status))
    .map(({ file, md, fm }) => {
      const appetite = parseAppetite(fm.appetite);
      return {
        file,
        id: text(fm.id),
        title: text(titleOf(md, fm)),
        status: fm.status,
        kind: MILESTONE_KINDS.includes(fm.kind) ? fm.kind : null,
        summary: text(fm.summary),
        appetite,
        extended: text(fm.extended),
        clock: fm.status === 'active' && appetite ? appetiteClock(appetite, today) : null,
        // Read only when a view asks, so the public page never runs prose() on a milestone's body.
        get noGos() {
          return noGos(md).map(text).filter(Boolean);
        },
      };
    })
    .filter((m) => m.id);
}
