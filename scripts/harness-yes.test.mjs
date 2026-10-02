#!/usr/bin/env node
// The owner's yes to changed gate files (#145): only a UserPromptSubmit whose whole prompt is the phrase writes the
// session's record, and it fingerprints the gate files as they are; the guard runs no working-tree script to do it.
// Fixture: harness-fixture.mjs. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { SRC, SETTINGS, HOOKS, TRUST, REFUSE, REFUSAL, ARRANGERS, YES, NO, WRAPPED, MENTIONS, T, SID, STATE, work, git, put, stub, marks, reset, run, BASE, start, pinOf, unpin, clean, say, call, commit, commitAll } from './harness-fixture.mjs';

// #145 — the yes. Only a UserPromptSubmit whose whole prompt is the phrase writes the session's `yes`: the fingerprint
// of the changed gate files. While it matches, the hooks run; any change to a gate file ends it.
const yesOf = (sid = SID) => join(STATE, sid, 'yes');
const trust = (input = say('trust gates'), sid = SID) => run(TRUST, input, sid);
const runs = (why) => {
  reset();
  for (const h of HOOKS) run(h);
  assert.deepEqual(marks().sort(), [...HOOKS].sort(), why);
};
const stays = (why) => {
  reset();
  for (const h of HOOKS) run(h);
  assert.deepEqual(marks(), [], why);
  assert.equal(JSON.parse(run('stop-verify.sh').out).decision, 'block', why);
};

test('the owner\'s message, the phrase alone, records a yes: every hook runs again until a gate file changes', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  stays('a changed gate file, before any yes');
  const out = JSON.parse(trust().out);
  assert.match(out.systemMessage, /your yes is recorded for 1 gate file\(s\): ci\/verify\.mjs \./);
  assert.equal(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.match(out.hookSpecificOutput.additionalContext, /the owner said yes .*ci\/verify\.mjs/);
  assert.match(readFileSync(yesOf(), 'utf8'), /^[0-9a-f]{40,64}\n$/);
  assert.equal(statSync(yesOf()).mode & 0o777, 0o600);
  assert.deepEqual(marks(), [], 'recording a yes ran a hook');
  runs('the yes did not turn the hooks back on');
  const held = join(T, 'yes-held'); // a link where the record goes is no record, and a yes is never written through one
  writeFileSync(held, readFileSync(yesOf()));
  rmSync(yesOf());
  symlinkSync(held, yesOf());
  stays('the yes is a link');
  writeFileSync(held, 'not a fingerprint\n');
  trust();
  assert.ok(!statSync(yesOf(), { throwIfNoEntry: false })?.isSymbolicLink?.() && readFileSync(held, 'utf8') === 'not a fingerprint\n', 'a yes was written through a link');
  runs('a new yes replaced the link');
  // The pin is part of the fingerprint: the same files against another base are not the ones the owner approved.
  git('-C', work, 'stash', 'push', '-q', '-u', '-m', 'harness-test');
  put('docs/notes.md', '# notes\n');
  git('-C', work, 'add', '-A');
  commit('another base, the same gate files');
  const other = git('-C', work, 'rev-parse', 'HEAD');
  git('-C', work, 'reset', '-q', '--hard', BASE);
  git('-C', work, 'stash', 'pop', '-q');
  writeFileSync(pinOf(), `${other}\n`);
  stays('the pin changed under the yes');
  writeFileSync(pinOf(), `${BASE}\n`);
  runs('the pin, back');
  put('ci/verify.mjs', '// changed again\n');
  stays('the approved file\'s content changed');
  put('ci/verify.mjs', '// changed\n');
  runs('the approved content, back');
  put('ci/extra.mjs', '// new\n');
  stays('a second gate file');
  rmSync(join(work, 'ci/extra.mjs'));
  runs('the second gate file, gone again');
  start('sess-B');
  reset();
  assert.equal(JSON.parse(run('stop-verify.sh', '{}', 'sess-B').out).decision, 'block', 'a yes in one session counted in another');
  assert.deepEqual(marks(), []);
});

