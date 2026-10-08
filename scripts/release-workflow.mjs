// What .github/workflows/release.yml must be (F-10, #240): the rules that keep the publishing identity in one
// job, and the whole file as an allow-list. Read through the one reader of workflow files
// (ci/checks/lib/workflow-yaml.mjs, D-033), never by matching text: a file that reader refuses is a problem here.
// The named rules come first, so a broken rule is reported by its name; then every key and value is compared with
// EXPECTED, so anything this does not know fails with a line. Comments are not read: only a `run:` text keeps
// its own. Which commit a sha names is not held here: review of the diff holds that.
// Imported by scripts/release.test.mjs only. Internal: no project receives it.

import { readWorkflow } from '../ci/checks/lib/workflow-yaml.mjs';

const SHA = /^[0-9a-f]{40}$/;
const REPOSITORY = "github.repository == 'matldupont/slipway'";
const TAKEN = '${{ github.sha }}';

// The 3 commands the publishing job runs, exactly.
export const PUBLISH_RUNS = [
  'node scripts/release.mjs "$TAG" >> "$GITHUB_OUTPUT"',
  'npm pack --dry-run --json --ignore-scripts | node scripts/release.mjs --summary >> "$GITHUB_STEP_SUMMARY"',
  'npm stage publish --ignore-scripts --tag "$LABEL"',
];

// In EXPECTED a string is that text, written plainly (not quoted, not a block text); an object is a block of exactly those keys, in
// that order; an array is a block list of exactly those items. A function is one of the two forms below.
const pinned = (action) => (n) => (n.kind === 'scalar' && n.plain && n.value.startsWith(`${action}@`) && SHA.test(n.value.slice(action.length + 1)) ? null : `is not ${action} at a 40-character commit sha`);
const tags = (n) => (n.kind === 'list' && n.flow && n.items.length === 1 && !n.items[0].plain && n.items[0].value === 'v*' ? null : "is not ['v*']");
const checkout = (extra) => ({ uses: pinned('actions/checkout'), with: { ref: TAKEN, ...extra, 'persist-credentials': 'false' } });

const EXPECTED = {
  name: 'release',
  on: { push: { tags } },
  permissions: { contents: 'read' },
  concurrency: { group: 'release', 'cancel-in-progress': 'false' },
  jobs: {
    check: {
      if: REPOSITORY,
      'runs-on': 'ubuntu-latest',
      steps: [
        checkout({ 'fetch-depth': '0' }),
        { name: 'The tagged commit is on main', run: 'git merge-base --is-ancestor "$GITHUB_SHA" origin/main' },
        { uses: pinned('pnpm/action-setup') },
        { uses: pinned('actions/setup-node'), with: { 'node-version': '24' } },
        { name: 'Nothing under node_modules/ is tracked', run: 'node ci/checks/meta/n1-node-modules.mjs .' },
        { run: 'pnpm meta' },
      ],
    },
    publish: {
      needs: 'check',
      'runs-on': 'ubuntu-latest',
      environment: 'npm',
      permissions: { contents: 'read', 'id-token': 'write' },
      steps: [
        checkout({}),
        { uses: pinned('actions/setup-node'), with: { 'node-version': '24.21.0', 'registry-url': 'https://registry.npmjs.org', 'package-manager-cache': 'false' } },
        { name: 'The tag is this version, and npm can stage', id: 'rule', env: { TAG: '${{ github.ref_name }}' }, run: PUBLISH_RUNS[0] },
        { name: 'What is about to be staged', run: PUBLISH_RUNS[1] },
        { name: 'Stage the release', env: { LABEL: '${{ steps.rule.outputs.label }}' }, run: PUBLISH_RUNS[2] },
      ],
    },
  },
};

// Every way `root` is not `expected`, each with a line. The reader gives a line for a text, none for a key: so
// `at or under line N` names the first text of what differs (its key is on that line, or above it when the key
// holds a block), and `after line N` the last text read before a key with nothing under it; something missing
// is reported after the last text of the block it is missing from.
// A key or a value of the file is shown with anything but printable ASCII written as its code.
export const shown = (s) => s.replace(/[^\x20-\x7e]/gu, (c) => `\\u{${c.codePointAt(0).toString(16)}}`);
function differences(root, expected) {
  const out = [];
  let last = 0;
  const texts = (n) => (n.kind === 'scalar' ? [n] : n.kind === 'list' ? n.items.flatMap(texts) : [...n.entries.values()].flatMap(texts));
  // An empty value has no place of its own in what the reader gives.
  const placed = (n) => !(n.plain && n.value === '');
  const pass = (n) => { for (const t of texts(n)) if (placed(t)) last = t.line; };
  const say = (n, path, what) => {
    const first = n && texts(n).find(placed);
    out.push(`${first ? `at or under line ${first.line}` : `after line ${last}`}: ${path} ${what}`);
    if (n) pass(n);
  };
  const walk = (n, want, path) => {
    if (typeof want === 'function') {
      const wrong = want(n);
      return wrong ? say(n, path, wrong) : pass(n);
    }
    if (typeof want === 'string') return n.kind === 'scalar' && n.plain && n.value === want ? pass(n) : say(n, path, `is not the plain text ${JSON.stringify(want)}`);
    if (Array.isArray(want)) {
      if (n.kind !== 'list' || n.flow) return say(n, path, 'is not a block list');
      n.items.forEach((item, i) => (i < want.length ? walk(item, want[i], `${path}[${i}]`) : say(item, `${path}[${i}]`, 'is an item this test does not know')));
      if (n.items.length < want.length) say(null, path, `has ${n.items.length} of its ${want.length} items`);
      return;
    }
    if (n.kind !== 'map' || n.flow) return say(n, path, 'is not a block of keys');
    const known = Object.keys(want);
    const under = (k) => (path ? `${path}.${shown(k)}` : shown(k));
    for (const [k, v] of n.entries) {
      if (known.includes(k)) walk(v, want[k], under(k));
      else say(v, under(k), 'is a key this test does not know');
    }
    const missing = known.filter((k) => !n.entries.has(k));
    for (const k of missing) say(null, under(k), 'is missing');
    if (!missing.length && [...n.entries.keys()].filter((k) => known.includes(k)).join('\n') !== known.join('\n')) say(n, path || 'the top level', 'has its keys in another order');
  };
  walk(root, expected, '');
  return out;
}

