// The check-output contract.
//
// Every check MUST print its denominator. A check that says "no problems found"
// without saying what it looked at is indistinguishable from a check that
// looked at nothing — the vacuous-green class, the costliest failure a gate can have.
//
// Exit codes: 0 = green, 1 = findings, 2 = the check itself could not run.
// 2 is distinct on purpose: a broken check must never read as a clean one.
//
// With CHECK_JSON=1 the report also emits one machine-readable line prefixed
// `@@json `. M6 reads it to compare a check's findings with its fixture's
// expected set — an exit code alone cannot tell "red for the right reason"
// from "red for any reason".

export const EXIT = { GREEN: 0, FINDINGS: 1, BROKEN: 2 };

/**
 * @param {object} o
 * @param {string} o.id        check id, e.g. "M3"
 * @param {string} o.claim     the exact claim a green result supports — no more
 * @param {number} o.scanned   denominator: how many units were examined
 * @param {string} o.unit      what a unit is ("workflow files", "docs")
 * @param {Array<{where:string, detail:string}>} [o.findings]
 * @param {string[]} [o.exempted] ids excused by the exception registry
 * @param {string|null} [o.broken] set when the check could not run safely
 */
export function report({ id, claim, scanned, unit, findings = [], exempted = [], broken = null }) {
  const L = [`${id}: scanned ${scanned} ${unit}`];
  let exit;

  if (broken) {
    L.push(`${id}: BROKEN — ${broken}`);
    exit = EXIT.BROKEN;
  } else if (scanned === 0) {
    // Nothing was examined, so the check is broken, not the repo clean.
    L.push(`${id}: BROKEN — denominator is 0, nothing was examined`);
    exit = EXIT.BROKEN;
  } else {
    if (exempted.length) L.push(`${id}: ${exempted.length} exempted by registry: ${exempted.join(', ')}`);
    for (const f of findings) L.push(`${id}: ${f.where}: ${f.detail}`);
    if (findings.length) {
      L.push(`${id}: FAIL — ${findings.length} finding(s) across ${scanned} ${unit}`);
      exit = EXIT.FINDINGS;
    } else {
      L.push(`${id}: PASS — green proves: ${claim}`);
      exit = EXIT.GREEN;
    }
  }

  if (process.env.CHECK_JSON === '1') {
    const reported = exit === EXIT.BROKEN ? [] : findings;
    L.push('@@json ' + JSON.stringify({ id, scanned, unit, exit, broken, findings: reported, exempted }));
  }
  process.stdout.write(L.join('\n') + '\n');
  return exit;
}
