#!/usr/bin/env node
// FO1 reads a workflow file through the shared reader (ci/checks/lib/workflow-yaml.mjs, D-033, #332): what is a
// `continue-on-error` key of a job or a step, and what is only text; and what it does with a file that reader
// refuses. PC1 covers FO1's known-bad fixtures (ci/fixtures/known-bad/fo1/*); these cover the green runs.
// Every workflow text here is inert: none is run. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { done, run } from './lib/lk1-lockfile.mjs';

const fo1 = (workflow, registry = null) => {
  const dir = mkdtempSync(join(tmpdir(), 'fo1-'));
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(dir, '.github', 'workflows', 'ci.yml'), workflow);
  if (registry !== null) {
    mkdirSync(join(dir, 'ci'), { recursive: true });
    writeFileSync(join(dir, 'ci', 'exceptions.yaml'), registry);
  }
  try {
    return run('ci/checks/meta/fo1-fail-open.mjs', dir, { CHECK_TODAY: '2026-09-10' });
  } finally {
    done(dir);
  }
};
// Several workflow files at once, for the path-filter rule (#392): { 'ci.yml': text, ... }.
const fo1Files = (files, registry = null) => {
  const dir = mkdtempSync(join(tmpdir(), 'fo1-'));
  mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, '.github', 'workflows', name), text);
  if (registry !== null) {
    mkdirSync(join(dir, 'ci'), { recursive: true });
    writeFileSync(join(dir, 'ci', 'exceptions.yaml'), registry);
  }
  try {
    return run('ci/checks/meta/fo1-fail-open.mjs', dir, { CHECK_TODAY: '2026-09-10' });
  } finally {
    done(dir);
  }
};
const flow = (on, command = 'pnpm verify') => `name: x\non:\n${on}\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: ${command}\n`;
const wrap = (steps) => `name: x\non: [pull_request]\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n${steps}`;

test('the flag as text is not a flag: in a run block, under env, in a quoted text', () => {
  const text = {
    'a run block': wrap('      - name: prints it\n        run: |\n          echo "continue-on-error: true"\n          continue-on-error: true\n'),
    'env': wrap('      - name: sets it\n        env:\n          continue-on-error: true\n        run: echo\n'),
    'a quoted text': wrap('      - name: says it\n        run: echo "x"\n        if: "github.event.x == \'continue-on-error: true\'"\n      - run: echo\n        env: { NOTE: "continue-on-error: true" }\n'),
  };
  for (const [what, workflow] of Object.entries(text)) {
    const r = fo1(workflow);
    assert.equal(r.status, 0, `${what}: ${r.out}`);
    assert.deepEqual(r.json.findings, [], what);
  }
});

test('the flag is found as a key of a step, of a job, and written as a flow or a quoted value; a plain false is not', () => {
  const r = fo1(
    `name: x\non: [pull_request]\njobs:\n  a:\n    continue-on-error: "true"\n    steps:\n      - { id: b, run: echo, continue-on-error: true }\n      - id: c\n        run: echo\n        continue-on-error: false\n      - name: d\n        continue-on-error: ${'$'}{{ matrix.x }}\n        run: echo\n`
  );
  assert.equal(r.status, 1, r.out);
  assert.deepEqual(
    r.json.findings.map((f) => f.where),
    ['.github/workflows/ci.yml#a', '.github/workflows/ci.yml#a/b', '.github/workflows/ci.yml#a/name=d']
  );
});

test('a file the shared reader refuses is BROKEN, naming the file and the reader\'s reason, and none of its text', () => {
  for (const [workflow, reason] of [
    ['name: x\non: push\nx: &a 1\njobs: {}\n', 'it holds an anchor'],
    ['name: x\non: push\njobs:\n  a:\n    steps:\n      - run: echo\n  a: {}\n', 'a key is written more than once'],
    ['name: x\non: [push\njobs:\n', 'it is not YAML the parser can read'],
  ]) {
    const r = fo1(workflow);
    assert.equal(r.status, 2, r.out);
    assert.match(r.json.broken, new RegExp(`^\\.github/workflows/ci\\.yml: unread — ${reason}`));
    assert.ok(!r.json.broken.includes('echo'), 'the file\'s text stays out of the report');
  }
});

