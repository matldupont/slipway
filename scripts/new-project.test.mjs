#!/usr/bin/env node
// new-project's install record (F-01 step 2): the manifest it writes, the slipway sha it resolves, and
// D1 and W1 in the project it creates. Internal: `pnpm meta` runs it in slipway, never in a project.
//
// Every case builds real repositories in the OS temp dir. new-project makes no network call, so
// nothing here reaches one either.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readDecisions } from '../ci/checks/lib/decisions.mjs';
import { gateGlobs, globToRegExp } from '../ci/checks/lib/gate-files.mjs';
import { hasTemplateMarkers, isTemplate, MANIFEST, readManifest, sha256, SLIPWAY_ROOT_COMMIT, TEMPLATE_MARKERS } from '../ci/checks/lib/manifest.mjs';
import { classify, loadOwnership, shippedPaths } from '../ci/checks/lib/ownership.mjs';
import { blobSha, derivePackageJson, publicSource, resolveSlipway } from './lib/install.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rules = loadOwnership(SRC);
const PKG_VERSION = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).version;

// A known identity and no personal git config, for every git this file runs or spawns.
Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'slipway test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'slipway test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
});

const temps = [];
test.after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'slipway-np-'));
  temps.push(d);
  return d;
};
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const check = (dir, file, env = {}) => spawnSync(process.execPath, [join(dir, 'ci', 'checks', 'meta', file), dir], { encoding: 'utf8', env: { ...process.env, ...env } });

function newProject(src, dest, env = {}) {
  const r = spawnSync(process.execPath, [join(src, 'scripts', 'new-project.mjs'), dest, '--no-github', '--no-harness'], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.equal(r.status, 0, `new-project failed:\n${r.stdout}\n${r.stderr}`);
  // The owner learns where updates come from (#18).
  assert.match(r.stdout, /Later, to take a newer slipway: \/sync-slipway\./);
  return {
    manifest: JSON.parse(readFileSync(join(dest, MANIFEST), 'utf8')),
    subject: git(dest, 'log', '-1', '--format=%s'),
    readme: readFileSync(join(dest, 'README.md'), 'utf8'),
  };
}

// Every path slipway's own checkout ships, internal ones included: what `npx github:…` downloads.
function copyTemplate(to) {
  for (const p of shippedPaths(SRC, rules)) {
    if (p === '.gitignore') continue;
    mkdirSync(dirname(join(to, p)), { recursive: true });
    copyFileSync(join(SRC, p), join(to, p));
  }
}

test('the manifest lists every shipped path with its class, sha256 and blob as written; D1 and W1 pass', () => {
  const dest = join(tmp(), 'probe');
  const { manifest, subject, readme } = newProject(SRC, dest, { SLIPWAY_SOURCE: '' });

  const want = shippedPaths(SRC, rules).filter((p) => classify(rules, p) !== 'internal');
  assert.deepEqual(Object.keys(manifest.files), want);
  for (const [p, f] of Object.entries(manifest.files)) {
    assert.equal(f.class, classify(rules, p), p);
    const buf = readFileSync(join(dest, p));
    assert.equal(f.sha256, sha256(buf), p);
    assert.equal(f.blob, blobSha(buf), p);
  }
  assert.deepEqual(manifest.answers, { name: 'Probe', repo: null });
  assert.equal(manifest.source, 'github:matldupont/slipway');
  // Shape only: whether this checkout is clean is not this test's business (the checkout test is).
  assert.equal(manifest.version, PKG_VERSION);
  if (manifest.slipway === null) assert.match(subject, new RegExp(`^chore: start from slipway ([0-9a-f]{40}-dirty|${PKG_VERSION})$`));
  else {
    assert.match(manifest.slipway, /^[0-9a-f]{40}$/);
    assert.equal(subject, `chore: start from slipway ${manifest.slipway}`);
  }

  // The project's own meta, the command its CI runs, calls nothing slipway kept back.
  const meta = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).scripts.meta;
  assert.match(meta, /d1-drift\.mjs/);
  assert.doesNotMatch(meta, /scripts\//);
  assert.equal(readme.includes('Built on [slipway](SLIPWAY.md) '), true);
  // The owner updates with a short name, not slipway's repository address (#90).
  assert.equal(JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).scripts['use-slipway'], 'npx --loglevel=error use-slipway@latest');
  assert.match(readme, /`pnpm -s use-slipway sync`/);

  // PC1 too: every known-bad fixture the project gets must go red there as it does in slipway (#123).
  for (const f of ['d1-drift.mjs', 'w1-declared-vs-invoked.mjs']) {
    const r = check(dest, f);
    assert.equal(r.status, 0, `${f} in a fresh project:\n${r.stdout}`);
  }
  // PC1 takes no argument: one would name another fixtures root, and the project has no fixtures at its top (#207).
  const pc1 = spawnSync(process.execPath, [join(dest, 'ci', 'checks', 'meta', 'pc1-positive-control.mjs')], { encoding: 'utf8' });
  assert.equal(pc1.status, 0, `PC1 in a fresh project:\n${pc1.stdout}`);
  assert.match(pc1.stdout, /\((?!0 )\d+ cases\)/);

  appendFileSync(join(dest, 'SLIPWAY.md'), '\nedited\n');
  let r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /D1: drift\/SLIPWAY\.md: SLIPWAY\.md is a file slipway maintains, and it was edited/);

  // A whitespace-only reason is empty: it excuses nothing.
  writeFileSync(join(dest, '.slipway', 'overrides.yaml'), 'overrides:\n  - path: SLIPWAY.md\n    reason: "  "\n');
  r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /override\/reason\/SLIPWAY\.md[\s\S]*drift\/SLIPWAY\.md/);

  // A directory where a managed file was is drift, reported, not a crash.
  rmSync(join(dest, 'BOOTSTRAP.md'));
  mkdirSync(join(dest, 'BOOTSTRAP.md'));
  r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /drift\/BOOTSTRAP\.md: BOOTSTRAP\.md is a file slipway maintains, and it was replaced by a non-file/);
  rmSync(join(dest, 'BOOTSTRAP.md'), { recursive: true });
  git(dest, 'checkout', '--', 'BOOTSTRAP.md');
  // A symlink is never followed out of the project.
  rmSync(join(dest, 'BOOTSTRAP.md'));
  symlinkSync(join(SRC, 'BOOTSTRAP.md'), join(dest, 'BOOTSTRAP.md'));
  assert.match(check(dest, 'd1-drift.mjs').stdout, /drift\/BOOTSTRAP\.md: BOOTSTRAP\.md is a file slipway maintains, and it was replaced by a non-file/);
  rmSync(join(dest, 'BOOTSTRAP.md'));
  git(dest, 'checkout', '--', 'BOOTSTRAP.md');

  writeFileSync(join(dest, '.slipway', 'overrides.yaml'), 'overrides:\n  - path: SLIPWAY.md\n    reason: a local note\n');
  assert.equal(check(dest, 'd1-drift.mjs').status, 0);

  unlinkSync(join(dest, MANIFEST));
  r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 2);
  assert.match(r.stdout, /BROKEN — manifest\/missing/);
});

