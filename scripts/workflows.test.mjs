#!/usr/bin/env node
// What starts a workflow, as W1 reads it (ci/checks/lib/workflows.mjs workflowTrigger, #239): which `on:` shapes
// count as running on a pull request or a push to a branch, which do not, and which are not read at all.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { workflowCommands, workflowTrigger } from '../ci/checks/lib/workflows.mjs';

const JOB = 'jobs:\n  a:\n    steps:\n      - run: pnpm test\n';
const trigger = (on) => workflowTrigger(`name: x\n${on}\n${JOB}`);
const counts = (on) => assert.deepEqual([trigger(on).counts, trigger(on).unread], [true, null], on);
const doesNot = (on) => assert.deepEqual([trigger(on).counts, trigger(on).unread], [false, null], on);
const unread = (on, reason) => {
  const t = trigger(on);
  assert.deepEqual([t.counts, t.issues, t.called], [false, false, false], on);
  assert.match(t.unread ?? '', reason, on);
};

test('a pull request, or a push to a branch, counts', () => {
  counts('on: pull_request');
  counts('on: push');
  counts('on: [pull_request]');
  counts('on: [workflow_dispatch, "push"]  # both');
  counts('"on":\n  pull_request:');
  counts("'on':\n  push:\n    branches: [main]");
  counts('on:\n  - workflow_dispatch\n  - pull_request');
  counts('on:\n  pull_request:\n  push:\n    branches: [main]');
  counts('on:\n  push:\n    branches:\n      - main\n      - "release/**"\n    tags: [v1]');
  counts('on:\n  push:\n    branches-ignore: [wip]');
  counts('on:\n  push:\n    tags: [v1]\n    branches-ignore: [wip]');
  counts('on:\n  workflow_dispatch:\n    inputs:\n      why: { type: string }\n  pull_request: null');
  counts('on:\n  pull_request:\n    types: [opened, edited, synchronize, reopened]');
  counts('on:\n  pull_request:\n    types:\n      - labeled\n      - reopened');
  counts('on:\n  push:\n    branches: [main]\n  workflow_dispatch: {}     # manual run');
  counts('on:\n    schedule:\n        - cron: "0 3 * * *"\n    push:\n');
  counts('on:\r\n  pull_request:\r');
});

test('a path filter is not read: the event decides', () => {
  counts('on:\n  push:\n    branches: [main]\n    paths-ignore:\n      - "docs/**"\n      - "**.md"');
  counts('on:\n  push:\n    paths: ["src/**"]');
  counts('on:\n  pull_request:\n    paths-ignore: ["**.md"]\n    branches: [main]');
});

test('a tag, a schedule, a dispatch, a reusable workflow and every other event do not count', () => {
  doesNot('on: workflow_dispatch');
  doesNot('on: [workflow_call, schedule]');
  doesNot("on:\n  push:\n    tags: ['v*']");
  doesNot('on:\n  push:\n    tags-ignore:\n      - old');
  doesNot("on:\n  schedule:\n    - cron: '0 3 * * *'");
  doesNot('on:\n  workflow_call:\n    inputs:\n      push:\n        type: string');
  doesNot('on:\n  pull_request_target:');
  doesNot("on:\n  schedule:\n    - cron: '0 9 * * 0'\n  workflow_dispatch: {}");
  doesNot('on:\n  issues:\n    types: [opened, edited]');
  doesNot('on:\n  pull_request:\n    types: [closed]');
  doesNot('on:\n  release:\n    types: [published]\n  workflow_dispatch:');
});

test('an issue being opened is told apart, and never counts as a change', () => {
  const issues = (on, want) => assert.deepEqual(trigger(on), { counts: false, issues: want, called: false, unread: null }, on);
  issues('on: issues', true);
  issues('on: [issues, workflow_dispatch]', true);
  issues('on:\n  issues:\n    types: [opened, edited]', true);
  issues('on:\n  issues:\n    types:\n      - opened', true);
  issues('on:\n  issues:\n    types: [closed]', false);
  issues('on:\n  issue_comment:', false);
  issues('on:\n  workflow_dispatch:\n    inputs:\n      issues:\n        type: string', false);
  assert.deepEqual(trigger('on: [issues, pull_request]'), { counts: true, issues: true, called: false, unread: null });
  unread('on:\n  issues:\n    types: []', /types under issues is empty/);
  unread('on:\n  issues:\n    types: ${{ vars.T }}', /not a filter/);
});

