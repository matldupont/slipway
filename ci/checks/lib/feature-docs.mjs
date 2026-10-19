// What a feature doc is: the one reading of docs/features/ and dev/features/, shared by ID1 (which holds each
// F-<n> to one doc) and the Fit count (F-12, dev/features/feature-fit.md), so they class a file the same way.
// It never exits, so a program that is not a check can import it.
//
// A feature doc is a regular file reached through no link, named `*.md`, directly in one of the two folders (a
// subfolder is not read), not TEMPLATE.md and not README.md, with at least one `F-<n>` heading and no `companion-of:`
// in its frontmatter. A companion carries its primary's id on purpose, and the primary answers for both. A folder
// that is a link, sits under one, or is not a folder is not read at all, and is listed as such.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { frontmatter } from './frontmatter.mjs';
import { UNSAFE } from './report.mjs';
import { MISSING, notPlainFile, notPlainFolder } from './review-header.mjs';

export const FEATURE_DIRS = ['docs/features', 'dev/features'];

// [{ line, text }] for every line of the text, whatever it sits in. Nothing is skipped: a heading-shaped line inside a
// fence, a comment, front matter, a quote, a list item or indented code counts too. Every skip rule a reader of markdown
// applies is a way to hide a duplicate from a gate, and review rounds found one each; a false alarm on an example heading
// costs a reword, a hidden duplicate costs a collision. CR, LF and CRLF all end a line. A byte-order mark, characters
// that print as nothing, and look-alike hyphens and digits (NFKC) are normalised away before a line is matched.
// Not handled, and said so: an id written through markup or an escape (`## **D-1**`, `## D\-1`, `<h2>D-1</h2>`), a
// setext heading, a look-alike letter, dash or digit that NFKC leaves alone (Cyrillic Р, U+2043, Arabic-Indic ٣), a file
// name other than `*.md`, and README.md, which is skipped beside TEMPLATE.md.
// Every character report.mjs's UNSAFE names, all of them on a line (its own regex has no `g`), and the three it leaves
// for emoji (U+200D, U+FE0E, U+FE0F), which print as nothing between plain letters.
const INVISIBLE = new RegExp(`[${UNSAFE.source}\\u200d\\ufe0e\\ufe0f]`, 'gv');
// A text with those characters taken out and nothing else changed: no folding, no line split.
export const unseen = (s) => s.replace(INVISIBLE, '');
// A text as a heading is matched: those characters taken out, look-alikes folded (NFKC) and every dash a hyphen.
// NFKC reorders a run of combining marks in time the square of its length, so a text holding a run of more than 32 is
// folded a piece at a time, each piece at most 32 marks after its other characters: the run is reordered within each
// piece only, which no id, heading mark or hyphen depends on. The halfwidth voiced marks U+FF9E and U+FF9F count as
// marks here: NFKC turns each wholly into a combining mark, and no other character that is not a mark does (U+0E33
// and U+0EB3 give a mark and then a letter, which ends the run).
const PIECE = /[^\p{M}\uFF9E\uFF9F]*[\p{M}\uFF9E\uFF9F]{0,32}/gu;
const LONG_RUN = /[\p{M}\uFF9E\uFF9F]{33}/u;
const nfkc = (s) => (LONG_RUN.test(s) ? s.match(PIECE).map((p) => p.normalize('NFKC')).join('') : s.normalize('NFKC'));
export const fold = (s) => nfkc(unseen(s)).replace(/[\p{Pd}\u2212]/gu, '-');
export function visible(md) {
  return md
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/)
    .map((raw, i) => ({ line: i + 1, text: fold(raw) }));
}

// What may stand in front of the `#`s: spaces, quote markers and list markers.
// Each alternative starts with a different character class, so the match stays linear.
export const LEAD = String.raw`^(?:[ \t>]|[-*+][ \t]|\d{1,9}[.)][ \t])*#{1,6}[ \t]+`;
const FEATURE = new RegExp(`${LEAD}F-(\\d+)\\b`);

// Every `*.md` directly in the two folders but TEMPLATE.md and README.md, by folder then name:
// `{ path, regular, folder, md, ns, companionOf }`. `regular` is false for a link, anything that is not a file, or a
// file reached through a link, which is never opened (`md` null, `ns` empty). A folder that is there but is a link,
// sits under one or is not a folder is one entry, `folder` true and `path` the folder's, and nothing in it is listed.
// `ns` is every F-<n> a heading of the doc carries, as numbers, and `companionOf` its frontmatter's `companion-of:`
// as written, null when it has none. `dirs` narrows the folders read, so a caller can read each on its own; by
// default both.
export function readFeatureFiles(root, dirs = FEATURE_DIRS) {
  const files = [];
  for (const dir of dirs) {
    const abs = join(root, dir);
    const why = notPlainFolder(root, dir);
    if (why === MISSING) continue;
    if (why !== null) {
      files.push({ path: dir, regular: false, folder: true, md: null, ns: [], companionOf: null });
      continue;
    }
    for (const f of readdirSync(abs).filter((x) => x.endsWith('.md') && x !== 'TEMPLATE.md' && x !== 'README.md').sort()) {
      const path = `${dir}/${f}`;
      if (notPlainFile(root, path) !== null) {
        files.push({ path, regular: false, folder: false, md: null, ns: [], companionOf: null });
        continue;
      }
      const md = readFileSync(join(abs, f), 'utf8');
      const ns = [...new Set(visible(md).map((l) => l.text.match(FEATURE)).filter(Boolean).map((m) => Number(m[1])))];
      files.push({ path, regular: true, folder: false, md, ns, companionOf: (docFrontmatter(md) ?? {})['companion-of'] ?? null });
    }
  }
  return files;
}

// A doc's frontmatter, whatever its line endings and with a byte-order mark before it; null when it has none.
export const docFrontmatter = (md) => frontmatter(md.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n'));

// Whether a file readFeatureFiles() lists is a feature doc.
export const isFeatureDoc = (file) => file.regular && file.ns.length > 0 && file.companionOf === null;
