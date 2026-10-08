#!/usr/bin/env node
// The reader under W1 (ci/checks/lib/workflow-yaml.mjs, D-033, #306): the pinned YAML parser is the release it
// says it is, what slipway refuses in front of it, and what W1 then reads from the tree: job shapes, a run: only
// as a step, and the files written to mislead a reader of text. What starts a workflow is scripts/workflows.test.mjs.
// Every workflow text here is inert: none is run. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { NOT_YAML_HINT, readWorkflow } from '../ci/checks/lib/workflow-yaml.mjs';
import { workflowCommands, workflowTrigger } from '../ci/checks/lib/workflows.mjs';

const VENDOR = fileURLToPath(new URL('../ci/checks/lib/vendor/', import.meta.url));
const PARSER_FIXTURE = fileURLToPath(new URL('../ci/fixtures/known-bad/w1/parser/', import.meta.url));

test('the vendored parser is the pinned release, unedited, with its licence and its record beside it', () => {
  const sha = (name) => createHash('sha256').update(readFileSync(join(VENDOR, name))).digest('hex');
  const PARSER = '86ac62558d7cd103ff5f5a10a885ebecc04c23ca2f1487522864b49221edc25c';
  const LICENCE = 'a07bc24468b9654ce76a547d47a2db282d07733b715db4c73a98bd63961f9550';
  assert.equal(sha('js-yaml.mjs'), PARSER, 'js-yaml.mjs is not the pinned release: it is replaced whole by the rule in D-033, never edited');
  assert.equal(sha('js-yaml.LICENSE'), LICENCE);
  const record = readFileSync(join(VENDOR, 'README.md'), 'utf8');
  for (const said of [PARSER, LICENCE, '| Version | 5.4.2,', 'js-yaml-5.4.2.tgz']) assert.ok(record.includes(said), said);
  assert.match(readFileSync(join(VENDOR, 'js-yaml.mjs'), 'utf8').split('\n')[0], /^\/\*! js-yaml 5\.4\.2 /);
});

test('every scalar is its text: on is a key and never a boolean', () => {
  const { root, unread } = readWorkflow('on: push\nyes: on\nn: 012\nempty:\nq: "null"\n');
  assert.equal(unread, null);
  assert.deepEqual([...root.entries.keys()], ['on', 'yes', 'n', 'empty', 'q']);
  assert.deepEqual([...root.entries.values()].map((v) => [v.value, v.plain]), [['push', true], ['on', true], ['012', true], ['', true], ['null', false]]);
  // A key in quotes, or written with an escape, is the same key.
  assert.equal(readWorkflow('"on": push\n').root.entries.get('on').value, 'push');
  assert.equal(readWorkflow('"\\x6fn": push\n').root.entries.get('on').value, 'push');
  // Nothing to read is a block with no keys.
  for (const text of ['', '# only a comment\n', '\n\n', '---\n']) assert.equal(readWorkflow(text).root?.entries.size, 0, JSON.stringify(text));
});