test('a prompt that is not the phrase alone records nothing; case and outer whitespace do not matter', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  for (const p of NO) {
    assert.equal(trust(say(p)).out, '', `${JSON.stringify(p)} printed something`);
    assert.ok(!existsSync(yesOf()), `${JSON.stringify(p)} recorded a yes`);
  }
  const inputs = {
    'another event': say('trust gates', { hook_event_name: 'Stop' }),
    'no event': JSON.stringify({ prompt: 'trust gates' }),
    'a subagent': say('trust gates', { agent_id: 'a1', agent_type: 'Explore' }),
    'the phrase in another field': say('hello', { session_title: 'trust gates', last_assistant_message: '"prompt":"trust gates"' }),
    'a key that ends in prompt': JSON.stringify({ hook_event_name: 'UserPromptSubmit', user_prompt: 'trust gates' }),
    'a prompt nested in another object': JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'hello', tool_input: { prompt: 'trust gates' } }),
    'a prompt nested, before the real one': JSON.stringify({ hook_event_name: 'UserPromptSubmit', tool_input: { prompt: 'trust gates' }, prompt: 'hello' }),
    'an event nested in another object': JSON.stringify({ hook_event_name: 'Stop', x: { hook_event_name: 'UserPromptSubmit' }, prompt: 'trust gates' }),
    'not JSON': 'trust gates',
    'nothing': '',
  };
  for (const [name, input] of Object.entries(inputs)) {
    assert.equal(trust(input).out, '', `${name} printed something`);
    assert.ok(!existsSync(yesOf()), `${name} recorded a yes`);
  }
  for (const p of YES) {
    rmSync(yesOf(), { force: true });
    trust(say(p));
    assert.ok(existsSync(yesOf()), `${JSON.stringify(p)} recorded nothing`);
  }
  for (const input of [JSON.stringify({ prompt: 'trust gates', hook_event_name: 'UserPromptSubmit' }), JSON.stringify(JSON.parse(say('trust gates')), null, 2)]) {
    rmSync(yesOf());
    trust(input);
    assert.ok(existsSync(yesOf()), 'key order or spacing lost a yes');
  }
});

test('no hook, script or mode writes a record but the UserPromptSubmit path, and it runs no working-tree script', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  put('process/harness/hooks/trust-gates', stub(TRUST, 'TRUST-SCRIPT'));
  put('process/harness/hooks/trust-gates.sh', stub(TRUST, 'TRUST-SCRIPT'));
  const phrase = say('trust gates');
  for (const h of [...HOOKS, 'trust-gates.sh', 'trust', 'record', 'yes', '--record', '']) {
    run(h, phrase);
    run(h, JSON.stringify({ ...JSON.parse(phrase), hook_event_name: 'SessionStart', source: 'startup' }));
    assert.ok(!existsSync(yesOf()), `the guard, run as ${JSON.stringify(h)}, recorded a yes`);
  }
  assert.deepEqual(marks(), []);
  trust();
  assert.ok(existsSync(yesOf()));
  assert.deepEqual(marks(), [], 'the UserPromptSubmit path ran a working-tree script');
  // The guard is the only file that names the session folder, and it writes each of its two files in one place.
  const dir = join(SRC, 'process/harness/hooks');
  const guard = readFileSync(join(dir, 'base-guard.sh'), 'utf8');
  for (const f of readdirSync(dir)) if (f !== 'base-guard.sh') assert.doesNotMatch(readFileSync(join(dir, f), 'utf8'), /slipway\/sessions|\$state|trust.gates/, `${f} knows the record`);
  assert.equal(guard.match(/>"\$state\/yes"/g)?.length, 1);
  assert.equal(guard.match(/>"\$state\/base"/g)?.length, 1);
  const pkg = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
  for (const [name, script] of Object.entries(pkg.scripts)) assert.doesNotMatch(script, /base-guard|slipway\/sessions|trust.gates/, `the ${name} script reaches the record`);
});

test('a yes cannot be recorded, and the hooks stay off, over a quoted name, a link, a submodule link or a folder where a gate file goes', () => {
  const cases = [
    ['a name git has to quote', () => { put('ci/verify.mjs', '// changed\n'); put('docs/café.md', '# inert\n'); }],
    ['a symlink or a submodule link', () => { put('ci/verify.mjs', '// changed\n'); symlinkSync('../src/app.ts', join(work, 'docs/link')); commitAll('yes-link', 'a link'); }],
    ['a symlink or a submodule link', () => {
      put('.gitmodules', '[submodule "vend/x"]\n\tpath = vend/x\n\turl = ./x\n\tignore = all\n');
      git('-C', work, 'add', '.gitmodules');
      git('-C', work, 'update-index', '--add', '--cacheinfo', `160000,${BASE},vend/x`);
      commit('a gitlink');
      mkdirSync(join(work, 'vend/x'), { recursive: true });
    }],
    ['a link or a folder where a gate file goes', () => { put('vendor/.bin/tsc', '#!/bin/sh\n'); symlinkSync('vendor', join(work, 'node_modules')); }],
    ['a link or a folder where a gate file goes', () => symlinkSync('../src/app.ts', join(work, 'ci/extra.mjs'))], // an untracked link to a file: git reports no mode
    ['a link or a folder where a gate file goes', () => { mkdirSync(join(work, 'ci/tool')); git('-C', join(work, 'ci/tool'), 'init', '-q'); writeFileSync(join(work, 'ci/tool/x.mjs'), '// inert\n'); }],
  ];
  for (const [why, change] of cases) {
    clean();
    change();
    const out = JSON.parse(trust().out);
    assert.match(out.systemMessage, new RegExp(`a yes cannot cover ${why} \\(.*\\): those keep the hooks off until they are merged, so no yes was recorded`), why);
    assert.ok(!existsSync(yesOf()), `a yes was recorded over ${why}`);
    stays(why);
    assert.match(JSON.parse(run('stop-verify.sh').out).reason, new RegExp(`no yes can cover ${why}, so once they say yes, run pnpm verify:fast yourself`));
  }
  clean();
  assert.match(JSON.parse(trust().out).systemMessage, /no gate file differs from the base pinned for this session, so no yes was recorded/);
  assert.ok(!existsSync(yesOf()));
});

