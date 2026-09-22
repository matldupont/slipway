#!/usr/bin/env node
// R1 — review provenance.
//
// Every review in docs/reviews/ records the document it read and that document's version
// line, copied verbatim. R1 checks both against the tree.
//
//   provenance/missing          no `Reviewed: <path> @ <ref>` line
//   provenance/no-version-line  no `Version line: <verbatim text>` line
//   provenance/target-missing   the reviewed path does not exist
//   provenance/stale            the version line is not in the current file — the document
//                               moved on, or the line was written from memory
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

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const prdPath = join(root, 'docs', 'PRD.md');
const prd = existsSync(prdPath) ? readFileSync(prdPath, 'utf8') : null;
const prdStatus = prd ? ((prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim().toLowerCase() ?? 'draft') : 'draft';
const prdVersion = prd ? (prd.match(/^Version:\s*(.+)$/m) ?? [])[1]?.trim() : null;
const reviewedPrd = [];
const dir = join(root, 'docs', 'reviews');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
const findings = [];

const clean = (l) => l.replace(/\*\*/g, '').replace(/^[>\s*_-]+/, '').trim();
const unquote = (s) => s.trim().replace(/^[`'"]+|[`'"]+$/g, '');

for (const f of files) {
  const rel = `docs/reviews/${f}`;
  const lines = readFileSync(join(dir, f), 'utf8').split(/\r?\n/).map(clean);
  const reviewed = lines.map((l) => l.match(/^Reviewed:\s*(.+?)\s+@\s+(\S+)/)).find(Boolean);
  const version = lines.map((l) => l.match(/^Version line:\s*(.+)$/)).find(Boolean);

  if (f === 'TEMPLATE.md') {
    if (!reviewed || !version) {
      findings.push({ where: `${rel}#template/provenance-lines`, detail: 'the review template must carry `Reviewed:` and `Version line:`' });
    }
    continue;
  }
  if (!reviewed) findings.push({ where: `${rel}#provenance/missing`, detail: 'no `Reviewed: <path> @ <ref>` line' });
  if (!version) findings.push({ where: `${rel}#provenance/no-version-line`, detail: 'no `Version line: <verbatim text>` line' });
  if (!reviewed || !version) continue;

  const targetRel = unquote(reviewed[1]);
  const target = join(root, targetRel);
  if (!existsSync(target)) {
    findings.push({ where: `${rel}#provenance/target-missing`, detail: `reviewed path ${targetRel} does not exist` });
    continue;
  }
  const want = unquote(version[1]);
  if (targetRel.endsWith('docs/PRD.md') && prdVersion && want.includes(prdVersion)) reviewedPrd.push(rel);
  if (!readFileSync(target, 'utf8').includes(want)) {
    findings.push({
      where: `${rel}#provenance/stale`,
      detail: `"${want}" is not in ${targetRel} — the document moved on, or the line was written from memory`,
    });
  }
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
    claim: `every review names the file it read and a version line that is still verbatim in that file${prd && prdStatus !== 'draft' ? `, and the PRD at ${prdVersion} has one` : ''}`,
    scanned: files.length + (prd ? 1 : 0),
    unit: `review files${prd ? ` and the PRD (${prdStatus})` : ''}`,
    findings,
  })
);
