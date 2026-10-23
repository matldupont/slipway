// The form of the Next line `pnpm status` prints (F-16 §2, process/writing.md), as a function S1 holds every fixture to and
// scripts/steps.test.mjs holds clause by clause. With the quoted spans (`"…"`: a risk's assumption, a Contents item, project
// text the rules cannot govern) removed: 2 to 4 sentences, the first of 14 words or fewer and ending in a period, none holding `;` or ` — `, "Step n",
// a check id or a decision id, the last naming who, and the whole line 260 characters or fewer, the quoted spans included.
// A sentence ends at `.`, `?` or `!` followed by white space or the end of the line.

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A check's id is the upper-cased prefix of its file name under ci/checks/meta/ (`k1-frame.mjs` is K1).
const metaDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'meta');
const CHECK_IDS = readdirSync(metaDir).filter((f) => f.endsWith('.mjs')).map((f) => f.split('-')[0].toUpperCase());
const WHO = /^(?:You|Yours|Agent|A fresh session)\b/;

// What a Next line breaks, as a list of short phrases; empty when it holds the form.
export function nextFormBreaks(line) {
  const text = line.replace(/"[^"]*"/g, '');
  const sentences = text.split(/(?<=[.?!])(?:\s+|$)/).map((x) => x.trim()).filter((x) => /[\p{L}\p{N}]/u.test(x));
  const breaks = [];
  if (sentences.length < 2 || sentences.length > 4) breaks.push(`${sentences.length} sentences, not 2 to 4`);
  if (sentences[0] && sentences[0].split(/\s+/).length > 14) breaks.push('a first sentence over 14 words');
  if (sentences[0] && !sentences[0].endsWith('.')) breaks.push('a first sentence that does not end with a period');
  if (text.includes(';')) breaks.push('a semicolon');
  if (text.includes(' — ')) breaks.push('a dash between clauses');
  if (/\bStep \d/.test(text)) breaks.push('a step number');
  const ids = CHECK_IDS.filter((id) => new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
  if (ids.length) breaks.push(`a check id (${ids.join(', ')})`);
  if (/\b(?:P?D)-\d+\b/.test(text)) breaks.push('a decision id');
  if (line.length > 260) breaks.push(`${line.length} characters, over 260`);
  if (sentences.length && !WHO.test(sentences.at(-1))) breaks.push('a last sentence that does not say who');
  return breaks;
}
