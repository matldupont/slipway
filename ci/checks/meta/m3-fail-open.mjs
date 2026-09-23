#!/usr/bin/env node
// M3 — fail-open lint.
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
// ZERO DEPENDENCIES, SO THE PARSER IS A DECLARED SUBSET: block mappings, `- `
// step lists, block scalars (`|`, `>`), comments. YAML anchors, aliases, merge
// keys, flow-style jobs or steps, tab indentation and multi-document files exit
// BROKEN (2) instead of guessing. Wrong-and-silent is the outcome it must not have.
//
// `expires` is the first day an exception no longer applies.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { today as localToday } from '../lib/clock.mjs';
import { report } from '../lib/report.mjs';
import { readList, scalar, skippable } from '../lib/yaml-list.mjs';

const KEY = /^([A-Za-z0-9_.-]+|"[^"]*"|'[^']*')\s*:(?:\s+(.*))?$/;
const indentOf = (s) => s.length - s.trimStart().length;
const opensBlockScalar = (v = '') => /^[|>][+-]?[0-9]?[+-]?\s*(#.*)?$/.test(v.trim());
const unsupported = (t) =>
  /(^|:\s|-\s)[&*][A-Za-z0-9_-]+(\s|$)/.test(t) || /^<<\s*:/.test(t) || /^-\s*[{[]/.test(t) || /^steps\s*:\s*\[/.test(t);

function scanWorkflow(src, rel) {
  const lines = src.split(/\r?\n/);
  const sites = [];
  let inJobs = false;
  let jobIndent = -1, job = null, jobChildIndent = -1;
  let inSteps = false, dashIndent = -1, step = null, stepKeyIndent = -1, stepIndex = -1;
  let blockUntil = -1;

  const fail = (why, i) => { throw new Error(`${rel}:${i + 1}: unsupported — ${why}`); };
  const watch = (value, ind) => { if (opensBlockScalar(value)) blockUntil = ind; };
  const push = (s) => {
    const v = scalar(s.value).toLowerCase();
    if (v !== '' && v !== 'false') sites.push(s);
  };
  const flush = () => {
    if (step) for (const c of step.coe) push({ job: job.id, step, line: c.line, value: c.value });
    step = null;
  };
  const stepKey = (t, i, ind) => {
    const kv = t.match(KEY);
    if (!kv) return;
    const key = scalar(kv[1]);
    if (key === 'id') step.id = scalar(kv[2]);
    else if (key === 'name' && !opensBlockScalar(kv[2])) step.name = scalar(kv[2]);
    else if (key === 'continue-on-error') step.coe.push({ line: i + 1, value: kv[2] });
    watch(kv[2], ind);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (blockUntil >= 0) {
      if (skippable(raw) || indentOf(raw) > blockUntil) continue;
      blockUntil = -1;
    }
    if (skippable(raw)) continue;
    if (/^ *\t/.test(raw)) fail('tab indentation', i);
    const ind = indentOf(raw);
    const text = raw.slice(ind);

    if (ind === 0) {
      flush(); job = null; inSteps = false;
      if (/^---/.test(text)) {
        if (lines.slice(0, i).some((l) => !skippable(l))) fail('multi-document YAML', i);
        continue;
      }
      const kv = text.match(KEY);
      inJobs = !!kv && scalar(kv[1]) === 'jobs';
      if (inJobs && scalar(kv[2]) !== '') fail('flow-style jobs', i);
      if (kv) watch(kv[2], 0);
      continue;
    }
    if (!inJobs) {
      const kv = text.replace(/^-\s+/, '').match(KEY);
      if (kv) watch(kv[2], ind);
      continue;
    }
    if (unsupported(text)) fail('YAML anchor, alias, merge key or flow collection', i);

    if (jobIndent < 0) jobIndent = ind;
    if (ind < jobIndent) fail('dedent inside jobs', i);
    if (ind === jobIndent) {
      flush(); inSteps = false;
      const kv = text.match(KEY);
      if (!kv || scalar(kv[2]) !== '') fail('a job must be a block mapping', i);
      job = { id: scalar(kv[1]) };
      jobChildIndent = -1;
      continue;
    }
    if (jobChildIndent < 0) jobChildIndent = ind;
    if (ind === jobChildIndent) {
      flush(); inSteps = false;
      const kv = text.match(KEY);
      if (!kv) continue;
      const key = scalar(kv[1]);
      if (key === 'continue-on-error') push({ job: job.id, step: null, line: i + 1, value: kv[2] });
      if (key === 'steps') { inSteps = true; dashIndent = -1; stepIndex = -1; }
      watch(kv[2], ind);
      continue;
    }
    if (!inSteps) {
      const kv = text.replace(/^-\s+/, '').match(KEY);
      if (kv) watch(kv[2], ind);
      continue;
    }
    const isDash = /^-(\s|$)/.test(text);
    if (dashIndent < 0 && isDash) dashIndent = ind;
    if (isDash && ind === dashIndent) {
      flush(); stepIndex++;
      step = { index: stepIndex, id: null, name: null, coe: [] };
      const rest = text.replace(/^-\s*/, '');
      stepKeyIndent = ind + (text.length - rest.length);
      if (rest) stepKey(rest, i, stepKeyIndent);
      continue;
    }
    if (step && ind === stepKeyIndent) { stepKey(text, i, ind); continue; }
    const kv = text.replace(/^-\s+/, '').match(KEY);
    if (kv) watch(kv[2], ind);
  }
  flush();
  return sites;
}

function siteId(rel, s) {
  if (!s.step) return { id: `${rel}#${s.job}`, positional: false };
  if (s.step.id) return { id: `${rel}#${s.job}/${s.step.id}`, positional: false };
  if (s.step.name) return { id: `${rel}#${s.job}/name=${s.step.name}`, positional: false };
  return { id: `${rel}#${s.job}/step[${s.step.index}]`, positional: true };
}

function loadRegistry(path) {
  if (!existsSync(path)) return [];
  return readList(readFileSync(path, 'utf8'), ['id', 'expires', 'reason', 'owner']);
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
  try {
    for (const s of scanWorkflow(readFileSync(f, 'utf8'), rel)) sites.push({ ...siteId(rel, s), line: s.line });
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

for (const e of loadRegistry(join(root, 'ci', 'exceptions.yaml'))) {
  const where = `registry:${e.id}`;
  if (!e.expires) findings.push({ where, detail: 'exception has no expires — every exemption must be a clock' });
  else if (/\/step\[\d+\]$|\[dup\d+\]$/.test(e.id)) findings.push({ where, detail: 'exception keys a positional or duplicate step, which moves on any edit — give the step an id:' });
  else if (e.expires <= today) findings.push({ where, detail: `exception expired ${e.expires}` });
  else if (!siteIds.has(e.id)) findings.push({ where, detail: 'exception matches no fail-open site — stale entry' });
  else live.add(e.id);
}

for (const s of sites) {
  if (live.has(s.id)) { exempted.push(s.id); continue; }
  const why = s.duplicate ? 'step name is not unique in its job — give it an id: before it can be excused'
    : s.positional ? 'step has no id or name — give it an id: before it can be excused'
    : 'fail-open';
  findings.push({ where: s.id, detail: `unregistered continue-on-error (${why}; currently line ${s.line})` });
}

process.exit(
  report({
    id: 'M3',
    claim: 'every fail-open job and step is excused by a structurally keyed, unexpired exception, and no registry entry is stale, expired, positional or undated',
    scanned: files.length,
    unit: 'workflow files',
    findings,
    exempted,
    broken,
  })
);
