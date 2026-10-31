#!/usr/bin/env node
// DS1, design before screens (F-14 §4): the controls PC1 cannot run, since ci/fixtures/known-bad/ds1/ holds only red
// cases, and the red cases a clause of §1, §2 or §4 needs a test for (the 0.2 review's AR-9 and AR-14, the 0.3 review's
// AR-5). Each names the clause that dies without it (L-09). The `frontend/unrecorded` test is the one Verify's mutation
// must fail: a missing front-end line read as `none`. Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { resolveDecision } from '../ci/checks/lib/decision-ref.mjs';
import { A11Y, DESIGN, TODAY, ds1, entry, files, frame, milestone, write } from './lib/ds1.mjs';
import { done, run, SRC } from './lib/lk1-lockfile.mjs';
import { spawnSync } from 'node:child_process';

// The finding ids, without the file in front: `design/missing:M2`.
const ids = (r) => r.json.findings.map((f) => f.where.slice(f.where.indexOf('#') + 1)).sort();
const green = (r, what) => {
  assert.equal(r.status, 0, `${what}: ${r.out}`);
  assert.deepEqual(r.json.findings, [], what);
};
const STARTED = ['Sign-in (F-1) · #11', 'The core action (F-2) · #12'];

// --- Controls: 0 findings, and the view says why ---

test('a design item in a closed M1 answers for an active M2, and the scanned line names it (dies without "before" by milestone)', () => {
  const r = ds1(files({ milestones: { 'M1.md': milestone({ id: 'M1', status: 'closed', contents: [DESIGN] }), 'M2.md': milestone() } }));
  green(r, 'closed M1');
  assert.match(r.out, /DS1: scanned 3 documents \(the frame, 2 milestones\) · front end: a web app · M2 satisfied by the design item in M1, item 1/);
});

test('the design item as M2\'s item 1 answers for M2 (dies without the own-milestone rule)', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN, 'A slice (F-1)'] }) } }));
  green(r, 'own item 1');
  assert.match(r.out, /M2 satisfied by the design item in its own Contents, item 1/);
});

test('the item as item 1 of a closed M2 answers for an active M10: before is by number, not by text (dies without compareMilestones)', () => {
  green(ds1(files({ milestones: { 'M10-later.md': milestone({ id: 'M10' }), 'M2-first.md': milestone({ status: 'closed', contents: [DESIGN] }) } })), 'M2 before M10');
});

test('Front end: none, in any case and with words after it, closes design and the Gate line, and the view names it', () => {
  for (const line of ['Front end: none', 'Front end: NONE (an API)', 'Front end: none.', 'Front end: none(a command-line tool)']) {
    const r = ds1(files({ frame: frame(line), milestones: { 'M2.md': milestone({ gate: ['`pnpm verify` green on main'] }) } }));
    green(r, line);
    assert.deepEqual(r.json.exempted, ['M2: front end: none'], line);
    assert.match(r.out, /front end: none · |front end: none$/m, line);
    assert.match(r.out, /1 exempted by the frame: M2: front end: none/, line);
  }
});

test('screens: none on an active M2 closes design and the Gate line, and the view names the field (dies without the opt-out)', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ fields: ['screens: none'], gate: ['`pnpm verify` green on main'] }) } }));
  green(r, 'screens: none');
  assert.deepEqual(r.json.exempted, ['M2: screens: none']);
  assert.match(r.out, /exempted by milestone frontmatter: M2: screens: none/);
});

test('design: PD-4 naming a decision answers design and nothing else: the Gate line is still owed, and the red run shows the view', () => {
  const r = ds1(files({ decisions: '# Decisions\n\n## PD-4 — Screens built to the vendor kit *(decided 2026-10-01)*\n', milestones: { 'M2.md': milestone({ fields: ['design: PD-4'], gate: ['`pnpm verify` green on main'] }) } }));
  assert.equal(r.status, 1, r.out);
  assert.deepEqual(ids(r), ['gate/accessibility:M2']);
  assert.deepEqual(r.json.exempted, ['M2: design: PD-4']);
  // AR-3: the view is in the output of a red run, not only in a pass's claim.
  assert.match(r.out, /DS1: 1 exempted by milestone frontmatter: M2: design: PD-4/);
  assert.match(r.out, /DS1: scanned 2 documents \(the frame, 1 milestone\) · front end: a web app/);
});

