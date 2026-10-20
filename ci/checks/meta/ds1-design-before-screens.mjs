#!/usr/bin/env node
// DS1 — design before screens (F-14, dev/features/design-before-screens.md §4; D-042).
//
// A project whose frame says people use it through screens plans a design item before the screens that follow its
// skeleton, and every milestone that builds screens says under its Gate how they meet WCAG 2.2 AA. DS1 holds that both
// are written, never that they are met: /review-doc argues the item and /close-milestone proves the line.
//
//   frontend/unrecorded          a milestone is active and docs/product/FRAME.md has no one `Front end:` line with a
//                                value (none, two or more, empty, or a placeholder)
//   screens/unknown:<id>         <id> is active and its `screens:` is set to anything but `none`
//   design/missing:<id>          front end; <id> is active, builds screens and is not the skeleton; no design item in a
//                                closed or active milestone before it, none in <id> as item 1 or below started items
//                                only, and no `design:` line
//   design/unresolved:<id>       <id> is active and its `design:` is not a decision id, or names no heading in
//                                decisions.md, or one still marked open (lib/decision-ref.mjs)
//   gate/accessibility:<id>      front end; <id> is active and builds screens, the skeleton included; no WCAG 2.2 AA
//                                line under its Gate, and no live entry for it in ci/exceptions.yaml
//   accessibility/overdue:<id>   an entry names <id>, active or closed, which has no line, and its day has come
//   accessibility/entry:<id>     an entry whose id starts `docs/milestones#` and excuses nothing: not of the form
//                                `docs/milestones#<id>/accessibility`; no reason, owner or real day; or <id> is not a
//                                milestone, is shaping or killed, has the line, or builds no screens
//
// "Before" is by milestone number (M2 before M10, M1.1 between M1 and M2); a design item counts in a closed or active
// milestone, never a shaping or killed one, and never while it is a placeholder. A `Front end: none` closes every
// finding but screens/unknown and the entry findings, which are read whatever the frame says.
//
// The view. One word in a committed file turns a finding off, so the output names each one on every run, red and
// green: what a milestone was let off goes in the exempted line, by the file that said it (`M3: screens: none`,
// `M2: accessibility excused until 2026-12-01`), and the front end read and what satisfied each active milestone's
// design go in the scanned line (`front end: a web app · M3 satisfied by the design item in M1, item 7`).
//
// Reads committed files only: the frame, every milestone (lib/milestones.mjs), decisions.md and ci/exceptions.yaml.
// Shaping milestones are drafts (`pnpm status` asks the planning question); closed and killed ones were built under
// the rule of their time, except that an entry naming one is still read. Exit 2 when the frame, a milestone or the
// registry exists and cannot be read. CHECK_TODAY overrides today for fixtures.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { today as localToday } from '../lib/clock.mjs';
import { resolveDecision } from '../lib/decision-ref.mjs';
import { designBefore, hasAccessibilityLine } from '../lib/design.mjs';
import { expiryProblem, loadRegistry, MILESTONE_PREFIX, said } from '../lib/exceptions.mjs';
import { frontEnd } from '../lib/frame.mjs';
import { MILESTONE_ID, milestoneId, readMilestones } from '../lib/milestones.mjs';
import { excerpt, report } from '../lib/report.mjs';
import { MISSING, notPlainFile, readPlain } from '../lib/review-header.mjs';

const FRAME = 'docs/product/FRAME.md';
const REGISTRY = 'ci/exceptions.yaml';
const root = process.argv[2] ?? '.';
const today = localToday(root);
const stop = (broken) =>
  process.exit(report({ id: 'DS1', claim: '', scanned: 0, unit: 'documents (it stopped before counting)', broken }));