test('the reader refuses what two YAML readers may read differently, each with a fixed reason', () => {
  const refused = (text, reason) => assert.deepEqual([readWorkflow(text).root, readWorkflow(text).unread], [null, reason], text);
  refused('a: &x 1\n', 'it holds an anchor');
  refused('a:\n  - &x b\n', 'it holds an anchor');
  refused('a: *x\n', 'it holds an alias');
  refused('a: !!str 1\n', 'it holds a tag');
  refused('a: !custom\n  b: 1\n', 'it holds a tag');
  refused('a:\n  <<: { b: 1 }\n', 'it holds a merge key');
  refused('a: 1\na: 2\n', 'a key is written more than once');
  refused('a: 1\n"a": 2\n', 'a key is written more than once');
  refused('x:\n  a: 1\n  a: 2\n', 'a key is written more than once');
  refused('? [a, b]\n: 1\n', 'a key is a list or a mapping');
  refused('? { a: b }\n: 1\n', 'a key is a list or a mapping');
  refused('%YAML 1.2\n---\na: 1\n', 'it holds a directive');
  refused('%FOO bar\n---\na: 1\n', 'it holds a directive');
  refused('a: 1\n---\nb: 2\n', 'it holds more than one document');
  refused('- a\n', 'its top level is not a block of keys');
  refused('{ a: 1 }\n', 'its top level is not a block of keys');
  refused('just text\n', 'its top level is not a block of keys');
  // What the parser reads and a stricter reader rejects, where review found it (#306).
  refused('a: 1\n...\n', 'it holds a document end marker');
  refused('...\na: 1\n', 'it holds a document end marker');
  refused(' ---\na: 1\n', 'its document marker is indented');
  refused('# first\n\n  ---\na: 1\n', 'its document marker is indented');
  refused('a: 1\n: v\n', 'a key is empty');
  refused(`${'k'.repeat(1025)}: v\n`, 'a key is longer than YAML allows');
  for (const text of ['a: ]b\n', 'a: }b\n', 'a: ,b\n', ']k: v\n']) refused(text, 'a plain text starts with a bracket or a comma');
  refused('a: [1,\n]\n', 'it is not YAML the parser can read, at line 2');
  refused('a:\n\tb: 1\n', 'it is not YAML the parser can read, at line 2');
  // How to write it so it is read comes with a file the parser could not read, and with no other refusal.
  assert.equal(readWorkflow('a: [1,\n]\n').hint, NOT_YAML_HINT);
  assert.equal(readWorkflow('a:\n  b: "one\n  two"\n').hint, NOT_YAML_HINT);
  assert.equal(readWorkflow('a:\n\tb: 1\n').hint, null);
  assert.equal(readWorkflow('a: b: c\n').hint, null);
  assert.equal(readWorkflow('a: &x 1\n').hint, null);
  assert.equal(readWorkflow('a: 1\n').hint, null);
  // Not refused: the same two characters in quotes are a key like any other, and one document may say where it starts.
  assert.equal(readWorkflow('"<<": 1\n').unread, null);
  assert.equal(readWorkflow('---\na: 1\n').unread, null);
  // Nor the same marks where they are text or within the bound: in quotes, inside a block of text, a key of 1024.
  for (const text of ['"": 1\n', 'a: "]b"\n', `${'k'.repeat(1024)}: v\n`, 'a: |\n  ---\n  ...\n  %x\n   ---\n']) assert.equal(readWorkflow(text).unread, null, text);
});

test('a jobs: that is not a block of jobs, each a block of keys, is unread', () => {
  const notJobs = (jobs) => {
    const t = workflowTrigger(`on: pull_request\n${jobs}`);
    assert.deepEqual([t.counts, t.unread], [false, 'its jobs: is not a block of jobs W1 can read'], jobs);
  };
  notJobs('jobs: text\n');
  notJobs('jobs: [a]\n');
  notJobs('jobs:\n  a: text\n');
  notJobs('jobs:\n  a:\n    |\n    uses: ./.github/workflows/called.yml\n');
  notJobs('jobs:\n  a:\n    steps: text\n');
  notJobs('jobs:\n  a:\n    steps:\n      - text\n');
  notJobs('jobs:\n  a:\n    steps:\n      - run: [pnpm, test]\n');
  notJobs('jobs:\n  a:\n    uses: [x]\n');
  notJobs('jobs:\n  a:\n    steps:\n      - run: pnpm test\n  b: text\n');
  for (const jobs of ['', 'jobs: {}\n', 'jobs:\n  a: {}\n', 'jobs:\n  a:\n    steps: []\n', 'jobs:\n  a:\n    steps:\n      - uses: actions/checkout@v7\n']) {
    assert.deepEqual([workflowTrigger(`on: pull_request\n${jobs}`).counts, workflowTrigger(`on: pull_request\n${jobs}`).unread], [true, null], jobs);
  }
});

