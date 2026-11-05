// What a parsed call is to the tests-can-fail step (dev/features/tests-can-fail.md §3.5, §3.8): a test, a suite, or a
// call shaped like a test that it cannot read as one, and whether its own text skips it. Pure: it reads the nodes
// mutants.mjs's parser gives, and imports no parser itself.

const TEST_MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'sequential', 'fails']);
// The forms that take their own call before the test's: it.each(rows)('x', fn), it.for(rows)('x', fn),
// it.skipIf(c)('x', fn), it.runIf(c)('x', fn), and it.each`table`('x', fn).
const CALL_FORMS = new Set(['each', 'for', 'skipIf', 'runIf']);
// The name a callee starts from and the modifiers on the way, through the forms that take a call first: it.only,
// it.concurrent.skip, it.each(rows), it.skipIf(c).each`table`; null at any other link (a computed key, another
// property). A loop, not a recursion: a chain of 12,000 `.only` links parses, and a recursion would overflow on it.
function chainOf(callee) {
  const mods = new Set();
  let at = callee;
  for (;;) {
    if (at.type === 'Identifier') return { base: at.name, mods };
    if (at.type === 'MemberExpression') {
      if (at.computed || at.property.type !== 'Identifier' || !TEST_MODIFIERS.has(at.property.name)) return null;
      mods.add(at.property.name);
      at = at.object;
    } else if (at.type === 'CallExpression' || at.type === 'TaggedTemplateExpression') {
      const inner = at.type === 'CallExpression' ? at.callee : at.tag;
      if (inner.type !== 'MemberExpression' || inner.computed || inner.property.type !== 'Identifier' || !CALL_FORMS.has(inner.property.name)) return null;
      if (at.type === 'TaggedTemplateExpression' && inner.property.name !== 'each' && inner.property.name !== 'for') return null;
      mods.add(inner.property.name);
      at = inner.object;
    } else return null;
  }
}

// A call that declares one test or one suite: it('x', fn), it.only('x', fn), it.each(rows)('x', fn),
// it.each`table`('x', fn), it.for(rows)('x', fn), it.skipIf(c)('x', fn), describe.skip('x', fn). The inner call of a
// form (it.each(rows)) declares none. Its chain, or null.
export function callChain(node) {
  if (node.type !== 'CallExpression') return null;
  const { callee } = node;
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && CALL_FORMS.has(callee.property.name)) return null;
  return chainOf(callee);
}
export const TESTS = new Set(['it', 'test']);
export const SUITES = new Set(['describe', 'suite']);
// What in a call's own text makes the runner skip it before it runs (§3.8): the owner's words, and no others.
const SKIPS = ['skip', 'todo', 'skipIf', 'runIf'];
export const skips = (chain) => SKIPS.some((m) => chain.mods.has(m));
const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionExpression']);
// A call shaped like a test that the step cannot read as one, asked of a call callChain() reads as no test or suite: a
// name, then a function (an alias of it.skip, test.extend's test, a computed modifier on it). Only the modifiers' own
// names or a computed key may sit on its chain, so `app.get('/x', fn)` is not one, nor vi.mock or expect.
export function testShaped(node) {
  if (node.type !== 'CallExpression') return false;
  const [name, ...rest] = node.arguments;
  if (!name || (name.type !== 'StringLiteral' && name.type !== 'TemplateLiteral') || !rest.slice(0, 2).some((a) => FUNCTIONS.has(a.type))) return false;
  let at = node.callee;
  while (at.type === 'MemberExpression' && (at.computed || TEST_MODIFIERS.has(at.property.name) || CALL_FORMS.has(at.property.name))) at = at.object;
  while (at.type === 'CallExpression') at = at.callee.type === 'MemberExpression' ? at.callee.object : at.callee;
  return at.type === 'Identifier' && at.name !== 'vi' && at.name !== 'expect';
}
