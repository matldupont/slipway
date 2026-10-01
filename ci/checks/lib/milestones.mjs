// Milestone documents: docs/milestones/*.md. Shared by MS1, K1, F1 and `pnpm status`, so they
// can never disagree about which milestone is active or what its Contents are.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter, PLACEHOLDER } from './frontmatter.mjs';
import { plain, prose, section, strictSection } from './markdown.mjs';
import { UNSAFE } from './report.mjs';

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
//
// A check line (F-09, dev/features/deferred-checks.md §1) is an indented line starting `owed:` or `ran:`, in any
// letter case, with or without a bullet, a task box or emphasis around the word, and whatever invisible characters
// sit in front of it: the line is tested on a copy with every invisible and format character removed (the joiner
// and the variation selectors report.mjs keeps for emoji included), then trimmed, then cut. The copy is for
// detection only. It is never part of `text`, so the marker still ends the item; it goes to `checks`, read or
// `unreadable`. The same line at column 0, straight after an item or its indented lines, is a forgotten indent:
// unreadable, never dropped. Any other column-0 line is ignored as before.
const CHECK_LINE = /^(?:[-*+]\s+)?(?:\[[ xX]\]\s+)?[*_`]{0,3}(?:owed|ran)[*_`]{0,3}:/i;
const INVISIBLE = new RegExp(`${UNSAFE.source}|[\\u200d\\ufe0e\\ufe0f]`, 'gv');
const CHECK_MAX = 500;
export function contents(md) {
  const items = [];
  let under = false;
  for (const line of (section(md, 'Contents', 2) ?? '').split(/\r?\n/)) {
    const open = line.match(/^(\d+)\.\s+(.*)$/);
    const item = items[items.length - 1];
    const indented = /^\s+\S/.test(line);
    // Status runs this in every session's hook: a line is cut before any pattern reads it.
    const cut = line.trimStart().slice(0, CHECK_MAX).trim();
    const check = Boolean(item) && !open && (indented || under) && CHECK_LINE.test(line.replace(INVISIBLE, '').trimStart().slice(0, CHECK_MAX));
    if (open) items.push({ n: Number(open[1]), text: open[2], lines: [] });
    else if (check) item.lines.push({ line: cut, indented });
    else if (item && indented) item.text += ' ' + line.trim();
    under = Boolean(open) || check || (Boolean(item) && indented);
  }
  return items.map(({ n, text, lines }) => {
    const at = marker(text);
    return { n, text, checks: lines.map((l) => (l.indented && at ? readCheck(l.line, at) : null) ?? { kind: 'unreadable', line: l.line }) };
  });
}

// One check line, already trimmed and cut, under an item whose marker is `at`. Exactly one of
//   Owed: {check} — {environment}
//   Ran: {check} — {environment} {yyyy-mm-dd} pass|fail {comment URL}[ · bug #{n}]
// or null. The URL is a comment on the issue the marker names (and in its repository, when the marker names one):
// a pull request's comment, another issue's or any other address is not a recorded run. Read by splitting from
// the end, never by a pattern that could backtrack over the line.
const COMMENT_URL = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/(\d{1,9})#issuecomment-\d{1,20}$/;
function isDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === date;
}
function readCheck(line, at) {
  const kind = line.startsWith('Owed: ') ? 'owed' : line.startsWith('Ran: ') ? 'ran' : null;
  if (!kind) return null;
  let rest = line.slice(line.indexOf(' ') + 1);
  const run = { date: null, result: null, url: null, bug: null };
  if (kind === 'ran') {
    const bug = rest.match(/ · bug #([1-9]\d{0,8})$/);
    if (bug) rest = rest.slice(0, -bug[0].length);
    const words = rest.split(' ');
    if (words.length < 4) return null;
    [run.date, run.result, run.url] = words.slice(-3);
    run.bug = bug ? Number(bug[1]) : null;
    const url = run.url.match(COMMENT_URL);
    if (!isDay(run.date) || !['pass', 'fail'].includes(run.result) || !url || Number(url[2]) !== at.issue) return null;
    if (at.repo && at.repo.toLowerCase() !== url[1].toLowerCase()) return null;
    rest = words.slice(0, -3).join(' ');
  }
  const dash = rest.lastIndexOf(' — ');
  const [check, env] = dash < 0 ? ['', ''] : [rest.slice(0, dash).trim(), rest.slice(dash + 3).trim()];
  return check && env ? { kind, check, env, ...run, line } : null;
}

// The checks an item still owes: every `Owed:` line, every unreadable check line (a line that cannot be read is
// never a pass), and every failed run with no bug named and no pass for the same check text on a later line.
// Read from the last line up, in one pass, so a long list costs no more per line than a short one.
export function owing(item) {
  const passed = new Set();
  const owes = [];
  for (const c of (item.checks ?? []).toReversed()) {
    if (c.kind !== 'ran') owes.push(c);
    else if (c.result === 'pass') passed.add(c.check);
    else if (c.bug === null && !passed.has(c.check)) owes.push(c);
  }
  return owes.reverse();
}

// A Contents item is started when its line ends with the marker /log-feature writes once the item's issue is
// filed (process/intake.md → Milestone item): ` · #12`, or ` · owner/repo#12`. Only the marker counts: an issue
// named anywhere else in the line is a constraint on the slice (`accepts only allowed Origins (#23)`). Status
// runs this in every session's hook, so it reads only the line's last 200 characters, and the pattern is
// anchored at the end.
const MARKER = /(?:^|\s)·\s*(?:([\w.-]+\/[\w.-]+))?#(\d+)$/;
export function started(text) {
  return MARKER.test(text.trimEnd().slice(-200));
}

// The marker's issue: `{ repo, issue, before }`, `repo` null for a bare ` · #12` and `before` the item's text
// without the marker. Null when the item has none, or when its number is 0 or too long to be an issue's.
export function marker(text) {
  const line = text.trimEnd();
  const m = line.slice(-200).match(MARKER);
  return m && m[2].length <= 9 && Number(m[2]) > 0 ? { repo: m[1] ?? null, issue: Number(m[2]), before: line.slice(0, line.length - m[0].length) } : null;
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

// The title without reading the body: frontmatter `title:`, else the body's first line when it is a plain
// `# M<n> — <title>` (or `# <title>`) heading, the template's shape. Anything before it (a comment, a fence, text)
// means no title: a line further down could be anything.
function titleOf(md, fm) {
  if (fm.title) return fm.title;
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  const first = body.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const h1 = first.match(/^#\s+(.+?)\s*$/)?.[1];
  return h1 ? h1.replace(/^M\d+\s*[—–-]\s*/, '') : null;
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
        noGos: noGos(md).map(text).filter(Boolean),
      };
    })
    .filter((m) => m.id);
}
