#!/usr/bin/env node
// P1 — PR body.
//
// Reads every *.md in the given directory as a pull-request body. In CI the directory
// holds one file, written from the pull_request event.
//
//   verification/missing     no `## Verification` section
//   verification/empty       empty, or only the template's comments
//   verification/prose-only  names no command, code block, check id or CI run —
//                            "tested locally" is a claim, not evidence
//   links/missing            `## Links` has no issue reference (#123) and no `none: <reason>`
//   gate-changes/missing     the PR touches a gate file (a path the harness asks before editing, markdown only
//                            when owner-only, a package.json `scripts`, `packageManager` or `pnpm` key, or a symlink
//                            or submodule link at any path: the folder it stands for may hold gate files) and has no
//                            `## Gate changes` section
//   gate-changes/unmentioned:<path>  a gate file the section has no line for
//   gate-changes/no-verdict:<path>   its line says neither stricter, the same, nor loosens
//   gate-changes/loosens-uncited:<path>  it loosens the gate and cites no decision or exception
//   gate-changes/lookalike:<path>    a path that reads as a gate path in canonical form (`.NPMRC`) but is not
//                            spelled as one: refused, whatever the section says
//
// A body's changed files come from a sidecar, `<name>.changes.json` ({files, scripts, globs, links}, written by
// ci/checks/lib/gate-files.mjs). Without one, the gate-changes rules do not run. The check cannot tell
// whether the sentence is true, only that one exists and that loosening is justified.
//
// WHY: when nothing at the merge boundary asks what was actually run, defects surface as
// same-day follow-up PRs repairing the one just merged. Template comments are stripped before reading, so an
// untouched template fails — its example `#123` is not a link.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gateGlobs, gateMatcher, globToRegExp, SETTINGS } from '../lib/gate-files.mjs';
import { section } from '../lib/markdown.mjs';
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
}

process.exit(
  report({
    id: 'P1',
    claim: 'every PR body names the evidence it was verified with and links its issue',
    scanned: bodies.length,
    unit: 'PR bodies',
    findings,
    broken,
  })
);
