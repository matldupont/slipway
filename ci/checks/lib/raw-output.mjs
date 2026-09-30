// What PC1 and S1 hold a check's or status's printed output to. The characters are report.mjs's one list
// (UNSAFE), so what is escaped and what is tested never drift apart; scripts/report.test.mjs pins each range.
import { UNSAFE } from './report.mjs';

const RAW = new RegExp(UNSAFE.source, 'gv');

// null, or the characters printed raw, by code point: `U+001B, U+202E`.
export function rawCharacters(...outputs) {
  const found = new Set(outputs.flatMap((o) => (o ?? '').match(RAW) ?? []));
  return found.size ? [...found].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).sort().join(', ') : null;
}

// null, or the first line of a check's report that report() did not write: every line starts with the check's
// id, and one @@json line ends it. A line break carried in from a project file or an error message would
// start a line of its own: a CI log command (::error::, ::stop-commands::) or a second @@json.
export function strayLine(stdout, id) {
  const lines = (stdout ?? '').replace(/\n$/, '').split('\n');
  const json = lines.filter((l) => l.startsWith('@@json '));
  if (json.length > 1) return json[1];
  return lines.find((l) => !l.startsWith(`${id}: `) && !l.startsWith('@@json ')) ?? null;
}
