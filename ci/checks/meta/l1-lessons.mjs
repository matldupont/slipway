#!/usr/bin/env node
// L1 — lessons.
//
// A lesson is a rule that was paid for. Lessons enforced by nothing get re-learned. L1 makes every lesson state where it lives, and
// makes that statement checkable:
//
//   frontmatter/missing   no YAML frontmatter
//   frontmatter/unreadable a header line holds a lone carriage return, which readers can split two ways (#495)
//   field/missing         no `id`, `rule` or `enforcement.status`
//   status/unknown        not one of: check structural artifact prose declined
//   pointer/missing       every status except declined must say where the rule lives
//   pointer/unresolved    the pointer names a check, file or heading that does not exist —
//                         a lesson whose home was deleted is a lesson enforced by nothing
//   review/missing        prose and declined lessons must carry `review-by`
//   review/invalid        review-by is neither YYYY-MM-DD nor +<N>d
//   review/due            the review date has passed: a +<N>d lesson takes a review line in
//                         process/lesson-reviews.yaml; a project's own may instead be mechanised,
//                         extended with a reason, or deleted
//   trigger/missing       a declined lesson must name the event that should reopen it
//   anchor/missing        a relative date (+90d) with no process/anchor to count from
//   id/format             the id is not L-<n> (slipway's) or PL-<n> (the project's own, D-015)
//   id/duplicate
//   reviews/unreadable    process/lesson-reviews.yaml is there but cannot be read (the line is named)
//   reviews/invalid       a review line lacks its lesson, a real reviewed day or a reason
//   reviews/unknown-lesson a review line names a lesson id no lesson file has
//   reviews/fixed-date    a review line names a lesson whose review-by is a fixed date
//   reviews/future        a review line's day is after today
//   reviews/in-slipway    slipway's own copy holds a line: it ships to every project, where it would answer
//                         that project's reviews for it, so slipway answers a review in the lesson
//
// A review line (#554) is the project's answer to a +<N>d review, in a file the project owns, so answering one of
// slipway's lessons never edits it and D1 never sees drift. The clock then counts N days from the latest review day.
//
// Deferred work lives here as `declined` lessons, so the review clock is its detector.
// Deferral with nothing that fires is indistinguishable from closing it.
//
// Pointers: a check id (`w1`, `ms1` …), a repo path, or `path#Heading text` (the heading must
// start with that text). review-by: `YYYY-MM-DD`, or `+<N>d` counted from the date in
// process/anchor, which bootstrap sets to the project's start.
//
// In a project, a fixed date on one of slipway's lessons, as its manifest lists them and unedited, is slipway's
// clock: review/due skips it, and the report lists it as exempted (lib/lessons.mjs, #548). Slipway
// itself has no manifest, so every date fails there.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter, isUnreadable } from '../lib/frontmatter.mjs';
import { today as localToday } from '../lib/clock.mjs';
import { dueDate, latestReviews, readLessonReviews, RELATIVE, REVIEWS, reviewProblem, slipwayLessons, slipwaysDate } from '../lib/lessons.mjs';
import { isTemplate } from '../lib/manifest.mjs';
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

const root = process.argv[2] ?? '.';
const today = localToday(root);
const dir = join(root, 'process', 'lessons');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort() : [];
const anchorPath = join(root, 'process', 'anchor');
const anchor = existsSync(anchorPath) ? readFileSync(anchorPath, 'utf8').trim() : null;

const held = slipwayLessons(root);
const leftToSlipway = [];
const findings = [];
const seen = new Map();
const counts = Object.fromEntries([...STATUSES].map((s) => [s, 0]));

// Every lesson's frontmatter, read once: the review lines are judged against all of them before any date is.
const read = files.map((f) => ({ f, fm: frontmatter(readFileSync(join(dir, f), 'utf8')) }));
const lessons = new Map();
const slipways = new Set(); // the ids whose fixed date is slipway's here: a review line for one is inert
for (const { f, fm } of read) {
  if (!fm || isUnreadable(fm) || !fm.id || lessons.has(String(fm.id))) continue;
  const rb = typeof fm.enforcement === 'object' ? fm.enforcement?.['review-by'] : undefined;
  lessons.set(String(fm.id), rb);
  if (slipwaysDate(held, f, fm.id, rb)) slipways.add(String(fm.id));
}
// In slipway itself the file is the copy every project starts from, so it stays `reviews: []`; slipway moves a date
// in the lesson.
const inSlipway = isTemplate(root);
const answers = readLessonReviews(root);
const where = REVIEWS.split('/').pop();
if (inSlipway) for (const r of answers.reviews) findings.push({ where: `${where}#reviews/in-slipway`, detail: `line ${r.line}: slipway's copy ships to every project, where this line would answer that project's review: remove it, and move the lesson's review-by instead` });
if (answers.error) findings.push({ where: `${where}#reviews/unreadable`, detail: `${REVIEWS} cannot be read (${answers.error}), so no review in it counts: fix that line, in the shape process/lessons/README.md shows` });
for (const r of answers.reviews) {
  const problem = reviewProblem(r, lessons, today, slipways);
  if (problem) findings.push({ where: `${where}#${problem[0]}`, detail: `line ${r.line}: ${problem[1]}` });
}
const reviewed = inSlipway ? new Map() : latestReviews(answers.reviews, lessons, today, slipways);

