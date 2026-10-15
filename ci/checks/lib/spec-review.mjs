// A feature doc's version needs a review before its pull request is ready (#464): the reader P1 uses.
//
// `gate-files.mjs` lists, as `specs`, each feature doc (`features/<name>.md`, at any depth: `dev/features/` in
// slipway, `docs/features/` in a project) whose `Version:` lines differ from the merge base's. For a pull request
// that is not a draft, each such doc needs a review in `docs/reviews/` of this tree whose `Reviewed:` line names
// the doc and whose `Version line:` is the doc's current one. "Current" is R1's own reading (review-header.mjs),
// so R1 and P1 cannot disagree. A pull request that only adds a review of a doc already on the base moves no
// version, so it lists no spec and is not held.

import { existsSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { notPlainFile, quotedVersion, readPlain, reviewProvenance, versionLines } from './review-header.mjs';

// What marks a path as a feature doc: the folder name, not a setting, so the sidecar writer needs no config.
export const SPEC_PATH = /(^|\/)features\/[^/]+\.md$/;

// The findings for one sidecar `c` read against the tree at `root`: [{ id, detail }], ids as P1 prints them after
// `#`. A draft is not held. A `draft` that is absent or not `true` is a ready pull request (the strict side).
export function unreviewedSpecs(c, root) {
  if (c.draft === true) return [];
  const findings = [];
  if (!Array.isArray(c.specs)) {
    // A sidecar from a script that predates the list cannot say which versions moved: it is read as unreadable
    // when it changes anything that looks like a feature doc, and says nothing otherwise.
    const looks = c.files.filter((f) => SPEC_PATH.test(f));
    if (looks.length) findings.push({ id: 'specs/unreadable', detail: `the changed-files list beside the body has no \`specs\` list, and this pull request changes ${looks.length} feature doc(s) (${looks.slice(0, 3).join(', ')}): the workflow must write it with ci/checks/lib/gate-files.mjs` });
    return findings;
  }
  const dir = 'docs/reviews';
  const reviews = [];
  if (existsSync(`${root}/${dir}`)) {
    for (const f of readdirSync(`${root}/${dir}`).filter((n) => n.endsWith('.md')).sort()) {
      const text = readPlain(root, `${dir}/${f}`);
      if (text === null) continue; // R1 reports a review it cannot read
      const { reviewed, version } = reviewProvenance(text);
      if (reviewed && version) reviews.push({ path: posix.normalize(reviewed.path), version });
    }
  }
  for (const s of c.specs) {
    const path = typeof s?.path === 'string' ? posix.normalize(s.path) : '';
    if (!path || path.startsWith('..') || !SPEC_PATH.test(path)) {
      findings.push({ id: 'specs/unreadable', detail: `an entry of \`specs\` beside the body is not a feature doc path (${JSON.stringify(s?.path ?? null).slice(0, 80)}); the workflow must write it with ci/checks/lib/gate-files.mjs` });
      continue;
    }
    const why = notPlainFile(root, path);
    if (why !== null) {
      findings.push({ id: `spec/unreadable:${path}`, detail: `${path} ${why}, so its version cannot be read; a feature doc is a regular file reached through no link` });
      continue;
    }
    const doc = readPlain(root, path);
    const lines = versionLines(doc);
    const shown = lines.length === 1 ? lines[0] : lines.length ? `${lines.length} \`Version:\` lines` : 'no `Version:` line';
    const reviewed = lines.length === 1 && reviews.some((r) => r.path === path && quotedVersion(doc, r.version, lines) === 'current');
    if (!reviewed) {
      findings.push({ id: `spec/unreviewed:${path}`, detail: `${path} moves to ${shown}, and this pull request is not a draft, with no review in docs/reviews/ of that version in its tree. Keep it a draft until \`/review-doc\` has written the review and it is merged into this branch, then mark it ready` });
    }
  }
  return findings;
}
