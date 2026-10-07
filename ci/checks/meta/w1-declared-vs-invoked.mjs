#!/usr/bin/env node
// W1 — declared vs invoked.
//
// A gate that exists but never runs is worse than no gate: it reads as coverage.
// W1 proves three things from the repository alone:
//   1. every gated script (check, lint, test, build, typecheck, and their `:sub` forms)
//      declared by any workspace package is invoked by a CI workflow;
//   2. every check in ci/checks/meta/ is run by a CI workflow;
//   3. in slipway itself (lib/manifest.mjs isTemplate), every `scripts/**/*.test.mjs` is run
//      by a CI workflow — they prove new-project and sync, and never ship. A project's own scripts/
//      is not read: its tests usually run through a runner W1 cannot see into.
//
// WHY: a package's `test` script that no workflow runs reads as coverage for as long as
// nobody looks. So do gates on disk wired to nothing: a hook manager never installed, a
// hook wired to no settings file, a hook framework with no rules.
//
// Only a workflow that runs on a pull request, or on a push to a branch, counts (lib/workflows.mjs
// workflowTrigger). A gate that only a tag, a schedule, a manual dispatch or a reusable workflow runs never ran
// on the change being merged: a release workflow that runs every check on a version tag would otherwise cover
// for a pull-request workflow that runs none (#239). Path filters are not read, and neither is what a branch
// pattern matches, beyond one that can match no branch. A workflow W1 cannot read counts for nothing: a
// warning names it, and so does each finding.
//
// A reusable workflow (`workflow_call`) counts when a workflow that counts calls it with
// `uses: ./.github/workflows/<file>`: its steps run when its caller does. Not followed, and named in each
// finding: a call to another repository's workflow, an expression in `uses:`, a file that is missing, and
// whatever a called workflow calls in turn.
//
// One exception, for check files only: a check whose subject is an issue can run on no change, so a workflow
// that runs when an issue is opened (`issues`, with no `types:` or with `opened`) counts for a
// `node ci/checks/meta/<check>.mjs` line it holds, and for nothing else: never a package's script, a root
// script or a slipway test. Known limit: W1 does not know a check's subject, so a check that reads a change,
// moved to such a workflow, would still count.
//
// Invocations are read from the `run:` of each step of each job of those workflows, and from root package
// scripts those lines call (followed up to 3 levels):
//   pnpm --filter <exact name> [run] <script>   that package
//   pnpm -r [run] <script>                      every package declaring it
//   turbo run <tasks>, unfiltered               every package declaring them
//   node ci/verify.mjs                          every package, for check/lint/test/build
//   pnpm [run] <root script>                    the root script and what it calls
//   node ci/checks/meta/<check>.mjs             that check
//   node scripts/<…>.test.mjs                   that test (slipway only)
//
// Not invocations — each is a trap in the fixture: a command in a shell comment (whole-line or
// trailing); an `echo`/`printf` argument; the right side of `||`, which runs only on failure; a
// filter W1 cannot resolve to one package (`...`, globs, `[ref]`); `pnpm exec <tool>`,
// which bypasses the declared script; a root script no workflow calls; `verify` for a
// `test:<sub>` script, which verify does not run. Commands inside shell files are
// invisible by design: call gates from the workflow or a root script, where the wiring
// stays legible.
//
// A workflow file is read through a YAML parser (lib/workflow-yaml.mjs, D-033), never by matching its text. What
// that reader refuses (an anchor, an alias, a tag, a merge key, a key written twice, more than one document) and
// what the parser cannot read is unread, with the reason and, where there is one, how to write it so it is read.
// The parser holds to the YAML specification, so a file GitHub's more lenient reader accepts can be unread here:
// that fails closed. What stays a limit: GitHub's reader and this parser may still differ on a file both read.

import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommand } from '../lib/commands.mjs';
import { isTemplate } from '../lib/manifest.mjs';
import { report } from '../lib/report.mjs';
import { GATED, VERIFY_TASKS } from '../lib/tasks.mjs';
import { workflowCommands } from '../lib/workflows.mjs';
import { discoverWorkspace } from '../lib/workspace.mjs';

const root = process.argv[2] ?? '.';
const UNIT = isTemplate(root) ? 'gated scripts, check files and slipway tests' : 'gated scripts and check files';

let ws;
try {
  ws = discoverWorkspace(root);
} catch (e) {
  process.exit(report({ id: 'W1', claim: '', scanned: 0, unit: UNIT, broken: e.message }));
}

const members = ws.packages;
const covered = new Set();
const invokedChecks = new Set();
const invokedPaths = new Set();
const key = (p, script) => `${p.name}:${script}`;
const CHECK_FILE = /^ci\/checks\/meta\/([\w.-]+\.mjs)$/;

function resolveFilter(f) {
  if (/\.\.\.|[*[\]{}!^]/.test(f)) return null;
  if (f.startsWith('./')) return members.find((p) => p.dir === f.slice(2).replace(/\/$/, '')) ?? null;
  return members.find((p) => p.name === f) ?? null;
}

