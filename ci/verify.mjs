#!/usr/bin/env node
// verify — the single gate entry point. CI, agents and humans run this one
// command, so "green" means the same thing to all three.
//
// Day-0 design (decisions.md D-003): run every declared task in every workspace package,
// in topological order, with no affected-package filtering. A filtered runner skips
// dependents (`[HEAD^1]` without `...`) and exits 0 having run nothing when no package
// matches. Filtering is a CI-time optimisation; add it when CI time is a
// measured problem, not before.
//
// Refuses to report green when it could not have proven anything: zero workspace packages
// is BROKEN, and a workspace where no package declares `check` or `test` fails before
// anything runs.
//
//   node ci/verify.mjs [root]          run
//   node ci/verify.mjs --plan [root]   print what would run, run nothing
//   node ci/verify.mjs --fast [root]   everything but `build` — the inner loop and the Stop
//                                      hook; CI always runs the full set

import { spawnSync } from 'node:child_process';
import { report } from './checks/lib/report.mjs';
import { REQUIRED_TASKS, VERIFY_TASKS } from './checks/lib/tasks.mjs';
import { discoverWorkspace } from './checks/lib/workspace.mjs';

const args = process.argv.slice(2);
const plan = args.includes('--plan');
const fast = args.includes('--fast');
const TASKS = fast ? VERIFY_TASKS.filter((t) => t !== 'build') : VERIFY_TASKS;
const root = args.find((a) => !a.startsWith('--')) ?? '.';
const UNIT = 'workspace packages';

let ws;
try {
  ws = discoverWorkspace(root);
} catch (e) {
  process.exit(report({ id: 'VERIFY', claim: '', scanned: 0, unit: UNIT, broken: e.message }));
}

const { packages } = ws;
if (packages.length === 0) {
  process.exit(
    report({
      id: 'VERIFY',
      claim: '',
      scanned: 0,
      unit: UNIT,
      broken: 'no workspace packages — add an app (BOOTSTRAP.md §1) before verify can prove anything',
    })
  );
}

const findings = [];
const steps = [];
for (const task of TASKS) {
  const declaring = packages.filter((p) => p.scripts[task] !== undefined).map((p) => p.name);
  const list = declaring.length ? `: ${declaring.join(', ')}` : '';
  process.stdout.write(`VERIFY: ${task} — declared by ${declaring.length} of ${packages.length} packages${list}\n`);
  if (declaring.length === 0) {
    if (REQUIRED_TASKS.includes(task)) {
      const proves = task === 'test' ? 'behaviour' : 'types';
      findings.push({ where: `task:${task}`, detail: `no package declares \`${task}\` — verify cannot prove ${proves}` });
    }
    continue;
  }
  steps.push({ task, declaring });
}

const ran = [];
if (!plan && findings.length === 0) {
  for (const s of steps) {
    process.stdout.write(`VERIFY: pnpm -r --workspace-concurrency=1 run ${s.task}\n`);
    const r = spawnSync('pnpm', ['-r', '--workspace-concurrency=1', 'run', s.task], { cwd: root, stdio: 'inherit' });
    if (r.status !== 0) {
      findings.push({ where: `task:${s.task}`, detail: `failed (exit ${r.status ?? r.signal}) — stopped; later tasks did not run` });
      break;
    }
    ran.push(`${s.task} in ${s.declaring.length}`);
  }
}

process.exit(
  report({
    id: 'VERIFY',
    claim: plan ? 'plan only — nothing was run' : `passed: ${ran.join(', ')}${fast ? ' (fast: build skipped)' : ''}`,
    scanned: packages.length,
    unit: UNIT,
    findings,
  })
);
