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
//                                           finding per entry, at its first match; the detail names the feature that
//                                           item builds today, read from the milestone, or says there is no such item
//   decisions.md#decision/unreadable/<id>   a warning, never red: a condition or Amends: line status cannot read, the
//                                           entries status groups in its Unreadable line
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
const item = (n, k) => {
  milestones ??= readMilestones(root).milestones;
  const m = milestones.find((x) => typeof x.fm?.id === 'string' && x.fm.id.toUpperCase() === `M${n}`);
  const it = m && contents(m.md).find((i) => i.n === k);
  return it ? { file: m.file, features: [...new Set(citedFeatures(it.text.slice(0, 500)))] } : null;
};

const findings = [];
for (const e of record.entries) {
  const p = e.positions[0];
  if (!p) continue;
  const at = `M${p.milestone} item ${p.item}`;
  const lead = `${e.id} names ${at} (line ${p.line}). Items move when a milestone is reshaped: name the feature instead.`;
  const found = item(p.milestone, p.item);
  const detail = found?.features.length
    ? `${lead} ${at} builds ${found.features.map(fid).join(', ')} today (docs/milestones/${found.file}): write \`Amends: ${found.features.map(fid).join(', ')}\` under ${e.id}`
    : `${lead} ${found ? `${at} cites no F-id, so there is no item to read a feature from` : `There is no ${at} to read a feature from`}: write \`Amends: F-<n>\` for the feature the item builds`;
  findings.push({ where: `decisions.md#decision/position/${e.id}`, detail });
}

const warnings = record.unreadable().map((u) => ({
  where: `decisions.md#decision/unreadable/${u.id}`,
  detail: `${u.id} (line ${u.line}) has a condition or Amends: line status cannot read${u.issueOnly && !ISSUE_READABLE ? ' (it waits on an issue, read at the pull request that closes it once that reader ships)' : ''}: say what brings it back in the form status reads (/clarify), or move a condition no event fits into the entry's prose`,
}));

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
