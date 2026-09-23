// Minimal markdown reading for body and document checks.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The text under a heading with this exact title (case-insensitive), up to the next
// heading of the same or a higher level, with HTML comments removed. null if absent.
// A RegExp title matches the whole heading text: /9\.\s+Estimates?/ for a renamed one.
// Comments are removed first, so a heading or an example inside a template comment
// never counts as content.
export function section(md, title, level) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const text = title instanceof RegExp ? title.source : escapeRe(title);
  const heading = new RegExp(`^#{${level}}\\s+(?:${text})\\s*$`, 'i');
  const start = lines.findIndex((l) => heading.test(l.trim()));
  if (start < 0) return null;
  const body = [];
  for (const l of lines.slice(start + 1)) {
    const h = l.match(/^(#{1,6})\s/);
    if (h && h[1].length <= level) break;
    body.push(l);
  }
  return body.join('\n').trim();
}

// GitHub renders an empty issue-form field as `_No response_`.
export const isNoResponse = (s) => s === null || s.trim() === '' || /^_No response_$/i.test(s.trim());

// The cells of a table row, trimmed: `| a | b |`, and also `a | b` with the outer pipes left off
// (GitHub renders both). An escaped `\|` stays inside its cell, as `|`.
export const cells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, '|').trim());

// A cell without emphasis, code marks or link syntax: `**M1**` and `[M1](M1.md)` read as `M1`.
export const plain = (c) => c.replace(/\[([^\][]*)\]\([^()]*\)/g, '$1').replace(/[*_`]/g, '').trim();

// A table's |---|---| line, outer pipes optional.
const SEPARATOR = /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?$/;

// The first table in a block of text: its header cells (plain) and its body rows (cells). null when
// the text holds no header row over a separator.
export function table(text) {
  const lines = (text ?? '').split(/\r?\n/).map((l) => l.trim());
  const at = lines.findIndex((l, i) => l.includes('|') && (lines[i + 1] ?? '').includes('|') && SEPARATOR.test(lines[i + 1]));
  if (at < 0) return null;
  const rows = [];
  for (const l of lines.slice(at + 2)) {
    if (!l.includes('|')) break;
    rows.push(cells(l));
  }
  return { header: cells(lines[at]).map(plain), rows };
}