test('an accessibility line that wraps between "2.2" and "AA" is read (dies without joining a bullet\'s lines)', () => {
  const wrapped = 'Screens built here meet WCAG 2.2\n  AA, held by an axe run in CI.';
  green(ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], gate: [wrapped] }) } })), 'wrapped');
});

test('an active skeleton with the line and no design item anywhere: the skeleton owes no design, and the view says so', () => {
  const r = ds1(files({ milestones: { 'M1.md': milestone({ id: 'M1', kind: 'skeleton' }) } }));
  green(r, 'skeleton');
  assert.deepEqual(r.json.exempted, ['M1: kind: skeleton, no design item owed']);
});

test('a design item below two started items in an active M3, with none before M3 (dies without the started rule)', () => {
  green(ds1(files({ milestones: { 'M3.md': milestone({ id: 'M3', contents: [...STARTED, DESIGN, 'Billing (F-3)'] }) } })), 'below started');
});

test('a live entry for an active M2 with its design item and no line: nothing reported, and the view names the milestone and the day', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], gate: ['`pnpm verify` green on main'] }) }, entries: [entry('M2')] }));
  green(r, 'live entry');
  assert.deepEqual(r.json.exempted, ['M2: accessibility excused until 2026-12-01']);
  assert.match(r.out, /exempted by ci\/exceptions\.yaml: M2: accessibility excused until 2026-12-01/);
});

test('a live entry for a closed M2 with no line, M3 active with its item and its line: the view names M2 (closing does not end the entry)', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ status: 'closed', gate: ['`pnpm verify` green on main'] }), 'M3.md': milestone({ id: 'M3', contents: [DESIGN] }) }, entries: [entry('M2')] }));
  green(r, 'closed with entry');
  assert.deepEqual(r.json.exempted, ['M2: accessibility excused until 2026-12-01']);
});

test('a frame with no front-end line and no milestone active: nothing reported (DS1 looks only once a milestone is active)', () => {
  green(ds1(files({ frame: frame(null), milestones: { 'M1.md': milestone({ id: 'M1', status: 'shaping', kind: 'skeleton' }) } })), 'not active');
});

test('a closed M2 with no item and a shaping M3: nothing reported (closed and shaping milestones are not held)', () => {
  green(ds1(files({ milestones: { 'M2.md': milestone({ status: 'closed', gate: ['`pnpm verify` green on main'] }), 'M3.md': milestone({ id: 'M3', status: 'shaping' }) } })), 'closed and shaping');
});

test('design: D-5 resolves against a ## D-5 heading, the id written exactly; D-05 does not', () => {
  const decisions = '# Decisions\n\n## D-5 — Screens built to the vendor kit *(decided 2026-10-01)*\n';
  green(ds1(files({ decisions, milestones: { 'M2.md': milestone({ fields: ['design: D-5'] }) } })), 'D-5');
  assert.deepEqual(ids(ds1(files({ decisions, milestones: { 'M2.md': milestone({ fields: ['design: D-05'] }) } }))), ['design/unresolved:M2']);
});

// --- Red cases a clause needs ---

test('frontend/unrecorded: a frame with no front-end line and an active screen milestone, the frame of every project synced before this release', () => {
  const r = ds1(files({ frame: frame(null), milestones: { 'M2.md': milestone({ contents: [DESIGN] }) } }));
  assert.equal(r.status, 1, r.out);
  assert.deepEqual(ids(r), ['frontend/unrecorded']);
  assert.match(r.json.findings[0].detail, /has no Front end: line/);
  assert.match(r.out, /front end: not recorded/);
});