function apply(cmd, depth) {
  for (const inv of parseCommand(cmd)) {
    if (inv.kind === 'pnpm-script') {
      if (inv.filters.length) {
        for (const f of inv.filters) {
          const p = resolveFilter(f);
          if (p?.scripts[inv.script] !== undefined) covered.add(key(p, inv.script));
        }
      } else if (inv.recursive) {
        for (const p of members) if (p.scripts[inv.script] !== undefined) covered.add(key(p, inv.script));
      } else if (ws.root.scripts[inv.script] !== undefined) {
        covered.add(key(ws.root, inv.script));
        if (depth < 3) apply(ws.root.scripts[inv.script], depth + 1);
      }
    } else if (inv.kind === 'turbo' && !inv.filtered) {
      for (const t of inv.tasks) for (const p of members) if (p.scripts[t] !== undefined) covered.add(key(p, t));
    } else if (inv.kind === 'node') {
      if (inv.path === 'ci/verify.mjs') {
        for (const t of VERIFY_TASKS) for (const p of members) if (p.scripts[t] !== undefined) covered.add(key(p, t));
      }
      const m = inv.path.match(CHECK_FILE);
      if (m) invokedChecks.add(m[1]);
      invokedPaths.add(inv.path);
    }
  }
}

const workflows = workflowCommands(root);
const commands = workflows.commands;
for (const c of commands) apply(c.cmd, 0);
// A workflow that runs when an issue is opened: a check file it names directly, and nothing else.
for (const c of workflows.issueCommands) {
  for (const inv of parseCommand(c.cmd)) {
    const m = inv.kind === 'node' ? inv.path.match(CHECK_FILE) : null;
    if (m) invokedChecks.add(m[1]);
  }
}
// Said in every finding: the gate may be run by the very workflow W1 could not read.
const unreadNote = workflows.unread.length
  ? `; W1 could not read ${workflows.unread.map((u) => `${u.file} (${u.reason})`).join(', ')}, so nothing ${workflows.unread.length === 1 ? 'it runs' : 'they run'} counts${[...new Set(workflows.unread.flatMap((u) => (u.hint ? [`. ${u.hint}`] : [])))].join('')}`
  : '';
const unfollowedNote = workflows.unfollowed.length
  ? `; W1 did not follow a call in ${workflows.unfollowed.map((u) => `${u.file} (${u.reason})`).join(', ')}, so what it runs does not count`
  : '';
const ON = 'on a pull request or a push to a branch';

const findings = [];
let gated = 0;
for (const p of [ws.root, ...members]) {
  for (const script of Object.keys(p.scripts)) {
    if (!GATED.test(script)) continue;
    gated++;
    if (!covered.has(key(p, script))) {
      findings.push({ where: key(p, script), detail: `declared, but no CI workflow invokes it ${ON} — a gate that never runs on a change: add a step that runs it to .github/workflows/ci.yml, or remove the script${unreadNote}${unfollowedNote}` });
    }
  }
}

const checksDir = join(root, 'ci', 'checks', 'meta');
const checkFiles = existsSync(checksDir) ? readdirSync(checksDir).filter((f) => f.endsWith('.mjs')).sort() : [];
for (const f of checkFiles) {
  if (!invokedChecks.has(f)) {
    findings.push({ where: `check:${f}`, detail: `the check exists, but no CI workflow runs it ${ON} — declared, not installed: add it to the meta script in package.json, or to a workflow step${unreadNote}${unfollowedNote}` });
  }
}

// scripts/**/*.test.mjs, slipway only.
const tests = [];
const walkTests = (rel) => {
  for (const e of readdirSync(join(root, rel)).sort()) {
    const p = `${rel}/${e}`;
    const st = lstatSync(join(root, p));
    if (st.isDirectory() && e !== 'node_modules') walkTests(p);
    else if (st.isFile() && e.endsWith('.test.mjs')) tests.push(p);
  }
};
if (isTemplate(root)) walkTests('scripts');
for (const t of tests) {
  if (!invokedPaths.has(t)) findings.push({ where: `test:${t}`, detail: `a slipway test no CI workflow runs ${ON} — it proves nothing while it sits there: add it to the meta script in package.json${unreadNote}${unfollowedNote}` });
}

process.exit(
  report({
    id: 'W1',
    claim: `every gated script and every check${isTemplate(root) ? ', and every scripts/**/*.test.mjs,' : ''} is invoked by a CI workflow that runs on a pull request or a push to a branch`,
    scanned: gated + checkFiles.length + tests.length,
    unit: `${UNIT} (${commands.length} workflow commands read from ${workflows.counted} of ${workflows.files} workflows${workflows.issueOnly ? `, ${workflows.issueOnly} more read for check files only` : ''}${workflows.unread.length ? `, ${workflows.unread.length} unread` : ''}${workflows.unfollowed.length ? `, ${workflows.unfollowed.length} calls not followed` : ''})`,
    findings,
    // Named whether or not a gate is left uncovered: a workflow W1 could not read, or a call it did not follow.
    warnings: [
      ...workflows.unread.map((u) => ({ where: `unread:${u.file}`, detail: `W1 could not read it (${u.reason}), so nothing it runs counts${u.hint ? `. ${u.hint}` : ''}` })),
      ...workflows.unfollowed.map((u) => ({ where: `unfollowed:${u.file}`, detail: `W1 did not follow a call (${u.reason}), so what that runs does not count` })),
    ],
  })
);
