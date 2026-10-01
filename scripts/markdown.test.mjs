#!/usr/bin/env node
// section() (ci/checks/lib/markdown.mjs): comments are removed before a section is read, and the removal never
// takes a heading with it. A `<!--` written in inline code and a `-->` further down are text, not a comment, once
// a heading stands between them (#189): a deleted heading runs one section on into the next. The P1 fixtures
// gate-swallowed-heading.md and gate-comment-mark-good.md hold the same shape as a pull request body.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import test from 'node:test';
import { section } from '../ci/checks/lib/markdown.mjs';

const body = (...lines) => lines.join('\n');

test('an opener in inline code and a closer in a later section delete no heading', () => {
  const md = body('## One', 'covers a `<!--` in inline code', '', '## Two', 'ends at `-->`', 'two text', '', '## Three', 'three text');
  assert.equal(section(md, 'One', 2), 'covers a `<!--` in inline code');
  assert.equal(section(md, 'Two', 2), 'ends at `-->`\ntwo text');
  assert.equal(section(md, 'Three', 2), 'three text');
});

test('a comment on one line and a comment across lines are still removed', () => {
  const md = body('## One', 'kept <!-- gone --> kept', '<!--', 'gone', '```', 'pnpm verify', '```', '-->', '', '## Two', '<!-- Closes #123 -->');
  assert.equal(section(md, 'One', 2), 'kept  kept');
  assert.equal(section(md, 'Two', 2), '');
});

test('a comment that would cross a heading is left as text, and the heading stays', () => {
  // Every level, and indented as section() finds a heading: by its trimmed line.
  for (const heading of ['## Two', '  ## Two', '\t## Two', '# Two', '###### Two']) {
    const md = body('## One', 'a <!-- b', heading, 'c --> d', '## Three', 'e');
    assert.match(section(md, 'Two', heading.trim().indexOf(' ')), /^c --> d/, heading);
    assert.match(section(md, 'One', 2), /^a <!-- b/, heading);
  }
  const crlf = ['## One', 'a <!-- b', '## Two', 'c --> d'].join('\r\n');
  assert.equal(section(crlf, 'One', 2), 'a <!-- b');
  assert.equal(section(crlf, 'Two', 2), 'c --> d');
});

test('after an opener a heading stops, the next whole comment is still removed', () => {
  const md = body('## One', 'a `<!--` b', '', '## Two', 'c <!-- gone --> d');
  assert.equal(section(md, 'One', 2), 'a `<!--` b');
  assert.equal(section(md, 'Two', 2), 'c  d');
});
