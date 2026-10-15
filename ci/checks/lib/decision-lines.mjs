// What the decisions record still asks of someone, as `pnpm status` prints it under Needs attention (F-15 §6,
// dev/features/owed-decisions.md): an Amends: nothing cites yet, a condition whose event has happened, the conditions
// status cannot read, condition lines that sit under no decision, and the folders the reader could not see. Every line
// says who acts in a leading parenthesis, then ends with what it blocks and what it waits on, so a plan of the whole
// list can be built from the lines alone (#445).
//
// The record is a file a pull request carries, and these lines reach every session through the hook. So they print
// decision ids that match `^P?D-\d{1,9}$`, `F-` and `M` ids built from numbers, the event table's words (`said`), a doc's
// path only when it matches DOC, a folder from the reader's fixed list, line numbers and status's date: never a title,
// a condition's text or a line of the record. Status escapes each line as it escapes every other.

import { fid, ISSUE_READABLE } from './decisions.mjs';

const ID = /^P?D-\d{1,9}$/;
const DOC = /^(docs|dev)\/features\/[A-Za-z0-9._-]{1,80}\.md$/;
const FOLDERS = new Set(['docs/features', 'dev/features', 'docs/milestones', 'docs/reviews']);
const CAP = 20;
const AGENT = '(you or an agent)';

// At most CAP of a list, then how many more.
const capped = (xs) => (xs.length > CAP ? `${xs.slice(0, CAP).join(', ')} and ${xs.length - CAP} more` : xs.join(', '));
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0]);

function owedLine({ id, feature, docs }) {
  const f = fid(feature);
  const lead = `${AGENT} Owed citation: ${id} amends ${f} and nothing for ${f} names ${id} — `;
  if (!docs.length) return `${lead}no feature doc carries ${f} yet; name ${id} in it when it is written, or on the Contents line that builds ${f} — before ${f} is shaped; waits on its doc`;
  // A path is printed only in the shape feature docs are named; any other is said as a feature doc carrying the id.
  const where = [...new Set(docs.map((p) => (DOC.test(p) ? p : `a feature doc carrying ${f}`)))].join(', ');
  return `${lead}write what ${id} changes into ${where} where the change belongs (its Contract when it changes what ${f} does, and the Version moves) or onto the Contents line that builds ${f} — before ${f} is reviewed or built; waits on nothing`;
}

// The event in the table's words; a review of a doc that names the decision already covers it (AR-1 of the 0.3 review).
const said = (ev) => (ev.kind === 'reviewed' && ev.named ? `${ev.said} (${fid(ev.feature)}'s current review already covers it)` : ev.said);

function firedLine({ id, kind, where, events }, today) {
  const what = `${id} — ${and(events.map(said))}`;
  // A heading clause is cleared by removing it from the heading; a labelled line is replaced where it stands (§1).
  const place = where === 'heading' ? `removes the clause from ${id}'s heading and writes the outcome beneath it` : 'writes the outcome in its place';
  if (kind === 'closes') {
    const write = where === 'heading' ? `remove the clause from ${id}'s heading and write "Closed ${today}: <outcome>" beneath it` : `replace its condition with "Closed ${today}: <outcome>"`;
    return `${AGENT} Decision closes: ${what}: ${id} no longer constrains new work; ${write} — blocks nothing; waits on nothing`;
  }
  return `(you) Decision reopens: ${what}: re-read ${id}; does it still hold? An agent or /clarify ${place}: "Reopened ${today}: <what changed>", "Closed ${today}: <outcome>" or "Reviewed ${today}: stands — <why>"; or, when it is open again, "open — reopened ${today}" as its heading status and "Reopened ${today}: open again"; or the decision that supersedes it — before anything new is built on ${id}; waits on nothing`;
}

function unreadableLine(entries) {
  const ids = entries.map((u) => (u.issueOnly && !ISSUE_READABLE ? `${u.id} (waits on an issue: read at the pull request that closes it, once that reader ships)` : u.id));
  const n = entries.length;
  return `${AGENT} Unreadable condition: ${n} ${n === 1 ? 'decision says' : 'decisions say'} what brings ${n === 1 ? 'it' : 'them'} back in words status cannot read: ${capped(ids)} — for ${n === 1 ? 'it' : 'each'}, say what should bring it back (a feature doc written, reviewed or shipped; a milestone starting or closing; a date; an issue closing) or which feature it changes, and /clarify writes it in the form status reads, or moves a condition no event fits out of the heading into the entry's prose — blocks nothing: nothing reads these until then; waits on nothing`;
}

function strayLine(lines) {
  const one = lines.length === 1;
  return `${AGENT} Stray condition line: decisions.md ${one ? 'line' : 'lines'} ${capped(lines.map(String))} ${one ? 'holds a condition line' : 'hold condition lines'} under no decision heading status can read — move ${one ? 'it' : 'each'} under its decision's heading (one that starts with the decision's id), or close the fence or end the heading that cut it off — blocks nothing: nothing reads ${one ? 'it' : 'them'} until then; waits on nothing`;
}

const folderLine = (dir) => `${AGENT} Unread folder: ${dir} cannot be read (a link, a file or no access in its place), so the decisions that read it are not checked — make it a plain folder — blocks every Owed citation and Decision line that reads it; waits on nothing`;

// The lines for the record readDecisions(root) returned, in §6's order; none when there is no decisions.md.
export function decisionLines(record, today) {
  if (record.missing) return [];
  const ok = (x) => ID.test(x.id);
  const unreadable = record.unreadable().filter(ok);
  return [
    ...record.owed().filter(ok).map(owedLine),
    ...record.fired(today).filter(ok).map((c) => firedLine(c, today)),
    ...(unreadable.length ? [unreadableLine(unreadable)] : []),
    ...(record.strays.length ? [strayLine(record.strays)] : []),
    ...record.unreadFolders().filter((d) => FOLDERS.has(d)).map(folderLine),
  ];
}
