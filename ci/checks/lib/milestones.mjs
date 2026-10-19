// Milestone documents: docs/milestones/*.md. Shared by MS1, K1, F1 and `pnpm status`, so they
// can never disagree about which milestone is active or what its Contents are.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fold } from './feature-docs.mjs';
import { frontmatter, hasPlaceholder, lineRest } from './frontmatter.mjs';
import { plain, prose, section, strictSection } from './markdown.mjs';
import { UNSAFE } from './report.mjs';
import { MISSING, notPlainFile, notPlainFolder } from './review-header.mjs';

export const MILESTONE_STATUSES = ['shaping', 'active', 'closed', 'killed'];
export const MILESTONE_KINDS = ['skeleton', 'mvp', 'release', 'bet', 'test'];

// A `kind: test` milestone exists to run the test of the value risks its `tests:` line names (#477): K1 lets it go
// active while they are untested, refuses its close until each has a Result, and frees no other milestone. Read here
// once, so K1 and `pnpm status` never disagree about which risks a milestone tests. `ids`: the RISK-n ids written,
// upper-cased, each once; `other`: any other word on the line; `placeholder`: the line still holds a template
// placeholder; `long`: the line is over TESTS_MAX characters, so it is not read at all (a cut could turn RISK-12 into
// RISK-1). Null for a milestone of another kind. Status runs this in every session's hook: the length is tested before
// any pattern reads the line.
export const TESTS_MAX = 500;
export function testsLine(fm) {
  if (fm?.kind !== 'test') return null;
  const raw = typeof fm.tests === 'string' ? fm.tests.trim() : '';
  const none = { ids: [], other: [], placeholder: false, long: false };
  if (raw.length > TESTS_MAX) return { ...none, long: true };
  if (hasPlaceholder(raw)) return { ...none, placeholder: true };
  const words = raw.split(/[\s,]+/).filter(Boolean);
  const ids = [...new Set(words.filter((w) => /^RISK-\d{1,9}$/i.test(w)).map((w) => w.toUpperCase()))];
  return { ...none, ids, other: words.filter((w) => !/^RISK-\d{1,9}$/i.test(w)) };
}

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

// A milestone id: `M<n>`, or `M<n>.<k>` for a milestone inserted between M<n> and M<n+1>, so numbers stay in time
// order and nothing written is renumbered (#476). The one shape every reader of an id builds its pattern from.
export const MILESTONE_ID = 'M\\d{1,9}(?:\\.\\d{1,9})?';
const ID = new RegExp(`^${MILESTONE_ID}$`, 'i');

// [n, k] for an id, k -1 for a plain M<n>, so M1 < M1.0 < M1.1 < M1.10 < M2; null for anything else. Numbers are
// read as numbers: M02 is M2.
export function milestoneKey(id) {
  if (typeof id !== 'string' || !ID.test(id)) return null;
  const [n, k] = id.slice(1).split('.');
  return [Number(n), k === undefined ? -1 : Number(k)];
}

// The id as the readers compare it: `M2` for `m02`, `M1.1` for `M01.1`; null for anything else.
export function milestoneId(id) {
  const key = milestoneKey(id);
  return key && `M${key[0]}${key[1] < 0 ? '' : `.${key[1]}`}`;
}

// By number, then sub-number. NaN when either is not an id, so `<`, `<=`, `>=` and `>` are all false for it.
export function compareMilestones(a, b) {
  const [x, y] = [milestoneKey(a), milestoneKey(b)];
  return x && y ? x[0] - y[0] || x[1] - y[1] : NaN;
}

// Every milestone document, TEMPLATE.md and README.md excluded, in id order (M1, M1.1, M2, M10), then by file name;
// a document with no id, or an id of another shape, comes after every id. `fm` is null when the document has no
// frontmatter. `files`, in file-name order, names every `*.md` in the folder that is a regular file reached through no
// link; `refused` names each one that is not (a link, a folder, a device) and is never opened, or the folder itself
// when it is a link, sits under one or is not a folder: then nothing in it is read. MS1 reports each refusal.
const MILESTONES = 'docs/milestones';
export function readMilestones(root) {
  const dir = join(root, MILESTONES);
  const why = notPlainFolder(root, MILESTONES);
  if (why !== null) return { dir, files: [], milestones: [], refused: why === MISSING ? [] : [MILESTONES] };
  const refused = [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .filter((f) => notPlainFile(root, `${MILESTONES}/${f}`) === null || !refused.push(`${MILESTONES}/${f}`));
  const key = (m) => milestoneKey(m.fm?.id);
  const milestones = files
    .filter((f) => f !== 'TEMPLATE.md' && f !== 'README.md')
    .map((f) => {
      const md = readFileSync(join(dir, f), 'utf8');
      return { file: f, md, fm: frontmatter(md) };
    })
    .sort((a, b) => (key(a) && key(b) ? compareMilestones(a.fm.id, b.fm.id) : Boolean(key(b)) - Boolean(key(a))) || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return { dir, files, milestones, refused };
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
    // `N. text`, as /^(\d+)\.\s+(.*)$/ reads it, without that pattern's retry from every space of a long line.
    const num = line.match(/^(\d+)\.(?=\s)/);
    const rest = num ? lineRest(line.slice(num[0].length)) : null;
    const open = rest === null ? null : [line, num[1], rest];
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

// The features a Contents item cites: every `F-<n>` in its text, as numbers, so F-2 and F-02 are one feature.
// Shared by F1 (is each feature scheduled) and the Fit count (is this doc scheduled). The text is folded as a
// heading is (lib/feature-docs.mjs fold()), so a citation written with a look-alike hyphen or digit, or a character
// nobody sees inside it, is the citation a person reads.
export const citedFeatures = (text) => [...fold(text).matchAll(/\bF-(\d+)\b/g)].map((m) => Number(m[1]));

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
    // `- text`, as /^[-*]\s+(.*)$/ reads it, without that pattern's retry from every space of a long line.
    const rest = /^[-*]\s/.test(line) ? lineRest(line.slice(1)) : null;
    if (rest !== null) items.push(rest);
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1] += ' ' + line.trim();
  }
  return items;
}

// The title without reading the body: frontmatter `title:`, else the body's first line only when it is exactly
// `# M<n> — <title>` or `# M<n>.<k> — <title>`, the template's shape, and the title holds none of `<`, `>`, a
// backtick, `[` or `]` (a comment, code or a link could hide text). Anything else, or anything before it, means no title.
const TITLE = new RegExp(`^# ${MILESTONE_ID} — (.+)$`);
function titleOf(md, fm) {
  if (fm.title) return fm.title;
  const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  const first = body.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const title = first.match(TITLE)?.[1].trim();
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
    return t && !hasPlaceholder(t) ? t : null;
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
