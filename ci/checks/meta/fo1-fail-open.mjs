#!/usr/bin/env node
// FO1 — fail-open lint.
//
// Reports every `continue-on-error` in the workflow corpus that is not excused
// by an unexpired entry in ci/exceptions.yaml, and every registry entry that is
// itself unsound.
//
// WHY: `continue-on-error` lets a job report success while it proves nothing — a test
// matrix can go silently blind behind it.
//
// WHY IT READS STRUCTURE, NOT LINES — two defects a naive version has:
//  1. An unanchored grep counts commented-out flags as fail-open steps. Any line match also counts the flag's
//     text inside a `run: |` script.
//  2. Exceptions keyed by `path:line` break on ordinary edits: move the line and the
//     exemption silently drops, or silently excuses a different step. Exceptions now key to
//     structure: `<file>#<job>` for a job-level flag, `<file>#<job>/<step-id>` for
//     a step. A step with no `id:` falls back to `name=<name>`, then `step[N]`.
//     Positional and duplicate ids are never accepted as exceptions — that would
//     be defect 2 again.
//
// A WORKFLOW FILE IS READ THROUGH lib/workflow-yaml.mjs, the one reader W1 uses too (D-033, #332): a pinned YAML
// parser, and what is refused in front of it. A key of a job or a step is a key of a mapping there, so the flag's
// text inside a `run: |` block, under `env:` or in a quoted text is never one. A file that reader refuses, or the
// parser cannot read, is unread: FO1 exits BROKEN (2) naming the file and the reader's fixed reason, since a
// file it cannot read may hold a flag it would never see. Wrong-and-silent is the outcome it must not have.
//
// `expires` is the first day an exception no longer applies, and must be a real yyyy-mm-dd day
// (lib/exceptions.mjs, the rule LK1 shares): `never` would sort after every year and excuse forever.
//
// The registry also holds LK1's entries (`pnpm-lock.yaml#<entry>`, a lockfile entry that may resolve from
// somewhere other than the registry). Those are LK1's to judge; FO1 skips them.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { today as localToday } from '../lib/clock.mjs';
import { expiryProblem, loadRegistry } from '../lib/exceptions.mjs';
import { ID_PREFIX } from '../lib/pnpm-lock.mjs';
import { report } from '../lib/report.mjs';
import { readWorkflow } from '../lib/workflow-yaml.mjs';

// A flag that is empty or `false` fails the job when the step does; anything else may not. The text is compared
// as written: a quoted `"false "`, or a block scalar holding `false`, is not YAML's boolean, so it is reported.
const failsClosed = (node) => node.kind === 'scalar' && !node.literal && /^(|false)$/i.test(node.value);
// The id, or the name, of a step, when it is one line of text. A `|` block, or a text over several lines, is no
// name, so the step is keyed by its position, as it always was; a `>-` or `>` block of one line is its text.
const textOf = (node) => (node?.kind === 'scalar' && !node.literal && !node.value.trim().includes('\n') ? node.value.trim() : '');

// Every `continue-on-error` that is a key of a job or of a step in one read workflow, as
// { job, step: { index, id, name } | null, line }. A shape of `jobs:` this does not read throws: the reader accepts
// YAML that is not a workflow GitHub runs, and a job it cannot see into may hold the flag.
function sitesOf(root, rel) {
  const sites = [];
  const jobs = root.entries.get('jobs');
  if (jobs === undefined) return sites;
  if (jobs.kind !== 'map' || jobs.flow) throw new Error(`${rel}: its jobs: is not a block of jobs FO1 can read`);
  const push = (job, step, flag) => {
    if (!flag || failsClosed(flag)) return;
    sites.push({ job, step, line: flag.kind === 'scalar' ? flag.line : null });
  };
  for (const [id, job] of jobs.entries) {
    if (job.kind !== 'map') throw new Error(`${rel}: job ${JSON.stringify(id)} is not a block of keys FO1 can read`);
    push(id, null, job.entries.get('continue-on-error'));
    const steps = job.entries.get('steps');
    if (steps === undefined) continue;
    if (steps.kind !== 'list') throw new Error(`${rel}: steps of job ${JSON.stringify(id)} is not a list FO1 can read`);
    steps.items.forEach((step, index) => {
      if (step.kind !== 'map') throw new Error(`${rel}: step ${index} of job ${JSON.stringify(id)} is not a block of keys FO1 can read`);
      push(id, { index, id: textOf(step.entries.get('id')) || null, name: textOf(step.entries.get('name')) || null }, step.entries.get('continue-on-error'));
    });
  }
  return sites;
}

