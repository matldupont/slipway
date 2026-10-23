#!/usr/bin/env node
// ID2 — no two open pull requests add one id.
//
// ID1 reads one tree, so two open pull requests that each add `## PD-7` both pass it, and the second to merge turns
// the default branch red, or lands where git merges cleanly (#478). ID2 compares the ids this pull request's diff adds
// with the ids every other open pull request's diff adds:
//
//   open-pr/<n>/<id>   pull request #<n> also adds a heading for <id>; one finding per pull request and id
//
// It reads a folder that lib/open-pr-ids.mjs writes, never the network, so its fixtures run offline:
//
//   <dir>/this.diff        this pull request's diff, `git diff` of decisions.md and the feature folders
//   <dir>/open/<n>.diff    each other open pull request's diff, the same paths; <n> is digits only
//   <dir>/not-a-pull-request   in place of both: a push, with no pull request to compare (said, and green)
//
// What counts as adding an id. An added line (`+`) of decisions.md that is a decision heading (`D-<n>`, `PD-<n>`), or of
// a `*.md` directly in docs/features/ or dev/features/ (TEMPLATE.md and README.md aside) that is an `F-<n>` heading,
// read as ID1 reads one (lib/feature-docs.mjs: LEAD, nothing skipped, look-alikes folded), and ids compare by number.
// A diff that also removes a heading with that id in the same file kind is an edit or a move, not a new id, so it
// adds nothing. Only the ids this pull request adds are compared, and a pull request that adds none reads no other: a
// clash between two other pull requests is their own run's finding. When two are opened at once both go red, and
// renumbering one clears both at their next runs.
//
// The other pull requests are untrusted text. Only `#<n>` and the id are printed, never a path or a heading's other
// text, and a diff that cannot be read cleanly is BROKEN, never a pass, naming the pull request: a `+++` path git had
// to quote, a file git shows as binary, a file name that is not digits, a missing folder.
//
// `--next` (process/intake.md → Next free number): `this.diff` is then the default branch as one diff from the empty
// tree, and ID2 prints the highest id of each series (D, PD, F) on it and in the open pull requests, each pull request's
// added ids, and the next free one of each. Only `#<n>`, ids and numbers are printed, so a session taking a number never
// reads another pull request's text.

import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEAD, visible } from '../lib/feature-docs.mjs';
import { report } from '../lib/report.mjs';

const dir = process.argv[2];
const next = process.argv[3] === '--next';
const DECISION = new RegExp(`${LEAD}(P?D)-(\\d+)\\b`);
const FEATURE = new RegExp(`${LEAD}F-(\\d+)\\b`);
const FEATURE_DOC = /^(?:docs|dev)\/features\/([^/]+\.md)$/;

// The kind of file a path is for ID2: 'decision', 'feature' or null (not read).
const kindOf = (path) => {
  if (path === 'decisions.md') return 'decision';
  const m = path.match(FEATURE_DOC);
  return m && m[1] !== 'TEMPLATE.md' && m[1] !== 'README.md' ? 'feature' : null;
};
// An id's number as written, leading zeros dropped: D-9 and D-009 are one id, and a number of any length stays exact.
const digits = (d) => d.replace(/^0+(?=\d)/, '');
const idOf = (kind, text) => {
  if (kind === 'decision') {
    const m = text.match(DECISION);
    return m ? `${m[1]}-${digits(m[2])}` : null;
  }
  const m = text.match(FEATURE);
  return m ? `F-${digits(m[1]).padStart(2, '0')}` : null;
};

// The ids a unified diff adds: a Set, or a string saying why the diff cannot be read. A file's header lines (`---`,
// `+++`, `Binary files`) are read only between its `diff --git` line and its first `@@`, so a removed line that reads
// `-- x` is content. Git ends a header's path with a tab when the name holds a space; the tab is not part of the name.
// A changed line is split as ID1 splits a file (a bare CR ends a line too), so a heading after a CR is read as ID1 reads it.
function added(diff) {
  const plus = new Set();
  const minus = new Set();
  let kind = null;
  let header = false;
  for (const raw of diff.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      header = true;
      kind = null;
      continue;
    }
    if (header && (raw.startsWith('Binary files ') || raw.startsWith('GIT binary patch'))) return 'a file git shows as binary';
    if (header && (raw.startsWith('+++ ') || raw.startsWith('--- '))) {
      const p = raw.slice(4).replace(/\r$/, '').replace(/\t$/, '');
      if (p.startsWith('"')) return 'a path git had to quote';
      if (p === '/dev/null') {
        if (raw.startsWith('+++ ')) kind = null;
        continue;
      }
      if (!/^[ab]\//.test(p)) return 'a file header with no a/ or b/ path';
      // Both headers name the file; the `+++` one is read last and wins, so a deleted file's `+++ /dev/null` reads nothing.
      kind = kindOf(p.slice(2));
      continue;
    }
    if (raw.startsWith('@@')) {
      header = false;
      continue;
    }
    if (header || kind === null) continue;
    const sign = raw[0];
    if (sign !== '+' && sign !== '-') continue;
    for (const { text } of visible(raw.slice(1))) {
      const id = idOf(kind, text);
      if (id) (sign === '+' ? plus : minus).add(id);
    }
  }
  return new Set([...plus].filter((id) => !minus.has(id)));
}

