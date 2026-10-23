#!/usr/bin/env node
// The prose check (ci/prose.mjs, F-16 §8): each rule trips its own file once, the controls raise nothing, a missing
// Vale is BROKEN, and the two workflows pin the same Vale. Internal: the `prose` CI job runs it in slipway, never a
// project, and never `pnpm meta`, which installs nothing. With no `vale` on the path it exits 2 (BROKEN) at once.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { blank } from '../ci/prose.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROSE = join(SRC, 'ci', 'prose.mjs');
const FIXTURE = join(SRC, 'ci', 'fixtures', 'known-bad', 'prose');

if (spawnSync('vale', ['--version']).status !== 0) {
  console.error('PROSE TEST: BROKEN — vale is not on the path, so no rule was run — install it: `brew install vale`, or the release at https://github.com/errata-ai/vale/releases');
  process.exit(2);
}

const run = (args, env = process.env) => spawnSync(process.execPath, [PROSE, ...args], { cwd: SRC, encoding: 'utf8', env });
const alertsIn = (dir) => {
  const r = run(['--dir', dir]);
  return { status: r.status, alerts: JSON.parse(r.stdout).alerts };
};

test('each rule trips its own file once, at the line that holds it', () => {
  const { status, alerts } = alertsIn(FIXTURE);
  const seen = Object.fromEntries(alerts.map((a) => [a.file, `${a.rule}@${a.line}`]));
  assert.deepEqual(seen, {
    'chatbot.md': 'Slipway.Chatbot@3',
    'placeholder.md': 'Slipway.Placeholder@3',
    'placeholder-two-words.md': 'Slipway.Placeholder@3',
    'recap.md': 'Slipway.Recap@3',
    'check-id.md': 'Slipway.CheckId@3',
    'decision-id.md': 'Slipway.DecisionId@3',
    'hedge.md': 'Slipway.Hedge@3',
    'verb.md': 'Slipway.Verb@3',
    'sentence.md': 'Slipway.Sentence@3',
  });
  assert.equal(alerts.length, 9, 'one alert per file, none more');
  assert.equal(status, 1, 'an error rule fails the folder');
});

test('the three error rules are errors and the five others are warnings', () => {
  const { alerts } = alertsIn(FIXTURE);
  const level = Object.fromEntries(alerts.map((a) => [a.rule.replace('Slipway.', ''), a.severity]));
  assert.deepEqual(level, { Chatbot: 'error', Placeholder: 'error', Recap: 'error', CheckId: 'warning', DecisionId: 'warning', Hedge: 'warning', Verb: 'warning', Sentence: 'warning' });
});

test('the controls raise nothing: a marker, a placeholder in a template, a check id and a <sha> in code, a fenced block, an HTML tag', () => {
  const quiet = ['control-marker.md', 'TEMPLATE.md', 'control-code.md', 'control-html-tag.md'];
  const { alerts } = alertsIn(FIXTURE);
  assert.deepEqual(alerts.filter((a) => quiet.includes(a.file)), []);
  for (const f of quiet) assert.ok(readFileSync(join(FIXTURE, f), 'utf8').length > 0, `${f} exists and is not empty`);
});

test('a sentence of 35 words trips the rule and one of 34 does not', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    const words = (n) => `${Array.from({ length: n }, () => 'word').join(' ')}.\n`;
    writeFileSync(join(dir, 'long.md'), words(35));
    writeFileSync(join(dir, 'short.md'), words(34));
    assert.deepEqual(alertsIn(dir).alerts.map((a) => `${a.file} ${a.rule}`), ['long.md Slipway.Sentence']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a PR body: a chatbot phrase fails and names the rule; a clean body passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    writeFileSync(join(dir, 'bad.md'), '## What\n\nCertainly! The check is added.\n');
    writeFileSync(join(dir, 'good.md'), '## What\n\nThe check is added. Quote the phrase `Certainly!` in a code span.\n');
    const bad = run(['--body', join(dir, 'bad.md')]);
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /Slipway\.Chatbot/);
    assert.equal(run(['--body', join(dir, 'good.md')]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('with no vale on the path the script exits 2 and names the install command', () => {
  const r = run(['--dir', FIXTURE], { ...process.env, PATH: dirname(process.execPath) });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /brew install vale/);
});

test('blank() keeps every line, and blanks front matter, fenced blocks and code spans', () => {
  const text = '---\nkey: <a: b>\n---\nText `<sha>` and ``a ` b`` end.\n\n```md\nI hope this helps\n```\n\n~~~\nTBD\n~~~\nAfter <date>.\n';
  const out = blank(text);
  assert.equal(out.split('\n').length, text.split('\n').length);
  assert.doesNotMatch(out, /key|sha|hope|TBD|a ` b/);
  assert.match(out, /After <date>\./, 'prose outside code is kept');
});

test('blank() cannot be turned off or tricked by markup GitHub shows as text', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    const put = (name, text) => writeFileSync(join(dir, name), text);
    put('comment-off.md', 'Open.\n\n<!-- vale off -->\nCertainly! Done.\n');
    put('comment-rule.md', 'Open.\n\n<!-- vale Slipway.Chatbot = NO -->\nCertainly! Done.\n');
    put('fence-info.md', 'Open.\n\n```x`\nCertainly! Done.\n');
    put('escaped.md', 'Open.\n\n\\`Certainly! Done.\\`\n');
    put('crlf.md', 'Open ` here.\r\n\r\nCertainly! Done.\r\n\r\nClose ` here.\r\n');
    put('lone-cr.md', 'Open.\r\rCertainly! Done.\n');
    put('wrapped.md', 'Open.\n\nWe hope this is clear. I hope\nthis helps a lot.\n');
    put('wrapped-hedge.md', 'Open.\n\nIt may\npossibly work.\n');
    put('heading-span.md', 'Open `a.\n## Certainly! Done.\nClose` here.\n');
    put('recap-spaces.md', 'Open.\n  \nIn summary, done.\n');
    const seen = Object.fromEntries(alertsIn(dir).alerts.map((a) => [a.file, `${a.rule}@${a.line}`]));
    assert.deepEqual(seen, {
      'comment-off.md': 'Slipway.Chatbot@4',
      'comment-rule.md': 'Slipway.Chatbot@4',
      'fence-info.md': 'Slipway.Chatbot@4',
      'escaped.md': 'Slipway.Chatbot@3',
      'crlf.md': 'Slipway.Chatbot@3',
      'lone-cr.md': 'Slipway.Chatbot@1',
      'recap-spaces.md': 'Slipway.Recap@3',
      'wrapped.md': 'Slipway.Chatbot@3',
      'wrapped-hedge.md': 'Slipway.Hedge@3',
      'heading-span.md': 'Slipway.Chatbot@2',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('both workflows install the same Vale, at a version and a sha256, never latest', () => {
  const pins = ['ci.yml', 'pr-body.yml'].map((f) => {
    const text = readFileSync(join(SRC, '.github', 'workflows', f), 'utf8');
    const version = /VALE_VERSION: (\d+\.\d+\.\d+)\b/.exec(text)?.[1];
    const sha = /VALE_SHA256: ([0-9a-f]{64})\b/.exec(text)?.[1];
    assert.ok(version && sha, `${f} pins VALE_VERSION and VALE_SHA256`);
    assert.doesNotMatch(text, /vale[^\n]*latest/i, `${f} never fetches latest`);
    return `${version} ${sha}`;
  });
  assert.equal(pins[0], pins[1]);
});
