#!/usr/bin/env node
// P1 — PR body.
//
// Reads every *.md in the given directory as a pull-request body. In CI the directory
// holds one file, written from the pull_request event.
//
//   body/comment-mark-crosses-heading  a `<!--` is closed by a `-->` beyond a heading: the check cannot tell
//                            a comment from two marks written as text, nor where a section ends, so it reads
//                            nothing else in that body
//   headings/repeated:<title>  a `## ` heading is written more than once (#265): the check reads the first copy of a
//                            section and a reader sees all of them, so a stale `## Cold review` or a second
//                            `## Verification` with no command passed. One finding per heading; fences, comments,
//                            indented code and `###` headings do not count
//   verification/missing     no `## Verification` section
//   verification/empty       empty, or only the template's comments
//   verification/prose-only  names no command, code block, check id or CI run —
//                            "tested locally" is a claim, not evidence
//   links/missing            `## Links` has no issue reference (#123) and no `none: <reason>`
//   links/open-unsaid        the body says `Part of #n` and closes nothing, has no `## Owed after merge` section and
//                            does not say it `leaves #n open`: work that merged with its issue open and nothing
//                            saying why (#241). The check cannot tell which issue the PR worked, only that the
//                            body says nothing about one staying open. A `Part of` counts wherever it is written,
//                            a code block included; what answers it counts only in the prose
//   links/closes-and-leaves-open:<n>  the prose holds a closing word before an issue and also says it `leaves` that issue `open` (#296, #323):
//                            GitHub closes the issue on merge from the closing word in any sentence, whoever the sentence is
//                            about, so the body says both things and the issue closes. Both sentences are read in the forms the
//                            closing word takes (`#n`, `owner/repo#n`, a full issues link) and compared by repository as well
//                            as number; a sentence with no repository may name the pull request's own, so it matches any. One
//                            finding per closing sentence, named `<n>` or `<owner/repo>#<n>`, with both lines quoted; code
//                            spans, fences and comments do not count, as for open-unsaid
//   followups/none-contradicted  `## Follow-ups` says none, and another section calls something a follow-up (#242):
//                            work deferred in a sentence that no issue holds. Code spans and fences do not count, so
//                            a quoted issue title cannot set it off; the check cannot tell a follow-up from the
//                            word, and a body that says it in some other way passes
//   followups/entry-unreferenced  a `## Follow-ups` entry has neither an issue reference (#n) nor `not filed:` and a reason
//   gate-changes/missing     the PR touches a gate file (a path the harness asks before editing, markdown only
//                            when owner-only, the invariants document or the cold-review file the base commit's
//                            AGENT.md names, `.gitmodules` or `.gitattributes`, a package.json run key, or a symlink
//                            or submodule link at any path: the folder it stands for may hold gate files) and has no
//                            `## Gate changes` section
//   gate-changes/unmentioned:<path>  a gate file the section has no line for
//   gate-changes/no-verdict:<path>   its line says neither stricter, the same, nor loosens
//   gate-changes/loosens-uncited:<path>  it loosens the gate and cites no decision or exception
//   gate-changes/lookalike:<path>    a path that reads as a gate path in canonical form (`.NPMRC`) but is not
//                            spelled as one: refused, whatever the section says
//
// A body's changed files come from a sidecar, `<name>.changes.json` ({files, scripts, globs, links}, written by
// ci/checks/lib/gate-files.mjs; `globs` holds the base commit's gate paths, the two named documents among them). Without one, the gate-changes rules do not run. The check cannot tell
// whether the sentence is true, only that one exists and that loosening is justified.
//
// WHY: when nothing at the merge boundary asks what was actually run, defects surface as
// same-day follow-up PRs repairing the one just merged. Template comments are stripped before reading, so an
// untouched template fails — its example `#123` is not a link.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gateGlobs, gateMatcher, globToRegExp, SETTINGS } from '../lib/gate-files.mjs';
import { commentCrossesHeading, prose, repeatedHeadings, section, strictSection } from '../lib/markdown.mjs';
import { report } from '../lib/report.mjs';

const EVIDENCE = /`[^`]+`|```|\b[MPIR]\d+\b|https:\/\/github\.com\/\S+\/actions\/runs\/\d+/;

const LOOSENS = /\b(loosen\w*|looser|weaker)\b/i;
const VERDICT = new RegExp(`\\b(stricter|same)\\b|${LOOSENS.source}`, 'i');
// A decision, an exception entry's id (`<workflow>#<job>`), or the registry named on a line about another file.
const CITATION = /\bP?D-\d+\b|[\w./-]+#[\w./-]+|ci\/exceptions\.yaml/;
const shown = (s) => s.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, '?'); // a file name is data: no line breaks in the log
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The path as a whole token on the line: `package.json` is not in `apps/web/package.json`.
const names = (line, path) => new RegExp(`(^|[^\\w./-])${escapeRe(path)}($|[^\\w./-]|\\.(?!\\w))`).test(line);

