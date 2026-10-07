// One reader for a workflow file: the YAML parser in vendor/ (D-033), and what this file refuses in front of it.
//
// The parser says what the text is as YAML. Agreeing with YAML is not agreeing with GitHub's reader, so what the
// two are most likely to read differently is refused here, and never guessed at: an anchor, an alias, a tag, a
// merge key, a key written more than once, a key that is a list or a mapping, a directive, more than one
// document, a top level that is not a block of keys, and a line break only some readers split on. A file that is
// refused, or that the parser cannot read, is `unread`: a fixed reason holding none of the file's text. Whoever
// reads it counts nothing in it: fail closed.
//
// The parser holds to the YAML specification where some readers are lenient: a closing bracket at its key's
// indentation, or a later line of a quoted text there, is not YAML to it. Such a file is unread too, and `hint`
// says how to write it so it is read. That is the cost of failing closed, taken on purpose (D-033).
//
// No schema is applied: every scalar is its text, so `on`, `yes`, `null` and `012` are what was written. What a
// read file gives:
//   { kind: 'scalar', value, plain, literal, line }   plain: not quoted, not a block scalar; literal: a `|` block;
//                                                     line: the 1-based line its text starts on
//   { kind: 'list', items, flow }                     flow: written `[a, b]`
//   { kind: 'map', entries, flow }                    entries: a Map of key text → node; flow: written `{a: b}`

import { COLLECTION_STYLE, EVENT_ID, SCALAR_STYLE, getScalarValue, parseEvents } from './vendor/js-yaml.mjs';

const NONE = -1;

// A plain scalar that is nothing: `key:`, `key: null`, `key: ~`.
export const isNull = (node) => node.kind === 'scalar' && node.plain && /^(|null|~)$/.test(node.value);

export const NOT_YAML_HINT = 'The parser holds to the YAML specification: write a list or a mapping in brackets on one line, or indent its closing bracket past its key, and indent every later line of a quoted text past its key';

export function readWorkflow(text) {
  const src = String(text);
  const refuse = (reason, hint = null) => ({ root: null, unread: reason, hint });
  // YAML also ends a line at a bare carriage return, and some readers at these separators: two readers that
  // split lines differently disagree on where a comment ends.
  if (/\r(?!\n)|[\u0085\u2028\u2029]/.test(src)) return refuse('it holds a line break W1 does not read');
  let events;
  try {
    events = parseEvents(src);
  } catch (e) {
    // The line is a number, never the file's text.
    const where = Number.isInteger(e?.mark?.line) ? `, at line ${e.mark.line + 1}` : '';
    return refuse(`it is not YAML the parser can read${where}`, NOT_YAML_HINT);
  }

  let at = 0;
  let line = 1;
  const lineOf = (pos) => {
    if (pos < at) { at = 0; line = 1; }
    for (; at < pos; at++) if (src.charCodeAt(at) === 10) line++;
    return line;
  };

  let documents = 0;
  let root = null;
  const stack = []; // open collections; null for the document itself
  // Puts a finished node where it belongs. Returns the reason the file is refused, or null.
  const place = (node) => {
    const open = stack.at(-1);
    if (!open) { root = node; return null; }
    if (open.node.kind === 'list') { open.node.items.push(node); return null; }
    if (open.key !== null) { open.node.entries.set(open.key, node); open.key = null; return null; }
    if (node.kind !== 'scalar') return 'a key is a list or a mapping';
    if (node.plain && node.value === '<<') return 'it holds a merge key';
    if (open.node.entries.has(node.value)) return 'a key is written more than once';
    open.key = node.value;
    return null;
  };

  for (const e of events) {
    if (e.type === EVENT_ID.ALIAS) return refuse('it holds an alias');
    if (e.type !== EVENT_ID.POP && e.type !== EVENT_ID.DOCUMENT) {
      if (e.anchorStart !== NONE) return refuse('it holds an anchor');
      if (e.tagStart !== NONE) return refuse('it holds a tag');
    }
    let problem = null;
    if (e.type === EVENT_ID.DOCUMENT) {
      if (++documents > 1) return refuse('it holds more than one document');
      if (e.directives?.length) return refuse('it holds a directive');
      stack.push(null);
    } else if (e.type === EVENT_ID.SCALAR) {
      problem = place({
        kind: 'scalar',
        value: getScalarValue(src, e),
        plain: e.style === SCALAR_STYLE.PLAIN,
        literal: e.style === SCALAR_STYLE.LITERAL_BLOCK,
        line: lineOf(Math.max(0, e.valueStart)),
      });
    } else if (e.type === EVENT_ID.SEQUENCE) {
      stack.push({ node: { kind: 'list', items: [], flow: e.style === COLLECTION_STYLE.FLOW }, key: null });
    } else if (e.type === EVENT_ID.MAPPING) {
      stack.push({ node: { kind: 'map', entries: new Map(), flow: e.style === COLLECTION_STYLE.FLOW }, key: null });
    } else if (e.type === EVENT_ID.POP) {
      const closed = stack.pop();
      if (closed) problem = place(closed.node);
    } else {
      return refuse('it is not YAML the parser can read');
    }
    if (problem) return refuse(problem);
  }

  // A file of comments only, or of nothing, is a block with no keys.
  if (documents === 0 || (root && isNull(root) && root.value === '')) return { root: { kind: 'map', entries: new Map(), flow: false }, unread: null, hint: null };
  if (root?.kind !== 'map' || root.flow) return refuse('its top level is not a block of keys');
  return { root, unread: null, hint: null };
}
