#!/usr/bin/env node
// V1 — a feature doc not yet shipped carries a `Version:` line (D-049, #493).
//
//   <doc>#version/missing   a feature doc whose status is not `shipped` has no line starting `Version:` — a finding
//   <doc>#version/missing   the same for a shipped doc — a warning, never a fail
//
// A feature doc is what feature-docs.mjs says one is (ID1 and F2 read the same): a companion is left out, since its
// primary answers for both. A doc whose header cannot be read, or has no status, is not shipped. A version line is a
// line starting `Version:` (review-header.mjs → versionLines, the one R1 and P1 read).
//
// A feature folder that is a link, sits under one or is not a folder, and a doc in one that is a link or not a file, is
// BROKEN: it is never read, so a doc with no line could hide there (F2 and ID1 name these too).
//
// WHY: P1 holds a pull request that moves a feature doc's version with no review of the new one (#464). A doc with no
// `Version:` line moves nothing, so its revisions were never held, and status could not say which version a review is
// owed for. Gaining the first line is not itself a move (gate-files.mjs), so adding it costs no review.
//
//   node ci/checks/meta/v1-version-line.mjs <root>

import { FEATURE_DIRS, isFeatureDoc, readFeatureFiles } from '../lib/feature-docs.mjs';
import { report } from '../lib/report.mjs';
import { isShipped as shipped, unversioned } from '../lib/spec-review.mjs';

const root = process.argv[2] ?? '.';
const files = readFeatureFiles(root);
const unread = files.filter((f) => !f.regular);
const docs = files.filter(isFeatureDoc);
const missing = unversioned(root);
const DETAIL = 'has no line starting `Version:`, so no review can name the version it read and no change to it is held for one: add `Version: 0.1` below its title';

process.exit(
  report({
    id: 'V1',
    claim: 'every feature doc that is not shipped has a line starting `Version:`',
    scanned: docs.length,
    unit: `feature docs (${FEATURE_DIRS.map((d) => `${d}/`).join(' and ')})`,
    findings: missing.filter((f) => !shipped(f)).map((f) => ({ where: `${f.path}#version/missing`, detail: DETAIL })),
    warnings: missing.filter(shipped).map((f) => ({ where: `${f.path}#version/missing`, detail: `${DETAIL}; it is shipped, so this is a warning` })),
    broken: unread.length ? `${unread.map((f) => f.path).join(', ')} ${unread.length === 1 ? 'is' : 'are'} a link or not a plain file or folder, so ${unread.length === 1 ? 'it is' : 'they are'} never read and a feature doc with no Version: line could sit there` : null,
  })
);
