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
// `@@json `. PC1 reads it to compare a check's findings with its fixture's
// expected set — an exit code alone cannot tell "red for the right reason"
// from "red for any reason".
//
// Warnings are printed and emitted but never change the exit code: something a person should
// look at that is not wrong on its face (an estimate larger than its appetite). PC1 still
// compares them, so a warning that can no longer fire is caught like a finding.

export const EXIT = { GREEN: 0, FINDINGS: 1, BROKEN: 2 };

// The characters no check or status prints raw, one list for the escapers below and the guards that test their
// output (lib/raw-output.mjs): C0 controls but tab and newline, DEL, C1, the line and paragraph separators, every
// format character (\p{Cf}: bidi embeddings, overrides, isolates and marks, zero-width spaces, the BOM, soft
// hyphens, the tag block), every default-ignorable character (Hangul fillers, the combining grapheme joiner,
// unassigned ignorables) and variation selector, and the braille blank U+2800. Each can hide, reorder or break
// text, or carry text a person reviewing a file does not see. U+200D (zero-width joiner) and U+FE0E, U+FE0F
// (text and emoji presentation) are left out so an emoji in project text (👩‍💻, ❤️) prints as itself.
export const UNSAFE = /[[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u2800\p{Cf}\p{Default_Ignorable_Code_Point}\p{Variation_Selector}]--[\u200d\ufe0e\ufe0f]]/v;
// C0/C1 only: what sync refuses in a path.
export const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const inField = new RegExp(`[${UNSAFE.source}\\t\\n]`, 'gv');
const inOutput = new RegExp(UNSAFE.source, 'gv');
// By UTF-16 unit, so a character above U+FFFF prints as its surrogate pair (\udb40\udc49): the form a JSON
// string reads back, so the @@json line still parses to the text the check saw.
const hex = (c) => Array.from({ length: c.length }, (_, i) => `\\u${c.charCodeAt(i).toString(16).padStart(4, '0')}`).join('');
// Text from a project file with each of those characters shown as \uXXXX, so a finding
// or an error quoting it prints nothing raw: no terminal escape, no CI log command, no text reordered, hidden
// or broken where a person or an agent reads it. escapeControl is for one field and escapes tab and newline
// too, so a field is one line and cannot start a line of its own; escapeOutput is for a whole printed text and
// keeps the newlines and tabs its program writes.
export const escapeControl = (s) => String(s).replace(inField, hex);
export const escapeOutput = (s) => String(s).replace(inOutput, hex);

/**
 * @param {object} o
 * @param {string} o.id        check id, e.g. "FO1"
 * @param {string} o.claim     the exact claim a green result supports — no more
 * @param {number} o.scanned   denominator: how many units were examined
 * @param {string} o.unit      what a unit is ("workflow files", "docs")
 * @param {Array<{where:string, detail:string}>} [o.findings]
 * @param {string[]} [o.exempted] ids excused by the exception registry
 * @param {string} [o.exemptedBy] names that registry in the output (default "registry")
 * @param {Array<{where:string, detail:string}>} [o.warnings] printed, never fail the check
 * @param {string|null} [o.broken] set when the check could not run safely
 */
export function report({ id, claim, scanned, unit, findings = [], exempted = [], exemptedBy = 'registry', warnings = [], broken = null }) {
  // Each field is one line, the claim and unit too (D1's claim quotes the manifest): a line break a project's
  // text or an error message carries is escaped, so it can never start a line of the report (a CI log command,
  // a second @@json line). The @@json line keeps the raw values.
  const one = escapeControl;
  [id, claim, unit, exemptedBy] = [id, claim, unit, exemptedBy].map((v) => one(String(v ?? '')));
  const L = [`${id}: scanned ${scanned} ${unit}`];
  let exit;

  if (broken) {
    L.push(`${id}: BROKEN — ${one(broken)}`);
    exit = EXIT.BROKEN;
  } else if (scanned === 0) {
    // Nothing was examined, so the check is broken, not the repo clean.
    L.push(`${id}: BROKEN — nothing was examined (0 ${unit}), so green would prove nothing`);
    exit = EXIT.BROKEN;
  } else {
    if (exempted.length) L.push(`${id}: ${exempted.length} exempted by ${exemptedBy}: ${exempted.map(one).join(', ')}`);
    for (const w of warnings) L.push(`${id}: warning: ${one(w.where)}: ${one(w.detail)}`);
    for (const f of findings) L.push(`${id}: ${one(f.where)}: ${one(f.detail)}`);
    if (findings.length) {
      L.push(`${id}: FAIL — ${findings.length} finding(s) across ${scanned} ${unit}`);
      exit = EXIT.FINDINGS;
    } else {
      const warned = warnings.length ? ` (${warnings.length} warning(s) above)` : '';
      L.push(`${id}: PASS — green proves: ${claim}${warned}`);
      exit = EXIT.GREEN;
    }
  }

  if (process.env.CHECK_JSON === '1') {
    const [reported, warned] = exit === EXIT.BROKEN ? [[], []] : [findings, warnings];
    L.push('@@json ' + JSON.stringify({ id, scanned, unit, exit, broken, findings: reported, exempted, warnings: warned }));
  }
  process.stdout.write(escapeOutput(L.join('\n')) + '\n');
  return exit;
}

// A check that throws prints its error as a BROKEN report, through the same escape, rather than letting Node
// print the message raw: an error can quote a project file (a Timezone value, a manifest line). Any other
// program importing this file gets the message escaped on one line and its stack frames, and exits 1.
function crashed(e) {
  const message = e instanceof Error ? e.message : String(e);
  const check = (process.argv[1] ?? '').match(/[\\/]checks[\\/]meta[\\/]([a-z]+\d*)-[^\\/]*\.mjs$/i);
  if (check) process.exit(report({ id: check[1].toUpperCase(), claim: '', scanned: 0, unit: 'units (it stopped before counting)', broken: `stopped on an error: ${message}` }));
  const frames = e instanceof Error ? (e.stack ?? '').split('\n').filter((l) => /^\s+at /.test(l)).join('\n') : '';
  process.stderr.write(`${escapeControl(message)}\n${frames ? `${escapeOutput(frames)}\n` : ''}`);
  process.exit(1);
}
process.on('uncaughtException', crashed);
process.on('unhandledRejection', crashed);
