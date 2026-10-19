// Fit (F-12, dev/features/feature-fit.md §2): which feature docs are held to having a `## Fit` section, which of
// those lack it, and the counts, from one pass. The one place "feature docs held with no filled Fit" is counted:
// the check, sync and new-project call it, so they cannot disagree. It reads the working tree and never exits,
// so a program that is not a check can import it.
//
// Held. A feature doc (lib/feature-docs.mjs) is held when any of these is true:
//   status      its `status:` is present and, lower-cased, is not `draft` (`shipped`, or any word not known here)
//   unreadable  it has no frontmatter, or no `status:`: nothing says it is a draft. It counts whatever its Fit says
//   review      a review names it: a file in docs/reviews/ other than TEMPLATE.md whose `Reviewed:` line gives its
//               path, compared after normalising as R1 does (`./docs/features/x.md` is `docs/features/x.md`).
//               Any review counts, current or not
//   milestone   an `active` or `closed` milestone cites one of its F-ids in a Contents item
// A feature doc that is none of these is a draft not yet held: nothing is asked of it.
//
// Lacks Fit, each reason a finding id:
//   fit/missing             no `## Fit` heading; the first one in the file is the one read, as section() finds it
//   fit/unfilled/unreadable  a `<!--` in the Fit section or above it: the reader cannot tell a comment from text, so it
//                           cannot tell which labels and text GitHub shows. `line` is the first one's line
//   fit/unfilled/<label>    that label is absent, or its text is empty, or its text holds a placeholder
//   fit/unfilled/new        also when `Reuses:` says nothing is reused and `New:` says `none`
//   frontmatter/unreadable  the doc is held as `unreadable`
//
// A label line starts at the first column with exactly `Reuses:`, `Numbers:` or `New:`; one written with a list
// mark, emphasis or another case is not a label. The first line for each label is the one read, and its text runs
// to the next label line or the end of the section.

import { readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { docFrontmatter, isFeatureDoc, readFeatureFiles, unseen } from './feature-docs.mjs';
import { hasPlaceholder } from './frontmatter.mjs';
import { sectionLines } from './markdown.mjs';
import { citedFeatures, contents, readMilestones } from './milestones.mjs';
import { MISSING, notPlainFolder, readPlain, reviewProvenance } from './review-header.mjs';

const LABELS = { reuses: 'Reuses:', numbers: 'Numbers:', new: 'New:' };
const REVIEWS = 'docs/reviews';

// A heading inside the section, as GitHub shows one: an ATX heading of any level ends a label's text, and a line of
// text with a setext underline under it (`=`s, or two `-`s or more), a label line too, is a level-1 or level-2
// heading, which ends the section. A lone `-` under a line stays the empty list mark it was read as, and a numbered
// item or a quote line above an underline is read as a heading (Known limitations).
const ATX = /^ {0,3}#{1,6}(?:[ \t]|$)/;
const UNDERLINE = /^ {0,3}(?:=+|-{2,})[ \t]*$/;
const setextAt = (lines, i) => i + 1 < lines.length && lines[i].trim() !== '' && !/^\s*[-*+]\s/.test(lines[i]) && !UNDERLINE.test(lines[i]) && UNDERLINE.test(lines[i + 1]);
const FIT = /^#{2}\s+Fit\s*$/i; // as sectionLines() finds the section

// Comments. The reader cannot tell a comment GitHub hides from a `<!--` it shows as text (in code, in a fence, in
// frontmatter, in a list item or an HTML block), so a doc with any `<!--` in its Fit section or above it is
// unreadable: counted, never passed (the owner's call, 2026-10-19, after three review rounds found holes in closer
// readings). One after the section hides nothing of it. Every `<!--` is made inert at the same length before the
// section is found, so no reader takes it for a comment and the line numbers hold.

// The text of each label of a doc's Fit section, absent labels left out; `{ unreadable: <line> }` for a doc with a
// `<!--` in or above the section, the 1-based line of the first; null when the doc has no section.
function fitTexts(md) {
  const inert = md.replaceAll('<!--', '<!-\uE000');
  // The lines as written: section() trims its text, and an indented `Reuses:` on the first line is not a label.
  const body = sectionLines(inert, 'Fit', 2);
  if (body === null) return null;
  const all = inert.split(/\r?\n/);
  const start = all.findIndex((l) => FIT.test(l.trim()));
  const first = md.indexOf('<!--');
  if (first >= 0) {
    const line = md.slice(0, first).split('\n').length;
    if (line <= start + 1 + body.length) return { unreadable: line };
  }
  const texts = {};
  let cur = null;
  for (const [i, line] of body.entries()) {
    if (setextAt(body, i)) break;
    if (ATX.test(line)) {
      cur = null;
      continue;
    }
    const key = Object.keys(LABELS).find((k) => line.startsWith(LABELS[k]));
    if (key) {
      cur = key in texts ? null : key; // a label written twice: its first line is the one read
      if (cur) texts[key] = [line.slice(LABELS[key].length)];
    } else if (cur) texts[cur].push(line);
  }
  return Object.fromEntries(Object.entries(texts).map(([k, lines]) => [k, lines.join('\n')]));
}

// What says something: text with at least one letter or digit, in any script, once the characters that print as
// nothing are taken out (lib/feature-docs.mjs). The rule names what is filled, not what is empty, so a list mark
// alone, a line of punctuation and every character nobody sees say nothing without being listed. A value written
// as a symbol only reads as unfilled: counted, never passed. Nothing is folded: a list mark is looked for on the
// line as written, so a dash that opens a wrapped line stays part of the item above it. Markup GitHub shows as
// nothing, or as a character a person cannot tell from one, says nothing either: a character reference (`&nbsp;`,
// `&#8203;`), an HTML tag (`<br>`, `<i></i>`; an autolink `<https://…>` is not one), a link with no text `[](x)`,
// and a line that is a link reference definition (`[x]: url`). Each pattern stops at the next `<`, `(` or line end.
const MARKUP = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{0,31});|<\/?[A-Za-z][\w-]*(?:\s[^<>\n]*)?\/?>|\[\]\([^()\n]*\)/g;
const REFERENCE = /^ {0,3}\[[^\]\n]{1,999}\]:/;
// Markup is taken out inside a code span too, where GitHub shows it: the strict reading (Known limitations).
const shown = (s) => unseen(s).split('\n').filter((l) => !REFERENCE.test(l)).join('\n').replace(MARKUP, '');
const says = (s) => /[\p{L}\p{N}]/u.test(shown(s));
const word = (s) => unseen(s).replace(/`/g, '').trim().toLowerCase();
// A label's text as one short answer: its list mark, backticks and closing full stop removed, case ignored.
const answer = (text) => word(text.trimStart().replace(/^[-*]\s/, '')).replace(/\.$/, '').trim();
// What a label's text lists: the text on the label's own line, then each bullet or unmarked line, with the lines
// that continue it. A line that says nothing is no item and continues none.
function items(text) {
  const [own, ...rest] = text.split('\n');
  const out = says(own) ? [own.trim()] : [];
  for (const line of rest) {
    if (!says(line)) continue;
    // The mark alone is matched, anchored, and the rest is cut: a pattern that also spans the line retries on one
    // that holds a line separator.
    const mark = line.match(/^\s*[-*]\s/);
    if (mark || out.length === 0) out.push(line.slice(mark ? mark[0].length : 0).trim()); // unmarked text under the label is an item too
    else out[out.length - 1] += ` ${line.trim()}`;
  }
  return out;
}
// Whether a label's text still holds a template placeholder, read a line at a time and each line in one pass
// (hasPlaceholder). A line longer than any a person writes is read as holding one: a doc is other people's
// content, and a line nobody reads is never a filled one.
const LINE_MAX = 5000;
const placeholder = (text) => text.split('\n').some((line) => line.length > LINE_MAX || hasPlaceholder(line));

// How a doc's Fit reads: `reasons` it lacks Fit (none: filled), and for a filled one which short answers it gave.
function readFit(md) {
  const texts = fitTexts(md);
  if (texts?.unreadable) return { reasons: ['fit/unfilled/unreadable'], line: texts.unreadable, reusesNothing: false, noNumbers: false, nothingNew: false };
  if (texts === null) return { reasons: ['fit/missing'], reusesNothing: false, noNumbers: false, nothingNew: false };
  // The placeholder test and its length cap come first, so a line nobody reads is never read further.
  const unfilled = Object.keys(LABELS).filter((k) => texts[k] === undefined || placeholder(texts[k]) || !says(texts[k]));
  const reusesNothing = !unfilled.includes('reuses') && items(texts.reuses).every((i) => word(i).startsWith('nothing'));
  const nothingNew = !unfilled.includes('new') && answer(texts.new) === 'none';
  // A feature that neither reuses nor adds anything has not been described.
  if (reusesNothing && nothingNew) unfilled.push('new');
  const filled = unfilled.length === 0;
  return {
    reasons: unfilled.map((k) => `fit/unfilled/${k}`),
    reusesNothing: filled && reusesNothing,
    noNumbers: filled && answer(texts.numbers) === 'none shown',
    nothingNew: filled && nothingNew,
  };
}

// Each reviewed path, normalised → the review files that name it, and docs/reviews/ in `refused` when it is a link,
// sits under one or is not a folder: then none of it is read.
function reviewedPaths(root) {
  const named = new Map();
  const why = notPlainFolder(root, REVIEWS);
  if (why !== null) return { named, refused: why === MISSING ? [] : [REVIEWS] };
  for (const f of readdirSync(join(root, REVIEWS)).filter((x) => x.endsWith('.md') && x !== 'TEMPLATE.md').sort()) {
    const text = readPlain(root, `${REVIEWS}/${f}`);
    const path = text === null ? null : reviewProvenance(text).reviewed?.path;
    if (!path) continue;
    const key = posix.normalize(path);
    named.set(key, [...(named.get(key) ?? []), `${REVIEWS}/${f}`]);
  }
  return { named, refused: [] };
}

// Each F-<n> a running or finished milestone schedules → the milestone files that cite it, and the milestone
// inputs refused unread.
function scheduledFeatures(root) {
  const cited = new Map();
  const { milestones, refused } = readMilestones(root);
  for (const { file, md, fm } of milestones) {
    if (fm?.status !== 'active' && fm?.status !== 'closed') continue;
    for (const n of new Set(contents(md).flatMap((item) => citedFeatures(item.text)))) cited.set(n, [...(cited.get(n) ?? []), `docs/milestones/${file}`]);
  }
  // TEMPLATE.md and README.md feed no count: MS1 names them when refused, and the count does not.
  return { cited, refused: refused.filter((p) => !/\/(?:TEMPLATE|README)\.md$/.test(p)) };
}

/**
 * The Fit of every feature doc under `root`, from one pass:
 *   docs      each feature doc: `{ path, heldBy, reasons, commentLine, reusesNothing, noNumbers, nothingNew }`. `heldBy` lists
 *             `{ rule, by }` for each rule that holds it (empty: a draft not yet held); `reasons` are the finding
 *             ids above, for a held doc only
 *   count     held docs that lack Fit: the number the baseline holds. A doc counts once, whatever its reasons
 *   held      how many feature docs are held
 *   short     of the held docs with a filled Fit, how many reuse nothing, show no numbers and add nothing new
 *   drafts    the paths of the drafts not yet held that would lack Fit if they were
 *   others    the `*.md` files in the two folders that are not feature docs and no doc's companion:
 *             `{ path, why }`, `why` being `no-id` (no `F-<n>` heading) or `not-a-file` (a link, a folder, a file
 *             reached through a link); and each of the two folders that is a link, sits under one or is not a
 *             folder, `why` being `not-a-folder`: none of its docs is read
 *   files     how many `*.md` files were looked at
 *   unread    each input that is not read because it is a link, sits under one or is not what it should be: a
 *             feature folder (also in `others`), docs/reviews/, a milestone file or docs/milestones/ (MS1 reports
 *             these too). A review file that is a link is not in it: it is left out, and R1 names it.
 *             The count leaves out what they hold, so a caller that records or compares it refuses first
 */
export function fitCount(root) {
  const files = readFeatureFiles(root);
  const { named: reviewed, refused: reviewsRefused } = reviewedPaths(root);
  const { cited: scheduled, refused } = scheduledFeatures(root);
  const docs = [];
  const drafts = [];
  for (const f of files.filter(isFeatureDoc)) {
    // A byte-order mark is not part of the doc, and CR, LF and CRLF all end a line, as ID1 reads its headings.
    const md = f.md.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n');
    const fm = docFrontmatter(md);
    const status = typeof fm?.status === 'string' ? fm.status.trim().toLowerCase() : '';
    const heldBy = [
      ...(status === '' ? [{ rule: 'unreadable', by: fm ? 'no status' : 'no frontmatter' }] : status === 'draft' ? [] : [{ rule: 'status', by: status }]),
      ...(reviewed.get(f.path) ?? []).map((by) => ({ rule: 'review', by })),
      ...[...new Set(f.ns.flatMap((n) => scheduled.get(n) ?? []))].map((by) => ({ rule: 'milestone', by })),
    ];
    const fit = readFit(md);
    const held = heldBy.length > 0;
    if (!held && fit.reasons.length) drafts.push(f.path);
    const reasons = held ? [...(heldBy.some((h) => h.rule === 'unreadable') ? ['frontmatter/unreadable'] : []), ...fit.reasons] : [];
    docs.push({ path: f.path, heldBy, reasons, commentLine: fit.line ?? null, reusesNothing: fit.reusesNothing, noNumbers: fit.noNumbers, nothingNew: fit.nothingNew });
  }
  const held = docs.filter((d) => d.heldBy.length);
  const tally = (key) => held.filter((d) => d[key]).length;
  return {
    docs,
    count: held.filter((d) => d.reasons.length).length,
    held: held.length,
    short: { reusesNothing: tally('reusesNothing'), noNumbers: tally('noNumbers'), nothingNew: tally('nothingNew') },
    drafts,
    others: files.filter((f) => !f.regular || f.ns.length === 0).map((f) => ({ path: f.path, why: f.folder ? 'not-a-folder' : f.regular ? 'no-id' : 'not-a-file' })),
    files: files.length,
    unread: [...files.filter((f) => f.folder).map((f) => f.path), ...reviewsRefused, ...refused],
  };
}
