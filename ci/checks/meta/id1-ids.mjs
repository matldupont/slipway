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
// Docs in a subfolder of those folders are not read, and a doc that is a link or not a regular file is a finding
// (feature/unreadable), never skipped.
//
// Out of scope, on purpose: a registry or a lock (a pushed branch is the claim), renumbering, the PRD's own feature
// list (F1 reads it), lessons and milestones (L1 and MS1).

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from '../lib/frontmatter.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const FEATURE_DIRS = ['docs/features', 'dev/features'];

// [{ line, text }] for each line a reader sees as text: not in a fenced block, not in an HTML comment that closes. Fences
// are read first, so a `<!--` inside a fenced example opens nothing. A `<!--` with no `-->` after it anywhere hides
// nothing (it may be written as text, in inline code): a duplicate hidden behind one would pass, so the headings after
// it count (ci/checks/lib/markdown.mjs repeatedHeadings, same limit: a `<!--` in inline code followed by a real `-->`
// further down still hides what lies between). One pass, linear in the text.
function visible(md) {
  const out = [];
  const lastClose = md.lastIndexOf('-->');
  let fence = null;
  let inComment = false;
  let offset = 0;
  md.split(/\r?\n/).forEach((raw, i) => {
    const start = offset;
    offset += raw.length + 1;
    let text = raw;
    if (inComment) {
      const end = text.indexOf('-->');
      if (end < 0) return;
      inComment = false;
      text = ' '.repeat(end + 3) + text.slice(end + 3);
    }
    if (!inComment) {
      const mark = text.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
      if (fence) {
        if (mark && mark[0] === fence[0] && mark.length >= fence.length && text.trim() === mark) fence = null;
        return;
      }
      if (mark) { fence = mark; return; }
    }
    let at = 0;
    for (;;) {
      const open = text.indexOf('<!--', at);
      if (open < 0) break;
      const close = text.indexOf('-->', open + 4);
      if (close >= 0) {
        text = text.slice(0, open) + ' '.repeat(close + 3 - open) + text.slice(close + 3);
        at = close + 3;
      } else if (start + open < lastClose) {
        inComment = true;
        text = text.slice(0, open);
        break;
      } else break;
    }
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
    if (!regular(path)) {
      findings.push({ where: `${path}#feature/unreadable`, detail: `${path} is a link or not a regular file, so ID1 cannot read its F-id: make it a regular file` });
      continue;
    }
    const md = readFileSync(join(abs, f), 'utf8');
    const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, (m) => m.replace(/[^\n]/g, ''));
    const heading = visible(body).map((l) => l.text.match(/^ {0,3}#{1,6}[ \t]+F-(\d+)\b/)).find(Boolean);
    if (heading) scanned++;
    docs.set(path, { n: heading ? Number(heading[1]) : null, companionOf: (frontmatter(md) ?? {})['companion-of'] ?? null });
  }
}

const fid = (n) => `F-${String(n).padStart(2, '0')}`;
const safe = (p) => typeof p === 'string' && p !== '' && !p.startsWith('/') && !/[\u0000-\u001f\u007f\\:]/.test(p) && p.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
const owners = new Map();
const exempted = [];
for (const [path, d] of docs) {
  if (d.n === null) {
    if (d.companionOf !== null) findings.push({ where: `${path}#companion/id-differs`, detail: `${path} names ${d.companionOf} as its primary but carries no F-id of its own` });
    continue;
  }
  if (d.companionOf === null) {
    if (!owners.has(d.n)) owners.set(d.n, []);
    owners.get(d.n).push(path);
    continue;
  }
  const target = safe(d.companionOf) ? docs.get(d.companionOf) : undefined;
  if (!target) {
    findings.push({ where: `${path}#companion/missing`, detail: `companion-of names "${typeof d.companionOf === 'string' ? d.companionOf : '(no path)'}", which is not a regular feature doc under ${FEATURE_DIRS.join(' or ')} (a repo-relative path, no link, no "..")` });
  } else if (d.companionOf === path || target.companionOf !== null) {
    findings.push({ where: `${path}#companion/chain`, detail: `${path} names ${d.companionOf} as its primary, and ${d.companionOf} is itself a companion (of ${target.companionOf}): name the doc that owns ${fid(d.n)}, which declares nothing` });
  } else if (target.n !== d.n) {
    findings.push({ where: `${path}#companion/id-differs`, detail: `${path} carries ${fid(d.n)} and names ${d.companionOf} as its primary, which ${target.n === null ? 'carries no F-id' : `carries ${fid(target.n)}`}` });
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
