// What the work-order page reads from an issue body written by anyone who can open an issue (F-07,
// dev/features/work-order.md): three things, nothing else. Everything here returns plain values (numbers, a cut
// string, validated path entries), so what reaches a page cannot be a sentence someone else wrote, apart from the
// designation, which the page escapes.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { plain, prose, section } from './markdown.mjs';

const DESIGNATION_MAX = 600;
const BLOCKERS_MAX = 50;
const TOUCHES_MAX = 30;
const ENTRY_MAX = 120;
const ENTRY = /^[A-Za-z0-9._\-/*]+$/;

// A segment of the `### Links` line: the text after `Label:` up to the next ` · ` or the line's end.
function segment(links, label) {
  for (const line of links.split(/\r?\n/)) {
    const m = line.match(new RegExp(`${label}:(.*)$`, 'i'));
    if (m) return m[1].split(' · ')[0].trim();
  }
  return null;
}

// The `## Recommended Mode / Model / Effort` section as one line of plain text, cut to 600 characters. null when
// absent or empty.
export function designation(body) {
  const text = plain((section(body, 'Recommended Mode / Model / Effort', 2) ?? '').replace(/\s+/g, ' '));
  if (!text) return null;
  return text.length > DESIGNATION_MAX ? `${text.slice(0, DESIGNATION_MAX)}…` : text;
}

// `Blocked by:` in `### Links`: issue numbers, and `unfiled` when the segment holds anything but references (an
// F-ID, "(no issue yet)"): that is work not filed, and its text is never kept. `none` and empty are no blockers.
export function blockers(body) {
  const text = segment(section(body, 'Links', 3) ?? '', 'Blocked by');
  if (text === null || text === '' || /^none\.?$/i.test(text)) return { numbers: [], unfiled: false };
  const numbers = [...new Set([...text.matchAll(/#(\d{1,9})(?!\d)/g)].map((m) => Number(m[1])))].slice(0, BLOCKERS_MAX);
  const rest = text.replace(/#\d+/g, '').replace(/\band\b/gi, '').replace(/[\s,;&+]/g, '');
  return { numbers, unfiled: rest !== '' };
}

// `Touches:` in `### Links`: the entries, or null (unknown) when the line is missing, empty, or any entry breaks the
// rules: path characters only, no `..`, no leading `/`. Backticks are ignored.
function touchesEntries(body) {
  const text = segment(section(body, 'Links', 3) ?? '', 'Touches');
  return text ? text.split(',').map((e) => e.replace(/`/g, '').trim()) : null;
}
const unreadable = (e) => e.length > ENTRY_MAX || !ENTRY.test(e) || e.includes('..') || e.startsWith('/');
export function touches(body) {
  const entries = touchesEntries(body);
  return entries && entries.length <= TOUCHES_MAX && !entries.some(unreadable) ? entries : null;
}

// Why `touches()` reads a present line as unknown, for I1's warning (F-17): `{ tooMany: 30 }` past 30 entries, else
// `{ entry }`, the first entry that breaks the rules, as written. null when the line is readable, missing or empty.
export function touchesBreak(body) {
  const entries = touchesEntries(body);
  if (!entries) return null;
  if (entries.length > TOUCHES_MAX) return { tooMany: TOUCHES_MAX };
  const entry = entries.find(unreadable);
  return entry === undefined ? null : { entry };
}

// Two entries overlap when one's key (its text up to the first `*`) is a prefix of the other's: a false overlap is
// the safe mistake. Unknown (null) overlaps everything.
const key = (e) => e.split('*')[0];
export function overlap(a, b) {
  if (a === null || b === null) return true;
  return a.some((x) => b.some((y) => key(x).startsWith(key(y)) || key(y).startsWith(key(x))));
}

// /work-ticket's follow-up marker (D-054): `Follow-up confirmed: owner, YYYY-MM-DD`, read as GitHub shows the body
// on a best-effort basis: a copy in an HTML comment, a fenced block or a quote does not count. It counts only as a
// paragraph of its own, a blank line or the body's edge on each side. A body holding HTML the reader does not judge
// (<details>, <script>, <style>, <pre>, <textarea>, <?…?>, <!X…>, CDATA) has no marker. Some bodies GitHub shows
// with the marker hidden still read as confirmed; D-054 records that limit, and what it gains. Anyone
// who can write the body can write it, and an author check would prove nothing while agents act with the owner's
// credentials: D-054 records that limit too. The marker only cuts round 1 to one cold review; the security review
// runs on every follow-up, on the strongest tier when the diff holds a gate file or a listed surface and on the
// standard tier otherwise. That rule lives in /work-ticket's prose, which the session reads and this file never
// decides; scripts/skills.test.mjs pins it there.
const MARKER = /^Follow-up confirmed: owner, (\d{4})-(\d{2})-(\d{2})$/;
const HIDING_HTML = /<(?:details|script|style|pre|textarea)\b|<\?|<!\[CDATA\[|<![A-Za-z]/i;
export function followUpConfirmed(body) {
  const text = prose(body, { frontmatter: false });
  if (HIDING_HTML.test(text)) return false;
  const lines = text.split(/\r?\n/);
  const blank = (i) => i < 0 || i >= lines.length || lines[i].trim() === '';
  return lines.some((line, i) => {
    if (!blank(i - 1) || !blank(i + 1)) return false;
    const m = plain(line).match(MARKER);
    if (!m) return false;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(`${m[1]}-${m[2]}-${m[3]}`);
  });
}

//   node ci/checks/lib/issue-body.mjs --follow-up <body file>    prints `follow-up: confirmed` or `follow-up: none`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== '--follow-up' || !process.argv[3]) {
    process.stderr.write('issue-body: usage: node ci/checks/lib/issue-body.mjs --follow-up <body file>\n');
    process.exit(2);
  }
  process.stdout.write(`follow-up: ${followUpConfirmed(readFileSync(process.argv[3], 'utf8')) ? 'confirmed' : 'none'}\n`);
}
