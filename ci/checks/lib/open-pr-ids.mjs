#!/usr/bin/env node
// The folder ID2 (meta/id2-open-prs.mjs) reads: this pull request's diff and every other open pull request's, of
// decisions.md and the feature folders only. ci.yml's meta job runs it, then ID2:
//
//   node ci/checks/lib/open-pr-ids.mjs <out> <owner/repo> <pull request number, empty on a push> <base sha> <head sha>
//
// The open pull requests come from the REST API (`gh api --paginate`, GH_TOKEN with pull-requests: read), every page,
// so no list limit can leave one out. Each one's head is fetched as `refs/pull/<n>/head` into refs/id2/<n>, a fork's
// too, and diffed against its own base: a pull request stacked on another adds only what it adds. Nothing is checked
// out, run or sourced from another pull request; git runs with its external diff and text conversion off. A failed
// list, fetch or diff exits 2 with ID2's BROKEN line, never an empty folder that would read as no clash.
//
// On a push (GITHUB_EVENT_NAME is `push`) there is no pull request: it writes `not-a-pull-request`, and ID2 says it
// compared nothing.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { trustedEnvAt, trustedGit } from './manifest.mjs';
import { escapeControl } from './report.mjs';

const [out, repo, pr, baseSha, headSha] = process.argv.slice(2);
const SHA = /^[0-9a-f]{40}$/;
const PATHS = ['decisions.md', ':(glob)docs/features/*.md', ':(glob)dev/features/*.md'];

function fail(why) {
  console.log(`ID2: BROKEN — ${escapeControl(why)}`);
  process.exit(2);
}

if (typeof out !== 'string' || out === '') fail('no output folder given');
mkdirSync(out, { recursive: true });
// Only a push may come without a number: a pull request's run that lost it is BROKEN, not a push.
if ((pr === undefined || pr === '') && process.env.GITHUB_EVENT_NAME === 'push') {
  writeFileSync(join(out, 'not-a-pull-request'), '');
  process.exit(0);
}
if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo ?? '')) fail('the repository is not owner/name');
if (!/^[1-9]\d{0,9}$/.test(pr)) fail('the pull request number is not a number');
if (!SHA.test(baseSha ?? '') || !SHA.test(headSha ?? '')) fail('the base or head is not a full commit sha');

const git = (args) => trustedGit('.', ['-c', 'core.quotePath=false', ...args]);
const diff = (base, head) => git(['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--no-color', '-U0', `${base}...${head}`, '--', ...PATHS]);

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

try {
  writeFileSync(join(out, 'this.diff'), diff(baseSha, headSha));
  mkdirSync(join(out, 'open'), { recursive: true });
  if (others.length) {
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
  for (const { n, base } of others) writeFileSync(join(out, 'open', `${n}.diff`), diff(base, `refs/id2/${n}`));
} catch (e) {
  fail(`a pull request's diff could not be read (${String(e.stderr || e.message).split('\n')[0]})`);
}
console.log(`ID2: read ${others.length} other open pull request(s) of ${repo}`);
