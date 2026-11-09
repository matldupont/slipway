// What the vendored @babel/parser gives the tests-can-fail step (dev/features/tests-can-fail.md §2, D-037):
// the changes a source file can get, the lines of each test and each expect call, and the paths a file
// re-exports from. This is the only file that imports the parser. Pure: it reads text it is handed.

import { parse } from './vendor/babel-parser.mjs';
import { body, callChain, skips, SUITES, TESTS } from './test-calls.mjs';

const NOT_SOURCE = 'not JavaScript or TypeScript';
const SOURCE = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/;
// `.ts` reads `<T>x` as a cast, so JSX is read everywhere else only; TypeScript is read in its own files only, since
// it reads `a < b > (c)` as a call with a type argument.
const NO_JSX = /\.[cm]?ts$/;
const TYPESCRIPT = /\.[cm]?tsx?$/;

// Keys that hold a type, never code to change.
const TYPE_KEYS = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'superTypeArguments']);
const FLIP = new Map([['===', '!=='], ['==', '!='], ['<', '<='], ['>', '>='], ['&&', '||'], ['+', '-'], ['*', '/']]);
for (const [from, to] of [...FLIP]) FLIP.set(to, from);
const KIND_ORDER = ['body', 'condition', 'operator', 'literal'];
// A line break git does not count, and the parser and V8 do: lines would drift between a diff and a stack.
const OTHER_BREAK = /\r(?!\n)|[\u2028\u2029]/;
export const OTHER_BREAK_REASON = 'it holds a line break git does not count (a lone CR, U+2028 or U+2029)';

function read(path, text) {
  if (!SOURCE.test(path)) return { unreadable: NOT_SOURCE };
  if (OTHER_BREAK.test(text)) return { unreadable: OTHER_BREAK_REASON };
  try {
    const plugins = ['decorators', 'decoratorAutoAccessors'];
    if (TYPESCRIPT.test(path)) plugins.push('typescript');
    if (!NO_JSX.test(path)) plugins.push('jsx');
    return parse(text, { sourceType: 'unambiguous', plugins, errorRecovery: false, allowReturnOutsideFunction: true }).program;
  } catch (error) {
    // The reason is the parser's first line, cut short. It can still quote the file (a duplicate export name), so a
    // caller that prints it escapes it as it does a test name.
    return { unreadable: String(error?.message ?? error).split(/[\r\n\u2028\u2029]/)[0].slice(0, 200) };
  }
}

const isNode = (value) => value !== null && typeof value === 'object' && typeof value.type === 'string';

// Calls visit(node) on every node of code, in source order. An import and a re-export hold no expression, and a
// type sits under one of TYPE_KEYS, so none of them is visited as code. It keeps its own stack: a chain of
// 50,000 calls parses, and a recursive walk would overflow on it.
function walk(root, visit) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    visit(node);
    const children = [];
    for (const [key, value] of Object.entries(node)) {
      if (TYPE_KEYS.has(key) || key === 'loc' || key === 'extra' || key.endsWith('Comments') || key === 'comments') continue;
      if (Array.isArray(value)) {
        for (const item of value) if (isNode(item)) children.push(item);
      } else if (isNode(value)) children.push(value);
    }
    for (let i = children.length - 1; i >= 0; i -= 1) stack.push(children[i]);
  }
}

// The line of an offset, counting `\n` only, as git does: the parser's own lines also break at \r, U+2028 and U+2029.
function lineIndex(text) {
  const starts = [0];
  for (let at = text.indexOf('\n'); at >= 0; at = text.indexOf('\n', at + 1)) starts.push(at + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid] <= offset) low = mid;
      else high = mid - 1;
    }
    return low + 1;
  };
}

// The operator between two operands: past closing parentheses, spaces and comments after the left one, and never
// past the right operand. A line comment ends at any line break the parser knows.
function operatorAt(text, from, limit, operator) {
  let at = from;
  while (at < limit) {
    if (/[\s)]/.test(text[at])) at += 1;
    else if (text.startsWith('//', at)) at = text.slice(at).search(/[\n\r\u2028\u2029]/) < 0 ? limit : at + text.slice(at).search(/[\n\r\u2028\u2029]/);
    else if (text.startsWith('/*', at)) {
      const close = text.indexOf('*/', at + 2);
      at = close < 0 ? limit : close + 2;
    } else break;
  }
  return at < limit && text.startsWith(operator, at) ? at : -1;
}

