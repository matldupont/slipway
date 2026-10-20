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
//   seams/unenumerated          a person, channel or promise with no detail
//   designation/trailer         (warning) the body's last non-empty line starts `Per `: a sentence after the
//                               designation block, which the block is without (`process/intake.md` → Issue body)
//   contract/missing            Links says Lane: feature, no Contract section
//   contract/link-only          Contract has fewer than 8 non-link words — nothing copied in
//   verify/missing              Links says Lane: feature, no Verify section
//   verify/link-only            Verify has fewer than 8 non-link words — nothing copied in
//
// Seams is one field (the forms, #460): one line per seam, `<label>: <detail>`, in a list (`-`, `*`, `+` or `1.`),
// or the single line `none: <reason>`. A line is read after its marker, checkbox, emphasis, code marks and links
// are taken off, and it needs a colon with a letter or digit on each side. A `none` label with no reason is
// `seams/none-without-reason`; any other line of a different shape is `seams/unenumerated`. The check holds the
// shape, not the meaning: a padded `a: b` passes, as a form can always be filled with words. A body that still
// carries a `### Seams detail` heading, filed on the old form, is read the old way: Seams, then its detail.
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
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^```/.test(l));
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
    findings.push({ where: `${f}#seams/unanswered`, detail: 'Seams — does this add a person, a channel or a promise? — unanswered; answer `none: <one line of why>`, or one list item per seam' });
  } else if (sectionLines(md, 'Seams detail', 3) === null) {
    const lines = seams.split(/\r?\n/).filter((l) => l.trim());
    const hasText = /[\p{L}\p{N}]/u;
    const marker = /^([-*+]|\d+\.)\s+/;
    // what a reader does not see as text: HTML tags and entities
    const unseen = (t) => t.replace(/<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/g, '').replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi, '');
    // 'ok' (`label: detail`), 'none-ok' (`none: reason`), 'none' (a `none` with no reason) or 'bad'
    const kind = (line) => {
      const text = unseen(plain(unseen(line.replace(marker, '').replace(/^\[[ xX]\]\s+/, ''))));
      const colon = text.indexOf(':');
      const label = (colon < 0 ? text : text.slice(0, colon)).trim();
      const detail = colon < 0 ? '' : text.slice(colon + 1);
      if (/^none\b/i.test(label)) return /^none$/i.test(label) && hasText.test(detail) ? 'none-ok' : 'none';
      return hasText.test(label) && hasText.test(detail) ? 'ok' : 'bad';
    };
    const unindented = lines.filter((l) => !/^\s/.test(l));
    const kinds = unindented.map(kind);
    if (!marker.test(lines[0])) {
      // the line `none: <reason>`, which may wrap onto lines that are not list items; a list item after it is the wrong shape
      if (kinds[0] === 'none') findings.push({ where: `${f}#seams/none-without-reason`, detail: NONE_REASON });
      else if (kinds[0] !== 'none-ok' || unindented.slice(1).some((l) => marker.test(l))) findings.push({ where: `${f}#seams/unenumerated`, detail: SEAMS_SHAPE });
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
