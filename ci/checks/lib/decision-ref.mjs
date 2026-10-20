// A field that names a decision in decisions.md (`extended: PD-<n>` in MS1, `design: PD-<n>` in DS1), read one way
// (F-14 §4). The value must first be a decision id, `PD-<n>` or `D-<n>` and nothing else: any other text is never looked
// up, so `.*` or `D` names no decision. Then a `## <id>` or `### <id>` heading must start a line of decisions.md, the
// id written exactly as the field writes it and compared as text, never as a pattern: `D-5` does not answer for `D-005`,
// and `PD-1` does not answer for `PD-12`.
//
// With `decided: true` only a heading whose first status clause reads `*(decided …)*` or `*(accepted …)*` answers, as
// testStart() in lib/decisions.mjs reads one: every project's decisions.md holds `## D-005 — Frontend framework
// *(open — week 1)*`, and an open stub is no decision; a heading with no status, or one cut before it, fails closed.
// MS1 reads without it for now (#513).

export const DECISION_REF = /^P?D-\d{1,9}$/;
// decisions.md is a file a pull request carries: each line is cut before anything reads it.
const MAX = 500;

// `{ ok: true }`, or `{ ok: false, why }` with why `not-an-id`, `missing` or `open` (with `decided`: a heading that is not marked decided or accepted).
export function resolveDecision(decisionsMd, value, { decided = false } = {}) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!DECISION_REF.test(id)) return { ok: false, why: 'not-an-id' };
  let open = false;
  for (const whole of (decisionsMd ?? '').split(/\r?\n/)) {
    const line = whole.slice(0, MAX);
    const hashes = line.startsWith('### ') ? 4 : line.startsWith('## ') ? 3 : 0;
    if (!hashes) continue;
    const rest = line.slice(hashes).trimStart();
    if (!rest.startsWith(id) || /[\w-]/.test(rest[id.length] ?? '')) continue;
    const status = rest.indexOf('*(');
    if (decided && !(status >= 0 && /^(?:decided|accepted)\b/i.test(rest.slice(status + 2, status + 12)))) {
      open = true;
      continue;
    }
    return { ok: true };
  }
  return { ok: false, why: open ? 'open' : 'missing' };
}