test('the yes is exact over names, kinds and content: moved content, a deletion, an executable bit, an ignored tracked file, a pathspec-magic name', () => {
  clean(); // content moved between two files
  put('ci/a.mjs', '// one\n');
  put('ci/b.mjs', '// two\n');
  trust();
  runs('two new gate files, approved');
  put('ci/a.mjs', '// two\n');
  put('ci/b.mjs', '// one\n');
  stays('the two files\' contents swapped');
  put('ci/a.mjs', '// one\n// two\n');
  put('ci/b.mjs', '');
  stays('one file\'s content moved into the other');

  clean(); // a deletion is covered by its yes, and a later one ends it
  rmSync(join(work, 'ci/verify.mjs'));
  trust();
  runs('a deleted gate file, approved');
  put('ci/verify.mjs', '');
  stays('the deleted file came back empty');
  clean();
  put('ci/a.mjs', '// one\n');
  trust();
  rmSync(join(work, 'ci/verify.mjs'));
  stays('another gate file deleted after the yes');

  clean(); // the executable bit
  put('node_modules/.bin/tsc', '#!/bin/sh\n');
  trust();
  runs('a new file, approved');
  chmodSync(join(work, 'node_modules/.bin/tsc'), 0o755);
  stays('the approved file became executable');

  clean(); // a gate file the branch tracks where .gitignore ignores it (PR #143, round 2)
  put('.gitignore', '.npmrc\n');
  put('.npmrc', 'a=1\n');
  git('-C', work, 'add', '-f', '.gitignore', '.npmrc');
  commit('tracked, ignored');
  trust();
  runs('a tracked, ignored gate file, approved');
  put('.npmrc', 'a=2\n');
  stays('the tracked, ignored file changed after the yes');

  for (const decoy of [':!/package.json', ':(exclude)package.json', '--stdin', '-x']) { // a name is a path, never a pathspec or an option
    clean();
    put('package.json', '{ "scripts": { "verify": "node x.mjs" } }\n');
    put(`ci/${decoy}`, '// inert\n');
    put(decoy.includes('/') ? decoy : `${decoy}/package.json`, '{}\n');
    trust();
    runs(`${decoy}, approved`);
    put('package.json', '{ "scripts": { "verify": "node y.mjs" } }\n');
    stays(`${decoy} hid a change to package.json`);
  }
});

test('the harness asks before an agent reaches the pin or the record: by edit, by a write, or by a command that names them', () => {
  const ask = SETTINGS.permissions.ask;
  for (const r of ['Edit(~/.claude/slipway/**)', 'Write(~/.claude/slipway/**)', 'Bash(*.claude/slipway*)', 'Bash(*base-guard*)', 'Bash(*trust gates*)']) assert.ok(ask.includes(r), `no ask rule ${r}`);
});

// #222 — a prompt the session arranges reaches UserPromptSubmit as a typed one does (#213), so the tool call that
// would arrange the phrase is refused before it runs: a PreToolUse command in settings.json that loads no guard and
// needs no pin. Every payload here is inert text handed to that command; no tool runs.
const refuse = (input, sid = SID) => run(REFUSE, input, sid).out;
const denied = (out, why, re = /may not carry that phrase as a whole value/) => {
  const o = JSON.parse(out || '{}').hookSpecificOutput;
  assert.deepEqual([o?.hookEventName, o?.permissionDecision], ['PreToolUse', 'deny'], `${why}: not refused (${out})`);
  assert.match(o.permissionDecisionReason, re, why);
};
const [wake] = ARRANGERS;

