#!/usr/bin/env node
// The roadmap renderer (ci/roadmap.mjs, F-02 step 1): one case per Acceptance block of dev/features/roadmap-page.md.
// The page is the one thing slipway renders for people outside the repo, so the allowlist is pinned two ways: a
// sentinel in every excluded source never reaches the page, and a field added to a model entry never does either.
// Fixture roots are in scripts/fixtures/roadmap/; variants are copied to a temp dir and edited there.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { appetiteClock, readMilestoneModel } from '../ci/checks/lib/milestones.mjs';
import { project, renderPage } from '../ci/roadmap.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROADMAP = join(SRC, 'ci', 'roadmap.mjs');
const FIX = join(SRC, 'scripts', 'fixtures', 'roadmap');
const SHA = '0123456789abcdef';

const run = (root, args, today = '2026-03-11') =>
  spawnSync(process.execPath, [ROADMAP, root, ...args], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: today, CHECK_NOW: '' } });

const made = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'roadmap-'));
  made.push(d);
  return d;
};
after(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

// Render a root to a fresh dir and return the page.
function render(root, today) {
  const out = join(tmp(), 'site');
  const r = run(root, ['--out', out, '--sha', SHA], today);
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(join(out, 'index.html'), 'utf8');
}

// A copy of the full fixture with one milestone file's text changed.
function variant(file, edit) {
  const root = tmp();
  cpSync(join(FIX, 'full'), root, { recursive: true });
  const p = join(root, 'docs', 'milestones', file);
  writeFileSync(p, edit(readFileSync(p, 'utf8')));
  return root;
}

const section = (html, h2) => html.split(`<h2>${h2}</h2>`)[1]?.split('</section>')[0] ?? null;
const scripts = (html) => (html.match(/<script\b/gi) ?? []).length;

test('no row or off: --out writes nothing and says so, --enabled prints false', () => {
  for (const name of ['off', 'off-value']) {
    const out = join(tmp(), 'site');
    const r = run(join(FIX, name), ['--out', out]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, 'roadmap: off (AGENT.md Roadmap page)\n');
    assert.equal(existsSync(out), false, `${name}: ${out} must not exist`);
    const e = run(join(FIX, name), ['--enabled']);
    assert.equal(e.status, 0);
    assert.equal(e.stdout, 'enabled=false\n');
  }
  assert.equal(run(join(FIX, 'full'), ['--enabled']).stdout, 'enabled=true\n');
});

test('a public row that is not a live Skill Configuration row leaves the page off', () => {
  const row = '| Roadmap page | `public` | example |';
  const shapes = {
    'in an HTML comment': (a) => `${a}\n<!-- example:\n${row}\n-->\n`,
    'in a code fence': (a) => `${a}\n\`\`\`\n${row}\n\`\`\`\n`,
    'outside the Skill Configuration section': (a) => `${a}\n## Examples\n\n| Key | Value | What |\n|---|---|---|\n${row}\n`,
    'after an indented Skill Configuration heading in an example': (a) =>
      `## Examples\n\n    ## Skill Configuration\n\n${row}\n\n${a.replace(/^# .*\n/, '')}`,
  };
  for (const [name, edit] of Object.entries(shapes)) {
    const root = tmp();
    cpSync(join(FIX, 'off'), root, { recursive: true });
    writeFileSync(join(root, 'AGENT.md'), edit(readFileSync(join(root, 'AGENT.md'), 'utf8')));
    assert.equal(run(root, ['--enabled']).stdout, 'enabled=false\n', name);
  }
});

test('a long Roadmap page cell with no closing pipe is read in linear time', () => {
  const root = tmp();
  cpSync(join(FIX, 'off'), root, { recursive: true });
  // The last line of the table, so no later `|` closes the cell.
  writeFileSync(join(root, 'AGENT.md'), `${readFileSync(join(root, 'AGENT.md'), 'utf8')}| Roadmap page |${' '.repeat(50000)}x\n`);
  const r = spawnSync(process.execPath, [ROADMAP, root, '--enabled'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(r.signal, null, 'killed after 10s');
  assert.equal(r.stdout, 'enabled=false\n');
});

test('public: Now, Next, Done and Stopped, the sha, noindex, and no script', () => {
  const html = render(join(FIX, 'full'));
  const now = section(html, 'Now');
  assert.match(now, /M1<\/span> Online booking/);
  assert.match(now, /day 3 of 7 · time budget ends 2026-03-15/);
  assert.match(now, /Not in this one[\s\S]*Refunds wait for M2[\s\S]*No mobile app/);
  const next = section(html, 'Next');
  assert.match(next, /M2<\/span> Refunds/);
  assert.match(next, /No partial refunds/);
  assert.doesNotMatch(next, /\d{4}-\d{2}-\d{2}/, 'a shaping milestone shows no dates');
  assert.match(section(html, 'Done'), /M0<\/span>[\s\S]*Ended 2026-02-14/);
  assert.match(section(html, 'Stopped'), /M3<\/span> Marketplace/);
  assert.match(html, /from 0123456\./);
  assert.doesNotMatch(html, /01234567/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /<html lang="en">/);
  assert.equal(scripts(html), 0);
  assert.doesNotMatch(html, /\b(?:src|href)=|url\(|@import/i, 'no external request');
});

test('no sentinel from an excluded source reaches the page', () => {
  // Proves the sentinels are really in the fixture, so a renamed file cannot pass this vacuously.
  const planted = ['decisions.md', 'docs/PRD.md', 'docs/product/FRAME.md'].map((f) => readFileSync(join(FIX, 'full', f), 'utf8'));
  for (const text of planted) assert.match(text, /SENTINEL-/);
  for (const m of ['m0', 'm1', 'm2', 'm3']) {
    const md = readFileSync(join(FIX, 'full', 'docs', 'milestones', readdir(m)), 'utf8');
    for (const s of ['why', 'contents', 'rabbit-holes', 'gate', 'kill-criteria', 'retro']) assert.match(md, new RegExp(`SENTINEL-${m}-${s}`));
  }
  const html = render(join(FIX, 'full'));
  assert.deepEqual(html.match(/SENTINEL[\w-]*/g) ?? [], []);
});

test('a heading-shaped line in frontmatter, a comment or a code fence is never read as the title or a no-go', () => {
  const cases = {
    'a frontmatter comment': (md) => md.replace(/^summary:/m, '# SENTINEL-fm-comment\nsummary:'),
    'an HTML comment before the H1': (md) => md.replace(/^# M1 — /m, '<!--\n# SENTINEL-html-comment\n-->\n\n# M1 — '),
    'a fence in Contents, with no H1': (md) => md.replace(/^# M1 — .*$/m, '').replace('## Contents\n', '## Contents\n\n```\n# SENTINEL-fence-title\n```\n'),
    'a fenced No-gos example in Why': (md) => md.replace('## Why\n', '## Why\n\n```\n## No-gos\n\n- SENTINEL-fence-nogo\n```\n'),
    'a No-gos heading in an HTML comment': (md) => md.replace('## Why\n', '## Why\n\n<!--\n## No-gos\n- SENTINEL-comment-nogo\n-->\n'),
    'an indented No-gos heading under a Why list': (md) => md.replace('## Why\n', '## Why\n\n- intro\n  ## No-gos\n- SENTINEL-indented-nogo\n'),
  };
  // Lines that look like a fence opener but are not one, and so must not swallow the H1 after them.
  const notFences = {
    'inline code with backticks on one line': (md) => md.replace(/^# M1 — /m, '``` x ```\n\n# M1 — '),
    'a tab-indented fence (a code block line)': (md) => md.replace(/^# M1 — /m, '\t```\n\n# M1 — '),
  };
  for (const [name, edit] of Object.entries(notFences)) {
    assert.match(render(variant('M1-booking.md', edit)), /M1<\/span> Online booking</, name);
  }
  for (const [name, edit] of Object.entries(cases)) {
    const html = render(variant('M1-booking.md', edit));
    assert.deepEqual(html.match(/SENTINEL[\w-]*/g) ?? [], [], name);
    assert.match(section(html, 'Now'), /M1<\/span>/, name);
  }
  const titled = render(variant('M1-booking.md', cases['a frontmatter comment']));
  assert.match(titled, /M1<\/span> Online booking</, 'the real H1 is still the title');
  const nogos = render(variant('M1-booking.md', cases['a fenced No-gos example in Why']));
  assert.match(section(nogos, 'Now'), /Refunds wait for M2/, 'the real No-gos still show');
});

function readdir(m) {
  return { m0: 'M0-skeleton.md', m1: 'M1-booking.md', m2: 'M2-refunds.md', m3: 'M3-marketplace.md' }[m];
}

test('a field added to a model entry never reaches the page: only project() decides what shows', () => {
  const milestones = readMilestoneModel(join(FIX, 'full'), '2026-03-11').map((m) => ({
    ...m,
    contents: [{ n: 1, text: 'SENTINEL-extra-contents' }],
    why: 'SENTINEL-extra-why',
    appetite: m.appetite && { ...m.appetite, note: 'SENTINEL-extra-nested' },
    clock: m.clock && { ...m.clock, note: 'SENTINEL-extra-clock' },
  }));
  const html = renderPage({ product: 'Harbour', milestones, today: '2026-03-11', sha: SHA });
  assert.match(html, /Online booking/, 'the page rendered');
  assert.deepEqual(html.match(/SENTINEL[\w-]*/g) ?? [], []);
});

test('project() returns exactly the allowlist, and no-gos and dates only where the page shows them', () => {
  const byId = Object.fromEntries(readMilestoneModel(join(FIX, 'full'), '2026-03-11').map((m) => [m.id, { ...m, why: 'x', contents: ['x'] }]));
  const keys = ['id', 'title', 'status', 'kind', 'summary', 'appetite', 'extended', 'clock', 'noGos'];
  for (const m of Object.values(byId)) assert.deepEqual(Object.keys(project(m)), keys, m.id);
  assert.deepEqual(project(byId.M1).clock, { day: 3, of: 7, end: '2026-03-15', overrun: false });
  assert.deepEqual(project(byId.M1).noGos, ['Refunds wait for M2', 'No mobile app']);
  assert.deepEqual(project(byId.M2).noGos, ['No partial refunds']);
  assert.equal(project(byId.M2).appetite, null, 'a shaping appetite is a guess: no dates');
  for (const id of ['M0', 'M3']) assert.deepEqual(project(byId[id]).noGos, [], `${id}: no-gos only for active and shaping`);
  for (const id of ['M0', 'M2', 'M3']) assert.equal(project(byId[id]).clock, null);
});

test('a summary with markup is escaped, and control and bidi characters are dropped', () => {
  const root = variant('M1-booking.md', (md) =>
    md.replace(/^summary: .*$/m, 'summary: <script>alert(1)</script> & "q"').replace(/^# M1 — .*$/m, '# M1 — Book‮ing\u0007'),
  );
  const html = render(root);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;q&quot;/);
  assert.match(html, /M1<\/span> Booking</);
  assert.equal(scripts(html), 0);
});

test('an active milestone past its appetite and not extended reads as being wrapped up, with no day count', () => {
  const html = render(join(FIX, 'full'), '2026-03-16');
  const now = section(html, 'Now');
  assert.match(now, /Past its time budget, being wrapped up/);
  assert.doesNotMatch(now, /day \d+ of/);
  const ext = render(variant('M1-booking.md', (md) => md.replace(/^summary:/m, 'extended: PD-3\nsummary:')), '2026-03-16');
  assert.match(section(ext, 'Now'), /Extended · time budget was 2026-03-09 to 2026-03-15/);
  assert.doesNotMatch(section(ext, 'Now'), /wrapped up|day \d+ of/);
});

test('a Roadmap page value it does not know exits 1, names the row and the values, and writes nothing', () => {
  for (const args of [['--out', null], ['--enabled']]) {
    const out = join(tmp(), 'site');
    const r = run(join(FIX, 'typo'), args.map((a) => a ?? out));
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Roadmap page is "pubic": use off or public/);
    assert.equal(r.stdout, '');
    assert.equal(existsSync(out), false);
  }
});

test('no milestones, only TEMPLATE.md, or a placeholder summary', () => {
  const empty = render(join(FIX, 'empty'));
  assert.match(empty, /No milestones yet/);
  assert.doesNotMatch(empty, /<h2>/);
  const bare = tmp();
  cpSync(join(FIX, 'empty', 'AGENT.md'), join(bare, 'AGENT.md'));
  assert.match(render(bare), /No milestones yet/);
  const shaping = render(variant('M2-refunds.md', (md) => md.replace(/^summary: .*$/m, 'summary: <…one line…>')));
  assert.match(section(shaping, 'Next'), /M2<\/span> Refunds[\s\S]*<p>Being shaped<\/p>/);
  assert.doesNotMatch(shaping, /&lt;…/);
});

test('the same tree, today and sha render byte-identical pages', () => {
  assert.equal(render(join(FIX, 'full')), render(join(FIX, 'full')));
});

test('appetiteClock counts both ends inclusive and flags an overrun', () => {
  const a = { start: '2026-03-09', end: '2026-03-15' };
  assert.deepEqual(appetiteClock(a, '2026-03-09'), { day: 1, of: 7, end: '2026-03-15', overrun: false });
  assert.deepEqual(appetiteClock(a, '2026-03-15'), { day: 7, of: 7, end: '2026-03-15', overrun: false });
  assert.deepEqual(appetiteClock(a, '2026-03-16'), { day: 8, of: 7, end: '2026-03-15', overrun: true });
});

test('--sha takes only a hex sha', () => {
  const out = join(tmp(), 'site');
  const r = run(join(FIX, 'full'), ['--out', out, '--sha', '<b>x</b>']);
  assert.equal(r.status, 2);
  assert.equal(existsSync(out), false);
});
