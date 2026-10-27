// A feature doc's version needs a review before its pull request is ready (#464): the reader P1 uses.
//
// `gate-files.mjs` lists, as `specs`, each feature doc (`features/<name>.md`, at any depth: `dev/features/` in
// slipway, `docs/features/` in a project) whose `Version:` lines differ from the merge base's. For a pull request
// that is not a draft, each such doc needs a review in `docs/reviews/` of this tree whose `Reviewed:` line names
// the doc and whose `Version line:` is the doc's current one. "Current" is R1's own reading (review-header.mjs),
// so R1 and P1 cannot disagree. A pull request that only adds a review of a doc already on the base moves no
// version, so it lists no spec and is not held.

import { readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { isFeatureDoc, readFeatureFiles } from './feature-docs.mjs';
import { frontmatter } from './frontmatter.mjs';
import { notPlainFile, notPlainFolder, quotedVersion, readPlain, reviewProvenance, versionLines } from './review-header.mjs';

// What marks a path as a feature doc: the folder name, not a setting, so the sidecar writer needs no config.
// TEMPLATE.md and README.md, named in exactly that case, are not feature docs (feature-docs.mjs skips only those two names; a
// `readme.md` is a feature doc and is held); the folder name is read in any letter case, since a case-insensitive disk writes `Features/x.md` into `features/`.
export const SPEC_PATH = /(^|\/)features\/(?!(?-i:TEMPLATE|README)\.md$)[^/]*\.md$/i;

// Each review in `docs/reviews/` of the tree at `root` that names a document and quotes a version line:
// [{ path, version }], the path normalised. A review that cannot be read is left out: R1 reports it. A folder that is a
// link, sits under one or is not a folder holds no review.
export function readReviews(root) {
  const dir = 'docs/reviews';
  const reviews = [];
  if (notPlainFolder(root, dir) !== null) return reviews;
  for (const f of readdirSync(`${root}/${dir}`).filter((n) => n.endsWith('.md')).sort()) {
    const text = readPlain(root, `${dir}/${f}`);
    if (text === null) continue;
    const { reviewed, version } = reviewProvenance(text);
    if (reviewed && version) reviews.push({ path: posix.normalize(reviewed.path), version });
  }
  return reviews;
}

// Whether the feature doc at `path`, whose text is `doc`, has a review of its current version among `reviews`: it has
// exactly one `Version:` line, and a review that names the doc quotes that line as R1 reads it. P1 holds a pull request
// to this, and status names each doc for which it is false (#493).
export const reviewedNow = (doc, path, reviews, lines = versionLines(doc)) =>
  lines.length === 1 && reviews.some((r) => r.path === path && quotedVersion(doc, r.version, lines) === 'current');

// The feature docs of the tree at `root` (feature-docs.mjs) that are not shipped and have no review of their current
// version: readFeatureFiles' entries, in its order. Status names each and sync counts them (#493).
export function owedReviews(root) {
  const reviews = readReviews(root);
  return readFeatureFiles(root).filter(isFeatureDoc).filter((f) => !isShipped(f) && !reviewedNow(f.md, f.path, reviews));
}

// Whether a feature doc readFeatureFiles() lists is shipped: its header's `status:` reads `shipped`, in any case. A header
// that cannot be read, has no status, or holds keys under `status:` instead of text, is not shipped.
export const isShipped = (f) => {
  const status = frontmatter(f.md)?.status;
  return typeof status === 'string' && status.trim().toLowerCase() === 'shipped';
};

// The feature docs of the tree at `root` that have no line starting `Version:` (D-049): V1 fails on each one not shipped,
// and sync counts those.
export const unversioned = (root) => readFeatureFiles(root).filter(isFeatureDoc).filter((f) => versionLines(f.md).length === 0);

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
  const reviews = readReviews(root);
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
    if (!reviewedNow(doc, path, reviews, lines)) {
      findings.push({ id: `spec/unreviewed:${path}`, detail: `${path} moves to ${shown}, and this pull request is not a draft, with no review in docs/reviews/ of that version in its tree. Keep it a draft until \`/review-doc\` has written the review and it is merged into this branch, then mark it ready` });
    }
  }
  return findings;
}