function siteId(rel, s) {
  if (!s.step) return { id: `${rel}#${s.job}`, positional: false };
  if (s.step.id) return { id: `${rel}#${s.job}/${s.step.id}`, positional: false };
  if (s.step.name) return { id: `${rel}#${s.job}/name=${s.step.name}`, positional: false };
  return { id: `${rel}#${s.job}/step[${s.step.index}]`, positional: true };
}

function workflowFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) return workflowFiles(p);
    return /\.ya?ml$/.test(e) ? [p] : [];
  });
}

const root = process.argv[2] ?? '.';
const today = localToday(root);
const files = workflowFiles(join(root, '.github', 'workflows'));

const sites = [];
let broken = null;
for (const f of files) {
  const rel = relative(root, f);
  const w = readWorkflow(readFileSync(f, 'utf8'));
  if (w.unread) {
    broken = `${rel}: unread — ${w.unread}${w.hint ? `. ${w.hint}` : ''}`;
    break;
  }
  try {
    for (const s of sitesOf(w.root, rel)) sites.push({ ...siteId(rel, s), line: s.line });
  } catch (e) {
    broken = e.message;
    break;
  }
}

// Two steps sharing a name share an id; neither can be excused until one gets an `id:`.
const counts = new Map();
for (const s of sites) counts.set(s.id, (counts.get(s.id) ?? 0) + 1);
const seen = new Map();
for (const s of sites) {
  if (counts.get(s.id) < 2) continue;
  const n = (seen.get(s.id) ?? 0) + 1;
  seen.set(s.id, n);
  s.id = `${s.id}[dup${n}]`;
  s.positional = true;
  s.duplicate = true;
}

const findings = [];
const exempted = [];
const live = new Set();
const siteIds = new Set(sites.map((s) => s.id));

let registry = [];
try {
  registry = loadRegistry(join(root, 'ci', 'exceptions.yaml'));
} catch (e) {
  broken ??= e.message;
}

for (const e of registry) {
  if (e.id.startsWith(ID_PREFIX)) continue; // a lockfile entry's excuse: LK1 judges it
  const where = `registry:${e.id}`;
  const date = expiryProblem(e.expires, today);
  if (date === 'none') findings.push({ where, detail: 'the entry in ci/exceptions.yaml has no expires: date — every excuse must end' });
  else if (date === 'not-a-day') findings.push({ where, detail: 'the entry in ci/exceptions.yaml has an expires: that is not a real day written yyyy-mm-dd, which cannot be compared as ending — set it to a real future day, e.g. 2099-12-31' });
  else if (/\/step\[\d+\]$|\[dup\d+\]$/.test(e.id)) findings.push({ where, detail: 'the entry names its step by position, which moves on any edit — give the step an id: and key the entry to it' });
  else if (date === 'expired') findings.push({ where, detail: `the entry in ci/exceptions.yaml expired ${e.expires} (today or earlier ends an excuse) — fix the job or step, or set expires: to a real future day with a reason` });
  else if (!siteIds.has(e.id)) findings.push({ where, detail: 'the entry in ci/exceptions.yaml matches no continue-on-error step or job — remove it' });
  else live.add(e.id);
}

for (const s of sites) {
  if (live.has(s.id)) { exempted.push(s.id); continue; }
  const why = s.duplicate ? 'step name is not unique in its job — give it an id: before it can be excused'
    : s.positional ? 'step has no id or name — give it an id: before it can be excused'
    : 'a failure here would not fail CI';
  const next = s.duplicate || s.positional ? 'give the step an id: and add a dated entry for it' : `add a dated entry with id: ${s.id}`;
  findings.push({ where: s.id, detail: `continue-on-error with no entry in ci/exceptions.yaml (${why}${s.line === null ? '' : `; currently line ${s.line}`}) — remove it, or ${next}` });
}

process.exit(
  report({
    id: 'FO1',
    claim: 'every continue-on-error job and step is excused by a dated entry in ci/exceptions.yaml keyed to its id, and no entry is stale, expired, positional, undated or dated by anything but a real day',
    scanned: files.length,
    unit: 'workflow files',
    findings,
    exempted,
    exemptedBy: 'ci/exceptions.yaml',
    broken,
  })
);
