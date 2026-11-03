// The planner (F-17 §3, dev/features/parallel-plan.md): given the main step and what is owed, which owed things and ready
// issues can run beside it without colliding. Status (step 2 of #445) and the work-order page (step 5) call plan(), so they
// name the same main step and the same picks in the same order; nothing calls it yet. Pure: no I/O, no process.exit, no clock.
//
//   plan({ main, owed, leaves, inProgress, shape, online }) → { main, parallel: [...picks], rest: [...owed] }
//
// main        the main step: { who, files, issue?, kind? }; `kind: 'shape'` when the main step shapes an item
// owed        owed things (owed.mjs), in Needs attention order
// leaves      the active milestone's leaves, ready or not: { n, title?, ready, claimed, touches }; empty offline
// inProgress  the files of each piece of work in progress: an array of file sets (an array, or null for unknown); empty offline
// shape       the first unstarted Contents item: { id, n, files? }, or null
// online      whether GitHub was read
//
// A pick is an owed thing, a ready leaf ({ kind: 'leaf', … }) or the shaping thing; `rest` holds every owed thing not
// taken, each with `startable` set (`It can start now, after the steps above.`, F-17 §1).

import { overlap } from './issue-body.mjs';
import { MILESTONE_ID } from './milestones.mjs';
import { isKey, KIND_ORDER, ownerBusy, ownerWork, thing } from './owed.mjs';

// At most this many places in all, the main step included.
export const CAP = 3;
export const OFFLINE = 'Status did not read open pull requests, so check them for the same files first.';

// A leaf's number and a milestone id go into commands a session runs, so only whole numbers and `M<n>` ids are used.
// The limit is wider than status's itemNumber (four digits): that one guards a Contents item's number, which status prints
// and passes as shape.n; a leaf's number is an issue number, and a repository's run past 9999.
const WHOLE = (n) => Number.isSafeInteger(n) && n > 0 && n <= 999_999_999;
const MID = new RegExp(`^${MILESTONE_ID}$`);

// A file set is an array, or unknown (null): anything else is unknown, since overlap() would throw on it (F-17 §3 rule 2).
const known = (f) => (Array.isArray(f) ? f : null);

const leafThing = (l) => ({
  kind: 'leaf',
  key: `leaf:${l.n}`,
  who: 'agent',
  text: `Start #${l.n} in a fresh session with /work-ticket ${l.n}. It is ready, and it shares no file with work in progress.`,
  blocks: { rank: 1, words: 'the active milestone closing', date: null },
  waits: null,
  files: known(l.touches),
  n: l.n,
});

const shapeThing = (s) => thing('shape', {
  key: `shape:${s.id}#${s.n}`,
  text: `Shape item ${s.n} of ${s.id} with /log-feature ${s.id}#${s.n}.`,
  ...(s.files ? { files: s.files } : {}),
});

// Where a candidate sorts: rank 1's owed things first, then the ready leaves, then shaping, then ranks 2 to 5 (AR-4, AR-6).
// Within a rank, §2's table order, a lesson's date first in rank 4; ties keep the order they came in.
// Shaping takes a place only while fewer than three builds are offered, the main step counted (AR-4); at most 2 picks
// beside the main step is the same rule, since the places a build can fill are the leaves and the main step.
const group = (t, role) => (role === 'leaf' ? 1 : role === 'shape' ? 2 : t.blocks.rank === 1 ? 0 : t.blocks.rank + 1);

export function plan({ main, owed = [], leaves = [], inProgress = [], shape = null, online = false }) {
  const keys = new Set(owed.map((t) => t.key));
  // Waits on nothing open: no wait, or the key of a thing that is no longer in the run. A fixed phrase is an open wait.
  const clear = (t) => t.waits === null || t.waits === undefined || (isKey(t.waits) && !keys.has(t.waits));

  const candidates = [
    ...owed.map((t, i) => ({ t, role: 'owed', i })),
    ...leaves.filter((l) => WHOLE(l.n) && l.ready && !l.claimed && l.n !== main.issue).map((l, i) => ({ t: leafThing(l), role: 'leaf', i })),
    ...(shape && WHOLE(shape.n) && typeof shape.id === 'string' && MID.test(shape.id) && main.kind !== 'shape' ? [{ t: shapeThing(shape), role: 'shape', i: 0 }] : []),
  ].filter(({ t }) => t.blocks.rank >= 1 && t.blocks.rank <= 4)
    .sort((a, b) => group(a.t, a.role) - group(b.t, b.role)
      || (a.role === 'owed' && b.role === 'owed'
        ? (a.t.blocks.rank === 4 ? String(a.t.blocks.date ?? '').localeCompare(String(b.t.blocks.date ?? '')) : 0)
          || KIND_ORDER.indexOf(a.t.kind) - KIND_ORDER.indexOf(b.t.kind)
        : 0)
      || a.i - b.i);

  const busy = ownerBusy(main.who);
  const taken = [];
  const used = [known(main.files), ...(Array.isArray(inProgress) ? inProgress : []).map(known)];
  let owner = false;
  for (const { t, role } of candidates) {
    if (1 + taken.length >= CAP) break;
    // Unknown files are refused here and again by overlap(), which treats null as meeting everything.
    const files = known(t.files);
    if (!clear(t) || files === null) continue;
    // [] overlaps nothing, even beside unknown files (§3 rule 3).
    if (files.length > 0 && used.some((f) => overlap(files, f))) continue;
    if (ownerWork(t.who) && (busy || owner)) continue;
    taken.push({ t, role });
    used.push(files);
    if (ownerWork(t.who)) owner = true;
  }

  // By identity, not key: two things may share a key, and a pick must not take its twin out of the list.
  const picked = new Set(taken.map(({ t }) => t));
  const parallel = taken.map(({ t }) => (online ? t : { ...t, text: `${t.text} ${OFFLINE}`, ...(t.line == null ? {} : { line: `${t.line} ${OFFLINE}` }) }));
  const rest = owed
    .filter((t) => !picked.has(t))
    .map((t) => ({ ...t, startable: t.blocks.rank >= 1 && t.blocks.rank <= 4 && clear(t) }));
  return { main, parallel, rest };
}
