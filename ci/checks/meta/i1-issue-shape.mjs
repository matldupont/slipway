#!/usr/bin/env node
// I1 — issue shape.
//
// Reads every *.md in the given directory as an issue body, as GitHub renders an issue
// form: each field becomes `### <label>`, an empty field `_No response_`. An issue made
// with `gh issue create` and free prose has no fields at all, and fails — the web form
// enforces shape; this is what catches the API path.
//
//   acceptance/missing          no acceptance criteria
//   ac/unfalsifiable/<n>        item n has no number, no `code`, no comparison, does not
//                               start with Given/When/Then, and has no #ref — an adjective
//   seams/unanswered            person, channel or promise? not answered; silence is not `none`
//   seams/none-without-reason   `none` with no reason
//   seams/unenumerated          a Seams line that is not `<label>: <detail>` (or the one `none: <reason>` line)
//   designation/trailer         (warning) the body's last non-empty line starts `Per `: a sentence after the
//                               designation block, which the block is without (`process/intake.md` → Issue body)
//   contract/missing            Links says Lane: feature, no Contract section
//   contract/link-only          Contract has fewer than 8 non-link words — nothing copied in
//   verify/missing              Links says Lane: feature, no Verify section
//   verify/link-only            Verify has fewer than 8 non-link words — nothing copied in
//
// Seams is one field (the forms, #460): one line per seam, `<label>: <detail>`, in a list (`-`, `*`, `+`, `1.` or `1)`),
// or the single line `none: <reason>`. A line is read after its marker, checkbox, emphasis, code marks and links
// are taken off, and it needs a colon with a letter or digit on each side. A `none` label with no reason is
// `seams/none-without-reason`; any other line of a different shape is `seams/unenumerated`. The check holds the
// shape, not the meaning: a padded `a: b` passes, as a form can always be filled with words, and `who pays: n/a`
// and `none: n/a` pass on purpose (`seams-one-field-na-detail-good.md`, `-none-na-good.md`): they say something, and
// whether it is true is for a reader. What a reader does not see is no reason: HTML tags, processing instructions,
// CDATA, declarations, entities, and the invisible letters U+115F, U+1160, U+3164 and U+FFA0. (Comments are gone
// before this reads: `section()` takes them off.) A `<…>` that is not a tag, a tag inside a code span, and `<script>`
// or `<style>`, which GitHub shows as text, are shown, so they count. A colon inside an autolink (`http(s)://`, `mailto:`,
// `xmpp:`, `www.`) is not the label's. A lone CR is not a line end: GitHub sends CRLF, and a fixture with a CR byte fails
// scripts/new-project.test.mjs, so none could hold the clause. After `none: <reason>`, which may wrap, a line that opens a list or starts
// `none:` is a second answer and fails; so does a list item indented up to three spaces.
//
// KNOWN LIMITATION: this reads the shapes CommonMark gives a Seams line, not every way GitHub can hide one. Still
// shown as an answer: an unclosed `<?`, `<!X` or `<![CDATA[` that opens a list item, a code span inside a raw HTML block
// (`<p>`…`</p>`), an image's alt text, `<details>`, an unclosed comment, a link reference definition, and a lone CR.
// A body built to hide its reason passes, as a padded `a: b` does; that is cold review's, not this check's. Each
// scan is bounded or remembered: this runs on whatever an issue holds, and a body of 65,000 openers costs 0.03s.
//
// A body that still carries a `### Seams detail` heading, filed on the old form, is read the old way: Seams, then its detail.
//
// WHY: an issue whose acceptance criteria cannot fail closes, then reopens. A conditional
// rule — "answer seams whenever the feature adds a person…" — makes an absent section
// indistinguishable from correct non-application, so in practice it is skipped. Here the
// question is always asked.
//
// A feature-lane issue must carry its feature doc's Contract and Verify copied in, never
// linked (`process/intake.md` → Issue body): the issue is built from its own body.
// "Link-only" is a word count, not a regex over the whole section: split on whitespace, drop
// any token that is a URL or a markdown link/reference (`://`, or starts `[` or `<http`), and
// if fewer than 8 words remain, the section named a doc instead of embedding it. This also
// catches a Contract that is just thin — a real one is never seven words — and it is O(n):
// no backtracking, no cap on link length to get wrong. A section that embeds real content and
// also links the doc passes — the rule is about what's missing, not about citing a source.
//
// KNOWN LIMITATION: this counts words, not meaning. Eight words of filler in front of a link
// ("Please go read the linked document over here: [doc](url)") clears the floor and passes.
// I1 catches the honest mistake of linking instead of embedding; it is not a defense against
// someone gaming it on purpose — that is cold review's job, not a static check's. See
// `ci/fixtures/known-bad/i1/feature-padded-link.md`, kept passing on purpose so the gap is
// documented, not hidden.
//
// RESIDUAL, stated so green is not over-read: this catches adjectives ("lower contrast"),
// not criteria that cannot fail. "Returns HTTP 200" passes. That class belongs to cold
// review.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isNoResponse, plain, section, sectionLines } from '../lib/markdown.mjs';
import { report } from '../lib/report.mjs';

