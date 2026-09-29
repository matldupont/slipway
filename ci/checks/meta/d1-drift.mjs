#!/usr/bin/env node
// D1 — drift. Ships to every project.
//
// Compares every `managed` file in .slipway/manifest.json with the file on disk:
//   drift/<path>            its hash differs, or it was deleted, and no override declares why
//   override/stale/<path>   an override lists a path that matches its manifest hash again, or that is
//                           not a managed file in the manifest: it excuses nothing (FO1's stale entry)
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
// manifest and isTemplate (lib/manifest.mjs: the markers, and slipway's own git history, which a
// project cannot make) D1 claims exactly that and exits green. What proves D1 against a real install,
// and that a project cannot enter template mode, is slipway's own scripts/new-project.test.mjs.

import { hasReason, hasTemplateMarkers, isTemplate, MANIFEST, NOT_A_FILE, OVERRIDES, readManifest, readOverrides, readProjectFile, sha256, SLIPWAY_ROOT_COMMIT, TEMPLATE_MARKERS } from '../lib/manifest.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';

let manifest;
let overrides;
try {
  manifest = readManifest(root);
  overrides = readOverrides(root);
} catch (e) {
  process.exit(report({ id: 'D1', claim: '', scanned: 0, unit: 'files slipway maintains', broken: e.message }));
}

if (!manifest && isTemplate(root)) {
  process.exit(
    report({
      id: 'D1',
      claim: `template mode — this is slipway itself (${TEMPLATE_MARKERS.join(' and ')} present, history rooted at ${SLIPWAY_ROOT_COMMIT.slice(0, 7)}, no ${MANIFEST}), the source files are the base, so nothing can drift; every project new-project creates is checked against its own manifest`,
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
      unit: 'files slipway maintains',
      broken: `manifest/missing — ${MANIFEST} is missing. It is the record of what slipway installed, so an edit to one of slipway's files cannot be told from an update; run /sync-slipway once to create it${
        hasTemplateMarkers(root)
          ? `. ${TEMPLATE_MARKERS.join(' and ')} are here, but this is not slipway's own checkout: that needs this folder at the top of a git history whose only root is ${SLIPWAY_ROOT_COMMIT.slice(0, 7)}, and a shallow clone cannot show one`
          : ''
      }`,
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
    findings.push({ where: `override/reason/${o.path}`, detail: `${OVERRIDES}:${o.line} keeps your edit to ${o.path} but gives no reason — add one, or remove the entry` });
  } else if (!hashes.has(o.path)) {
    findings.push({ where: `override/stale/${o.path}`, detail: `${OVERRIDES}:${o.line} names ${o.path}, which is not a file slipway maintains — remove the entry` });
  } else if (current(o.path) === hashes.get(o.path)) {
    findings.push({ where: `override/stale/${o.path}`, detail: `${o.path} is back to slipway's version, so the entry keeping your edit at ${OVERRIDES}:${o.line} is no longer needed — remove it` });
  } else {
    excused.add(o.path);
  }
}

// An edited ci.yml is usually a project adding what its tests need; that has a place that is not an override.
const CI_YML = '.github/workflows/ci.yml';
const CI_HINT = `If the edit adds what your tests need before pnpm verify (a database service, an env var), revert it and put that in ci/before-verify.sh, which the verify job runs when the file exists. Otherwise revert it`;

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
    detail: `${p} is a file slipway maintains, and it was ${got === null ? 'deleted' : got === NOT_A_FILE ? 'replaced by a non-file' : 'edited'} here; the next /sync-slipway would undo that. ${p === CI_YML ? CI_HINT : 'Revert it'}, or keep it by adding it to ${OVERRIDES} (path: and reason:)`,
  });
}

process.exit(
  report({
    id: 'D1',
    claim: `every file slipway maintains is as slipway ${manifest.slipway?.slice(0, 12) ?? `${manifest.version ?? 'unknown'} (sha unresolved)`} installed it, or is kept with a reason in ${OVERRIDES}`,
    scanned: managed.length,
    unit: 'files slipway maintains',
    findings,
    exempted,
    exemptedBy: OVERRIDES,
  })
);