// `process.env` (or `globalThis.process.env`, `process?.env`) and `import.meta.env`.
function isEnv(node) {
  if ((node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') || !isNamed(node.property, node.computed, 'env')) return false;
  const { object } = node;
  if (object.type === 'Identifier') return object.name === 'process';
  if (object.type === 'MetaProperty') return object.meta.name === 'import' && object.property.name === 'meta';
  return (object.type === 'MemberExpression' || object.type === 'OptionalMemberExpression') && isNamed(object.property, object.computed, 'process');
}
const isNamed = (property, computed, name) => (computed ? property.type === 'StringLiteral' && property.value === name : property.type === 'Identifier' && property.name === name);

// The ranges no change is made in: the test of an `if` or of `a ? b : c` that reads the environment, and an operator
// expression that reads it. Merged and sorted, so a change is looked up in them by its start.
function envGuards(program) {
  const env = [];
  const candidates = [];
  walk(program, (node) => {
    if (isEnv(node)) env.push(node.start);
    if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') candidates.push([node.test.start, node.test.end]);
    if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') candidates.push([node.start, node.end]);
  });
  if (!env.length) return [];
  env.sort((a, b) => a - b);
  const reads = ([start, end]) => {
    let low = 0;
    let high = env.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (env[mid] < start) low = mid + 1;
      else high = mid;
    }
    return low < env.length && env[low] < end;
  };
  const guards = candidates.filter(reads).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of guards) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
const inside = (ranges, offset) => {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (ranges[mid][1] <= offset) low = mid + 1;
    else if (ranges[mid][0] > offset) high = mid - 1;
    else return true;
  }
  return false;
};

export function mutants(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
  const guards = envGuards(program);
  const found = [];
  const lineAt = lineIndex(text);
  // A replacement never fuses with its neighbours: `i+-1` becomes `i- -1`, `return!a?b:c` becomes `return true?b:c`.
  const add = (node, kind, replacement, start = node.start, end = node.end) => {
    const before = text[start - 1] ?? '';
    const after = text[end] ?? '';
    const word = /[\w$]/;
    const sign = /[-+*/=!<>&|]/;
    const padded = kind === 'operator' ? sign : word;
    const lead = padded.test(before) && (kind === 'operator' || word.test(replacement[0])) ? ' ' : '';
    const trail = padded.test(after) && (kind === 'operator' || word.test(replacement.at(-1))) ? ' ' : '';
    if (!inside(guards, start)) found.push({ start, end, replacement: lead + replacement + trail, kind, line: lineAt(start) });
  };
  walk(program, (node) => {
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ObjectMethod':
      case 'ClassMethod':
      case 'ClassPrivateMethod':
      case 'ArrowFunctionExpression': {
        const { body } = node;
        if (!body) break;
        if (body.type === 'BlockStatement') {
          if (body.body.length || body.directives?.length) add(node, 'body', '{}', body.start, body.end);
        } else if (!(body.type === 'Identifier' && body.name === 'undefined')) add(node, 'body', 'undefined', body.start, body.end);
        break;
      }
      case 'IfStatement':
      case 'ConditionalExpression': {
        const { test } = node;
        for (const value of ['true', 'false']) {
          if (!(test.type === 'BooleanLiteral' && String(test.value) === value)) add(node, 'condition', value, test.start, test.end);
        }
        break;
      }
      case 'BinaryExpression':
      case 'LogicalExpression': {
        const to = FLIP.get(node.operator);
        const at = to && operatorAt(text, node.left.end, node.right.start, node.operator);
        if (to && at >= 0) add(node, 'operator', to, at, at + node.operator.length);
        break;
      }
      case 'BooleanLiteral':
        add(node, 'literal', String(!node.value));
        break;
      default:
    }
  });
  const rank = (change) => KIND_ORDER.indexOf(change.kind);
  return found
    .map((change, order) => ({ change, order }))
    .sort((a, b) => rank(a.change) - rank(b.change) || a.change.start - b.change.start || a.order - b.order)
    .map(({ change }) => change);
}

