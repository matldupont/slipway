// What a review says of itself: the one reader of docs/reviews/*.md, shared by R1 (the check) and `pnpm status`
// (which counts a review of the PRD), so the two cannot disagree about which review counts.
//
// The lines count only in the review's header: the first run of non-blank lines under its title, the file's
// first non-blank line, a `# ` heading. A line lower down, or one in the header that starts with a quote mark
// (`>`), is text the review carries, not what the review says of itself. A review with no title has no header. A
// line of characters nobody sees is blank, and a byte-order mark before the title is not part of it.

import { UNSAFE } from './report.mjs';

const hidden = new RegExp(UNSAFE.source, 'gv');
// A header line keeps its emphasis and list marks out of the way but never a quote mark: a line left starting
// with `>` matches none of the three names.
const mark = (l) => l.replace(/\*\*/g, '').replace(/^[\s*_-]+/, '').trim();

// No header line longer than this is read: a review's own lines are a path, a version line, a file name.
export const MAX_LINE = 1000;

// Each reader below takes time linear in the line's length: a loop or a pattern that tries one position once,
// never a pattern that can retry the rest of the line from every position.
const QUOTES = '`\'"';
export const unquote = (s) => {
  const t = s.trim();
  let a = 0;
  let b = t.length;
  while (a < b && QUOTES.includes(t[a])) a++;
  while (b > a && QUOTES.includes(t[b - 1])) b--;
  return t.slice(a, b);
};

// A value never holds a line break the split below left in (a lone CR, a line or paragraph separator).
const BREAK = /[\r\u2028\u2029]/;

// `Reviewed: <path> @ <ref>` on a header line: `{ path, ref }` as written (path unquoted), or null. The path ends
// at the first ` @ `.
export const reviewedOf = (line) => {
  if (!line.startsWith('Reviewed:')) return null;
  const rest = line.slice('Reviewed:'.length).trim();
  const at = rest.search(/\s@\s/);
  if (at < 1) return null;
  const path = rest.slice(0, at).trimEnd();
  const ref = rest.slice(at + 2).trimStart().match(/^\S+/)?.[0];
  return !path || !ref || BREAK.test(path) ? null : { path: unquote(path), ref };
};

// `Version line: <text>` on a header line: the text as written, or null when there is none.
export const versionOf = (line) => {
  if (!line.startsWith('Version line:')) return null;
  const value = line.slice('Version line:'.length).trim();
  return !value || BREAK.test(value) ? null : value;
};

// The header's lines as written, each with its line number in the file; none when the review has no title.
const headerLines = (text) => {
  const all = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => (l.replace(hidden, '').trim() ? l : ''));
  const title = all.findIndex((l) => l.trim());
  if (title < 0 || !/^# /.test(all[title])) return [];
  const start = all.findIndex((l, i) => i > title && l.trim());
  if (start < 0) return [];
  const end = all.findIndex((l, i) => i > start && !l.trim());
  return all.slice(start, end < 0 ? all.length : end).map((l, i) => ({ n: start + i + 1, l }));
};

// The lines of a header that are read, with emphasis and list marks removed.
const read = (header) => header.filter(({ l }) => l.length <= MAX_LINE).map(({ l }) => mark(l));
export const reviewHeader = (text) => read(headerLines(text));

// The three provenance lines of a review's header. `reviewed` is `{ path, ref }` as written (path unquoted);
// `version` is the Version line's value, unquoted, null when absent or empty; `supersedes` is every path named;
// `unread` is the file's line number of each header line over MAX_LINE characters, which none of the three reads;
// `unreadSupersedes` is those of them that start as a Supersedes: line, so a caller can say the line retires nothing.
export const reviewProvenance = (text) => {
  const header = headerLines(text);
  const lines = read(header);
  const long = header.filter(({ l }) => l.length > MAX_LINE);
  const v = lines.map(versionOf).find((x) => x !== null);
  return {
    reviewed: lines.map(reviewedOf).find(Boolean) ?? null,
    version: (v ? unquote(v) : '') || null,
    supersedes: lines.filter((l) => l.startsWith('Supersedes:')).map((l) => unquote(l.slice('Supersedes:'.length)).replace(/^\.\//, '')),
    unread: long.map(({ n }) => n),
    unreadSupersedes: long.filter(({ l }) => mark(l.slice(0, 64)).startsWith('Supersedes:')).map(({ n }) => n),
  };
};
