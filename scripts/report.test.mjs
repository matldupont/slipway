#!/usr/bin/env node
// The shared escaper (ci/checks/lib/report.mjs): every check prints through report(), and status through the
// same escapeOutput, so project text reaches a CI log or a session's context with no control, bidi or
// separator character raw. A lone CR is tested here, not in a known-bad fixture: a shipped file never carries a
// CR byte (new-project.test.mjs). Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { codeSpan, escapeControl, escapeOutput } from '../ci/checks/lib/report.mjs';
import { strayLine } from '../ci/checks/lib/raw-output.mjs';
import { flat } from './lib/report-form.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = pathToFileURL(join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'ci', 'checks', 'lib', 'report.mjs')).href;
const STATUS = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'ci', 'status.mjs');
const u = (c) => `\\u${c.toString(16).padStart(4, '0')}`;

// Each range at both ends, the separators, and format characters (\p{Cf}) from each block they sit in.
const ESCAPED = [0x00, 0x08, 0x0b, 0x0d, 0x1b, 0x1f, 0x7f, 0x80, 0x85, 0x9f, 0x2028, 0x2029, 0x202a, 0x202e, 0x2066, 0x2069, 0x00ad, 0x061c, 0x180e, 0x200b, 0x200c, 0x200e, 0x200f, 0x2060, 0x2064, 0x206a, 0x206f, 0xfeff, 0xfff9, 0xfffb, 0x2800, 0x3164, 0xfe00, 0xfe0d, 0x115f, 0x1160, 0xffa0, 0x034f, 0x17b4, 0x17b5, 0x180b, 0x180f, 0x2065, 0xfff0, 0xfff8];
// Just outside each range, the three emoji characters left out on purpose, and ordinary text beyond ASCII.
const KEPT = [0x20, 0x7e, 0xa0, 0xe9, 0x2027, 0x202f, 0x27ff, 0x2801, 0xfe10, 0x200d, 0xfe0e, 0xfe0f, 0x1f600];
test('escapeOutput shows each control, bidi, format and separator character as \\uXXXX', () => {
  for (const c of ESCAPED) assert.equal(escapeOutput(`a${String.fromCharCode(c)}b`), `a${u(c)}b`, `U+${c.toString(16)}`);
});

test('a tag-character string and a zero-width space print escaped; tags and selectors above U+FFFF as surrogate pairs', () => {
  assert.equal(escapeOutput('ok\u{e0049}\u{e0047}\u{e007f}'), 'ok\\udb40\\udc49\\udb40\\udc47\\udb40\\udc7f');
  assert.equal(escapeOutput('a\u200bb'), 'a\\u200bb');
  assert.equal(escapeOutput('x\u{e0100}\u{e01ef}'), 'x\\udb40\\udd00\\udb40\\uddef');
  assert.equal(JSON.parse(`"${escapeOutput('ok\u{e0049}')}"`), 'ok\u{e0049}', 'reads back as the same text in a JSON string');
});

test('an emoji with a joiner or a presentation selector prints unchanged', () => {
  for (const e of ['👩\u200d💻', '❤\ufe0f', '☺\ufe0e', '👨\u200d👩\u200d👧']) assert.equal(escapeOutput(e), e);
});

test('a lone CR and a CRLF are both escaped: no line is rewritten from its start', () => {
  assert.equal(escapeOutput('RISK-1\r#risk/no-threshold'), 'RISK-1\\u000d#risk/no-threshold');
  assert.equal(escapeOutput('a\r\nb'), 'a\\u000d\nb');
});

test('escapeOutput keeps the newlines and tabs a report writes, and text outside the ranges', () => {
  assert.equal(escapeOutput('K1: a\n\tb'), 'K1: a\n\tb');
  for (const c of KEPT) assert.equal(escapeOutput(`a${String.fromCodePoint(c)}b`), `a${String.fromCodePoint(c)}b`, `U+${c.toString(16)}`);
  assert.equal(escapeControl('👩\u200d💻'), '👩\u200d💻');
});

test('escapeControl, for one quoted field, also escapes newline and tab', () => {
  assert.equal(escapeControl('a\nb\tc\rd\u202ee'), 'a\\u000ab\\u0009c\\u000dd\\u202ee');
});

