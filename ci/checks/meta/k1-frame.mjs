#!/usr/bin/env node
// K1 — frame before build.
//
// docs/product/FRAME.md says whose job the product does, the one question it answers, and
// what could kill it. K1 makes the frame a precondition of building, in three tiers:
//
// Always, milestone or not:
//   status/unknown         `status` is not draft or framed
//   parked/incomplete      a [PARKED: …] question is missing its working assumption, the cost if it
//                          is wrong, or where it is tracked (#12, owner/repo#12, OD-3, D-7)
//   risk/header            the Risks table has no readable column for ID, Category, Threshold or Result:
//                          a renamed header whose template position another column holds, or whose
//                          position an added column has shifted. Reported before any milestone, since
//                          once one is underway the risk findings below would read the wrong cells.
//   risk/no-threshold      a risk has a Result but no Threshold — the bar was set after the
//                          test, so the test could not fail. Not for a value risk settled by
//                          experience: its `Wrong if:` line is its bar. Experience settles only a value
//                          risk, so on any other risk it is an ordinary Result, and the message says why.
//   risk/experience-rationale
//                          a value risk's Result starts with `experience` but names none of the three
//                          reasons: table stakes, creator is the user, domain expertise (D-019)
//   risk/no-refutation     a value risk is settled by experience, but no `Wrong if:` line in its
//                          evidence says what would prove it wrong
//
// Once any milestone is active or closed, the frame must be finished:
//   status/draft           a milestone is underway but FRAME.md is still `status: draft`
//   section/<Name>         Job story, The question it answers, or Risks is missing or empty
//   job/shape              the job story is not "When …, I want to …, so I can …"
//   placeholder/present    a template placeholder or [NEEDS CLARIFICATION] is still in the text
//   risk/untracked         a value risk has no Result and names no tracker: the issue, D- or OD- entry
//                          where its test is being run (FRAME's Tracker column, or a `Tracked:` line in
//                          its evidence file). Untested is fine while the skeleton is built; untested
//                          with nobody running the test is how a risk is forgotten.
//
// Once a milestone that is not the walking skeleton (kind other than `skeleton`) is active
// or closed, every value risk must have been tested:
//   risk/unresolved        a risk tagged value has no Result (a PD-<n> override counts, and so does
//                          experience with what would prove it wrong written down)
//
// Where the PRD's risk table has a `Resolves by` column, its deadlines hold too, for every category:
//   risk/overdue           the PRD says `before Mn`, Mn or a later milestone is active or closed, and
//                          FRAME records no Result (a PD-<n> override counts) — or has no row for the risk
//                          at all. A value risk already reported as risk/unresolved is not reported twice.
//                          Deadlines that name no milestone (`with RISK-1`, `before first live charge`)
//                          are not checked here. Status warns about an untested existential risk due
//                          after the first milestone past the skeleton, at no milestone, or not listed.
//
// A question you can build without is parked, not unresolved:
//
//   [PARKED: which channels? · assume: SDLA network only · if wrong: the sample is not strangers · #12]
//
// Parked questions do not block the frame. The working assumption, the cost and the tracker are what
// make that honest, so K1 requires all three. A question with no honest working assumption stays
// [NEEDS CLARIFICATION] and blocks — that is the point of the distinction.
//
// WHY: when no document names the question the product answers, scope follows the
// loudest idea, the primary user drifts between PRD revisions, and the feature that
// justified the work waits behind everything else. Agents make building cheap; they do not make it
// right. The riskiest assumption is tested before production code, against a bar written
// down first.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter, PLACEHOLDER } from '../lib/frontmatter.mjs';
import { plain, section } from '../lib/markdown.mjs';
import { readMilestones } from '../lib/milestones.mjs';
import { report } from '../lib/report.mjs';
import { EXPERIENCE, filled, milestoneNumber, readDeadlines, readRisks, TRACKER } from '../lib/risks.mjs';

