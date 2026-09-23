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
//   summary/drift          a milestone's `summary:` differs from its row in the table under
//                          PRD `## 10. …` › `### Milestones`, or has no row there. Only milestones
//                          that declare a non-empty `summary:` are compared, so a repo without the
//                          field stays green
//   milestones/header      a milestone declares `summary:` but that table has no readable
//                          Milestone and One line columns to compare it with
//
// Warnings — printed, never red:
//
//   estimate/over-appetite the midpoint of a shaping or active milestone's hours in PRD §9 is
//                          more than its appetite can hold: appetite days / 7 × the top of
//                          §9's `Capacity: <n>–<m> h/week`
//   estimate/capacity      §9's estimate table has hours but no readable Capacity line
//   estimate/header        §9 has a table with no readable Milestone and Hours columns
//   estimate/unreadable/<id> an Hours cell that is neither a placeholder nor `n`, `n–m`, `n to m`
//
// A PRD with no §9 table compares nothing and says nothing: the table is optional.
//
// WHY: milestones left open after their work ends, and new surfaces started while a launch
// gate sits open, are how scope creeps when building is cheap. An open milestone nobody is
// working, or a bet that silently runs long, needs something that fires. The PRD's milestone
// one-liners and estimates restate what the milestone files say; restated facts drift apart.
//
// Shaping milestones are drafts: only frontmatter is checked. Dates are inclusive;
// CHECK_TODAY overrides today for fixtures.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter, PLACEHOLDER } from '../lib/frontmatter.mjs';
import { plain, section, table } from '../lib/markdown.mjs';
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

// The PRD restates each milestone twice: a one-liner in §10 and an estimate in §9.
const prdPath = join(root, 'docs', 'PRD.md');
const prd = existsSync(prdPath) ? readFileSync(prdPath, 'utf8') : null;
const warnings = [];
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const column = (header, re) => header.findIndex((h) => re.test(h));
// Hours as a range: `50`, `~50 h`, `40–60`, `40-60h`, `40 to 60 hours`, `1,200`. The whole cell
// must read, so `40 to 60` is never taken as 40. Whitespace is squashed first so no pattern
// below can backtrack over a run of it.
const N = '(\\d+(?:\\.\\d+)?)';
const H = '(?: ?(?:h|hrs?|hours?))?';
const HOURS = new RegExp(`^~? ?${N}${H}(?: ?(?:[–-]|to) ?~? ?${N}${H})?$`, 'i');
const CAPACITY = new RegExp(`${N}(?: ?(?:[–-]|to) ?${N})? ?(?:h|hrs?|hours?) ?(?:/|per|a) ?w(?:ee)?k`, 'i');
const toRange = (m) => (m ? { low: Number(m[1]), high: Number(m[2] ?? m[1]) } : null);
const hoursIn = (cell) => toRange(squash(plain(cell ?? '').replace(/,/g, '')).match(HOURS));
const round = (n) => Math.round(n * 10) / 10;
const named = new Map(milestones.filter((m) => m.fm?.id).map((m) => [m.fm.id, m]));
const withSummary = [...named.values()].filter((m) => typeof m.fm.summary === 'string' && m.fm.summary.trim());

if (prd && withSummary.length) {
  // Scoped to §10: another `### Milestones` elsewhere in the PRD is not this table.
  const t = table(section(section(prd, '10. Story map and milestones', 2) ?? '', 'Milestones', 3));
  const idAt = t ? column(t.header, /^(milestone|id)$/i) : -1;
  const lineAt = t ? column(t.header, /^(one line|summary)$/i) : -1;
  if (idAt < 0 || lineAt < 0) {
    findings.push({ where: 'docs/PRD.md#milestones/header', detail: 'no table under ## 10. Story map and milestones › ### Milestones with Milestone and One line columns, so no summary: can be compared' });
  } else {
    const rows = new Map(t.rows.map((c) => [plain(c[idAt] ?? ''), c[lineAt] ?? '']));
    for (const { file, fm } of withSummary) {
      const add = (detail) => findings.push({ where: `${file}#summary/drift`, detail });
      if (!rows.has(fm.id)) add(`the PRD's ### Milestones table has no ${fm.id} row — generate it from summary: "${fm.summary}"`);
      else if (squash(rows.get(fm.id)) !== squash(fm.summary)) {
        add(`the PRD says "${squash(rows.get(fm.id))}", summary: says "${squash(fm.summary)}" — correct the one that is wrong, then regenerate the row`);
      }
    }
  }
}

if (prd) {
  const estimate = section(prd, '9. Estimate', 2);
  const t = table(estimate);
  const idAt = t ? column(t.header, /^(milestone|id)$/i) : -1;
  const hoursAt = t ? column(t.header, /hours|estimate/i) : -1;
  // Read from one line, capped, so a pathological line costs nothing.
  const capacityLine = (estimate ?? '').split(/\r?\n/).find((l) => /^[ \t>*_-]*Capacity\b/i.test(l));
  const capacity = toRange(squash(plain(capacityLine ?? '').slice(0, 200).replace(/,/g, '')).match(CAPACITY));
  if (t && (idAt < 0 || hoursAt < 0)) {
    warnings.push({ where: 'docs/PRD.md#estimate/header', detail: 'the §9 table has no Milestone and Hours columns, so no estimate is compared with its appetite' });
  } else if (t) {
    const rows = t.rows.map((c) => ({ id: plain(c[idAt] ?? ''), cell: c[hoursAt] ?? '', hours: hoursIn(c[hoursAt]) }));
    for (const r of rows.filter((r) => !r.hours && r.cell && !PLACEHOLDER.test(r.cell))) {
      warnings.push({ where: `docs/PRD.md#estimate/unreadable/${r.id}`, detail: `cannot read hours "${r.cell.slice(0, 60)}" — write n, n–m or n to m` });
    }
    const estimated = rows.filter((r) => r.hours);
    if (estimated.length && !capacity) {
      warnings.push({ where: 'docs/PRD.md#estimate/capacity', detail: '§9 estimates hours but has no `Capacity: <n>–<m> h/week` line, so no estimate is compared with its appetite' });
    }
    for (const { id, hours } of capacity ? estimated : []) {
      const m = named.get(id);
      const appetite = parseAppetite(m?.fm.appetite);
      if (!appetite || !['shaping', 'active'].includes(m.fm.status)) continue;
      const days = (Date.parse(appetite.end) - Date.parse(appetite.start)) / 86_400_000 + 1;
      const holds = (days * capacity.high) / 7;
      const mid = (hours.low + hours.high) / 2;
      if (mid > holds) {
        warnings.push({
          where: `${m.file}#estimate/over-appetite`,
          detail: `PRD §9 estimates ${hours.low === hours.high ? hours.low : `${hours.low}–${hours.high}`} h (midpoint ${round(mid)}); the appetite holds at most ${round(holds)} h (${days} days at ${capacity.high} h/week) — cut scope, lengthen the appetite, or re-estimate`,
        });
      }
    }
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
    claim: `every milestone is shaped, at most one is active, none has outrun its appetite unextended, and every summary: matches the PRD (${byStatus || 'none'}; ${withSummary.length} with summary:)`,
    scanned: files.length,
    unit: 'milestone documents',
    findings,
    warnings,
  })
);
