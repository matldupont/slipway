#!/usr/bin/env node
// F2 — feature fit (F-12, dev/features/feature-fit.md §4).
//
// A feature doc says, in its `## Fit` section, which existing patterns it reuses, where each number it shows is
// calculated, and what it adds that nothing existing does. F2 holds a doc to that once it is shipped, reviewed or
// scheduled (lib/fit.mjs says which docs are held and which lack Fit), and compares how many held docs lack it
// with the count committed in ci/baselines.json under `feature-fit`, by the ratchet's rule (lib/ratchet.mjs):
//
//   above the count      exit 1 — one finding per reason for every counted doc, the ones the count already covers
//                        included: the check cannot tell which doc is the new one
//   equal                exit 0 — each counted doc is a warning, so the docs behind the number show on every run
//   below                exit 0, the same warnings, and a line saying to lock the improvement in with --update
//   no count recorded    exit 2 BROKEN — sync records it in a project; --update records it by hand
//
//   <doc>#fit/missing             no `## Fit` section
//   <doc>#fit/unfilled/unreadable  a `<!--` in the Fit section or above it; the finding names the first one's line
//   <doc>#fit/unfilled/<label>    `Reuses:`, `Numbers:` or `New:` is absent, empty or still the template's text
//   <doc>#frontmatter/unreadable  no `status:` line, or one with nothing after it, or a header readable two ways (#495), so
//                                 nothing says the doc is a draft
//
// A feature folder, docs/milestones/ or a milestone file that is a link, sits under one or is not a plain folder or
// file is BROKEN: it is never read, so the count would leave out what it holds (MS1 and ID1 name these too).
//
// Every run that is not BROKEN also warns of each file in the two folders that is not a feature doc
// (`#not-a-feature-doc`), and of each draft nothing holds yet that has no filled Fit (`#fit/draft`): it is not
// counted, and will be from its first review, its schedule or its ship.
//
//   node ci/checks/meta/f2-feature-fit.mjs <root> [--update]
//
// `--update` writes the current count when it is at or below the recorded one, or when none is recorded, and
// refuses to raise one. Runs whatever the PRD's status: F1 waits for the PRD and Fit does not.
//
// WHY: a feature can work and be wanted and still be a second way of doing what the product already does. The
// duplication ratchet sees copied lines, not a second calculation of one number or a second kind of surface.
// F2 holds that the question was answered in the doc, not that the answer is true: a reviewer reads that.

import { dirname } from 'node:path';
import { FEATURE_DIRS } from '../lib/feature-docs.mjs';
import { fitCount } from '../lib/fit.mjs';
import { BASELINES, compare, FIT_KEY, isCount, readBaselines, writeBaselines } from '../lib/ratchet.mjs';
import { codeSpan, excerpt, report } from '../lib/report.mjs';
import { MISSING, notPlainFile, notPlainFolder } from '../lib/review-header.mjs';

const args = process.argv.slice(2);
const update = args.includes('--update');
const root = args.find((a) => !a.startsWith('--')) ?? '.';
const SELF = 'node ci/checks/meta/f2-feature-fit.mjs . --update';
const FOLDERS = FEATURE_DIRS.map((d) => `${d}/`).join(' and ');
const UNIT = `files (${BASELINES}, and each *.md in ${FOLDERS})`;

const fit = fitCount(root);
const scanned = 1 + fit.files;
const broken = (why) => process.exit(report({ id: 'F2', claim: '', scanned, unit: UNIT, broken: why }));

// The count is read from, and written to, a plain file of the repository and nothing else: a link or a folder at
// that path, or under a `ci/` that is a link (to anything or nothing) or not a folder, is refused before either,
// as sync refuses a link or a folder at that path for its own write.
const notPlain = notPlainFile(root, BASELINES);
const folder = dirname(BASELINES);
const folderWhy = notPlainFolder(root, folder); // no ci/ folder yet: --update makes it
if (folderWhy !== null && folderWhy !== MISSING) broken(`${BASELINES} is under a ${folder}/ that is a link or not a folder, so it is neither read nor written — make ${folder}/ a plain folder`);
if (notPlain !== null && notPlain !== MISSING) broken(`${BASELINES} ${notPlain}, so it is neither read nor written — make it a plain file`);
if (fit.unread.length) {
  broken(`${fit.unread.map(codeSpan).join(', ')} ${fit.unread.length === 1 ? 'is' : 'are'} a link, under one, or not a plain folder or file, so F2 does not read ${fit.unread.length === 1 ? 'it' : 'them'} and cannot count the docs — make each a plain folder or file`);
}
let baselines;
try {
  baselines = readBaselines(root);
} catch (e) {
  // By what went wrong, never by the error's text: a parser's message quotes the file it could not read.
  broken(e.code ? `${BASELINES} cannot be read (${e.code})` : `${BASELINES} is not a JSON object of counts`);
}
const base = baselines[FIT_KEY];
const outcome = compare(fit.count, base, isCount);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