const findings = [];
const warnings = [];
let scanned = 0;
let broken = null;
let claim = 'no id this pull request adds is added by another open pull request';
const seriesOf = (id) => id.slice(0, id.lastIndexOf('-'));
const numberOf = (id) => BigInt(id.slice(id.lastIndexOf('-') + 1));
const highest = new Map([['D', 0n], ['PD', 0n], ['F', 0n]]);
const see = (ids) => {
  for (const id of ids) if (numberOf(id) > highest.get(seriesOf(id))) highest.set(seriesOf(id), numberOf(id));
};

const isFile = (p) => lstatSync(p, { throwIfNoEntry: false })?.isFile() === true;
if (typeof dir !== 'string' || dir === '') {
  broken = 'no folder given: node ci/checks/meta/id2-open-prs.mjs <folder lib/open-pr-ids.mjs wrote> [--next]';
} else if (!next && isFile(join(dir, 'not-a-pull-request'))) {
  if (readdirSync(dir).length !== 1) broken = 'not-a-pull-request sits beside other files, so the folder was not written by one push run';
  else {
    scanned = 1;
    claim = 'not a pull request, so no open pull request was compared';
  }
} else if (!isFile(join(dir, 'this.diff'))) {
  broken = 'this.diff is missing or not a regular file, so the ids this pull request adds are unknown';
} else if (lstatSync(join(dir, 'open'), { throwIfNoEntry: false })?.isDirectory() !== true) {
  broken = 'open/ is missing or not a folder, so the other open pull requests are unknown';
} else {
  const mine = added(readFileSync(join(dir, 'this.diff'), 'utf8'));
  scanned = 1;
  if (typeof mine === 'string') broken = `${next ? 'the default branch' : "this pull request's diff"} holds ${mine}`;
  else if (mine.size === 0 && !next) claim = 'this pull request adds no decision or feature id, so no other was read';
  else if (next) see(mine);
  const names = broken || (mine.size === 0 && !next) ? [] : readdirSync(join(dir, 'open')).sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  for (const name of names) {
    const m = name.match(/^([1-9]\d{0,9})\.diff$/);
    if (!m || !isFile(join(dir, 'open', name))) {
      broken = 'open/ holds an entry that is not a <number>.diff file';
      break;
    }
    const theirs = added(readFileSync(join(dir, 'open', name), 'utf8'));
    if (typeof theirs === 'string') {
      broken = `the diff of #${m[1]} holds ${theirs}`;
      break;
    }
    scanned++;
    if (next) {
      see(theirs);
      if (theirs.size) warnings.push({ where: `open-pr/${m[1]}`, detail: `#${m[1]} adds ${[...theirs].join(', ')}` });
      continue;
    }
    for (const id of mine) {
      if (theirs.has(id)) findings.push({ where: `open-pr/${m[1]}/${id}`, detail: `#${m[1]} also adds ${id}: give one of them the next free number (process/intake.md → Next free number)` });
    }
  }
  if (next && !broken) {
    const fmt = (s, n) => (s === 'F' ? `F-${String(n).padStart(2, '0')}` : `${s}-${n}`);
    const top = [...highest].map(([s, n]) => (n === 0n ? `${s}: none` : fmt(s, n))).join(', ');
    claim = `highest on the default branch and in the open pull requests: ${top}; next free: ${[...highest].map(([s, n]) => fmt(s, n + 1n)).join(', ')}`;
  }
}

process.exit(
  report({
    id: 'ID2',
    claim,
    scanned,
    unit: next ? 'diffs (the default branch and each open pull request)' : 'pull-request diffs (this one and each other open one)',
    findings,
    warnings,
    broken,
  })
);
