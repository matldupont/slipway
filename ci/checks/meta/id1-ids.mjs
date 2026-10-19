#!/usr/bin/env node
// ID1 — ids that name one thing.
//
// A decision (`D-<n>`, a project's own `PD-<n>`) and a feature doc (`F-<n>`) are cited by id from issues, pull
// requests and other docs. Two sessions shaping at once each take "the next free number" from what they can see, and a
// branch that is not pushed is invisible to the other: the same id lands twice, in places git merges cleanly. L1 and
// MS1 hold this for lessons and milestones; ID1 holds it for the other two:
//
//   decision/duplicate/<id>     two headings of decisions.md carry one decision id; names both line numbers
//   feature/duplicate/<F-n>     two feature docs carry one F-<n> and the second is not a declared companion; names both files
//   companion/missing           `companion-of:` is not a repo-relative path to a regular file (no link, no directory, no
//                               `..`, not absolute) under docs/features/ or dev/features/
//   companion/chain             the doc `companion-of:` names itself has `companion-of:` (two docs naming each other too);
//                               names both files
//   companion/id-differs        the doc `companion-of:` names carries another F-<n>, or none; or the companion has no F-<n> heading
//   feature/unreadable          a feature doc is a link or not a regular file, so its F-<n> cannot be read
//   frontmatter/unreadable      a feature doc's header can be read two ways, so whether it is a companion cannot be (#495)
//
// What counts as a declaration. A line that starts (spaces, quote and list markers allowed, then 1–6 `#`) with the id:
// `## D-014 — …`, `## D-014 — … *(open — week 1)*`, `### PD-3 — …`, `# F-12 — …`. An id quoted in a body paragraph is not
// one; a heading-shaped line inside a fenced block, an HTML comment, front matter, a quote or a list item is, because
// nothing is skipped. A feature doc claims every F-<n> it has a heading for, not only the first. Ids compare by number:
// D-9 and D-009, F-2 and F-02 are one id. TEMPLATE.md is the template: skipped.
//
// Companions. A doc that carries the same F-<n> as another on purpose (one is the other's table, as slipway's
// landing-page-claims.md is landing-page.md's) says so in its own frontmatter, in one form, and the doc it names carries
// nothing:
//
//   companion-of: dev/features/landing-page.md
//
// One direction, no chains; several companions may name one primary. The pair passes only when the named doc carries every id
// the companion does.
//
// Docs in a subfolder of those folders are not read, and a doc that is a link or not a regular file is a finding
// (feature/unreadable), never skipped.
//
// Out of scope, on purpose: a registry or a lock (a pushed branch is the claim), renumbering, the PRD's own feature
// list (F1 reads it), lessons and milestones (L1 and MS1).

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FEATURE_DIRS, LEAD, readFeatureFiles, visible } from '../lib/feature-docs.mjs';
import { codeSpan, report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';

// What a feature doc is, how a line is read (nothing is skipped, look-alikes are normalised) and what may stand in
// front of a heading's `#`s live in lib/feature-docs.mjs, shared with the Fit count so the two class a file alike.
const DECISION = new RegExp(`${LEAD}(P?D)-(\\d+)\\b`);

const findings = [];
let scanned = 0;

// decisions.md: the first line each decision id was declared at.
const decisionsPath = join(root, 'decisions.md');
if (existsSync(decisionsPath)) {
  const seen = new Map();
  for (const { line, text } of visible(readFileSync(decisionsPath, 'utf8'))) {
    const m = text.match(DECISION);
    if (!m) continue;
    scanned++;
    const key = `${m[1]}-${Number(m[2])}`;
    if (seen.has(key)) {
      findings.push({ where: `decisions.md#decision/duplicate/${key}`, detail: `${key} is declared on line ${seen.get(key)} and on line ${line}: give the later one the next free number, after reading main, the open pull requests and the remote's branches` });
    } else seen.set(key, line);
  }
}

// feature docs: path → { ns (every F-<n> a heading of the doc carries; empty: none), companionOf }
const docs = new Map();
for (const { path, regular, folder, ns, companionOf, unreadable } of readFeatureFiles(root)) {
  if (folder) {
    findings.push({ where: `${path}#feature/unreadable`, detail: `${codeSpan(path)} is a link, sits under one or is not a folder, so ID1 reads none of the docs in it: make it a plain folder` });
    continue;
  }
  if (!regular) {
    findings.push({ where: `${path}#feature/unreadable`, detail: `${codeSpan(path)} is a link, is reached through one or is not a regular file, so ID1 cannot read its F-id: make it a regular file` });
    continue;
  }
  if (ns.length) scanned++;
  if (unreadable) {
    findings.push({ where: `${path}#frontmatter/unreadable`, detail: `a line in ${codeSpan(path)}'s frontmatter holds a carriage return with no line feed after it, so readers disagree on its keys: save the file with LF or CRLF line endings` });
    continue;
  }
  docs.set(path, { ns, companionOf });
}

const named = (v) => (typeof v === 'string' ? v : '(no path)');
const fid = (n) => `F-${String(n).padStart(2, '0')}`;
const safe = (p) => typeof p === 'string' && p !== '' && !p.startsWith('/') && !/[\u0000-\u001f\u007f\\:]/.test(p) && p.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
const owners = new Map();
const exempted = [];
const list = (ns) => ns.map(fid).join(', ');
for (const [path, d] of docs) {
  if (d.ns.length === 0) {
    if (d.companionOf !== null) findings.push({ where: `${path}#companion/id-differs`, detail: `${path} names ${named(d.companionOf)} as its primary but carries no F-id of its own` });
    continue;
  }
  if (d.companionOf === null) {
    for (const n of d.ns) {
      if (!owners.has(n)) owners.set(n, []);
      owners.get(n).push(path);
    }
    continue;
  }
  const target = safe(d.companionOf) ? docs.get(d.companionOf) : undefined;
  if (!target) {
    findings.push({ where: `${path}#companion/missing`, detail: `companion-of names "${named(d.companionOf)}", which is not a regular feature doc under ${FEATURE_DIRS.join(' or ')} (a repo-relative path, no link, no "..")` });
  } else if (d.companionOf === path || target.companionOf !== null) {
    findings.push({ where: `${path}#companion/chain`, detail: `${path} names ${d.companionOf} as its primary, and ${d.companionOf} is itself a companion (of ${named(target.companionOf)}): name the doc that owns ${list(d.ns)}, which declares nothing` });
  } else if (d.ns.some((n) => !target.ns.includes(n))) {
    findings.push({ where: `${path}#companion/id-differs`, detail: `${path} carries ${list(d.ns)} and names ${d.companionOf} as its primary, which carries ${target.ns.length ? list(target.ns) : 'no F-id'}: a companion's every F-id is its primary's` });
  } else exempted.push(`${path} (companion of ${d.companionOf})`);
}
for (const [n, paths] of owners) {
  for (const later of paths.slice(1)) {
    findings.push({ where: `${later}#feature/duplicate/${fid(n)}`, detail: `${fid(n)} is the heading of ${paths[0]} and ${later}: give the later one the next free number, or, only when it is the other doc's table or an extension of it, declare it the other's companion with "companion-of: <path>" in its frontmatter (the owner's yes; every accepted pair is printed)` });
  }
}

process.exit(
  report({
    id: 'ID1',
    claim: 'no decision id and no feature id names two things (a declared companion doc excepted)',
    scanned,
    unit: 'decision and feature headings',
    findings,
    exempted,
    exemptedBy: 'companion-of',
  })
);
