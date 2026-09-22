// One definition of what `verify` runs, shared by ci/verify.mjs and M1, so M1's
// idea of "covered by verify" cannot drift from what verify actually runs.
export const VERIFY_TASKS = ['check', 'lint', 'test', 'build'];

// verify refuses to run without these: a workspace with no typecheck or no tests
// has nothing to prove.
export const REQUIRED_TASKS = ['check', 'test'];

// Script names M1 treats as gates. `test:unit`, `check:types` and friends are gates
// too — and verify does NOT run them, only the bare names above.
export const GATED = /^(check|lint|test|build|typecheck)(:[\w:-]+)?$/;