// A Result quoted in a finding, cut like a parked question, by code point so a character is never split.
// report() escapes what it prints.
const quote = (s) => {
  const chars = Array.from(s);
  return chars.length > 60 ? `${chars.slice(0, 60).join('')}…` : s;
};

const root = process.argv[2] ?? '.';
const rel = 'docs/product/FRAME.md';
const path = join(root, rel);
const UNIT = 'frame document';

if (!existsSync(path)) {
  process.exit(report({ id: 'K1', claim: '', scanned: 0, unit: UNIT, broken: `${rel} does not exist` }));
}

const md = readFileSync(path, 'utf8');
// Comments are blanked (not removed) so line numbers hold. A marker sitting whole inside inline code is
// the template's explanation of the syntax, not a question; an escaped backtick is not code. Every span is
// matched so that the gap between two spans is never read as one.
const text = md.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, '')).replace(/(?<!\\)`[^`\n]*`/g, (span) => (/\[(?:NEEDS CLARIFICATION|PARKED)[^\]]*\]/.test(span) ? '' : span));
const fm = frontmatter(md) ?? {};
const { milestones } = readMilestones(root);
const underway = milestones.filter((m) => m.fm && (m.fm.status === 'active' || m.fm.status === 'closed'));
const pastSkeleton = underway.filter((m) => m.fm.kind !== 'skeleton');

const findings = [];
const add = (where, detail) => findings.push({ where, detail });

// A parked question carries its working assumption, the cost if it is wrong, and a tracker.
for (const [, body] of text.matchAll(/\[PARKED:([^\]]*)\]/g)) {
  const missing = [
    !/\bassume:\s*\S/i.test(body) && 'assume: <what you build on>',
    !/\bif wrong:\s*\S/i.test(body) && 'if wrong: <the cost>',
    !TRACKER.test(body) && 'a tracker (an issue like #12, or a decision id from decisions.md or the PRD)',
  ].filter(Boolean);
  if (missing.length) add('FRAME.md#parked/incomplete', `parked question "${body.trim().slice(0, 60)}" is missing ${missing.join(', ')}`);
}

if (fm.status !== 'draft' && fm.status !== 'framed') {
  add('FRAME.md#status/unknown', `status "${fm.status ?? ''}" is not draft or framed`);
}

if (underway.length) {
  const names = underway.map((m) => m.fm.id).join(', ');
  if (fm.status === 'draft') add('FRAME.md#status/draft', `${names} underway while docs/product/FRAME.md is still a draft: finish it and set status: framed`);
  for (const s of ['Job story', 'The question it answers', 'Risks']) {
    const body = section(md, s, 2);
    if (body === null || body === '') add(`FRAME.md#section/${s}`, `## ${s} is missing or empty`);
  }
  const job = section(md, 'Job story', 2);
  if (job && !/\bwhen\b[\s\S]*\bwant\b[\s\S]*\bso\b/i.test(job)) {
    add('FRAME.md#job/shape', 'the job story must read "When …, I want to …, so I can …"');
  }
  const open = text.split(/\r?\n/).map((l, i) => (PLACEHOLDER.test(l) ? i + 1 : 0)).filter(Boolean);
  if (open.length) add('FRAME.md#placeholder/present', `line${open.length > 1 ? 's' : ''} ${open.join(', ')} of docs/product/FRAME.md still hold${open.length > 1 ? '' : 's'} a placeholder or [NEEDS CLARIFICATION]: answer or park each (/clarify), then set status: framed`);
}

// Risk table rows, read by column header: | RISK-n | … | Category | … | Threshold | Result | Tracker |
const { rows: risks, missing } = readRisks(root, md);
if (missing.length) {
  add('FRAME.md#risk/header', `the Risks table in docs/product/FRAME.md has no readable ${missing.join(', ')} column: use the template's headers (ID … Category … Threshold … Result … Tracker)`);
}