test('a run: is a command only as a step of a job, and a block of text gives its lines', () => {
  const root = mkdtempSync(join(tmpdir(), 'slipway-commands-'));
  try {
    const dir = join(root, '.github', 'workflows');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'ci.yml'), [
      'on: pull_request',
      'env:',
      '  NOTE: |',
      '    run: pnpm in-a-text',
      '  run: pnpm under-env',
      'run: pnpm at-the-top',
      'jobs:',
      '  a:',
      '    run: pnpm on-the-job',
      '    strategy:',
      '      matrix:',
      '        run: [1, 2]',
      '    steps:',
      '      - run: |',
      '          pnpm first',
      '',
      '          pnpm second # a shell comment',
      '      - run: >-',
      '          pnpm folded',
      '          --into-one-line',
      '      - uses: some/action@v1',
      '        with:',
      '          run: pnpm under-with',
      '      - name: quoted',
      '        run: "pnpm quoted"   # a YAML comment',
      '      - { name: in braces, run: pnpm braces }',
      '      - "run": "pnpm one\\npnpm two"',
      '',
    ].join('\n'));
    assert.deepEqual(workflowCommands(root).commands, [
      { where: '.github/workflows/ci.yml:15', cmd: 'pnpm first' },
      { where: '.github/workflows/ci.yml:17', cmd: 'pnpm second' },
      { where: '.github/workflows/ci.yml:19', cmd: 'pnpm folded --into-one-line' },
      { where: '.github/workflows/ci.yml:25', cmd: 'pnpm quoted' },
      { where: '.github/workflows/ci.yml:26', cmd: 'pnpm braces' },
      { where: '.github/workflows/ci.yml:27', cmd: 'pnpm one' },
      { where: '.github/workflows/ci.yml:27', cmd: 'pnpm two' },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The three findings #301's review left open, and the run: line main's reader took from a text: each is a file
// of the known-bad fixture, read here from the fixture so the two hold the same inert text.
test('a workflow written to mislead a reader of text counts for nothing', () => {
  const text = (name) => readFileSync(join(PARSER_FIXTURE, '.github', 'workflows', name), 'utf8');
  const closed = (name, reason) => {
    const t = workflowTrigger(text(name));
    assert.deepEqual([t.counts, t.issues, t.called], [false, false, false], name);
    assert.match(t.unread ?? '', reason, name);
  };
  closed('quote-after-colon.yml', /^it is not YAML the parser can read, at line 5$/);
  closed('apostrophe.yml', /^it is not YAML the parser can read, at line 6$/);
  closed('job-as-text.yml', /^its jobs: is not a block of jobs W1 can read$/);
  closed('bracket.yml', /^it is not YAML the parser can read, at line 13$/);
  closed('anchor.yml', /^it holds an anchor$/);
  assert.deepEqual([workflowTrigger(text('run-in-text.yml')).counts, workflowTrigger(text('run-in-text.yml')).unread], [true, null]);

  const read = workflowCommands(PARSER_FIXTURE);
  assert.deepEqual(read.commands, [{ where: '.github/workflows/ci.yml:9', cmd: 'pnpm test:pr' }]);
  assert.deepEqual([read.files, read.counted, read.issueOnly], [8, 2, 0]);
  assert.deepEqual(read.unread.map((u) => u.file.split('/').at(-1)), ['anchor.yml', 'apostrophe.yml', 'bracket.yml', 'job-as-text.yml', 'quote-after-colon.yml']);
  assert.deepEqual(read.unread.map((u) => u.hint ?? null), [null, NOT_YAML_HINT, NOT_YAML_HINT, null, NOT_YAML_HINT]);
  assert.deepEqual(read.unfollowed, []);
  for (const u of read.unread) assert.doesNotMatch(`${u.reason} ${u.hint ?? ''}`, /test:|workflow_dispatch|called\.yml|ubuntu/);
});

test('W1 says how to write a file the parser could not read: in that file\'s warning, and once in a finding', () => {
  const w1 = fileURLToPath(new URL('../ci/checks/meta/w1-declared-vs-invoked.mjs', import.meta.url));
  const out = spawnSync(process.execPath, [w1, PARSER_FIXTURE], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } }).stdout;
  const json = JSON.parse(out.split('\n').find((l) => l.startsWith('@@json ')).slice('@@json '.length));
  const warning = (file) => json.warnings.find((w) => w.where === `unread:.github/workflows/${file}`).detail;
  for (const file of ['bracket.yml', 'apostrophe.yml', 'quote-after-colon.yml']) assert.ok(warning(file).endsWith(NOT_YAML_HINT), file);
  for (const file of ['anchor.yml', 'job-as-text.yml']) assert.ok(!warning(file).includes(NOT_YAML_HINT), file);
  assert.equal(json.findings.length, 7);
  for (const f of json.findings) assert.equal(f.detail.split(NOT_YAML_HINT).length - 1, 1, f.where);
});
