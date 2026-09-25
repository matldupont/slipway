#!/usr/bin/env node
// F1 — feature coverage.
//
// The PRD lists the features (§5, F-01 …); milestones decide when each is built. F1 checks
// the link between the two, so a feature cannot sit in the PRD and silently never be
// scheduled, and a milestone cannot fill up with work no feature asked for:
//
//   feature/unscheduled     an F-ID in PRD §5 is cited by no milestone that is still live
//                           (shaping, active or closed) — killed milestones do not count
//   contents/uncited/<n>    item n of an active or closed milestone's Contents cites no F-ID
//                           and does not say `(no feature: <reason>)`
//   contents/unknown/<F-n>  a milestone cites an F-ID that PRD §5 does not define
//
// Runs once the PRD has left draft (`Status:` anything but draft). Before that the features
// are still being written, and only the PRD's presence is checked. F-IDs compare by number:
// F-2 and F-02 are the same feature. Shaping milestones are drafts; their Contents are not
// checked, but their citations still schedule a feature.
//
// WHY: a PRD feature that no milestone owns is either out of scope or forgotten, and only
// the first should be possible — it belongs in §4 *Out, explicitly*. A slice citing no
// feature is how unrequested work enters a milestone.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { section } from '../lib/markdown.mjs';
import { readMilestones } from '../lib/milestones.mjs';
import { report } from '../lib/report.mjs';

const root = process.argv[2] ?? '.';
const prdPath = join(root, 'docs', 'PRD.md');
const UNIT = 'PRD features and milestone slices';
if (!existsSync(prdPath)) {
  process.exit(report({ id: 'F1', claim: '', scanned: 0, unit: UNIT, broken: 'docs/PRD.md does not exist — /kickoff writes it' }));
}

const prd = readFileSync(prdPath, 'utf8');
const status = (prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim().toLowerCase() ?? 'draft';
const num = (id) => Number(id.slice(2));
const features = new Map();
for (const m of (section(prd, '5. Features', 2) ?? '').matchAll(/^###\s+(F-\d+)\s+—\s+(.+)$/gm)) {
  if (!m[2].trim().startsWith('<')) features.set(num(m[1]), m[1]);
}

// Contents items: a line starting `N.` opens an item; indented lines continue it.
function contents(md) {
  const items = [];
  for (const line of (section(md, 'Contents', 2) ?? '').split(/\r?\n/)) {
    const open = line.match(/^(\d+)\.\s+(.*)$/);
    if (open) items.push({ n: Number(open[1]), text: open[2] });
    else if (items.length && /^\s+\S/.test(line)) items[items.length - 1].text += ' ' + line.trim();
  }
  return items;
}

const { milestones } = readMilestones(root);
const findings = [];
let slices = 0;
const scheduled = new Set();

if (status !== 'draft') {
  for (const { file, md, fm } of milestones) {
    if (!fm?.status || fm.status === 'killed') continue;
    for (const item of contents(md)) {
      const cited = [...item.text.matchAll(/\bF-(\d+)\b/g)].map((m) => Number(m[1]));
      cited.forEach((n) => scheduled.add(n));
      if (fm.status === 'shaping') continue;
      slices++;
      for (const n of cited) {
        if (!features.has(n)) findings.push({ where: `${file}#contents/unknown/F-${String(n).padStart(2, '0')}`, detail: `Contents item ${item.n} cites F-${String(n).padStart(2, '0')}, which the PRD's Features section (§5) does not define` });
      }
      if (!cited.length && !/\(no feature:\s*\S[^)]*\)/i.test(item.text)) {
        findings.push({ where: `${file}#contents/uncited/${item.n}`, detail: `Contents item ${item.n} "${item.text.trim().slice(0, 50)}" cites no feature (F-nn) and gives no "(no feature: <reason>)"` });
      }
    }
  }
  for (const [n, id] of features) {
    if (!scheduled.has(n)) findings.push({ where: `${id}#feature/unscheduled`, detail: `${id} is in the PRD's Features (§5) but no live milestone builds it — add it to a milestone's Contents, or move it to the PRD's Out, explicitly (§4)` });
  }
}

process.exit(
  report({
    id: 'F1',
    claim: status === 'draft'
      ? 'the PRD is still a draft, so feature coverage is not checked yet'
      : `every PRD feature is scheduled by a live milestone, and every active or closed slice cites a feature (${features.size} features, ${slices} slices)`,
    scanned: 1 + features.size + slices,
    unit: `${UNIT} (PRD ${status})`,
    findings,
  })
);