// #123: two files a project can add were once all it took.
test('a project cannot enter template mode: no manifest plus slipway\'s marker files is still manifest/missing', () => {
  const dest = join(tmp(), 'faker');
  newProject(SRC, dest);
  unlinkSync(join(dest, MANIFEST));
  for (const m of TEMPLATE_MARKERS) {
    mkdirSync(dirname(join(dest, m)), { recursive: true });
    writeFileSync(join(dest, m), '');
  }
  git(dest, 'add', '-A');
  git(dest, 'commit', '-q', '-m', 'look like slipway');

  // The fixture switch lifts only "top of the checkout"; GIT_DIR cannot lend the project slipway's history.
  const slipwayGitDir = git(SRC, 'rev-parse', '--absolute-git-dir');
  for (const env of [{}, { SLIPWAY_TEMPLATE_FIXTURE: '1' }, { GIT_DIR: slipwayGitDir }]) {
    const r = check(dest, 'd1-drift.mjs', env);
    assert.equal(r.status, 2, `${JSON.stringify(env)}:\n${r.stdout}`);
    assert.match(r.stdout, /BROKEN — manifest\/missing — .* are here, but this is not slipway's own full checkout/);
  }
  assert.doesNotMatch(check(dest, 'w1-declared-vs-invoked.mjs').stdout, /slipway tests/);

  // A git committed inside the project, first on PATH as `pnpm run` puts node_modules/.bin, would say
  // slipway's root commit; the check never runs a git from inside the repository.
  const sq = (v) => `'${v.replace(/'/g, "'\\''")}'`;
  const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
  const fakeGit = (file, top = null) => {
    mkdirSync(dirname(file), { recursive: true });
    const lie = top ? `*show-toplevel*) echo ${sq(top)}; exit 0;; ` : '';
    writeFileSync(file, `#!/bin/sh\ncase "$*" in ${lie}*rev-list*) echo ${SLIPWAY_ROOT_COMMIT}; exit 0;; esac\nexec ${sq(realGit)} "$@"\n`, { mode: 0o755 });
  };
  const onPath = (d) => `${d}${delimiter}${process.env.PATH}`;
  for (const bin of ['node_modules/.bin', 'tools']) {
    fakeGit(join(dest, bin, 'git'));
    const PATH = onPath(join(dest, bin));
    assert.equal(execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { cwd: dest, env: { ...process.env, PATH }, encoding: 'utf8' }).trim(), SLIPWAY_ROOT_COMMIT, 'the fake answers');
    const r = check(dest, 'd1-drift.mjs', { PATH });
    assert.equal(r.status, 2, `git in ${bin}:\n${r.stdout}`);
    assert.match(r.stdout, /BROKEN — manifest\/missing/);
  }
  // The same folder spelled in another case, where the disk ignores case (macOS, Windows).
  const otherCase = join(dirname(dest), 'FAKER', 'tools');
  if (existsSync(otherCase)) assert.equal(check(dest, 'd1-drift.mjs', { PATH: onPath(otherCase) }).status, 2, 'git on a PATH entry spelled in another case');
  // With the fixture switch, D1 on a folder inside the project: a git elsewhere in the project, outside
  // that folder, that names slipway as the top of the checkout.
  const sub = join(dest, 'sub');
  for (const m of TEMPLATE_MARKERS) {
    mkdirSync(dirname(join(sub, m)), { recursive: true });
    writeFileSync(join(sub, m), '');
  }
  for (const bin of ['node_modules/.bin', 'tools']) {
    fakeGit(join(dest, bin, 'git'), SRC);
    const sr = spawnSync(process.execPath, [join(dest, 'ci', 'checks', 'meta', 'd1-drift.mjs'), sub], {
      encoding: 'utf8',
      env: { ...process.env, SLIPWAY_TEMPLATE_FIXTURE: '1', PATH: onPath(join(dest, bin)) },
    });
    assert.equal(sr.status, 2, `fixture switch, git in ${bin}:\n${sr.stdout}`);
  }
  // Nothing left on PATH: never a git from the folder it runs in (the temp folder).
  const tmpGit = tmp();
  fakeGit(join(tmpGit, 'git'), dest);
  assert.equal(check(dest, 'd1-drift.mjs', { PATH: '', TMPDIR: tmpGit }).status, 2, 'empty PATH, a git in TMPDIR');
  for (const d of ['node_modules', 'tools', 'sub']) rmSync(join(dest, d), { recursive: true });

  // A graft can give the project's HEAD slipway's root as its only parent; git here reads no grafts file.
  git(dest, 'fetch', '-q', SRC, 'HEAD');
  writeFileSync(join(git(dest, 'rev-parse', '--absolute-git-dir'), 'info', 'grafts'), `${git(dest, 'rev-parse', 'HEAD')} ${SLIPWAY_ROOT_COMMIT}\n`);
  assert.equal(git(dest, 'rev-list', '--max-parents=0', 'HEAD'), SLIPWAY_ROOT_COMMIT, 'the graft takes');
  const r = check(dest, 'd1-drift.mjs');
  assert.equal(r.status, 2, `grafted:\n${r.stdout}`);
  assert.match(r.stdout, /BROKEN — manifest\/missing/);
});

