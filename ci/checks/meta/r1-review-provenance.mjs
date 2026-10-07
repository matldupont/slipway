#!/usr/bin/env node
// R1 — review provenance.
//
// Every review in docs/reviews/ records the document it read and that document's version
// line, copied verbatim. R1 checks both against the tree.
//
//   provenance/missing          no `Reviewed: <path> @ <ref>` line
//   provenance/no-version-line  no `Version line: <verbatim text>` line
//   provenance/target-missing   the reviewed path does not exist, or leaves the repository
//   provenance/stale            the version line is not in the current file — the document
//                               moved on, or the line was written from memory
//   provenance/supersedes-invalid  a `Supersedes:` line names something other than a review of the
//                               same document, or sits in a review that quotes no whole line of it
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
// file's first non-blank line, a `# ` heading. A line lower down, or a quoted one (`>`) in the header, is text
// the review carries, not what the review says of itself: a passage quoted from another review must not retire
// one, and a quoted `Reviewed:` is no provenance. A review with no title has no header. What a finding prints
// of a review's own text (the path, the version line, a Supersedes: value) is cut to BOUND characters;
// matching always uses the whole value.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { excerpt, report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const prdPath = join(root, 'docs', 'PRD.md');
const prd = existsSync(prdPath) ? readFileSync(prdPath, 'utf8') : null;
const prdStatus = prd ? ((prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim().toLowerCase() ?? 'draft') : 'draft';
const prdVersion = prd ? (prd.match(/^Version:\s*(.+)$/m) ?? [])[1]?.trim() : null;
const reviewedPrd = [];
const dir = join(root, 'docs', 'reviews');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
const findings = [];
const reviews = [];

const BOUND = 120;
const shown = (s) => excerpt(s, BOUND);
const clean = (l) => l.replace(/\*\*/g, '').replace(/^[>\s*_-]+/, '').trim();
// A header line keeps its emphasis and list marks out of the way, as `clean` does, but never a quote mark.
const mark = (l) => l.replace(/\*\*/g, '').replace(/^[\s*_-]+/, '').trim();
const header = (text) => {
  const all = text.split(/\r?\n/);
  const title = all.findIndex((l) => l.trim());
  if (title < 0 || !/^# /.test(all[title])) return [];
  const start = all.findIndex((l, i) => i > title && l.trim());
  if (start < 0) return [];
  const end = all.findIndex((l, i) => i > start && !l.trim());
  return all.slice(start, end < 0 ? all.length : end).filter((l) => !l.trimStart().startsWith('>')).map(mark);
};
const unquote = (s) => s.trim().replace(/^[`'"]+|[`'"]+$/g, '');

for (const f of files) {
  const rel = `docs/reviews/${f}`;
  const lines = header(readFileSync(join(dir, f), 'utf8'));
  const reviewed = lines.map((l) => l.match(/^Reviewed:\s*(.+?)\s+@\s+(\S+)/)).find(Boolean);
  let version = lines.map((l) => l.match(/^Version line:\s*(.+)$/)).find(Boolean);

  if (f === 'TEMPLATE.md') {
    if (!reviewed || !version) {
      findings.push({ where: `${rel}#template/provenance-lines`, detail: 'the review template must carry `Reviewed:` and `Version line:` in its header, the lines under its title' });
    }
    continue;
  }
  if (!reviewed) findings.push({ where: `${rel}#provenance/missing`, detail: 'no `Reviewed: <path> @ <ref>` line: add one in the header (the lines under the title, before the first blank line, not quoted), naming the file read and the commit it was read at' });
  if (version && !unquote(version[1])) version = null;
  if (!version) findings.push({ where: `${rel}#provenance/no-version-line`, detail: 'no `Version line: <verbatim text>` line: add one in the header, copying the reviewed document\'s Version line as it is' });
  if (!reviewed || !version) continue;

  const targetRel = unquote(reviewed[1]);
  const target = join(root, targetRel);
  const outside = posix.normalize(targetRel).startsWith('..');
  if (outside || !existsSync(target)) {
    findings.push({ where: `${rel}#provenance/target-missing`, detail: `reviewed path ${shown(targetRel)} ${outside ? 'leaves the repository' : 'does not exist'}: fix the Reviewed: line, or delete the review` });
    continue;
  }
  const want = unquote(version[1]);
  if (targetRel.endsWith('docs/PRD.md') && prdVersion && want.includes(prdVersion)) reviewedPrd.push(rel);
  const text = readFileSync(target, 'utf8');
  // To retire another review, the version line has to be a whole line of the document: a word that is
  // merely somewhere in it ("#", "Spec") keeps this review from being stale, as it always has, and no more.
  const wholeLine = text.split(/\r?\n/).some((l) => [l.trim(), clean(l), unquote(l)].includes(want));
  const supersedes = lines.filter((l) => l.startsWith('Supersedes:')).map((l) => unquote(l.slice('Supersedes:'.length)).replace(/^\.\//, ''));
  reviews.push({ rel, want, targetRel, doc: posix.normalize(targetRel), stale: !text.includes(want), wholeLine, supersedes });
}

// Two spellings of one path that do not normalise alike read as two documents: nothing retires.
const byRel = new Map(reviews.map((r) => [r.rel, r]));
const retired = new Set();
for (const r of reviews) {
  for (const name of r.supersedes) {
    const named = byRel.get(name);
    const why = !named || named === r
      ? 'is not another review in docs/reviews/ with both provenance lines and a reviewed path that exists'
      : named.doc !== r.doc ? `is a review of ${shown(named.targetRel)}, not of ${shown(r.targetRel)}`
        : !r.stale && !r.wholeLine ? `is named by a review whose own version line is not a whole line of ${shown(r.targetRel)}` : null;
    if (why) findings.push({ where: `${r.rel}#provenance/supersedes-invalid`, detail: `Supersedes: ${shown(name)} ${why}, so it retires nothing: name an earlier review of the same document by its path, or remove the line` });
    else if (!r.stale) retired.add(named.rel);
  }
}
for (const r of reviews) {
  if (!r.stale || retired.has(r.rel)) continue;
  findings.push({
    where: `${r.rel}#provenance/stale`,
    detail: `"${shown(r.want)}" is not in ${shown(r.targetRel)} — the document moved on, or the line was written from memory: review the current version (/review-doc) and name this file in that review's Supersedes: line, or copy the line from the file`,
  });
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
    scanned: files.length + (prd ? 1 : 0),
    unit: `review files${prd ? ` and the PRD (${prdStatus})` : ''}`,
    findings,
  })
);
