// The YAML subset LK1 reads pnpm-lock.yaml in (lib/pnpm-lock.mjs judges what it reads). A construct outside the
// subset throws, so LK1 exits BROKEN and never guesses (D-004: no dependency).
//
// The subset is what pnpm 10 writes (lockfileVersion 9.0): block mappings and sequences by two-space
// indentation, single-line plain, single-quoted and double-quoted scalars (with YAML's escapes), block scalars
// (`deprecated: |-` and its lines, whose text is skipped, never read), single-line flow mappings and
// sequences (`resolution: {integrity: sha512-…}`), comments. Refused, by throwing: anchors, aliases, tags,
// merge keys, multi-line quoted scalars, document markers, a tab in indentation, a repeated key, a sequence
// level with the key above it, any control or line-break character (a carriage return too: pnpm writes LF
// only), and, anywhere but in the free text of a `deprecated:` message, any hidden or formatting character
// (UNSAFE): a package name or address is never read with one in it. The file is hostile input — a pull request
// can change it — and a program that reads it differently from pnpm is a way to hide an entry, so a construct the
// reader could take two ways is never accepted. Mappings are Maps, so a package named `__proto__` is a key.

import { UNSAFE } from './report.mjs';

export const LOCKFILE = 'pnpm-lock.yaml';

const at = (n, what) => new Error(`${LOCKFILE} line ${n}: ${what}`);
const SPECIAL = /[&*!|>%@`]/;
// The characters no lockfile line may hold, in free text too: C0 and C1 controls (NEL among them), the line and
// paragraph separators and the BOM. YAML takes several as a line break, so text after one is a line to pnpm.
const HARD = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\ufeff]/;
const BLOCK = Symbol('block scalar');
const BLOCK_HEADER = /^[|>](?:[1-9][+-]?|[+-][1-9]?)?(?:[ \t]+#.*)?$/;
const ESCAPES = { 0: '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\xa0', L: '\u2028', P: '\u2029' };
// A double-quoted value as YAML reads it: `\t`, `\_` (a no-break space), `\u00e9`, `\"`.
const unescape = (s, n) =>
  s.replace(/\\(?:x([0-9A-Fa-f]{2})|u([0-9A-Fa-f]{4})|U([0-9A-Fa-f]{8})|([^]))/g, (_m, x, u, U, c) => {
    const hex = x ?? u ?? U;
    if (hex !== undefined) {
      if (parseInt(hex, 16) > 0x10ffff) throw at(n, 'has a code point beyond U+10FFFF in a quoted value');
      return String.fromCodePoint(parseInt(hex, 16));
    }
    if (!Object.hasOwn(ESCAPES, c)) throw at(n, 'has an escape this reader does not take in a quoted value');
    return ESCAPES[c];
  });
const DQ = String.raw`"((?:[^"\\]|\\.)*)"`;

// YAML's white space is the space and the tab and nothing else. JS `\s` and trim() also take U+00A0, U+3000 and
// the rest of \p{Z}, so a line starting with one would be a comment here and data to pnpm's reader: a package
// could be hidden on it. Every trim and comment test below is by these, and linear in the line's length.
const isBlank = (c) => c === ' ' || c === '\t';
const trimEnd = (s) => {
  let e = s.length;
  while (e > 0 && isBlank(s[e - 1])) e--;
  return s.slice(0, e);
};
const trim = (s) => {
  let a = 0;
  while (a < s.length && isBlank(s[a])) a++;
  return trimEnd(s.slice(a));
};
// the text before a ` #` comment
const uncomment = (s) => {
  const m = /[ \t]#/.exec(s);
  return m ? s.slice(0, m.index) : s;
};

function flow(s, n) {
  let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const scalar = (isKey) => {
    const quoted = s[i] === "'" ? /'((?:[^']|'')*)'/y : s[i] === '"' ? new RegExp(DQ, 'y') : null;
    if (quoted) {
      quoted.lastIndex = i;
      const r = quoted.exec(s);
      if (!r) throw at(n, 'has a quoted value this reader does not take (unterminated)');
      i = quoted.lastIndex;
      return s[r.index] === '"' ? unescape(r[1], n) : r[1].replaceAll("''", "'");
    }
    const plain = /[^,[\]{}]+/y;
    plain.lastIndex = i;
    let run = plain.exec(s)?.[0].replace(/ +$/, '') ?? '';
    if (isKey) {
      const c = /:(?: |$)/.exec(run);
      if (!c) throw at(n, 'has a flow entry with no "key: value"');
      run = run.slice(0, c.index);
    } else if (/:(?: |$)/.test(run)) {
      throw at(n, 'has "key: value" text where one value is expected');
    }
    if (run === '' || SPECIAL.test(run[0]) || /[ \t]#/.test(run)) throw at(n, 'has a flow value this reader does not take');
    i += run.length;
    return run;
  };
  const value = () => {
    ws();
    if (s[i] === '{') {
      i++;
      const map = new Map();
      ws();
      if (s[i] === '}') { i++; return map; }
      for (;;) {
        ws();
        const k = scalar(true);
        ws();
        if (s[i] !== ':' || s[i + 1] !== ' ') throw at(n, 'has a flow entry with no "key: value"');
        i++;
        const v = value();
        if (map.has(k)) throw at(n, 'repeats a key');
        map.set(k, v);
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === '}') { i++; return map; }
        throw at(n, 'has a flow mapping that does not close on its line');
      }
    }
    if (s[i] === '[') {
      i++;
      const seq = [];
      ws();
      if (s[i] === ']') { i++; return seq; }
      for (;;) {
        seq.push(value());
        ws();
        if (s[i] === ',') { i++; continue; }
        if (s[i] === ']') { i++; return seq; }
        throw at(n, 'has a flow sequence that does not close on its line');
      }
    }
    return scalar(false);
  };
  const v = value();
  return [v, i];
}

