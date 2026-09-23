// A list of flat mappings in the declared YAML subset (D-004): the `ci/exceptions.yaml` shape.
//
//   exceptions:
//     - id: .github/workflows/ci.yml#detect/filter
//       expires: 2026-12-31
//
// An item starts at `- <first key>:`; the other named keys, indented, belong to the latest item.
// Keys not named are ignored, and so is the list's own `exceptions:`/`paths:` line — unless `strict`,
// where any line that is not an item, a named field or a top-level key throws, so a mistyped key can
// never fold its fields into the item above it. Scalars lose a trailing ` # comment` and one pair of
// matching quotes.

export const skippable = (s) => /^\s*(#.*)?$/.test(s);

export function scalar(v = '') {
  let s = String(v).replace(/\s+#.*$/, '').trim();
  if (s.length > 1 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) s = s.slice(1, -1);
  return s;
}

/**
 * @param {string} src
 * @param {string[]} keys  the first key opens an item; the rest are its fields
 * @param {{ strict?: boolean }} [o]
 * @returns {Array<Record<string, string> & { line: number }>}  `line` is the item's 1-based line
 */
export function readList(src, [first, ...fields], { strict = false } = {}) {
  const out = [];
  let cur = null;
  src.split(/\r?\n/).forEach((line, i) => {
    if (skippable(line)) return;
    const head = line.match(/^\s*-\s*([\w-]+):\s*(.*?)\s*$/);
    if (head && head[1] === first) {
      cur = { [first]: scalar(head[2]), line: i + 1 };
      out.push(cur);
      return;
    }
    const kv = line.match(/^\s+([\w-]+):\s*(.*?)\s*$/);
    if (kv && cur && fields.includes(kv[1])) { cur[kv[1]] = scalar(kv[2]); return; }
    if (strict && !/^[\w-]+:\s*$/.test(line)) throw new Error(`line ${i + 1}: cannot read "${line.trim()}"`);
  });
  return out;
}