test('a shape that is not read counts for nothing, and the reason holds none of the file\'s text', () => {
  unread('', /no top-level on:/);
  unread('  on: pull_request', /no top-level on:/);
  unread('# on: pull_request', /no top-level on:/);
  unread('on: pull_request\non: push', /more than one/);
  unread('on:', /is empty/);
  unread('on: { pull_request: {} }', /not an event/);
  unread('on: ${{ vars.EVENTS }}', /not an event/);
  unread('on: *events', /not an event/);
  unread('on: &events [pull_request]', /not an event/);
  unread('on: [pull_request, [push]]', /not an event/);
  unread('on: []', /not an event/);
  unread('on: Pull_Request', /not an event/);
  unread('on:\n  pull_request: { types: [opened] }', /inline value/);
  unread('on:\n  <<: *events', /not an event/);
  unread('on:\n  pull_request:\n  pull_request:', /not an event/);
  unread('on:\n  - push\n  pull_request:', /not an event/);
  unread('on:\n\tpull_request:', /tab/);
  unread('on:\n    push:\n  pull_request:', /not indented evenly/);
  unread('on:\n  push:\n    branches: *main', /not a filter/);
  unread('on:\n  push:\n    branches: ${{ vars.B }}', /not a filter/);
  unread('on:\n  push:\n    branches: { a: b }', /not a filter/);
  unread('on:\n  push:\n    branches: [a, [b]]', /not a list/);
  unread('on:\n  push:\n    branches:\n      - main\n    branches: [x]', /not a filter/);
  unread('on:\n  push:\n    branches:\n      main', /not a filter/);
  unread('on:\n  push:\n    branches: []', /branches under push is empty/);
  unread('on:\n  push:\n    branches:\n    tags: [v1]', /branches under push is empty/);
  unread('on:\n  pull_request:\n    types: []', /types under pull_request is empty/);
  unread("on:\n  push:\n    tags: [v1]\n    branches: ['']", /holds an empty entry/);
  unread('on:\n  push:\n    tags: [v1]\n    branches: null', /holds an empty entry/);
  unread('on:\n  push:\n    tags: [v1]\n    branches: ~', /holds an empty entry/);
  unread('on:\n  push:\n    tags: [v1]\n    branches: Null', /holds an empty entry/);
  unread('on:\n  push:\n    tags: [v1]\n    branches: [NULL]', /holds an empty entry/);
  unread("on:\n  push:\n    tags: [v1]\n    branches: ['!**']", /only refuses/);
  unread("on:\n  push:\n    tags: ['v*']\n    branches-ignore: ['**']", /ignores every branch/);
  unread('on:\n  pull_request:\n    types: ["closed,opened,x"]', /not a list/);
  for (const on of ['on: { secret-name: {} }', 'on:\n  push:\n    branches: *secret']) {
    assert.doesNotMatch(trigger(on).unread, /secret/);
  }
});