if (update) {
  if (outcome === 'above') {
    process.exit(report({ id: 'F2', claim: '', scanned, unit: UNIT, findings: [{ where: FIT_KEY, detail: `--update refuses to raise the count (${base} → ${fit.count}); fill in the Fit section of the docs the check names instead` }] }));
  }
  writeBaselines(root, { ...baselines, [FIT_KEY]: fit.count });
  process.exit(report({ id: 'F2', claim: `${FIT_KEY} recorded at ${fit.count} in ${BASELINES}`, scanned, unit: UNIT }));
}
if (outcome === 'none') broken(`${BASELINES} has no ${FIT_KEY} count — a sync records it in a project; to record it by hand, run ${SELF}`);

// Why a doc is held, in the project's words: its own status, the reviews that name it, the milestones that cite it.
function held(doc) {
  const by = (rule) => doc.heldBy.filter((h) => h.rule === rule).map((h) => h.by);
  const named = (files) => `${files[0]}${files.length > 1 ? ` and ${files.length - 1} more` : ''}`;
  const why = [];
  for (const status of by('status')) why.push(status === 'shipped' ? 'is shipped' : `has the status "${excerpt(status, 30)}", which is not draft`);
  if (by('unreadable').includes('unreadable header')) why.push('has a header line holding a carriage return with no line feed after it, which readers split two ways');
  else if (by('unreadable').length) why.push('has no readable status line');
  if (by('review').length) why.push(`is reviewed (${named(by('review'))})`);
  if (by('milestone').length) why.push(`is scheduled (${named(by('milestone'))})`);
  return why.join(', ');
}
const NEXT = {
  'fit/missing': 'has no `## Fit` section — add it after `## Problem`, with `Reuses:`, `Numbers:` and `New:` filled in',
  'fit/unfilled/unreadable': (d) => `line ${d.commentLine} holds a \`<!--\`, in its Fit section or above it, so what GitHub shows of its Fit cannot be told — remove the comment, or move the text that quotes \`<!--\` below the Fit section`,
  'fit/unfilled/reuses': 'its Fit has no filled `Reuses:` line — name each pattern or helper it reuses and where it lives, or `nothing` with what was searched',
  'fit/unfilled/numbers': 'its Fit has no filled `Numbers:` line — say where each number it shows is calculated, or `none shown`',
  'fit/unfilled/new': 'its Fit has no filled `New:` line — say what it adds that nothing existing does and why, or `none` (not beside `nothing` under `Reuses:`: such a doc describes no feature)',
  'frontmatter/unreadable': (d) => (d.heldBy.some((h) => h.by === 'unreadable header')
    ? 'nothing says it is a draft, so it is counted whatever its Fit says — save the file with LF or CRLF line endings, so its header reads one way'
    : 'nothing says it is a draft, so it is counted whatever its Fit says — give its frontmatter a `status:` line with its status after it (`draft`, `shipped`)'),
};
const counted = fit.docs
  .filter((d) => d.reasons.length)
  .flatMap((d) => d.reasons.map((reason) => ({ where: `${d.path}#${reason}`, detail: `${codeSpan(d.path)} ${held(d)} and ${typeof NEXT[reason] === 'function' ? NEXT[reason](d) : NEXT[reason]}` })));

const warnings = [
  ...fit.others.map((o) => ({
    where: `${o.path}#not-a-feature-doc`,
    detail: o.why === 'no-id' ? `${codeSpan(o.path)} is not a feature doc (no \`F-<n>\` title), so its Fit is not checked` : `${codeSpan(o.path)} is a link or a folder, not a file, so it is not read and its Fit is not checked`,
  })),
  ...fit.drafts.map((path) => ({ where: `${path}#fit/draft`, detail: `${codeSpan(path)} is a draft nothing holds yet and has no filled Fit: not counted until it is reviewed, scheduled or shipped` })),
  ...(outcome === 'above' ? [] : counted),
];

if (outcome === 'below') process.stdout.write(`F2: ${FIT_KEY} improved ${base} → ${fit.count}; run ${SELF} to lock it in\n`);

const rest = fit.held - fit.count;
const claim =
  fit.held === 0
    ? `no feature doc is held yet (${plural(fit.docs.length, 'feature doc')}, each a draft nothing holds; the count is ${fit.count} against ${base}; ${plural(fit.others.length, 'file')} not a feature doc; read ${FOLDERS})`
    : `${plural(fit.held, 'feature doc')} held (shipped, reviewed or scheduled), ${fit.count} with no filled Fit, not above the recorded ${base}; of the other ${rest}, ${fit.short.reusesNothing} reuse nothing, ${fit.short.noNumbers} show no numbers and ${fit.short.nothingNew} add nothing new; ${plural(fit.others.length, 'file')} not a feature doc; read ${FOLDERS}`;

process.exit(report({ id: 'F2', claim, scanned, unit: UNIT, findings: outcome === 'above' ? counted : [], warnings }));
