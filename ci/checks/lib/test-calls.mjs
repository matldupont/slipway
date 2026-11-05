// What a parsed call is to the tests-can-fail step (dev/features/tests-can-fail.md §3.5, §3.8): a test, a suite, or a
// call shaped like a test that it cannot read as one, and whether its own text skips it. Pure: it reads the nodes
// mutants.mjs's parser gives, and imports no parser itself.

const TEST_MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'sequential', 'fails', 'shuffle']);
// The forms that take their own call before the test's: it.each(rows)('x', fn), it.for(rows)('x', fn),
// it.skipIf(c)('x', fn), it.runIf(c)('x', fn), and it.each`table`('x', fn).
const CALL_FORMS = new Set(['each', 'for', 'skipIf', 'runIf']);
// What the step reads through to reach a callee: a parenthesis, a TypeScript assertion or non-null mark, and the last
// expression of a sequence, as in `(0, it)`.
const WRAPPERS = new Set(['ParenthesizedExpression', 'TSNonNullExpression', 'TSAsExpression', 'TSSatisfiesExpression', 'TSTypeAssertion']);
function unwrap(node) {
  let at = node;
  for (;;) {
    if (WRAPPERS.has(at.type)) at = at.expression;
    else if (at.type === 'SequenceExpression') at = at.expressions.at(-1);
    else return at;
  }
}
const isCall = (n) => n.type === 'CallExpression' || n.type === 'OptionalCallExpression';
const isMember = (n) => n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression';
const nameOf = (m) => (!m.computed && m.property.type === 'Identifier' ? m.property.name : null);
export const TESTS = new Set(['it', 'test']);
export const SUITES = new Set(['describe', 'suite']);
// A literal that makes skipIf or runIf skip nothing: skipIf(false), runIf(true).
const noSkip = (form, call) => call.arguments?.[0]?.type === 'BooleanLiteral' && call.arguments[0].value === (form === 'runIf');

// The name a callee starts from and the modifiers on the way, through the forms that take a call first: it.only,
// it.concurrent.skip, it.each(rows), it.skipIf(c).each`table`; a namespace or global (`v.it`, `globalThis.test`) starts
// at its it or test. Null at any other link (a computed key, another property). A loop, not a recursion: a chain of
// 12,000 `.only` links parses, and a recursion would overflow on it.
function chainOf(callee) {
  const mods = new Set();
  let at = unwrap(callee);
  for (;;) {
    if (at.type === 'Identifier') return { base: at.name, mods };
    if (isMember(at)) {
      const name = nameOf(at);
      if (TESTS.has(name) || SUITES.has(name)) return { base: name, mods };
      if (!TEST_MODIFIERS.has(name)) return null;
      mods.add(name);
      at = unwrap(at.object);
    } else if (isCall(at) || at.type === 'TaggedTemplateExpression') {
      const inner = unwrap(isCall(at) ? at.callee : at.tag);
      const form = isMember(inner) ? nameOf(inner) : null;
      if (!CALL_FORMS.has(form)) return null;
      if (at.type === 'TaggedTemplateExpression' && form !== 'each' && form !== 'for') return null;
      if (!(isCall(at) && noSkip(form, at))) mods.add(form);
      at = unwrap(inner.object);
    } else return null;
  }
}

// A call that declares one test or one suite: it('x', fn), it.only('x', fn), it.each(rows)('x', fn),
// it.each`table`('x', fn), it.for(rows)('x', fn), it.skipIf(c)('x', fn), describe.skip('x', fn), it?.('x', fn). The
// inner call of a form (it.each(rows)) declares none. Its chain, or null.
export function callChain(node) {
  if (!isCall(node)) return null;
  const callee = unwrap(node.callee);
  if (isMember(callee) && CALL_FORMS.has(nameOf(callee))) return null;
  return chainOf(callee);
}
// What in a call's own text makes the runner skip it before it runs (§3.8): the owner's words, and no others. A
// `.only` on the same call wins over them, as it does in Vitest.
const SKIPS = ['skip', 'todo', 'skipIf', 'runIf'];
export const skips = (chain) => !chain.mods.has('only') && SKIPS.some((m) => chain.mods.has(m));
const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionExpression']);
// The function a suite runs its tests in: a test is inside a describe only inside it.
export const body = (node) => node.arguments.findLast((a) => FUNCTIONS.has(a.type)) ?? null;

// Whether a callee names it or test anywhere: `it.call(…)`, `[it][0](…)`. Its own walk, as the callee is small.
function namesTest(callee) {
  const stack = [callee];
  while (stack.length) {
    const n = stack.pop();
    if ((n.type === 'Identifier' && TESTS.has(n.name)) || (isMember(n) && TESTS.has(nameOf(n)))) return true;
    for (const [key, v] of Object.entries(n)) {
      if (key === 'loc' || key.endsWith('Comments')) continue;
      for (const c of Array.isArray(v) ? v : [v]) if (c && typeof c === 'object' && typeof c.type === 'string') stack.push(c);
    }
  }
  return false;
}
// A call shaped like a test that the step cannot read as one, asked of a call callChain() reads as no test or suite.
// `{ root: null }` when its callee names it or test, with a name or a function among its arguments
// (`it.call(null, 'x', fn)`). Otherwise `{ root, marked }` for a call on another name that passes a name and then a
// function, or a function after any first argument: `marked` when a modifier, a form or a computed key sits on its
// chain (`later.skip('x', fn)`); spans() keeps an unmarked one only when its root is an alias of it or test. Only those
// links may sit on the chain, so `app.get('/x', fn)` is not one, nor vi.mock or expect. Null when it is not one.
export function testShaped(node) {
  if (!isCall(node)) return null;
  const args = node.arguments;
  const named = (a) => a.type === 'StringLiteral' || a.type === 'TemplateLiteral';
  if (namesTest(node.callee)) return args.some((a) => named(a) || FUNCTIONS.has(a.type)) ? { root: null, marked: true } : null;
  if (args.length < 2 || !args.slice(1, 3).some((a) => FUNCTIONS.has(a.type) || (named(args[0]) && a.type === 'Identifier'))) return null;
  let at = unwrap(node.callee);
  let marked = false;
  for (;;) {
    if (isMember(at) && (at.computed || TEST_MODIFIERS.has(nameOf(at)) || CALL_FORMS.has(nameOf(at)))) at = unwrap(at.object);
    else if (isCall(at)) {
      const c = unwrap(at.callee);
      at = isMember(c) ? unwrap(c.object) : c;
    } else break;
    marked = true;
  }
  return at.type === 'Identifier' && at.name !== 'vi' && at.name !== 'expect' ? { root: at.name, marked } : null;
}
// A name the file makes an alias of it or test: `const later = it.skip`, `const myTest = test.extend(…)`, or an import
// of it, test or a suite from 'vitest' under another name. A function that calls it (`(n, f) => it(n, f)`) is not one:
// the runner lists its test at that call.
export function aliasName(node) {
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && !FUNCTIONS.has(unwrap(node.init).type) && namesTest(node.init)) return [node.id.name];
  if (node.type !== 'ImportDeclaration' || node.source.value !== 'vitest') return [];
  return node.specifiers.filter((s) => s.type === 'ImportSpecifier' && s.local.name !== (s.imported.name ?? s.imported.value)).map((s) => s.local.name);
}
