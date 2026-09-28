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
//   contract/missing            Links says Lane: feature, no Contract section
//   contract/link-only          Contract is only a link/reference — nothing copied in
//   verify/missing              Links says Lane: feature, no Verify section
//   verify/link-only            Verify is only a link/reference — nothing copied in
//
// WHY: an issue whose acceptance criteria cannot fail closes, then reopens. A conditional
// rule — "answer seams whenever the feature adds a person…" — makes an absent section
// indistinguishable from correct non-application, so in practice it is skipped. Here the
// question is always asked.
//
// A feature-lane issue must carry its feature doc's Contract and Verify copied in, never
// linked (`process/intake.md` → Issue body): the issue is built from its own body. "Only a
// link" is read narrowly, so it cannot be gamed by padding: strip every markdown link, bare
// URL, issue reference and backtick path, and if nothing but filler words is left, the
// section named a doc instead of embedding it. A Contract that both embeds real content and
// also links the doc passes — the rule is about what's missing, not about citing a source.
//
// RESIDUAL, stated so green is not over-read: this catches adjectives ("lower contrast"),
// not criteria that cannot fail. "Returns HTTP 200" passes. That class belongs to cold
// review.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isNoResponse, section } from '../lib/markdown.mjs';
import { report } from '../lib/report.mjs';

const FALSIFIABLE = /\d|`[^`]+`|[<>≤≥]|[=!]=|^(given|when|then)\b|#\d+/i;
const LANE_FEATURE = /Lane:\s*`?feature`?\b/i;
const REFERENCE = /\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|#\d+|`[^`]+`/g;
const FILLER = /^(see|full|contract|verify|refer|refers|to|in|per|the|doc|for)$/i;

// True once every link/URL/issue-ref/path is stripped and nothing but filler words remains —
// so the section named where the contract lives instead of copying it in.
function linkOnly(text) {
  REFERENCE.lastIndex = 0;
  if (!REFERENCE.test(text)) return false;
  const words = text.replace(REFERENCE, ' ').split(/\s+/).map((w) => w.replace(/[.:,]/g, '')).filter(Boolean);
  return words.every((w) => FILLER.test(w));
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
    findings.push({ where: `${f}#seams/unanswered`, detail: 'Seams — does this add a person, a channel or a promise? — unanswered; answer `none` with one line of why, or name them' });
  } else if (/^none\b/i.test(seams)) {
    if (isNoResponse(detail)) findings.push({ where: `${f}#seams/none-without-reason`, detail: '`none` needs one line of why' });
  } else if (isNoResponse(detail)) {
    findings.push({ where: `${f}#seams/unenumerated`, detail: 'name who pays, who is counted, who is told, what is promised' });
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
  })
);