test('only the commands of a workflow that counts are read, and an unread file is named', () => {
  const root = mkdtempSync(join(tmpdir(), 'slipway-commands-'));
  try {
    assert.deepEqual(workflowCommands(root), { commands: [], issueCommands: [], files: 0, counted: 0, issueOnly: 0, unread: [], unfollowed: [] });
    const dir = join(root, '.github', 'workflows');
    mkdirSync(dir, { recursive: true });
    const write = (name, on, cmd) => writeFileSync(join(dir, name), `on: ${on}\njobs:\n  a:\n    steps:\n      - run: ${cmd}\n`);
    write('ci.yml', 'pull_request', 'pnpm test');
    write('odd.yaml', '{ push: {} }', 'pnpm lint');
    write('issue.yml', 'issues', 'node ci/checks/meta/i1.mjs');
    write('both.yml', '[issues, push]', 'pnpm build');
    write('release.yml', "\n  push:\n    tags: ['v*']", 'pnpm meta');
    writeFileSync(join(dir, 'notes.txt'), 'on: pull_request\n      - run: pnpm build\n');
    const read = workflowCommands(root);
    assert.deepEqual(read.commands, [{ where: '.github/workflows/both.yml:5', cmd: 'pnpm build' }, { where: '.github/workflows/ci.yml:5', cmd: 'pnpm test' }]);
    assert.deepEqual(read.issueCommands, [{ where: '.github/workflows/issue.yml:5', cmd: 'node ci/checks/meta/i1.mjs' }]);
    assert.deepEqual([read.files, read.counted, read.issueOnly], [5, 2, 1]);
    assert.deepEqual(read.unread.map((u) => u.file), ['.github/workflows/odd.yaml']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a reusable workflow counts when a workflow that counts calls it by local path, one level', () => {
  assert.equal(trigger('on: workflow_call').called, true);
  assert.equal(trigger('on:\n  workflow_call:\n    inputs:\n      x: { type: string }\n  workflow_dispatch: {}').called, true);
  assert.equal(trigger('on: workflow_dispatch').called, false);
  const root = mkdtempSync(join(tmpdir(), 'slipway-commands-'));
  try {
    const dir = join(root, '.github', 'workflows');
    mkdirSync(dir, { recursive: true });
    const reusable = (name, cmd, extra = '') => writeFileSync(join(dir, name), `on:\n  workflow_call:\njobs:\n  a:\n    steps:\n      - run: ${cmd}\n${extra}`);
    const calls = (uses) => uses.map((u, i) => `  j${i}:\n    uses: ${u}\n`).join('');
    reusable('called.yml', 'pnpm test', calls(['./.github/workflows/nested.yml']));
    reusable('nested.yml', 'pnpm lint');
    reusable('tagged.yml', 'pnpm build');
    reusable('nobody.yml', 'pnpm check');
    reusable('dynamic.yml', 'pnpm typecheck');
    writeFileSync(join(dir, 'manual.yml'), 'on: workflow_dispatch\njobs:\n  a:\n    steps:\n      - run: pnpm test:manual\n');
    writeFileSync(join(dir, 'release.yml'), `on:\n  push:\n    tags: [v1]\njobs:\n${calls(['./.github/workflows/tagged.yml'])}`);
    writeFileSync(join(dir, 'ci.yml'), `on: pull_request\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v7\n      - uses: ./.github/actions/setup\n${calls([
      '"./.github/workflows/called.yml"  # quoted, with a comment',
      './.github/workflows/${{ vars.WHICH }}.yml',
      'octo-org/shared/.github/workflows/remote.yml@v1',
      './.github/workflows/missing.yml',
      './.github/workflows/manual.yml',
      './.github/workflows/../workflows/dynamic.yml',
    ])}`);
    const read = workflowCommands(root);
    assert.deepEqual(read.commands.map((c) => c.cmd), ['pnpm test']);
    assert.deepEqual([read.files, read.counted], [8, 2]);
    assert.deepEqual(read.unfollowed.map((u) => u.file.split('/').at(-1)), ['ci.yml', 'ci.yml', 'called.yml', 'ci.yml', 'ci.yml']);
    assert.deepEqual(read.unfollowed.map((u) => u.reason.split(/[,:] /)[1]), ['holds an expression', 'names a workflow outside this repository', 'and what it calls in turn is not followed', 'names a workflow file that is missing', 'names a workflow file that is missing']);
    for (const u of read.unfollowed) assert.doesNotMatch(u.reason, /octo|vars|missing\.yml|manual\.yml/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Review round 1 of #239's pull request: text that only looks like a trigger or a call.
test('an on: line that is text inside a quoted scalar, a bracket or another document is not the trigger', () => {
  const raw = (text, reason) => {
    const t = workflowTrigger(text);
    assert.deepEqual([t.counts, t.issues, t.called], [false, false, false], text);
    assert.match(t.unread ?? '', reason, text);
  };
  raw('on:\n  pull_request: # note\r    types: [closed]\njobs: {}\n', /line break W1 does not read/);
  raw('on:\n  push: # note\u2028    tags: [v1]\n', /line break W1 does not read/);
  raw('on:\n  push: # note\u0085    tags: [v1]\n', /line break W1 does not read/);
  raw('{ name: "a\non: push\nz", "on": workflow_dispatch, jobs: {} }\n', /inside a quoted or bracketed text/);
  raw('name: "a\non: push\nz"\n"\\x6fn": workflow_dispatch\njobs: {}\n', /inside a quoted or bracketed text/);
  raw("name: 'it''s\non: push\nz'\njobs: {}\n", /inside a quoted or bracketed text/);
  raw('env:\n  A: "x\non: push\n  z"\njobs: {}\n', /inside a quoted or bracketed text/);
  raw('env:\n  A: |\n    "\n  B: "x\non: push\n  z"\n', /inside a quoted or bracketed text/);
  raw('env:\n  A: [a,\non: push\n  ]\n', /inside a quoted or bracketed text/);
  raw('on:\n  push:\n    tags: "v*\n    branches: x"\n', /runs over a line/);
  raw('on:\n  workflow_dispatch:\n    inputs:\n      a:\n        default: "x\n  pull_request:\n  zzz:\n        "\n', /runs over a line/);
  raw('name: x\n---\non: push\n', /not a plain key/);
  raw('on: push\n"\\x6fn": workflow_dispatch\n', /not a plain key/);
  raw('on: push\n? on\n: workflow_dispatch\n', /not a plain key/);
  // What a real workflow holds, and none of it hides anything: an apostrophe in plain text, a quote or a bracket
  // inside a run block, a list over several lines.
  counts("name: Don't panic # it's fine\non: push\njobs:\n  a:\n    steps:\n      - run: |\n          echo \"[\n      - run: echo it's");
  counts('name: a\nenv:\n  M: [\n    a,\n  ]\non: [pull_request]');
  counts('env:\n  NOTE: >-\n    "on: nothing\n\n    more\non: pull_request');
  for (const head of ['A: |', 'A: !!str >-', 'A: &a |2+  # kept', '- |', '- - B: |-']) {
    counts(`env:\n  ${head}\n          "on: nothing\non: pull_request`);
  }
  // A long line is read in time proportional to its length.
  const started = Date.now();
  counts(`on: push\nx:\n  ${'- '.repeat(200_000)}x`);
  assert.ok(Date.now() - started < 2000, `${Date.now() - started} ms`);
});

test('only a job\'s own uses: calls a workflow: not a step, a with: value, a run block or a quoted text', () => {
  const root = mkdtempSync(join(tmpdir(), 'slipway-commands-'));
  try {
    const dir = join(root, '.github', 'workflows');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'called.yml'), 'on:\n  workflow_call:\njobs:\n  a:\n    steps:\n      - run: pnpm verify\n');
    const USES = 'uses: ./.github/workflows/called.yml';
    const ci = (body) => writeFileSync(join(dir, 'ci.yml'), `on: pull_request\n${body}`);
    const followed = () => workflowCommands(root).commands.map((c) => c.cmd);
    for (const body of [
      `jobs:\n  a:\n    env:\n      NOTE: |\n        ${USES}\n    steps:\n      - run: pnpm test\n`,
      `jobs:\n  a:\n    steps:\n      - ${USES}\n      - run: pnpm test\n`,
      `jobs:\n  a:\n    steps:\n      - uses: some/action@v1\n        with:\n          ${USES}\n      - run: pnpm test\n`,
      `jobs:\n  a:\n    env:\n      ${USES}\n    steps:\n      - run: pnpm test\n`,
      `jobs:\n  a:\n    name: "x\n    ${USES}\n      y"\n    steps:\n      - run: pnpm test\n`,
      `env:\n  ${USES}\njobs:\n  a:\n    steps:\n      - run: pnpm test\n`,
      `${USES}\njobs:\n  a:\n    steps:\n      - run: pnpm test\n`,
    ]) {
      ci(body);
      assert.deepEqual(followed(), ['pnpm test'], body);
    }
    ci(`jobs:\n  a:\n    steps:\n      - run: pnpm test\n  b:\n    name: b\n    ${USES}   # the call\n`);
    assert.deepEqual(followed(), ['pnpm verify', 'pnpm test']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
