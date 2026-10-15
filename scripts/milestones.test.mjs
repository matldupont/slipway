#!/usr/bin/env node
// The one reading of a milestone's Contents (ci/checks/lib/milestones.mjs): contents(), owing() and marker(), which
// status, MS1, F1 and the work-order page share. One case per Acceptance block of dev/features/deferred-checks.md
// (F-09) that names this file, and the lines a person nearly writes right. excerpt() is tested here too, since it
// moved to the lib for them. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { compareMilestones, contents, marker, milestoneId, milestoneKey, owing, readMilestoneModel, readMilestones, started } from '../ci/checks/lib/milestones.mjs';
import { readDeadlines } from '../ci/checks/lib/risks.mjs';
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

// #476: a milestone inserted between two others takes M<n>.<k>, and every reader of an id takes it as it takes M2. Each
// case below has an M1.1 and an M10 after M2: file names sort M10 before M2, and a reader of `M\d+` misses M1.1.
const inTree = (files, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
  try {
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const ms = (id, status, appetite, title = 'x') => `---\nid: ${id}\nstatus: ${status}\nkind: bet\n${appetite ? `appetite: ${appetite}\n` : ''}---\n\n# ${id} — ${title}\n`;
const run = (script, root, env = {}) => spawnSync(process.execPath, [join(SRC, script), root], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-10', CHECK_NOW: '', TZ: 'UTC', ...env } });
const json = (r) => JSON.parse(r.stdout.split('\n').find((l) => l.startsWith('@@json ')).slice(7));

test('an id is M<n> or M<n>.<k>, read as numbers and compared by number, then sub-number', () => {
  assert.deepEqual(['M1', 'M1.1', 'm02', 'M01.10', 'M1.0'].map(milestoneKey), [[1, -1], [1, 1], [2, -1], [1, 10], [1, 0]]);
  assert.deepEqual(['M1.1', 'm02', 'M01.10'].map(milestoneId), ['M1.1', 'M2', 'M1.10']);
  for (const id of ['M1.1.1', 'M1b', 'M', 'M1.', '1.1', 'M 1', 'Beta', '', null, 2]) assert.equal(milestoneKey(id), null, String(id));
  assert.deepEqual(['M10', 'M2', 'M1.10', 'M1.2', 'M1', 'M1.1'].sort(compareMilestones), ['M1', 'M1.1', 'M1.2', 'M1.10', 'M2', 'M10']);
  assert.ok(Number.isNaN(compareMilestones('M1', 'Beta')), 'an id of another shape compares as nothing, so <, >= and <= are false');
});

test('the milestone reader lists M1, M1.1, M2, M10 by id, not by file name; an id of another shape comes last', () => {
  const files = {
    'docs/milestones/M10-later.md': ms('M10', 'shaping'),
    'docs/milestones/M2-next.md': ms('M2', 'shaping'),
    'docs/milestones/A-odd.md': ms('Beta', 'shaping'),
    'docs/milestones/M1.1-inserted.md': ms('M1.1', 'shaping', null, 'Inserted'),
    'docs/milestones/M1-first.md': ms('M1', 'closed'),
  };
  inTree(files, (root) => {
    assert.deepEqual(readMilestones(root).milestones.map((m) => m.fm.id), ['M1', 'M1.1', 'M2', 'M10', 'Beta']);
    const model = readMilestoneModel(root, '2026-03-10');
    assert.deepEqual(model.map((m) => [m.id, m.title]), [['M1', 'x'], ['M1.1', 'Inserted'], ['M2', 'x'], ['M10', 'x'], ['Beta', null]], 'the title is read from `# M1.1 — …` as from `# M2 — …`');
  });
});

test('status: an active M1.1 is named in Next and its owed checks; the table lists M1, M1.1, M2, M10', () => {
  const fixture = join(SRC, 'ci', 'fixtures', 'status', 'build-loop-next-item');
  const booking = readFileSync(join(fixture, 'docs', 'milestones', 'M2-booking.md'), 'utf8');
  const root = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
  try {
    cpSync(fixture, root, { recursive: true });
    rmSync(join(root, 'docs', 'milestones', 'M2-booking.md'));
    const dir = join(root, 'docs', 'milestones');
    writeFileSync(join(dir, 'M1.1-booking.md'), booking.replace('id: M2', 'id: M1.1').replace("walks (F-01) · #12", "walks (F-01) · #12\n   Owed: the booking journey — staging"));
    writeFileSync(join(dir, 'M2-later.md'), ms('M2', 'shaping'));
    writeFileSync(join(dir, 'M10-last.md'), ms('M10', 'shaping'));
    const r = run('ci/status.mjs', root);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Start it in a fresh session with \/log-feature M1\.1#2\./);
    assert.match(r.stdout, /^- Owed check: M1\.1 item 1 \(#12\) — 1 check\(s\)/m);
    const table = r.stdout.split('\n').filter((l) => /^\| M/.test(l)).map((l) => l.split('|')[1].trim());
    assert.deepEqual(table, ['M1', 'M1.1', 'M2', 'M10']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a risk "before M1.1" cell names M1.1, and K1 holds it due once a later milestone is underway', () => {
  const prd = (cell) => `| ID | Risk | Test | Resolves by |\n|---|---|---|---|\n| RISK-1 | r | t | ${cell} |\n`;
  for (const [cell, id] of [['before M1.1', 'M1.1'], ['before m1.1 starts (lead time)', 'M1.1'], ['before M10', 'M10'], ['before M1.1.1', null], ['before M1.', null]]) {
    assert.equal(readDeadlines(prd(cell)).get('RISK-1').before, id, cell);
  }
  const fixture = join(SRC, 'ci', 'fixtures', 'known-bad', 'k1', 'overdue');
  const root = mkdtempSync(join(tmpdir(), 'milestone-ids-'));
  try {
    cpSync(fixture, root, { recursive: true });
    // M2 (killed) becomes M1.1, and the deadlines before M2 become before M1.1: M3 is active, so they are due.
    const m2 = join(root, 'docs', 'milestones', 'M2.md');
    writeFileSync(m2, readFileSync(m2, 'utf8').replace('id: M2', 'id: M1.1'));
    const p = join(root, 'docs', 'PRD.md');
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('before M2', 'before M1.1'));
    const due = json(run('ci/checks/meta/k1-frame.mjs', root, { CHECK_JSON: '1' })).findings.map((f) => f.where);
    assert.deepEqual(due.filter((w) => /overdue/.test(w)), ['RISK-1#risk/overdue', 'RISK-4#risk/overdue', 'RISK-8#risk/overdue']);
    // M10 is after M2 and M4: with M2 killed and M10 the active one, the deadlines before M2 and M4 are due.
    writeFileSync(m2, readFileSync(join(fixture, 'docs', 'milestones', 'M2.md'), 'utf8'));
    writeFileSync(p, readFileSync(join(fixture, 'docs', 'PRD.md'), 'utf8'));
    const m3 = join(root, 'docs', 'milestones', 'M3.md');
    writeFileSync(m3, readFileSync(m3, 'utf8').replace('id: M3', 'id: M10'));
    const after = json(run('ci/checks/meta/k1-frame.mjs', root, { CHECK_JSON: '1' })).findings.map((f) => f.where);
    assert.deepEqual(after.filter((w) => /overdue/.test(w)), ['RISK-1#risk/overdue', 'RISK-3#risk/overdue', 'RISK-4#risk/overdue', 'RISK-8#risk/overdue']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('MS1 warns once, naming both, when two neighbours in id order start the other way round; it stays green', () => {
  const ms1 = (files) => inTree(files, (root) => {
    const r = run('ci/checks/meta/ms1-milestones.mjs', root, { CHECK_JSON: '1' });
    return { exit: r.status, warnings: json(r).warnings.filter((w) => /order/.test(w.where)), out: r.stdout };
  });
  const out = ms1({
    'docs/milestones/M1-a.md': ms('M1', 'shaping', '2026-03-01..2026-03-14'),
    'docs/milestones/M1.1-b.md': ms('M1.1', 'shaping', '2026-02-01..2026-02-14'),
  });
  assert.equal(out.exit, 0, out.out);
  assert.deepEqual(out.warnings.map((w) => w.where), ['M1.1-b.md#order/appetite']);
  assert.match(out.warnings[0].detail, /^M1\.1 starts 2026-02-01, before M1 \(M1-a\.md\) starts 2026-03-01/);
  // In order by number, though M10 sorts before M2 by file name; a milestone with no appetite is passed over.
  const inOrder = ms1({
    'docs/milestones/M1-a.md': ms('M1', 'shaping', '2026-01-01..2026-01-14'),
    'docs/milestones/M1.1-b.md': ms('M1.1', 'shaping', '2026-02-01..2026-02-14'),
    'docs/milestones/M2-c.md': ms('M2', 'shaping', '2026-03-01..2026-03-14'),
    'docs/milestones/M3-d.md': ms('M3', 'shaping'),
    'docs/milestones/M10-e.md': ms('M10', 'shaping', '2026-04-01..2026-04-14'),
  });
  assert.deepEqual([inOrder.exit, inOrder.warnings], [0, []], inOrder.out);
});
