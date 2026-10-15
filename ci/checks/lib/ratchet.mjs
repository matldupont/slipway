// The ratchet: a number may go down, never up, against the baseline committed in ci/baselines.json. Shared by
// ci/ratchet.mjs (the code-health numbers) and the Fit count (F-12, dev/features/feature-fit.md), so they compare
// the same way, and the one reader and writer of that file: the checks, sync and new-project all go through it.
// It never exits, so a program that is not a check can import it.

import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const BASELINES = 'ci/baselines.json';
// The name the Fit count is kept under (lib/fit.mjs).
export const FIT_KEY = 'feature-fit';

// The file's text as an object of name → number. Throws, naming why, on text that is not JSON or not an object:
// a file nobody can read is never an empty one.
export function parseBaselines(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (e) {
    throw new Error(`${BASELINES} is not valid JSON: ${e.message}`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${BASELINES} is not a JSON object of name → number`);
  return value;
}

// The one form the file is written in: two-space JSON and a final newline.
export const serialiseBaselines = (baselines) => `${JSON.stringify(baselines, null, 2)}\n`;

// The baselines under `root`; none when the file is absent.
export const readBaselines = (root = '.') => (existsSync(join(root, BASELINES)) ? parseBaselines(readFileSync(join(root, BASELINES), 'utf8')) : {});

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
// a whole number too large to be held exactly.
const changedNumber = (value) => (typeof value === 'number' ? !Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)) : value !== null && typeof value === 'object' && Object.values(value).some(changedNumber));

// Writes `baselines` over the file under `root`: what the caller read there, with a top-level name set or added.
// Throws, writing nothing, when the rewrite would lose or change an entry the file holds: a link or anything but
// a plain file there; bytes that are not UTF-8; a name in the text that `baselines` does not hold as written (a
// name given twice, or the Node bug above), or a name it holds that is neither in the text nor at its top; a
// number that is not written back as read.
export function writeBaselines(root, baselines) {
  const file = join(root, BASELINES);
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (stat) {
    if (!stat.isFile()) throw new Error(`${BASELINES} is a link or not a plain file, so it is not rewritten; nothing was written — make it a plain file`);
    const bytes = readFileSync(file);
    const text = bytes.toString('utf8');
    parseBaselines(text);
    const left = new Map();
    for (const n of namesOf(baselines)) left.set(n, (left.get(n) ?? 0) + 1);
    const lost = namesIn(text).filter((n) => (left.get(n) ? (left.set(n, left.get(n) - 1), false) : true));
    const added = [...left].filter(([n, c]) => c > 0 && !Object.hasOwn(baselines, n));
    if (!Buffer.from(text, 'utf8').equals(bytes) || lost.length || added.length || changedNumber(baselines)) {
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
