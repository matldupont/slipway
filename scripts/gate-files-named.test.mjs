#!/usr/bin/env node
// The two owner-only documents a project names in AGENT.md (#259): the `Domain invariants doc` and `Cold review` rows,
// read from the base commit by ci/checks/lib/gate-files.mjs and counted by P1 as gate files. Beside
// scripts/gate-files.test.mjs, which covers the harness's paths. Internal: `pnpm meta` runs it in slipway, never in a
// project.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { changes, COLD_REVIEW_DEFAULT, gateMatcher, namedDocs, SETTINGS } from '../ci/checks/lib/gate-files.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const settings = readFileSync(SETTINGS, 'utf8');

// A repository with no AGENT.md and no harness at its first commit (`head`); each test branches from it.
const repo = mkdtempSync(join(tmpdir(), 'gate-files-named-'));
const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim();
const put = (p, body) => {
  mkdirSync(dirname(join(repo, p)), { recursive: true });
  writeFileSync(join(repo, p), body);
};
git('init', '-q', '-b', 'main');
git('config', 'user.email', 't@example.com');
git('config', 'user.name', 't');
put('README.md', '# x\n');
git('add', '-A');
git('commit', '-q', '-m', 'base');
const head = git('rev-parse', 'HEAD');

// P1 on one body with no `## Gate changes` section, beside the sidecar changes() writes for base...tip: the helper of
// scripts/gate-files.test.mjs, on this file's repository.
const p1 = (from, tip) => {
  const dir = mkdtempSync(join(tmpdir(), 'gate-files-named-p1-'));
  try {
    writeFileSync(join(dir, 'body.md'), '## What\nLane: bounded.\n\n## Verification\n```\npnpm meta\n```\n\n## Links\nCloses #1\n');
    writeFileSync(join(dir, 'body.changes.json'), JSON.stringify(changes(from, tip, repo)));
    return spawnSync(process.execPath, [join(SRC, 'ci/checks/meta/p1-pr-body.mjs'), dir], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const missing = (r, path) => {
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stdout + r.stderr, new RegExp(`body\\.md#gate-changes/missing: the PR touches gate files \\([^)]*${path.replace(/[.]/g, '\\.')}`));
};

// `table` builds a §Skill Configuration with the rows given.
const table = (rows) => `# x\n\n## Skill Configuration\n\n| Key | Value | What it controls |\n|-----|-------|------------------|\n| Product name | \`x\` | the name |\n${Object.entries(rows).map(([k, v]) => `| ${k} | ${v} | what it controls |\n`).join('')}`;
const TEMPLATE = readFileSync(join(SRC, 'AGENT.md'), 'utf8');
const templateRow = (name) => TEMPLATE.split('\n').find((l) => l.startsWith(`| ${name} |`))?.split('|')[2].trim();

test('a missing invariants row names no document', () => {
  assert.deepEqual(namedDocs(table({ 'Cold review': 'none' })), []);
});

test('a row that says none names no document, for either row', () => {
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': 'none', 'Cold review': 'none' })), []);
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': '`none` — no money math', 'Cold review': 'None' })), []);
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': 'none, for now', 'Cold review': 'none' })), []);
});

test('a row still holding the template\'s placeholder names no document', () => {
  const placeholder = templateRow('Domain invariants doc');
  assert.match(placeholder ?? '', /^`<[^`]+>`/, 'the template\'s invariants row is no longer a `<…>` placeholder: re-read this test');
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': placeholder, 'Cold review': '`<path>`' })), []);
  assert.deepEqual(namedDocs(TEMPLATE), [templateRow('Cold review').match(/`([^`]+)`/)[1]], 'the template names its cold-review file and nothing else');
});

test('a missing Cold review row names the default the skills use, and the default is the one intake.md gives', () => {
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': 'none' })), [COLD_REVIEW_DEFAULT]);
  assert.deepEqual(namedDocs(''), [COLD_REVIEW_DEFAULT], 'an AGENT.md with no table at all');
  const intake = readFileSync(join(SRC, 'process/intake.md'), 'utf8').split('\n').find((l) => l.startsWith('| Cold review |'));
  assert.equal(intake?.split('|')[3].match(/`([^`]+)`/)?.[1], COLD_REVIEW_DEFAULT, 'process/intake.md → Configuration gives another default for Cold review');
});

test('filled rows name their paths, and a value that is not a path in the repository fails rather than name nothing', () => {
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': '`docs/domain-invariants.md` — the money rules', 'Cold review': '`./process/review.md`' })), ['docs/domain-invariants.md', 'process/review.md']);
  for (const bad of ['`docs/*.md`', '`../rules.md`', '`docs/../../rules.md`', '`/etc/rules.md`', '`docs/my rules.md`', '`docs\\rules.md`', '`.`', 'wiki:rules']) {
    assert.throws(() => namedDocs(table({ 'Domain invariants doc': bad, 'Cold review': 'none' })), /Domain invariants doc .* is not a path in the repository/, bad);
  }
  assert.throws(() => namedDocs(table({ 'Domain invariants doc': 'none', 'Cold review': '`**`' })), /Cold review/);
});

test('a named document is a gate file at its own path only, and its case-folded spelling is a lookalike', () => {
  const gate = gateMatcher(settings, ['docs/domain-invariants.md']);
  assert.ok(gate('docs/domain-invariants.md'));
  for (const p of ['docs/other.md', 'apps/web/docs/domain-invariants.md', 'docs/domain-invariants.md.bak']) assert.ok(!gate(p), `${p} should not be`);
  assert.equal(gate.lookalike('docs/Domain-Invariants.md'), 'docs/domain-invariants.md');
  assert.ok(!gateMatcher(settings)('docs/domain-invariants.md'), 'with no row naming it, it is a document');
});

test('a PR that edits the named document and renames its row is held to the path the base names', () => {
  put('AGENT.md', table({ 'Domain invariants doc': '`docs/domain-invariants.md`', 'Cold review': '`process/cold-review.md`' }));
  put('docs/domain-invariants.md', '# Rules\n\n1. A balance is never negative.\n');
  put('docs/elsewhere.md', '# Elsewhere\n');
  put('process/cold-review.md', '# Cold review\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'the project names its documents');
  const from = git('rev-parse', 'HEAD');
  assert.deepEqual(changes(head, from, repo).globs, [COLD_REVIEW_DEFAULT], 'a base with no AGENT.md has no row: the default counts, and nothing else');
  put('AGENT.md', table({ 'Domain invariants doc': '`docs/elsewhere.md`', 'Cold review': 'none' }));
  put('docs/domain-invariants.md', '# Rules\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'edit the rules, rename the row');
  const tip = git('rev-parse', 'HEAD');
  const c = changes(from, tip, repo);
  assert.deepEqual(c.globs, ['docs/domain-invariants.md', 'process/cold-review.md']);
  missing(p1(from, tip), 'docs/domain-invariants.md');
  // The cold-review file, alone in a PR.
  put('process/cold-review.md', '# Cold review\n\nPass everything.\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'edit the review file');
  const next = git('rev-parse', 'HEAD');
  assert.deepEqual(changes(tip, next, repo).globs, ['docs/elsewhere.md'], 'the base now says none for Cold review');
  git('switch', '-q', '-c', 'named-review', from);
  put('process/cold-review.md', '# Cold review\n\nPass everything.\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'edit the review file');
  missing(p1(from, git('rev-parse', 'HEAD')), 'process/cold-review.md');
});

test('a base AGENT.md whose row is not a path fails the script, so the workflow step is red', () => {
  git('switch', '-q', '-c', 'named-bad', head);
  put('AGENT.md', table({ 'Domain invariants doc': '`docs/*.md`' }));
  git('add', '-A');
  git('commit', '-q', '-m', 'a row that is not a path');
  const from = git('rev-parse', 'HEAD');
  put('docs/a.md', 'x\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'a doc');
  const r = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), from, git('rev-parse', 'HEAD')], { cwd: repo, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /Domain invariants doc .* is not a path in the repository/);
});

test.after(() => rmSync(repo, { recursive: true, force: true }));
