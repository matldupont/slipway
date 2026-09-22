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
