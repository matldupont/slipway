// A field that names a decision in decisions.md (`extended: PD-<n>` in MS1, `design: PD-<n>` in DS1), read one way
// (F-14 §4). The value must first be a decision id, `PD-<n>` or `D-<n>` and nothing else: any other text is never looked
// up, so `.*` or `D` names no decision. Then, without `decided`, a `## <id>` or `### <id>` heading must start a line of decisions.md, the
// id written exactly as the field writes it and compared as text, never as a pattern: `D-5` does not answer for `D-005`,
// and `PD-1` does not answer for `PD-12`.
//
// With `decided: true` the record is read through parseDecisions() (lib/decisions.mjs), the one reader of decisions.md
// that ID1, DC1 and testStart() share: the entry with that exact id as written answers only when its heading's first
// status clause reads `*(decided …)*` or `*(accepted …)*`. Every project's decisions.md holds `## D-005 — Frontend
// framework *(open — week 1)*`, and an open stub is no decision; a heading with no status, or one cut before it, fails
// closed. MS1 reads `extended:` this way too (#513); the plain `## `/`### ` scan below runs only when `decided` is left off.

import { parseDecisions } from './decisions.mjs';

// The record parsed once per text: status asks for each shaping milestone it reads.
let last = null;
const entriesOf = (md) => (last?.md === md ? last : (last = { md, entries: parseDecisions(md).entries })).entries;

export const DECISION_REF = /^P?D-\d{1,9}$/;
// decisions.md is a file a pull request carries: each line is cut before anything reads it.
const MAX = 500;

// `{ ok: true }`, or `{ ok: false, why }` with why `not-an-id`, `missing` or `open` (with `decided`: a heading that is not marked decided or accepted).
export function resolveDecision(decisionsMd, value, { decided = false } = {}) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!DECISION_REF.test(id)) return { ok: false, why: 'not-an-id' };
  if (decided) {
    const entry = entriesOf(decisionsMd ?? '').find((e) => e.id === id);
    return !entry ? { ok: false, why: 'missing' } : entry.decided ? { ok: true } : { ok: false, why: 'open' };
  }
  for (const whole of (decisionsMd ?? '').split(/\r?\n/)) {
    const line = whole.slice(0, MAX);
    const hashes = line.startsWith('### ') ? 4 : line.startsWith('## ') ? 3 : 0;
    if (!hashes) continue;
    const rest = line.slice(hashes).trimStart();
    if (!rest.startsWith(id) || /[\w-]/.test(rest[id.length] ?? '')) continue;
    return { ok: true };
  }
  return { ok: false, why: 'missing' };
}