const frameWhy = notPlainFile(root, FRAME);
if (frameWhy !== null && frameWhy !== MISSING) stop(`${FRAME} ${frameWhy}, so where people use the product cannot be read: make it a regular file`);
const frameMd = frameWhy === null ? readFileSync(join(root, FRAME), 'utf8') : null;
const { milestones, refused } = readMilestones(root);
if (refused.length) stop(`${refused[0]} is a link, sits under one or is not a regular file, so it cannot be read as a milestone: make it a plain file in a plain folder`);
const registryWhy = notPlainFile(root, REGISTRY);
if (registryWhy !== null && registryWhy !== MISSING) stop(`${REGISTRY} ${registryWhy}, so its entries cannot be read: make it a regular file`);
let registry = [];
try {
  if (registryWhy !== MISSING) registry = loadRegistry(join(root, REGISTRY));
} catch (e) {
  stop(e.message);
}
const decisions = readPlain(root, 'decisions.md') ?? '';

const fe = frameMd === null ? { state: 'missing' } : frontEnd(frameMd);
const findings = [];
const exempted = [];
const by = new Set();
const satisfied = [];
const where = (m, rule) => `docs/milestones/${m.file}#${rule}:${m.fm.id}`;
const add = (at, detail) => findings.push({ where: at, detail });
const let_off = (line, source) => {
  exempted.push(line);
  by.add(source);
};

// The registry's entries for milestones, each judged alone: `live` excuses its milestone's missing line.
const live = new Map();
const byId = new Map(milestones.filter((m) => m.fm?.id).map((m) => [milestoneId(m.fm.id) ?? m.fm.id, m]));
const FORM = new RegExp(`^(${MILESTONE_ID})/accessibility$`);
for (const e of registry.filter((e) => e.id.startsWith(MILESTONE_PREFIX))) {
  const rest = e.id.slice(MILESTONE_PREFIX.length);
  const form = rest.match(FORM);
  const id = form ? milestoneId(form[1]) : null;
  const at = `${REGISTRY}#accessibility/entry:${id ?? excerpt(rest, 40)}`;
  const m = id && byId.get(id);
  const day = expiryProblem(e.expires, today);
  const screens = m && (fe.state === 'none' || buildsNoScreens(m.fm));
  const entry = (why) => add(at, `the entry ${excerpt(e.id, 80)} in ${REGISTRY} excuses nothing: ${why}`);
  if (!form) entry(`its id must be docs/milestones#<milestone id>/accessibility, one milestone per entry — fix the id, or remove the entry`);
  else if (!said(e.reason)) entry('it has no reason: — say what is not held yet, and what will hold it');
  else if (!said(e.owner)) entry('it has no owner: — name who answers for it');
  else if (day === 'none' || day === 'not-a-day') entry('its expires: is not a real day written yyyy-mm-dd — set the first day it no longer excuses');
  else if (!m) entry(`no milestone in docs/milestones/ has id ${id} — fix the id, or remove the entry`);
  else if (m.fm.status === 'shaping' || m.fm.status === 'killed') entry(`${id} is ${m.fm.status}, so no screens are being built under it — remove the entry`);
  else if (hasAccessibilityLine(m.md)) entry(`${id}'s Gate already says how its screens meet WCAG 2.2 AA — remove the entry`);
  else if (screens) entry(`${id} builds no screens (${fe.state === 'none' ? 'the frame says Front end: none' : 'screens: none'}) — remove the entry`);
  else if (day === 'expired') add(`${REGISTRY}#accessibility/overdue:${id}`, `the entry excusing ${id}'s accessibility line ended ${e.expires}: write the line under ${id}'s ## Gate (docs/milestones/${m.file}) with what holds it, and remove the entry; or set a later day, with its reason`);
  else {
    live.set(m, live.has(m) && live.get(m) > e.expires ? live.get(m) : e.expires);
    if (m.fm.status !== 'active') let_off(`${id}: accessibility excused until ${e.expires}`, REGISTRY);
  }
}

function buildsNoScreens(fm) {
  return typeof fm.screens === 'string' && fm.screens.trim().toLowerCase() === 'none';
}

const active = milestones.filter((m) => m.fm?.id && m.fm.status === 'active');
if (active.length && fe.state === 'unrecorded') {
  const why = {
    missing: 'has no Front end: line',
    several: 'has more than one Front end: line, so none is read',
    empty: 'has a Front end: line with nothing after it',
    placeholder: 'still holds the template placeholder on its Front end: line',
  }[fe.why];
  add(`${FRAME}#frontend/unrecorded`, `${FRAME} ${why}, and ${active.map((m) => m.fm.id).join(', ')} is active: write one line saying where people use the product — \`Front end: a web app\`, or \`Front end: none\` for an API or a tool with no screens`);
}

