#!/usr/bin/env node
// The prose check (ci/prose.mjs, F-16 §8): each rule trips its own file once, the controls raise nothing, a missing
// Vale is BROKEN, and the two workflows pin the same Vale. Internal: the `prose` CI job runs it in slipway, never a
// project, and never `pnpm meta`, which installs nothing. With no `vale` on the path it exits 2 (BROKEN) at once.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { asSeen, blank } from '../ci/prose.mjs';

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
    'chatbot-escape.md': 'Slipway.Chatbot@3',
    'chatbot-reference.md': 'Slipway.Chatbot@3',
    'chatbot-space.md': 'Slipway.Chatbot@3',
    'chatbot-invisible.md': 'Slipway.Chatbot@3',
    'chatbot-apostrophe.md': 'Slipway.Chatbot@3',
    'chatbot-quote-wrap.md': 'Slipway.Chatbot@3',
    'chatbot-emphasis.md': 'Slipway.Chatbot@3',
    'recap-marker.md': 'Slipway.Recap@3',
    'recap-lone-cr.md': 'Slipway.Recap@3',
  });
  assert.equal(alerts.length, 18, 'one alert per file, none more');
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
    writeFileSync(join(dir, 'good.md'), '## What\n\nThe check is added. A format like `<sha>` sits in a code span.\n');
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

