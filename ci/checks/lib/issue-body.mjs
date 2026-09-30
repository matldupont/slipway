// What the work-order page reads from an issue body written by anyone who can open an issue (F-07,
// dev/features/work-order.md): three things, nothing else. Everything here returns plain values (numbers, a cut
// string, validated path entries), so what reaches a page cannot be a sentence someone else wrote, apart from the
// designation, which the page escapes.

import { plain, section } from './markdown.mjs';

const DESIGNATION_MAX = 600;
const BLOCKERS_MAX = 50;
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
  const numbers = [...new Set([...text.matchAll(/#(\d+)/g)].map((m) => Number(m[1])))].slice(0, BLOCKERS_MAX);
  const rest = text.replace(/#\d+/g, '').replace(/\band\b/gi, '').replace(/[\s,;&+]/g, '');
  return { numbers, unfiled: rest !== '' };
}

// `Touches:` in `### Links`: the entries, or null (unknown) when the line is missing, empty, or any entry breaks the
// rules: path characters only, no `..`, no leading `/`. Backticks are ignored.
export function touches(body) {
  const text = segment(section(body, 'Links', 3) ?? '', 'Touches');
  if (!text) return null;
  const entries = text.split(',').map((e) => e.replace(/`/g, '').trim());
  return entries.every((e) => ENTRY.test(e) && !e.includes('..') && !e.startsWith('/')) ? entries : null;
}

// Two entries overlap when one's key (its text up to the first `*`) is a prefix of the other's: a false overlap is
// the safe mistake. Unknown (null) overlaps everything.
const key = (e) => e.split('*')[0];
export function overlap(a, b) {
  if (a === null || b === null) return true;
  return a.some((x) => b.some((y) => key(x).startsWith(key(y)) || key(y).startsWith(key(x))));
}
