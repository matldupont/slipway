#!/usr/bin/env node
// DC1 — a decision names the feature it changes, never a milestone item by its position (F-15 §5,
// dev/features/owed-decisions.md).
//
// Shaping reorders a milestone's Contents, and a decision that says "M2 item 4" then points at another item with
// nothing to say so. The feature id stays put: `Amends: F-07` under the decision, which `pnpm status` reads.
//
//   decisions.md#decision/position/<id>     exit 1: the entry's heading or body says `M<n> item <k>`, `M<n>'s item <k>`,
//                                           `M<n> Contents item <k>`, `M<n>'s Contents item <k>` or `item <k> of M<n>`,
//                                           outside code spans and fenced blocks (a quoted shape explains the rule). One
//                                           finding per entry, at its first match in a milestone that is not closed or
//                                           killed (those items never move); the detail names the feature that item
//                                           builds today, read from the milestone, says to quote the item's words when it
//                                           cites none, or says there is no such item
//   decisions.md#decision/unreadable/<id>   a warning, never red: a condition or Amends: line status cannot read, the
//                                           entries status groups in its Unreadable line
//   info line                               never red: the decisions that say when they reopen or close in prose only, and those
//                                           waiting on an issue status cannot see, by id and nothing else (build step 4)
//   broken                                  exit 2: no decisions.md, or one that is not a regular file. A project is
//                                           seeded with it, and a check that cannot see passes nothing
//
// The record is read through lib/decisions.mjs, the one reader status uses too, and the milestones through
// readMilestones(). A detail prints ids, numbers and a milestone's file name, never the record's text.
//
//   node ci/checks/meta/dc1-decisions.mjs <root>

import { fid, ISSUE_READABLE, readDecisions } from '../lib/decisions.mjs';
import { citedFeatures, contents, readMilestones } from '../lib/milestones.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const record = readDecisions(root);
const unit = `decisions.md (${record.entries.length} ${record.entries.length === 1 ? 'entry' : 'entries'})`;
if (record.missing) process.exit(report({ id: 'DC1', claim: '', scanned: 0, unit, broken: `decisions.md ${record.missing}` }));

// The milestones are read only when a position needs one, so a record that names none never depends on them.
let milestones;
const milestone = (n) => {
  milestones ??= readMilestones(root).milestones;
  return milestones.find((x) => typeof x.fm?.id === 'string' && x.fm.id.toUpperCase() === `M${n}`);
};
// A closed or killed milestone is never reshaped, so its items cannot move (the owner, 2026-10-15).
const settled = (n) => ['closed', 'killed'].includes(milestone(n)?.fm.status);
const item = (n, k) => {
  const m = milestone(n);
  const it = m && contents(m.md).find((i) => i.n === k);
  return it ? { file: m.file, features: [...new Set(citedFeatures(it.text.slice(0, 500)))] } : null;
};

const findings = [];
for (const e of record.entries) {
  const p = e.positions.find((x) => !settled(x.milestone));
  if (!p) continue;
  const at = `M${p.milestone} item ${p.item}`;
  const lead = `${e.id} names ${at} (line ${p.line}). Items move when a milestone is reshaped: name the feature instead.`;
  const found = item(p.milestone, p.item);
  const fs = found?.features.map(fid).join(', ');
  // An item with no feature is named by its words (the owner, 2026-10-15): the detail says so, and prints none of them.
  const detail = !found
    ? `${lead} There is no ${at} to read a feature from: write \`Amends: F-<n>\` for the feature the item builds`
    : fs
      ? `${lead} ${at} builds ${fs} today (docs/milestones/${found.file}): write \`Amends: ${fs}\` under ${e.id}`
      : `${lead} ${at} cites no F-id (docs/milestones/${found.file}): in place of "${at}", quote the item's words, or cite its feature once it has one`;
  findings.push({ where: `decisions.md#decision/position/${e.id}`, detail });
}

const warnings = record.unreadable().map((u) => ({
  where: `decisions.md#decision/unreadable/${u.id}`,
  detail: `${u.id} (line ${u.line}) has a condition or Amends: line status cannot read${u.issueOnly && !ISSUE_READABLE ? ' (it waits on an issue, read at the pull request that closes it once that reader ships)' : ''}: say what brings it back in the form status reads (/clarify), or move a condition no event fits into the entry's prose`,
}));

// The two counts /close-milestone's retro reads, ids only: a prose condition nothing reads, and an issue closed by hand.
const ids = (xs) => (xs.length ? `${xs.length > 20 ? `${xs.slice(0, 20).join(', ')} and ${xs.length - 20} more` : xs.join(', ')} (${xs.length})` : 'none');
console.log(`DC1: info — in prose only: ${ids(record.proseCount())}; waiting on an issue: ${ids(record.awaitingIssue())}`);

process.exit(
  report({
    id: 'DC1',
    claim: 'no decision names a milestone item by its position outside code; each condition or Amends: line status cannot read is warned',
    scanned: 1,
    unit,
    findings,
    warnings,
  })
);
