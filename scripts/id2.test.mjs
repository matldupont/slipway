#!/usr/bin/env node
// ID2 (ci/checks/meta/id2-open-prs.mjs) and its collector (ci/checks/lib/open-pr-ids.mjs): the green runs, the BROKEN
// ones, what reaches the output, and the collector against a local `origin` whose open pull requests a stand-in `gh`
// lists. PC1 covers ID2's known-bad fixtures (ci/fixtures/known-bad/id2/*).
// scripts/skills.test.mjs pins process/intake.md → Next free number and each skill's citation of it (#478). Every file here is inert text. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { run, SRC } from './lib/lk1-lockfile.mjs';

const ID2 = 'ci/checks/meta/id2-open-prs.mjs';
const header = (path) => `diff --git a/${path} b/${path}\nindex 1111111..2222222 100644\n--- a/${path}\n+++ b/${path}\n`;
const adds = (path, ...lines) => `${header(path)}@@ -1,0 +2,${lines.length} @@\n${lines.map((l) => `+${l}`).join('\n')}\n`;
const folder = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'id2-'));
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    if (body !== null) writeFileSync(join(dir, p), body);
  }
  return dir;
};
const id2 = (files) => {
  const dir = folder(files);
  try {
    const r = run(ID2, dir);
    return { status: r.status, out: r.out, findings: (r.json?.findings ?? []).map((f) => f.where), json: r.json };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// ID2 --next on a folder of these files: the same report, read the same way.
const nextOf = (files) => {
  const dir = folder(files);
  try {
    const r = spawnSync(process.execPath, [join(SRC, ID2), dir, '--next'], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
    const line = r.stdout.split('\n').findLast((l) => l.startsWith('@@json '));
    return { status: r.status, out: r.stdout, json: line ? JSON.parse(line.slice('@@json '.length)) : null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('different ids report nothing, and the run says how many diffs it read', () => {
  const r = id2({ 'this.diff': adds('decisions.md', '## PD-7 — a'), 'open/41.diff': adds('decisions.md', '## PD-8 — b'), 'open/52.diff': adds('docs/features/x.md', '# F-7 — x') });
  assert.deepEqual([r.status, r.findings, r.json.scanned], [0, [], 3]);
});

test('no other open pull request is green, and this diff alone counts as read', () => {
  const r = id2({ 'this.diff': adds('decisions.md', '## PD-7 — a'), 'open/.keep': null });
  assert.deepEqual([r.status, r.json.scanned], [0, 1]);
});

test('a push compares nothing and says so', () => {
  const r = id2({ 'not-a-pull-request': '' });
  assert.equal(r.status, 0);
  assert.match(r.out, /not a pull request, so no open pull request was compared/);
});

test('the clash prints the other pull request number and the id, never the rest of its heading or its path', () => {
  const r = id2({
    'this.diff': adds('decisions.md', '## D-3 — ours'),
    'open/77.diff': adds('decisions.md', '## D-3 — SECRET-WORDS \u001b[31m'),
    'open/78.diff': adds('dev/features/SECRET-PATH.md', '# F-03 — x'),
  });
  assert.deepEqual([r.status, r.findings], [1, ['open-pr/77/D-3']]);
  assert.doesNotMatch(r.out, /SECRET|\u001b/);
});

test('the heading-text fixture prints #77 and D-3, and none of the heading\'s other text', () => {
  const r = run(ID2, join(SRC, 'ci/fixtures/known-bad/id2/heading-text'));
  assert.deepEqual([r.status, r.json.findings.map((f) => f.where)], [1, ['open-pr/77/D-3']]);
  assert.doesNotMatch(r.out, /SECRET|WORDS|ANOTHER/);
});

test('a marker beside other files is BROKEN, never a push', () => {
  const r = id2({ 'not-a-pull-request': '', 'this.diff': adds('decisions.md', '## PD-7 — a'), 'open/41.diff': adds('decisions.md', '## PD-7 — b') });
  assert.equal(r.status, 2);
  assert.match(r.json.broken, /beside other files/);
});

test('a pull request that adds no id reads no other, so another one it cannot read does not hold it', () => {
  const r = id2({ 'this.diff': adds('docs/notes.md', 'x'), 'open/41.diff': 'diff --git "a/x" "b/x"\n--- "a/x"\n+++ "b/x"\n' });
  assert.equal(r.status, 0);
  assert.match(r.out, /adds no decision or feature id/);
});

test('an id of many digits is printed as written, leading zeros dropped, and compared exactly', () => {
  const big = '9'.repeat(400);
  const r = id2({ 'this.diff': adds('decisions.md', `## PD-00${big} — a`, `## PD-${big}8 — b`), 'open/41.diff': adds('decisions.md', `## PD-${big} — c`) });
  assert.deepEqual([r.status, r.findings], [1, [`open-pr/41/PD-${big}`]]);
});

test('--next prints the highest of each series, each open pull request\'s ids and the next free ones, and nothing else', () => {
  const main = adds('decisions.md', '## D-12 — a', '## PD-3 — SECRET main', 'not a heading SECRET') + adds('dev/features/x.md', '# F-09 — x');
  const r = nextOf({ 'this.diff': main, 'open/41.diff': adds('decisions.md', '## PD-007 — SECRET title'), 'open/52.diff': adds('docs/features/SECRET.md', '# F-4 — y'), 'open/53.diff': adds('docs/x.md', '# PD-99 — z') });
  assert.equal(r.status, 0);
  assert.match(r.out, /highest on the default branch and in the open pull requests: D-12, PD-7, F-09; next free: D-13, PD-8, F-10/);
  assert.match(r.out, /#41 adds PD-7/);
  assert.match(r.out, /#52 adds F-04/);
  for (const line of r.out.split('\n').filter((l) => l && !l.startsWith('@@json'))) {
    assert.match(line, /^ID2: (scanned \d+ diffs \(the default branch and each open pull request\)|warning: open-pr\/\d+: #\d+ adds ((P?D|F)-\d+(, )?)+|PASS — green proves: highest on the default branch and in the open pull requests: [-, :A-Za-z0-9]+; next free: [-, A-Z0-9]+( \(\d+ warning\(s\) above\))?)$/, line);
  }
});

test('--next with no id anywhere says none, and the next free number is 1', () => {
  const r = nextOf({ 'this.diff': '', 'open/.keep': null });
  assert.equal(r.status, 0);
  assert.match(r.out, /D: none, PD: none, F: none; next free: D-1, PD-1, F-01/);
});

test('an id this pull request does not add is no finding, even when two others share it', () => {
  const r = id2({ 'this.diff': adds('decisions.md', '## PD-1 — a'), 'open/41.diff': adds('decisions.md', '## PD-9 — b'), 'open/52.diff': adds('decisions.md', '## PD-9 — c') });
  assert.deepEqual([r.status, r.findings], [0, []]);
});

test('what is not an added heading of a read file adds nothing', () => {
  const quoted = adds('decisions.md', 'See PD-7.', '- PD-7 again');
  const elsewhere = adds('docs/notes.md', '## PD-7 — x') + adds('docs/features/sub/x.md', '# F-12 — x') + adds('docs/features/TEMPLATE.md', '# F-12 — x');
  const deleted = 'diff --git a/docs/features/y.md b/docs/features/y.md\ndeleted file mode 100644\n--- a/docs/features/y.md\n+++ /dev/null\n@@ -1 +0,0 @@\n-# F-12 — y\n';
  const r = id2({ 'this.diff': adds('decisions.md', '## PD-7 — a') + adds('docs/features/q.md', '# F-12 — q'), 'open/41.diff': quoted + elsewhere + deleted });
  assert.deepEqual([r.status, r.findings], [0, []]);
});

test('a removed line that reads like a file header is content, and a heading after a bare CR is read as ID1 reads it', () => {
  const theirs = `${header('decisions.md')}@@ -5,2 +5,2 @@\n--- b/notes.md\n+x\r## PD-7 — after a CR\n`;
  const r = id2({ 'this.diff': adds('decisions.md', '## PD-7 — a'), 'open/41.diff': theirs });
  assert.deepEqual([r.status, r.findings], [1, ['open-pr/41/PD-7']]);
});

test('a diff that cannot be read cleanly, or a folder that is not whole, is BROKEN', () => {
  const ok = adds('decisions.md', '## PD-7 — a');
  const cases = [
    [{ 'open/.keep': null }, /this\.diff is missing/],
    [{ 'this.diff': ok }, /open\/ is missing/],
    [{ 'this.diff': ok, 'open/x.diff': ok }, /not a <number>\.diff file/],
    [{ 'this.diff': ok, 'open/041.diff': ok }, /not a <number>\.diff file/],
    [{ 'this.diff': ok, 'open/41.diff': 'diff --git "a/x" "b/x"\n--- "a/decisions\\tmd"\n+++ "b/decisions\\tmd"\n' }, /the diff of #41 holds a path git had to quote/],
    [{ 'this.diff': 'diff --git a b\n--- decisions.md\n', 'open/.keep': null }, /this pull request's diff holds a file header with no a\/ or b\/ path/],
    [{ 'this.diff': ok, 'open/41.diff': 'diff --git a/decisions.md b/decisions.md\nBinary files a/decisions.md and b/decisions.md differ\n' }, /the diff of #41 holds a file git shows as binary/],
    [{ 'this.diff': ok, 'open/41.diff': 'diff --git a/decisions.md b/decisions.md\nGIT binary patch\nliteral 3\n' }, /the diff of #41 holds a file git shows as binary/],
  ];
  for (const [files, why] of cases) {
    const r = id2(files);
    assert.equal(r.status, 2, JSON.stringify(files));
    assert.match(r.json.broken, why);
  }
});

// The collector, against a bare `origin` with refs/pull/<n>/head (as GitHub keeps them, a fork's too) and a stand-in
// `gh` that prints the API's open list as the --jq filter would.
const gitIn = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
function repoWithPulls() {
  const top = mkdtempSync(join(tmpdir(), 'id2-collect-'));
  const work = join(top, 'work');
  const origin = join(top, 'origin.git');
  mkdirSync(work);
  gitIn(work, 'init', '-q', '-b', 'main');
  writeFileSync(join(work, 'decisions.md'), '# Decisions\n\n## PD-1 — first\n');
  gitIn(work, 'add', '.');
  gitIn(work, 'commit', '-qm', 'base');
  const base = gitIn(work, 'rev-parse', 'HEAD');
  const branch = (name, from, path, text) => {
    gitIn(work, 'checkout', '-q', '-b', name, from);
    mkdirSync(dirname(join(work, path)), { recursive: true });
    writeFileSync(join(work, path), `${readFileSync(join(work, path), { flag: 'a+' })}${text}`);
    gitIn(work, 'add', '.');
    gitIn(work, 'commit', '-qm', name);
    return gitIn(work, 'rev-parse', 'HEAD');
  };
  branch('mine', base, 'decisions.md', '\n## PD-2 — mine\n');
  const mine = branch('mine2', 'mine', 'dev/features/mine.md', '# F-21 — mine\n');
  // A NUL byte makes git call decisions.md binary unless asked for --text; a space in a name ends git's header with a tab.
  const nul = branch('nul', base, 'decisions.md', '\u0000\n## PD-2 — after a NUL\n');
  const spaced = branch('spaced', base, 'docs/features/my doc.md', '# F-21 — spaced\n');
  const fork = branch('fork', base, 'decisions.md', '\n## PD-2 — a fork\n');
  const parent = branch('parent', base, 'dev/features/p.md', '# F-04 — parent\n');
  const child = branch('child', parent, 'decisions.md', '\n## PD-3 — child\n');
  gitIn(top, 'init', '-q', '--bare', origin);
  gitIn(work, 'push', '-q', origin, `${mine}:refs/heads/main-pr`, `${fork}:refs/pull/12/head`, `${parent}:refs/pull/13/head`, `${child}:refs/pull/14/head`, `${base}:refs/heads/main`, `${mine}:refs/pull/11/head`, `${nul}:refs/pull/15/head`, `${spaced}:refs/pull/16/head`);
  const clone = join(top, 'clone');
  gitIn(top, 'clone', '-q', origin, clone);
  gitIn(clone, 'fetch', '-q', 'origin', `+refs/pull/11/head:refs/remotes/origin/pr11`);
  const bin = join(top, 'bin');
  mkdirSync(bin);
  return { top, clone, bin, base, mine, list: [`11 ${base}`, `12 ${base}`, `13 ${base}`, `14 ${parent}`, `15 ${base}`, `16 ${base}`] };
}
const collect = (r, lines, args, at) => {
  writeFileSync(join(r.bin, 'gh'), `#!/bin/sh\n${lines === null ? 'echo "HTTP 401" >&2; exit 1' : `printf '%s\\n' ${lines.map((l) => `'${l}'`).join(' ')}`}\n`);
  chmodSync(join(r.bin, 'gh'), 0o755);
  const out = at ?? join(r.top, `out-${Math.random().toString(36).slice(2)}`);
  const res = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/open-pr-ids.mjs'), out, ...args], {
    cwd: r.clone,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${r.bin}:${process.env.PATH}`, GITHUB_EVENT_NAME: args[1] === '' ? 'push' : 'pull_request' },
  });
  return { ...res, out };
};

test('the collector writes this diff and each other open pull request, a fork and a stacked one against their own base', () => {
  const r = repoWithPulls();
  try {
    const c = collect(r, r.list, ['o/r', '11', r.base, r.mine]);
    assert.equal(c.status, 0, c.stdout + c.stderr);
    assert.deepEqual(readdirSync(join(c.out, 'open')).sort(), ['12.diff', '13.diff', '14.diff', '15.diff', '16.diff']);
    assert.doesNotMatch(readFileSync(join(c.out, 'open', '14.diff'), 'utf8'), /F-04/, 'the stacked pull request carries its parent\'s id');
    const check = run(ID2, c.out);
    assert.deepEqual([check.status, check.json.findings.map((f) => f.where)], [1, ['open-pr/12/PD-2', 'open-pr/15/PD-2', 'open-pr/16/F-21']]);
    assert.equal(gitIn(r.clone, 'for-each-ref', 'refs/id2/'), '', 'the fetched refs are deleted after');
    const again = collect(r, r.list, ['o/r', '11', r.base, r.mine], c.out);
    assert.equal(again.status, 2);
    assert.match(again.stdout, /the output folder exists already/);
  } finally {
    rmSync(r.top, { recursive: true, force: true });
  }
});

test('the collector --next reads the default branch whole and every open pull request; ID2 --next prints numbers only', () => {
  const r = repoWithPulls();
  try {
    const c = collect(r, r.list, ['o/r', '--next', 'main']);
    assert.equal(c.status, 0, c.stdout + c.stderr);
    assert.equal(readdirSync(join(c.out, 'open')).length, 6);
    const nx = spawnSync(process.execPath, [join(SRC, ID2), c.out, '--next'], { encoding: 'utf8' });
    assert.equal(nx.status, 0, nx.stdout);
    assert.match(nx.stdout, /highest on the default branch and in the open pull requests: D: none, PD-3, F-21; next free: D-1, PD-4, F-22/);
    assert.equal(gitIn(r.clone, 'for-each-ref', 'refs/id2/'), '');
  } finally {
    rmSync(r.top, { recursive: true, force: true });
  }
});

test('the collector is BROKEN, never an empty folder, when the list or a fetch fails; a push writes the marker', () => {
  const r = repoWithPulls();
  try {
    const listed = collect(r, null, ['o/r', '11', r.base, r.mine]);
    assert.equal(listed.status, 2);
    assert.match(listed.stdout, /^ID2: BROKEN — the open pull requests could not be listed/);
    const fetched = collect(r, [`99 ${r.base}`], ['o/r', '11', r.base, r.mine]);
    assert.equal(fetched.status, 2);
    assert.match(fetched.stdout, /a pull request's diff could not be read/);
    const odd = collect(r, ['12 not-a-sha'], ['o/r', '11', r.base, r.mine]);
    assert.equal(odd.status, 2);
    const push = collect(r, r.list, ['o/r', '', '', '']);
    assert.equal(push.status, 0);
    assert.deepEqual(readdirSync(push.out), ['not-a-pull-request']);
    const lost = spawnSync(process.execPath, [join(SRC, 'ci/checks/lib/open-pr-ids.mjs'), join(r.top, 'lost'), 'o/r', ''], { cwd: r.clone, encoding: 'utf8', env: { ...process.env, GITHUB_EVENT_NAME: 'pull_request' } });
    assert.equal(lost.status, 2, 'a pull request run with no number is not a push');
  } finally {
    rmSync(r.top, { recursive: true, force: true });
  }
});
