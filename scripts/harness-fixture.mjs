// Shared by the harness tests (harness-gate-files, harness-base, harness-yes .test.mjs): every hook command in
// process/harness/settings.json, and the throwaway origin and clone whose stub hooks write a marker. Each test file
// is its own process and so has its own copy of the temp folder, removed when that file's tests end. Not a test.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

export const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SETTINGS = JSON.parse(readFileSync(join(SRC, 'process/harness/settings.json'), 'utf8'));
export const HOOKS = ['session-state.sh', 'intake-reminder.sh', 'lessons-first.sh', 'absence-search.sh', 'stop-verify.sh'];
export const TRUST = 'trust-gates'; // the UserPromptSubmit path: the guard's own, no working-tree script
export const LOAD = / --no-replace-objects cat-file blob "\$([br]):process\/harness\/hooks\/base-guard\.sh"/g;

export const REFUSE = 'refuse-arranged'; // #222: the one command that loads no guard, so it runs with no pin
// The PreToolUse entry that refuses a tool call carrying the yes phrase: every entry but the advisory Bash one.
export const REFUSAL = SETTINGS.hooks.PreToolUse.filter((e) => e.matcher !== 'Bash');

// hook → the command settings.json runs for it.
export const commands = new Map();
for (const entries of Object.values(SETTINGS.hooks)) {
  for (const e of entries) {
    for (const h of e.hooks) commands.set(h.command.match(/ base-guard ([a-z-]+(?:\.sh)?)$/)?.[1] ?? (REFUSAL.includes(e) ? REFUSE : h.command), h.command);
  }
}

// #222 — the tools a session can arrange a prompt with: `match` is the word in the settings matcher, `tool` a tool
// it names, `input` that tool's own input carrying the prompt. The list to extend when Claude Code gains another.
export const ARRANGERS = [
  { match: 'ScheduleWakeup', tool: 'ScheduleWakeup', input: (p) => ({ delaySeconds: 60, prompt: p, reason: 'inert', noop: false }) },
  { match: 'CronCreate', tool: 'CronCreate', input: (p) => ({ cron: '*/5 * * * *', prompt: p, recurring: false }) },
  { match: 'SendMessage', tool: 'SendMessage', input: (p) => ({ to: 'worker', summary: 'inert', message: p }) },
  { match: 'Skill', tool: 'Skill', input: (p) => ({ skill: 'loop', args: p }) },
  { match: 'RemoteTrigger', tool: 'RemoteTrigger', input: (p) => ({ action: 'run', trigger_id: 't1', body: { job: { prompt: p } } }) },
  { match: 'mcp__scheduled-tasks__create_scheduled_task', tool: 'mcp__scheduled-tasks__create_scheduled_task', input: (p) => ({ taskId: 'inert', description: 'inert', prompt: p }) },
  { match: 'mcp__scheduled-tasks__update_scheduled_task', tool: 'mcp__scheduled-tasks__update_scheduled_task', input: (p) => ({ taskId: 'inert', prompt: p }) },
  { match: 'mcp__ccd_session_mgmt__send_message', tool: 'mcp__ccd_session_mgmt__send_message', input: (p) => ({ session_id: 'local_x', message: p }) },
  { match: 'mcp__ccd_session__spawn_task', tool: 'mcp__ccd_session__spawn_task', input: (p) => ({ title: 'inert', tldr: 'inert', prompt: p }) },
  { match: 'mcp__terminal__run_in_terminal', tool: 'mcp__terminal__run_in_terminal', input: (p) => ({ command: p }) },
  { match: 'mcp__computer-use__.*', tool: 'mcp__computer-use__app_type', input: (p) => ({ text: p }) },
  { match: 'mcp__computer-use__.*', tool: 'mcp__computer-use__computer_batch', input: (p) => ({ actions: [{ action: 'left_click', coordinate: [1, 2] }, { action: 'type', text: p }] }) },
  { match: 'mcp__claude-in-chrome__.*', tool: 'mcp__claude-in-chrome__form_input', input: (p) => ({ ref: 'ref_1', value: p }) },
  { match: 'mcp__Claude_Browser__.*', tool: 'mcp__Claude_Browser__computer', input: (p) => ({ action: 'type', text: p }) },
];

