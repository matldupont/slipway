// scripts/mt1.test.mjs, part: where the step runs (§1) — the root script and the `meta` line, W1 counting MT1 from that
// line in slipway and in a project new-project makes, no workflow running the step (AR-7 of the 0.5 review), and the
// spec's What is reused line on the name (AR-6 of the 0.5 review).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { parseCommand } from '../../ci/checks/lib/commands.mjs';
import { section } from '../../ci/checks/lib/markdown.mjs';
import { runLines } from '../../ci/checks/lib/workflows.mjs';
import { readWorkflow } from '../../ci/checks/lib/workflow-yaml.mjs';
import { newProject, SRC } from '../lib/prose-project.mjs';

const scriptsOf = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
const META_LINE = 'node ci/checks/meta/mt1-tests-can-fail.mjs ci/fixtures/mt1-green';
const w1 = (root) => spawnSync(process.execPath, [join(root, 'ci', 'checks', 'meta', 'w1-declared-vs-invoked.mjs'), '.'], { cwd: root, encoding: 'utf8' });

// Each run line of each workflow file that runs the step: the root script, by pnpm, or MT1's --run form.
function runsTheStep(root) {
  const dir = join(root, '.github', 'workflows');
  const found = [];
  for (const f of readdirSync(dir).filter((e) => /\.ya?ml$/.test(e))) {
    const w = readWorkflow(readFileSync(join(dir, f), 'utf8'));
    assert.ok(w.root, `${f} is read: ${w.reason ?? ''}`);
    for (const { where, cmd } of runLines(`.github/workflows/${f}`, w.root)) {
      const calls = parseCommand(cmd);
      if (calls.some((c) => c.kind === 'pnpm-script' && c.script === 'tests-can-fail') || (/mt1-tests-can-fail\.mjs/.test(cmd) && /(^|\s)--run(\s|$)/.test(cmd))) found.push(where);
    }
  }
  return found;
}

test('the root script runs MT1 --run; the meta script runs MT1 on ci/fixtures/mt1-green and scripts/mt1.test.mjs; MT1 passes on that fixture', () => {
  const scripts = scriptsOf(SRC);
  assert.equal(scripts['tests-can-fail'], 'node ci/checks/meta/mt1-tests-can-fail.mjs --run');
  const meta = scripts.meta.split(' && ');
  assert.ok(meta.includes(META_LINE));
  assert.ok(meta.includes('node scripts/mt1.test.mjs'));
  assert.equal(scripts.verify.includes('tests-can-fail'), false, 'not in pnpm verify');
  const r = spawnSync(process.execPath, META_LINE.split(' ').slice(1), { cwd: SRC, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /^PASS: \d+ new tests: \d+ passed, 0 failed, \d+ not judged\. \(MT1\)$/m);
  // AR-13: the green record holds a not-judged test for each of these reasons, so each one's warning is read on a pass.
  const why = JSON.parse(readFileSync(join(SRC, 'ci', 'fixtures', 'mt1-green', 'run.json'), 'utf8')).notJudged.map((n) => n.why);
  for (const reason of ['support-only', 'other-language', 'excused', 'skipped', 'flaky', 'other-runner']) assert.ok(why.includes(reason), reason);
});

test('no workflow runs the step: run lines are read for the root script and MT1 --run, not the words anywhere', (t) => {
  assert.deepEqual(runsTheStep(SRC), []);
  const probe = mkdtempSync(join(tmpdir(), 'mt1-workflows-'));
  t.after(() => rmSync(probe, { recursive: true, force: true }));
  mkdirSync(join(probe, '.github', 'workflows'), { recursive: true });
  const ci = join(probe, '.github', 'workflows', 'mt1-probe.yml');
  const flow = (steps) => `name: probe\non:\n  pull_request:\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n${steps}`;
  // Text that names the step and runs nothing: an env value and the config file's name.
  writeFileSync(ci, flow('      - run: cat ci/tests-can-fail.yaml\n        env:\n          NOTE: pnpm tests-can-fail\n'));
  assert.deepEqual(runsTheStep(probe), []);
  for (const run of ['pnpm tests-can-fail', 'pnpm run tests-can-fail', 'node ci/checks/meta/mt1-tests-can-fail.mjs --run']) {
    writeFileSync(ci, flow(`      - run: ${run}\n`));
    assert.deepEqual(runsTheStep(probe), ['.github/workflows/mt1-probe.yml:8'], run);
  }
});

test('W1 counts MT1 as run from the meta line, and lists no gated script for tests-can-fail', () => {
  const r = w1(SRC);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /tests-can-fail|mt1-tests-can-fail/);
});

test('in a project new-project makes: the meta line and ci/fixtures/mt1-green are there and W1 exits 0; without the line W1 fails naming MT1', (t) => {
  const { dir } = newProject(false);
  t.after(() => rmSync(dirname(dir), { recursive: true, force: true }));
  const scripts = scriptsOf(dir);
  assert.ok(scripts.meta.split(' && ').includes(META_LINE));
  assert.equal(scripts.meta.includes('scripts/mt1.test.mjs'), false, 'slipway\'s own test never ships');
  assert.equal(scripts['tests-can-fail'], 'node ci/checks/meta/mt1-tests-can-fail.mjs --run');
  assert.ok(existsSync(join(dir, 'ci', 'fixtures', 'mt1-green', 'run.json')));
  assert.ok(existsSync(join(dir, 'ci', 'mutation.mjs')), 'the root script arrives with what it calls');
  const ok = w1(dir);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  pkg.scripts.meta = pkg.scripts.meta.split(' && ').filter((c) => c !== META_LINE).join(' && ');
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  const without = w1(dir);
  assert.equal(without.status, 1, without.stdout);
  assert.match(without.stdout, /mt1-tests-can-fail\.mjs/);
});

test('the spec says the name is outside W1\'s gated pattern on purpose, not that it follows check:prose (AR-6)', () => {
  const spec = readFileSync(join(SRC, 'dev', 'features', 'tests-can-fail.md'), 'utf8');
  const reused = section(spec, 'What is reused', 3) ?? '';
  assert.match(reused, /`tests-can-fail` is outside W1's gated pattern on purpose \(§1\)/);
  assert.doesNotMatch(reused, /follows a name already in use/);
});
