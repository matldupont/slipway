#!/usr/bin/env node
// SK1 — skipped tests are visible (L-56).
//
// A skipped test passes CI while proving nothing. SK1 reads the test files of every workspace package as text
// (lib/skips.mjs) and fails on:
//
//   <file>:<line>#skip/no-issue   a skipped test (`.skip`, `.skipIf`, `.runIf`, `.todo`, `xit` and the other
//                                 x-prefixed forms) with no issue reference (`#14`) on the same line
//   <file>:<line>#only            a focused test (`.only`, `fit`, `fdescribe`): it silently drops every other
//                                 test in the file, so an issue reference does not excuse it
//   <file>#unread                 a test file or folder SK1 could not read, so it could not be counted
//
// Every line is read as text and nothing is stripped, so a marker in a comment is a finding too. It counts markers,
// not tests that did not run. It cannot see an aliased `it.skip`, a computed member, a skip a runner's config
// applies, or a marker split over two lines. `pnpm verify` prints the same count per package (ci/verify.mjs).
//
// A workspace with no packages, or packages with no test files, is green and says so: the claim names the
// denominator. The workspace is counted as one unit, so a project before /bootstrap is not BROKEN.
//
// WHY: a skip with no issue behind it is work deferred with nothing that brings it back.

import { report } from '../lib/report.mjs';
import { scanPackage } from '../lib/skips.mjs';
import { discoverWorkspace } from '../lib/workspace.mjs';

const root = process.argv[2] ?? '.';
const UNIT = 'items (the workspace, and each test file)';
let ws;
try {
  ws = discoverWorkspace(root);
} catch (e) {
  process.exit(report({ id: 'SK1', claim: '', scanned: 0, unit: UNIT, broken: e.message }));
}

const { packages } = ws;
const findings = [];
let files = 0;
let markers = 0;
for (const pkg of packages) {
  const scan = scanPackage(root, pkg, packages);
  files += scan.files;
  markers += scan.markers.length;
  for (const u of scan.unread) findings.push({ where: `${u.path}#unread`, detail: `${u.path} ${u.why}, so its skipped tests were not counted. Make it readable or move it out of the package` });
  for (const m of scan.markers) {
    if (m.kind === 'only') {
      findings.push({ where: `${m.file}:${m.line}#only`, detail: `${m.file} line ${m.line} runs only this test, so every other test in the file is silently left out. Remove the focus; an issue number on the line does not excuse it` });
    } else if (!m.linked) {
      findings.push({ where: `${m.file}:${m.line}#skip/no-issue`, detail: `${m.file} line ${m.line} skips a test and names no issue. Put the issue that brings it back on that line (#14), or delete the test` });
    }
  }
}

process.exit(
  report({
    id: 'SK1',
    claim: `${files} test files in ${packages.length} packages read; ${markers} skipped-test markers, each with an issue on its line, and none focusing a test`,
    scanned: 1 + files,
    unit: UNIT,
    findings,
  })
);