for (const { f, fm } of read) {
  const add = (rule, detail) => findings.push({ where: `${f}#${rule}`, detail });
  if (!fm) { add('frontmatter/missing', 'no YAML frontmatter: start the file with the block shown in process/lessons/README.md'); continue; }
  if (isUnreadable(fm)) { add('frontmatter/unreadable', 'a line in its frontmatter holds a carriage return with no line feed after it, so readers disagree on its keys: save the file with LF or CRLF line endings'); continue; }

  const enf = typeof fm.enforcement === 'object' ? fm.enforcement : {};
  const status = enf.status;
  if (!fm.id || !fm.rule || !status) { add('field/missing', 'needs id, rule and enforcement.status'); continue; }
  if (!ID.test(String(fm.id))) add('id/format', `"${fm.id}" is not a lesson id: this project's own are PL-<n>, slipway's are L-<n> (process/lessons/README.md)`);
  if (seen.has(fm.id)) add('id/duplicate', `id ${fm.id} is also used by ${seen.get(fm.id)} — give one of them the next free number`);
  else seen.set(fm.id, f);
  if (!STATUSES.has(status)) { add('status/unknown', `"${status}" is not an enforcement status: check (a mechanism fires), structural (cannot happen after bootstrap), artifact (a template slot a check requires), prose (judgment, with a review date) or declined (deferred, with a trigger)`); continue; }
  counts[status]++;

  if (status !== 'declined') {
    if (!enf.pointer) add('pointer/missing', `a ${status} lesson must say where it lives`);
    else if (!resolves(root, enf.pointer)) add('pointer/unresolved', `"${enf.pointer}" does not exist: point enforcement.pointer at the check, file or heading that enforces it`);
  }
  if (status === 'declined' && !enf.trigger) add('trigger/missing', 'a declined lesson must name the event that reopens it');

  if (status === 'prose' || status === 'declined') {
    if (!enf['review-by']) {
      add('review/missing', `a ${status} lesson must carry review-by`);
    } else {
      const relative = RELATIVE.test(String(enf['review-by']));
      const last = relative ? reviewed.get(String(fm.id)) ?? null : null;
      const due = dueDate(String(enf['review-by']), anchor, last);
      if (due === 'invalid' && relative) add('review/invalid', `"${enf['review-by']}" counts from process/anchor, which is not a YYYY-MM-DD date: write the project's start date there`);
      else if (due === 'invalid') add('review/invalid', `"${enf['review-by']}" is neither YYYY-MM-DD nor +<N>d`);
      else if (due === null) add('anchor/missing', `"${enf['review-by']}" counts from the project's start date in process/anchor, which is missing — write that date there (YYYY-MM-DD), or a date in review-by`);
      else if (due <= today && slipwaysDate(held, f, fm.id, enf['review-by'])) leftToSlipway.push(fm.id);
      else if (due <= today && relative && !inSlipway) add('review/due', reviewDue(f, String(fm.id), due, last));
      else if (due <= today) add('review/due', `review was due ${due}: mechanise it, extend it with a reason, or delete it`);
    }
  }
}

// The review entry that answers a due +<N>d review, and, for a lesson the project may edit, the other ways out. A
// lesson slipway maintains here (held) is answered only by the entry: an edit to it is drift (D1). The entry's three
// keys go on their own lines, as process/lessons/README.md shows; a finding is one line, so it lists them.
function reviewDue(f, id, due, last) {
  const entry = `an entry with lesson: ${id}, reviewed: ${today} and reason: still holds (or what changed), each key on its own line as process/lessons/README.md shows`;
  const file = answers.exists ? `add to ${REVIEWS}` : `create ${REVIEWS} with a "reviews:" line, then add`;
  const since = last ? ` (last reviewed ${last})` : '';
  const edit = held.has(f) ? '' : '; or mechanise the lesson, extend it with a reason, or delete it';
  return `review was due ${due}${since}: ${file} ${entry}${edit}`;
}

const mix = Object.entries(counts).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(', ');
process.exit(
  report({
    id: 'L1',
    claim: `every lesson points at a home that exists, and none is past its review date (${mix || 'none'})${leftToSlipway.length ? ', bar the ones exempted above, which are past slipway\'s own date' : ''}`,
    scanned: files.length,
    unit: 'lessons',
    findings,
    exempted: leftToSlipway,
    exemptedBy: "slipway's own review date, which a sync moves",
  })
);
