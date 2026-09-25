#!/usr/bin/env node
// P1 — PR body.
//
// Reads every *.md in the given directory as a pull-request body. In CI the directory
// holds one file, written from the pull_request event.
//
//   verification/missing     no `## Verification` section
//   verification/empty       empty, or only the template's comments
//   verification/prose-only  names no command, code block, check id or CI run —
//                            "tested locally" is a claim, not evidence
//   links/missing            `## Links` has no issue reference (#123) and no `none: <reason>`
//
// WHY: when nothing at the merge boundary asks what was actually run, defects surface as
// same-day follow-up PRs repairing the one just merged. Template comments are stripped before reading, so an
// untouched template fails — its example `#123` is not a link.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { section } from '../lib/markdown.mjs';
import { report } from '../lib/report.mjs';

const EVIDENCE = /`[^`]+`|```|\b[MPIR]\d+\b|https:\/\/github\.com\/\S+\/actions\/runs\/\d+/;

const dir = process.argv[2] ?? '.';
const bodies = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
const findings = [];

for (const f of bodies) {
  const md = readFileSync(join(dir, f), 'utf8');
  const v = section(md, 'Verification', 2);
  if (v === null) findings.push({ where: `${f}#verification/missing`, detail: 'no `## Verification` section' });
  else if (v === '') findings.push({ where: `${f}#verification/empty`, detail: 'Verification is empty or only template comments' });
  else if (!EVIDENCE.test(v)) {
    findings.push({ where: `${f}#verification/prose-only`, detail: 'Verification names no command, code block or CI run' });
  }
  const links = section(md, 'Links', 2);
  if (links === null || !(/#\d+/.test(links) || /^\s*none:\s*\S/im.test(links))) {
    findings.push({ where: `${f}#links/missing`, detail: '`## Links` needs an issue reference (#123) or `none: <reason>`' });
  }
}

process.exit(
  report({
    id: 'P1',
    claim: 'every PR body names the evidence it was verified with and links its issue',
    scanned: bodies.length,
    unit: 'PR bodies',
    findings,
  })
);