for (const m of active) {
  const id = m.fm.id;
  if (Object.hasOwn(m.fm, 'screens') && !buildsNoScreens(m.fm)) {
    const value = typeof m.fm.screens === 'string' && m.fm.screens.trim() ? `"${excerpt(m.fm.screens, 40)}"` : 'empty';
    add(where(m, 'screens/unknown'), `screens: is ${value}: write screens: none when ${id} builds no screens, or remove the field`);
  }
  if (fe.state === 'none') {
    let_off(`${id}: front end: none`, 'the frame');
    continue;
  }
  let design = null;
  if (Object.hasOwn(m.fm, 'design')) {
    const value = typeof m.fm.design === 'string' ? m.fm.design.trim() : '';
    const r = resolveDecision(decisions, value, { decided: true });
    if (r.ok) design = value;
    else {
      const why = { 'not-an-id': `"${excerpt(value, 40)}" is not a decision id (PD-<n> or D-<n>)`, missing: `${value} is not a heading in decisions.md`, open: `${value} is not marked decided or accepted in decisions.md` }[r.why];
      add(where(m, 'design/unresolved'), `design: ${why}: record the decision there, or remove the field`);
    }
  }
  if (fe.state !== 'screens') continue;
  if (buildsNoScreens(m.fm)) {
    let_off(`${id}: screens: none`, 'milestone frontmatter');
    continue;
  }
  if (m.fm.kind === 'skeleton') let_off(`${id}: kind: skeleton, no design item owed`, 'milestone frontmatter');
  else {
    const item = designBefore(m, milestones, ['closed', 'active']);
    if (item) satisfied.push(`${id} satisfied by the design item in ${item.id === id ? 'its own Contents' : item.id}, item ${item.position}`);
    else if (design) let_off(`${id}: design: ${design}`, 'milestone frontmatter');
    else if (!Object.hasOwn(m.fm, 'design')) {
      add(where(m, 'design/missing'), `no design item before ${id}'s screens: add a Contents item starting "Design:" as ${id}'s item 1, or below the items already started, saying what it delivers and who does it; or record in decisions.md why these screens are built without one, and name it in ${id}'s frontmatter as design: PD-<n>`);
    }
  }
  if (hasAccessibilityLine(m.md)) continue;
  if (live.has(m)) let_off(`${id}: accessibility excused until ${live.get(m)}`, REGISTRY);
  else {
    add(where(m, 'gate/accessibility'), `${id}'s Gate does not say how its screens meet WCAG 2.2 AA: add a bullet under ## Gate saying so, with what holds it (an automated accessibility check in CI, a keyboard and screen-reader pass in docs/qa/); or, where that cannot be held yet, a dated entry in ${REGISTRY} with id docs/milestones#${id}/accessibility, a reason and an owner, for the owner to approve`);
  }
}

const state = { screens: excerpt(fe.value ?? '', 60), none: 'none', unrecorded: 'not recorded', missing: `not read (no ${FRAME})` }[fe.state];
const sources = ['the frame', 'milestone frontmatter', REGISTRY].filter((s) => by.has(s));
const read = [frameMd === null ? null : 'the frame', `${milestones.length} milestone${milestones.length === 1 ? '' : 's'}`, registryWhy === MISSING ? null : REGISTRY].filter(Boolean);
process.exit(
  report({
    id: 'DS1',
    claim: 'every active milestone of a project with a front end has a design item before its screens, or names a decision for it, and a WCAG 2.2 AA line under its Gate, or a dated entry in ci/exceptions.yaml that has not ended; and every docs/milestones# entry excuses one milestone',
    scanned: (frameMd === null ? 0 : 1) + milestones.length + (registryWhy === MISSING ? 0 : 1),
    unit: [`documents (${read.join(', ')})`, `front end: ${state}`, ...satisfied].join(' · '),
    findings,
    exempted,
    exemptedBy: sources.length > 1 ? `${sources.slice(0, -1).join(', ')} and ${sources.at(-1)}` : sources[0] ?? 'nothing',
  })
);
