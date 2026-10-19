// Minimal YAML frontmatter: `key: value` pairs and one level of nesting
// (`parent:` followed by indented `child: value` lines). Anything richer is out of scope
// on purpose — these documents are read by zero-dependency checks (D-004). No inline
// comments: `#` is content (`failure: see #12`).

const unquote = (s) => s.trim().replace(/^(['"])(.*)\1$/, '$2');

// What `\s*(.*)$` reads after a `key:` or a list number, in one pass: the text with its leading whitespace
// dropped, or null when what is left holds a character that ends a line (a lone CR, U+2028, U+2029), which `.`
// never matches. The pattern itself starts over from every space of a line that has one, so a long line of
// spaces costs the square of its length.
const ENDS_LINE = /[\n\r\u2028\u2029]/;
export const lineRest = (s) => {
  const rest = s.trimStart();
  return ENDS_LINE.test(rest) ? null : rest;
};
// A `key: value` line whose key starts at `lead` (/^/ at the first column, /^\s+/ indented): `[key, value]` or null.
const pair = (line, lead) => {
  const key = line.match(lead);
  const value = key ? lineRest(line.slice(key[0].length)) : null;
  return value === null ? null : [key[1], value];
};
const TOP = /^([\w-]+):/;
const CHILD = /^\s+([\w-]+):/;
// Every key is an own property, as written: `__proto__:` is a key like any other, never the object's prototype, so no
// key a document writes can make another read as inherited.
const own = (obj, key, value) => Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });

// The header block at the start of a document, `---` to `---`. Every reader of a header goes through frontmatter() or
// withoutHeader(), so no two of them can take a different block for the same file (#495).
const HEADER = /^---\r?\n([\s\S]*?)\r?\n---/;

// What frontmatter() returns for a header that cannot be read one way only: it holds a carriage return that no line
// feed follows, which one reader takes for a line end and another for text. It has no keys, so a reader that does not
// ask isUnreadable() still reads no id and no status from it; the check that owns the document reports it.
export const UNREADABLE = Object.freeze(Object.create(null));
export const isUnreadable = (fm) => fm === UNREADABLE;

// The document with its header block removed, the same block frontmatter() reads.
export const withoutHeader = (md) => md.replace(HEADER, '');

// null when the document has no frontmatter block; UNREADABLE when its block, read with every CR as a line end, holds a
// lone CR. CRLF and LF read the same, and a leading byte-order mark is not part of the document.
export function frontmatter(md) {
  const lf = md.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  // Every CR a line end: the same length as `lf`, so the block it finds is the same span of `lf`.
  const loose = lf.replace(/\r/g, '\n').match(HEADER);
  if (loose && lf.slice(0, loose[0].length).includes('\r')) return UNREADABLE;
  const m = lf.match(HEADER);
  if (!m) return null;
  const out = {};
  let parent = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const top = pair(line, TOP);
    if (top) {
      parent = top[1].trim() === '' ? top[0] : null;
      own(out, top[0], parent ? {} : unquote(top[1]));
      continue;
    }
    const child = pair(line, CHILD);
    if (child && parent) own(out[parent], child[0], unquote(child[1]));
  }
  return out;
}

// Template placeholders (`<…>`, `<…situation…>`) and open clarification markers. A section that still holds one
// has not been written yet.
export const PLACEHOLDER = /<…[^>\n]*>|\bTBD\b|\[NEEDS CLARIFICATION/;

// Whether `text` holds one: PLACEHOLDER.test(text), in one pass. The pattern looks along the line from every `<…`
// that no `>` closes, so a line of them costs the square of its length; here each `<…` is met once and the next
// `>` is looked for once.
const WORDS = /\bTBD\b|\[NEEDS CLARIFICATION/;
export function hasPlaceholder(text) {
  if (WORDS.test(text)) return true;
  let close = -1;
  for (let at = text.indexOf('<…'); at >= 0; ) {
    if (close < at + 2) close = text.indexOf('>', at + 2);
    if (close < 0) return false;
    const end = text.indexOf('\n', at + 2);
    if (end < 0 || close < end) return true;
    at = text.indexOf('<…', end + 1);
  }
  return false;
}