test('two front-end lines are none read, an empty value is unrecorded, and a label written another way is no line', () => {
  for (const [line, why] of [
    ['Front end: none\n\nFront end: a web app', /more than one Front end: line/],
    ['Front end:', /nothing after it/],
    ['**Front end:** a web app', /has no Front end: line/],
    ['Front-end: none', /has no Front end: line/],
  ]) {
    const r = ds1(files({ frame: frame(line), milestones: { 'M2.md': milestone({ contents: [DESIGN] }) } }));
    assert.deepEqual(ids(r), ['frontend/unrecorded'], line);
    assert.match(r.json.findings[0].detail, why, line);
  }
});

test('a front-end line in a comment or a code fence is not read', () => {
  for (const line of ['<!-- Front end: a web app -->', '```\nFront end: a web app\n```']) {
    assert.deepEqual(ids(ds1(files({ frame: frame(line), milestones: { 'M2.md': milestone({ contents: [DESIGN] }) } }))), ['frontend/unrecorded'], line);
  }
});

test('a [PARKED: …] answer is a front end until it is answered, and a word that only starts with none is one too', () => {
  for (const line of ['Front end: [PARKED: web or phone? assume: web; if wrong: rebuild; #12]', 'Front end: nonesuch app']) {
    assert.deepEqual(ids(ds1(files({ frame: frame(line), milestones: { 'M2.md': milestone() } }))), ['design/missing:M2'], line);
  }
});

test('screens/unknown is still reported under Front end: none, and an empty screens: is unknown too', () => {
  const none = ds1(files({ frame: frame('Front end: none'), milestones: { 'M2.md': milestone({ fields: ['screens: some'] }) } }));
  assert.deepEqual(ids(none), ['screens/unknown:M2']);
  const empty = ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], fields: ['screens:'] }) } }));
  assert.deepEqual(ids(empty), ['screens/unknown:M2']);
  assert.match(empty.json.findings[0].detail, /screens: is empty/);
});

test('a design item in an earlier shaping or killed milestone is not design before the screens', () => {
  for (const status of ['shaping', 'killed']) {
    const r = ds1(files({ milestones: { 'M2.md': milestone({ status, contents: [DESIGN] }), 'M3.md': milestone({ id: 'M3' }) } }));
    assert.deepEqual(ids(r), ['design/missing:M3'], status);
  }
});

test('"item 1" is the first item as rendered: a list written 1. 1. counts its second item as item 2', () => {
  const md = milestone().replace('1. A slice (F-1)', `1. A slice (F-1)\n1. ${DESIGN}`);
  assert.deepEqual(ids(ds1(files({ milestones: { 'M2.md': md } }))), ['design/missing:M2']);
});

test('design: naming an open decision does not answer: an open stub is no decision (0.3 AR-5)', () => {
  const r = ds1(files({ decisions: '# Decisions\n\n## D-005 — Frontend framework *(open — week 1)*\n', milestones: { 'M2.md': milestone({ fields: ['design: D-005'] }) } }));
  assert.deepEqual(ids(r), ['design/unresolved:M2']);
  assert.match(r.json.findings[0].detail, /D-005 is not marked decided or accepted in decisions\.md/);
});

test('entry findings are reported whatever the frame says: under Front end: none, and with the frame unrecorded', () => {
  const none = ds1(files({ frame: frame('Front end: none'), milestones: { 'M2.md': milestone({ gate: ['`pnpm verify` green on main'] }) }, entries: [entry('M2')] }));
  assert.deepEqual(ids(none), ['accessibility/entry:M2']);
  assert.match(none.json.findings[0].detail, /the frame says Front end: none/);
  const unrecorded = ds1(files({ frame: frame(null), milestones: { 'M2.md': milestone({ status: 'closed' }) }, entries: [entry('M2', { owner: null })] }));
  assert.deepEqual(ids(unrecorded), ['accessibility/entry:M2']);
});

test('two entries for one milestone are judged alone: the live one excuses, the ended one is reported', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], gate: ['`pnpm verify` green on main'] }) }, entries: [entry('M2', { expires: '2026-10-01' }), entry('M2')] }));
  assert.deepEqual(ids(r), ['accessibility/overdue:M2']);
});

