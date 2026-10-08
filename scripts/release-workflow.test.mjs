#!/usr/bin/env node
// .github/workflows/release.yml held to what scripts/release-workflow.mjs says it must be (F-10, #240, #346).
// Every text below is a copy of the file with one thing changed, and inert: none is run, and nothing here reaches
// npm or the network. Each clause of a rule has a sample that a weaker form of the clause would pass (#346).
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify, loadOwnership } from '../ci/checks/lib/ownership.mjs';
import { PUBLISH_RUNS, shown, workflowProblems } from './release-workflow.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = '.github/workflows/release.yml';

// `broken`: the change is reported, by its rule's name before any line. `only`: these problems, and no other.
const yml = readFileSync(join(SRC, WORKFLOW), 'utf8');
const LINED = /^(at or under|after) line \d+: /;
const broken = (from, to, expected) => {
  assert.ok(typeof from === 'string' && yml.includes(from), `release.yml no longer holds ${JSON.stringify(from)}`);
  const found = workflowProblems(yml.replace(from, to));
  const at = found.findIndex((p) => expected.test(p));
  assert.ok(at >= 0, `${JSON.stringify(to)} went unnoticed: ${JSON.stringify(found)}`);
  const lined = found.findIndex((p) => LINED.test(p));
  assert.ok(LINED.test(found[at]) || lined < 0 || at < lined, `a line came before the rule's name: ${JSON.stringify(found)}`);
};
const only = (from, to, ...problems) => {
  assert.ok(yml.includes(from), `release.yml no longer holds ${JSON.stringify(from)}`);
  assert.deepEqual(workflowProblems(yml.replace(from, to)), problems);
};
const CHECK_JOB = '    runs-on: ubuntu-latest\n';

