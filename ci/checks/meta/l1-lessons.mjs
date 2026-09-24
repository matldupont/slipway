#!/usr/bin/env node
// L1 — lessons.
//
// A lesson is a rule that was paid for. Lessons enforced by nothing get re-learned. L1 makes every lesson state where it lives, and
// makes that statement checkable:
//
//   frontmatter/missing   no YAML frontmatter
//   field/missing         no `id`, `rule` or `enforcement.status`
//   status/unknown        not one of: check structural artifact prose declined
//   pointer/missing       every status except declined must say where the rule lives
//   pointer/unresolved    the pointer names a check, file or heading that does not exist —
//                         a lesson whose home was deleted is a lesson enforced by nothing
//   review/missing        prose and declined lessons must carry `review-by`
//   review/invalid        review-by is neither YYYY-MM-DD nor +<N>d
//   review/due            the review date has passed: mechanise it, extend it with a reason,
//                         or delete it
//   trigger/missing       a declined lesson must name the event that should reopen it
//   anchor/missing        a relative date (+90d) with no process/anchor to count from
//   id/format             the id is not L-<n> (slipway's) or PL-<n> (the project's own, D-015)
//   id/duplicate
//
// Deferred work lives here as `declined` lessons, so the review clock is its detector.
// Deferral with nothing that fires is indistinguishable from closing it.
//
// Pointers: a check id (`m1`, `ms1` …), a repo path, or `path#Heading text` (the heading must
// start with that text). review-by: `YYYY-MM-DD`, or `+<N>d` counted from the date in
// process/anchor, which bootstrap sets to the project's start.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from '../lib/frontmatter.mjs';
import { today as localToday } from '../lib/clock.mjs';
import { report } from '../lib/report.mjs';

const STATUSES = new Set(['check', 'structural', 'artifact', 'prose', 'declined']);
// Slipway's lessons are L-<n>; a project's own are PL-<n>, so a sync never renumbers either (D-015).
const ID = /^P?L-\d+$/;
function resolves(root, pointer) {
  if (/^[a-z]{1,3}\d+$/.test(pointer)) {
    const dir = join(root, 'ci', 'checks', 'meta');
    return existsSync(dir) && readdirSync(dir).some((f) => f.startsWith(`${pointer}-`) && f.endsWith('.mjs'));
  }
  const hash = pointer.indexOf('#');
  const path = hash < 0 ? pointer : pointer.slice(0, hash);
  const anchor = hash < 0 ? '' : pointer.slice(hash + 1).trim();
  const file = join(root, path);
  if (!existsSync(file)) return false;
  if (!anchor) return true;
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .some((l) => /^#{1,6}\s/.test(l) && l.replace(/^#{1,6}\s+/, '').startsWith(anchor));
}

function dueDate(value, anchor) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = value.match(/^\+(\d+)d$/);
  if (!m) return 'invalid';
  if (!anchor) return null;
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(m[1]));
  return d.toISOString().slice(0, 10);
}

const root = process.argv[2] ?? '.';
const today = localToday(root);
const dir = join(root, 'process', 'lessons');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort() : [];
const anchorPath = join(root, 'process', 'anchor');
const anchor = existsSync(anchorPath) ? readFileSync(anchorPath, 'utf8').trim() : null;

const findings = [];
const seen = new Map();
const counts = Object.fromEntries([...STATUSES].map((s) => [s, 0]));

for (const f of files) {
  const add = (rule, detail) => findings.push({ where: `${f}#${rule}`, detail });
  const fm = frontmatter(readFileSync(join(dir, f), 'utf8'));
  if (!fm) { add('frontmatter/missing', 'no YAML frontmatter'); continue; }

  const enf = typeof fm.enforcement === 'object' ? fm.enforcement : {};
  const status = enf.status;
  if (!fm.id || !fm.rule || !status) { add('field/missing', 'needs id, rule and enforcement.status'); continue; }
  if (!ID.test(String(fm.id))) add('id/format', `"${fm.id}" is neither L-<n> (slipway's) nor PL-<n> (this project's own)`);
  if (seen.has(fm.id)) add('id/duplicate', `id ${fm.id} is also used by ${seen.get(fm.id)}`);
  else seen.set(fm.id, f);
  if (!STATUSES.has(status)) { add('status/unknown', `"${status}" is not one of ${[...STATUSES].join(', ')}`); continue; }
  counts[status]++;

  if (status !== 'declined') {
    if (!enf.pointer) add('pointer/missing', `a ${status} lesson must say where it lives`);
    else if (!resolves(root, enf.pointer)) add('pointer/unresolved', `"${enf.pointer}" does not exist`);
  }
  if (status === 'declined' && !enf.trigger) add('trigger/missing', 'a declined lesson must name the event that reopens it');

  if (status === 'prose' || status === 'declined') {
    if (!enf['review-by']) {
      add('review/missing', `a ${status} lesson must carry review-by`);
    } else {
      const due = dueDate(enf['review-by'], anchor);
      if (due === 'invalid') add('review/invalid', `"${enf['review-by']}" is neither YYYY-MM-DD nor +<N>d`);
      else if (due === null) add('anchor/missing', `"${enf['review-by']}" is relative, but process/anchor does not exist`);
      else if (due <= today) add('review/due', `review was due ${due}: mechanise it, extend it with a reason, or delete it`);
    }
  }
}

const mix = Object.entries(counts).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(', ');
process.exit(
  report({
    id: 'L1',
    claim: `every lesson points at a home that exists, and none is past its review date (${mix || 'none'})`,
    scanned: files.length,
    unit: 'lessons',
    findings,
  })
);