const SEAMS_SHAPE = 'write one line per seam, `who pays: …` (a label, a colon, then what), in a list; or the one line `none: <one line of why>`';
// What GitHub does not show, and what it does (CommonMark's open-tag grammar: an attribute is a name and an optional
// value). GitHub's tag filter shows `<script>`, `<style>` and the other tags in FILTERED as text, so they are not hidden.
const FILTERED = 'title|textarea|style|xmp|iframe|noembed|noframes|script|plaintext';
const SPACE = String.raw`(?:[ \t]|\n(?![ \t]*(?:\n|$)))`; // whitespace that stays inside a paragraph: a tag does not cross a blank line
const ATTRIBUTE = String.raw`${SPACE}+[A-Za-z_:][\w.:-]*(?:${SPACE}*=${SPACE}*(?:[^\s"'=<>\x60]+|'[^']*'|"[^"]*"))?`;
const NAME = String.raw`(?!(?:${FILTERED})(?=[\s/>]))[A-Za-z][A-Za-z\d-]*`;
const TAG = new RegExp(String.raw`<(?:${NAME}(?:${ATTRIBUTE})*${SPACE}*\/?>|\/${NAME}${SPACE}*>)|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);`, 'iy');
const DECLARATION = /<![A-Za-z]/y;
const BLANK = /\n[ \t]*\n/g;
// Where a line starts a block: a code span does not run past it (a blank line, a quote, a heading, a list item, a
// rule, a fence or an HTML block).
const BLOCK_START = /\n {0,3}(?:\n|[>]|#{1,6}(?:\s|$)|[-*+][ \t]+\S|1[.)][ \t]+\S|=+[ \t]*(?:\n|$)|(?:\*[ \t]*){3,}(?:\n|$)|(?:-[ \t]*){3,}(?:\n|$)|`{3,}|~{3,}|<[?!]|<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|script|search|section|style|summary|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul)(?=[\s/>]|$))/gi;
// The text of a Seams field as a reader sees it: HTML and entities dropped, except inside a code span. Read left to
// right in one pass, so what starts first wins: a backtick in a tag's attribute opens no code span, a backslash
// escapes one, and a run of backticks closes only with a run of its own length. Every scan is bounded or remembered,
// so a body of openers that never close costs a linear read: this runs on whatever an issue holds.
function shown(text) {
  const runs = [...text.matchAll(/`+/g)].map((m) => ({ at: m.index, n: m[0].length }));
  const blocks = [...text.matchAll(BLOCK_START)].map((m) => m.index);
  let run = 0;
  let block = 0;
  const gone = { pi: false, cdata: false, decl: false };
  const blanks = [...text.matchAll(BLANK)].map((m) => m.index);
  let blank = 0;
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\' && i + 1 < text.length) {
      out += text.slice(i, i + 2);
      i += 2;
    } else if (c === '`') {
      while (runs[run].at + runs[run].n <= i) run += 1;
      const n = runs[run].at + runs[run].n - i; // an escaped backtick leaves the rest of its run
      while (block < blocks.length && blocks[block] < i) block += 1;
      const limit = blocks[block] ?? text.length;
      let close = run + 1;
      while (close < runs.length && runs[close].at < limit && runs[close].n !== n) close += 1;
      const end = close < runs.length && runs[close].at < limit ? runs[close].at + n : i + n;
      out += text.slice(i, end);
      i = end;
    } else if (c === '<' || c === '&') {
      let len = 0;
      if (text.startsWith('<?', i) && !gone.pi) {
        const at = text.indexOf('?>', i + 2);
        if (at < 0) gone.pi = true;
        else len = at + 2 - i;
      } else if (text.startsWith('<![CDATA[', i) && !gone.cdata) {
        const at = text.indexOf(']]>', i + 9);
        if (at < 0) gone.cdata = true;
        else len = at + 3 - i;
      } else {
        TAG.lastIndex = i;
        DECLARATION.lastIndex = i;
        len = TAG.exec(text)?.[0].length ?? 0;
        if (!len && !gone.decl && DECLARATION.exec(text)) {
          // a declaration ends at the next `>`, and not past a blank line
          const at = text.indexOf('>', i + 3);
          while (blank < blanks.length && blanks[blank] < i) blank += 1;
          if (at < 0) gone.decl = true;
          else if ((blanks[blank] ?? Infinity) > at) len = at + 1 - i;
        }
      }
      if (len) i += len;
      else {
        out += c;
        i += 1;
      }
    } else {
      out += c;
      i += 1;
    }
  }
  return out;
}
// What GitHub turns into a link without brackets: its colons are not a label's. It leaves a trailing `:` or an
// unbalanced `)` out of the link.
const AUTOLINK = /\b(?:https?:\/\/|mailto:|xmpp:|www\.)[^\s<]*/gi;
function autolinked(url) {
  let end = url.length;
  let close = url.split(')').length - url.split('(').length;
  while (end > 0) {
    const c = url[end - 1];
    if ('?!.,:;*_~\'"'.includes(c)) end -= 1;
    else if (c === ')' && close > 0) {
      end -= 1;
      close -= 1;
    } else break;
  }
  return end;
}
const INVISIBLE = /[\u115F\u1160\u3164\uFFA0]/g;
const LINE_END = /\r?\n/;

const NONE_REASON = 'a `none` needs a reason on the same line: `none: <one line of why>`';
const FALSIFIABLE = /\d|`[^`]+`|[<>≤≥]|[=!]=|^(given|when|then)\b|#\d+/i;
const LANE_FEATURE = /Lane:\s*`?feature`?\b/i;
const isReference = (word) => word.includes('://') || word.startsWith('[') || word.startsWith('<http');

// Fewer than 8 non-reference words left after dropping URLs and markdown links: the section
// named where the contract lives (or said almost nothing) instead of embedding it.
function linkOnly(text) {
  const words = text.split(/\s+/).filter(Boolean).filter((w) => !isReference(w));
  return words.length < 8;
}

function items(text) {
  const lines = text.split(LINE_END).map((l) => l.trim()).filter((l) => l && !/^```/.test(l));
  const listed = lines
    .filter((l) => /^([-*]|\d+\.)\s+/.test(l))
    .map((l) => l.replace(/^([-*]|\d+\.)\s+(\[[ xX]\]\s+)?/, ''));
  return listed.length ? listed : lines;
}