test('an entry both incomplete and past its day is accessibility/entry only: it excuses nothing (0.3 AR-5 reading 3)', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN] }) }, entries: [entry('M2', { reason: null, expires: '2026-01-01' })] }));
  assert.deepEqual(ids(r), ['accessibility/entry:M2']);
});

test('W1 reports DS1 in a project whose meta script does not run it, as it does in slipway (0.2 AR-6 point 2)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds1-w1-'));
  const pkg = (meta) => JSON.stringify({ name: 'p', private: true, scripts: { meta } });
  const tree = {
    '.github/workflows/ci.yml': 'name: ci\non: [pull_request]\njobs:\n  meta:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm meta\n',
    'ci/checks/meta/k1-frame.mjs': '// inert\n',
    'ci/checks/meta/ds1-design-before-screens.mjs': '// inert\n',
  };
  try {
    write(dir, { ...tree, 'package.json': pkg('node ci/checks/meta/k1-frame.mjs .') });
    const kept = run('ci/checks/meta/w1-declared-vs-invoked.mjs', dir);
    assert.deepEqual(kept.json.findings.map((f) => f.where), ['check:ds1-design-before-screens.mjs'], kept.out);
    write(dir, { 'package.json': pkg('node ci/checks/meta/k1-frame.mjs . && node ci/checks/meta/ds1-design-before-screens.mjs .') });
    assert.deepEqual(run('ci/checks/meta/w1-declared-vs-invoked.mjs', dir).json.findings, []);
  } finally {
    done(dir);
  }
});

test('a design item or an accessibility line in fenced code is not one: it is shown as code (round 1 of PR #512)', () => {
  const md = milestone({ contents: ['A slice (F-1)'], gate: ['`pnpm verify` green on main'] })
    .replace('## Contents\n\n', `## Contents\n\n\`\`\`\n1. ${DESIGN}\n\`\`\`\n\n`)
    .replace('## Gate\n\n', `## Gate\n\n\`\`\`\n- ${A11Y}\n\`\`\`\n\n`);
  assert.deepEqual(ids(ds1(files({ milestones: { 'M2.md': md } }))), ['design/missing:M2', 'gate/accessibility:M2']);
  // After a `<!--` with no `-->`, GitHub shows nothing: an item or a line there is not read either.
  const hidden = milestone({ contents: ['A slice (F-1)'], gate: ['`pnpm verify` green on main'] })
    .replace('## Contents\n\n', `## Contents\n\n<!--\n1. ${DESIGN}\n\n`);
  assert.deepEqual(ids(ds1(files({ milestones: { 'M2.md': hidden } }))), ['design/missing:M2', 'gate/accessibility:M2']);
  // The Gate reader on its own (#515): the design item is real and the Gate line sits after an unclosed `<!--`.
  const gateHidden = milestone({ contents: [DESIGN], gate: ['`pnpm verify` green on main'] })
    .replace('- `pnpm verify` green on main\n', `- \`pnpm verify\` green on main\n<!--\n- ${A11Y}\n`);
  assert.deepEqual(ids(ds1(files({ milestones: { 'M2.md': gateHidden } }))), ['gate/accessibility:M2']);
});

test('design: and extended: take one decision heading the same way, whatever its shape (#515, #513)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds1-same-'));
  try {
    for (const heading of ['## PD-7 — x *(decided 2026-10-01)*', '# PD-7 — x *(decided 2026-10-01)*', '> ## PD-7 — x *(decided 2026-10-01)*', '## PD-7 — x *(open — week 1)*']) {
      write(dir, files({ decisions: `# Decisions\n\n${heading}\n`, milestones: { 'M2.md': milestone({ contents: [DESIGN], fields: ['design: PD-7', 'extended: PD-7'] }) } }));
      const design = run('ci/checks/meta/ds1-design-before-screens.mjs', dir, { CHECK_TODAY: TODAY });
      const ms = run('ci/checks/meta/ms1-milestones.mjs', dir, { CHECK_TODAY: '2026-10-15' });
      assert.equal(/design\/unresolved/.test(design.out), /extended\/unresolved/.test(ms.out), heading);
    }
  } finally {
    done(dir);
  }
});

