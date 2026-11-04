// What the vendored @babel/parser gives the tests-can-fail step (dev/features/tests-can-fail.md §2, D-037):
// the changes a source file can get, the lines of each test and each expect call, and the paths a file
// re-exports from. This is the only file that imports the parser. Pure: it reads text it is handed.

import { parse } from './vendor/babel-parser.mjs';

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
const TEST_MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'each']);

function read(path, text) {
  if (!SOURCE.test(path)) return { unreadable: NOT_SOURCE };
  try {
    const plugins = ['decorators', 'decoratorAutoAccessors'];
    if (TYPESCRIPT.test(path)) plugins.push('typescript');
    if (!NO_JSX.test(path)) plugins.push('jsx');
    return parse(text, { sourceType: 'unambiguous', plugins, errorRecovery: false, allowReturnOutsideFunction: true }).program;
  } catch (error) {
    // The reason is the parser's first line, cut short: it can carry text from the file.
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
      if (Array.isArray(value)) children.push(...value.filter(isNode));
      else if (isNode(value)) children.push(value);
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

export function mutants(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
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
    found.push({ start, end, replacement: lead + replacement + trail, kind, line: lineAt(start) });
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

// it / test / their modifiers, as a name: it, it.only, it.concurrent.skip. `.each` is named too.
function testName(node) {
  if (node.type === 'Identifier') return node.name === 'it' || node.name === 'test' ? [node.name] : null;
  if (node.type !== 'MemberExpression' || node.computed || node.property.type !== 'Identifier') return null;
  if (!TEST_MODIFIERS.has(node.property.name)) return null;
  const inner = testName(node.object);
  return inner && [...inner, node.property.name];
}

const endsInEach = (name) => name?.[name.length - 1] === 'each';

// A call that declares one test: it('x', fn), it.only('x', fn), it.each(rows)('x', fn), it.each`table`('x', fn).
function isTestCall(node) {
  if (node.type !== 'CallExpression') return false;
  const { callee } = node;
  if (callee.type === 'CallExpression') return endsInEach(testName(callee.callee));
  if (callee.type === 'TaggedTemplateExpression') return endsInEach(testName(callee.tag));
  const name = testName(callee);
  return Boolean(name) && !endsInEach(name);
}

const isExpectCall = (node) => node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'expect';

export function spans(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
  const lineAt = lineIndex(text);
  const tests = [];
  const expects = [];
  walk(program, (node) => {
    const into = isTestCall(node) ? tests : isExpectCall(node) ? expects : null;
    if (into) into.push({ first: lineAt(node.start), last: lineAt(node.end - 1) });
  });
  return { tests, expects };
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
