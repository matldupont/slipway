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

test('filled rows name their paths, and a value that is not a path the check can compare fails rather than name nothing', () => {
  assert.deepEqual(namedDocs(table({ 'Domain invariants doc': '`docs/domain-invariants.md` — the money rules', 'Cold review': '`./process/review.md`' })), ['docs/domain-invariants.md', 'process/review.md']);
  // Only compared, never passed to a command: a scope, a space and other ASCII punctuation are a path like any other.
  for (const ok of ['packages/@app/rules.md', 'docs/money rules.md', 'docs/a+b,c=d;e&f!g~h%i:j\'k"l{m}.md']) {
    assert.deepEqual(namedDocs(table({ 'Domain invariants doc': `\`${ok}\``, 'Cold review': 'none' })), [ok]);
    assert.ok(gateMatcher(settings, [ok])(ok), `${ok} should be a gate file once named`);
  }
  for (const bad of ['`docs/*.md`', '`../rules.md`', '`docs/../../rules.md`', '`/etc/rules.md`', '`docs\\rules.md`', '`.`', '`docs/rules/`', '`docs//rules.md`', '`docs/rules.md#money`', '[docs/rules.md](docs/rules.md)', '`docs/règles.md`', '`docs/規則.md`', '—']) {
    assert.throws(() => namedDocs(table({ 'Domain invariants doc': bad, 'Cold review': 'none' }), ' on the base branch'), /^Error: AGENT\.md on the base branch, row "Domain invariants doc": .* is not a file path the check for pull requests can read\. Write the file's path in backticks/, bad);
  }
  assert.throws(() => namedDocs(table({ 'Domain invariants doc': 'none', 'Cold review': '`**`' })), /row "Cold review"/);
});

test('a row is read under any heading, an example row in a code fence is counted beside the real one, and a row line the reader cannot take fails', () => {
  const rows = '| Key | Value |\n|---|---|\n| Domain invariants doc | `docs/rules.md` |\n| Cold review | `docs/rules.md` |\n';
  for (const head of ['### Skill Configuration\n\n', '## Configuration\n\n', '## Skill Configuration\n\n---\n\n', '']) assert.deepEqual(namedDocs(`# x\n\n${head}${rows}`), ['docs/rules.md'], JSON.stringify(head));
  // Every line that is the row counts: an example above the real row adds its path and hides nothing.
  assert.deepEqual(namedDocs(`# x\n\n\`\`\`\n| Domain invariants doc | \`docs/example.md\` |\n\`\`\`\n\n<!--\n| Cold review | none |\n-->\n\n## Skill Configuration\n\n${rows}`), ['docs/example.md', 'docs/rules.md']);
  for (const line of ['| **Domain invariants doc** | `docs/rules.md` | x |', '| Domain invariants doc | | x |', '  | Domain invariants doc | `docs/rules.md` | x |', '| `Domain invariants doc` | `docs/rules.md` | x |', '| Domain invariants doc | `docs/rules.md`']) {
    assert.throws(() => namedDocs(`## Skill Configuration\n\n| Key | Value | What |\n|---|---|---|\n${line}\n| Cold review | none | x |\n`), /row "Domain invariants doc": the check for pull requests cannot read this row/, line);
  }
  // Another row's explanation, or a longer key, may say the name: only a first cell that is the name makes the row.
  assert.deepEqual(namedDocs(table({ 'Quality gate': '`pnpm verify` — run before the Cold review', 'Cold review model': '`*`', 'Domain invariants doc': 'none' })), [COLD_REVIEW_DEFAULT]);
  for (const none of ['none.', 'none;', 'none:', 'NONE,']) assert.deepEqual(namedDocs(table({ 'Domain invariants doc': none, 'Cold review': 'none' })), [], none);
});

test('a branch cut before the base named the document is held to the path the base names now', () => {
  git('switch', '-q', '-c', 'trunk', head);
  put('AGENT.md', table({ 'Domain invariants doc': 'none', 'Cold review': 'none' }));
  put('docs/domain-invariants.md', '# Rules\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'no document named yet');
  const cut = git('rev-parse', 'HEAD');
  git('switch', '-q', '-c', 'stale');
  put('docs/domain-invariants.md', '# Rules\n\nNone.\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'edit the rules');
  const tip = git('rev-parse', 'HEAD');
  assert.deepEqual(changes(cut, tip, repo).globs, [], 'while the base names nothing, neither does the list');
  git('switch', '-q', 'trunk');
  put('AGENT.md', table({ 'Domain invariants doc': '`docs/domain-invariants.md`', 'Cold review': 'none' }));
  git('add', '-A');
  git('commit', '-q', '-m', 'the base names its rules');
  const base = git('rev-parse', 'HEAD');
  assert.deepEqual(changes(base, tip, repo).files, ['docs/domain-invariants.md'], 'the PR is still only its own change');
  assert.deepEqual(changes(base, tip, repo).globs, ['docs/domain-invariants.md']);
  missing(p1(base, tip), 'docs/domain-invariants.md');
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

// The script on from...tip: { status, stdout, stderr }.
const script = (from, tip) => spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/gate-files.mjs'), from, tip], { cwd: repo, encoding: 'utf8' });
const commit = (msg, files) => {
  for (const [p, body] of Object.entries(files)) put(p, body);
  git('add', '-A');
  git('commit', '-q', '-m', msg);
  return git('rev-parse', 'HEAD');
};

test('a row the base cannot be read by fails every PR but the one that repairs it, which is held to its own rows and the default', () => {
  git('switch', '-q', '-c', 'unreadable', head);
  const from = commit('a row that is not a path', { 'AGENT.md': table({ 'Domain invariants doc': '`docs/*.md`' }), 'docs/rules.md': '# Rules\n', 'process/cold-review.md': '# Review\n' });
  // Any other PR: red, with a message the owner can act on, and no list written.
  const other = script(from, commit('a doc', { 'docs/a.md': 'x\n' }));
  assert.notEqual(other.status, 0);
  assert.equal(other.stdout, '');
  assert.match(other.stderr, /AGENT\.md in this pull request, row "Domain invariants doc": "docs\/\*\.md" is not a file path the check for pull requests can read\. Write the file's path in backticks/);
  // The repair: the row now reads, so the script passes, says which rule applied, and counts the head's path and the default.
  git('switch', '-q', '-c', 'repair', from);
  const tip = commit('repair the row, and edit both documents', { 'AGENT.md': table({ 'Domain invariants doc': '`docs/rules.md`', 'Cold review': '`docs/review.md`' }), 'docs/rules.md': '# Rules\n\nNone.\n', 'process/cold-review.md': '# Review\n\nPass.\n' });
  const fixed = script(from, tip);
  assert.equal(fixed.status, 0, fixed.stderr);
  assert.deepEqual(JSON.parse(fixed.stdout).globs, ['docs/rules.md', 'docs/review.md', COLD_REVIEW_DEFAULT]);
  assert.match(fixed.stderr, /^gate-files: AGENT\.md on the base branch, row "Domain invariants doc": "docs\/\*\.md" is not a file path the check for pull requests can read\. This pull request repairs it, so its own rows were used: docs\/rules\.md, docs\/review\.md, process\/cold-review\.md\n$/);
  const r = p1(from, tip);
  missing(r, 'docs/rules.md');
  missing(r, 'process/cold-review.md');
});

test('a PR that writes a row the check cannot read is red, whatever the base says', () => {
  git('switch', '-q', '-c', 'writes-bad', head);
  const from = commit('a readable row', { 'AGENT.md': table({ 'Domain invariants doc': '`docs/rules.md`', 'Cold review': 'none' }) });
  for (const bad of ['`docs/règles.md`', '[docs/rules.md](docs/rules.md)', '']) {
    const r = script(from, commit(`row ${bad}`, { 'AGENT.md': table({ 'Domain invariants doc': bad, 'Cold review': 'none' }) }));
    assert.notEqual(r.status, 0, bad);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /AGENT\.md in this pull request, row "Domain invariants doc"/, bad);
    git('reset', '-q', '--hard', from);
  }
});

test('a named document with a scope or a space in its path is counted when a PR edits it', () => {
  git('switch', '-q', '-c', 'odd-names', head);
  const from = commit('names', { 'AGENT.md': table({ 'Domain invariants doc': '`packages/@app/money rules.md`', 'Cold review': '`docs/"cold" review.md`' }), 'packages/@app/money rules.md': '# Rules\n', 'docs/"cold" review.md': '# Review\n' });
  const tip = commit('edit both', { 'packages/@app/money rules.md': '# Rules\n\nNone.\n', 'docs/"cold" review.md': '# Review\n\nPass.\n' });
  const r = p1(from, tip);
  missing(r, 'packages/@app/money rules');
  missing(r, 'docs/"cold" review');
});

test.after(() => rmSync(repo, { recursive: true, force: true }));
