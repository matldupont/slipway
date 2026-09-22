#!/usr/bin/env node
// M1 — declared vs invoked.
//
// A gate that exists but never runs is worse than no gate: it reads as coverage.
// M1 proves two things from the repository alone:
//   1. every gated script (check, lint, test, build, typecheck, and their `:sub` forms)
//      declared by any workspace package is invoked by a CI workflow;
//   2. every check in ci/checks/meta/ is run by a CI workflow.
//
// WHY: a package's `test` script that no workflow runs reads as coverage for as long as
// nobody looks. So do gates on disk wired to nothing: a hook manager never installed, a
// hook wired to no settings file, a hook framework with no rules.
//
// Invocations are read from workflow `run:` lines, and from root package scripts those
// lines call (followed up to 3 levels):
//   pnpm --filter <exact name> [run] <script>   that package
//   pnpm -r [run] <script>                      every package declaring it
//   turbo run <tasks>, unfiltered               every package declaring them
//   node ci/verify.mjs                          every package, for check/lint/test/build
//   pnpm [run] <root script>                    the root script and what it calls
//   node ci/checks/meta/<check>.mjs             that check
//
// Not invocations — each is a trap in the fixture: a command in a shell comment; a
// filter M1 cannot resolve to one package (`...`, globs, `[ref]`); `pnpm exec <tool>`,
// which bypasses the declared script; a root script no workflow calls; `verify` for a
// `test:<sub>` script, which verify does not run. Commands inside shell files are
// invisible by design: call gates from the workflow or a root script, where the wiring
// stays legible.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommand, workflowCommands } from '../lib/commands.mjs';
import { report } from '../lib/report.mjs';
import { GATED, VERIFY_TASKS } from '../lib/tasks.mjs';
import { discoverWorkspace } from '../lib/workspace.mjs';

const root = process.argv[2] ?? '.';
const UNIT = 'gated scripts and check files';

let ws;
try {
  ws = discoverWorkspace(root);
} catch (e) {
  process.exit(report({ id: 'M1', claim: '', scanned: 0, unit: UNIT, broken: e.message }));
}

const members = ws.packages;
const covered = new Set();
const invokedChecks = new Set();
const key = (p, script) => `${p.name}:${script}`;

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
      const m = inv.path.match(/^ci\/checks\/meta\/([\w.-]+\.mjs)$/);
      if (m) invokedChecks.add(m[1]);
    }
  }
}

const commands = workflowCommands(root);
for (const c of commands) apply(c.cmd, 0);

const findings = [];
let gated = 0;
for (const p of [ws.root, ...members]) {
  for (const script of Object.keys(p.scripts)) {
    if (!GATED.test(script)) continue;
    gated++;
    if (!covered.has(key(p, script))) {
      findings.push({ where: key(p, script), detail: 'declared, but no CI workflow invokes it — a gate that never runs' });
    }
  }
}

const checksDir = join(root, 'ci', 'checks', 'meta');
const checkFiles = existsSync(checksDir) ? readdirSync(checksDir).filter((f) => f.endsWith('.mjs')).sort() : [];
for (const f of checkFiles) {
  if (!invokedChecks.has(f)) {
    findings.push({ where: `check:${f}`, detail: 'the check exists, but no CI workflow runs it — declared, not installed' });
  }
}

process.exit(
  report({
    id: 'M1',
    claim: 'every gated script and every check is invoked by a CI workflow',
    scanned: gated + checkFiles.length,
    unit: `${UNIT} (${commands.length} workflow commands read)`,
    findings,
  })
);
