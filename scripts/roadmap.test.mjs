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
import { renderPage } from '../ci/roadmap.mjs';

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
