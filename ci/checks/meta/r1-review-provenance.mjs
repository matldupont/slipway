#!/usr/bin/env node
// R1 — review provenance.
//
// Every review in docs/reviews/ records the document it read and that document's version
// line, copied verbatim. R1 checks both against the tree.
//
//   provenance/missing          no `Reviewed: <path> @ <ref>` line
//   provenance/no-version-line  no `Version line: <verbatim text>` line
//   provenance/target-missing   the reviewed path does not exist, leaves the repository, or is not a
//                               regular file of it: a folder, a link or a path through one, .git/
//   provenance/stale            the version line is not in the current file — the document
//                               moved on, or the line was written from memory
//   provenance/supersedes-invalid  a `Supersedes:` line names something other than a review of the
//                               same document, or sits in a review that quotes no whole line of it
//   provenance/review-unreadable  a file in docs/reviews/ that is a link, a folder or reached through a link: not read
//   prd/not-a-file              docs/PRD.md is a link, a folder or reached through a link: not read
//   template/provenance-lines   TEMPLATE.md lost either line (so the template cannot drift)
//   review/missing              the PRD has left draft with no review of its current version — the
//                               review was skipped, or written somewhere other than docs/reviews/
//
// WHY: a review written from conversation memory rather than the file cites values the
// document no longer holds, and re-raises findings that were already applied. A
// reviewer who must transcribe the version line has to open the file to do it.
//
// The missing-review rule fires at the same moment F1's does: while the PRD is a draft it is still
// being written, and once it is not, the shape of the plan has been argued with — or it has not, and
// nothing else would say so. A review of an older version does not count: bump the PRD, review again.
//
// A stale review retires when the review that replaces it says so (D-029): a review whose own version
// line is still in the document names it, `Supersedes: docs/reviews/<file>`, one line per file. Nothing
// is inferred from a second review being there, so a line written from memory is still reported beside
// an honest review. A stale review's own Supersedes: lines retire nothing, and there is no chain. The
// review that retires another quotes a whole line of the document, not a word found somewhere in it.
//
// The three lines count only in the review's header: the first run of non-blank lines under its title, the
// file's first non-blank line, a `# ` heading. A line lower down, or one in the header that starts with a quote
// mark (`>`), is text the review carries, not what the review says of itself: a block quoted lower in a review
// retires nothing, and a quoted `Reviewed:` is no provenance. A review with no title has no header. A line of
// characters nobody sees is blank, and a byte-order mark before the title is not part of it. What a finding
// prints of a review's own text (the path, the version line, a Supersedes: value) is cut to BOUND characters,
// and says so when it left hidden characters out; matching always uses the whole value.
//
// A review in docs/reviews/ and docs/PRD.md are opened only when they are regular files reached through no link
// (lib/review-header.mjs), by R1 and by `pnpm status` alike. A review file gets at most MAX_SUPERSEDES findings for
// its Supersedes: lines, then one that counts the rest. A reviewed path is the PRD only when it normalises to
// docs/PRD.md.
//
// A header line over MAX_LINE characters is not read, and each pattern applied to a line of a review or of the
// reviewed document takes time linear in its length (lib/review-header.mjs), so one long line costs one pass. The
// reviewed path is opened only when it is a regular file inside the repository, reached through no link, and no
// part of it is git's own folder: a review cannot point R1 at a folder, a device or a file outside the tree.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { excerpt, report, UNSAFE } from '../lib/report.mjs';
import { isPrdPath, MAX_LINE, MISSING, notPlainFile, reviewProvenance, unquote } from '../lib/review-header.mjs';

