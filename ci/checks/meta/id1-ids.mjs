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
//   companion/id-differs        the doc `companion-of:` names carries another F-<n>, or none
//
// What counts as a declaration. In decisions.md, a line that starts (up to three spaces, then 1–6 `#`) with the id: `## D-014 — …`,
// `## D-014 — … *(open — week 1)*`, `### PD-3 — …`. An id quoted in a body paragraph, a list item, fenced code or an
// HTML comment is never a declaration. In a feature doc under docs/features/ or dev/features/, the first heading that starts
// with `F-<n>` (TEMPLATE.md is the template: skipped). Ids compare by number: D-9 and D-009, F-2 and F-02 are one id.
//
// Companions. A doc that carries the same F-<n> as another on purpose (one is the other's table, as slipway's
// landing-page-claims.md is landing-page.md's) says so in its own frontmatter, in one form, and the doc it names carries
// nothing:
//
//   companion-of: dev/features/landing-page.md
//
// One direction, no chains; several companions may name one primary. The pair passes only when the named doc's heading
// carries the same id.
//
// Out of scope, on purpose: a registry or a lock (a pushed branch is the claim), renumbering, the PRD's own feature
// list (F1 reads it), lessons and milestones (L1 and MS1).

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from '../lib/frontmatter.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const FEATURE_DIRS = ['docs/features', 'dev/features'];

// [{ line, text }] for each line a reader sees as text: not in a fenced block, not in an HTML comment.
function visible(md) {
  const out = [];
  let fence = null;
  let comment = false;
  md.split(/\r?\n/).forEach((raw, i) => {
    let text = raw;
    if (comment) {
      const end = text.indexOf('-->');
      if (end < 0) return;
      comment = false;
      text = text.slice(end + 3);
    }
    const mark = text.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      if (mark && mark[0] === fence[0] && mark.length >= fence.length && text.trim() === mark) fence = null;
      return;
    }
    if (mark) { fence = mark; return; }
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    const open = text.indexOf('<!--');
    if (open >= 0) { comment = true; text = text.slice(0, open); }
    out.push({ line: i + 1, text });
  });
  return out;
}

const findings = [];
let scanned = 0;

// decisions.md: the first line each decision id was declared at.
const decisionsPath = join(root, 'decisions.md');
if (existsSync(decisionsPath)) {
  const seen = new Map();
  for (const { line, text } of visible(readFileSync(decisionsPath, 'utf8'))) {
    const m = text.match(/^ {0,3}#{1,6}[ \t]+(P?D)-(\d+)\b/);
    if (!m) continue;
    scanned++;
    const key = `${m[1]}-${Number(m[2])}`;
    if (seen.has(key)) {
      findings.push({ where: `decisions.md#decision/duplicate/${key}`, detail: `${key} is declared on line ${seen.get(key)} and on line ${line}: give the later one the next free number, after reading main, the open pull requests and the remote's branches` });
    } else seen.set(key, line);
  }
}

const regular = (path) => {
  try {
    const st = lstatSync(join(root, path));
    return st.isFile() && !st.isSymbolicLink();
  } catch {
    return false;
  }
};

// feature docs: path → { n (null: no F-id heading), companionOf }
const docs = new Map();
for (const dir of FEATURE_DIRS) {
  const abs = join(root, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).filter((x) => x.endsWith('.md') && x !== 'TEMPLATE.md' && x !== 'README.md').sort()) {
    const path = `${dir}/${f}`;
    if (!regular(path)) continue;
    const md = readFileSync(join(abs, f), 'utf8');
    const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, (m) => m.replace(/[^\n]/g, ''));
    const heading = visible(body).map((l) => l.text.match(/^ {0,3}#{1,6}[ \t]+F-(\d+)\b/)).find(Boolean);
    if (heading) scanned++;
    docs.set(path, { n: heading ? Number(heading[1]) : null, companionOf: (frontmatter(md) ?? {})['companion-of'] ?? null });
  }
}

const fid = (n) => `F-${String(n).padStart(2, '0')}`;
const safe = (p) => typeof p === 'string' && !p.startsWith('/') && !/[\u0000-\u001f\u007f\\:]/.test(p) && p.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
const owners = new Map();
for (const [path, d] of docs) {
  if (d.n === null) continue;
  if (d.companionOf === null) {
    if (!owners.has(d.n)) owners.set(d.n, []);
    owners.get(d.n).push(path);
    continue;
  }
  const target = safe(d.companionOf) ? docs.get(d.companionOf) : undefined;
  if (!target) {
    findings.push({ where: `${path}#companion/missing`, detail: `companion-of names "${d.companionOf}", which is not a regular feature doc under ${FEATURE_DIRS.join(' or ')} (a repo-relative path, no link, no "..")` });
  } else if (d.companionOf === path || target.companionOf !== null) {
    findings.push({ where: `${path}#companion/chain`, detail: `${path} names ${d.companionOf} as its primary, and ${d.companionOf} is itself a companion (of ${target.companionOf}): name the doc that owns ${fid(d.n)}, which declares nothing` });
  } else if (target.n !== d.n) {
    findings.push({ where: `${path}#companion/id-differs`, detail: `${path} carries ${fid(d.n)} and names ${d.companionOf} as its primary, which ${target.n === null ? 'carries no F-id' : `carries ${fid(target.n)}`}` });
  }
}
for (const [n, paths] of owners) {
  if (paths.length > 1) findings.push({ where: `${paths[1]}#feature/duplicate/${fid(n)}`, detail: `${fid(n)} is the heading of ${paths.join(' and ')}: give the later one the next free number, or declare it the other's companion with "companion-of: <path>" in its frontmatter` });
}

process.exit(
  report({
    id: 'ID1',
    claim: 'no decision id and no feature id names two things (a declared companion doc excepted)',
    scanned,
    unit: 'decision and feature headings',
    findings,
  })
);
