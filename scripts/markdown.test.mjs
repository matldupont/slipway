#!/usr/bin/env node
// commentCrossesHeading() (ci/checks/lib/markdown.mjs): section() removes every span from a `<!--` to the next
// `-->`, headings included, so a `<!--` in inline code and a `-->` further down run one section on into the next
// (#189). The predicate says when a span holds a heading-shaped line; P1 then reads nothing else in that body.
// repeatedHeadings() (#265) names the `## ` headings written twice; P1's heading-repeated-* fixtures hold the shapes as bodies.
// The P1 fixtures gate-comment-mark.md, gate-swallowed-heading.md and gate-hidden-section.md hold the same
// shapes as pull request bodies. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import test from 'node:test';
import { commentCrossesHeading, repeatedHeadings, section } from '../ci/checks/lib/markdown.mjs';

const body = (...lines) => lines.join('\n');

test('an opener in inline code and a closer in a later section cross a heading', () => {
  const md = body('## One', 'covers a `<!--` in inline code', '', '## Two', 'ends at `-->`.', '', '## Three', 'three text');
  assert.equal(commentCrossesHeading(md), true);
  // What section() does with it, and why the predicate exists: One runs on into Two, and Two is gone.
  assert.equal(section(md, 'One', 2), 'covers a ``.');
  assert.equal(section(md, 'Two', 2), null);
});

test('a comment that holds a section, or a deeper heading, crosses a heading', () => {
  assert.equal(commentCrossesHeading(body('## One', 'x', '<!--', '## Two', '- `ci/verify.mjs` — the same', '-->')), true);
  assert.equal(commentCrossesHeading(body('## Two', '<!--', '### hidden', '- `ci/verify.mjs` — the same', '-->')), true);
  assert.equal(commentCrossesHeading(body('<!--', '## One', '-->', 'shown')), true);
});

test('a heading counts at every level, at any indent, alone, on the closer\'s line, and with CRLF', () => {
  for (const heading of ['## Two', '  ## Two', '\t## Two', ' ## Two', '# Two', '###### Two', '##', '## Two -->']) {
    assert.equal(commentCrossesHeading(body('## One', 'a <!-- b', heading, heading.endsWith('-->') ? 'd' : 'c --> d')), true, heading);
  }
  assert.equal(commentCrossesHeading(['## One', 'a <!-- b', '## Two', 'c --> d'].join('\r\n')), true);
});

test('a comment with no heading in it crosses nothing, and section() removes it', () => {
  const md = body('## One', 'kept <!-- gone --> kept', '<!--', 'gone', '```', 'pnpm verify', '```', '-->', '', '## Two <!-- a', 'b -->', '<!-- Closes #123 -->');
  assert.equal(commentCrossesHeading(md), false);
  assert.equal(section(md, 'One', 2), 'kept  kept');
  assert.equal(section(md, 'Two', 2), '');
  assert.equal(commentCrossesHeading(body('## One', 'a `<!--` with no closer', '## Two', 'b')), false);
  assert.equal(commentCrossesHeading(body('## One', '`-->` then <!-- a -->', '## Two', 'b')), false);
});

test('a line that only looks like a heading is not one', () => {
  for (const line of ['#123 is the issue', '#tag', '####### seven', 'a # b']) {
    assert.equal(commentCrossesHeading(body('## One', '<!--', line, '-->', 'shown')), false, line);
  }
  // The tail of the opener's line is not a line of its own.
  assert.equal(commentCrossesHeading(body('x <!-- ## not a heading', 'y -->')), false);
});

test('a repeated ## heading is found once, by text, ignoring case, spaces and closing hashes', () => {
  const md = body('## Cold review', 'a', '## cold  REVIEW  ', 'b', '  ## Cold review ##', 'c', '## Links', '## Verification', '## Verification');
  assert.deepEqual(repeatedHeadings(md).map((h) => [h.key, h.title, h.count]), [['cold review', 'Cold review', 3], ['verification', 'Verification', 2]]);
  assert.deepEqual(repeatedHeadings(md.replace(/\n/g, '\r\n')).map((h) => h.count), [3, 2]);
});

test('headings in a fence, a comment, an indented block, or at ### do not count', () => {
  const md = body('## One', '```', '## One', '```', '<!-- ## One -->', '    ## One', '\t## One', '### One', '### One', '##', '##', '##One', '##One');
  assert.deepEqual(repeatedHeadings(md), []);
  assert.deepEqual(repeatedHeadings(body('## One', '### Notes', 'a', '## Two', '### Notes')), []);
});

test('a leading --- block is shown by GitHub, so a heading in it counts', () => {
  assert.equal(repeatedHeadings(body('---', '## One', '---', '## One')).length, 1);
});

test('a comment opener with no closer hides no heading, and a long run of spaces is read in linear time', () => {
  assert.equal(repeatedHeadings(body('## One', 'x <!-- y', '## One', 'z')).length, 1);
  assert.equal(repeatedHeadings(body('## One', '<!-- closed -->', '## Two')).length, 0);
  const start = Date.now();
  repeatedHeadings(body('## a' + ' '.repeat(100000) + 'b', '## a' + '\t '.repeat(50000) + 'b', '## a' + '#'.repeat(100000) + 'b', '## a ' + '#'.repeat(100000) + 'b'));
  assert.ok(Date.now() - start < 1000);
});