export const T = mkdtempSync(join(tmpdir(), 'harness-'));
export const SID = 'sess-A';
export const STATE = join(T, '.claude/slipway/sessions');
export const MARK = join(T, 'marks');
export const origin = join(T, 'origin.git');
export const work = join(T, 'work');
export const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
export const put = (p, body) => {
  mkdirSync(dirname(join(work, p)), { recursive: true });
  writeFileSync(join(work, p), body);
};
export const stub = (hook, name = hook) => `#!/bin/sh\ncat >/dev/null\n: > '${join(MARK, name)}'\n`;
export const marks = () => (existsSync(MARK) ? execFileSync('ls', [MARK], { encoding: 'utf8' }).split('\n').filter(Boolean) : []);
export const reset = () => {
  rmSync(MARK, { recursive: true, force: true });
  mkdirSync(MARK);
};

// origin: the real guard and settings, stub hooks, a package.json and a ci/ file; `work` is a clone of it.
{
  const seed = join(T, 'seed');
  mkdirSync(seed);
  git('-C', seed, 'init', '-q', '-b', 'main');
  const w = (p, body) => {
    mkdirSync(dirname(join(seed, p)), { recursive: true });
    writeFileSync(join(seed, p), body);
  };
  w('process/harness/settings.json', readFileSync(join(SRC, 'process/harness/settings.json'), 'utf8'));
  w('process/harness/hooks/base-guard.sh', readFileSync(join(SRC, 'process/harness/hooks/base-guard.sh'), 'utf8'));
  for (const h of HOOKS) w(`process/harness/hooks/${h}`, stub(h));
  w('process/harness/README.md', '# harness\n');
  mkdirSync(join(seed, 'docs'));
  w('package.json', '{ "scripts": { "verify": "node ci/verify.mjs" } }\n');
  w('ci/verify.mjs', '// the gate\n');
  w('src/app.ts', 'export {};\n');
  symlinkSync('../src/app.ts', join(seed, 'docs/base-link')); // a link the base already has
  git('-C', seed, 'add', '-A');
  git('-C', seed, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', 'base');
  git('clone', '-q', '--bare', seed, origin);
  git('clone', '-q', origin, work);
}

// `sid` is the session id Claude Code puts in a hook's environment; null leaves it unset.
export function run(hook, input = '{}', sid = SID) {
  const cmd = commands.get(hook) ?? commands.get('lessons-first.sh').replace(/lessons-first\.sh$/, hook);
  const r = spawnSync('/bin/sh', ['-c', cmd], {
    input,
    encoding: 'utf8',
    cwd: work,
    env: { PATH: '/usr/bin:/bin', HOME: T, CLAUDE_PROJECT_DIR: work, ...(sid === null ? {} : { CLAUDE_CODE_SESSION_ID: sid }) },
  });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}
export const BASE = git('-C', work, 'rev-parse', 'origin/HEAD');
export const start = (sid = SID, source = 'startup') => run('session-state.sh', JSON.stringify({ session_id: sid, hook_event_name: 'SessionStart', source }), sid);
export const pinOf = (sid = SID) => join(STATE, sid, 'base');
export const unpin = () => rmSync(join(T, '.claude'), { recursive: true, force: true });
// A clean checkout of main, in a session pinned to it.
export const clean = () => {
  git('-C', work, 'checkout', '-q', '-f', 'main');
  git('-C', work, 'reset', '-q', '--hard', 'origin/main');
  git('-C', work, 'clean', '-q', '-ffdx');
  unpin();
  start();
  assert.equal(readFileSync(pinOf(), 'utf8'), `${BASE}\n`, 'a new session did not pin origin/HEAD');
  reset();
};

export const commit = (msg) => git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', msg);
export const say = (prompt, extra = {}) => JSON.stringify({ session_id: SID, transcript_path: '/x.jsonl', cwd: work, permission_mode: 'default', hook_event_name: 'UserPromptSubmit', prompt, ...extra });
// A tool call as PreToolUse hands it to a hook.
export const call = (tool_name, tool_input, extra = {}) => JSON.stringify({ session_id: SID, transcript_path: '/x.jsonl', cwd: work, permission_mode: 'default', hook_event_name: 'PreToolUse', tool_name, tool_input, tool_use_id: 'toolu_inert', ...extra });

export const commitAll = (branch, msg) => {
  git('-C', work, 'checkout', '-q', '-b', branch);
  git('-C', work, 'add', '-A');
  git('-C', work, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '-m', msg);
};

test.after(() => rmSync(T, { recursive: true, force: true }));
