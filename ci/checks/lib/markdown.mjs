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

// The text a reader sees as prose: the frontmatter, HTML comments and fenced code blocks removed (an unclosed
// comment or fence runs to the end, as it renders). A heading-shaped line in any of those is never a heading.
// One pass, line by line, so a `<!--` inside a fence or an inline code span opens nothing, and a `-->` inside a
// fence closes nothing. Where it cannot tell, it hides more rather than less.
export function prose(md) {
  const text = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
  const out = [];
  let fence = null;
  let comment = false;
  for (const line of text.split(/\r?\n/)) {
    let rest = line;
    if (comment) {
      const close = rest.indexOf('-->');
      if (close < 0) continue;
      comment = false;
      rest = rest.slice(close + 3);
      if (rest.trim() === '') continue;
    } else if (fence) {
      const mark = rest.match(/^ {0,3}(`{3,}|~{3,})\s*$/)?.[1];
      if (mark && mark[0] === fence[0] && mark.length >= fence.length) fence = null;
      continue;
    } else {
      // A backtick fence's info string holds no backtick (` ``` x ``` ` is inline code); a tab indent is a code block.
      const mark = rest.match(/^ {0,3}(`{3,}(?![^`]*`)|~{3,})/)?.[1];
      if (mark) {
        fence = mark;
        continue;
      }
    }
    // Comments on the rest of the line, outside inline code spans; one left open runs on to the next lines.
    let kept = '';
    for (const part of rest.split(/(`+[^`]*`+)/)) {
      if (comment || part.startsWith('`')) {
        if (!comment) kept += part;
        else if (part.includes('-->')) (comment = false), (kept += part.slice(part.indexOf('-->') + 3));
        continue;
      }
      let p = part;
      for (;;) {
        const open = p.indexOf('<!--');
        if (open < 0) break;
        const close = p.indexOf('-->', open + 4);
        if (close < 0) {
          p = p.slice(0, open);
          comment = true;
          break;
        }
        p = p.slice(0, open) + p.slice(close + 3);
      }
      kept += p;
    }
    if (kept.trim() !== '' || rest.trim() === '') out.push(kept);
  }
  return out.join('\n');
}

// Like section(), for text a publishing decision reads: the heading must start its line (an indented one may be
// an example in a code block), and the section ends at the next heading of the same or a higher level that
// starts its line, an empty one (`##`) included, or at a setext heading (a line underlined with `===` or `---`),
// or at a thematic break (`---` after a blank line), since any of them can end a section as it renders. Pass
// prose() text, so comments and fences are already gone. null if absent.
export function strictSection(text, title, level) {
  const lines = text.split(/\r?\n/);
  const heading = new RegExp(`^#{${level}}\\s+${escapeRe(title)}\\s*$`, 'i');
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return null;
  const atx = new RegExp(`^#{1,${level}}(?:\\s|$)`);
  const end = lines.findIndex((l, i) => i > start && (atx.test(l) || (i > start + 1 && /^ {0,3}(?:=+|-{2,}|(?:-\s*){3,})\s*$/.test(l))));
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