test('isTemplate: slipway\'s own checkout, never a shallow clone of it or a folder inside it', () => {
  assert.equal(isTemplate(SRC), true, 'slipway itself, with its full history');
  const full = join(tmp(), 'full');
  git(tmpdir(), 'clone', '-q', `file://${SRC}`, full);
  assert.equal(isTemplate(full), true, 'a full clone is slipway');
  unlinkSync(join(full, TEMPLATE_MARKERS[0]));
  assert.equal(isTemplate(full), false, 'without its markers it is not');
  const shallow = join(tmp(), 'shallow');
  git(tmpdir(), 'clone', '-q', '--depth', '1', `file://${SRC}`, shallow);
  assert.equal(hasTemplateMarkers(shallow), true);
  assert.equal(isTemplate(shallow), false, 'a shallow clone cannot show its root commit');
  assert.equal(isTemplate(join(SRC, 'ci', 'fixtures', 'known-bad', 'd1', 'markers-faked')), false);
});

test('ci/before-verify.sh: the project\'s own (seeded, never shipped), run by the verify job when present, named by D1 for an edited ci.yml', () => {
  assert.equal(classify(rules, 'ci/before-verify.sh'), 'seeded');
  assert.equal(shippedPaths(SRC, rules).includes('ci/before-verify.sh'), false, 'a shipped file would collide with a project\'s own on sync');

  const dest = join(tmp(), 'probe');
  newProject(SRC, dest, { SLIPWAY_SOURCE: '' });
  writeFileSync(join(dest, 'ci', 'before-verify.sh'), 'echo DATABASE_URL=postgres://ci >> "$GITHUB_ENV"\n');
  assert.equal(check(dest, 'd1-drift.mjs').status, 0, 'the project\'s file is not drift');

  // The verify job's step, as written in ci.yml, run in a project with and without the file.
  const yml = readFileSync(join(SRC, '.github', 'workflows', 'ci.yml'), 'utf8');
  const step = yml.match(/- name: Project setup for tests\n\s+run: (.+)\n/)?.[1];
  assert.ok(step, 'ci.yml has the "Project setup for tests" step');
  assert.ok(yml.indexOf(step) < yml.indexOf('- run: pnpm verify'), 'it runs before pnpm verify');
  const run = (cwd) => {
    const envFile = join(tmp(), 'github-env');
    writeFileSync(envFile, '');
    const r = spawnSync('bash', ['-e', '-c', step], { cwd, encoding: 'utf8', env: { ...process.env, GITHUB_ENV: envFile } });
    return { status: r.status, stdout: r.stdout, env: readFileSync(envFile, 'utf8') };
  };
  assert.deepEqual(run(dest), { status: 0, stdout: '', env: 'DATABASE_URL=postgres://ci\n' });
  rmSync(join(dest, 'ci', 'before-verify.sh'));
  assert.deepEqual(run(dest), { status: 0, stdout: '', env: '' }, 'no file: the step does nothing');
  writeFileSync(join(dest, 'ci', 'before-verify.sh'), 'exit 3\n');
  assert.equal(run(dest).status, 3, 'a failing setup fails the job');

  // An edited ci.yml points at the extension point before it offers an override; other files do not.
  appendFileSync(join(dest, '.github', 'workflows', 'ci.yml'), '\n# services: postgres\n');
  appendFileSync(join(dest, 'SLIPWAY.md'), '\nedited\n');
  const out = check(dest, 'd1-drift.mjs').stdout;
  assert.match(out, /drift\/\.github\/workflows\/ci\.yml: .*put that in ci\/before-verify\.sh.*or keep it by adding it to/);
  assert.doesNotMatch(out.split('\n').find((l) => l.includes('drift/SLIPWAY.md')), /before-verify/);
});

