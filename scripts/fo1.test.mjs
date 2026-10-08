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

test('the flag is found as a key of a step, of a job, and written as a flow or a quoted value', () => {
  const r = fo1(
    `name: x\non: [pull_request]\njobs:\n  a:\n    continue-on-error: "true"\n    steps:\n      - { id: b, run: echo, continue-on-error: true }\n      - id: c\n        run: echo\n        continue-on-error: "false"\n      - name: d\n        continue-on-error: ${'$'}{{ matrix.x }}\n        run: echo\n`
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
  for (const workflow of ['name: x\non: push\njobs: [a, b]\n', 'name: x\non: push\njobs:\n  a: echo\n', 'name: x\non: push\njobs:\n  a:\n    steps: echo\n', 'name: x\non: push\njobs:\n  a:\n    steps:\n      - echo\n']) {
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
