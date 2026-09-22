// Minimal YAML frontmatter: `key: value` pairs and one level of nesting
// (`parent:` followed by indented `child: value` lines). Anything richer is out of scope
// on purpose — these documents are read by zero-dependency checks (D-004). No inline
// comments: `#` is content (`failure: see #12`).

const unquote = (s) => s.trim().replace(/^(['"])(.*)\1$/, '$2');

// null when the document has no frontmatter block.
export function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  let parent = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const top = line.match(/^([\w-]+):\s*(.*)$/);
    if (top) {
      parent = top[2].trim() === '' ? top[1] : null;
      out[top[1]] = parent ? {} : unquote(top[2]);
      continue;
    }
    const child = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (child && parent) out[parent][child[1]] = unquote(child[2]);
  }
  return out;
}

// Template placeholders (`<…>`, `<…situation…>`) and open clarification markers. A section that still holds one
// has not been written yet.
export const PLACEHOLDER = /<…[^>\n]*>|\bTBD\b|\[NEEDS CLARIFICATION/;