// issue-shape's failure step, as written in the workflow, run under `bash -e` against a fake `gh`. The fake
// keeps the repository's labels in a file, so `--add-label` fails on a label that was never created, as the
// real one does (#119).
test('issue-shape: a repository without the needs-shape label still labels the issue and posts the comment', () => {
  const yml = readFileSync(join(SRC, '.github', 'workflows', 'issue-shape.yml'), 'utf8');
  const start = yml.indexOf('      - name: Label an issue that fails');
  assert.notEqual(start, -1, 'the workflow has the label step');
  const block = yml.slice(start).split(/\n      - name: /)[0];
  const script = block.split('        run: |\n')[1].replace(/^ {10}/gm, '');

  // The colour and description are defined once: what new-project creates is what the workflow ensures.
  const np = readFileSync(join(SRC, 'scripts', 'new-project.mjs'), 'utf8');
  const npDescription = np.match(/'--description', '(Issue needs shaping[^']*)'/)?.[1];
  assert.ok(npDescription, 'new-project creates the label with a description');
  assert.equal(script.match(/--color (\w+)/)?.[1], np.match(/'--color', '(\w+)'/)?.[1], 'same colour');
  assert.equal(script.match(/--description '([^']*)'/)?.[1], npDescription, 'same description');
  assert.equal(script.match(/--color (\w+)/)?.[1], 'D93F0B');

  const run = ({ labelCallsFail }) => {
    const dir = tmp();
    const bin = join(dir, 'bin');
    mkdirSync(join(dir, 'issue'), { recursive: true });
    mkdirSync(bin);
    writeFileSync(join(dir, 'labels'), '');
    writeFileSync(join(dir, 'calls'), '');
    writeFileSync(join(dir, 'issue', 'report.txt'), 'I1: body#acceptance: Acceptance is missing.\n');
    writeFileSync(join(bin, 'gh'), [
      '#!/bin/sh',
      'echo "$*" >> "$FAKE/calls"',
      'case "$1 $2" in',
      '  "label create") [ -n "$LABEL_FAIL" ] && { echo "label create refused" >&2; exit 1; }; echo needs-shape >> "$FAKE/labels"; exit 0 ;;',
      '  "issue edit") [ -n "$LABEL_FAIL" ] && exit 1; grep -qx needs-shape "$FAKE/labels" || { echo "failed to update: \'needs-shape\' not found" >&2; exit 1; }; echo added >> "$FAKE/labels"; exit 0 ;;',
      '  "issue comment") cp "$7" "$FAKE/comment.md" 2>/dev/null; exit 0 ;;',
      'esac',
      'exit 0',
      '',
    ].join('\n'), { mode: 0o755 });
    const r = spawnSync('bash', ['-e', '-c', script], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, FAKE: dir, RUNNER_TEMP: dir, REPO: 'o/r', NUMBER: '7', GH_TOKEN: 'x', LABEL_FAIL: labelCallsFail ? '1' : '' },
    });
    const calls = readFileSync(join(dir, 'calls'), 'utf8');
    return { status: r.status, calls, labels: readFileSync(join(dir, 'labels'), 'utf8') };
  };

  const missing = run({ labelCallsFail: false });
  assert.equal(missing.status, 0, 'the label is created, then added');
  assert.match(missing.labels, /^needs-shape\nadded\n$/);
  assert.match(missing.calls, /^issue comment 7 .*--body-file /m, 'the comment is posted');

  const broken = run({ labelCallsFail: true });
  assert.match(broken.calls, /^issue comment 7 /m, 'a label that cannot be made or added never swallows the comment');
  assert.notEqual(broken.status, 0, 'and the step still reports the label failure');
});

