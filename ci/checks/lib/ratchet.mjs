// The ratchet: a number may go down, never up, against the baseline committed in ci/baselines.json. Shared by
// ci/ratchet.mjs (the code-health numbers) and the Fit count (F-12, dev/features/feature-fit.md), so they compare
// the same way, and the one reader and writer of that file: the checks, sync and new-project all go through it.
// It never exits, so a program that is not a check can import it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const sameNames = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// Writes the baselines over the file under `root`. Throws, writing nothing, when the file there holds a name the
// parser does not read as written (a name given twice, or the Node bug above): rewriting it would drop an entry.
export function writeBaselines(root, baselines) {
  const file = join(root, BASELINES);
  if (existsSync(file)) {
    const text = readFileSync(file, 'utf8');
    const parsed = parseBaselines(text);
    if (!sameNames(namesIn(text), namesOf(parsed))) {
      throw new Error(`${BASELINES} holds a name that is given twice, or that Node ${process.version} misreads, so rewriting it would lose an entry; nothing was written — fix the name by hand`);
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
