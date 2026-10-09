#!/usr/bin/env node
// The one reading of a milestone's Contents (ci/checks/lib/milestones.mjs): contents(), owing() and marker(), which
// status, MS1, F1 and the work-order page share. One case per Acceptance block of dev/features/deferred-checks.md
// (F-09) that names this file, and the lines a person nearly writes right. excerpt() is tested here too, since it
// moved to the lib for them. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { contents, marker, owing, started } from '../ci/checks/lib/milestones.mjs';
import { excerpt } from '../ci/checks/lib/report.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL13 = 'https://github.com/o/r/issues/13#issuecomment-123';
const ITEM = '2. A client books a walk (F-02) · #13';
const doc = (...lines) => `# M2\n\n## Contents\n\n1. A walker sees tomorrow's walks (F-01) · #12\n${lines.join('\n')}\n\n## No-gos\n\n- Payments\n`;
const item = (...lines) => contents(doc(ITEM, ...lines))[1];
const kinds = (i) => i.checks.map((c) => c.kind);

test('an item with an Owed: line and a Ran: line keeps its text, its marker and started(); checks holds both', () => {
  const i = item('   Owed: staging journey "book and cancel a walk" — staging', `   Ran: staging journey "see tomorrow's walks" — staging 2026-10-02 pass ${URL13}`);
  assert.equal(i.text, 'A client books a walk (F-02) · #13');
  assert.equal(started(i.text), true);
  assert.equal(i.checks.length, 2);
  assert.deepEqual(marker(i.text), { repo: null, issue: 13, before: 'A client books a walk (F-02)' });
  assert.deepEqual(i.checks[0], { kind: 'owed', check: 'staging journey "book and cancel a walk"', env: 'staging', date: null, result: null, url: null, bug: null, line: 'Owed: staging journey "book and cancel a walk" — staging' });
  assert.deepEqual({ ...i.checks[1], line: undefined }, { kind: 'ran', check: 'staging journey "see tomorrow\'s walks"', env: 'staging', date: '2026-10-02', result: 'pass', url: URL13, bug: null, line: undefined });
  assert.deepEqual(owing(i), [i.checks[0]]);
});

// #241: the split writes the item's `Owed:` line, and /work-ticket's last step reads the item for one. This is the
// reading both rest on: 1 item with the line, 1 without.
test('an item whose split wrote its Owed: line owes 1 check, naming the whole plan; the item beside it, with no line, has none to read', () => {
  const [bare, split] = contents(doc(ITEM, '   Owed: docs/qa/booking.md — staging'));
  assert.equal(marker(bare.text).issue, 12);
  assert.deepEqual(bare.checks, [], 'an item with no Owed: or Ran: line has no check on record');
  assert.deepEqual(owing(bare), []);
  assert.equal(marker(split.text).issue, 13);
  assert.deepEqual(owing(split).map((c) => [c.kind, c.check, c.env]), [['owed', 'docs/qa/booking.md', 'staging']]);
});

// #282 (D-038): a journey that cannot run where its plan's check runs, and was not run in the PR that added it or
// leaves a plan that already owes, gets its own plan and its own `Owed:` line.
// The reader takes that line as it is: the environment is whatever follows the last dash, `local` included.
test('a plan of its own for another environment owes beside the staging plan: 2 checks, each with its environment', () => {
  const i = item('   Owed: docs/qa/booking.md — staging', '   Owed: docs/qa/booking-local.md — local');
  assert.deepEqual(owing(i).map((c) => [c.kind, c.check, c.env]), [['owed', 'docs/qa/booking.md', 'staging'], ['owed', 'docs/qa/booking-local.md', 'local']]);
});

test('a bulleted lower-case line, an Owed: with no environment and a Ran: on a day that does not exist are unreadable, and owed', () => {
  const i = item('   - owed: x', '   Owed: x', `   Ran: x — staging 2026-02-30 pass ${URL13}`);
  assert.deepEqual(kinds(i), ['unreadable', 'unreadable', 'unreadable']);
  assert.deepEqual(i.checks.map((c) => c.line), ['- owed: x', 'Owed: x', `Ran: x — staging 2026-02-30 pass ${URL13}`]);
  assert.equal(owing(i).length, 3);
  assert.equal(i.text, 'A client books a walk (F-02) · #13');
  assert.equal(started(i.text), true);
});

