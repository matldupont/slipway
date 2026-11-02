// What the decisions record still asks of someone, as `pnpm status` prints it under Needs attention (F-15 §6,
// dev/features/owed-decisions.md): an Amends: nothing cites yet, a condition whose event has happened, the conditions
// status cannot read, condition lines that sit under no decision, and the folders the reader could not see. Every line
// starts with who acts in a leading parenthesis and then the action, and ends with two sentences: what it blocks and what
// it waits on ("It blocks …. It waits on …."), so a plan of the whole list can be built from the lines alone (#445). The
// wording follows process/writing.md: an id comes after its meaning, in brackets.
//
// decisionThings() returns each as an owed thing (owed.mjs, F-17 §1): its `text` is the line less its leading who and its
// two closing sentences, which form() rebuilds from `blocks` and `waits` to the same words. decisionLines() prints them.
//
// The record is a file a pull request carries, and these lines reach every session through the hook. So they print
// decision ids that match `^P?D-\d{1,9}$`, `F-` and `M` ids built from numbers, the event table's words (`said`), a doc's
// path only when it matches DOC, a folder from the reader's fixed list, line numbers and status's date: never a title,
// a condition's text or a line of the record. Status escapes each line as it escapes every other.

import { fid } from './decisions.mjs';
import { line, thing } from './owed.mjs';

const ID = /^P?D-\d{1,9}$/;
const DOC = /^(docs|dev)\/features\/[A-Za-z0-9._-]{1,80}\.md$/;
const FOLDERS = new Set(['docs/features', 'dev/features', 'docs/milestones', 'docs/reviews']);
const CAP = 20;

// At most CAP of a list, then how many more.
const capped = (xs) => (xs.length > CAP ? `${xs.slice(0, CAP).join(', ')} and ${xs.length - CAP} more` : xs.join(', '));
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0]);

function owedThing({ id, feature, docs }) {
  const f = fid(feature);
  const key = `owed-citation:${id}:${f}`;
  if (!docs.length) return thing('owed-citation', { key, files: null, words: "the feature's shaping", waits: 'its doc', text: `Name the decision (${id}) in the doc for the feature (${f}) once it is written, or on the Contents line that builds the feature. The decision amends that feature, and no feature doc carries it yet.` });
  // A path is printed only in the shape feature docs are named; any other is said as the feature's doc.
  const where = [...new Set(docs.map((p) => (DOC.test(p) ? p : "the feature's doc")))].join(', ');
  return thing('owed-citation', { key, files: [...docs.filter((p) => typeof p === 'string'), 'docs/milestones/**'], text: `Write what the decision (${id}) changes into ${where}. It amends the feature (${f}), and nothing for that feature names it yet. The change goes in the Contract when it changes what the feature does, and then the Version moves. Otherwise it goes on the Contents line that builds the feature.` });
}

// The event in the table's words; a review of a doc that names the decision already covers it (AR-1 of the 0.3 review).
const said = (ev) => (ev.kind === 'reviewed' && ev.named ? `${ev.said}, and that review already covers the decision` : ev.said);

function firedThing({ id, kind, where, events }, today) {
  const happened = and(events.map(said));
  // A heading clause is cleared by removing it from the heading; a labelled line is replaced where it stands (§1).
  if (kind === 'closes') {
    const write = where === 'heading' ? `Remove the clause from the decision's heading and write "Closed ${today}: <outcome>" beneath it` : `Replace its condition with "Closed ${today}: <outcome>"`;
    return thing('decision-closes', { key: `decision-closes:${id}`, words: 'nothing', text: `Close the decision (${id}). ${write}. Its closing condition has happened (${happened}), so it no longer constrains new work.` });
  }
  const place = where === 'heading' ? "removes the clause from the decision's heading and writes the outcome beneath it" : 'writes the outcome in place of the condition';
  return thing('decision-reopens', { key: `decision-reopens:${id}`, words: 'anything new built on the decision', text: `Re-read the decision (${id}) and say whether it still holds. Its condition has happened (${happened}). An agent or /clarify then ${place}, as "Reopened ${today}: <what changed>", "Closed ${today}: <outcome>" or "Reviewed ${today}: stands — <why>". When it is open again, it writes "open — reopened ${today}" as the heading status and "Reopened ${today}: open again" ${where === 'heading' ? 'beneath it' : 'in place of the condition'}. A decision that supersedes it settles it too.` });
}

function unreadableThing(entries) {
  const n = entries.length;
  return thing('decision-unreadable', { words: `nothing, because nothing reads ${n === 1 ? 'it' : 'these'} until then`, text: `Say what should bring ${n === 1 ? 'the decision' : 'each decision'} back, or which feature it changes. ${n === 1 ? 'One decision says' : `${n} decisions say`} that in words status cannot read (${capped(entries.map((u) => u.id))}). A feature doc written, reviewed or shipped, a milestone starting or closing, a date or an issue closing all work. /clarify then writes it in the form status reads, or moves a condition no event fits out of the heading into the entry's prose.` });
}

function strayThing(lines) {
  const one = lines.length === 1;
  return thing('decision-stray', { words: `nothing, because nothing reads ${one ? 'it' : 'them'} until then`, text: `Move each condition line in decisions.md under its decision's heading, which starts with the decision's id. ${one ? 'Line' : 'Lines'} ${capped(lines.map(String))} ${one ? 'holds a condition' : 'hold conditions'} under no decision heading status can read, or in a heading whose id it cannot read. Otherwise correct a heading's id, or close the fence or end the heading that cut it off.` });
}

const folderThing = (dir) => thing('decision-folder', { key: `decision-folder:${dir}`, words: 'every owed citation and decision line that reads it', text: `Make ${dir}, and each folder above it, a plain folder inside the repository. Restore it from git, never by copying what a link points to. It cannot be read (a link, a file or no access in its place, or a link above it), so the decisions that read it are not checked.` });

// The owed things for the record readDecisions(root) returned, in §6's order; none when there is no decisions.md.
export function decisionThings(record, today) {
  if (record.missing) return [];
  const ok = (x) => ID.test(x.id);
  const unreadable = record.unreadable().filter(ok);
  return [
    ...record.owed().filter(ok).map(owedThing),
    ...record.fired(today).filter(ok).map((c) => firedThing(c, today)),
    ...(unreadable.length ? [unreadableThing(unreadable)] : []),
    ...(record.strays.length ? [strayThing(record.strays)] : []),
    ...record.unreadFolders().filter((d) => FOLDERS.has(d)).map(folderThing),
  ];
}

// The owed citation a feature's review waits on: the first for any of the feature numbers (the keys carry fid()'s padding).
export const citationFor = (things, ns) => things.find((o) => o.kind === 'owed-citation' && ns.some((n) => o.key.endsWith(`:${fid(n)}`)));

// The same, as the lines status prints.
export const decisionLines = (record, today) => decisionThings(record, today).map(line);
