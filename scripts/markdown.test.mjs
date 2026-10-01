#!/usr/bin/env node
// comments() and section() (ci/checks/lib/markdown.mjs): comments are removed before a section is read, and the
// removal never takes a heading with it. A span from a `<!--` to a `-->` beyond a heading may be a comment or two
// marks written as text (#189): its headings stay, so no section runs on into the next; the rest is not counted,
// so text that may be hidden never passes as shown; and `crossed` says it happened. The P1 fixtures
// gate-comment-mark.md, gate-swallowed-heading.md and gate-hidden-section.md hold the same shapes as pull
// request bodies. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import test from 'node:test';
import { comments, section } from '../ci/checks/lib/markdown.mjs';

const body = (...lines) => lines.join('\n');

test('an opener in inline code and a closer in a later section delete no heading, and the text between is not counted', () => {
  const md = body('## One', 'covers a `<!--` in inline code', 'one more', '', '## Two', 'two text', 'ends at `-->`.', 'shown', '', '## Three', 'three text');
  assert.equal(section(md, 'One', 2), 'covers a `');
  assert.equal(section(md, 'Two', 2), '`.\nshown');
  assert.equal(section(md, 'Three', 2), 'three text');
  assert.equal(comments(md).crossed, true);
});

test('a comment on one line and a comment across lines are removed, and nothing is crossed', () => {
  const md = body('## One', 'kept <!-- gone --> kept', '<!--', 'gone', '```', 'pnpm verify', '```', '-->', '', '## Two', '<!-- Closes #123 -->');
  assert.equal(section(md, 'One', 2), 'kept  kept');
  assert.equal(section(md, 'Two', 2), '');
  assert.equal(comments(md).crossed, false);
});

test('a comment that holds a section hides its text and keeps its headings', () => {
  // The whole section inside the comment; a deeper heading inside a shown section; evidence before a heading.
  const wrapped = body('## One', 'x', '<!--', '## Two', '- `ci/verify.mjs` — the same', '### Notes', 'more', '-->', 'after');
  assert.equal(section(wrapped, 'Two', 2), '### Notes\n\nafter');
  assert.equal(section(wrapped, 'One', 2), 'x');
  const deeper = body('## Two', '<!--', '### hidden', '- `ci/verify.mjs` — the same', '-->');
  assert.equal(section(deeper, 'Two', 2), '### hidden');
  const before = body('## Two', '<!-- `pnpm verify`', '# x', '-->', '## Three', 'e');
  assert.equal(section(before, 'Two', 2), '');
  for (const md of [wrapped, deeper, before]) assert.equal(comments(md).crossed, true);
});

test('a heading is kept at every level, at any indent, on the closer\'s line, with CRLF, and at the start of the body', () => {
  for (const heading of ['## Two', '  ## Two', '\t## Two', ' ## Two', '# Two', '###### Two']) {
    const md = body('## One', 'a <!-- b', heading, 'c --> d', '## Three', 'e');
    assert.match(section(md, 'Two', heading.trim().indexOf(' ')), /^d/, heading);
    assert.match(section(md, 'One', 2), /^a *$/m, heading);
  }
  assert.equal(section(body('## One', 'a <!-- b', '## Two -->', 'c'), 'Two', 2), 'c');
  assert.equal(section(body('## One', 'x', '## Two <!-- a', '## Three', 'b -->', 'c'), 'Two', 2), '');
  const crlf = ['## One', 'a <!-- b', '## Two', 'c --> d'].join('\r\n');
  assert.equal(section(crlf, 'One', 2), 'a');
  assert.equal(section(crlf, 'Two', 2), 'd');
  assert.equal(section(body('<!--', '## One', 'hidden', '-->', 'shown'), 'One', 2), 'shown');
  assert.equal(section(body('## One', '<!-- a -->', 'shown'), 'One', 2), 'shown');
  assert.equal(comments(body('##', '<!--', '##', '-->')).text, body('##', '', '##', ''));
});

test('a line that only looks like a heading does not stop a comment', () => {
  for (const line of ['#123 is the issue', '#tag', '####### seven', 'a # b']) {
    const md = body('## One', '<!--', line, '-->', 'shown');
    assert.equal(section(md, 'One', 2), 'shown', line);
    assert.equal(comments(md).crossed, false, line);
  }
});

test('after a crossed span, the next whole comment is still removed', () => {
  const md = body('## One', 'a `<!--` b', '', '## Two', 'c `-->` d <!-- gone --> e');
  assert.equal(section(md, 'One', 2), 'a `');
  assert.equal(section(md, 'Two', 2), '` d  e');
});