function inline(v, n) {
  if (v[0] === '{' || v[0] === '[') {
    const [val, end] = flow(v, n);
    if (v.slice(end) !== '' && !/^[ \t]+#/.test(v.slice(end))) throw at(n, 'has text after a flow collection');
    return val;
  }
  if (BLOCK_HEADER.test(v)) return BLOCK;
  if (v[0] === "'" || v[0] === '"') {
    const m = (v[0] === "'" ? /^'((?:[^']|'')*)'(?:[ \t]+#.*)?$/ : new RegExp(`^${DQ}(?:[ \\t]+#.*)?$`)).exec(v);
    if (!m) throw at(n, 'has a quoted value this reader does not take (multi-line or unterminated)');
    return v[0] === '"' ? unescape(m[1], n) : m[1].replaceAll("''", "'");
  }
  if (SPECIAL.test(v[0]) || /^[-?:](?: |$)/.test(v)) throw at(n, 'has a value this reader does not take (an anchor, alias, tag, block scalar or indicator)');
  const plain = trim(uncomment(v));
  if (/:(?: |$)/.test(plain)) throw at(n, 'has "key: value" text where one value is expected');
  return plain;
}

function keyOf({ n, text }) {
  let key;
  let rest;
  const quoted = text[0] === "'" ? /^'((?:[^']|'')*)'/ : text[0] === '"' ? new RegExp(`^${DQ}`) : null;
  if (quoted) {
    const m = quoted.exec(text);
    if (!m) throw at(n, 'has a quoted key this reader does not take');
    key = text[0] === '"' ? unescape(m[1], n) : m[1].replaceAll("''", "'");
    rest = text.slice(m[0].length);
  } else {
    const m = /:(?: |$)/.exec(text);
    if (!m) throw at(n, 'is not a "key: value" line');
    key = trimEnd(text.slice(0, m.index));
    rest = text.slice(m.index);
    if (key === '' || key === '<<' || /^[&*!|>%@`#'"[\]{},?:]/.test(key) || /^-(?: |$)/.test(key) || /[ \t]#/.test(key)) throw at(n, 'has a key this reader does not take');
  }
  if (!/^:(?: |$)/.test(rest)) throw at(n, 'is not a "key: value" line');
  return { key, rest: trim(rest.slice(1)) };
}

/** @returns {Map<string, any>} nested Maps, arrays and strings; an empty value is null */
export function parseLockfile(text) {
  const refuse = (found, n, what) => {
    const cp = found.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    return at(n, `holds ${what} U+${cp}, which a YAML reader and this check could read differently`);
  };
  const hard = HARD.exec(text);
  if (hard) throw refuse(hard[0], text.slice(0, hard.index).split('\n').length, 'the control or line-break character');
  // hidden and formatting characters (zero-width, bidi, soft hyphen) are refused in what is read, not in the text of a message
  const structural = (it, key) => {
    const hidden = key === 'deprecated' ? null : UNSAFE.exec(it.text);
    if (hidden) throw refuse(hidden[0], it.n, 'the hidden or formatting character');
  };
  const items = [];
  text.split('\n').forEach((raw, i) => {
    if (/^[ \t]*(#.*)?$/.test(raw)) return;
    if (/^ *\t/.test(raw)) throw at(i + 1, 'is indented with a tab');
    const indent = /^ */.exec(raw)[0].length;
    items.push({ n: i + 1, indent, text: trimEnd(raw.slice(indent)) });
  });
  if (items.length === 0) throw new Error(`${LOCKFILE} is empty`);

  let pos = 0;
  const isSeq = (it) => /^-(?: |$)/.test(it.text);
  const block = (indent) => (isSeq(items[pos]) ? sequence(indent) : mapping(indent));
  function mapping(indent) {
    const map = new Map();
    while (pos < items.length && items[pos].indent === indent) {
      const it = items[pos++];
      const { key, rest } = keyOf(it);
      structural(it, key);
      if (map.has(key)) throw at(it.n, 'repeats a key');
      const empty = rest === '' || rest.startsWith('#');
      let value = empty ? (pos < items.length && items[pos].indent > indent ? block(items[pos].indent) : null) : inline(rest, it.n);
      if (value === BLOCK) {
        // its lines are the text of the value, up to the next line at the key's own indent or less
        while (pos < items.length && items[pos].indent > indent) pos++;
        value = '(block scalar)';
      }
      map.set(key, value);
    }
    if (pos < items.length && items[pos].indent > indent) throw at(items[pos].n, 'is indented under a value that takes no lines');
    return map;
  }
  function sequence(indent) {
    const seq = [];
    while (pos < items.length && items[pos].indent === indent && isSeq(items[pos])) {
      const it = items[pos++];
      const v = trim(it.text.slice(1));
      structural(it, null);
      if (v === '') throw at(it.n, 'has an empty sequence item');
      const item = inline(v, it.n);
      if (item === BLOCK) throw at(it.n, 'has a block scalar as a sequence item');
      seq.push(item);
    }
    if (pos < items.length && items[pos].indent >= indent) throw at(items[pos].n, 'is not a sequence item, or is indented under one');
    return seq;
  }
  if (items[0].indent !== 0) throw at(items[0].n, 'does not start at the left edge');
  const doc = block(0);
  if (pos < items.length) throw at(items[pos].n, 'is not part of the lockfile structure');
  if (!(doc instanceof Map)) throw new Error(`${LOCKFILE} is not a mapping`);
  return doc;
}