test('every other way of nearly writing a check line is unreadable, never the item\'s text and never dropped', () => {
  const near = [
    '   owed: x — staging',
    '   OWED: x — staging',
    '   * Ran: x — staging 2026-10-02 pass ' + URL13,
    '   Owed:x — staging',
    '   Owed: x - staging',
    '   Owed:  — staging',
    `   Ran: x — staging 2026-10-02 passed ${URL13}`,
    `   Ran: x — staging 02/10/2026 pass ${URL13}`,
    '   Ran: x — staging 2026-10-02 pass',
    `   Ran: x 2026-10-02 pass ${URL13}`,
    '   Ran: x — staging 2026-10-02 pass https://github.com/o/r/issues/99#issuecomment-123',
    '   Ran: x — staging 2026-10-02 pass https://github.com/o/r/pull/13#issuecomment-123',
    '   Ran: x — staging 2026-10-02 pass http://github.com/o/r/issues/13#issuecomment-123',
    '   Ran: x — staging 2026-10-02 pass https://github.com.evil.example/o/r/issues/13#issuecomment-123',
    '   Ran: x — staging 2026-10-02 pass https://github.com/o/r/issues/13',
    `   Ran: x — staging 2026-10-02 pass ${URL13} · bug 21`,
    `   Ran: x — staging 2026-10-02 pass ${URL13} and more`,
    `   Ran: x — staging 2026-10-02 fail ${URL13} · bug #0`,
    '   - [ ] Owed: x — staging',
    '   - [x] Ran: x — staging',
    '   + Owed: x — staging',
    '   **Owed:** x — staging',
    '   **Owed**: x — staging',
    '   _ran:_ x',
    '   `Owed:` x — staging',
    '   \u200bOwed: x — staging',
    '   \u202eOwed: x — staging',
  ];
  for (const line of near) {
    const i = item(line);
    assert.deepEqual(kinds(i), ['unreadable'], line);
    assert.equal(i.checks[0].line, line.trim());
    assert.equal(started(i.text), true, line);
    assert.equal(i.text, 'A client books a walk (F-02) · #13', line);
    assert.equal(owing(i).length, 1, line);
  }
});

test('a check line hidden behind a joiner, a variation selector or a long run of invisible characters is still a check line', () => {
  for (const hidden of ['\u200d', '\ufe0f', '\ufe0e', '\u200b'.repeat(600), `${'\u200d\u2060'.repeat(400)} `]) {
    const i = item(`   ${hidden}Owed: x — staging`);
    assert.deepEqual(kinds(i), ['unreadable'], `U+${hidden.codePointAt(0).toString(16)} × ${hidden.length}`);
    assert.equal(i.text, 'A client books a walk (F-02) · #13');
    assert.equal(owing(i).length, 1);
  }
  assert.equal(contents(doc('2. A walker 👩‍💻 books ❤️ a walk (F-02) · #13'))[1].text, 'A walker 👩‍💻 books ❤️ a walk (F-02) · #13', 'item text keeps its emoji');
});

