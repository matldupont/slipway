// Shared by the tests that pin which commands the harness asks about (sync.test.mjs, harness-gate-files.test.mjs, harness-gh-asks.test.mjs):
// the Bash ask rules of a settings file, as Claude Code reads them. `*` matches anything, a trailing `:*` is a
// prefix, and every other character is itself. Not a test.

const pattern = (rule) => new RegExp(`^${rule.slice(5, -1).replace(/:\*$/, '*').replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`);

// [{ rule, test(command) }] for each `Bash(...)` entry of `permissions.ask`.
export const bashAsks = (settings) =>
  (settings.permissions?.ask ?? []).filter((r) => r.startsWith('Bash(') && r.endsWith(')')).map((rule) => ({ rule, test: (cmd) => pattern(rule).test(cmd) }));
