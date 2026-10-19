// The ratchet: a number may go down, never up, against the baseline committed in ci/baselines.json. Shared by
// ci/ratchet.mjs (the code-health numbers) and the Fit count (F-12, dev/features/feature-fit.md), so they compare
// the same way, and the one reader and writer of that file: the checks, sync and new-project all go through it.
// It never exits, so a program that is not a check can import it.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MISSING, notPlainFile, notPlainFolder } from './review-header.mjs';

export const BASELINES = 'ci/baselines.json';
// The name the Fit count is kept under (lib/fit.mjs).
export const FIT_KEY = 'feature-fit';

// The file's text as an object of name → number. Throws, naming why, on text that is not JSON or not an object:
// a file nobody can read is never an empty one. The parser's own message is never passed on: it quotes the text.
export function parseBaselines(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${BASELINES} is not valid JSON`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${BASELINES} is not a JSON object of name → number`);
  return value;
}

// The one form the file is written in: two-space JSON and a final newline.
export const serialiseBaselines = (baselines) => `${JSON.stringify(baselines, null, 2)}\n`;

// Why the file under `root`, or the folder above it, is not one the ratchet reads or writes: a link, a file reached
// through one, a folder above it that is a link or not a folder, or anything but a plain file. null when it is plain
// or absent, with its folder plain or absent.
function notPlainBaselines(root) {
  const folder = notPlainFolder(root, dirname(BASELINES));
  if (folder !== null && folder !== MISSING) return `${dirname(BASELINES)}/ ${folder}`;
  const file = notPlainFile(root, BASELINES);
  return file === MISSING ? null : file && `${BASELINES} ${file}`;
}

// The baselines under `root`; none when the file is absent. Throws, reading nothing, when it is not a plain file of
// the repository: a link is never followed, and a device or a pipe is never opened.
export const readBaselines = (root = '.') => {
  const why = notPlainBaselines(root);
  if (why) throw new Error(`${why}, so it is not read — make it a plain file in a plain folder`);
  return notPlainFile(root, BASELINES) === MISSING ? {} : parseBaselines(readFileSync(join(root, BASELINES), 'utf8'));
};

// Every name in a JSON text, at any depth, as written: each string followed by a `:`, read as a lone string.
// JSON.parse on Node 23 and 24 can read a one-character escaped name as `\` once the process has parsed an object
// with a `\` name at that place; a lone string is not a name, so it is read right.
export function namesIn(text) {
  const names = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '"') continue;
    let j = i + 1;
    while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
    let k = j + 1;
    while (/\s/.test(text[k] ?? '')) k++;
    if (text[k] === ':') names.push(JSON.parse(text.slice(i, j + 1)));
    i = j;
  }
  return names;
}
const namesOf = (value) => (value !== null && typeof value === 'object' ? Object.entries(value).flatMap(([k, v]) => [...(Array.isArray(value) ? [] : [k]), ...namesOf(v)]) : []);
// A number JSON does not write back as it was read: none at all (`1e400` reads as Infinity, written as null), or
// a whole number too large to be held exactly. A fraction is written back as the number it reads as, so one past a
// number's digits is rounded and `1e-400` becomes 0 (F-12, Known limitations).
const changedNumber = (value) => (typeof value === 'number' ? !Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)) : value !== null && typeof value === 'object' && Object.values(value).some(changedNumber));

// Writes `baselines` over the file under `root`. Throws, writing nothing, when that file holds an entry a rewrite
// would lose or change: a link or anything but a plain file there, or a folder above it that is a link; bytes that are not UTF-8; a name the parser does
// not read as written (a name given twice, or the Node bug above); a number that is not written back as read. The
// file is read again here, so a caller's own earlier read is not what is checked (F-12, Known limitations).
export function writeBaselines(root, baselines) {
  const file = join(root, BASELINES);
  const why = notPlainBaselines(root);
  if (why) throw new Error(`${why}, so it is not rewritten; nothing was written — make it a plain file in a plain folder`);
  if (notPlainFile(root, BASELINES) !== MISSING) {
    const bytes = readFileSync(file);
    const text = bytes.toString('utf8');
    const parsed = parseBaselines(text);
    const sorted = (names) => JSON.stringify([...names].sort());
    if (!Buffer.from(text, 'utf8').equals(bytes) || sorted(namesIn(text)) !== sorted(namesOf(parsed)) || changedNumber(parsed)) {
      throw new Error(`${BASELINES} holds an entry a rewrite would lose or change (a name given twice, a name or number Node ${process.version} does not read as written, or bytes that are not UTF-8); nothing was written — fix the entry by hand`);
    }
  }
  mkdirSync(dirname(join(root, BASELINES)), { recursive: true });
  writeFileSync(join(root, BASELINES), serialiseBaselines(baselines));
}

// A count of things: a whole number, 0 or more.
export const isCount = (v) => Number.isInteger(v) && v >= 0;

// `value` against its baseline: 'none' when `base` is no baseline (by `valid`), else 'above', 'equal' or 'below'.
// Above fails, equal passes, below passes and may be locked in; none is broken, never green.
export function compare(value, base, valid = (b) => typeof b === 'number') {
  if (!valid(base)) return 'none';
  return value > base ? 'above' : value < base ? 'below' : 'equal';
}

// Whether --update may write `value` over `base`: always, but to raise a baseline. Raising one is a decision.
export const mayRecord = (value, base, valid) => compare(value, base, valid) !== 'above';
