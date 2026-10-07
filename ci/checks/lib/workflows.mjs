// Reads what CI actually runs: which workflows run on a change, and the command lines of those.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripShellComment } from './commands.mjs';

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
// Three shapes are read: `on: push`, `on: [push, pull_request]`, and a block of events with block or inline
// lists under them. Anything else (an anchor, an expression, a flow mapping, a tab, no `on:` or two) gives
// `unread`, a fixed reason holding none of the file's text, and counts for nothing: fail closed.
const EVENT = /^[a-z_]+$/;
const READ = new Set(['push', 'pull_request', 'issues']);
const PR_DEFAULT_TYPES = new Set(['opened', 'synchronize', 'reopened']);
const indentOf = (l) => l.length - l.trimStart().length;
const unquote = (v) => v.replace(/^(['"])(.*)\1$/, '$2');
const opaque = (v) => /\$\{\{|^[&*!|>{]/.test(v);
const flowList = (v) => {
  if (!/^\[.*\]$/.test(v)) return null;
  const items = v.slice(1, -1).split(',').map((e) => e.trim());
  if (items.length === 1 && items[0] === '') return [];
  return items.some((e) => e === '' || opaque(e) || /[[\]{}]/.test(e)) ? null : items.map(unquote);
};

export function workflowTrigger(text) {
  const unread = (reason) => ({ counts: false, issues: false, called: false, unread: reason });
  const lines = String(text).split(/\r?\n/);
  const tops = lines.flatMap((l, i) => (/^(?:on|"on"|'on')\s*:(?:\s|$)/.test(l) ? [i] : []));
  if (tops.length === 0) return unread('it has no top-level on:');
  if (tops.length > 1) return unread('it has more than one top-level on:');
  const inline = stripShellComment(lines[tops[0]].replace(/^[^:]*:/, '')).trim();

  // event → its keys, each with the list under it (null: a value that is not a list)
  const events = new Map();
  if (inline) {
    const names = flowList(inline) ?? (opaque(inline) ? null : [unquote(inline)]);
    if (!names?.length || names.some((n) => !EVENT.test(n))) return unread('its on: is not an event, a list of events or a block of them');
    for (const n of names) events.set(n, new Map());
  } else {
    const block = [];
    for (let i = tops[0] + 1; i < lines.length; i++) {
      const l = stripShellComment(lines[i]);
      if (!l.trim()) continue;
      if (indentOf(l) === 0) break;
      if (/^\s*\t/.test(l)) return unread('its on: block is indented with a tab');
      block.push(l);
    }
    if (!block.length) return unread('its on: is empty');
    const eventIndent = indentOf(block[0]);
    let keys = null; // the current event's keys, when W1 reads them
    let keyIndent = -1;
    let list = null;
    for (const l of block) {
      const indent = indentOf(l);
      const body = l.trim();
      if (indent < eventIndent) return unread('its on: block is not indented evenly');
      if (indent === eventIndent) {
        const item = body.match(/^-\s+(\S+)$/);
        const key = body.match(/^(?:([a-z_]+)|"([a-z_]+)"|'([a-z_]+)')\s*:\s*(.*)$/);
        const name = item ? unquote(item[1]) : key ? key[1] ?? key[2] ?? key[3] : null;
        const value = key ? key[4] : '';
        if (!name || !EVENT.test(name) || events.has(name) || (item && events.size && keys) || (key && events.size && !keys)) return unread('its on: block holds a line that is not an event');
        if (value && !/^(null|~|\{\s*\})$/.test(value)) return unread('an event of its on: block has an inline value');
        events.set(name, new Map());
        keys = key ? events.get(name) : null;
        keyIndent = -1;
        list = null;
        continue;
      }
      if (!keys) return unread('its on: block is not indented evenly');
      // Only these three decide anything, so only their keys are read: a cron line is never parsed.
      const event = [...events.keys()].at(-1);
      if (!READ.has(event)) continue;
      if (keyIndent < 0) keyIndent = indent;
      if (indent === keyIndent) {
        const kv = body.match(/^([a-z-]+)\s*:\s*(.*)$/);
        if (!kv || keys.has(kv[1]) || opaque(kv[2])) return unread(`a line under ${event} is not a filter W1 can read`);
        list = kv[2] ? flowList(kv[2]) ?? (/[[\]{}]/.test(kv[2]) ? null : [unquote(kv[2])]) : [];
        if (list === null) return unread(`a filter under ${event} is not a list W1 can read`);
        keys.set(kv[1], list);
        list = kv[2] ? null : list;
        continue;
      }
      const item = indent > keyIndent ? body.match(/^-\s+(.+)$/) : null;
      if (!item || !list || opaque(item[1])) return unread(`a line under ${event} is not a filter W1 can read`);
      list.push(unquote(item[1]));
    }
  }

  // A filter with nothing in it matches nothing, or everything, depending on who reads it: not counted.
  for (const [event, keys] of events) {
    if (!READ.has(event)) continue;
    for (const k of ['branches', 'branches-ignore', 'tags', 'tags-ignore', 'types']) {
      if (keys.has(k) && keys.get(k).length === 0) return unread(`${k} under ${event} is empty`);
    }
  }
  const pr = events.get('pull_request');
  const push = events.get('push');
  const onPr = pr !== undefined && (!pr.has('types') || pr.get('types').some((t) => PR_DEFAULT_TYPES.has(t)));
  const onBranch = push !== undefined && (push.has('branches') || push.has('branches-ignore') || !(push.has('tags') || push.has('tags-ignore')));
  const issues = events.get('issues');
  const onIssue = issues !== undefined && (!issues.has('types') || issues.get('types').includes('opened'));
  return { counts: onPr || onBranch, issues: onIssue, called: events.has('workflow_call'), unread: null };
}

// The `run:` lines of one workflow's text.
function runLines(rel, text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)(-\s+)?run\s*:\s*(.*)$/);
    if (!m) continue;
    const keyIndent = m[1].length + (m[2] ? m[2].length : 0);
    const value = stripShellComment(m[3]).trim();
    if (/^[|>][+-]?[0-9]?[+-]?$/.test(value)) {
      let j = i + 1;
      for (; j < lines.length; j++) {
        const l = lines[j];
        if (/^\s*$/.test(l)) continue;
        if (l.length - l.trimStart().length <= keyIndent) break;
        const cmd = stripShellComment(l.trim());
        if (cmd) out.push({ where: `${rel}:${j + 1}`, cmd });
      }
      i = j - 1;
    } else if (value) {
      out.push({ where: `${rel}:${i + 1}`, cmd: value.replace(/^(['"])(.*)\1$/, '$2') });
    }
  }
  return out;
}

// The workflows one workflow calls: `uses: ./.github/workflows/<file>` lines, a job's way to run a reusable
// workflow of the same repository. `local` holds those file names. `unfollowed` holds a fixed reason for each
// `uses:` that names a workflow any other way (another repository's, an expression): W1 cannot see what it runs.
const LOCAL_WORKFLOW = /^\.\/\.github\/workflows\/([\w.-]+\.ya?ml)$/;
function calledWorkflows(text) {
  const local = new Set();
  const unfollowed = new Set();
  for (const l of text.split(/\r?\n/)) {
    const m = l.match(/^\s*(?:-\s+)?uses\s*:\s*(.*)$/);
    if (!m) continue;
    const value = stripShellComment(m[1]).trim().replace(/^(['"])(.*)\1$/, '$2');
    const file = value.match(LOCAL_WORKFLOW);
    if (file) local.add(file[1]);
    else if (/\$\{\{/.test(value)) unfollowed.add('a uses: holds an expression');
    else if (/\.github\/workflows\//.test(value)) unfollowed.add('a uses: names a workflow outside this repository, or one W1 cannot read');
  }
  return { local, unfollowed: [...unfollowed] };
}

// The commands of the workflows that run on a pull request or a push to a branch (workflowTrigger), and of the
// reusable workflows (`workflow_call`) those call by local path: its steps run when its caller does. One level:
// what a called workflow calls is not followed. With how many workflow files there are, how many count, which
// could not be read (`unread`) and which calls were not followed (`unfollowed`). `issueCommands` holds the
// commands of the `issueOnly` workflows: those that run when an issue is opened and on no change.
export function workflowCommands(root) {
  const dir = join(root, '.github', 'workflows');
  const out = { commands: [], issueCommands: [], files: 0, counted: 0, issueOnly: 0, unread: [], unfollowed: [] };
  if (!existsSync(dir)) return out;
  const read = new Map();
  for (const f of readdirSync(dir).filter((e) => /\.ya?ml$/.test(e)).sort()) {
    const text = readFileSync(join(dir, f), 'utf8');
    read.set(f, { rel: `.github/workflows/${f}`, text, trigger: workflowTrigger(text) });
  }
  out.files = read.size;
  const called = new Set();
  for (const w of read.values()) {
    if (w.trigger.unread) out.unread.push({ file: w.rel, reason: w.trigger.unread });
    if (!w.trigger.counts) continue;
    const calls = calledWorkflows(w.text);
    for (const reason of calls.unfollowed) out.unfollowed.push({ file: w.rel, reason });
    for (const f of calls.local) {
      if (read.get(f)?.trigger.called) called.add(f);
      else out.unfollowed.push({ file: w.rel, reason: 'a uses: names a workflow file that is missing, or that is not a reusable workflow W1 can read' });
    }
  }
  for (const [f, w] of read) {
    const counts = w.trigger.counts || called.has(f);
    if (!counts && !w.trigger.issues) continue;
    if (counts) out.counted++;
    else out.issueOnly++;
    (counts ? out.commands : out.issueCommands).push(...runLines(w.rel, w.text));
  }
  return out;
}
