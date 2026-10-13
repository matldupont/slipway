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
//   fit/unfilled/<label>    that label is absent, or its text is empty, or its text holds a placeholder
//   fit/unfilled/new        also when `Reuses:` says nothing is reused and `New:` says `none`
//   frontmatter/unreadable  the doc is held as `unreadable`
//
// A label line starts at the first column with exactly `Reuses:`, `Numbers:` or `New:`; one written with a list
// mark, emphasis or another case is not a label. The first line for each label is the one read, and its text runs
// to the next label line or the end of the section.

import { existsSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { docFrontmatter, isFeatureDoc, readFeatureFiles } from './feature-docs.mjs';
import { PLACEHOLDER } from './frontmatter.mjs';
import { section } from './markdown.mjs';
import { citedFeatures, contents, readMilestones } from './milestones.mjs';
import { readPlain, reviewProvenance } from './review-header.mjs';

const LABELS = { reuses: 'Reuses:', numbers: 'Numbers:', new: 'New:' };
const REVIEWS = 'docs/reviews';

// The text of each label of a doc's Fit section, absent labels left out; null when the doc has no section.
function fitTexts(md) {
  const body = section(md, 'Fit', 2);
  if (body === null) return null;
  const texts = {};
  let cur = null;
  for (const line of body.split(/\r?\n/)) {
    const key = Object.keys(LABELS).find((k) => line.startsWith(LABELS[k]));
    if (key) {
      cur = key in texts ? null : key; // a label written twice: its first line is the one read
      if (cur) texts[key] = [line.slice(LABELS[key].length)];
    } else if (cur) texts[cur].push(line);
  }
  return Object.fromEntries(Object.entries(texts).map(([k, lines]) => [k, lines.join('\n')]));
}

const word = (s) => s.replace(/`/g, '').trim().toLowerCase();
// A label's text as one short answer: its list mark, backticks and closing full stop removed, case ignored.
const answer = (text) => word(text.replace(/^\s*[-*]\s+/, '')).replace(/\.$/, '').trim();
// What a label's text lists: the text on the label's own line, then each bullet with the lines that continue it.
function items(text) {
  const [own, ...rest] = text.split('\n');
  const out = own.trim() ? [own] : [];
  let open = out.length > 0;
  for (const line of rest) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) out.push(bullet[1]);
    else if (!line.trim()) continue;
    else if (open) out[out.length - 1] += ` ${line.trim()}`;
    else out.push(line.trim()); // text under the label with no list mark is an item too
    open = true;
  }
  return out;
}
const empty = (text) => text.replace(/[\s*-]/g, '') === '';
// Whether a label's text still holds a template placeholder, read a line at a time. A line longer than any a
// person writes is read as holding one: PLACEHOLDER retries from every `<…` on a line that never closes it, and
// a doc is other people's content, so its cost is bounded here and an unreadable line is never a filled one.
const LINE_MAX = 5000;
const placeholder = (text) => text.split('\n').some((line) => line.length > LINE_MAX || PLACEHOLDER.test(line));

// How a doc's Fit reads: `reasons` it lacks Fit (none: filled), and for a filled one which short answers it gave.
function readFit(md) {
  const texts = fitTexts(md);
  if (texts === null) return { reasons: ['fit/missing'], reusesNothing: false, noNumbers: false, nothingNew: false };
  const unfilled = Object.keys(LABELS).filter((k) => texts[k] === undefined || empty(texts[k]) || placeholder(texts[k]));
  const listed = items(texts.reuses ?? '');
  const reusesNothing = !unfilled.includes('reuses') && listed.length > 0 && listed.every((i) => word(i).startsWith('nothing'));
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

// Each reviewed path, normalised → the review files that name it.
function reviewedPaths(root) {
  const named = new Map();
  if (!existsSync(join(root, REVIEWS))) return named;
  for (const f of readdirSync(join(root, REVIEWS)).filter((x) => x.endsWith('.md') && x !== 'TEMPLATE.md').sort()) {
    const text = readPlain(root, `${REVIEWS}/${f}`);
    const path = text === null ? null : reviewProvenance(text).reviewed?.path;
    if (!path) continue;
    const key = posix.normalize(path);
    named.set(key, [...(named.get(key) ?? []), `${REVIEWS}/${f}`]);
  }
  return named;
}

// Each F-<n> a running or finished milestone schedules → the milestone files that cite it.
function scheduledFeatures(root) {
  const cited = new Map();
  for (const { file, md, fm } of readMilestones(root).milestones) {
    if (fm?.status !== 'active' && fm?.status !== 'closed') continue;
    for (const n of new Set(contents(md).flatMap((item) => citedFeatures(item.text)))) cited.set(n, [...(cited.get(n) ?? []), `docs/milestones/${file}`]);
  }
  return cited;
}

/**
 * The Fit of every feature doc under `root`, from one pass:
 *   docs      each feature doc: `{ path, heldBy, reasons, reusesNothing, noNumbers, nothingNew }`. `heldBy` lists
 *             `{ rule, by }` for each rule that holds it (empty: a draft not yet held); `reasons` are the finding
 *             ids above, for a held doc only
 *   count     held docs that lack Fit: the number the baseline holds. A doc counts once, whatever its reasons
 *   held      how many feature docs are held
 *   short     of the held docs with a filled Fit, how many reuse nothing, show no numbers and add nothing new
 *   drafts    the paths of the drafts not yet held that would lack Fit if they were
 *   others    the `*.md` files in the two folders that are not feature docs and no doc's companion:
 *             `{ path, why }`, `why` being `no-id` (no `F-<n>` heading) or `not-a-file` (a link, a folder)
 *   files     how many `*.md` files were looked at
 */
export function fitCount(root) {
  const files = readFeatureFiles(root);
  const reviewed = reviewedPaths(root);
  const scheduled = scheduledFeatures(root);
  const docs = [];
  const drafts = [];
  for (const f of files.filter(isFeatureDoc)) {
    // As ID1 reads a doc: a byte-order mark is not part of it, and CR, LF and CRLF all end a line.
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
    docs.push({ path: f.path, heldBy, reasons, reusesNothing: fit.reusesNothing, noNumbers: fit.noNumbers, nothingNew: fit.nothingNew });
  }
  const held = docs.filter((d) => d.heldBy.length);
  const tally = (key) => held.filter((d) => d[key]).length;
  return {
    docs,
    count: held.filter((d) => d.reasons.length).length,
    held: held.length,
    short: { reusesNothing: tally('reusesNothing'), noNumbers: tally('noNumbers'), nothingNew: tally('nothingNew') },
    drafts,
    others: files.filter((f) => !f.regular || f.ns.length === 0).map((f) => ({ path: f.path, why: f.regular ? 'no-id' : 'not-a-file' })),
    files: files.length,
  };
}
