#!/usr/bin/env node
// The prose job and the PR-body Vale steps in a project's CI (F-16 §10, D-051, #550): each test runs the command a
// workflow step runs, as written in .github/workflows/, with the env that workflow gives it, in a project made by
// new-project. The first run that lifts the guard and records the count fails unless the count is the measured one; a
// new repository's first push reads its own commit as the base; a project's PR body with a chatbot phrase fails; W1 counts
// check:prose as run. Internal: the `prose` CI job runs it in slipway, never a project, and never `pnpm meta`, which
// installs nothing. With no `vale` on the path it exits 2 (BROKEN) at once.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { readWorkflow } from '../ci/checks/lib/workflow-yaml.mjs';
import { commitAll, inProject, LONG, NO_VALE, newProject, sh, SRC } from './lib/prose-project.mjs';

if (spawnSync('vale', ['--version']).status !== 0) {
  console.error('PROSE JOB TEST: BROKEN — vale is not on the path, so no rule was run — install it: `brew install vale`, or the release at https://github.com/errata-ai/vale/releases');
  process.exit(2);
}

// GitHub's expression syntax as far as these workflows' env uses it: context paths, '…' strings, ==, !=, !, &&, || and
// brackets. && and || return an operand, as GitHub's do; '', null, false and 0 are false; == on strings ignores case. Any
// other token throws, so a new form in a workflow fails here instead of being read wrong.
function evaluate(expr, ctx) {
  const tokens = expr.match(/'(?:[^']|'')*'|==|!=|&&|\|\||[()!]|[A-Za-z_][\w.-]*|\S/g);
  const truthy = (v) => v !== '' && v !== null && v !== false && v !== 0;
  let i = 0;
  const primary = () => {
    const t = tokens[i++];
    if (t === '(') {
      const v = or();
      assert.equal(tokens[i++], ')', expr);
      return v;
    }
    if (t === '!') return !truthy(primary());
    if (t?.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
    if (/^[A-Za-z_]/.test(t ?? '')) return t.split('.').reduce((o, k) => o?.[k], ctx) ?? null;
    throw new Error(`not read: ${t} in ${expr}`);
  };
  const eq = () => {
    let v = primary();
    while (tokens[i] === '==' || tokens[i] === '!=') {
      const op = tokens[i++];
      const same = String(v ?? '').toLowerCase() === String(primary() ?? '').toLowerCase();
      v = op === '==' ? same : !same;
    }
    return v;
  };
  const and = () => {
    let v = eq();
    while (tokens[i] === '&&') {
      i++;
      const w = eq();
      v = truthy(v) ? w : v;
    }
    return v;
  };
  const or = () => {
    let v = and();
    while (tokens[i] === '||') {
      i++;
      const w = and();
      v = truthy(v) ? v : w;
    }
    return v;
  };
  const v = or();
  assert.equal(i, tokens.length, expr);
  return v;
}
// A value as the runner sets it: a whole `${{ }}` is evaluated, null is '', anything else is the text.
const valueOf = (raw, ctx) => {
  const m = /^\$\{\{([\s\S]*)\}\}$/.exec(String(raw).trim());
  if (!m) return String(raw);
  const v = evaluate(m[1].trim(), ctx);
  return v === null ? '' : String(v);
};

const workflow = (file) => readWorkflow(readFileSync(join(SRC, '.github', 'workflows', file), 'utf8')).root;
// The job's env and the step whose run (or name) matches `which`, from the workflow as written.
function stepOf(file, job, which) {
  const j = workflow(file).entries.get('jobs').entries.get(job);
  const step = j.entries.get('steps').items.find((s) => which.test(String(s.entries.get('name')?.value ?? s.entries.get('run')?.value)));
  assert.ok(step, `${file} ${job} has a step matching ${which}`);
  const env = (node, ctx) => Object.fromEntries([...(node?.entries ?? new Map())].map(([k, v]) => [k, valueOf(v.value, ctx)]));
  return { run: String(step.entries.get('run').value), env: (ctx) => ({ ...env(j.entries.get('env'), ctx), ...env(step.entries.get('env'), ctx) }) };
}
// Runs a step as the runner does (bash, -e, pipefail), in `cwd`, with the env the workflow gives it.
const runStep = (step, cwd, ctx, extra = {}) =>
  spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', step.run], { cwd, encoding: 'utf8', env: { ...process.env, ...extra, ...step.env(ctx) } });
const head = (dir, ref = 'HEAD') => spawnSync('git', ['rev-parse', ref], { cwd: dir, encoding: 'utf8' }).stdout.trim();

const ZEROS = '0'.repeat(40);
const CHECK = stepOf('ci.yml', 'prose', /^pnpm check:prose$/);
const pr = (dir) => ({ github: { event: { pull_request: { base: { sha: head(dir, 'main') } } }, sha: head(dir) } });
const push = (dir, before) => ({ github: { event: before === undefined ? {} : { before }, sha: head(dir) } });