test('a jobs: block FO1 cannot see into is BROKEN, not clean', () => {
  for (const workflow of ['name: x\non: push\njobs:\n', 'name: x\non: push\njobs:\n  a:\n    steps:\n','name: x\non: push\njobs: [a, b]\n', 'name: x\non: push\njobs:\n  a: echo\n', 'name: x\non: push\njobs:\n  a:\n    steps: echo\n', 'name: x\non: push\njobs:\n  a:\n    steps:\n      - echo\n']) {
    const r = fo1(workflow);
    assert.equal(r.status, 2, `${workflow}: ${r.out}`);
    assert.match(r.json.broken, /^\.github\/workflows\/ci\.yml: /);
  }
});

test('the id of a job or a step is the same as before: id, then name, then position', () => {
  const r = fo1(
    wrap('      - id: one\n        run: echo\n        continue-on-error: true\n      - name: "Two words"\n        run: echo\n        continue-on-error: true\n      - run: echo\n        continue-on-error: true\n      - name: |\n          block\n        run: echo\n        continue-on-error: true\n')
  );
  assert.deepEqual(
    r.json.findings.map((f) => f.where),
    ['.github/workflows/ci.yml#a/one', '.github/workflows/ci.yml#a/name=Two words', '.github/workflows/ci.yml#a/step[2]', '.github/workflows/ci.yml#a/step[3]']
  );
});

test('only a plain false, in any case, and an empty flag fail closed', () => {
  const flag = (value) => fo1(wrap(`      - id: s\n        run: echo\n        continue-on-error: ${value}\n`));
  for (const closed of ['false', 'False', 'FALSE', '', 'false # kept for the matrix']) {
    const r = flag(closed);
    assert.equal(r.status, 0, `${JSON.stringify(closed)}: ${r.out}`);
  }
});

test('a false written as quoted text or as a block is reported, and the finding says to write it plain', () => {
  const flag = (value) => fo1(wrap(`      - id: s\n        run: echo\n        continue-on-error: ${value}\n`));
  const blocks = ['|', '|-', '|+', '>', '>-', '>+'].map((indicator) => `${indicator}\n          false`);
  for (const written of [...blocks, '"false"', "'false'"]) {
    const r = flag(written);
    assert.equal(r.status, 1, `${JSON.stringify(written)}: ${r.out}`);
    assert.deepEqual(r.json.findings.map((f) => f.where), ['.github/workflows/ci.yml#a/s'], written);
    assert.match(r.json.findings[0].detail, /write it as plain false/, written);
  }
});

test('every other value is reported, and its finding does not call it a false', () => {
  const flag = (value) => fo1(wrap(`      - id: s\n        run: echo\n        continue-on-error: ${value}\n`));
  for (const open of ['true', '[false]', '{a: false}', 'no', '0', '${{ matrix.x }}']) {
    const r = flag(open);
    assert.equal(r.status, 1, `${JSON.stringify(open)}: ${r.out}`);
    assert.deepEqual(r.json.findings.map((f) => f.where), ['.github/workflows/ci.yml#a/s'], open);
    assert.doesNotMatch(r.json.findings[0].detail, /plain false/, open);
  }
});

test('a flag that is not a line of text is reported without a line number', () => {
  const r = fo1(wrap('      - id: s\n        run: echo\n        continue-on-error: [false]\n'));
  assert.equal(r.status, 1, r.out);
  assert.doesNotMatch(r.json.findings[0].detail, /currently line/);
  const text = fo1(wrap('      - id: s\n        run: echo\n        continue-on-error: true\n'));
  assert.match(text.json.findings[0].detail, /currently line 9\)/);
});

