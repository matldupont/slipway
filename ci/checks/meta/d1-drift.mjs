#!/usr/bin/env node
// D1 — drift. Ships to every project.
//
// Compares every `managed` file in .slipway/manifest.json with the file on disk:
//   drift/<path>            its hash differs, or it was deleted, and no override declares why
//   override/stale/<path>   an override lists a path that matches its manifest hash again, or that is
//                           not a managed file in the manifest: it excuses nothing (M3's stale entry)
//   override/reason/<path>  an override with an empty reason; it excuses nothing
// No manifest is BROKEN, never green: the fix is to adopt one with `sync --adopt` (F-01 step 5).
//
// WHY: sync replaces a managed file only when it still matches its install hash. An undeclared edit
// is lost on the next sync, or blocks it; D1 says so while the edit is still fresh.
//
// Only `managed` entries are checked. `seeded` and `merged` hashes are the base sync diffs against,
// not a promise the project made. A file the manifest does not list is the project's.
//
// TEMPLATE MODE. Slipway itself is the source, not an install, so it has no manifest. With no
// manifest and both `dev/ownership.yaml` and `scripts/new-project.mjs` present — internal files
// new-project never copies; a project's own `dev/` folder alone is not enough — D1 claims exactly
// that and exits green. What proves D1 against a real install is slipway's own
// scripts/new-project.test.mjs, which creates a project and runs D1 in it.

import { hasReason, isTemplate, MANIFEST, NOT_A_FILE, OVERRIDES, readManifest, readOverrides, readProjectFile, sha256, TEMPLATE_MARKERS } from '../lib/manifest.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';

let manifest;
let overrides;
try {
  manifest = readManifest(root);
  overrides = readOverrides(root);
} catch (e) {
  process.exit(report({ id: 'D1', claim: '', scanned: 0, unit: 'managed files', broken: e.message }));
}

if (!manifest && isTemplate(root)) {
  process.exit(
    report({
      id: 'D1',
      claim: `template mode — this is slipway itself (${TEMPLATE_MARKERS.join(' and ')} present, no ${MANIFEST}), the source files are the base, so nothing can drift; every project new-project creates is checked against its own manifest`,
      scanned: TEMPLATE_MARKERS.length,
      unit: 'template markers (template mode)',
    })
  );
}
if (!manifest) {
  process.exit(
    report({
      id: 'D1',
      claim: '',
      scanned: 0,
      unit: 'managed files',
      broken: `manifest/missing — no ${MANIFEST}, so drift cannot be told from a deliberate edit; adopt one with \`sync --adopt\``,
    })
  );
}

const managed = Object.entries(manifest.files).filter(([, f]) => f.class === 'managed');
const hashes = new Map(managed.map(([p, f]) => [p, f.sha256]));
const findings = [];
const excused = new Set();

// null when deleted. A directory, symlink or other non-file in its place is drift too, never a crash.
const current = (p) => {
  const buf = readProjectFile(root, p);
  return Buffer.isBuffer(buf) ? sha256(buf) : buf;
};

for (const o of overrides) {
  if (!hasReason(o)) {
    findings.push({ where: `override/reason/${o.path}`, detail: `override in ${OVERRIDES}:${o.line} has no reason — it excuses nothing until it says why` });
  } else if (!hashes.has(o.path)) {
    findings.push({ where: `override/stale/${o.path}`, detail: `override in ${OVERRIDES}:${o.line} names no managed file in ${MANIFEST} — remove it` });
  } else if (current(o.path) === hashes.get(o.path)) {
    findings.push({ where: `override/stale/${o.path}`, detail: `the file matches its install hash again — remove the override in ${OVERRIDES}:${o.line}` });
  } else {
    excused.add(o.path);
  }
}

const exempted = [];
for (const [p, want] of hashes) {
  const got = current(p);
  if (got === want) continue;
  if (excused.has(p)) {
    exempted.push(p);
    continue;
  }
  findings.push({
    where: `drift/${p}`,
    detail: `${got === null ? 'deleted' : got === NOT_A_FILE ? 'replaced by a non-file' : 'edited'} since install, and not in ${OVERRIDES} — revert it, or add an override with the reason`,
  });
}

process.exit(
  report({
    id: 'D1',
    claim: `every managed file matches its hash in ${MANIFEST} (slipway ${manifest.slipway ?? `${manifest.version ?? 'unknown'}, sha unresolved`}) or is declared in ${OVERRIDES} with a reason, and no override is stale`,
    scanned: managed.length,
    unit: 'managed files',
    findings,
    exempted,
  })
);