for (const r of risks) {
  // Settled by experience: one of three reasons, and what would prove it wrong. A reason off the list is
  // reported alone, not also as missing its refutation or its Threshold.
  if (r.claimsExperience && !r.experience) {
    add(`${r.id}#risk/experience-rationale`, `is settled by experience, but "${quote(plain(r.result))}" is not one of: table stakes, creator is the user, domain expertise — write which one in the Result column of docs/product/FRAME.md's Risks table, or clear it and run a test`);
  } else if (r.experience && !r.refutation) {
    add(`${r.id}#risk/no-refutation`, `is settled by experience (${r.experience.rationale}), but its evidence names nothing that would prove it wrong — add a \`Wrong if:\` line under ${r.id} in docs/product/evidence/ (its ${r.id}-… file, or its \`### ${r.id}\` heading in a shared one), or run a test`);
  }
  if (r.tested && !r.claimsExperience && !filled(r.threshold)) {
    const why = EXPERIENCE.test(plain(r.result ?? '')) ? ` (experience settles only a value risk, and ${r.id} is ${quote(plain(r.category ?? '')) || 'uncategorised'})` : '';
    add(`${r.id}#risk/no-threshold`, `has a Result but no Threshold${why}: the bar must be written before the test — write the Threshold it was measured against, or clear the Result and run the test again`);
  }
  if (pastSkeleton.length && r.value && !r.tested) {
    add(`${r.id}#risk/unresolved`, `value risk untested while ${pastSkeleton.map((m) => m.fm.id).join(', ')} is underway: record its Result in FRAME's Risks table, or record a decision in decisions.md to build ahead (cost if wrong, and what reopens it) and put its id in the Result`);
  }
  if (underway.length && r.value && !r.tested && !r.tracker) {
    add(`${r.id}#risk/untracked`, `value risk has no Result and no tracker while ${underway.map((m) => m.fm.id).join(', ')} ${underway.length > 1 ? 'are' : 'is'} underway: name the issue running its test in FRAME's Tracker column (#n), or in a \`Tracked: #n\` line in its docs/product/evidence/ file`);
  }
}

// PRD deadlines: `before Mn` is due once Mn, or any later milestone, is underway — a skipped or killed
// Mn does not defer it — whatever the risk's category.
const prdPath = join(root, 'docs', 'PRD.md');
const deadlines = existsSync(prdPath) ? readDeadlines(readFileSync(prdPath, 'utf8')) : null;
for (const [id, d] of deadlines ?? []) {
  const due = d.before && underway.find((m) => milestoneNumber(m.fm.id) >= milestoneNumber(d.before));
  if (!due) continue;
  const r = risks.find((x) => (x.id ?? '').toUpperCase() === id);
  if (r?.tested || (r?.value && pastSkeleton.length)) continue;
  add(`${id}#risk/overdue`, r
    ? `the PRD says it resolves ${d.cell}, and ${due.fm.id} is ${due.fm.status}: record its Result in FRAME, or record a decision in decisions.md to build ahead (cost if wrong, and what reopens it) and put its id in the Result`
    : `the PRD says it resolves ${d.cell}, and ${due.fm.id} is ${due.fm.status}, but FRAME's Risks table has no ${id} row: add one with its Threshold, then its Result`);
}

process.exit(
  report({
    id: 'K1',
    claim: underway.length
      ? `the frame is finished, every untested value risk names a tracker, every risk settled by experience names its reason and what would prove it wrong${pastSkeleton.length ? ', every value risk was tested against a bar set first or settled by experience' : ''}${deadlines ? `, and every risk the PRD's Resolves by has made due has a Result` : ''} (${risks.length} risks)`
      : `no milestone is underway, so only the frame's shape, its Thresholds and its risks settled by experience are checked (${risks.length} risks)`,
    scanned: 1,
    unit: `${UNIT} (${milestones.length} milestones read)`,
    findings,
  })
);