// Directory globs written on a line: `ci/checks/**`, `ci/fixtures/known-bad/p1/*.json`. A glob starts at a
// named directory, so `**/*` cannot cover a whole PR, and bold markers (`**stricter**`) are not globs.
const globsOn = (line) => (line.match(/[\w.*/-]*\*[\w.*/-]*/g) ?? []).filter((g) => g.includes('/') && !g.split('/')[0].includes('*'));

// `Part of #12`, `Part of: owner/repo#12`, `**Part of** [#12](…)`. The words GitHub closes an issue on, straight
// before an issue that can exist, negated or not: a body that would close an issue on merge has a closing link.
const REPO = '(?:[\\w.-]{1,100}\\/[\\w.-]{1,100})?';
const PART_OF = new RegExp(`\\bpart\\s{1,5}of[\\s:*_\\[]{1,8}${REPO}#(\\d{1,20})`, 'gi');
const CLOSES = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\\s{1,5}(?:https://github\\.com/[\\w.-]{1,100}/[\\w.-]{1,100}/issues/|${REPO}#)0{0,9}[1-9]`, 'i');
// An issue as the closing word reads it: `#n`, `owner/repo#n` or a full issues link. Groups: link owner, link repo,
// prefix owner, prefix repo, number.
const ISSUE_REF = '(?:https://github\\.com/([\\w.-]{1,100})/([\\w.-]{1,100})/issues/|(?:([\\w.-]{1,100})/([\\w.-]{1,100}))?#)0{0,9}([1-9]\\d{0,19})';
const CLOSES_N = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\\s{1,5}${ISSUE_REF}`, 'gi');
const LEAVES = new RegExp(`\\bleaves\\s{1,5}${REPO}#(\\d{1,20})\\s{1,5}open\\b`, 'gi');
const LEAVES_REF = new RegExp(`\\bleaves\\s{1,5}${ISSUE_REF}\\s{1,5}open\\b`, 'gi');
// The issue a match names: its repository (lower case, GitHub reads names without case; '' when the sentence leaves it
// to the pull request's own) and its number.
const issueOf = (m) => ({ repo: ((m[1] ? `${m[1]}/${m[2]}` : m[3] ? `${m[3]}/${m[4]}` : '')).toLowerCase(), n: m[5] });
// One issue, or one that may be: a sentence with no repository names the pull request's own, which the check does not know.
const sameIssue = (a, b) => a.n === b.n && (!a.repo || !b.repo || a.repo === b.repo);
// The two readings of a body the open-unsaid rule takes (#241). What sets the rule off is read from everything but
// closed comments, so no mark written as text (a `<!--` in inline code, a one-line fence, a leading `---` block) hides
// a `Part of` that GitHub shows. What answers it is read from the prose alone, with fenced and indented code, inline
// code and comments taken out, so a plain example of a closing link, of the section or of the sentence answers
// nothing. A body written to quote an answer in some other form can still pass.
const stated = (md) => md.replace(/<!--[\s\S]*?-->/g, '');
const written = (md) => prose(md).split(/\r?\n/).filter((l) => !/^(?: {4}|\t)/.test(l)).join('\n').replace(/`[^`\n]*`/g, ' ');

// `## Follow-ups` against the rest of the body (#242). Read from the prose with fences, comments and inline code taken
// out (so a quoted title or example answers and triggers nothing), indented lines kept: a nested bullet is prose.
// Headings are not prose: the template's own `## Follow-ups` line is not a mention. "no follow-ups" (not one followed by a colon, which names the work) and the skill's
// own `/log-followup` are not a mention either.
const FOLLOW_UP = /(?<![\w/-])follow[-\s]?ups?\b/i;
const DENIED = /\b(?:no|zero|without|none)\s+follow[-\s]?ups?\b(?!\s*:)/gi;
const NONE = /^(?:[-*+]\s+)?none\b/i;
const ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])\s/;
const HEADING = /^ {0,3}#{1,6}(?:\s|$)/;
const FOLLOW_HEADING = /^##[^\S\n]+Follow-ups[^\S\n]*$/i;
const ENDS = /^ {0,3}#{1,2}(?:\s|$)/;
const seen = (md) => prose(md).replace(/\r\n?/g, '\n').replace(/`[^`\n]*`/g, ' ');
// The entries of one section: its list items, or its blank-line-separated paragraphs when it has none; a heading
// inside it is not an entry, and prose after a leading "none" elaborates it.
const entriesOf = (lines) => {
  const body = lines.filter((l) => l.trim() && !HEADING.test(l));
  const hasItem = body.some((l) => ITEM.test(l));
  const items = [];
  if (hasItem) {
    for (const l of body) {
      if (ITEM.test(l) || !items.length) items.push(l.trim());
      else items[items.length - 1] += ` ${l.trim()}`;
    }
    return items;
  }
  let gap = true;
  for (const l of lines) {
    if (!l.trim()) gap = true;
    else if (HEADING.test(l)) gap = true;
    else if (gap || !items.length) { items.push(l.trim()); gap = false; }
    else items[items.length - 1] += ` ${l.trim()}`;
  }
  return NONE.test(items[0] ?? '') ? items.slice(0, 1) : items;
};
// Every `## Follow-ups` section, not only the first: { sections: [entries], outside: [lines] }, null with none.
const followUps = (md) => {
  const lines = seen(md).split('\n');
  const sections = [];
  const outside = [];
  let into = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const setext = into && into.length && /^(?:=+|-+)$/.test(l.replace(/\s+/g, '')) && into.length > 1;
    if (FOLLOW_HEADING.test(l)) { into = []; sections.push(into); continue; }
    if (into && (ENDS.test(l) || setext)) into = null;
    (into ?? outside).push(l);
  }
  return sections.length ? { sections: sections.map(entriesOf), outside } : null;
};