test('the PR that lifts the guard and records the count: the prose job fails unless the count is the one measured', () => {
  const { dir } = newProject(false);
  try {
    // main as a project had it before this step: the prose job guarded, no count, one warning in README.
    const ci = join(dir, '.github', 'workflows', 'ci.yml');
    const lifted = readFileSync(ci, 'utf8');
    writeFileSync(ci, lifted.replace('    name: prose\n', '    name: prose\n    if: ${{ github.event.repository.is_template }}\n'));
    appendFileSync(join(dir, 'README.md'), `\n${LONG}`);
    commitAll(dir, 'before #550');
    for (const [n, status] of [[12, 1], [1, 0]]) {
      sh(dir, 'checkout', '-q', '-b', `record-${n}`, 'main');
      writeFileSync(ci, lifted);
      assert.equal(inProject(dir, ['--record', String(n)], NO_VALE).status, 0);
      commitAll(dir, `lift the guard, record ${n}`);
      const r = runStep(CHECK, dir, pr(dir));
      assert.equal(r.status, status, r.stdout + r.stderr);
      if (status === 1) assert.match(r.stdout, /this change records 12, and this run measured 1 warning on .* record 1$/m);
    }
  } finally {
    rmSync(dirname(dir), { recursive: true, force: true });
  }
});

test('PROSE_BASE: a pull request\'s base, a push\'s before, the commit itself only when before is all zeros', () => {
  const ctx = (event) => ({ github: { event, sha: 'c'.repeat(40) } });
  const base = (event) => CHECK.env(ctx(event)).PROSE_BASE;
  assert.equal(base({ pull_request: { base: { sha: 'a'.repeat(40) } }, before: ZEROS }), 'a'.repeat(40));
  assert.equal(base({ before: 'b'.repeat(40) }), 'b'.repeat(40));
  assert.equal(base({ before: ZEROS }), 'c'.repeat(40), 'the first push of a new repository');
  assert.equal(base({ before: 'garbage' }), 'garbage', 'any other value is passed as it is');
  assert.equal(base({}), '', 'an unset before is not the commit');
});

test('a new project\'s first push passes the prose job; a base that is not a commit, or none, is BROKEN', () => {
  const { dir } = newProject(true);
  try {
    const first = runStep(CHECK, dir, push(dir, ZEROS));
    assert.equal(first.status, 0, first.stdout + first.stderr);
    for (const before of ['0123456789abcdef0123456789abcdef01234567', undefined]) {
      const r = runStep(CHECK, dir, push(dir, before));
      assert.equal(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stdout, /BROKEN — the base .* is not a commit here/);
    }
  } finally {
    rmSync(dirname(dir), { recursive: true, force: true });
  }
});

test('a project\'s PR body holding "I hope this helps" fails the PR-body workflow on the chatbot rule, naming the phrase and the fix', () => {
  const { dir } = newProject(false);
  try {
    const temp = join(dirname(dir), 'runner');
    mkdirSync(join(temp, 'pr'), { recursive: true });
    const step = stepOf('pr-body.yml', 'pr-body', /chatbot phrasing/);
    for (const [body, status] of [['## What\n\nI hope this helps.\n', 1], ['## What\n\nThe prose job runs here.\n', 0]]) {
      writeFileSync(join(temp, 'pr', 'body.md'), body);
      const r = runStep(step, dir, {}, { RUNNER_TEMP: temp });
      assert.equal(r.status, status, r.stdout + r.stderr);
      if (status === 1) assert.match(r.stdout, /body\.md:3: Slipway\.Chatbot: Chatbot phrasing: delete 'I hope this helps'\. Start with what the reader does next/);
    }
  } finally {
    rmSync(dirname(dir), { recursive: true, force: true });
  }
});

test('a project\'s W1 counts check:prose as run by its ci.yml, and fails without that line; its two workflows pin the template\'s Vale', () => {
  const { dir } = newProject(false);
  try {
    const w1 = () => spawnSync(process.execPath, [join(dir, 'ci', 'checks', 'meta', 'w1-declared-vs-invoked.mjs'), '.'], { cwd: dir, encoding: 'utf8' });
    const ok = w1();
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const ci = join(dir, '.github', 'workflows', 'ci.yml');
    const text = readFileSync(ci, 'utf8');
    writeFileSync(ci, text.replace('      - run: pnpm check:prose\n', ''));
    const without = w1();
    assert.equal(without.status, 1, without.stdout);
    assert.match(without.stdout, /check:prose/);
    writeFileSync(ci, text);
    const pin = (root, file) => {
      const t = readFileSync(join(root, '.github', 'workflows', file), 'utf8');
      return [/VALE_VERSION: (\S+)/.exec(t)?.[1], /VALE_SHA256: (\S+)/.exec(t)?.[1]];
    };
    const template = pin(SRC, 'ci.yml');
    assert.ok(template.every(Boolean), 'the template pins a version and a sha256');
    for (const file of ['ci.yml', 'pr-body.yml']) assert.deepEqual(pin(dir, file), template, file);
  } finally {
    rmSync(dirname(dir), { recursive: true, force: true });
  }
});
