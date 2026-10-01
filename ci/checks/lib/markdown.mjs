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

// The text a reader sees as prose, roughly: the frontmatter, HTML comments and fenced code blocks removed (an
// unclosed comment or fence runs to the end). Two simple passes, comments then fences, so it misreads a `<!--` in
// inline code, a ` ``` x ``` ` line and a tab-indented fence (dev/features/roadmap-page.md → Known limitations).
// For owner-only views; nothing that publishes reads through it.
export function prose(md) {
  const text = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  const out = [];
  let fence = null;
  for (const line of text.split(/\r?\n/)) {
    const mark = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && line.trim() === mark) fence = null;
    } else if (mark) fence = mark;
    else out.push(line);
  }
  return out.join('\n');
}

// Like section(), stricter: the heading must start its line (an indented one may be an example in a code block),
// and the section ends at the next heading of the same or a higher level, indented up to three spaces or empty
// (`##`) included, or at a line of only `=` or only `-` (a setext underline or a thematic break, spaces ignored).
// Linear in the text. Pass prose() text when comments and fences should not count. null if absent.
export function strictSection(text, title, level) {
  const lines = text.split(/\r?\n/);
  const heading = new RegExp(`^#{${level}}\\s+${escapeRe(title)}\\s*$`, 'i');
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;
  const atx = new RegExp(`^ {0,3}#{1,${level}}(?:\\s|$)`);
  const end = lines.findIndex((l, i) => i > start && (atx.test(l) || (i > start + 1 && /^(?:=+|-+)$/.test(l.replace(/\s+/g, '')))));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
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
