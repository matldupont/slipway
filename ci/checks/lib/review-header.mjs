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

export const unquote = (s) => s.trim().replace(/^[`'"]+|[`'"]+$/g, '');

// The header's lines, with emphasis and list marks removed; none when the review has no title.
export const reviewHeader = (text) => {
  const all = text.replace(/^﻿/, '').split(/\r?\n/).map((l) => (l.replace(hidden, '').trim() ? l : ''));
  const title = all.findIndex((l) => l.trim());
  if (title < 0 || !/^# /.test(all[title])) return [];
  const start = all.findIndex((l, i) => i > title && l.trim());
  if (start < 0) return [];
  const end = all.findIndex((l, i) => i > start && !l.trim());
  return all.slice(start, end < 0 ? all.length : end).map(mark);
};

// The three provenance lines of a review's header. `reviewed` is `{ path, ref }` as written (path unquoted);
// `version` is the Version line's value, unquoted, null when absent or empty; `supersedes` is every path named.
export const reviewProvenance = (text) => {
  const lines = reviewHeader(text);
  const m = lines.map((l) => l.match(/^Reviewed:\s*(.+?)\s+@\s+(\S+)/)).find(Boolean);
  const v = lines.map((l) => l.match(/^Version line:\s*(.+)$/)).find(Boolean);
  const version = v ? unquote(v[1]) : '';
  return {
    reviewed: m ? { path: unquote(m[1]), ref: m[2] } : null,
    version: version || null,
    supersedes: lines.filter((l) => l.startsWith('Supersedes:')).map((l) => unquote(l.slice('Supersedes:'.length)).replace(/^\.\//, '')),
  };
};
