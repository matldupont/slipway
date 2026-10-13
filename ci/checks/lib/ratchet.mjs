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

// JSON text with the whitespace between its tokens removed. Text inside a string is kept as written, an escaped
// quote or backslash included.
function squeeze(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === '\\') out += text[++i] ?? '';
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') out += c;
  }
  return out;
}

// Whether writing `text`'s baselines back in the one form changes nothing but the spacing between its tokens.
// False when anything else would change: a number written another way (`1.0`, one too large to hold), a name
// written twice, a name that is a whole number (it moves to the front), an escape in a name. It decides only
// "rewrite or refuse" for a caller about to rewrite a file it does not own, and whatever it cannot make equal is
// a no: a wrong answer here can only refuse, never rewrite.
export const onlySpacingDiffers = (text) => {
  try {
    return squeeze(text) === squeeze(serialiseBaselines(parseBaselines(text)));
  } catch {
    return false;
  }
};

// The baselines under `root`; none when the file is absent.
export const readBaselines = (root = '.') => (existsSync(join(root, BASELINES)) ? parseBaselines(readFileSync(join(root, BASELINES), 'utf8')) : {});

export function writeBaselines(root, baselines) {
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