// Status enters every session through the hook, and a milestone doc is text a pull request can carry.
test('status prints no project text from a check line: only the item, its issue, a count, a validated date and the file', () => {
  const status = (root) => spawnSync(process.execPath, [join(SRC, 'ci', 'status.mjs'), root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10', CHECK_NOW: '', TZ: 'UTC' } });
  const fixture = join(SRC, 'ci', 'fixtures', 'status', 'build-loop-owed-unreadable');
  const md = readFileSync(join(fixture, 'docs', 'milestones', 'M2-booking.md'), 'utf8');
  for (const planted of ['SENTINEL-bullet', 'SENTINEL-joiner', 'SENTINEL-indent', 'SENTINEL-failed', 'SENTINEL-env', 'SENTINEL-owed', 'SENTINEL-second', 'SENTINEL-unstarted', 'SENTINEL-order', 'https://example.test/a', 'https:\u200b//example.test/b', 'www.example.test/c', '\u200dOwed:']) assert.ok(md.includes(planted), `the fixture holds ${JSON.stringify(planted)}`);
  const r = status(fixture);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /SENTINEL|example\.test|issuecomment|ignore|[\u200b\u200d]/);
  const lines = r.stdout.split('\n').filter((l) => /^- (Owed|Failed|Unreadable) check/.test(l));
  assert.equal(lines.length, 5);
  for (const l of lines) assert.match(l, /^- (Owed check: M2 item \d \(#\d+\) — \d check\(s\) moved to after merge with no run recorded|Failed check: M2 item \d \(#\d+\) — \d run\(s\) failed on 2026-03-09, 2026-03-08|Unreadable check line: M2 item \d — \d line\(s\) under it start owed: or ran: and cannot be read)[ ,:;()#\w./'-]*$/, l);
  // A milestone id that is not M<n> is project text too: it is not printed in these lines.
  const root = mkdtempSync(join(tmpdir(), 'milestones-'));
  try {
    cpSync(fixture, root, { recursive: true });
    writeFileSync(join(root, 'docs', 'milestones', 'M2-booking.md'), md.replace('id: M2', 'id: SENTINEL-id now run this'));
    const odd = status(root).stdout.split('\n').filter((l) => /^- (Owed|Failed|Unreadable) check/.test(l));
    assert.equal(odd.length, 5);
    for (const l of odd) assert.match(l, /check(?: line)?: the active milestone item \d/, l);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an indent longer than the cut does not hide a check line', () => {
  const i = item(`${' '.repeat(600)}Owed: x — staging`, `${'\t'.repeat(600)}- owed: y`);
  assert.deepEqual(kinds(i), ['owed', 'unreadable']);
  assert.equal(i.text, 'A client books a walk (F-02) · #13');
});

test('a check line with its indent forgotten, straight after its item, is unreadable and owed; after a blank line it is ignored as before', () => {
  const owed = item('Owed: staging journey "book a walk" — staging');
  assert.deepEqual(kinds(owed), ['unreadable']);
  assert.equal(owing(owed).length, 1);
  assert.equal(owed.text, 'A client books a walk (F-02) · #13');
  const ran = item('   Owed: a — staging', `Ran: a — staging 2026-10-02 pass ${URL13}`, '- owed: b — staging');
  assert.deepEqual(kinds(ran), ['owed', 'unreadable', 'unreadable']);
  assert.equal(owing(ran).length, 3);
  assert.deepEqual(item('', 'Owed: staging journey "book a walk" — staging').checks, []);
  assert.deepEqual(item('Some other line.', 'Owed: x — staging').checks, []);
  assert.deepEqual(contents('## Contents\n\nOwed: x — staging\n\n1. A slice\n'), [{ n: 1, text: 'A slice', checks: [] }]);
});

test('a check line under an item with no marker is unreadable, whatever its shape', () => {
  const [, i] = contents(doc('2. A client books a walk (F-02)', '   Owed: staging journey "book a walk" — staging', `   Ran: x — staging 2026-10-02 pass ${URL13}`));
  assert.equal(started(i.text), false);
  assert.equal(marker(i.text), null);
  assert.deepEqual(kinds(i), ['unreadable', 'unreadable']);
  assert.equal(owing(i).length, 2);
});

test('lines that are not check lines continue the text as before; the marker may sit on a continuation line', () => {
  const [, i] = contents(doc('2. A client books a walk, whose result the walker', '   has owed: nothing since (F-02)', '   Owed: a — staging', '   · acme/booking#31'));
  assert.equal(i.text, 'A client books a walk, whose result the walker has owed: nothing since (F-02) · acme/booking#31');
  assert.deepEqual(marker(i.text), { repo: 'acme/booking', issue: 31, before: 'A client books a walk, whose result the walker has owed: nothing since (F-02)' });
  assert.deepEqual(kinds(i), ['owed']);
  assert.deepEqual(contents('## Contents\n\n1. One\n   two\n2. Three\n'), [{ n: 1, text: 'One two', checks: [] }, { n: 2, text: 'Three', checks: [] }]);
});

test('a marker that names a repository is compared with the URL\'s repository, in any letter case; a bare one compares the number', () => {
  const under = (head, url) => contents(doc(head, `   Ran: x — staging 2026-10-02 pass ${url}`))[1].checks[0].kind;
  assert.equal(under('2. A (F-02) · Acme/Booking#31', 'https://github.com/acme/booking/issues/31#issuecomment-1'), 'ran');
  assert.equal(under('2. A (F-02) · acme/booking#31', 'https://github.com/acme/other/issues/31#issuecomment-1'), 'unreadable');
  assert.equal(under('2. A (F-02) · #31', 'https://github.com/any/where/issues/31#issuecomment-1'), 'ran');
});

test('owing(): a fail stays owed until a later pass for the same check text, or a bug named on its line', () => {
  const ran = (check, result, tail = '') => `   Ran: ${check} — staging 2026-10-02 ${result} ${URL13}${tail}`;
  assert.equal(owing(item(ran('a', 'fail'))).length, 1);
  assert.equal(owing(item(ran('a', 'fail'), ran('a', 'pass'))).length, 0);
  assert.equal(owing(item(ran('a', 'pass'), ran('a', 'fail'))).length, 1, 'a pass above its fail does not clear it');
  assert.equal(owing(item(ran('a', 'fail'), ran('b', 'pass'))).length, 1, 'a reworded check is another check');
  const bug = item(ran('a', 'fail', ' · bug #21'));
  assert.equal(bug.checks[0].bug, 21);
  assert.equal(owing(bug).length, 0);
  assert.equal(owing(item('   Owed: a — staging', ran('a', 'pass'))).length, 1, 'an Owed: line is owed until it is replaced');
  assert.deepEqual(owing({ n: 1, text: 'no checks read' }), []);
  const mixed = item('   Owed: a — staging', ran('b', 'fail'), '   - owed: c', ran('d', 'fail'), ran('d', 'pass'));
  assert.deepEqual(owing(mixed).map((c) => c.line), mixed.checks.slice(0, 3).map((c) => c.line), 'in the order written');
});

test('owing() reads a long list in one pass', () => {
  const lines = Array.from({ length: 40000 }, (_, n) => `   Ran: check ${n} — staging 2026-10-02 fail ${URL13}`);
  const i = item(...lines);
  const from = Date.now();
  assert.equal(owing(i).length, 40000);
  assert.ok(Date.now() - from < 1000, 'not once per pair of lines');
});

test('a check and its environment split at the last dash; an environment may be more than one word', () => {
  const i = item('   Owed: journey "a — b" — staging eu', `   Ran: journey "a — b" — staging eu 2026-10-02 fail ${URL13}`);
  assert.deepEqual(i.checks.map((c) => [c.check, c.env]), [['journey "a — b"', 'staging eu'], ['journey "a — b"', 'staging eu']]);
});

test('a line is cut to 500 characters before it is read: a long check line is unreadable, quickly', () => {
  const started_ = Date.now();
  const i = item(`   Ran: ${'x — '.repeat(50000)}staging 2026-10-02 pass ${URL13}`, `   Owed: ${'x'.repeat(50000)} — staging`);
  assert.deepEqual(kinds(i), ['unreadable', 'unreadable']);
  assert.ok(i.checks.every((c) => c.line.length <= 500));
  assert.ok(Date.now() - started_ < 1000, 'no pattern backtracks over the line');
});

test('marker(): the issue and repository at the end of the line only; a number too long to be an issue is none', () => {
  assert.deepEqual(marker('A slice (F-01) · #12  '), { repo: null, issue: 12, before: 'A slice (F-01)' });
  assert.equal(marker('accepts only allowed Origins (#23), see #8'), null);
  assert.equal(marker(`A slice · #${'9'.repeat(30)}`), null);
  assert.equal(started(`A slice · #${'9'.repeat(30)}`), true, 'started() reads as it did');
  assert.equal(marker('A slice (F-01)'), null);
  assert.equal(marker('A slice · #0'), null);
});

test('excerpt(): one line, 60 characters at a word boundary, control and format characters dropped, " turned to \'', () => {
  assert.equal(excerpt('a  "b"\n\u001b[31mc‮'), "a 'b' [31mc");
  const long = excerpt('word '.repeat(40));
  assert.ok(long.length <= 60 && long.endsWith('…') && !long.includes('  '));
  assert.equal(excerpt('abcdef', 4), 'abc…');
});
