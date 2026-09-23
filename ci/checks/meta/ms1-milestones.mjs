#!/usr/bin/env node
// MS1 — milestones.
//
// A milestone is a bet: a time budget (appetite), what is deliberately out (no-gos), a gate
// that can go red, and the condition under which you stop. MS1 checks each milestone
// document in docs/milestones/ and the set as a whole:
//
//   frontmatter/missing    no YAML frontmatter
//   field/missing          no `id` or `status`
//   status/unknown         not one of: shaping active closed killed
//   kind/unknown           `kind` set, but not one of: skeleton mvp release bet
//   id/duplicate
//   appetite/missing       active, closed and killed milestones need `appetite`
//   appetite/invalid       appetite is not YYYY-MM-DD..YYYY-MM-DD (start <= end)
//   section/<Name>         active, closed and killed milestones need No-gos, Gate and Kill
//                          criteria written — empty or still holding a placeholder fails
//   retro/missing          a closed or killed milestone has no Retro
//   appetite/overrun       active past the last day of its appetite, with no extension — the
//                          circuit breaker: by default a bet does not get more time
//   extended/unresolved    `extended: D-nnn` names a decision decisions.md does not hold
//   wip/exceeded           more than one milestone is active
//   template/fields        TEMPLATE.md lost a field or section MS1 reads
//
// WHY: milestones left open after their work ends, and new surfaces started while a launch
// gate sits open, are how scope creeps when building is cheap. An open milestone nobody is
// working, or a bet that silently runs long, needs something that fires.
//
// Shaping milestones are drafts: only frontmatter is checked. Dates are inclusive;
// CHECK_TODAY overrides today for fixtures.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter, PLACEHOLDER } from '../lib/frontmatter.mjs';
import { section } from '../lib/markdown.mjs';
import { MILESTONE_KINDS, MILESTONE_STATUSES, parseAppetite, readMilestones } from '../lib/milestones.mjs';
import { today as localToday } from '../lib/clock.mjs';
import { report } from '../lib/report.mjs';

const REQUIRED_SECTIONS = ['No-gos', 'Gate', 'Kill criteria'];
const TEMPLATE_KEYS = ['id', 'status', 'kind', 'appetite'];

const root = process.argv[2] ?? '.';
const today = localToday(root);
const { dir, files, milestones } = readMilestones(root);
const decisionsPath = join(root, 'decisions.md');
const decisions = existsSync(decisionsPath) ? readFileSync(decisionsPath, 'utf8') : '';
const hasDecision = (id) => new RegExp(`^#{2,3}\\s+${id}\\b`, 'm').test(decisions);
const written = (s) => s !== null && s.trim() !== '' && !PLACEHOLDER.test(s);

const findings = [];
const seen = new Map();
const active = [];

if (files.includes('TEMPLATE.md')) {
  const md = readFileSync(join(dir, 'TEMPLATE.md'), 'utf8');
  const fm = frontmatter(md) ?? {};
  const lost = [
    ...TEMPLATE_KEYS.filter((k) => fm[k] === undefined),
    ...[...REQUIRED_SECTIONS, 'Retro'].filter((s) => section(md, s, 2) === null).map((s) => `## ${s}`),
  ];
  if (lost.length) findings.push({ where: 'TEMPLATE.md#template/fields', detail: `missing ${lost.join(', ')}` });
}

for (const { file: f, md, fm } of milestones) {
  const add = (rule, detail) => findings.push({ where: `${f}#${rule}`, detail });
  if (!fm) { add('frontmatter/missing', 'no YAML frontmatter'); continue; }
  if (!fm.id || !fm.status) { add('field/missing', 'needs id and status'); continue; }
  if (seen.has(fm.id)) add('id/duplicate', `id ${fm.id} is also used by ${seen.get(fm.id)}`);
  else seen.set(fm.id, f);
  if (!MILESTONE_STATUSES.includes(fm.status)) {
    add('status/unknown', `"${fm.status}" is not one of ${MILESTONE_STATUSES.join(', ')}`);
    continue;
  }
  if (fm.kind && !MILESTONE_KINDS.includes(fm.kind)) add('kind/unknown', `"${fm.kind}" is not one of ${MILESTONE_KINDS.join(', ')}`);
  if (fm.extended && !hasDecision(fm.extended)) add('extended/unresolved', `${fm.extended} is not a heading in decisions.md`);
  if (fm.status === 'shaping') continue;

  if (fm.status === 'active') active.push(f);
  const appetite = parseAppetite(fm.appetite);
  if (!fm.appetite) add('appetite/missing', `a ${fm.status} milestone needs appetite: YYYY-MM-DD..YYYY-MM-DD`);
  else if (!appetite) add('appetite/invalid', `"${fm.appetite}" is not YYYY-MM-DD..YYYY-MM-DD with start <= end`);
  else if (fm.status === 'active' && appetite.end < today && !(fm.extended && hasDecision(fm.extended))) {
    add('appetite/overrun', `appetite ended ${appetite.end}: cut scope and close it, kill it, or record an extension (extended: D-nnn)`);
  }
  for (const s of REQUIRED_SECTIONS) {
    if (!written(section(md, s, 2))) add(`section/${s}`, `## ${s} is missing, empty or still a placeholder`);
  }
  if ((fm.status === 'closed' || fm.status === 'killed') && !written(section(md, 'Retro', 2))) {
    add('retro/missing', `a ${fm.status} milestone needs a Retro: planned vs shipped, what was cut, what was learned`);
  }
}

if (active.length > 1) {
  findings.push({ where: 'docs/milestones#wip/exceeded', detail: `${active.length} milestones are active (${active.join(', ')}); one at a time` });
}

const byStatus = MILESTONE_STATUSES.map((s) => [s, milestones.filter((m) => m.fm?.status === s).length])
  .filter(([, n]) => n)
  .map(([s, n]) => `${n} ${s}`)
  .join(', ');
process.exit(
  report({
    id: 'MS1',
    claim: `every milestone is shaped, at most one is active, and none has outrun its appetite unextended (${byStatus || 'none'})`,
    scanned: files.length,
    unit: 'milestone documents',
    findings,
  })
);
