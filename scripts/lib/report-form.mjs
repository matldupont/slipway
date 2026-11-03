// Reads the text a check prints (ci/checks/lib/report.mjs) back into one line per finding, the way tests
// assert on it: `ID: where: detail`, or `ID: warning: where: detail`. A finding prints as `detail`, an optional
// `  Fix: …` line and `  ID · where`, so the line before the id line is its detail. Every other line is kept as
// printed, so the summary lines (`scanned …`, `FAIL: …`, `PASS: …`, `BROKEN: …`) are asserted in their own form.
export function flat(text) {
  const lines = String(text).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^  ([A-Z0-9]+) · (.*)$/.exec(lines[i]);
    if (!m) { out.push(lines[i]); continue; }
    // The detail sits before this line, with a Fix line between when the finding has one.
    const hasFix = out.length > 1 && /^  Fix: /.test(out[out.length - 1]);
    if (hasFix) out.pop();
    let detail = out.pop() ?? '';
    const warning = detail.startsWith('Warning: ');
    if (warning) detail = detail.slice('Warning: '.length);
    out.push(`${m[1]}: ${warning ? 'warning: ' : ''}${m[2]}: ${detail}`);
  }
  return out.join('\n');
}

// The fix line of each finding, in order, for a test that pins one.
export const fixes = (text) => String(text).split('\n').filter((l) => /^  Fix: /.test(l)).map((l) => l.slice('  Fix: '.length));