const root = process.argv[2] ?? '.';
const prdPath = join(root, 'docs', 'PRD.md');
const prdWhy = notPlainFile(root, 'docs/PRD.md');
const prd = prdWhy === null ? readFileSync(prdPath, 'utf8') : null;
const prdStatus = prd ? ((prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim().toLowerCase() ?? 'draft') : 'draft';
const prdVersion = prd ? (prd.match(/^Version:\s*(.+)$/m) ?? [])[1]?.trim() : null;
const reviewedPrd = [];
const dir = join(root, 'docs', 'reviews');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
const findings = [];
const reviews = [];

const BOUND = 120;
// One review file gets at most this many Supersedes: findings; the rest are counted in one more.
const MAX_SUPERSEDES = 10;
const shown = (s) => `${excerpt(s, BOUND)}${UNSAFE.test(s) ? ' [hidden characters left out]' : ''}`;
const clean = (l) => l.replace(/\*\*/g, '').replace(/^[>\s*_-]+/, '').trim();
// Said beside a missing line: the line may be there, and too long to be read.
const unreadNote = (unread) => (unread.length
  ? ` (line ${unread.slice(0, 3).join(', ')}${unread.length > 3 ? ` and ${unread.length - 3} more` : ''} of this file is in the header and over ${MAX_LINE} characters: a header line that long is not read, so shorten it)`
  : '');

// git's own folder under the spellings a filesystem is known to take for it: letter case, characters nobody sees
// (the three UNSAFE leaves for emoji too), trailing dots and spaces, the short name. Not every spelling there is.
const hiddenAll = new RegExp(`${UNSAFE.source}|[\u200d\ufe0e\ufe0f]`, 'gv');
const gitFolder = (seg) => {
  const s = seg.replace(hiddenAll, '');
  let end = s.length;
  while (end > 0 && (s[end - 1] === '.' || s[end - 1] === ' ')) end--;
  return ['.git', 'git~1'].includes(s.slice(0, end).toLowerCase());
};
// Why R1 will not open the reviewed path, or null when it is a regular file of the repository reached through no link.
const unreadable = (rel) => {
  const norm = posix.normalize(rel);
  if (norm.startsWith('..')) return 'leaves the repository';
  if (norm.split('/').some(gitFolder)) return 'is inside .git/, which holds no document';
  return notPlainFile(root, norm);
};

for (const f of files) {
  const rel = `docs/reviews/${f}`;
  const unplain = notPlainFile(root, rel);
  if (unplain !== null) {
    findings.push({ where: `${rel}#provenance/review-unreadable`, detail: `this review ${unplain}: R1 and \`pnpm status\` read only a regular file reached through no link, so it is not read; replace it with the review's text, or delete it` });
    continue;
  }
  const { reviewed, version, supersedes, unread, unreadSupersedes } = reviewProvenance(readFileSync(join(dir, f), 'utf8'));

  if (f === 'TEMPLATE.md') {
    if (!reviewed || !version) {
      findings.push({ where: `${rel}#template/provenance-lines`, detail: `the review template must carry \`Reviewed:\` and \`Version line:\` in its header, the lines under its title${unreadNote(unread)}` });
    }
    continue;
  }
  if (!reviewed) findings.push({ where: `${rel}#provenance/missing`, detail: `no \`Reviewed: <path> @ <ref>\` line: add one in the header (the lines under the title, before the first blank line, not quoted), naming the file read and the commit it was read at${unreadNote(unread)}` });
  if (!version) findings.push({ where: `${rel}#provenance/no-version-line`, detail: `no \`Version line: <verbatim text>\` line: add one in the header, copying the reviewed document's Version line as it is${unreadNote(unread)}` });
  // A Supersedes: line too long to be read retires nothing, and says so as an unreadable name always has.
  for (const n of unreadSupersedes.slice(0, 3)) findings.push({ where: `${rel}#provenance/supersedes-invalid`, detail: `the Supersedes: line at line ${n} of this file is over ${MAX_LINE} characters and is not read, so it retires nothing: name an earlier review of the same document by its path, or remove the line` });
  if (!reviewed || !version) continue;

  const targetRel = reviewed.path;
  const why = unreadable(targetRel);
  if (why) {
    findings.push({ where: `${rel}#provenance/target-missing`, detail: `reviewed path ${shown(targetRel) || '(empty)'} ${why}: fix the Reviewed: line, or delete the review` });
    continue;
  }
  const want = version;
  if (isPrdPath(targetRel) && prdVersion && want.includes(prdVersion)) reviewedPrd.push(rel);
  const doc = readFileSync(join(root, targetRel), 'utf8');
  // To retire another review, the version line has to be a whole line of the document: a word that is
  // merely somewhere in it ("#", "Spec") keeps this review from being stale, as it always has, and no more.
  const wholeLine = doc.split(/\r?\n/).some((l) => [l.trim(), clean(l), unquote(l)].includes(want));
  reviews.push({ rel, want, targetRel, doc: posix.normalize(targetRel), stale: !doc.includes(want), wholeLine, supersedes });
}

// Two spellings of one path that do not normalise alike read as two documents: nothing retires.
const byRel = new Map(reviews.map((r) => [r.rel, r]));
const retired = new Set();
for (const r of reviews) {
  let reported = 0;
  for (const name of r.supersedes) {
    const named = byRel.get(name);
    const why = !named || named === r
      ? 'is not another review in docs/reviews/ with both provenance lines and a reviewed path that exists'
      : named.doc !== r.doc ? `is a review of ${shown(named.targetRel)}, not of ${shown(r.targetRel)}`
        : !r.stale && !r.wholeLine ? `is named by a review whose own version line is not a whole line of ${shown(r.targetRel)}` : null;
    if (why && ++reported > MAX_SUPERSEDES) continue;
    if (why) findings.push({ where: `${r.rel}#provenance/supersedes-invalid`, detail: `Supersedes: ${shown(name)} ${why}, so it retires nothing: name an earlier review of the same document by its path, or remove the line` });
    else if (!r.stale) retired.add(named.rel);
  }
  if (reported > MAX_SUPERSEDES) findings.push({ where: `${r.rel}#provenance/supersedes-invalid`, detail: `${reported - MAX_SUPERSEDES} more Supersedes: lines are not listed (at most ${MAX_SUPERSEDES} are): each retires nothing, so remove the ones that are not valid` });
}
for (const r of reviews) {
  if (!r.stale || retired.has(r.rel)) continue;
  findings.push({
    where: `${r.rel}#provenance/stale`,
    detail: `"${shown(r.want)}" is not in ${shown(r.targetRel)} — the document moved on, or the line was written from memory: review the current version (/review-doc) and name this file in that review's Supersedes: line, or copy the line from the file`,
  });
}

if (prdWhy !== null && prdWhy !== MISSING) {
  findings.push({ where: 'docs/PRD.md#prd/not-a-file', detail: `docs/PRD.md ${prdWhy}: R1 and \`pnpm status\` read only a regular file reached through no link, so the PRD is not read; replace it with the PRD's text` });
}
if (prd && prdStatus !== 'draft' && reviewedPrd.length === 0) {
  findings.push({
    where: 'docs/PRD.md#review/missing',
    detail: `the PRD is "${prdStatus}" (Version: ${prdVersion ?? '?'}) and no review in docs/reviews/ names that version — run /review-doc docs/PRD.md from a fresh session`,
  });
}

process.exit(
  report({
    id: 'R1',
    claim: `every review names the file it read and a version line that is still verbatim in that file, or is named by the review that replaced it${prd && prdStatus !== 'draft' ? `, and the PRD at ${prdVersion} has one` : ''}`,
    scanned: files.length + (prd || prdWhy !== MISSING ? 1 : 0),
    unit: `review files${prd ? ` and the PRD (${prdStatus})` : ''}`,
    findings,
  })
);
