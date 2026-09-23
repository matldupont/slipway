// Minimal markdown reading for body and document checks.

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The text under a heading with this exact title (case-insensitive), up to the next
// heading of the same or a higher level, with HTML comments removed. null if absent.
// Comments are removed first, so a heading or an example inside a template comment
// never counts as content.
export function section(md, title, level) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  const heading = new RegExp(`^#{${level}}\\s+${escapeRe(title)}\\s*$`, 'i');
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

// The cells of a table row `| a | b |`, trimmed.
export const cells = (line) => line.split('|').slice(1, -1).map((c) => c.trim());

// A cell without emphasis or code marks: `**M1**` reads as `M1`.
export const plain = (c) => c.replace(/[*_`]/g, '').trim();

// The first table in a block of text: its header cells (plain) and its body rows (cells). null when
// the text holds no table with a |---| separator under a header.
export function table(text) {
  const lines = (text ?? '').split(/\r?\n/);
  const at = lines.findIndex((l, i) => l.trim().startsWith('|') && /^\|[\s:|-]+\|$/.test((lines[i + 1] ?? '').trim()));
  if (at < 0) return null;
  const rows = [];
  for (const l of lines.slice(at + 2)) {
    if (!l.trim().startsWith('|')) break;
    rows.push(cells(l.trim()));
  }
  return { header: cells(lines[at].trim()).map(plain), rows };
}