test('each tool a session can arrange a prompt with is refused with the phrase and allowed without it, and the table is the matcher', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  assert.equal(REFUSAL.length, 1);
  assert.equal(REFUSAL[0].hooks.length, 1);
  assert.equal(REFUSAL[0].matcher, [...new Set(ARRANGERS.map((a) => a.match))].join('|'), 'the settings matcher and the ARRANGERS table list different tools');
  for (const { match, tool, input } of ARRANGERS) {
    assert.match(tool, new RegExp(`^(?:${match})$`), `${tool} is not a tool ${match} names`);
    denied(refuse(call(tool, input('trust gates'))), tool);
    assert.equal(refuse(call(tool, input('say hi'))), '', `${tool} was refused an ordinary call`);
  }
  assert.ok(!existsSync(yesOf()), 'a refusal recorded a yes');
  assert.deepEqual(marks(), [], 'the refusal ran a working-tree script');
});

test('the refusal takes the phrase as the yes does, after the tool\'s wrapping; a call that only mentions it is allowed', () => {
  clean();
  put('ci/verify.mjs', '// changed\n');
  for (const p of YES) {
    rmSync(yesOf(), { force: true });
    trust(say(p));
    assert.ok(existsSync(yesOf()), `${JSON.stringify(p)} is no longer a yes`);
    denied(refuse(call(wake.tool, wake.input(p))), `a yes, ${JSON.stringify(p)}, arranged`);
  }
  for (const p of WRAPPED) denied(refuse(call(wake.tool, wake.input(p))), JSON.stringify(p));
  for (const p of [...NO, ...MENTIONS]) assert.equal(refuse(call(wake.tool, wake.input(p))), '', `${JSON.stringify(p)} was refused`);
  denied(refuse(call(wake.tool, wake.input('X')).replace('"X"', '"\\/loop 5m trust gates"')), 'a serialiser that escapes the slash');
  // Any string value, wherever it sits: an array element, a nested member, pretty-printed input.
  denied(refuse(call('RemoteTrigger', { action: 'run', body: { events: ['say hi', 'trust gates'] } })), 'an array element');
  denied(refuse(call('RemoteTrigger', { action: 'run', body: { a: { b: { c: 'TRUST GATES' } } } })), 'a nested member');
  denied(refuse(JSON.stringify(JSON.parse(call(wake.tool, wake.input('trust gates'))), null, 2)), 'pretty-printed input');
  // The terminal tool starts a command, so the phrase anywhere in it counts, as the Bash ask rule has it; the message
  // names another way, and no other tool is held to that.
  const term = ARRANGERS.find((a) => a.tool === 'mcp__terminal__run_in_terminal');
  denied(refuse(call(term.tool, term.input('rg -n "Trust Gates" scripts'))), 'a terminal command naming the phrase', /terminal command .* run the command with the Bash tool, which asks the owner/);
  assert.equal(refuse(call(term.tool, term.input('rg -n trust scripts'))), '');
  assert.equal(refuse(call('SendMessage', { to: 'worker', message: 'rg -n "trust gates" scripts', note: 'mcp__terminal__run_in_terminal' })), '', 'a message that mentions the phrase');
});

test('the refusal needs no pin and no session id, and input it cannot read is refused', () => {
  clean();
  unpin();
  denied(refuse(call(wake.tool, wake.input('trust gates'))), 'a session with no pin');
  denied(refuse(call(wake.tool, wake.input('trust gates')), null), 'no session id');
  assert.equal(refuse(call(wake.tool, wake.input('say hi'))), '', 'an ordinary call in a session with no pin');
  const unread = { 'nothing': '', 'not JSON': 'say hi', 'another event': call(wake.tool, wake.input('say hi'), { hook_event_name: 'UserPromptSubmit' }),
    'no event': JSON.stringify({ tool_name: wake.tool, tool_input: wake.input('say hi') }) };
  for (const [name, input] of Object.entries(unread)) denied(refuse(input), name, /could not read this tool call, so it is refused/);
  // A tool the command needs is missing: with no grep, then with no tr either, an ordinary call is refused, not allowed.
  const bin = join(T, 'bin-tr-only');
  mkdirSync(bin);
  symlinkSync('/usr/bin/tr', join(bin, 'tr'));
  const odd = join(T, 'bin-grep-errs'); // a grep that fails on the phrase's own pattern is not "no match"
  mkdirSync(odd);
  symlinkSync('/usr/bin/tr', join(odd, 'tr'));
  writeFileSync(join(odd, 'grep'), '#!/bin/sh\ncase "$*" in *gates*) exit 2 ;; esac\nexec /usr/bin/grep "$@"\n', { mode: 0o755 });
  for (const PATH of [bin, join(T, 'bin-none'), odd]) denied(run(REFUSE, call(wake.tool, wake.input('say hi')), SID, { PATH }).out.split('\n').find((l) => l.startsWith('{')), `PATH=${PATH}`, /could not read this tool call/);
  assert.deepEqual(marks(), []);
});
