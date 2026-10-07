// Reads what CI actually runs: which workflows run on a change, and the command lines of those.
// A workflow file is read through lib/workflow-yaml.mjs (a YAML parser, and what is refused in front of it,
// D-033), never by matching its text: a file that reader refuses is `unread` here and counts for nothing.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripShellComment } from './commands.mjs';
import { NULL_TEXT, isNull, readWorkflow } from './workflow-yaml.mjs';

// What starts a workflow, read from its top-level `on:`. `counts` is true when it runs on a pull request or on a
// push to a branch: the two events that run a change before, or as, it lands. A gate that only a tag, a schedule,
// a manual dispatch or a reusable workflow runs never ran on the change being merged, so it is not an invocation.
//   counts       pull_request (not when `types:` holds none of opened, synchronize, reopened);
//                push with a `branches`/`branches-ignore` side, or with neither a branches nor a tags side
//   does not     push to tags only, pull_request_target, schedule, workflow_dispatch, workflow_call, any other event
// `issues` is `issues` with no `types:` or with `opened` among them, for the one kind of gate that cannot run on
// a change: a check whose subject is an issue. W1 counts such a workflow for check files only.
// `called` is `workflow_call` among the events: a reusable workflow, which runs when its caller does.
// `paths` and `paths-ignore` are not read: a deploy workflow that skips documentation-only pushes still runs
// its gates on every push that changes code (#239).
// Three shapes are read: `on: push`, `on: [push, pull_request]`, and a block of events with a text or a list
// under each filter. Anything else (an expression, a flow mapping, an event with an inline value, no `on:`)
// gives `unread`, a fixed reason holding none of the file's text, and counts for nothing: fail closed. So does a
// `jobs:` that is not a block of jobs, each a block of keys: GitHub runs none of such a file.
const EVENT = /^[a-z_]+$/;
const READ = new Set(['push', 'pull_request', 'issues']);
const PR_DEFAULT_TYPES = new Set(['opened', 'synchronize', 'reopened']);
const NOT_EVENTS = 'its on: is not an event, a list of events or a block of them';
const isText = (node) => node?.kind === 'scalar';
const isBlock = (node) => node?.kind === 'map';

// The jobs of a read workflow, or null when `jobs:` holds anything W1 would have to guess at.
function jobsOf(root) {
  const jobs = root.entries.get('jobs');
  if (jobs === undefined) return [];
  if (!isBlock(jobs)) return null;
  const out = [...jobs.entries.values()];
  for (const job of out) {
    if (!isBlock(job)) return null;
    const uses = job.entries.get('uses');
    const steps = job.entries.get('steps');
    if (uses !== undefined && !isText(uses)) return null;
    if (steps === undefined) continue;
    if (steps.kind !== 'list') return null;
    for (const step of steps.items) {
      if (!isBlock(step)) return null;
      const run = step.entries.get('run');
      if (run !== undefined && !isText(run)) return null;
    }
  }
  return out;
}

function triggerOf(w) {
  const unread = (reason) => ({ counts: false, issues: false, called: false, unread: reason });
  if (w.unread) return unread(w.unread);
  const on = w.root.entries.get('on');
  if (on === undefined) return unread('it has no top-level on:');
  if (isNull(on)) return unread('its on: is empty');
  if (jobsOf(w.root) === null) return unread('its jobs: is not a block of jobs W1 can read');

  // event → its filters, each a list of texts
  const events = new Map();
  if (on.kind !== 'map') {
    for (const n of isText(on) ? [on] : on.items) {
      if (!isText(n) || !EVENT.test(n.value) || events.has(n.value)) return unread(NOT_EVENTS);
      events.set(n.value, new Map());
    }
    if (!events.size) return unread(NOT_EVENTS);
  } else {
    if (on.flow) return unread(NOT_EVENTS);
    for (const [name, value] of on.entries) {
      if (!EVENT.test(name)) return unread('its on: block holds a key that is not an event');
      const filters = new Map();
      events.set(name, filters);
      if (isNull(value) || (isBlock(value) && value.entries.size === 0)) continue;
      if (isText(value) || value.flow) return unread('an event of its on: block has an inline value');
      // Only these three decide anything, so only their filters are read: a cron line is never read.
      if (!READ.has(name)) continue;
      const notFilter = `a value under ${name} is not a filter W1 can read`;
      if (!isBlock(value)) return unread(notFilter);
      for (const [k, filter] of value.entries) {
        if (!/^[a-z-]+$/.test(k) || isBlock(filter)) return unread(notFilter);
        // A key with nothing after it is a list of nothing; `null` written out is one entry, and an empty one.
        const items = filter.kind === 'list' ? filter.items : filter.plain && filter.value === '' ? [] : [filter];
        if (items.some((i) => !isText(i))) return unread(`a filter under ${name} is not a list W1 can read`);
        if (items.some((i) => i.value.includes('${{'))) return unread(notFilter);
        filters.set(k, items.map((i) => i.value));
      }
    }
  }

  // A filter with nothing in it matches nothing, or everything, depending on who reads it: not counted.
  for (const [event, keys] of events) {
    if (!READ.has(event)) continue;
    for (const k of ['branches', 'branches-ignore', 'tags', 'tags-ignore', 'types']) {
      if (!keys.has(k)) continue;
      const list = keys.get(k);
      if (list.length === 0) return unread(`${k} under ${event} is empty`);
      if (list.some((e) => NULL_TEXT.test(e.trim()))) return unread(`${k} under ${event} holds an empty entry`);
    }
    // A branch filter that can match no branch: every pattern refuses, or every branch is ignored. What a
    // pattern matches is otherwise not read (`branches: [no-such-branch]` counts), as a job's `if:` is not.
    if (keys.get('branches')?.every((e) => e.startsWith('!'))) return unread(`branches under ${event} only refuses`);
    if (keys.get('branches-ignore')?.includes('**')) return unread(`branches-ignore under ${event} ignores every branch`);
  }
  const pr = events.get('pull_request');
  const push = events.get('push');
  const onPr = pr !== undefined && (!pr.has('types') || pr.get('types').some((t) => PR_DEFAULT_TYPES.has(t)));
  const onBranch = push !== undefined && (push.has('branches') || push.has('branches-ignore') || !(push.has('tags') || push.has('tags-ignore')));
  const issues = events.get('issues');
  const onIssue = issues !== undefined && (!issues.has('types') || issues.get('types').includes('opened'));
  return { counts: onPr || onBranch, issues: onIssue, called: events.has('workflow_call'), unread: null };
}

