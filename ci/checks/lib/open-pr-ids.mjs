#!/usr/bin/env node
// The folder ID2 (meta/id2-open-prs.mjs) reads: this pull request's diff and every other open pull request's, of
// decisions.md and the feature folders only. ci.yml's meta job runs it, then ID2, before anything the pull request can
// change runs:
//
//   node ci/checks/lib/open-pr-ids.mjs <out> <owner/repo> <pull request number, empty on a push> <base sha> <head sha>
//   node ci/checks/lib/open-pr-ids.mjs <out> <owner/repo> --next <default branch>      (process/intake.md → Next free number)
//
// <out> must not exist yet: a folder something else wrote first (a marker, a diff) is never read as this run's. With
// `--next` there is no pull request of one's own: `this.diff` is the default branch as one diff from the empty tree, so
// ID2 `--next` reads every id on it, and every open pull request is read.
//
// The open pull requests come from the REST API (`gh api --paginate`, GH_TOKEN with pull-requests: read), every page,
// so no list limit can leave one out. Each one's head is fetched as `refs/pull/<n>/head` into refs/id2/<n>, a fork's
// too, diffed against its own base, so a pull request stacked on another adds only what it adds, and the refs are
// deleted after. Nothing is checked out, run or sourced from another pull request; git runs with its external diff and
// text conversion off, and `--text`, so a file git would call binary still shows its lines. A failed list, fetch or diff
// exits 2 with ID2's BROKEN line, never an empty folder that would read as no clash.
//
// On a push (GITHUB_EVENT_NAME is `push`) there is no pull request: it writes `not-a-pull-request`, and ID2 says it
// compared nothing.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { trustedEnvAt, trustedGit } from './manifest.mjs';
import { escapeControl } from './report.mjs';

const [out, repo, pr, baseSha, headSha] = process.argv.slice(2);
const next = pr === '--next';
const SHA = /^[0-9a-f]{40}$/;
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const PATHS = ['decisions.md', ':(glob)docs/features/*.md', ':(glob)dev/features/*.md'];

function fail(why) {
  console.log(`ID2: BROKEN — ${escapeControl(why)}`);
  process.exit(2);
}

if (typeof out !== 'string' || out === '') fail('no output folder given');
if (existsSync(out)) fail('the output folder exists already: give a path nothing has written yet');
mkdirSync(out, { recursive: true });
// Only a push may come without a number: a pull request's run that lost it is BROKEN, not a push.
if (!next && (pr === undefined || pr === '') && process.env.GITHUB_EVENT_NAME === 'push') {
  writeFileSync(join(out, 'not-a-pull-request'), '');
  process.exit(0);
}
if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo ?? '')) fail('the repository is not owner/name');
if (next) {
  if (!/^[A-Za-z0-9._/-]+$/.test(baseSha ?? '') || baseSha.startsWith('-') || baseSha.includes('..')) fail('the default branch name is not letters, digits and . _ / -');
} else {
  if (!/^[1-9]\d{0,9}$/.test(pr ?? '')) fail('the pull request number is not a number');
  if (!SHA.test(baseSha ?? '') || !SHA.test(headSha ?? '')) fail('the base or head is not a full commit sha');
}

const git = (args) => trustedGit('.', ['-c', 'core.quotePath=false', ...args]);
const diff = (range) => git(['diff', '--text', '--no-ext-diff', '--no-textconv', '--no-renames', '--no-color', '-U0', ...range, '--', ...PATHS]);

let list;
try {
  list = execFileSync('gh', ['api', '--paginate', `repos/${repo}/pulls?state=open&per_page=100`, '--jq', '.[] | "\\(.number) \\(.base.sha)"'], {
    encoding: 'utf8',
    env: trustedEnvAt('.'),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 << 20,
  });
} catch (e) {
  fail(`the open pull requests could not be listed (${String(e.stderr || e.message).split('\n')[0]})`);
}
const others = [];
for (const line of list.split('\n').filter(Boolean)) {
  const m = line.match(/^([1-9]\d{0,9}) ([0-9a-f]{40})$/);
  if (!m) fail('the list of open pull requests holds a line that is not a number and a sha');
  if (m[1] !== pr) others.push({ n: m[1], base: m[2] });
}

const fetched = [];
let failed = null;
try {
  if (next) {
    fetched.push('refs/id2/base');
    git(['fetch', '--no-tags', '--quiet', 'origin', `+refs/heads/${baseSha}:refs/id2/base`]);
    writeFileSync(join(out, 'this.diff'), diff([EMPTY_TREE, 'refs/id2/base']));
  } else {
    writeFileSync(join(out, 'this.diff'), diff([`${baseSha}...${headSha}`]));
  }
  mkdirSync(join(out, 'open'));
  if (others.length) {
    fetched.push(...others.map(({ n }) => `refs/id2/${n}`));
    git(['fetch', '--no-tags', '--quiet', 'origin', ...others.map(({ n }) => `+refs/pull/${n}/head:refs/id2/${n}`)]);
    const missing = [...new Set(others.map(({ base }) => base))].filter((sha) => {
      try {
        git(['cat-file', '-e', `${sha}^{commit}`]);
        return false;
      } catch {
        return true;
      }
    });
    if (missing.length) git(['fetch', '--no-tags', '--quiet', 'origin', ...missing]);
  }
  for (const { n, base } of others) writeFileSync(join(out, 'open', `${n}.diff`), diff([`${base}...refs/id2/${n}`]));
} catch (e) {
  failed = e;
} finally {
  // The refs this run fetched are its own scratch: a session's checkout keeps none of them.
  for (const ref of fetched) {
    try {
      git(['update-ref', '-d', ref]);
    } catch {}
  }
}
// After the refs are gone: process.exit would skip a finally.
if (failed) fail(`a pull request's diff could not be read (${String(failed.stderr || failed.message).split('\n')[0]})`);
console.log(`ID2: read ${others.length} ${next ? '' : 'other '}open pull request(s) of ${repo}`);