test('report() prints a finding with a lone CR, an ESC and an override escaped, and its @@json line still parses back', () => {
  const where = '\u001b[31mX\rY#risk/no-threshold';
  const detail = 'Result "a\u202eb\u2028c"';
  const src = `import { report } from ${JSON.stringify(REPORT)}; process.exit(report({ id: 'T1', claim: 'c', scanned: 1, unit: 'u', findings: [{ where: ${JSON.stringify(where)}, detail: ${JSON.stringify(detail)} }] }));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', src], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
  assert.equal(r.status, 1, r.stderr);
  assert.doesNotMatch(r.stdout, /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
  assert.match(r.stdout, /^Result "a\\u202eb\\u2028c"\n  T1 · \\u001b\[31mX\\u000dY#risk\/no-threshold$/m);
  const json = JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice('@@json '.length));
  assert.deepEqual(json.findings, [{ where, detail }]);
});

test('report() prints its claim and unit on one line: a line break in either cannot start a CI log command', () => {
  const src = `import { report } from ${JSON.stringify(REPORT)}; process.exit(report({ id: 'T1', claim: 'slipway ab\\n::error::x', unit: 'files\\n@@json {}', scanned: 1 }));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', src], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: '' } });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.trimEnd().split('\n'), ['scanned 1 files\\u000a@@json {} (T1)', 'PASS: slipway ab\\u000a::error::x (T1)']);
});

