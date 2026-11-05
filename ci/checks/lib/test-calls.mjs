// What a parsed call is to the tests-can-fail step (dev/features/tests-can-fail.md §3.5, §3.8): a test or a suite, and
// whether its own text skips it. Which tests exist is the runner's report's to say, never this file's. Pure: it reads
// the nodes mutants.mjs's parser gives, and imports no parser itself.

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
// What a condition is when its text says so: a literal, `!` or `void` of one, or none given; null when it does not.
function truthy(node) {
  if (!node || (node.type === 'Identifier' && node.name === 'undefined')) return false;
  const at = unwrap(node);
  if (at.type === 'BooleanLiteral' || at.type === 'NumericLiteral' || at.type === 'StringLiteral') return Boolean(at.value);
  if (at.type === 'NullLiteral') return false;
  if (at.type === 'UnaryExpression' && at.operator === 'void') return false;
  if (at.type === 'UnaryExpression' && at.operator === '!') {
    const inner = truthy(at.argument);
    return inner === null ? null : !inner;
  }
  return null;
}
// A condition that makes skipIf or runIf skip nothing: skipIf(false), skipIf(0), runIf(true), runIf(1).
const noSkip = (form, call) => truthy(call.arguments?.[0]) === (form === 'runIf');

// The name a callee starts from and the modifiers on the way, through the forms that take a call first: it.only,
// it.concurrent.skip, it.each(rows), it.skipIf(c).each`table`. Null at any other link (a computed key, another
// property, a member such as `/x/.test`). A loop, not a recursion: a chain of 12,000 `.only` links parses, and a
// recursion would overflow on it.
function chainOf(callee) {
  const mods = new Set();
  let at = unwrap(callee);
  for (;;) {
    if (at.type === 'Identifier') return { base: at.name, mods };
    if (isMember(at)) {
      const name = nameOf(at);
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
