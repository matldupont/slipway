#!/usr/bin/env node
// ID2 — no two open pull requests add one id.
//
// ID1 reads one tree, so two open pull requests that each add `## PD-7` both pass it, and the second to merge turns
// the default branch red, or lands where git merges cleanly (#478). ID2 compares the ids this pull request's diff adds
// with the ids every other open pull request's diff adds:
//
//   open-pr/<n>/<id>   pull request #<n> also adds a heading for <id>; one finding per pull request and id
//
// It reads a folder that lib/open-pr-ids.mjs writes in CI, never the network, so its fixtures run offline:
//
//   <dir>/this.diff        this pull request's diff, `git diff` of decisions.md and the feature folders
//   <dir>/open/<n>.diff    each other open pull request's diff, the same paths; <n> is digits only
//   <dir>/not-a-pull-request   in place of both: a push, with no pull request to compare (said, and green)
//
// What counts as adding an id. An added line (`+`) of decisions.md that is a decision heading (`D-<n>`, `PD-<n>`), or of
// a `*.md` directly in docs/features/ or dev/features/ (TEMPLATE.md and README.md aside) that is an `F-<n>` heading,
// read as ID1 reads one (lib/feature-docs.mjs: LEAD, nothing skipped, look-alikes folded), and ids compare by number.
// A diff that also removes a heading with that id in the same file kind is an edit or a move, not a new id, so it
// adds nothing. Only the ids this pull request adds are compared: a clash between two other pull requests is their own
// run's finding. Two opened at once both go red, and renumbering one clears both.
//
// The other pull requests are untrusted text. Only `#<n>` and the id are printed, never a path or a heading's other
// text, and a diff that cannot be read cleanly is BROKEN, never a pass: a `+++` path git had to quote, a file name that
// is not digits, a missing folder.

import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEAD, visible } from '../lib/feature-docs.mjs';
import { report } from '../lib/report.mjs';

const dir = process.argv[2];
const DECISION = new RegExp(`${LEAD}(P?D)-(\\d+)\\b`);
const FEATURE = new RegExp(`${LEAD}F-(\\d+)\\b`);
const FEATURE_DOC = /^(?:docs|dev)\/features\/([^/]+\.md)$/;

// The kind of file a path is for ID2: 'decision', 'feature' or null (not read).
const kindOf = (path) => {
  if (path === 'decisions.md') return 'decision';
  const m = path.match(FEATURE_DOC);
  return m && m[1] !== 'TEMPLATE.md' && m[1] !== 'README.md' ? 'feature' : null;
};
const idOf = (kind, text) => {
  if (kind === 'decision') {
    const m = text.match(DECISION);
    return m ? `${m[1]}-${Number(m[2])}` : null;
  }
  const m = text.match(FEATURE);
  return m ? `F-${String(Number(m[1])).padStart(2, '0')}` : null;
};

// The ids a unified diff adds: a Set, or a string saying why the diff cannot be read. A file's header lines (`---`,
// `+++`) are read only between its `diff --git` line and its first `@@`, so a removed line that reads `-- x` is content.
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
    if (header && (raw.startsWith('+++ ') || raw.startsWith('--- '))) {
      const p = raw.slice(4).replace(/\r$/, '');
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
let scanned = 0;
let broken = null;
let claim = 'no id this pull request adds is added by another open pull request';

const isFile = (p) => lstatSync(p, { throwIfNoEntry: false })?.isFile() === true;
if (typeof dir !== 'string' || dir === '') {
  broken = 'no folder given: node ci/checks/meta/id2-open-prs.mjs <folder lib/open-pr-ids.mjs wrote>';
} else if (isFile(join(dir, 'not-a-pull-request'))) {
  scanned = 1;
  claim = 'not a pull request, so no open pull request was compared';
} else if (!isFile(join(dir, 'this.diff'))) {
  broken = 'this.diff is missing or not a regular file, so the ids this pull request adds are unknown';
} else if (lstatSync(join(dir, 'open'), { throwIfNoEntry: false })?.isDirectory() !== true) {
  broken = 'open/ is missing or not a folder, so the other open pull requests are unknown';
} else {
  const mine = added(readFileSync(join(dir, 'this.diff'), 'utf8'));
  scanned = 1;
  if (typeof mine === 'string') broken = `this pull request's diff holds ${mine}`;
  const names = readdirSync(join(dir, 'open')).sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  for (const name of broken ? [] : names) {
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
    for (const id of mine) {
      if (theirs.has(id)) findings.push({ where: `open-pr/${m[1]}/${id}`, detail: `#${m[1]} also adds ${id}: give one of them the next free number (process/intake.md → Next free number)` });
    }
  }
}

process.exit(
  report({
    id: 'ID2',
    claim,
    scanned,
    unit: 'pull-request diffs (this one and each other open one)',
    findings,
    broken,
  })
);