const dir = process.argv[2] ?? '.';
const bodies = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
const findings = [];
let broken = null;
// The harness's own rules are the list of gate paths: none read means every gate file would pass unseen.
let rules = 0;
try {
  rules = gateGlobs(readFileSync(SETTINGS, 'utf8')).length;
} catch {}

for (const f of bodies) {
  const md = readFileSync(join(dir, f), 'utf8');
  if (commentCrossesHeading(md)) {
    findings.push({ where: `${f}#body/comment-mark-crosses-heading`, detail: 'a comment opener in this body is closed beyond a heading, so the check cannot tell hidden text from shown, nor where a section ends; close it in the same section, or write the mark in words' });
    continue;
  }
  for (const h of repeatedHeadings(md)) {
    findings.push({ where: `${f}#headings/repeated:${shown(h.key)}`, detail: `\`## ${shown(h.title)}\` is written ${h.count} times; the check reads one copy and a reader sees all of them. Keep one \`## ${shown(h.title)}\` section: rewrite it for the final state of the PR and delete the others` });
  }
  const v = section(md, 'Verification', 2);
  if (v === null) findings.push({ where: `${f}#verification/missing`, detail: 'no `## Verification` section' });
  else if (v === '') findings.push({ where: `${f}#verification/empty`, detail: 'Verification is empty or only template comments' });
  else if (!EVIDENCE.test(v)) {
    findings.push({ where: `${f}#verification/prose-only`, detail: 'Verification names no command, code block or CI run' });
  }
  const sidecar = join(dir, f.replace(/\.md$/, '.changes.json'));
  if (existsSync(sidecar)) {
    let c;
    try {
      c = JSON.parse(readFileSync(sidecar, 'utf8'));
      if (!Array.isArray(c.files) || !Array.isArray(c.scripts) || !Array.isArray(c.links)) throw new Error('needs files, scripts and links lists');
    } catch (e) {
      c = { files: [], scripts: [], globs: [], links: [] };
      findings.push({ where: `${f}#gate-changes/unreadable`, detail: `the changed-files list beside the body is unreadable (${String(e.message).split('\n')[0]}); the workflow must write it` });
    }
    if (rules === 0) {
      broken = 'process/harness/settings.json is missing or lists no Edit(...) gate paths, so no gate file can be recognised';
      continue;
    }
    const isGate = gateMatcher(undefined, Array.isArray(c.globs) ? c.globs : []);
    for (const path of c.files) {
      const like = isGate.lookalike(path);
      if (like) findings.push({ where: `${f}#gate-changes/lookalike:${shown(path)}`, detail: `${shown(path)} looks like ${like} but isn't spelled that way; a case-insensitive disk reads it as the gate file. Rename or remove it: it cannot be declared` });
    }
    const touched = [...new Set([...c.files.filter(isGate), ...c.links, ...c.scripts.map((p) => `${p} scripts`)])];
    if (touched.length) {
      const gc = section(md, 'Gate changes', 2);
      const next = 'add `## Gate changes` with one line per file, or per directory glob (`ci/fixtures/x/**`): `path — stricter | the same | loosens (cite a decision or ci/exceptions.yaml): why`';
      if (!gc) findings.push({ where: `${f}#gate-changes/missing`, detail: `the PR touches gate files (${touched.map(shown).join(', ')}); ${next}` });
      else {
        const lines = gc.split(/\r?\n/);
        for (const t of touched) {
          const path = t.replace(/ scripts$/, '');
          // A line covers a file when it names the path, or names a directory glob that matches it
          // (`ci/fixtures/known-bad/p1/**`). A glob covers only what it matches.
          const covers = (l) => globsOn(l).filter((g) => globToRegExp(g).test(path));
          const own = lines.filter((l) => names(l, path) || covers(l).length);
          if (!own.length) findings.push({ where: `${f}#gate-changes/unmentioned:${shown(t)}`, detail: `Gate changes has no line for ${shown(t)}; ${next}` });
          else if (!own.some((l) => VERDICT.test(l))) findings.push({ where: `${f}#gate-changes/no-verdict:${shown(t)}`, detail: `the line for ${shown(t)} says neither stricter, the same, nor loosens; say which, and why` });
          else if (own.some((l) => LOOSENS.test(l) && !CITATION.test([path, ...covers(l)].reduce((text, x) => text.split(x).join(' '), l)))) {
            findings.push({ where: `${f}#gate-changes/loosens-uncited:${shown(t)}`, detail: `the line for ${shown(t)} loosens the gate; cite the decision (D-n) or the ci/exceptions.yaml entry that allows it, or make the gate no looser` });
          }
        }
      }
    }
  }
  const links = section(md, 'Links', 2);
  if (links === null || !(/#\d+/.test(links) || /^\s*none:\s*\S/im.test(links))) {
    findings.push({ where: `${f}#links/missing`, detail: '`## Links` needs an issue reference (#123) or `none: <reason>`' });
  }
  const partOf = [...new Set([...stated(md).matchAll(PART_OF)].map((m) => m[1]))];
  const said = written(md);
  const left = [...said.matchAll(LEAVES)].some((m) => partOf.includes(m[1]));
  if (partOf.length && !CLOSES.test(said) && !strictSection(said, 'Owed after merge', 2)?.trim() && !left) {
    const n = partOf[0];
    findings.push({ where: `${f}#links/open-unsaid`, detail: `the body says \`Part of #${n}\` and closes nothing. If this PR finishes an issue, close it: \`Closes #n\`. If it leaves a check for after merge, add \`## Owed after merge\` and say which issue it leaves open. Only if it finishes nothing, say it \`leaves #${n} open\`, and why` });
  }
  // The sentence that closes an issue and the sentence that says it stays open (#296): GitHub reads the first.
  const lineOf = (m) => said.slice(0, m.index).split('\n').length - 1;
  const quote = (m) => shown(said.split('\n')[lineOf(m)].slice(0, m.index - said.lastIndexOf('\n', m.index - 1) - 1 + m[0].length).trim().slice(-80));
  const closing = [...said.matchAll(CLOSES_N)];
  const reported = new Set();
  for (const stay of said.matchAll(LEAVES_REF)) {
    const left = issueOf(stay);
    const closes = closing.find((m) => sameIssue(issueOf(m), left));
    if (!closes || reported.has(closes)) continue;
    reported.add(closes);
    const named = issueOf(closes).repo || left.repo;
    const id = named ? `${named}#${left.n}` : left.n;
    findings.push({ where: `${f}#links/closes-and-leaves-open:${id}`, detail: `the body closes #${left.n} ("${quote(closes)}") and also says it leaves #${left.n} open ("${quote(stay)}"): GitHub closes #${left.n} when this merges, whoever the first sentence is about. Write the number before the verb, or name the pull request that finishes it with no closing word` });
  }
  const fu = followUps(md);
  if (fu) {
    const mentions = fu.outside.filter((l) => !HEADING.test(l) && FOLLOW_UP.test(l.replace(DENIED, ' ')));
    if (fu.sections.every((e) => e.length === 1 && NONE.test(e[0])) && mentions.length) {
      findings.push({ where: `${f}#followups/none-contradicted`, detail: `\`## Follow-ups\` says none, and another section says "${mentions[0].trim().slice(0, 80)}": work deferred in a sentence has no issue. List it under Follow-ups as \`#n — title\` (\`/log-followup\`), or \`not filed: {why}\`, or take the word out of the other section` });
    }
    fu.sections.flat().forEach((e, i) => {
      if (!NONE.test(e) && !/#\d/.test(e) && !/\/(?:issues|pull)\/\d/.test(e) && !/\bnot filed:\s*\S/i.test(e)) {
        findings.push({ where: `${f}#followups/entry-unreferenced:${i + 1}`, detail: `Follow-ups entry ${i + 1} ("${e.slice(0, 60)}") has no issue reference and no \`not filed: {why}\`; file it with \`/log-followup\` and write \`#n — title\`, or say why none was filed` });
      }
    });
  }
}

process.exit(
  report({
    id: 'P1',
    claim: 'every PR body names the evidence it was verified with, links its issue, and says so when it leaves that issue open',
    scanned: bodies.length,
    unit: 'PR bodies',
    findings,
    broken,
  })
);