const isExpectCall = (node) => node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'expect';

// The lines of each test call and each expect call, and a test call's offsets in the text and the points Vitest can
// place its tests at (§3.5). A test is `skip` when its own call, or a describe whose function it sits in, skips it
// (test-calls.mjs's SKIPS; §3.5, §3.8); and the lines of each import declaration that nothing else shares a line
// with, so a test written beside an import is never read as part of it (#652).
// Whether a test call's chain holds a tagged-template table (it.each`…`('x', fn)): Vitest can place its tests lines
// away from the call, inside another one, so the step trusts no place in that file (#655).
function tagged(call) {
  for (let at = call.callee; at;) {
    if (at.type === 'TaggedTemplateExpression') return true;
    at = at.tag ?? at.callee ?? at.object ?? at.expression ?? null;
  }
  return false;
}

// The places Vitest can give a test of this call: V8 places a call at its name when the callee is a name, at the
// property when it is a member, and at the parenthesis that opens its arguments otherwise; a chain (it.skip.each(rows))
// has one of each link. Nothing between them is a place (#655).
function pointsOf(call, text) {
  const out = [];
  for (let at = call; at;) {
    if (at.type === 'CallExpression' || at.type === 'OptionalCallExpression') {
      out.push(text.indexOf('(', at.callee.end));
      at = at.callee;
    } else if (at.type === 'TaggedTemplateExpression') at = at.tag;
    else if (at.type === 'MemberExpression' || at.type === 'OptionalMemberExpression') {
      out.push(at.property.start);
      at = at.object;
    } else if (at.type === 'Identifier') {
      out.push(at.start);
      at = null;
    } else at = at.expression ?? null;
  }
  return out;
}

export function spans(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
  const lineAt = lineIndex(text);
  const tests = [];
  const expects = [];
  const skipping = [];
  const at = (node) => ({ first: lineAt(node.start), last: lineAt(node.end - 1), start: node.start, end: node.end });
  walk(program, (node) => {
    const chain = callChain(node);
    if (chain && TESTS.has(chain.base)) tests.push({ ...at(node), skip: skips(chain), tagged: tagged(node), points: pointsOf(node, text) });
    else if (chain && SUITES.has(chain.base)) {
      const fn = skips(chain) && body(node);
      if (fn) skipping.push(at(fn));
    } else if (isExpectCall(node)) expects.push(at(node));
  });
  const lines = ({ first, last }) => ({ first, last });
  const alone = (n) => /^[ \t]*$/.test(text.slice(text.lastIndexOf('\n', n.start - 1) + 1, n.start))
    && /^[ \t]*(?:\/\/[^\n]*)?(?:\r?\n|$)/.test(text.slice(n.end));
  return {
    tests: tests.map((t) => ({ ...lines(t), start: t.start, end: t.end, points: t.points, skip: t.skip || skipping.some((s) => s.start <= t.start && t.end <= s.end), ...(t.tagged ? { tagged: true } : {}) })),
    expects: expects.map(lines),
    imports: program.body.filter((n) => n.type === 'ImportDeclaration' && alone(n)).map((n) => lines(at(n))),
  };
}

// The paths a file imports from or re-exports from, as written; a type-only import is left out (§3.6).
export function imports(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
  const paths = [];
  for (const node of program.body) {
    const isImport = node.type === 'ImportDeclaration' && node.importKind !== 'type';
    const isReExport = (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') && node.exportKind !== 'type';
    const from = (isImport || isReExport) && node.source?.value;
    if (typeof from === 'string' && !paths.includes(from)) paths.push(from);
  }
  return paths;
}

export function reExports(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
  const paths = [];
  for (const node of program.body) {
    const from = (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') && node.source?.value;
    if (typeof from === 'string' && from.startsWith('.') && !paths.includes(from)) paths.push(from);
  }
  return paths;
}
