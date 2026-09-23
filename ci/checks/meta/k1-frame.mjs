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
//                          test, so the test could not fail
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
//   risk/unresolved        a risk tagged value has no Result (a D-nnn override counts)
//
// Where the PRD's risk table has a `Resolves by` column, its deadlines hold too, for every category:
//   risk/overdue           the PRD says `before Mn`, Mn is active or closed, and FRAME records no Result
//                          (a D-nnn override counts) — or has no row for the risk at all. A value risk
//                          already reported as risk/unresolved is not reported twice. Deadlines that name
//                          no milestone (`with RISK-1`, `before first live charge`) are not checked here;
//                          status warns when such a risk is existential.
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
import { section } from '../lib/markdown.mjs';
import { readMilestones } from '../lib/milestones.mjs';
import { report } from '../lib/report.mjs';
import { filled, readDeadlines, readRisks, TRACKER } from '../lib/risks.mjs';

const root = process.argv[2] ?? '.';
const rel = 'docs/product/FRAME.md';
const path = join(root, rel);
const UNIT = 'frame document';

if (!existsSync(path)) {
  process.exit(report({ id: 'K1', claim: '', scanned: 0, unit: UNIT, broken: `${rel} does not exist` }));
}

const md = readFileSync(path, 'utf8');
const text = md.replace(/<!--[\s\S]*?-->/g, '');
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
    !TRACKER.test(body) && 'a tracker (#12, OD-3, D-7)',
  ].filter(Boolean);
  if (missing.length) add('FRAME.md#parked/incomplete', `parked question "${body.trim().slice(0, 60)}" is missing ${missing.join(', ')}`);
}

if (fm.status !== 'draft' && fm.status !== 'framed') {
  add('FRAME.md#status/unknown', `status "${fm.status ?? ''}" is not draft or framed`);
}

if (underway.length) {
  const names = underway.map((m) => m.fm.id).join(', ');
  if (fm.status === 'draft') add('FRAME.md#status/draft', `${names} underway while the frame is still a draft`);
  for (const s of ['Job story', 'The question it answers', 'Risks']) {
    const body = section(md, s, 2);
    if (body === null || body === '') add(`FRAME.md#section/${s}`, `## ${s} is missing or empty`);
  }
  const job = section(md, 'Job story', 2);
  if (job && !/\bwhen\b[\s\S]*\bwant\b[\s\S]*\bso\b/i.test(job)) {
    add('FRAME.md#job/shape', 'the job story must read "When …, I want to …, so I can …"');
  }
  const open = text.split(/\r?\n/).filter((l) => PLACEHOLDER.test(l)).length;
  if (open) add('FRAME.md#placeholder/present', `${open} line(s) still hold a placeholder or [NEEDS CLARIFICATION]`);
}

// Risk table rows, read by column header: | RISK-n | … | Category | … | Threshold | Result | Tracker |
const { rows: risks, missing } = readRisks(root, md);
if (missing.length) {
  add('FRAME.md#risk/header', `the Risks table has no ${missing.join(', ')} column K1 can find: use the template's headers (ID … Category … Threshold … Result … Tracker)`);
}

for (const r of risks) {
  if (r.tested && !filled(r.threshold)) {
    add(`${r.id}#risk/no-threshold`, 'has a Result but no Threshold: the bar must be written before the test');
  }
  if (pastSkeleton.length && r.value && !r.tested) {
    add(`${r.id}#risk/unresolved`, `value risk untested while ${pastSkeleton.map((m) => m.fm.id).join(', ')} is underway: record a Result or a D-nnn override`);
  }
  if (underway.length && r.value && !r.tested && !r.tracker) {
    add(`${r.id}#risk/untracked`, `value risk has no Result and no tracker while ${underway.map((m) => m.fm.id).join(', ')} ${underway.length > 1 ? 'are' : 'is'} underway: name the issue running its test (#n, D-n, OD-n) in FRAME's Tracker column, or in a Tracked: line in its evidence file`);
  }
}

// PRD deadlines: `before Mn` is due once Mn is underway, whatever the risk's category.
const prdPath = join(root, 'docs', 'PRD.md');
const deadlines = existsSync(prdPath) ? readDeadlines(readFileSync(prdPath, 'utf8')) : null;
for (const [id, d] of deadlines ?? []) {
  const due = underway.find((m) => String(m.fm.id).toUpperCase() === d.before);
  if (!due) continue;
  const r = risks.find((x) => (x.id ?? '').toUpperCase() === id);
  if (r?.tested || (r?.value && pastSkeleton.length)) continue;
  add(`${id}#risk/overdue`, r
    ? `the PRD says it resolves ${d.cell}, and ${due.fm.id} is ${due.fm.status}: record its Result in FRAME, or a D-nnn override (cost if wrong, and what reopens it)`
    : `the PRD says it resolves ${d.cell}, and ${due.fm.id} is ${due.fm.status}, but FRAME's Risks table has no ${id} row to hold its Threshold and Result`);
}

process.exit(
  report({
    id: 'K1',
    claim: underway.length
      ? `the frame is finished, every untested value risk names a tracker${pastSkeleton.length ? ', every value risk was tested against a bar set first' : ''}${deadlines ? `, and every risk the PRD's Resolves by has made due has a Result` : ''} (${risks.length} risks)`
      : `no milestone is underway, so only the frame's shape is checked (${risks.length} risks)`,
    scanned: 1,
    unit: `${UNIT} (${milestones.length} milestones read)`,
    findings,
  })
);
