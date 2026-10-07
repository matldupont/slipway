#!/usr/bin/env node
// #303: the harness asks before a GitHub CLI command that deletes what no git command brings back: a release or one
// of its files, a secret, an issue, a workflow run. The rules sit beside #279's in process/harness/settings.json
// (harness-gate-files.test.mjs pins those). Every command below is inert text matched against the shipped rules;
// none is run. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bashAsks } from './ask-rules.mjs';

// Read here, not from harness-fixture.mjs: importing that builds a throwaway origin and clone these tests never use.
const ASKS = bashAsks(JSON.parse(readFileSync(new URL('../process/harness/settings.json', import.meta.url), 'utf8')));
const RULES = ['Bash(*gh release delete*)', 'Bash(*gh secret delete*)', 'Bash(*gh secret remove*)', 'Bash(*gh issue delete*)', 'Bash(*gh run delete*)'];
const OURS = ASKS.filter((a) => RULES.includes(a.rule));
const asked = (cmds) => { for (const c of cmds) assert.ok(OURS.some((a) => a.test(c)), `none of #303's ask rules matches: ${c}`); };

test('the harness asks before gh release delete and gh release delete-asset, with any arguments, behind a variable or after another command', () => {
  asked(['gh release delete', 'gh release delete v1.0.0', 'gh release delete v1.0.0 --yes', 'gh release delete v1.0.0 --cleanup-tag --yes', 'GH_TOKEN=x gh release delete v1.0.0',
    'cd /tmp && gh release delete v1.0.0 --yes', 'gh release delete-asset', 'gh release delete-asset v1.0.0 app.tgz', 'gh release delete-asset v1.0.0 app.tgz --yes',
    'GH_TOKEN=x gh release delete-asset v1.0.0 app.tgz', 'cd /tmp && gh release delete-asset v1.0.0 app.tgz']);
});

test('the harness asks before gh secret delete and its alias in the manual, gh secret remove, with any arguments', () => {
  asked(['gh secret delete', 'gh secret delete NAME', 'gh secret delete NAME --env production', 'gh secret delete NAME --org owner', 'GH_TOKEN=x gh secret delete NAME',
    'cd /tmp && gh secret delete NAME', 'gh secret remove', 'gh secret remove NAME', 'gh secret remove NAME --env production', 'cd /tmp && gh secret remove NAME']);
});

test('the harness asks before gh issue delete and gh run delete, with any arguments', () => {
  asked(['gh issue delete', 'gh issue delete 1', 'gh issue delete 1 --yes', 'GH_TOKEN=x gh issue delete 1', 'cd /tmp && gh issue delete 1 --yes',
    'gh run delete', 'gh run delete 1', 'GH_TOKEN=x gh run delete 1', 'cd /tmp && gh run delete 1']);
});

test('none of these rules matches ordinary work: a list, a view, a new release, a secret set, a search for the word, a closed issue, a pull request', () => {
  assert.equal(OURS.length, RULES.length, 'every rule this test reads is in the shipped settings');
  for (const c of ['gh release list', 'gh release view', 'gh release view v1.0.0', 'gh release create v1.0.0 --notes-file notes.md', 'gh secret list', 'gh secret set NAME',
    'gh issue list', 'gh issue list --search delete', 'gh issue list --state open --search delete', 'gh issue view 1', 'gh issue close 1', 'gh run list', 'gh run view 1',
    'gh pr create', 'gh pr create --title "x" --body-file pr.md']) {
    assert.deepEqual(OURS.filter((a) => a.test(c)).map((a) => a.rule), [], `a rule asks before: ${c}`);
  }
});