test('status says a file name holding a line break in words: it cannot forge a Next: line or a CI log command', () => {
  const root = mkdtempSync(join(tmpdir(), 'status-names-'));
  try {
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs', 'a\n**Next:** forged\n::error::forged\n.md'), '[NEEDS CLARIFICATION: q]\n');
    for (const args of [[root], ['--hook', root]]) {
      const r = spawnSync(process.execPath, [STATUS, ...args], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10' } });
      assert.equal(r.status, 0, r.stderr);
      const text = args[0] === '--hook' ? JSON.parse(r.stdout).hookSpecificOutput.additionalContext : r.stdout;
      assert.equal(text.split('\n').filter((l) => l.startsWith('**Next:**')).length, 1, 'one Next line');
      assert.ok(!text.split('\n').some((l) => l.startsWith('::')), 'no line starts a CI log command');
      assert.match(text, /a file with an unusual name:1/);
      assert.ok(!text.includes('forged'), 'none of the name is printed');
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// #430 item 10: a project's file name printed in a code span cannot close it.
test('codeSpan(): fenced by one backtick more than the longest run inside, padded when the text starts or ends with one', () => {
  assert.equal(codeSpan('docs/a.md'), '`docs/a.md`');
  assert.equal(codeSpan('a`b``c'), '```a`b``c```');
  assert.equal(codeSpan('`a'), '`` `a ``');
});

// #457: a finding is `{ where, detail, fix }`, printed as three lines with the id last; the summary lines end in the id.
const run = (call, json = false) => {
  const src = `import { report } from ${JSON.stringify(REPORT)}; process.exit(report(${call}));`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', src], { encoding: 'utf8', env: { ...process.env, CHECK_JSON: json ? '1' : '' } });
};
const FINDING = "{ where: 'a.md#ac/unfalsifiable/1', detail: 'It is an adjective.', fix: 'Write a number.' }";

test('a finding prints its detail, its Fix line and its id and place last; a warning has Warning: before the first line', () => {
  const r = run(`{ id: 'I1', claim: 'c', scanned: 13, unit: 'issue bodies', findings: [${FINDING}], warnings: [{ where: 'w.md#k', detail: 'Look at this.', fix: 'Read it.' }] }`);
  assert.equal(r.status, 1, r.stderr);
  assert.deepEqual(r.stdout.trimEnd().split('\n'), [
    'scanned 13 issue bodies (I1)',
    'Warning: Look at this.', '  Fix: Read it.', '  I1 · w.md#k',
    'It is an adjective.', '  Fix: Write a number.', '  I1 · a.md#ac/unfalsifiable/1',
    'FAIL: 1 finding in 13 issue bodies (I1)',
  ]);
});

test('a finding with no fix prints its detail and its id line alone: a message still owed its rewrite', () => {
  const r = run(`{ id: 'I1', claim: 'c', scanned: 2, unit: 'issue bodies', findings: [{ where: 'a.md#k', detail: 'Old wording.' }, ${FINDING}] }`);
  assert.deepEqual(r.stdout.trimEnd().split('\n'), [
    'scanned 2 issue bodies (I1)',
    'Old wording.', '  I1 · a.md#k',
    'It is an adjective.', '  Fix: Write a number.', '  I1 · a.md#ac/unfalsifiable/1',
    'FAIL: 2 findings in 2 issue bodies (I1)',
  ]);
});

test('the four summary lines, each with the id last', () => {
  assert.deepEqual(run("{ id: 'I1', claim: 'every body has acceptance', scanned: 3, unit: 'issue bodies' }").stdout.trimEnd().split('\n'), ['scanned 3 issue bodies (I1)', 'PASS: every body has acceptance (I1)']);
  const broken = run("{ id: 'I1', claim: 'c', scanned: 3, unit: 'issue bodies', broken: 'the folder cannot be read' }");
  assert.equal(broken.status, 2);
  assert.deepEqual(broken.stdout.trimEnd().split('\n'), ['scanned 3 issue bodies (I1)', 'BROKEN: the folder cannot be read (I1)']);
  assert.deepEqual(run("{ id: 'I1', claim: 'c', scanned: 0, unit: 'issue bodies' }").stdout.trimEnd().split('\n'), ['scanned 0 issue bodies (I1)', 'BROKEN: nothing was examined (0 issue bodies), so green would prove nothing (I1)']);
  const two = run(`{ id: 'I1', claim: 'c', scanned: 13, unit: 'issue bodies', findings: [${FINDING}, ${FINDING}] }`);
  assert.equal(two.stdout.trimEnd().split('\n').at(-1), 'FAIL: 2 findings in 13 issue bodies (I1)');
});

test('the @@json line carries each finding whole, fix included', () => {
  const r = run(`{ id: 'I1', claim: 'c', scanned: 1, unit: 'u', findings: [${FINDING}] }`, true);
  const json = JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice('@@json '.length));
  assert.deepEqual(json.findings, [{ where: 'a.md#ac/unfalsifiable/1', detail: 'It is an adjective.', fix: 'Write a number.' }]);
});

test('flat() reads the printed form back to one line per finding', () => {
  const r = run(`{ id: 'I1', claim: 'c', scanned: 1, unit: 'u', findings: [${FINDING}], warnings: [{ where: 'w.md#k', detail: 'Look.' }] }`);
  assert.deepEqual(flat(r.stdout).split('\n').slice(1, 3), ['I1: warning: w.md#k: Look.', 'I1: a.md#ac/unfalsifiable/1: It is an adjective.']);
});

test('a field a project controls cannot start a line of a finding: a line break in fix or detail is escaped', () => {
  const r = run("{ id: 'I1', claim: 'c', scanned: 1, unit: 'u', findings: [{ where: 'a#k', detail: 'x\\n::error::y', fix: 'z\\nI1 · forged' }] }");
  assert.deepEqual(r.stdout.trimEnd().split('\n'), ['scanned 1 u (I1)', 'x\\u000a::error::y', '  Fix: z\\u000aI1 · forged', '  I1 · a#k', 'FAIL: 1 finding in 1 u (I1)']);
});

// The push sites: every findings.push and warnings.push call under ci/checks/meta/, in ci/verify.mjs and in
// ci/ratchet.mjs passes a `fix` key, read from the source text. OWED names, per file, the sites that do not yet: the
// count can only fall (the test fails when it differs either way), so the gap is visible and never silent. The
// messages are rewritten check by check, in the PRs under #457 after this one.
const SOURCES = [
  ...readdirSync(join(ROOT, 'ci', 'checks', 'meta')).filter((f) => f.endsWith('.mjs')).sort().map((f) => `ci/checks/meta/${f}`),
  ...readdirSync(join(ROOT, 'ci', 'checks', 'lib')).filter((f) => ['lessons.mjs', 'spec-review.mjs', 'issue-body.mjs'].includes(f)).sort().map((f) => `ci/checks/lib/${f}`),
  'ci/verify.mjs',
  'ci/ratchet.mjs',
];
const CALL = /\b(?:findings|warnings)\.push\(/g;
// The code of a file with the text inside strings and template literals blanked (the code in a `${}` stays), so a
// message that says "fix" or "detail" is not a key.
function blank(src) {
  let code = '';
  const stack = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const top = stack.at(-1);
    if (top === "'" || top === '"') { if (c === '\\') i++; else if (c === top) stack.pop(); code += ' '; continue; }
    if (top === '`') {
      if (c === '\\') i++;
      else if (c === '`') stack.pop();
      else if (c === '$' && src[i + 1] === '{') { stack.push('{'); i++; code += ' '; continue; }
      code += ' ';
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; code += '\n'; continue; }
    if (c === "'" || c === '"' || c === '`') { stack.push(c); code += ' '; continue; }
    if (c === '{') stack.push('{');
    else if (c === '}' && top === '{') stack.pop();
    code += c;
  }
  return code;
}
// The call from its open parenthesis to the matching close, in blanked code.
const callAt = (code, open) => {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')' && --depth === 0) return code.slice(open, i + 1);
  }
  return code.slice(open);
};
const KEY = (name) => new RegExp(`[{,]\\s*${name}\\s*[:,}]`, 'g');
// Per file: how many push calls there are, and how many messages are still owed their fix: a push call with no
// fix key, or a detail key with no fix key beside it where a message is built without a push.
const sites = () => SOURCES.map((file) => {
  const code = blank(readFileSync(join(ROOT, file), 'utf8'));
  const pushes = [...code.matchAll(CALL)].map((m) => callAt(code, m.index + m[0].length - 1));
  const unfixedPush = pushes.filter((t) => !KEY('fix').test(t)).length;
  const detailKeys = (code.match(KEY('detail')) ?? []).length;
  const fixKeys = (code.match(KEY('fix')) ?? []).length;
  return { file, total: pushes.length, owed: Math.max(unfixedPush, detailKeys - fixKeys) };
});
const OWED = {
  'ci/checks/lib/spec-review.mjs': 4,
  'ci/checks/meta/d1-drift.mjs': 4,
  'ci/checks/meta/dc1-decisions.mjs': 2,
  'ci/checks/meta/ds1-design-before-screens.mjs': 1,
  'ci/checks/meta/f1-feature-coverage.mjs': 5,
  'ci/checks/meta/f2-feature-fit.mjs': 4,
  'ci/checks/meta/fo1-fail-open.mjs': 7,
  'ci/checks/meta/i1-issue-shape.mjs': 13,
  'ci/checks/meta/id1-ids.mjs': 9,
  'ci/checks/meta/id2-open-prs.mjs': 2,
  'ci/checks/meta/k1-frame.mjs': 1,
  'ci/checks/meta/l1-lessons.mjs': 4,
  'ci/checks/meta/lk1-lockfile.mjs': 7,
  'ci/checks/meta/ms1-milestones.mjs': 12,
  'ci/checks/meta/n1-node-modules.mjs': 2,
  'ci/checks/meta/o1-ownership.mjs': 1,
  'ci/checks/meta/p1-pr-body.mjs': 18,
  'ci/checks/meta/pc1-positive-control.mjs': 18,
  'ci/checks/meta/pk1-packed.mjs': 2,
  'ci/checks/meta/r1-review-provenance.mjs': 13,
  'ci/checks/meta/s1-status.mjs': 16,
  'ci/checks/meta/sk1-skipped-tests.mjs': 3,
  'ci/checks/meta/v1-version-line.mjs': 2,
  'ci/checks/meta/w1-declared-vs-invoked.mjs': 5,
  'ci/ratchet.mjs': 2,
  'ci/verify.mjs': 3,
};

test('every findings.push and warnings.push passes a fix key, or is named as owed', () => {
  const got = Object.fromEntries(sites().filter((s) => s.owed).map((s) => [s.file, s.owed]));
  assert.deepEqual(got, OWED, 'the sites without a fix key are exactly the ones OWED names: add the key, or name the site');
  assert.ok(sites().reduce((n, s) => n + s.total, 0) > 100, 'the scan found the push sites');
});

// Over every finding every check emits on every known-bad fixture: `detail` and `fix` are each one sentence of at
// most 160 characters ending with a period, with no check, decision or lesson id; `fix` starts with a verb from the
// list. PC1 already runs each check on each case, so its run is the one read (scripts/lib/dump-report.mjs).
const VERBS = ['write', 'add', 'copy', 'remove', 'name', 'set', 'run', 'move', 'answer', 'record', 'rename', 'delete', 'keep', 'edit', 'list', 'file', 'say', 'cut', 'fill', 'put', 'read', 'give'];
const CHECK_IDS = readdirSync(join(ROOT, 'ci', 'checks', 'meta')).filter((f) => f.endsWith('.mjs') && !f.startsWith('pc1-')).map((f) => f.split('-')[0].toUpperCase());
const ID_IN_TEXT = new RegExp(`\\b(?:${CHECK_IDS.join('|')}|P?D-\\d+|P?L-\\d+)\\b`);
const sentenceProblem = (text) => {
  if (typeof text !== 'string' || !text) return 'is missing';
  if (text.length > 160) return `is ${text.length} characters`;
  if (!text.endsWith('.')) return 'does not end with a period';
  if (/[.!?]\s+\S/.test(text) || /\n/.test(text)) return 'is more than one sentence';
  const id = ID_IN_TEXT.exec(text);
  return id ? `holds the id ${id[0]}` : null;
};

test('every finding every check emits on its known-bad fixtures has a detail and a fix of the shape, or its check is owed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'report-dump-'));
  try {
    const dump = join(dir, 'dump.jsonl');
    const r = spawnSync(process.execPath, [join(ROOT, 'ci', 'checks', 'meta', 'pc1-positive-control.mjs')], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(join(ROOT, 'scripts', 'lib', 'dump-report.mjs')).href}`, REPORT_DUMP: dump },
    });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const reports = readFileSync(dump, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l.slice('@@json '.length))).filter((j) => j.id !== 'PC1');
    assert.ok(reports.length > 20, 'PC1 ran the known-bad cases');
    const owedChecks = new Set(Object.keys(OWED).map((f) => f.split('/').pop().split('-')[0].toUpperCase()));
    const bad = [];
    let shaped = 0;
    for (const j of reports) {
      for (const f of [...j.findings, ...j.warnings]) {
        if (f.fix === undefined && owedChecks.has(j.id)) continue;
        shaped++;
        const fix = sentenceProblem(f.fix);
        const detail = sentenceProblem(f.detail);
        if (detail) bad.push(`${j.id} ${f.where}: detail ${detail}`);
        if (fix) bad.push(`${j.id} ${f.where}: fix ${fix}`);
        else if (!VERBS.includes(f.fix.split(' ')[0].toLowerCase())) bad.push(`${j.id} ${f.where}: fix starts with "${f.fix.split(' ')[0]}", not a verb in the list`);
      }
    }
    assert.deepEqual(bad, []);
    if (!Object.keys(OWED).length) assert.ok(shaped > 20, 'the fixtures gave findings to check');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a detail that starts with a CI log command or an @@json line prints it escaped, and PC1 reads a raw one as a stray line', () => {
  for (const lead of ['::error::x', '##[error]x', '@@json {}']) {
    const r = run(`{ id: 'T1', claim: 'c', scanned: 1, unit: 'u', findings: [{ where: 'a#k', detail: ${JSON.stringify(lead + ' went wrong.')} }] }`);
    assert.ok(!r.stdout.split('\n').some((l) => l.startsWith(lead)), lead);
    assert.equal(strayLine(r.stdout, 'T1'), null, 'report() wrote every line');
  }
  assert.equal(strayLine('scanned 1 u (T1)\n::error::x\n  T1 · a#k\nFAIL: 1 finding in 1 u (T1)\n', 'T1'), '::error::x');
  assert.equal(strayLine('scanned 1 u (T1)\nforged line\nFAIL: 1 finding in 1 u (T1)\n', 'T1'), 'forged line');
  assert.equal(strayLine('scanned 1 u (T1)\n@@json {}\n@@json {}\n', 'T1'), '@@json {}');
});
