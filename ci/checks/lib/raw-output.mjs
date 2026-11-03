// What PC1 and S1 hold a check's or status's printed output to. The characters are report.mjs's one list
// (UNSAFE), so what is escaped and what is tested never drift apart; scripts/report.test.mjs pins each range.
import { UNSAFE } from './report.mjs';

const RAW = new RegExp(UNSAFE.source, 'gv');

// null, or the characters printed raw, by code point: `U+001B, U+202E`.
export function rawCharacters(...outputs) {
  const found = new Set(outputs.flatMap((o) => (o ?? '').match(RAW) ?? []));
  return found.size ? [...found].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).sort().join(', ') : null;
}

// null, or the first line of a check's report that report() did not write, and one @@json line ends it. A line
// break carried in from a project file or an error message would start a line of its own: a CI log command
// (::error::, ::stop-commands::) or a second @@json. report() writes only these lines: a summary ending in the
// id (`scanned …`, `FAIL: …`, `PASS: …`, `BROKEN: …`, `N exempted by …`), a finding's `  Fix: …` and
// `  ID · where` lines, and the detail line before one of those (`Warning: ` first, for a warning); a check's own
// notes (`DC1: info — …`) start with its id and a colon.
export function strayLine(stdout, id) {
  const lines = (stdout ?? '').replace(/\n$/, '').split('\n');
  const json = lines.filter((l) => l.startsWith('@@json '));
  if (json.length > 1) return json[1];
  const summary = new RegExp(`^(?:scanned |FAIL: |PASS: |BROKEN: |\\d+ exempted by ).* \\(${id}\\)$`);
  const idLine = new RegExp(`^  ${id} · `);
  const owner = (l) => idLine.test(l) || l.startsWith('  Fix: ');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('@@json ') || l.startsWith(`${id}: `) || summary.test(l) || owner(l)) continue;
    // A detail line stands right before its Fix line or its id line.
    if (i + 1 < lines.length && owner(lines[i + 1]) && !/^(?:::|##\[)/.test(l)) continue;
    return l;
  }
  return null;
}
