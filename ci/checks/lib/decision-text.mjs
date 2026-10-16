// Line-level reading for the decisions reader (ci/checks/lib/decisions.mjs, F-15 §2 and §3): which lines sit in a
// fence, the mask that blanks fences and code spans, the clause openings and the prose pattern, quoted text, a
// condition's text and §3's events. Split from that
// module only for its size; it is the one reader callers import, and this file has no other reader.

import { LEAD } from './feature-docs.mjs';
import { MILESTONE_ID, milestoneId } from './milestones.mjs';

const FENCE = /^ {0,3}```/;

// The heading line the decisions reader and the line scans share (ID1's reading).
export const HEADING = new RegExp(LEAD);
export const fid = (n) => `F-${String(n).padStart(2, '0')}`;
const blank = (s) => ' '.repeat(s.length);

// Whether each line sits in a fenced block, its marker lines included. A fence still open at the end of the text is
// a typo, not a block: its lines are read as written, so a stray marker never hides the decisions below it.
export function fenced(lines) {
  let fence = false;
  let openedAt = -1;
  const out = lines.map((l, i) => {
    const marker = FENCE.test(l);
    if (marker) fence = !fence;
    if (marker && fence) openedAt = i;
    return fence || marker;
  });
  if (fence) out.fill(false, openedAt);
  return out;
}
// Each line with fenced blocks and code spans blanked, columns kept. A fence (``` to ```) is blanked whole, its
// marker lines too. A code span is backtick to backtick within a paragraph (consecutive non-blank lines, a heading
// standing alone), so a span crosses the hard wraps decisions.md is written with; an unmatched backtick blanks to the
// paragraph's end.
export function mask(lines) {
  const fence = fenced(lines);
  const out = lines.map((l, i) => (fence[i] ? blank(l) : l));
  let open = false;
  for (let i = 0; i < out.length; i++) {
    const alone = HEADING.test(out[i]);
    if (out[i].trim() === '' || alone) open = false;
    // By UTF-16 unit, as `length` and `slice` count: a character of two units inside a span is two spaces.
    let s = '';
    for (let j = 0; j < out[i].length; j++) {
      const ch = out[i][j];
      if (ch === '`') {
        open = !open;
        s += ' ';
      } else s += open ? ' ' : ch;
    }
    out[i] = s;
    if (alone) open = false;
  }
  return out;
}

// The space between two words of a clause opening or the prose pattern: a run of spaces or tabs, bounded, so a doubled
// space or a tab never makes a clause a typo hides.
const WS = '[ \\t]{1,20}';
// Whether a text holds one of the five clause openings, read on its letters alone, case folded: no mark, space, tab or
// run of them between or inside the words hides one (the owner's call on #466, after two review rounds each found a
// typo shape a pattern missed). It is louder by design: a title whose letters happen to run `closesif` is unreadable.
// One loop over the characters and a substring search, no pattern, so it may read a whole line past the cut at MAX.
const CLAUSE_LETTERS = ['reopenswhen', 'reopensif', 'closeswhen', 'closesif', 'provisionaluntil'];
export const hasClause = (s) => {
  const lower = s.toLowerCase();
  let letters = '';
  for (const ch of lower) if (ch >= 'a' && ch <= 'z') letters += ch;
  return CLAUSE_LETTERS.some((w) => letters.includes(w));
};
// A clause that opens with one of them, at its start and followed by a space or its end: `[kind, rest]`.
export const CLAUSE_START = new RegExp(`^(?:(reopens|closes)${WS}(?:when|if)|provisional${WS}until)(?=\\s|$)`, 'i');
export const PROSE = [
  new RegExp(`\\b(?:revisit(?:ed)?|reopen(?:s|ed)?)(?:${WS}(?:it|this|them))?${WS}(?:when|if|once|after)\\b`, 'i'),
  new RegExp(`\\bcloses?${WS}(?:when|if|once)\\b`, 'i'),
  new RegExp(`\\bprovisional${WS}until\\b`, 'i'),
];

// What a condition's text reads as: backticks and a closing full stop removed, whitespace squashed.
export const squash = (s) => s.replace(/`/g, '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');

function isDay(date) {
  const day = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === date;
}

// The verbs of §3's table. Maps, so a word an object inherits (`constructor`, `__proto__`) is no verb.
const FEATURE_VERBS = new Map([['has a doc', 'doc'], ['has a feature doc', 'doc'], ['is reviewed', 'reviewed'], ['is shipped', 'shipped']]);
const FEATURE_SAID = new Map([['doc', 'has a doc'], ['reviewed', 'is reviewed'], ['shipped', 'is shipped']]);
const MILESTONE_VERBS = new Map([['is active', 'active'], ['is activated', 'active'], ['goes active', 'active'], ['is closed', 'closed'], ['closes', 'closed']]);

// `M2 is active`, `M1.1 is closed`: the id as milestoneId() writes it, so `M02` and `M2` are one milestone.
const EVENT_MILESTONE = new RegExp(`^(${MILESTONE_ID}) (.{1,40})$`);

// One event of §3's table, or null. Verbs are case folded; ids keep their case. `said` is the event in the table's
// words, built from the numbers read, never from the record's text.
export function parseEvent(part) {
  let m = part.match(/^F-(\d{1,9}) (.{1,40})$/);
  if (m) {
    const n = Number(m[1]);
    const kind = FEATURE_VERBS.get(m[2].toLowerCase());
    return kind ? { kind, feature: n, readable: true, said: `${fid(n)} ${FEATURE_SAID.get(kind)}` } : null;
  }
  m = part.match(EVENT_MILESTONE);
  if (m) {
    const id = milestoneId(m[1]);
    const kind = MILESTONE_VERBS.get(m[2].toLowerCase());
    return kind ? { kind, milestone: id, readable: true, said: `${id} is ${kind}` } : null;
  }
  m = part.match(/^(\d{4}-\d{2}-\d{2}) (passes|has passed)$/i);
  if (m) return isDay(m[1]) ? { kind: 'date', date: m[1], readable: true, said: `${m[1]} passes` } : null;
  m = part.match(/^(?:([\w.-]{1,100}\/[\w.-]{1,100}))?#(\d{1,9}) (closes|lands|is closed)$/i);
  // Readable here, fired nowhere in status: P1 reads it at the pull request whose body closes the issue (§8). `repo` is
  // the repository as written, lower case, or '' for this one.
  if (m) return { kind: 'issue', issue: Number(m[2]), repo: (m[1] ?? '').toLowerCase(), readable: true, said: `#${Number(m[2])} closes` };
  return null;
}

// A line with its quoted text (between straight or curly double quotes) blanked, in one pass: a quote with no close
// after it is left as written, and once a close is known to be missing it is not looked for again.
const QUOTE = { '"': '"', '“': '”' };
export function unquoted(s) {
  let out = '';
  const gone = new Set();
  for (let i = 0; i < s.length; i++) {
    const close = QUOTE[s[i]];
    const end = close && !gone.has(close) ? s.indexOf(close, i + 1) : -1;
    if (close && end < 0) gone.add(close);
    if (end < 0) out += s[i];
    else {
      out += blank(s.slice(i, end + 1));
      i = end;
    }
  }
  return out;
}