test('a name over several lines is no name; a folded block that folds to one line is its text', () => {
  const r = fo1(
    wrap('      - name: >-\n          folded\n        run: echo\n        continue-on-error: true\n      - name: >\n          one\n\n          two\n        run: echo\n        continue-on-error: true\n')
  );
  assert.deepEqual(r.json.findings.map((f) => f.where), ['.github/workflows/ci.yml#a/name=folded', '.github/workflows/ci.yml#a/step[1]']);
});

// The path-filter rule (#392). Its known-bad fixture is ci/fixtures/known-bad/fo1/path-filter; these are the controls.
test('the #239 shape is green: a deploy workflow that skips documentation pushes beside a ci.yml that runs the gate on every push', () => {
  const r = fo1Files({
    'ci.yml': flow('  pull_request:\n  push:\n    branches: [main]'),
    'deploy.yml': flow('  push:\n    branches: [main]\n    paths-ignore: ["docs/**"]'),
  });
  assert.equal(r.status, 0, r.out);
  assert.deepEqual(r.json.findings, []);
});

test('a filter on one event is found, on the other event is not; a filtered workflow running no gate, and a gate with no filter, are green', () => {
  const r = fo1Files({
    'a.yml': flow('  pull_request:\n    paths: ["src/**"]\n  push:\n    branches: [main]'),
    'docs.yml': flow('  push:\n    paths: ["docs/**"]', 'echo publish'),
  });
  assert.equal(r.status, 1, r.out);
  assert.deepEqual(r.json.findings.map((f) => f.where), ['.github/workflows/a.yml#on.pull_request']);
});

test('every workflow that runs the gate on the event is filtered: each is found, and each names the others', () => {
  const r = fo1Files({
    'a.yml': flow('  push:\n    paths: ["a/**"]'),
    'b.yml': flow('  push:\n    paths-ignore: ["b/**"]'),
  });
  assert.deepEqual(r.json.findings.map((f) => f.where), ['.github/workflows/a.yml#on.push', '.github/workflows/b.yml#on.push']);
  assert.match(r.json.findings[0].detail, /and so does \.github\/workflows\/b\.yml/);
});

test('a dated entry excuses a filtered gate; an entry for a gate that is covered is stale; an expired one is found', () => {
  const files = { 'a.yml': flow('  push:\n    paths: ["a/**"]') };
  const entry = (id, expires) => `exceptions:\n  - id: ${id}\n    reason: r\n    owner: o\n    expires: ${expires}\n`;
  assert.equal(fo1Files(files, entry('.github/workflows/a.yml#on.push', '2026-12-31')).status, 0);
  const expired = fo1Files(files, entry('.github/workflows/a.yml#on.push', '2026-09-10'));
  assert.deepEqual(expired.json.findings.map((f) => f.where).sort(), ['.github/workflows/a.yml#on.push', 'registry:.github/workflows/a.yml#on.push']);
  const covered = fo1Files({ ...files, 'ci.yml': flow('  push:\n    branches: [main]') }, entry('.github/workflows/a.yml#on.push', '2026-12-31'));
  assert.deepEqual(covered.json.findings.map((f) => f.where), ['registry:.github/workflows/a.yml#on.push']);
});

test('a gate a tag, a schedule or a manual run starts is not a run on a change: it does not cover a filtered one', () => {
  const r = fo1Files({
    'a.yml': flow('  push:\n    branches: [main]\n    paths: ["a/**"]'),
    'release.yml': flow('  push:\n    tags: ["v*"]'),
  });
  assert.deepEqual(r.json.findings.map((f) => f.where), ['.github/workflows/a.yml#on.push']);
});

test('a workflow whose trigger cannot be read is BROKEN, since a filter in it could not be seen', () => {
  const r = fo1Files({ 'a.yml': flow('  push: {branches: [main]}') });
  assert.equal(r.status, 2, r.out);
  assert.match(r.json.broken, /^\.github\/workflows\/a\.yml: its path filters were not read — /);
});