// What release.yml must never hold: [] when it keeps the rules. A `run:` text is read whole, comments included:
// GitHub fills `${{ }}` in before the shell sees a comment.
export function workflowProblems(text) {
  const { root, unread } = readWorkflow(text);
  if (unread) return [`release.yml is unread: ${unread}`];
  const problems = [];
  const holders = [];
  const get = (node, ...keys) => keys.reduce((n, k) => (n?.kind === 'map' ? n.entries.get(k) : undefined), node);
  const textOf = (n) => (n?.kind === 'scalar' ? n.value : undefined);
  // Each job is read under its own name; what is not a block of jobs is left to the comparison below.
  const jobsNode = get(root, 'jobs');
  const jobs = jobsNode?.kind === 'map' ? jobsNode.entries : new Map();
  const visit = (n, where) => {
    if (n.kind === 'scalar') return;
    if (where !== 'the top level' && n.flow) problems.push(`${where}: flow style, which this test does not allow`);
    if (n.kind === 'list') return n.items.forEach((item) => visit(item, where));
    for (const [k, v] of n.entries) {
      // `permissions: write-all` and `{ id-token: write }` grant the identity without the key this looks for.
      if (k === 'permissions' && (v.kind !== 'map' || v.flow)) problems.push(`${where}: permissions is not a block mapping`);
      if (k === 'id-token') holders.push(where);
      if (k === 'shell' && textOf(v)?.includes('${{')) problems.push(`${where}: a shell: line holds \${{`);
      if (k === 'run' && textOf(v)?.includes('${{')) problems.push(`${where}: a run: line holds \${{`);
      if (k === 'uses') {
        const action = shown(textOf(v) ?? '');
        if (!SHA.test(action.slice(action.lastIndexOf('@') + 1)) || !action.includes('@')) problems.push(`${where}: ${action} is not pinned by a 40-character commit sha`);
        if (where === 'publish' && !action.startsWith('actions/')) problems.push(`publish: ${action} is not one of GitHub's own actions`);
      }
      if (v !== jobsNode) visit(v, where);
    }
  };
  visit(root, 'the top level');
  for (const [name, job] of jobs) visit(job, shown(name));
  // The rest of what holds a run back (dev/features/release.md, "Rules the file keeps").
  const steps = (job) => (get(job, 'steps')?.kind === 'list' ? get(job, 'steps').items : []);
  const check = jobs.get('check');
  const publish = jobs.get('publish');
  if (textOf(get(check, 'if')) !== REPOSITORY) problems.push('check does not name the repository it runs in');
  for (const [k, v] of [['needs', 'check'], ['environment', 'npm']]) if (textOf(get(publish, k)) !== v) problems.push(`publish has no ${k}: ${v}`);
  if (get(publish, 'if') !== undefined) problems.push('publish has an if: of its own, so it can run when check did not');
  const runs = steps(publish).map((s) => textOf(get(s, 'run'))).filter((r) => r !== undefined);
  const lines = runs.flatMap((r) => r.split('\n'));
  if (lines.some((l) => /\bpnpm\b/.test(l))) problems.push('publish runs pnpm: code under test would hold the identity');
  const npm = lines.filter((l) => /\bnpm\s/.test(l));
  if (npm.some((l) => /\bnpm\s+publish\b/.test(l)) || !npm.some((l) => /\bnpm stage publish\b/.test(l))) problems.push('publish does not stage: it runs npm publish, or no npm stage publish');
  if (npm.some((l) => !l.includes('--ignore-scripts'))) problems.push('publish runs npm without --ignore-scripts');
  if (JSON.stringify(runs) !== JSON.stringify(PUBLISH_RUNS)) problems.push('publish does not run exactly its 3 commands');
  for (const [name, job] of jobs) {
    for (const step of steps(job)) {
      if (!textOf(get(step, 'uses'))?.startsWith('actions/checkout@')) continue;
      if (textOf(get(step, 'with', 'ref')) !== TAKEN) problems.push(`${shown(name)}: a checkout does not take github.sha`);
      if (textOf(get(step, 'with', 'persist-credentials')) !== 'false') problems.push(`${shown(name)}: a checkout leaves GitHub's token in .git/config`);
    }
  }
  if (holders.join() !== 'publish') problems.push(`id-token is held by ${holders.join(', ') || 'nothing'}, not by publish alone`);
  return [...problems, ...differences(root, EXPECTED)];
}
