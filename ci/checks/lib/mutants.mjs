// What the vendored @babel/parser gives the tests-can-fail step (dev/features/tests-can-fail.md §2, D-037):
// the changes a source file can get, the lines of each test and each expect call, and the paths a file
// re-exports from. This is the only file that imports the parser. Pure: it reads text it is handed.

import { parse } from './vendor/babel-parser.mjs';

const NOT_SOURCE = { unreadable: 'not JavaScript or TypeScript' };
const SOURCE = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/;
// `.ts` reads `<T>x` as a cast, so JSX is read everywhere else only.
const NO_JSX = /\.[cm]?ts$/;

// Keys that hold a type, never code to change.
const TYPE_KEYS = new Set(['typeAnnotation', 'typeParameters', 'typeArguments', 'superTypeArguments']);
const FLIP = new Map([['===', '!=='], ['==', '!='], ['<', '<='], ['>', '>='], ['&&', '||'], ['+', '-'], ['*', '/']]);
for (const [from, to] of [...FLIP]) FLIP.set(to, from);
const KIND_ORDER = ['body', 'condition', 'operator', 'literal'];
const TEST_MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'each']);

function read(path, text) {
  if (!SOURCE.test(path)) return NOT_SOURCE;
  try {
    const plugins = NO_JSX.test(path) ? ['typescript'] : ['typescript', 'jsx'];
    return parse(text, { sourceType: 'unambiguous', plugins, errorRecovery: false, allowReturnOutsideFunction: true }).program;
  } catch (error) {
    return { unreadable: String(error?.message ?? error) };
  }
}

const isNode = (value) => value !== null && typeof value === 'object' && typeof value.type === 'string';

// Calls visit(node) on every node of code, in source order. An import and a re-export hold no expression, and a
// type sits under one of TYPE_KEYS, so none of them is visited as code.
function walk(node, visit) {
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (TYPE_KEYS.has(key) || key === 'loc' || key === 'extra' || key.endsWith('Comments') || key === 'comments') continue;
    if (Array.isArray(value)) for (const item of value) if (isNode(item)) walk(item, visit);
    if (isNode(value)) walk(value, visit);
  }
}

// The operator between two operands: past closing parentheses, spaces and comments after the left one.
function operatorAt(text, from, operator) {
  let at = from;
  for (;;) {
    if (/\s|\)/.test(text[at])) at += 1;
    else if (text.startsWith('//', at)) at = text.indexOf('\n', at) < 0 ? text.length : text.indexOf('\n', at);
    else if (text.startsWith('/*', at)) at = text.indexOf('*/', at) + 2;
    else break;
  }
  return text.startsWith(operator, at) ? at : -1;
}

export function mutants(path, text) {
  const program = read(path, text);
  if (program.unreadable) return program;
  const found = [];
  const lineAt = (offset) => text.slice(0, offset).split('\n').length;
  const add = (node, kind, replacement, start = node.start, end = node.end) =>
    found.push({ start, end, replacement, kind, line: lineAt(start) });
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
        const at = to && operatorAt(text, node.left.end, node.operator);
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
  const tests = [];
  const expects = [];
  walk(program, (node) => {
    const into = isTestCall(node) ? tests : isExpectCall(node) ? expects : null;
    if (into) into.push({ first: node.loc.start.line, last: node.loc.end.line });
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