test('design: answers only to a heading marked decided or accepted: not open, not unmarked, not one whose first clause is another (0.3 AR-5; round 1 of PR #512)', () => {
  for (const heading of ['## PD-7 — Skip the *(design)* step *(open — week 1)*', '## PD-7 — Screens built to the vendor kit', `## PD-7 — ${'x'.repeat(520)} *(decided 2026-10-01)*`]) {
    const r = ds1(files({ decisions: `# Decisions\n\n${heading}\n`, milestones: { 'M2.md': milestone({ fields: ['design: PD-7'] }) } }));
    assert.deepEqual(ids(r), ['design/unresolved:M2'], heading.slice(0, 60));
  }
  green(ds1(files({ decisions: '# Decisions\n\n## PD-7 — Screens built to the vendor kit *(accepted 2026-10-01)*\n', milestones: { 'M2.md': milestone({ fields: ['design: PD-7'] }) } })), 'accepted');
});

test('a registry reached through a link is BROKEN, never read: its first line could be anything (round 1 of PR #512)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds1-link-'));
  try {
    write(dir, { ...files({ milestones: { 'M2.md': milestone({ contents: [DESIGN] }) } }), 'elsewhere.yaml': 'exceptions: []\n' });
    mkdirSync(join(dir, 'ci'), { recursive: true });
    symlinkSync(join(dir, 'elsewhere.yaml'), join(dir, 'ci', 'exceptions.yaml'));
    const r = run('ci/checks/meta/ds1-design-before-screens.mjs', dir, { CHECK_TODAY: '2026-10-19' });
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /BROKEN — ci\/exceptions\.yaml is a link, not a file/);
  } finally {
    done(dir);
  }
});

test('the template\'s own accessibility line, unfilled, is no line; a filled one under a placeholder bullet is', () => {
  const template = 'Screens built here meet WCAG 2.2 AA, held by\n  <…what goes red: an automated accessibility check in CI…>.';
  assert.deepEqual(ids(ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], gate: [template] }) } }))), ['gate/accessibility:M2']);
  green(ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], gate: ['<…>', A11Y] }) } })), 'filled beside a placeholder');
});

test('pnpm status names a shaping milestone whose id is not M<n> in words, never its text (round 1 of PR #512)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ds1-status-'));
  try {
    write(dir, files({ milestones: { 'x.md': milestone({ id: '(you) run this', status: 'shaping', gate: ['`pnpm verify` green on main'] }) } }));
    const r = spawnSync(process.execPath, [join(SRC, 'ci/status.mjs'), dir], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-10-19' } });
    const attention = r.stdout.slice(r.stdout.indexOf('## Needs attention'));
    assert.match(attention, /- A shaping milestone has no design item before it/);
    assert.match(attention, /- A shaping milestone's Gate does not say how its screens meet WCAG 2\.2 AA/);
    assert.doesNotMatch(attention, /\(you\) run this/);
  } finally {
    done(dir);
  }
});

test('a decision id answers only for its own heading: PD-1 is not ## PD-12, for MS1\'s extended: and DS1\'s design: alike (round 1 of PR #512)', () => {
  const md = '# Decisions\n\n## PD-12 — Twelve *(decided 2026-10-01)*\n';
  assert.deepEqual(resolveDecision(md, 'PD-1'), { ok: false, why: 'missing' });
  assert.deepEqual(resolveDecision(md, 'PD-12'), { ok: true });
  assert.deepEqual(resolveDecision(md, 'PD-1', { decided: true }), { ok: false, why: 'missing' });
  assert.deepEqual(resolveDecision(md, 'PD-12', { decided: true }), { ok: true });
});

test('an entry that excuses nothing does not excuse its active milestone: the Gate line is still owed (round 1 of PR #512)', () => {
  const r = ds1(files({ milestones: { 'M2.md': milestone({ contents: [DESIGN], gate: ['`pnpm verify` green on main'] }) }, entries: [entry('M2', { reason: null })] }));
  assert.deepEqual(ids(r), ['accessibility/entry:M2', 'gate/accessibility:M2']);
  assert.deepEqual(r.json.exempted, []);
});