test('the created decisions.md holds the header and D-001–D-014 only: no slipway record, no citation of one', () => {
  const dest = join(tmp(), 'probe');
  newProject(SRC, dest, { SLIPWAY_SOURCE: '' });
  const text = readFileSync(join(dest, 'decisions.md'), 'utf8');
  assert.equal((text.match(/^## D-(?:01[5-9]|0[2-9]\d)/gm) ?? []).length, 0);
  for (let n = 1; n <= 14; n++) assert.match(text, new RegExp(`^## D-0${String(n).padStart(2, '0')} `, 'm'), `D-${n}`);
  assert.match(text, /add this project's own as `PD-<n>`/);
  assert.doesNotMatch(text, /roadmap-page|#62|#63|D-(?:01[5-9]|0[2-9]\d)/);
  assert.match(readFileSync(join(SRC, 'decisions.md'), 'utf8'), /^## D-017 /m, 'slipway keeps its own records');
});

// F-15 §7, build step 4: the Contract said a fresh project counts 0 (D-001–D-014 match nothing); D-003's "Revisit when CI
// time is a measured problem" matches the prose pattern, so a fresh project counts 1, and its first sync says so (D-003
// is a prose condition nothing reads, which is true). Step 5 corrects the doc.
test('a fresh project\'s decisions.md counts one decision in prose only (D-003) and none waiting on an issue', () => {
  const dest = join(tmp(), 'probe');
  newProject(SRC, dest, { SLIPWAY_SOURCE: '' });
  const record = readDecisions(dest);
  assert.deepEqual([record.proseCount(), record.awaitingIssue()], [['D-003'], []]);
});

// #117: slipway's own skill settings stay in slipway; a project starts from AGENT.md's placeholders, filled.
test('a project gets no copy of dev/skill-configuration.md, and its AGENT.md is the template filled in', () => {
  const dest = join(tmp(), 'probe');
  newProject(SRC, dest, { SLIPWAY_SOURCE: '' });
  assert.equal(classify(rules, 'dev/skill-configuration.md'), 'internal');
  assert.equal(existsSync(join(dest, 'dev', 'skill-configuration.md')), false, 'the project received slipway\'s settings');
  assert.match(readFileSync(join(SRC, 'AGENT.md'), 'utf8'), /^\| Product name \| `<Product>` \|/m, 'slipway\'s AGENT.md must keep <Product> for new-project to fill');
  const agent = readFileSync(join(dest, 'AGENT.md'), 'utf8');
  assert.match(agent, /^\| Product name \| `Probe` \|/m);
  assert.match(agent, /^\| Issue repo \| `<owner\/repo>` \|/m, '--no-github leaves the repository for the owner');
  assert.doesNotMatch(agent, /matldupont\/slipway/);
});

test('under npx, untracked inside another repository: no sha from the enclosing HEAD, no network — null plus version', () => {
  const root = tmp();
  const outer = join(root, 'outer');
  mkdirSync(outer);
  git(outer, 'init', '-q', '-b', 'main');
  writeFileSync(join(outer, 'x.md'), 'another project\n');
  git(outer, 'add', '-A');
  git(outer, 'commit', '-q', '-m', 'outer');
  const outerSha = git(outer, 'rev-parse', 'HEAD');
  const pkg = join(outer, 'vendor', 'slipway');
  copyTemplate(pkg);

  // An unreachable source: a network call would fail or hang, and none is made.
  const fork = 'https://me:secret@unreachable.invalid/me/slipway.git?private_token=x';
  const { manifest, subject, readme } = newProject(pkg, join(root, 'project'), { SLIPWAY_SOURCE: fork });
  assert.equal(manifest.slipway, null);
  assert.equal(manifest.version, PKG_VERSION);
  assert.equal(manifest.source, 'https://unreachable.invalid/me/slipway.git');
  assert.ok(!JSON.stringify(manifest).includes(outerSha));
  assert.equal(subject, `chore: start from slipway ${PKG_VERSION}`);
  assert.ok(readme.includes(`Built on [slipway](SLIPWAY.md) ${PKG_VERSION}.`));
  for (const [p, f] of Object.entries(manifest.files)) assert.equal(f.blob, blobSha(readFileSync(join(root, 'project', p))), p);
});

test('in an edited slipway checkout: no sha in the manifest, and the commit and README say <sha>-dirty', () => {
  const root = tmp();
  const checkout = join(root, 'slipway');
  copyTemplate(checkout);
  git(checkout, 'init', '-q', '-b', 'main');
  git(checkout, 'add', '-A');
  git(checkout, 'commit', '-q', '-m', 'slipway');
  const head = git(checkout, 'rev-parse', 'HEAD');

  const clean = newProject(checkout, join(root, 'clean'), { SLIPWAY_SOURCE: '' });
  assert.equal(clean.manifest.slipway, head);
  assert.equal(clean.subject, `chore: start from slipway ${head}`);
  assert.ok(clean.readme.includes(`Built on [slipway](SLIPWAY.md) ${head}.`));

  appendFileSync(join(checkout, 'SLIPWAY.md'), '\nuncommitted\n');
  const edited = newProject(checkout, join(root, 'edited'), { SLIPWAY_SOURCE: '' });
  assert.equal(edited.manifest.slipway, null);
  assert.equal(edited.manifest.version, PKG_VERSION);
  assert.equal(edited.subject, `chore: start from slipway ${head}-dirty`);
  assert.ok(edited.readme.includes(`Built on [slipway](SLIPWAY.md) ${head}-dirty.`));
});

test('resolveSlipway: no hint outside a checkout, and an edited or thinned checkout names its candidate', () => {
  const walked = tmp();
  writeFileSync(join(walked, 'a.md'), 'a\n');
  assert.deepEqual(resolveSlipway(walked, ['a.md'], { rules }), {
    sha: null, candidate: null, why: 'not a slipway checkout (no .git at the template top)',
  });

  const checkout = tmp();
  writeFileSync(join(checkout, 'a.md'), 'a\n');
  git(checkout, 'init', '-q', '-b', 'main');
  git(checkout, 'add', '-A');
  git(checkout, 'commit', '-q', '-m', 'a');
  const head = git(checkout, 'rev-parse', 'HEAD');
  assert.equal(resolveSlipway(checkout, ['a.md'], { rules }).sha, head);
  // A file the commit ships but the install did not take (deleted from the checkout) is a difference.
  writeFileSync(join(checkout, 'b.md'), 'b\n');
  git(checkout, 'add', '-A');
  git(checkout, 'commit', '-q', '-m', 'b');
  const thinned = resolveSlipway(checkout, ['a.md'], { rules });
  assert.equal(thinned.sha, null);
  assert.match(thinned.why, /1 file\(s\) differ from [0-9a-f]{12}: b\.md/);
  writeFileSync(join(checkout, 'a.md'), 'edited\n');
  const dirty = resolveSlipway(checkout, ['a.md', 'b.md'], { rules });
  assert.equal(dirty.sha, null);
  assert.equal(dirty.candidate, git(checkout, 'rev-parse', 'HEAD'));
  assert.match(dirty.why, /1 file\(s\) differ from [0-9a-f]{12}: a\.md/);
});

test('publicSource: credentials never reach the manifest, and an option-shaped source is refused', () => {
  assert.equal(publicSource('github:matldupont/slipway'), 'github:matldupont/slipway');
  assert.equal(publicSource('https://x-access-token:ghp_secret@github.com/me/slipway.git'), 'https://github.com/me/slipway.git');
  assert.equal(publicSource('https://host/r.git?private_token=x#y'), 'https://host/r.git');
  assert.equal(publicSource('/tmp/slipway'), '/tmp/slipway');
  assert.throws(() => publicSource('--upload-pack=touch x'), /reads as a git option/);
});

test('readManifest refuses a manifest it cannot trust', () => {
  const put = (m) => {
    const d = tmp();
    mkdirSync(join(d, '.slipway'));
    writeFileSync(join(d, MANIFEST), typeof m === 'string' ? m : JSON.stringify(m));
    return d;
  };
  const file = { class: 'managed', sha256: 'a'.repeat(64) };
  assert.equal(readManifest(tmp()), null);
  assert.throws(() => readManifest(put('{')), /not valid JSON/);
  assert.throws(() => readManifest(put({ slipway: null })), /no files map/);
  for (const p of ['/etc/passwd', '../x', 'a/../../x', 'a//b', './a', 'a\\..\\x', 'C:x']) {
    assert.throws(() => readManifest(put({ files: { [p]: file } })), /not a plain relative path/, p);
  }
  assert.throws(() => readManifest(put({ files: { 'a.md': { class: 'managed', sha256: 'short' } } })), /needs a class .* and a sha256/);
  assert.throws(() => readManifest(put({ files: { 'a.md': { class: 'Managed', sha256: 'a'.repeat(64) } } })), /needs a class .* and a sha256/);
  assert.equal(readManifest(put({ files: { 'a/b.md': file } })).files['a/b.md'].class, 'managed');
});

test('derivePackageJson: the project gets its own name and no command that calls an internal path', () => {
  const pkg = derivePackageJson(
    {
      name: 'use-slipway', version: '0.1.0', description: 'x', bin: { x: 'scripts/new-project.mjs' },
      license: 'MIT', repository: { type: 'git', url: 'git+https://github.com/o/r.git' },
      scripts: { meta: 'node ci/checks/meta/d1-drift.mjs . && node scripts/new-project.test.mjs', dev: 'node scripts/x.mjs' },
    },
    { name: 'acme', rules },
  );
  assert.deepEqual(pkg, { name: 'acme', private: true, scripts: { meta: 'node ci/checks/meta/d1-drift.mjs .' } });
});

test('the package is use-slipway, MIT, with the one bin; LICENSE is internal; a created project carries none of it', () => {
  const r = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--offline', '--userconfig=/dev/null'], { cwd: SRC, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const pkg = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
  assert.equal(JSON.parse(r.stdout)[0].name, 'use-slipway');
  assert.deepEqual(pkg.bin, { 'use-slipway': 'scripts/new-project.mjs' });
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.repository.url, 'git+https://github.com/matldupont/slipway.git');
  assert.equal(classify(rules, 'LICENSE'), 'internal');
  const dest = join(tmp(), 'probe');
  newProject(SRC, dest, { SLIPWAY_SOURCE: '' });
  const made = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'));
  assert.equal(made.private, true);
  for (const k of ['bin', 'version', 'license', 'repository']) assert.equal(k in made, false, k);
  assert.equal(existsSync(join(dest, 'LICENSE')), false);
});

test('a project cannot be named sync: exit 1 naming the command, no folder created', () => {
  const parent = tmp();
  const dest = join(parent, 'sync');
  const r = spawnSync(process.execPath, [join(SRC, 'scripts', 'new-project.mjs'), dest, '--no-github', '--no-harness'], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /"sync" is a use-slipway command/);
  assert.doesNotMatch(r.stderr, /Cannot access|\n\s+at /, 'a plain refusal, not a stack trace');
  assert.equal(existsSync(dest), false);
});

test('.gitattributes ships as managed, under a checkout and a packed install; a CRLF re-checkout stays LF and D1-green; raw CRLF is drift', () => {
  assert.equal(classify(rules, '.gitattributes'), 'managed');

  // Packed install: no .git at the template top, the file arrives like any other shipped path.
  const root = tmp();
  const pkg = join(root, 'pkg');
  copyTemplate(pkg);
  assert.equal(readFileSync(join(pkg, '.gitattributes'), 'utf8'), '* text=auto eol=lf\n');
  const { manifest } = newProject(pkg, join(root, 'project'), { SLIPWAY_SOURCE: '' });
  assert.equal(manifest.files['.gitattributes'].class, 'managed');
  assert.equal(readFileSync(join(root, 'project', '.gitattributes'), 'utf8'), '* text=auto eol=lf\n');

  // Re-checkout the committed project the way a Windows clone would.
  const clone = join(root, 'clone');
  git(root, '-c', 'core.autocrlf=true', 'clone', '-q', join(root, 'project'), clone);
  for (const p of Object.keys(manifest.files)) {
    assert.ok(!readFileSync(join(clone, p)).includes(0x0d), `${p} has CR bytes after an autocrlf checkout`);
  }
  assert.equal(check(clone, 'd1-drift.mjs').status, 0);

  // D1 still hashes raw bytes: CRLF written into the working tree is drift.
  writeFileSync(join(clone, 'SLIPWAY.md'), readFileSync(join(clone, 'SLIPWAY.md'), 'utf8').replaceAll('\n', '\r\n'));
  const r = check(clone, 'd1-drift.mjs');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /D1: drift\/SLIPWAY\.md: SLIPWAY\.md is a file slipway maintains, and it was edited/);
});

test('the harness note says what the Stop hook does: it blocks the first stop, and a second stop ends the turn red (#299)', () => {
  const dest = join(tmp(), 'project');
  const r = spawnSync(process.execPath, [join(SRC, 'scripts', 'new-project.mjs'), dest, '--no-github'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const note = r.stdout.replace(/\s+/g, ' ');
  assert.match(note, /blocks the first stop of a turn while `pnpm verify:fast` is red \(a second stop ends it red, with the agent asked to say what is failing\)/);
  assert.doesNotMatch(note, /blocks a turn from ending/);
});

// #548 (F-16 §10, D-051): the prose check's files ship as managed, with the script that runs them and the harness rules
// that ask before an edit to them. Its fixture and its test stay slipway's, so PC1 has no prose case to run in a project.
test('the prose check ships: .vale.ini, ci/prose.mjs and ci/prose/** are managed and in a new project, with check:prose and the harness asks; its fixture and test do not', () => {
  const shipped = shippedPaths(SRC, rules);
  const prose = shipped.filter((p) => p === '.vale.ini' || p === 'ci/prose.mjs' || p.startsWith('ci/prose/'));
  const kept = shipped.filter((p) => p.startsWith('ci/fixtures/known-bad/prose/') || p === 'scripts/prose.test.mjs');
  assert.ok(prose.includes('.vale.ini') && prose.includes('ci/prose.mjs') && prose.some((p) => p.startsWith('ci/prose/Slipway/')), `the prose files slipway has: ${prose}`);
  assert.ok(kept.includes('scripts/prose.test.mjs') && kept.length > 1, `the prose fixture and test slipway has: ${kept}`);
  for (const p of prose) assert.equal(classify(rules, p), 'managed', p);
  for (const p of kept) assert.equal(classify(rules, p), 'internal', p);

  const dest = join(tmp(), 'probe');
  const r = spawnSync(process.execPath, [join(SRC, 'scripts', 'new-project.mjs'), dest, '--no-github'], { encoding: 'utf8', env: { ...process.env, SLIPWAY_SOURCE: '' } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const manifest = JSON.parse(readFileSync(join(dest, MANIFEST), 'utf8'));
  for (const p of prose) {
    assert.equal(manifest.files[p]?.class, 'managed', `${p} in the manifest`);
    assert.ok(readFileSync(join(dest, p)).equals(readFileSync(join(SRC, p))), `${p} is slipway's copy`);
  }
  for (const p of kept) {
    assert.equal(existsSync(join(dest, p)), false, `${p} reached a project`);
    assert.equal(p in manifest.files, false, `${p} in the manifest`);
  }
  assert.equal(JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).scripts['check:prose'], 'node ci/prose.mjs', 'pnpm run lists check:prose');

  const settings = readFileSync(join(dest, '.claude', 'settings.json'), 'utf8');
  assert.equal(settings, readFileSync(join(SRC, 'process', 'harness', 'settings.json'), 'utf8'), "the project's harness is slipway's");
  const asks = gateGlobs(settings).map(globToRegExp);
  for (const p of ['.vale.ini', 'ci/prose.mjs', 'ci/prose/Slipway/Chatbot.yml']) assert.ok(asks.some((re) => re.test(p)), `the project's harness does not ask before ${p}`);
});

// F-12 (dev/features/feature-fit.md §3): the count a new project starts from is its own, written, never copied.
test('ci/baselines.json: a new project gets {"feature-fit": 0} whatever slipway\'s own copy holds; the path is seeded, and O1 passes with slipway holding one', () => {
  assert.equal(classify(rules, 'ci/baselines.json'), 'seeded');
  const zero = '{\n  "feature-fit": 0\n}\n';

  const plain = join(tmp(), 'probe');
  newProject(SRC, plain, { SLIPWAY_SOURCE: '' });
  assert.equal(readFileSync(join(plain, 'ci', 'baselines.json'), 'utf8'), zero);
  assert.equal(git(plain, 'status', '--porcelain'), '', 'the file is in the first commit');

  // A slipway whose own tree holds a count, as it will once its check reads one.
  const src = join(tmp(), 'slipway');
  copyTemplate(src);
  writeFileSync(join(src, 'ci', 'baselines.json'), '{\n  "feature-fit": 7,\n  "duplication": 3\n}\n');
  const o1 = check(src, 'o1-ownership.mjs');
  assert.equal(o1.status, 0, o1.stdout);
  const dest = join(tmp(), 'probe');
  const { manifest } = newProject(src, dest, { SLIPWAY_SOURCE: '' });
  const written = readFileSync(join(dest, 'ci', 'baselines.json'));
  assert.equal(written.toString('utf8'), zero, "slipway's own count reached a project");
  assert.deepEqual(manifest.files['ci/baselines.json'], { class: 'seeded', sha256: sha256(written), blob: blobSha(written) }, 'recorded as the project wrote it');
  assert.equal(check(dest, 'd1-drift.mjs').status, 0);
});
