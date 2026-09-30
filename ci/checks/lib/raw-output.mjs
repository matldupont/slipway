// The characters no check or status may print raw: C0 controls but tab and newline, DEL, C1, the bidi
// embeddings, overrides and isolates (U+202A–U+202E, U+2066–U+2069) and the line and paragraph separators
// (U+2028, U+2029). Written out here, not taken from report.mjs, so a range dropped from the escaper is
// caught rather than dropped from the guard with it. PC1 runs it on every check's output on every
// fixture, S1 on status's output for every case.
const RAW = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu;

// null, or the code points printed raw: `U+001B, U+202E`.
export function rawCharacters(...outputs) {
  const found = new Set(outputs.flatMap((o) => (o ?? '').match(RAW) ?? []));
  return found.size ? [...found].map((c) => `U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`).sort().join(', ') : null;
}
