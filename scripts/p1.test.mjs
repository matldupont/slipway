#!/usr/bin/env node
// P1 (ci/checks/meta/p1-pr-body.mjs), `decision/awaits-outcome:<id>` (F-15 §8): a pull request whose prose closes an issue
// meets a decision whose readable condition names it. PC1 runs the known-bad fixture (ci/fixtures/known-bad/p1/closes-awaited*);
// the controls and the forms a fixture cannot hold are here, each naming its record. Every file here is inert text.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P1 = join(SRC, 'ci/checks/meta/p1-pr-body.mjs');

const body = (closing) => `## What\nLane: bounded. The last step of the booking page.\n\n## Verification\n\`\`\`\npnpm verify\n\`\`\`\n\n## Links\n${closing}\n`;
const record = (...entries) => `# Decisions\n\nAn invented record: every id here is made up.\n\n${entries.join('\n\n')}\n`;
const CLOSES = '## PD-7 — Walks are cash only *(decided 2026-03-01)*\n\nCloses when: #12 lands';

// Runs P1 on one body with `files` written under a fresh root; `rootArg` false passes no root. `bodies` is the folder of bodies.
function p1({ md, files = {}, rootArg = true, sidecar }) {
  const root = mkdtempSync(join(tmpdir(), 'p1-'));
  try {
    const bodies = join(root, 'pr');
    mkdirSync(bodies);
    writeFileSync(join(bodies, 'body.md'), md);
    if (sidecar) writeFileSync(join(bodies, 'body.changes.json'), JSON.stringify({ files: ['src/app.ts'], scripts: [], links: [], ...sidecar }));
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(join(root, name), text);
    }
    const r = spawnSync(process.execPath, [P1, bodies, ...(rootArg ? [root] : [])], { cwd: root, encoding: 'utf8', env: { ...process.env, CHECK_JSON: '1' } });
    const json = JSON.parse((r.stdout ?? '').split('\n').findLast((l) => l.startsWith('@@json ')).slice('@@json '.length));
    return { exit: r.status, findings: json.findings.map((f) => f.where), details: json.findings.map((f) => f.detail), scanned: json.scanned };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const awaits = (r) => r.findings.filter((f) => f.includes('#decision/awaits-outcome:'));

test('a body that closes the issue a decision waits on is held until the outcome is written in the same pull request (record: PD-7 closes when #12 lands)', () => {
  const held = p1({ md: body('Closes #12'), files: { 'decisions.md': record(CLOSES) } });
  assert.deepEqual([held.exit, held.findings], [1, ['body.md#decision/awaits-outcome:PD-7']]);
  assert.match(held.details[0], /closes #12, and PD-7 says it closes when #12 lands: in this pull request, replace PD-7's condition with `Closed <date>: <outcome>`/);
  const written = p1({ md: body('Closes #12'), files: { 'decisions.md': record('## PD-7 — Walks are cash only *(decided 2026-03-01)*\n\nClosed 2026-03-10: cash only held, the walkers agreed.') } });
  assert.deepEqual([written.exit, written.findings], [0, []]);
});

test('"Part of #12" closes nothing, and without a root no record is read (record: PD-7 closes when #12 lands)', () => {
  const files = { 'decisions.md': record(CLOSES) };
  assert.deepEqual(p1({ md: body('Part of #12 · leaves #12 open, it waits on the next step'), files }).findings, []);
  assert.deepEqual(p1({ md: body('Closes #12'), files, rootArg: false }).findings, []);
});

test('a reopens condition, a heading clause and an event beside another are held; one finding per decision (record: PD-1 to PD-4)', () => {
  const r = p1({
    md: body('Closes #12 · fixes #13'),
    files: {
      'decisions.md': record(
        '## PD-1 — a *(decided 2026-03-01)*\n\nReopens when: #12 lands',
        '## PD-2 — b *(decided 2026-03-01 · closes when #13 is closed)*',
        '## PD-3 — c *(decided 2026-03-01)*\n\nReopens when: F-07 has a doc or #12 closes\nCloses when: #13 lands',
        '## PD-4 — d *(decided 2026-03-01)*\n\nCloses when: #14 lands'
      ),
    },
  });
  assert.deepEqual(awaits(r), ['body.md#decision/awaits-outcome:PD-1', 'body.md#decision/awaits-outcome:PD-2', 'body.md#decision/awaits-outcome:PD-3']);
  assert.match(r.details[0], /PD-1 says it reopens when #12 lands: .*`Reopened <date>: <what changed>` or `Reviewed <date>: stands — <why>`/);
});

test('the repository is compared as P1 compares a closing word and "leaves open": a sentence with none may name this one (record: acme/app#12, #13)', () => {
  const files = { 'decisions.md': record('## PD-1 — a *(decided 2026-03-01)*\n\nCloses when: acme/app#12 lands', '## PD-2 — b *(decided 2026-03-01)*\n\nCloses when: #13 lands') };
  assert.deepEqual(awaits(p1({ md: body('Closes acme/app#12'), files })), ['body.md#decision/awaits-outcome:PD-1']);
  assert.deepEqual(awaits(p1({ md: body('Closes #12'), files })), ['body.md#decision/awaits-outcome:PD-1']);
  assert.deepEqual(awaits(p1({ md: body('Closes other/app#12'), files })), []);
  assert.deepEqual(awaits(p1({ md: body('Closes https://github.com/acme/app/issues/13'), files })), ['body.md#decision/awaits-outcome:PD-2']);
});

test('a closing word GitHub acts on is read wherever it shows: a nested bullet, a tab, a leading --- block, beside a `<!--` written as text (record: PD-7 closes when #12 lands)', () => {
  const files = { 'decisions.md': record(CLOSES) };
  for (const md of [body('- Issue\n    - Closes #12'), body('This finishes the page\n    Closes #12'), body('- Issue\n\t- Closes #12'), `---\nCloses #12\n---\n${body('Part of #31')}`,
    body('Part of #31').replace('## What\n', '## What\nP1 reads a `<!--` mark written in inline code.\n').replace('Part of #31', 'Closes #12')]) {
    assert.deepEqual(awaits(p1({ md, files })), ['body.md#decision/awaits-outcome:PD-7'], md);
  }
  assert.deepEqual(awaits(p1({ md: body('Part of #12\n\n```\nCloses #12\n```\n`Closes #12` and <!-- Closes #12 -->'), files })), [], 'code and closed comments close nothing');
  const heading = p1({ md: body('Closes #12'), files: { 'decisions.md': record('## PD-7 — a *(decided 2026-03-01 · closes when #12 lands)*') } });
  assert.match(heading.details[0], /remove the clause from PD-7's heading and write `Closed <date>: <outcome>` beneath it, or, with the owner's yes, change the condition/);
});

test('a condition P1 cannot read, or one quoted in a fence, is no condition; nor is a closing word in code (record: PD-1 unreadable, PD-2 in a fence)', () => {
  const files = { 'decisions.md': record('## PD-1 — a *(decided 2026-03-01)*\n\nCloses when: #12 lands or the walkers agree', '## PD-2 — b *(decided 2026-03-01)*\n\n```\nCloses when: #12 lands\n```') };
  assert.deepEqual(awaits(p1({ md: body('Closes #12'), files })), []);
  assert.deepEqual(awaits(p1({ md: body('Closes #12 and not `Closes #99`'), files: { 'decisions.md': record('## PD-1 — a *(decided 2026-03-01)*\n\nCloses when: #99 lands') } })), []);
});

test('no decisions.md at the root reads as no record', () => {
  assert.deepEqual(p1({ md: body('Closes #12') }).findings, []);
});

test('a sidecar\'s record serves its body alone and is never read as a body (record: closes-awaited.decisions.md)', () => {
  const r = p1({ md: body('Closes #12'), sidecar: { decisions: 'record.md' }, files: { 'pr/record.md': record(CLOSES) } });
  assert.deepEqual([r.exit, r.findings, r.scanned], [1, ['body.md#decision/awaits-outcome:PD-7'], 1]);
  const root = p1({ md: body('Closes #12'), sidecar: { decisions: 'record.md' }, files: { 'pr/record.md': record(CLOSES.replace('#12', '#13')), 'decisions.md': record(CLOSES) } });
  assert.deepEqual(root.findings, [], 'the sidecar\'s record is read, not the root\'s');
  const odd = p1({ md: body('Closes #12'), sidecar: { decisions: '../decisions.md' }, files: { 'decisions.md': record(CLOSES) } });
  assert.deepEqual(odd.findings, ['body.md#decision/awaits-outcome:PD-7'], 'a name that is not a file of the bodies folder is ignored: the root is read');
});