test('Chatbot and Recap read the file as plain text: no comment, entity, code span or line ending hides a phrase', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    const put = (name, text) => writeFileSync(join(dir, name), text);
    put('comment-off.md', 'Open.\n\n<!-- vale off -->\nCertainly! Done.\n');
    put('comment-rule.md', 'Open.\n\n<!-- vale Slipway.Chatbot = NO -->\nCertainly! Done.\n');
    put('comment-entity.md', 'Open.\n\n<!-- &#118;ale off -->\nCertainly! Done.\n');
    put('comment-bang.md', 'Open.\n\n<!-- vale off --!>\nCertainly! Done.\n');
    put('code-span.md', 'Open.\n\nThe phrase `Certainly! Done.` is quoted.\n');
    put('fence.md', 'Open.\n\n```\nCertainly! Done.\n```\n');
    put('crlf.md', 'Open ` here.\r\n\r\nCertainly! Done.\r\n\r\nClose ` here.\r\n');
    put('wrapped.md', 'Open.\n\nWe hope this is clear. I hope\nthis helps a lot.\n');
    put('wrapped-hedge.md', 'Open.\n\nIt may\npossibly work.\n');
    put('lone-cr.md', 'Open.\r\rCertainly! Done.\n');
    put('recap-spaces.md', 'Open.\n  \nIn summary, done.\n');
    put('recap-heading.md', 'Open.\n\n## Notes\nIn Summary, done.\n');
    put('recap-indent.md', 'Open.\n\n  Overall, done.\n');
    put('recap-fence.md', 'Open.\n\n```\nx\n```\nTo sum up, done.\n');
    const seen = Object.fromEntries(alertsIn(dir).alerts.map((a) => [a.file, `${a.rule}@${a.line}`]));
    assert.deepEqual(seen, {
      'comment-off.md': 'Slipway.Chatbot@4',
      'comment-rule.md': 'Slipway.Chatbot@4',
      'comment-entity.md': 'Slipway.Chatbot@4',
      'comment-bang.md': 'Slipway.Chatbot@4',
      'code-span.md': 'Slipway.Chatbot@3',
      'fence.md': 'Slipway.Chatbot@4',
      'crlf.md': 'Slipway.Chatbot@3',
      'wrapped.md': 'Slipway.Chatbot@3',
      'wrapped-hedge.md': 'Slipway.Hedge@3',
      'recap-spaces.md': 'Slipway.Recap@3',
      'recap-heading.md': 'Slipway.Recap@4',
      'recap-indent.md': 'Slipway.Recap@3',
      'recap-fence.md': 'Slipway.Recap@6',
      'lone-cr.md': 'Slipway.Chatbot@1',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('asSeen() keeps every line and makes each change the error rules need, one case per change', () => {
  const cp = (...c) => String.fromCodePoint(...c);
  const cases = [
    ['a backslash escape is dropped', 'Certainly\\! x \\\\ y \\a', 'Certainly! x \\ y \\a'],
    ['a decimal reference is decoded', 'I&#32;hope', 'I hope'],
    ['a hex reference is decoded', 'I&#x20;hope', 'I hope'],
    ['a named reference is decoded; an unknown or inherited name is kept', 'Of course&excl; &rsquo; &bogus; &constructor;', "Of course! ' &bogus; &constructor;"],
    ['a decoded line break is a space', 'a&#10;b&#13;c', 'a b c'],
    ['a number GitHub replaces is U+FFFD', 'a&#0;b&#xD800;c&#x110000;d', `a${cp(0xfffd)}b${cp(0xfffd)}c${cp(0xfffd)}d`],
    ['a Unicode space is a plain space', `As${cp(0xa0)}an${cp(0x2003)}AI${cp(0x3000)}x`, 'As an AI x'],
    ['a vertical tab, form feed, NEL and line or paragraph separator is a space', `a${cp(0xb)}b${cp(0xc)}c${cp(0x85)}d${cp(0x2028)}e${cp(0x2029)}f`, 'a b c d e f'],
    ['a character that prints as a blank is a space', `I${cp(0x3164)}hope${cp(0x2800)}this${cp(0x115f)}x${cp(0x1160)}y${cp(0xffa0)}z`, 'I hope this x y z'],
    ['a character that prints as nothing is taken out', `Let me${cp(0x200b)} kn${cp(0xad)}ow${cp(0x2060)} if`, 'Let me know if'],
    ['a curly apostrophe is a straight one', `I${cp(0x2019)}d ${cp(0x2018)}x${cp(0x2032)} ${cp(0x2bc)}y${cp(0xff07)}`, "I'd 'x' 'y'"],
    ['a quote mark before the first word is taken off', '> > I hope\n> this helps', 'I hope\nthis helps'],
    ['a list mark before the first word is taken off', '- Overall, x\n* y\n12. In summary\n3) z\n-x', 'Overall, x\ny\nIn summary\nz\n-x'],
    ['every emphasis mark is taken out', '**In summary** x\n_Overall,_ y\nI *hope* ~~this~~ helps', 'In summary x\nOverall, y\nI hope this helps'],
    ['spaces and tabs before the first word are taken off', '\tOverall, x\n      In summary', 'Overall, x\nIn summary'],
    ['a lone CR is a form feed, and a line starts after it', 'a\r> In summary\r\nb', 'a\fIn summary\nb'],
  ];
  // Every HTML5 name for a character the error rules act on (the WHATWG table) is decoded, never left as written.
  const named = [
    'AMP', 'ApplyFunction', 'CloseCurlyQuote', 'GT', 'InvisibleComma', 'InvisibleTimes', 'LT', 'MediumSpace',
    'NegativeMediumSpace', 'NegativeThickSpace', 'NegativeThinSpace', 'NegativeVeryThinSpace', 'NewLine', 'NoBreak',
    'NonBreakingSpace', 'OpenCurlyQuote', 'QUOT', 'Tab', 'ThickSpace', 'ThinSpace', 'VeryThinSpace', 'ZeroWidthSpace',
    'af', 'amp', 'apos', 'colon', 'comma', 'emsp13', 'emsp14', 'emsp', 'ensp', 'excl', 'gt', 'hairsp', 'ic', 'it',
    'lrm', 'lsquo', 'lt', 'nbsp', 'numsp', 'period', 'prime', 'puncsp', 'quest', 'quot', 'rlm', 'rsquo', 'rsquor',
    'semi', 'shy', 'thinsp', 'zwj', 'zwnj',
  ];
  for (const n of named) assert.notEqual(asSeen(`a&${n};b`), `a&${n};b`, `&${n}; is decoded`);
  for (const [what, input, want] of cases) {
    const out = asSeen(input);
    assert.equal(out, want, what);
    assert.equal(out.split('\n').length, input.replace(/\r\n/g, '\n').split('\n').length, `${what}: the line count is kept`);
  }
});

test('Recap reads a line start after a list, quote or emphasis mark or a tab, as GitHub shows it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    const put = (name, text) => writeFileSync(join(dir, name), text);
    put('list.md', 'Open.\n\n- In summary, done.\n');
    put('quote.md', 'Open.\n\n> Overall, done.\n');
    put('italic.md', 'Open.\n\n*To sum up*, done.\n');
    put('tab.md', 'Open.\n\n\tIn conclusion, done.\n');
    put('control.md', 'Open.\n\n- The summary is done. Overall, fine.\n');
    const seen = Object.fromEntries(alertsIn(dir).alerts.map((a) => [a.file, `${a.rule}@${a.line}`]));
    assert.deepEqual(seen, { 'list.md': 'Slipway.Recap@3', 'quote.md': 'Slipway.Recap@3', 'italic.md': 'Slipway.Recap@3', 'tab.md': 'Slipway.Recap@3' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the diff set reads .MD and .markdown docs, and a doc git reads as binary is BROKEN, named', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    const sh = (...args) => assert.equal(spawnSync('git', args, { cwd: dir, encoding: 'utf8' }).status, 0, `git ${args.join(' ')}`);
    const diffSetIn = () =>
      spawnSync(process.execPath, ['--input-type=module', '-e', `import { diffSet } from ${JSON.stringify(PROSE)}; console.log(JSON.stringify(diffSet('HEAD~1', process.cwd())));`], { cwd: dir, encoding: 'utf8' });
    sh('init', '-q', '-b', 'main');
    sh('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'base');
    mkdirSync(join(dir, 'docs'));
    copyFileSync(join(FIXTURE, 'diff-upper.MD'), join(dir, 'docs', 'upper.MD'));
    copyFileSync(join(FIXTURE, 'diff-long.markdown'), join(dir, 'docs', 'long.markdown'));
    mkdirSync(join(dir, 'docs', 'Reviews'));
    copyFileSync(join(FIXTURE, 'diff-upper.MD'), join(dir, 'docs', 'Reviews', 'case.md'));
    sh('add', '.');
    sh('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'docs');
    const listed = diffSetIn();
    assert.equal(listed.status, 0, listed.stdout + listed.stderr);
    assert.deepEqual(JSON.parse(listed.stdout).sort(), ['docs/Reviews/case.md', 'docs/long.markdown', 'docs/upper.MD'], 'a folder is matched as written: docs/Reviews/ is not docs/reviews/');

    copyFileSync(join(FIXTURE, 'diff-utf16.md.utf16'), join(dir, 'docs', 'wide.md'));
    sh('add', '.');
    sh('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'wide');
    const wide = diffSetIn();
    assert.equal(wide.status, 2, 'a binary doc is BROKEN, never passed');
    assert.match(wide.stdout, /docs\/wide\.md/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Placeholder reads a blanked copy: a format in a code span or a fence passes, one in prose fails, a directive changes nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prose-test-'));
  try {
    const put = (name, text) => writeFileSync(join(dir, name), text);
    put('span.md', 'Open.\n\nThe format is `<sha>` and `TBD`.\n');
    put('fence.md', 'Open.\n\n```\n<date> TBD\n```\n');
    put('prose.md', 'Open.\n\nWrite <date> here.\n');
    put('escaped-backslash.md', 'Open \\\\`a` <date> TBD `b` end.\n');
    put('ordered-two.md', 'Open `a\n2. x` <date> TBD `c` end.\n');
    put('off.md', 'Open.\n\n<!-- vale Slipway.Placeholder = NO -->\nWrite <date> here.\n');
    put('entity.md', 'Open.\n\n<!-- &#118;ale off -->\nWrite <date> here.\n');
    const seen = Object.fromEntries(alertsIn(dir).alerts.map((a) => [a.file, `${a.rule}@${a.line}`]));
    assert.deepEqual(seen, { 'prose.md': 'Slipway.Placeholder@3', 'escaped-backslash.md': 'Slipway.Placeholder@1', 'ordered-two.md': 'Slipway.Placeholder@2', 'off.md': 'Slipway.Placeholder@4', 'entity.md': 'Slipway.Placeholder@4' });
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
