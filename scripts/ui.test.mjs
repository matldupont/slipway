#!/usr/bin/env node
// scripts/lib/ui.mjs (F-08, #164): colour and link detection, control-character cleaning, and the zero-dependency
// rule. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ui } from './lib/ui.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pipe = { isTTY: false };
const term = { isTTY: true, columns: 80 };
const ESC = '\u001B';
const BEL = '\u0007';

test('a stream that is not a terminal gets no colour, no links and no width limit', () => {
  const u = ui(pipe, {});
  assert.equal(u.color, false);
  assert.equal(u.links, false);
  assert.equal(u.width, Infinity);
  assert.equal(u.tty, false);
  // a pipe's columns are ignored
  assert.equal(ui({ isTTY: false, columns: 80 }, {}).width, Infinity);
});

test('colour: a terminal, unless NO_COLOR or TERM=dumb; FORCE_COLOR wins', () => {
  assert.equal(ui(term, { NO_COLOR: '1' }).color, false);
  assert.equal(ui(term, { NO_COLOR: '1' }).width, 80);
  assert.equal(ui(term, { TERM: 'dumb' }).color, false);
  assert.equal(ui(term, {}).color, true);
  assert.equal(ui(term, { NO_COLOR: '1', FORCE_COLOR: '1' }).color, true);
  assert.equal(ui(pipe, { FORCE_COLOR: '1' }).color, true);
  assert.equal(ui(pipe, { FORCE_COLOR: '0' }).color, false);
});

test('links: a known terminal, FORCE_HYPERLINK overrides both ways', () => {
  assert.equal(ui(term, { FORCE_HYPERLINK: '1' }).links, true);
  assert.equal(ui(term, { TERM_PROGRAM: 'iTerm.app', FORCE_HYPERLINK: '0' }).links, false);
  assert.equal(ui(term, { TERM_PROGRAM: 'Apple_Terminal' }).links, false);
  assert.equal(ui(term, { VTE_VERSION: '6003' }).links, true);
  assert.equal(ui(term, { VTE_VERSION: '4999' }).links, false);
  assert.equal(ui(term, { TERM_PROGRAM: 'vscode' }).links, true);
  assert.equal(ui(pipe, { FORCE_HYPERLINK: '1' }).links, false);
});

test('clean keeps only newline and tab of the control characters', () => {
  const { clean } = ui(pipe, {});
  assert.equal(clean(`a${ESC}b${BEL}c\u007Fd\u009Be\nf\tg`), 'abcde\nf\tg');
  assert.equal(clean('\u0000\u0008\u000B\u001F\u0080\u009F'), '');
});

test('link refuses a url that is not https or file, or holds a control character', () => {
  const u = ui(term, { FORCE_HYPERLINK: '1' });
  assert.equal(u.link('x', 'javascript:alert(1)'), 'x');
  assert.equal(u.link('x', `https://a/${BEL}b`), 'x');
  assert.equal(u.link('x', 'https://a/\u009Bb'), 'x');
  assert.equal(
    u.link('x', 'https://github.com/o/r/commit/abc'),
    `${ESC}]8;;https://github.com/o/r/commit/abc${BEL}x${ESC}]8;;${BEL}`,
  );
  assert.ok(u.link('x', 'file:///tmp/a').includes(`${ESC}]8;;file:///tmp/a`));
  // the text is cleaned, so it cannot close the sequence early
  assert.equal(u.link(`a${BEL}b`, 'https://h/p'), `${ESC}]8;;https://h/p${BEL}ab${ESC}]8;;${BEL}`);
  // links off: the text alone
  assert.equal(ui(term, {}).link('x', 'https://h/p'), 'x');
});

test('style adds no escape when colour is off, and colours when on', () => {
  assert.equal(ui(term, { NO_COLOR: '1' }).style('red', 'x'), 'x');
  assert.equal(ui(pipe, {}).style('red', 'x'), 'x');
  assert.equal(ui(term, {}).style('red', 'x'), `${ESC}[31mx${ESC}[39m`);
  // control characters in styled text are cleaned
  assert.equal(ui(pipe, {}).style('red', `a${ESC}b`), 'ab');
});

test('section and line print the same glyphs on a pipe, with nothing from the text acting on the terminal', () => {
  const u = ui(pipe, {});
  assert.equal(u.section('◆', 'Needs you'), '◆  Needs you');
  assert.equal(u.section('◇', 'Changes'), '◇  Changes');
  assert.equal(u.line('a'), '│  a');
  assert.equal(u.line('a', { indent: 2 }), '│    a');
  assert.equal(u.line('a', { last: true }), '└  a');
  assert.equal(u.line(`a${ESC}[2Jb`), '│  a[2Jb');
  assert.equal(u.section('◇', `t${ESC}]0;x${BEL}`), '◇  t]0;x');
});

test('ui.mjs imports only node: modules, and package.json has no dependencies', () => {
  const src = readFileSync(join(SRC, 'scripts/lib/ui.mjs'), 'utf8');
  const specs = [...src.matchAll(/^import\s.*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  assert.ok(specs.length > 0);
  for (const s of specs) assert.ok(s.startsWith('node:'), `${s} is not a node: specifier`);
  assert.equal(JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8')).dependencies, undefined);
});