const dir = process.argv[2] ?? '.';
const bodies = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
const findings = [];
const warnings = [];

for (const f of bodies) {
  const md = readFileSync(join(dir, f), 'utf8');

  const ac = section(md, 'Acceptance', 3);
  if (isNoResponse(ac)) {
    findings.push({ where: `${f}#acceptance/missing`, detail: 'no acceptance criteria: add an Acceptance section, one checkable line each (a number, a command, a comparison, Given/When/Then or an issue reference)' });
  } else {
    items(ac).forEach((item, n) => {
      if (!FALSIFIABLE.test(item)) {
        findings.push({
          where: `${f}#ac/unfalsifiable/${n + 1}`,
          detail: `"${item}" names no number, command, comparison, Given/When/Then or issue reference (#12) — an adjective, not a test`,
        });
      }
    });
  }

  const seams = section(md, 'Seams', 3);
  const detail = section(md, 'Seams detail', 3);
  if (isNoResponse(seams)) {
    findings.push({ where: `${f}#seams/unanswered`, detail: 'Seams — does this add a person, a channel or a promise? — unanswered; answer `none: <one line of why>`, or one `<label>: <detail>` list item per seam' });
  } else if (sectionLines(md, 'Seams detail', 3) === null) {
    const lines = shown(seams).split(LINE_END).filter((l) => l.trim());
    const hasText = (t) => /[\p{L}\p{N}]/u.test(t.replace(INVISIBLE, ''));
    const marker = /^([-*+]|\d+[.)])\s+/;
    // a line that opens a list (a `1.` or `1)` can interrupt a paragraph, a `7.` cannot) or starts a second `none:`
    const opensAnswer = (l) => /^ {0,3}([-*+]|0*1[.)])\s+/.test(l) || /^ {0,3}[*_]*none[*_]*\s*:/i.test(l);
    // 'ok' (`label: detail`), 'none-ok' (`none: reason`), 'none' (a `none` with no reason) or 'bad'
    const kind = (line) => {
      const text = plain(line.replace(marker, '').replace(/^\[[ xX]\]\s+/, ''));
      const colon = text.replace(AUTOLINK, (url) => { const n = autolinked(url); return '_'.repeat(n) + url.slice(n); }).indexOf(':');
      const label = (colon < 0 ? text : text.slice(0, colon)).trim();
      const detail = colon < 0 ? '' : text.slice(colon + 1);
      if (/^none\b/i.test(label)) return /^none$/i.test(label) && hasText(detail) ? 'none-ok' : 'none';
      return hasText(label) && hasText(detail) ? 'ok' : 'bad';
    };
    const unindented = lines.filter((l) => !/^\s/.test(l));
    const kinds = unindented.map(kind);
    if (!marker.test(lines[0] ?? '')) {
      // the line `none: <reason>`, which may wrap onto lines that do not open a list or a second answer
      if (kinds[0] === 'none') findings.push({ where: `${f}#seams/none-without-reason`, detail: NONE_REASON });
      else if (kinds[0] !== 'none-ok' || lines.slice(1).some(opensAnswer)) findings.push({ where: `${f}#seams/unenumerated`, detail: SEAMS_SHAPE });
    } else if (!unindented.every((l) => marker.test(l))) {
      findings.push({ where: `${f}#seams/unenumerated`, detail: SEAMS_SHAPE });
    } else if (kinds.includes('none')) {
      findings.push({ where: `${f}#seams/none-without-reason`, detail: NONE_REASON });
    } else if (kinds.includes('bad')) {
      findings.push({ where: `${f}#seams/unenumerated`, detail: SEAMS_SHAPE });
    }
  } else if (/^none\b/i.test(seams)) {
    if (isNoResponse(detail)) findings.push({ where: `${f}#seams/none-without-reason`, detail: '`none` needs one line of why' });
  } else if (isNoResponse(detail)) {
    findings.push({ where: `${f}#seams/unenumerated`, detail: 'name who pays, who is counted, who is told, what is promised' });
  }

  const last = md.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).at(-1) ?? '';
  if (/^Per /.test(last)) {
    warnings.push({ where: `${f}#designation/trailer`, detail: 'the last line starts `Per `: the designation block is the code block alone, with no sentence after it (process/intake.md → Issue body)' });
  }

  const links = section(md, 'Links', 3);
  if (links && LANE_FEATURE.test(links)) {
    for (const [name, id] of [['Contract', 'contract'], ['Verify', 'verify']]) {
      const body = section(md, name, 3);
      if (isNoResponse(body)) {
        findings.push({ where: `${f}#${id}/missing`, detail: `Links says Lane: feature, so ### ${name} must be copied in from the feature doc, never only linked — it is missing` });
      } else if (linkOnly(body)) {
        findings.push({ where: `${f}#${id}/link-only`, detail: `### ${name} only points at the feature doc — copy the ${name.toLowerCase()} in, don't link it` });
      }
    }
  }
}

process.exit(
  report({
    id: 'I1',
    claim: 'every issue has acceptance criteria that are not bare adjectives, an answered seams question, and — for Lane: feature — a Contract and Verify copied in',
    scanned: bodies.length,
    unit: 'issue bodies',
    findings,
    warnings,
  })
);
