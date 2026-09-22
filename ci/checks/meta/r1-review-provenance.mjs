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
//
// WHY: a review written from conversation memory rather than the file cites values the
// document no longer holds, and re-raises findings that were already applied. A
// reviewer who must transcribe the version line has to open the file to do it.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
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
  if (!readFileSync(target, 'utf8').includes(want)) {
    findings.push({
      where: `${rel}#provenance/stale`,
      detail: `"${want}" is not in ${targetRel} — the document moved on, or the line was written from memory`,
    });
  }
}

process.exit(
  report({
    id: 'R1',
    claim: 'every review names the file it read and a version line that is still verbatim in that file',
    scanned: files.length,
    unit: 'review files',
    findings,
  })
);