test('release.yml: only publish holds the identity, every action is pinned by sha, no run: line takes event text, and publish uses GitHub\'s own actions', () => {
  assert.deepEqual(workflowProblems(yml), []);
  assert.ok(/^ {6}id-token: write$/m.test(yml) && (yml.match(/uses:/g) ?? []).length >= 5 && (yml.match(/run:/g) ?? []).length >= 6, 'the reader has something to read');

  const sha = 'a'.repeat(40);
  broken(CHECK_JOB, `${CHECK_JOB}    permissions:\n      id-token: write\n`, /held by check, publish/);
  broken('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  id-token: write\n', /held by the top level, publish/);
  broken('      id-token: write\n', '', /held by nothing/);
  broken(/actions\/checkout@[0-9a-f]{40}/.exec(yml)[0], 'actions/checkout@v7', /check: actions\/checkout@v7 is not pinned/);
  broken(/actions\/setup-node@[0-9a-f]{40}/.exec(yml)[0], `actions/setup-node@${sha.slice(1)}`, /is not pinned/);
  broken(/actions\/setup-node@[0-9a-f]{40}/.exec(yml)[0], `actions/setup-node@${sha.toUpperCase()}`, /is not pinned/);
  broken(/pnpm\/action-setup@[0-9a-f]{40}/.exec(yml)[0], sha, /check: a{40} is not pinned/);
  broken('run: pnpm meta', 'run: echo ${{ github.ref_name }}', /check: a run: line holds/);
  broken('run: pnpm meta', 'run: |\n          pnpm meta\n          # ${{ github.event.head_commit.message }}', /check: a run: line holds/);
  broken('run: node scripts/release.mjs "$TAG"', 'run: node scripts/release.mjs "${{ github.ref_name }}"', /publish: a run: line holds/);
  broken("    permissions:\n      contents: read\n      id-token: write\n", '    permissions: write-all\n', /publish: permissions is not a block mapping/);
  broken(CHECK_JOB, `${CHECK_JOB}    permissions: { id-token: write }\n`, /check: permissions is not a block mapping/);
  broken('permissions:\n  contents: read\n', 'permissions: write-all\n', /the top level: permissions is not a block mapping/);
  broken('      - run: pnpm meta\n', '      - run: pnpm meta\n      - { uses: someone/else@v1 }\n', /check: flow style/);
  broken('        run: npm stage publish', '        shell: bash -c "${{ github.ref_name }}" {0}\n        run: npm stage publish', /publish: a shell: line holds/);
  broken("    if: github.repository == 'matldupont/slipway'\n", '', /check does not name the repository/);
  broken('    needs: check\n', '', /publish has no needs: check/);
  broken('    environment: npm\n', '', /publish has no environment: npm/);
  broken('    environment: npm\n', '    environment: npm\n    if: always()\n', /publish has an if: of its own/);
  broken('      - name: Stage the release\n', '      - run: pnpm meta\n      - name: Stage the release\n', /publish runs pnpm/);
  broken('npm stage publish --ignore-scripts', 'npm publish --ignore-scripts', /publish does not stage/);
  broken('      - name: Stage the release\n', '      - run: npm publish --ignore-scripts\n      - name: Stage the release\n', /publish does not stage/);
  broken('npm stage publish --ignore-scripts', 'npm stage --ignore-scripts', /publish does not stage/);
  broken('npm stage publish --ignore-scripts', 'npm stage publish', /publish runs npm without --ignore-scripts/);
  broken(`        run: ${PUBLISH_RUNS[2]}\n`, `        run: |\n          ${PUBLISH_RUNS[2]}\n          npm pack\n`, /publish runs npm without --ignore-scripts/);
  broken('npm pack --dry-run --json --ignore-scripts', 'npm pack --dry-run --json', /publish runs npm without --ignore-scripts/);
  broken('          ref: ${{ github.sha }}\n          fetch-depth: 0\n', '          fetch-depth: 0\n', /check: a checkout does not take github.sha/);
  broken('          ref: ${{ github.sha }}\n          persist-credentials', '          ref: ${{ github.ref }}\n          persist-credentials', /publish: a checkout does not take github.sha/);
  broken('          fetch-depth: 0\n          persist-credentials: false\n', '          fetch-depth: 0\n', /check: a checkout leaves GitHub's token/);
  broken('          persist-credentials: false\n      - uses: actions/setup-node', '          persist-credentials: true\n      - uses: actions/setup-node', /publish: a checkout leaves GitHub's token/);
  broken('          registry-url:', `          registry-url: x\n      - uses: pnpm/action-setup@${sha}\n        with:\n          registry-url:`, /publish: pnpm\/action-setup@a+ is not one of GitHub's own/);
});

test('release.yml: the publishing job runs exactly its 3 commands', () => {
  assert.equal(PUBLISH_RUNS.length, 3);
  for (const run of PUBLISH_RUNS) assert.ok(yml.includes(`        run: ${run}\n`), run);
  const exactly = /publish does not run exactly its 3 commands/;
  broken('      - name: Stage the release\n', '      - run: echo done\n      - name: Stage the release\n', exactly);
  broken('--ignore-scripts --tag "$LABEL"', '--ignore-scripts --tag "$LABEL" --access public', exactly);
  broken('--dry-run --json --ignore-scripts', '--json --dry-run --ignore-scripts', exactly);
  broken(`      - name: What is about to be staged\n        run: ${PUBLISH_RUNS[1]}\n`, '', exactly);
  broken(`        run: ${PUBLISH_RUNS[2]}\n`, `        run: ${PUBLISH_RUNS[1]}\n`, exactly);
});

test('release.yml is an allow-list: a key, an item or a value this does not know fails with its line', () => {
  // A line is the key's own, the first text under a key holding a block, or the last read before an empty key.
  only('    environment: npm\n', '    environment: npm\n    timeout-minutes: 5\n', 'at or under line 42: jobs.publish.timeout-minutes is a key this test does not know');
  only('    environment: npm\n', '    environment: npm\n    env:\n      A: b\n', 'at or under line 43: jobs.publish.env is a key this test does not know');
  only('    environment: npm\n', '    environment: npm\n    defaults:\n', 'after line 41: jobs.publish.defaults is a key this test does not know');
  only('          node-version: 24\n', '          node-version: 22\n', 'at or under line 32: jobs.check.steps[3].with.node-version is not the plain text "24"');
  only('      - run: pnpm meta\n', '      - run: pnpm meta\n      - run: echo done\n', 'at or under line 36: jobs.check.steps[6] is an item this test does not know');
  // after what was reported, after a block that was read, and after a form that passed
  only('    environment: npm\n', '    environment: npm\n    env:\n      A: b\n      C: d\n    defaults:\n', 'at or under line 43: jobs.publish.env is a key this test does not know', 'after line 44: jobs.publish.defaults is a key this test does not know');
  only('      id-token: write\n', '      id-token: write\n    defaults:\n', 'after line 44: jobs.publish.defaults is a key this test does not know');
  only('      - uses: actions/setup-node', '        with:\n      - uses: actions/setup-node', 'after line 29: jobs.check.steps[2].with is a key this test does not know');
  for (const [to, line] of [["['v*', 'w*']", 7], ["['w*']", 7], ['[v*]', 7], ["\n      - 'v*'", 8], ['{ v: x }', 7]]) only("tags: ['v*']", `tags: ${to}`, `at or under line ${line}: on.push.tags is not ['v*']`);
  const setup = /pnpm\/action-setup@[0-9a-f]{40}/.exec(yml)[0];
  for (const to of [setup.replace('pnpm/', 'someone/'), setup.replace('setup@', 'setuq@'), `"${setup}"`, setup.replace('@', '@v6@')]) only(setup, to, 'at or under line 29: jobs.check.steps[2].uses is not pnpm/action-setup at a 40-character commit sha');
  const steps = yml.slice(yml.lastIndexOf('    steps:\n'));
  broken(steps, '    steps: none\n', /^at or under line 45: jobs\.publish\.steps is not a block list$/);
  broken(steps, '    steps: [{ run: x }]\n', /^at or under line 45: jobs\.publish\.steps is not a block list$/);
  only('    environment: npm\n', '    environment: npm\n    "a\\u202Eb": c\n', 'at or under line 42: jobs.publish.a\\u{202e}b is a key this test does not know');
  only('  cancel-in-progress: false\n', '  cancel-in-progress: true\n', 'at or under line 14: concurrency.cancel-in-progress is not the plain text "false"');
  only('          package-manager-cache: false\n', '', 'after line 53: jobs.publish.steps[1].with.package-manager-cache is missing');
  only('name: release\n', 'name: release\nenv:\n  A: b\n', 'at or under line 3: env is a key this test does not know');
  only('    needs: check\n    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    needs: check\n', 'at or under line 39: jobs.publish has its keys in another order');
  broken('      - name: Nothing under node_modules/ is tracked\n        run: node ci/checks/meta/n1-node-modules.mjs .\n', '', /^after line \d+: jobs\.check\.steps has 5 of its 6 items$/);
  broken('  publish:\n', '  publish:\n    continue-on-error: true\n', /^at or under line 39: jobs\.publish\.continue-on-error is a key this test does not know$/);
  // A comment is not read, and cannot run.
  assert.deepEqual(workflowProblems(yml.replace('jobs:\n', 'jobs:\n  # a comment\n')), []);
});

// The spellings a reader of lines passed (#237's review; the list is rebuilt, round 2 recorded none). Two kinds.
test('release.yml: a spelling the reader marks or refuses is refused where it stands', () => {
  only('concurrency:\n  group: release\n  cancel-in-progress: false\n', 'concurrency: { group: release, cancel-in-progress: false }\n', 'at or under line 12: concurrency is not a block of keys');
  broken('    needs: check\n', '    needs: [check]\n', /publish: flow style/);
  only('    environment: npm\n', '    environment: "npm"\n', 'at or under line 41: jobs.publish.environment is not the plain text "npm"');
  only('      - run: pnpm meta\n', '      - run: |\n          pnpm meta\n', 'at or under line 36: jobs.check.steps[5].run is not the plain text "pnpm meta"');
  broken('        run: npm stage publish', '        run: >\n          npm stage publish', /^at or under line 66: jobs\.publish\.steps\[4\]\.run is not the plain text/);
  only('permissions:\n  contents: read\n', 'permissions: &all\n  contents: read\n', 'release.yml is unread: it holds an anchor');
  only('    needs: check\n', '    needs: *all\n', 'release.yml is unread: it holds an alias');
  only('      id-token: write\n', '      id-token: write\n      <<: { contents: read }\n', 'release.yml is unread: it holds a merge key');
  only('    needs: check\n', '    needs: check\n    needs: check\n', 'release.yml is unread: a key is written more than once');
});

test('release.yml: a spelling the reader reads to its meaning breaks the same rule as the plain one', () => {
  const held = /^id-token is held by check, publish, not by publish alone$/;
  broken(CHECK_JOB, `${CHECK_JOB}    permissions:\n      id-token:\n        write\n`, held);
  broken(CHECK_JOB, `${CHECK_JOB}    "permissions":\n      'id-token': write\n`, held);
  broken(CHECK_JOB, `${CHECK_JOB}    ? permissions\n    : ? id-token\n      : write\n`, held);
  broken(CHECK_JOB, `${CHECK_JOB}    permissions:\n      "id\\x2dtoken": write\n`, held);
  broken('    needs: check\n', '    "needs":\n      check\n    "if": always()\n', /publish has an if: of its own/);
  broken('        run: npm stage publish', '        "run": npm publish', /publish does not stage/);
});

// From here: one sample for each clause that no sample above tells apart from a weaker form of it (#346).
const NODE = /actions\/setup-node@[0-9a-f]{40}/.exec(yml)[0];
const SETUP = /pnpm\/action-setup@[0-9a-f]{40}/.exec(yml)[0];
const NOT_NODE = 'at or under line 30: jobs.check.steps[3].uses is not actions/setup-node at a 40-character commit sha';
const NO_JOB = ['check does not name the repository it runs in', 'publish has no needs: check', 'publish has no environment: npm', 'publish does not stage: it runs npm publish, or no npm stage publish', 'publish does not run exactly its 3 commands', 'id-token is held by nothing, not by publish alone'];

test('release.yml: jobs, a job or a with: that is absent breaks each rule that reads it, and nothing else', () => {
  const upTo = (text) => {
    assert.ok(yml.indexOf(text) > 0, `release.yml no longer holds ${JSON.stringify(text)}`);
    return yml.slice(0, yml.indexOf(text));
  };
  const whole = (text, ...problems) => assert.deepEqual(workflowProblems(text), problems);
  const top = upTo('jobs:\n');
  whole(top, ...NO_JOB, 'after line 14: jobs is missing');
  whole(`${top}jobs:\n`, ...NO_JOB, 'after line 14: jobs is not a block of keys');
  whole(`${top}jobs: none\n`, ...NO_JOB, 'at or under line 16: jobs is not a block of keys');
  whole(`${top}jobs:\n  - check\n`, ...NO_JOB, 'at or under line 17: jobs is not a block of keys');
  whole(upTo('  publish:\n'), ...NO_JOB.slice(1), 'after line 35: jobs.publish is missing');
  only('  check:\n', '  checks:\n', NO_JOB[0], 'at or under line 19: jobs.checks is a key this test does not know', 'after line 65: jobs.check is missing');
  only('        with:\n          ref: ${{ github.sha }}\n          persist-credentials: false\n', '', 'publish: a checkout does not take github.sha', "publish: a checkout leaves GitHub's token in .git/config", 'after line 46: jobs.publish.steps[0].with is missing');
  only('      - run: pnpm meta\n', '      - run: pnpm meta\n      - done\n', 'at or under line 36: jobs.check.steps[6] is an item this test does not know');
});

test('release.yml: a sha is 40 characters and no more, an action has an @, and only a plain text passes for one', () => {
  const pinnedBy = (text) => `check: ${text} is not pinned by a 40-character commit sha`;
  for (const to of [`${NODE}0`, NODE.replace('@', '@x')]) only(NODE, to, pinnedBy(to), NOT_NODE);
  // no @: the named rule, and the comparison's own line
  const slash = SETUP.replace('@', '/');
  only(SETUP, slash, pinnedBy(slash), 'at or under line 29: jobs.check.steps[2].uses is not pnpm/action-setup at a 40-character commit sha');
  // a list or a block of keys where a text belongs: neither has `plain`, so neither passes for a text
  only(NODE, `\n          - ${NODE}`, pinnedBy(''), NOT_NODE.replace('30', '31'));
  only(NODE, `\n          ${NODE}: x`, pinnedBy(''), NOT_NODE.replace('30', '31'));
  only('          node-version: 24\n', '          node-version:\n            - 24\n', 'at or under line 33: jobs.check.steps[3].with.node-version is not the plain text "24"');
  only('          node-version: 24\n', '          node-version:\n            24: x\n', 'at or under line 33: jobs.check.steps[3].with.node-version is not the plain text "24"');
});

test('release.yml: an empty value has no line of its own, a quoted one has, and the top level keeps its order', () => {
  only('    environment: npm\n', '    environment: npm\n    defaults: ""\n', 'at or under line 42: jobs.publish.defaults is a key this test does not know');
  only('    environment: npm\n', '    environment: npm\n    defaults:\n    strategy:\n', 'after line 41: jobs.publish.defaults is a key this test does not know', 'after line 41: jobs.publish.strategy is a key this test does not know');
  only('          registry-url: https://registry.npmjs.org\n          package-manager-cache: false\n', '          registry-url:\n', 'after line 52: jobs.publish.steps[1].with.registry-url is not the plain text "https://registry.npmjs.org"', 'after line 52: jobs.publish.steps[1].with.package-manager-cache is missing');
  const [perms, conc] = ['permissions:\n  contents: read\n', 'concurrency:\n  group: release\n  cancel-in-progress: false\n'];
  only(`${perms}\n${conc}`, `${conc}\n${perms}`, 'at or under line 1: the top level has its keys in another order');
});

test('release.yml: file text in a message is printable ASCII at each place a message holds it, and never reads as a code', () => {
  // each end of the range, and the backslash
  assert.equal(shown('\x1f\x20'), '\\u{1f} ');
  assert.equal(shown('\x7e\x7f'), '~\\u{7f}');
  assert.equal(shown('[\\]'), '[\\u{5c}]');
  // a top-level key: the character, and its code typed out, read differently
  const unknown = (key) => `at or under line 2: ${key} is a key this test does not know`;
  only('name: release\n', 'name: release\n"\\u202E": c\n', unknown('\\u{202e}'));
  only('name: release\n', 'name: release\n"\\\\u{202e}": c\n', unknown('\\u{5c}u{202e}'));
  // a key under another is in the allow-list test; an action; a job's name, in each message that holds it
  only(NODE, '"actions/setup\\u202Enode@v7"', 'check: actions/setup\\u{202e}node@v7 is not pinned by a 40-character commit sha', NOT_NODE);
  only('  publish:\n', '  "a\\u202Eb":\n    permissions: write-all\n  publish:\n', 'a\\u{202e}b: permissions is not a block mapping', 'at or under line 39: jobs.a\\u{202e}b is a key this test does not know');
  const checkout = /actions\/checkout@[0-9a-f]{40}/.exec(yml)[0];
  only('  publish:\n', `  "a\\u202Eb":\n    steps:\n      - uses: ${checkout}\n  publish:\n`, 'a\\u{202e}b: a checkout does not take github.sha', "a\\u{202e}b: a checkout leaves GitHub's token in .git/config", 'at or under line 40: jobs.a\\u{202e}b is a key this test does not know');
});

test('release.yml: each named rule holds against the weaker form of its clause', () => {
  const sha = 'a'.repeat(40);
  const STAGE = '      - name: Stage the release\n';
  const step = (run, expected) => broken(STAGE, `      - run: ${run}\n${STAGE}`, expected);
  // the two clauses #240 tightened: any id-token key is a holder, and npm before a flag is npm
  only('      id-token: write\n', '      id-token: none\n', 'at or under line 44: jobs.publish.permissions.id-token is not the plain text "write"');
  broken(CHECK_JOB, `${CHECK_JOB}    permissions:\n      id-token: none\n`, /held by check, publish/);
  step('npm --version', /publish runs npm without --ignore-scripts/);
  // GitHub's own actions: the owner's name whole, at the start
  const inPublish = `          persist-credentials: false\n      - uses: ${NODE}`;
  for (const action of [`actionsx/setup-node@${sha}`, `x/actions/setup-node@${sha}`]) only(inPublish, inPublish.replace(NODE, action), `publish: ${action} is not one of GitHub's own actions`, `at or under line 50: jobs.publish.steps[1].uses is not actions/setup-node at a 40-character commit sha`);
  // the repository condition, needs and environment: the value whole
  broken("    if: github.repository == 'matldupont/slipway'\n", "    if: github.repository == 'matldupont/slipway' || true\n", /check does not name the repository/);
  broken('    needs: check\n', '    needs: checks\n', /publish has no needs: check/);
  broken('    environment: npm\n', '    environment: npm2\n', /publish has no environment: npm/);
  // an if: of any kind: empty, or not a text
  for (const under of ['', '\n      - a']) broken('    environment: npm\n', `    environment: npm\n    if:${under}\n`, /publish has an if: of its own/);
  // pnpm and npm anywhere in a line, on any line
  step('true && pnpm install --ignore-scripts', /publish runs pnpm/);
  step('|\n          true\n          exec pnpm install --ignore-scripts', /publish runs pnpm/);
  step('true && npm ci', /publish runs npm without --ignore-scripts/);
  // npm publish, however spaced; npm stage publish, as whole words
  step('true && npm  publish --ignore-scripts', /publish does not stage/);
  broken('npm stage publish --ignore-scripts', 'npm stage publisher --ignore-scripts', /publish does not stage/);
  // the 3 commands in their order
  const last = (a, b) => `        run: ${a}\n${STAGE}        env:\n          LABEL: \${{ steps.rule.outputs.label }}\n        run: ${b}\n`;
  broken(last(PUBLISH_RUNS[1], PUBLISH_RUNS[2]), last(PUBLISH_RUNS[2], PUBLISH_RUNS[1]), /publish does not run exactly its 3 commands/);
  // the checkout's name: at any ref, and no other action's
  const taken = /actions\/checkout@[0-9a-f]{40}.*\n {8}with:\n {10}ref: \$\{\{ github\.sha \}\}\n {10}fetch-depth: 0\n {10}persist-credentials: false\n/.exec(yml)[0];
  broken(taken, 'actions/checkout@v7\n', /check: a checkout does not take github.sha/);
  only(taken, `actions/checkout-x@${sha}\n`, 'at or under line 22: jobs.check.steps[0].uses is not actions/checkout at a 40-character commit sha', 'after line 22: jobs.check.steps[0].with is missing');
  // the holder list: publish once
  broken('          registry-url:', '          id-token: write\n          registry-url:', /held by publish, publish, not by publish alone/);
  // ${{ however it goes on
  broken('run: pnpm meta', 'run: echo ${{github.ref_name', /check: a run: line holds/);
  broken('        run: npm stage publish', '        shell: bash ${{0\n        run: npm stage publish', /publish: a shell: line holds/);
});

test('release.yml is slipway\'s own, and both release tests are on the meta line', () => {
  assert.equal(classify(loadOwnership(SRC), WORKFLOW), 'internal');
  const meta = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).scripts.meta.split(/\s*&&\s*/);
  for (const file of ['scripts/release.test.mjs', 'scripts/release-workflow.test.mjs']) assert.ok(meta.includes(`node ${file}`), `${file} is not in the meta script`);
});