export const workflowTrigger = (text) => triggerOf(readWorkflow(text));

// The commands of one read workflow: each line of each `run:` that is a step of a job. A `run:` anywhere else
// (under `env:`, under `with:`, inside a text) is not a step and runs nothing.
function runLines(rel, root) {
  const out = [];
  for (const job of jobsOf(root) ?? []) {
    for (const step of job.entries.get('steps')?.items ?? []) {
      const run = step.entries.get('run');
      if (!run) continue;
      run.value.split('\n').forEach((l, i) => {
        const cmd = stripShellComment(l.trim());
        if (cmd) out.push({ where: `${rel}:${run.line + (run.literal ? i : 0)}`, cmd });
      });
    }
  }
  return out;
}

// The workflows one workflow calls: a job's own `uses: ./.github/workflows/<file>`, the way to run a reusable
// workflow of the same repository. Only a key of a job counts: a step's `uses:` names an action, and the same
// words under `with:`, in a `run:` block or in a quoted text call nothing. `local` holds the file names.
// `unfollowed` holds a fixed reason for each job that names a workflow any other way (another repository's, an
// expression): W1 cannot see what it runs.
const LOCAL_WORKFLOW = /^\.\/\.github\/workflows\/([\w.-]+\.ya?ml)$/;
function calledWorkflows(root) {
  const local = new Set();
  const unfollowed = new Set();
  for (const job of jobsOf(root) ?? []) {
    const uses = job.entries.get('uses');
    if (!uses) continue;
    const file = uses.value.match(LOCAL_WORKFLOW);
    if (file) local.add(file[1]);
    else if (uses.value.includes('${{')) unfollowed.add('a uses: holds an expression');
    else unfollowed.add('a uses: names a workflow outside this repository, or one W1 cannot read');
  }
  return { local, unfollowed: [...unfollowed] };
}

// The commands of the workflows that run on a pull request or a push to a branch (workflowTrigger), and of the
// reusable workflows (`workflow_call`) those call by local path: its steps run when its caller does. One level:
// what a called workflow calls is not followed. With how many workflow files there are, how many count, which
// could not be read (`unread`, with a `hint` when there is a way to write the file so it is read) and which calls
// were not followed (`unfollowed`). `issueCommands` holds the
// commands of the `issueOnly` workflows: those that run when an issue is opened and on no change.
export function workflowCommands(root) {
  const dir = join(root, '.github', 'workflows');
  const out = { commands: [], issueCommands: [], files: 0, counted: 0, issueOnly: 0, unread: [], unfollowed: [] };
  if (!existsSync(dir)) return out;
  const read = new Map();
  for (const f of readdirSync(dir).filter((e) => /\.ya?ml$/.test(e)).sort()) {
    const w = readWorkflow(readFileSync(join(dir, f), 'utf8'));
    read.set(f, { rel: `.github/workflows/${f}`, root: w.root, hint: w.hint, trigger: triggerOf(w) });
  }
  out.files = read.size;
  const called = new Set();
  for (const w of read.values()) {
    if (w.trigger.unread) out.unread.push({ file: w.rel, reason: w.trigger.unread, ...(w.hint ? { hint: w.hint } : {}) });
    if (!w.trigger.counts) continue;
    const calls = calledWorkflows(w.root);
    for (const reason of calls.unfollowed) out.unfollowed.push({ file: w.rel, reason });
    for (const f of calls.local) {
      if (read.get(f)?.trigger.called) {
        called.add(f);
        if (!read.get(f).trigger.counts && calledWorkflows(read.get(f).root).local.size) out.unfollowed.push({ file: read.get(f).rel, reason: 'it is called itself, and what it calls in turn is not followed' });
      }
      else out.unfollowed.push({ file: w.rel, reason: 'a uses: names a workflow file that is missing, or that is not a reusable workflow W1 can read' });
    }
  }
  for (const [f, w] of read) {
    const counts = w.trigger.counts || called.has(f);
    if (!counts && !w.trigger.issues) continue;
    if (counts) out.counted++;
    else out.issueOnly++;
    (counts ? out.commands : out.issueCommands).push(...runLines(w.rel, w.root));
  }
  return out;
}
