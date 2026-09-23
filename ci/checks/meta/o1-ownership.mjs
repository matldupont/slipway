#!/usr/bin/env node
// O1 — ownership. Slipway only: this file is `internal` in its own map and never ships.
//
// Reports `unclassified/<path>` for every path new-project would copy (lib/ownership.mjs
// shippedPaths) that no glob in dev/ownership.yaml matches.
//
// WHY: the class is what a later sync acts on — replace a managed file, never write a seeded one.
// A path with no class has no safe action, so it must not ship. new-project runs the same
// classification before copying and refuses on the same finding.

import { classify, listSource, loadOwnership, MAP, shippedPaths } from '../lib/ownership.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';

let broken = null;
let paths = [];
const findings = [];
const counts = {};
try {
  const rules = loadOwnership(root);
  paths = shippedPaths(root, rules);
  for (const p of paths) {
    const c = classify(rules, p);
    if (c) counts[c] = (counts[c] ?? 0) + 1;
    else findings.push({ where: `unclassified/${p}`, detail: `matches no glob in ${MAP} — give it a class` });
  }
} catch (e) {
  broken = e.message;
}

const tally = Object.entries(counts).map(([c, n]) => `${n} ${c}`).join(', ');
process.exit(
  report({
    id: 'O1',
    claim: `every path new-project would copy has an owner class in ${MAP} (${tally})`,
    scanned: paths.length,
    unit: `shipped paths (${listSource(root) === 'git' ? 'git ls-files' : 'directory walk'})`,
    findings,
    broken,
  })
);
