// The work-order page (F-07, dev/features/work-order.md): one case per Acceptance line, fixture roots in
// scripts/fixtures/work-order/, and a stub `gh` that answers from data below, so no test calls GitHub.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { escapeHtml, escapeShown } from '../ci/checks/lib/html.mjs';
import { collect, realGh, render } from '../ci/work-order.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(SRC, 'scripts', 'fixtures', 'work-order');
const SCRIPT = join(SRC, 'ci', 'work-order.mjs');
const NOW = '2026-03-11T12:00:00Z';
process.env.CHECK_NOW = NOW;
delete process.env.CHECK_TODAY;

const made = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'work-order-'));
  made.push(d);
  return d;
};
after(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

// An issue body as the form renders it: every section holds a sentinel except the designation.
const body = ({ blockedBy = 'none', touches, designation = 'mode: `regular` · model: `Sonnet 5` · effort: `medium`', place = 'x' } = {}) =>
  [
    `### Problem\n\nSENTINEL-problem-${place}`,
    `### Acceptance\n\nSENTINEL-acceptance-${place}`,
    `### Contract\n\nSENTINEL-contract-${place}`,
    `### Links\n\nPart of: #9 · Blocked by: ${blockedBy}${touches ? ` · Touches: ${touches}` : ''} · Lane: bounded`,
    `## Recommended Mode / Model / Effort\n\n${designation}`,
  ].join('\n\n');

const issue = (number, extra = {}) => ({ number, title: `Issue ${number}`, state: 'OPEN', stateReason: null, body: body(), ...extra });

// The fixture world of the first Acceptance block.
const world = () => ({
  issues: [
    issue(10, { state: 'CLOSED', stateReason: 'COMPLETED' }),
    issue(11, {
      subIssues: { nodes: [
        issue(12, { state: 'CLOSED', stateReason: 'COMPLETED' }),
        issue(13, { body: body({ touches: 'ci/c/**' }) }),
        issue(14, { body: body({ blockedBy: '#13', touches: 'ci/d/**' }) }),
        issue(15, { body: body({ touches: 'ci/a/**' }) }),
      ] },
    }),
    issue(16, { body: body({ touches: 'ci/b.mjs' }) }),
  ],
  prs: [{ number: 20, isDraft: true, body: 'Closes #13\n\nSENTINEL-pr' }],
});

// `gh` from a world: the three calls of the contract, counted.
function stub(w) {
  const calls = [];
  const gh = (args) => {
    calls.push(args);
    if (args[0] === 'pr') return JSON.stringify(w.prs);
    const q = args.find((a) => a.startsWith('query='));
    const all = [...w.issues, ...w.issues.flatMap((i) => i.subIssues?.nodes ?? [])];
    const repository = {};
    for (const m of q.matchAll(/i(\d+):issue/g)) {
      const i = all.find((x) => x.number === Number(m[1]));
      repository[`i${m[1]}`] = i ? (q.includes('subIssues') ? i : { number: i.number, state: i.state, stateReason: i.stateReason }) : null;
    }
    return JSON.stringify({ data: { repository } });
  };
  gh.calls = calls;
  return gh;
}

const page = (w = world(), root = join(FIX, 'full')) => render(collect(root, stub(w)));
const between = (html, from, to) => html.split(from)[1]?.split(to)[0] ?? '';
const nextOf = (html) => between(html, '<h2>Next</h2>', '<h2>Items</h2>');
const text = (html) => html.replace(/<[^>]*>/g, '');

test('ready issues not overlapping work in progress are Next, in order; blocked ones are not; an unshaped item is offered', () => {
  const html = page();
  const next = nextOf(html);
  assert.match(next, /#15/);
  assert.match(next, /#16/);
  assert.doesNotMatch(next, /#14/);
  assert.match(next, /Shape item 4/);
  assert.match(next, /<code>\/log-feature M1#4<\/code>/);
  assert.match(next, /<code>\/work-ticket 15<\/code>/);
  assert.ok(next.indexOf('#15') < next.indexOf('#16') && next.indexOf('#16') < next.indexOf('Shape item 4'));
  assert.match(text(html), /#13 Issue 13 · PR #20 \(draft\)/);
  assert.match(text(html), /Blocked by #13 \(open\)/);
  const fin = between(html, '<h2>Finished</h2>', '</main>');
  assert.match(fin, /<details><summary>1 finished/, 'closed <details>');
  assert.match(fin, /Finished slice/);
  assert.doesNotMatch(between(html, '<h2>Items</h2>', '<h2>Finished</h2>'), /Finished slice/);
  assert.match(html, /day 3 of 7/);
  assert.match(html, /<h1>Harbour · <span class="id">M1<\/span> Booking<\/h1>/);
});

test('at most three calls: issues, open PRs, blockers not already fetched', () => {
  const gh = stub(world());
  collect(join(FIX, 'full'), gh);
  assert.equal(gh.calls.length, 2, 'every blocker was already fetched');
  const w = world();
  w.issues[2].body = body({ blockedBy: '#99', touches: 'ci/b.mjs' });
  w.issues.push(issue(99, { state: 'CLOSED', stateReason: 'NOT_PLANNED' }));
  const gh3 = stub(w);
  const model = collect(join(FIX, 'full'), gh3);
  assert.equal(gh3.calls.length, 3);
  assert.deepEqual(gh3.calls.map((c) => c[0]), ['api', 'pr', 'api']);
  assert.ok(model.next.some((l) => l.n === 16), 'a dropped blocker is closed');
});

test('an issue in progress with an overlapping Touches keeps a ready issue out of Next', () => {
  const w = world();
  w.issues[1].subIssues.nodes[2] = issue(13, { body: body({ touches: 'ci/a/x.mjs' }) });
  const next = nextOf(page(w));
  assert.doesNotMatch(next, /#15/);
  assert.match(next, /#16/);
});

test('an unknown Touches overlaps everything: the first ready issue alone, "Touches: not listed"', () => {
  const w = {
    issues: [issue(10), issue(11, { body: body({ touches: 'ci/a/**' }) }), issue(16, { body: body({ touches: 'ci/b.mjs' }) })],
    prs: [],
  };
  const next = nextOf(page(w));
  assert.match(next, /#10/);
  assert.doesNotMatch(next, /#11|#16/);
  assert.match(next, /Touches: not listed/);
});

test('hostile text: markup and bidi in titles and designations are escaped, and only the three allowed parts of a body reach the page', () => {
  const w = world();
  const evil = '<script>alert(1)</script>‮"><img src=x onerror=alert(1)>';
  w.issues[2] = issue(16, { title: evil, body: body({ touches: 'ci/b.mjs', designation: evil, place: 'evil' }) });
  w.issues[1].subIssues.nodes[3] = issue(15, { body: body({ touches: 'ci/a/**', blockedBy: '#13 SENTINEL-unfiled', place: 'unfiled' }) });
  const html = page(w);
  assert.equal((html.match(/<script\b/gi) ?? []).length, 0);
  assert.equal((html.match(/<img\b/gi) ?? []).length, 0);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.ok(html.includes('\\u202e'), 'the bidi override is shown as \\u202e');
  assert.ok(!html.includes('‮'), 'and never raw');
  assert.equal((html.match(/SENTINEL/g) ?? []).length, 0);
  assert.match(html, /model: Sonnet 5/, 'the designation is read');
  assert.match(html, /Waits on work not filed yet/);
});

test('a designation is cut at 600 characters, and a Touches entry that breaks the rules makes the whole line unknown', () => {
  const w = world();
  w.issues[2] = issue(16, { body: body({ designation: 'd'.repeat(700), touches: 'ci/b.mjs, ../etc/passwd' }) });
  const model = collect(join(FIX, 'full'), stub(w));
  const l = model.milestone.items[2].leaves[0];
  assert.equal(l.designation, `${'d'.repeat(600)}…`);
  assert.equal(l.touches, null);
  for (const bad of ['/abs', 'a b', 'a;b', 'ci/<x>', 'a,,b']) {
    w.issues[2] = issue(16, { body: body({ touches: bad }) });
    assert.equal(collect(join(FIX, 'full'), stub(w)).milestone.items[2].leaves[0].touches, null, bad);
  }
});

test('a PR names a leaf only as a whole reference: #1 never matches #10; the lowest PR number wins', () => {
  const w = world();
  w.issues[2] = issue(16, { body: body({ touches: 'ci/b.mjs' }) });
  w.prs = [
    { number: 30, isDraft: false, body: 'Closes #160' },
    { number: 25, isDraft: false, body: 'part of #16' },
    { number: 22, isDraft: true, body: 'FIXES #16' },
    { number: 21, isDraft: false, body: 'See #16' },
  ];
  const leaf = collect(join(FIX, 'full'), stub(w)).milestone.items[2].leaves[0];
  assert.deepEqual(leaf.pr, { n: 22, draft: true });
  assert.equal(leaf.status, 'pr');
  w.prs = [{ number: 30, isDraft: false, body: 'Closes #160' }];
  assert.equal(collect(join(FIX, 'full'), stub(w)).milestone.items[2].leaves[0].status, 'open');
});

test('a started item in another repository is shown, not read; a missing issue says so', () => {
  const root = tmp();
  cpSync(join(FIX, 'full'), root, { recursive: true });
  const p = join(root, 'docs', 'milestones', 'M1-booking.md');
  writeFileSync(p, readFileSync(p, 'utf8').replace('· #16', '· other/repo#7').replace('· #10', '· #77'));
  const gh = stub(world());
  const html = render(collect(root, gh));
  assert.match(html, /in other\/repo; not read/);
  assert.match(text(html), /#77 not found/);
  assert.ok(gh.calls.every((c) => !c.join(' ').includes('i7:')), 'the foreign issue is never asked for');
});

test('no active milestone: exit 0 and the page says so', () => {
  const out = join(tmp(), 'page.html');
  const r = spawnSync(process.execPath, [SCRIPT, join(FIX, 'none'), '--out', out], { encoding: 'utf8', env: process.env });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), out);
  assert.match(readFileSync(out, 'utf8'), /No milestone is active\. Run <code>pnpm status<\/code> for the next step\./);
});

// A `gh` on PATH that fails, and one planted where a repository could put it.
function fakeGh(dir, script) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'gh'), `#!/bin/sh\n${script}\n`);
  chmodSync(join(dir, 'gh'), 0o755);
  return dir;
}

test('an Issue repo that is not set, or a gh that fails, exits 1 naming the cause and leaves an existing file as it was', () => {
  const out = join(tmp(), 'page.html');
  writeFileSync(out, 'LAST GOOD PAGE');
  const bin = fakeGh(join(tmp(), 'bin'), 'echo "not logged in\ninto anything" >&2; exit 1');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const bad = spawnSync(process.execPath, [SCRIPT, join(FIX, 'bad-repo'), '--out', out], { encoding: 'utf8', env });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /work-order: set Issue repo in AGENT\.md \(owner\/name\)/);
  const failing = spawnSync(process.execPath, [SCRIPT, join(FIX, 'full'), '--out', out], { encoding: 'utf8', env });
  assert.equal(failing.status, 1);
  assert.match(failing.stderr, /gh auth status.*not logged in/);
  assert.doesNotMatch(failing.stderr, /into anything/, 'first line of stderr only');
  assert.equal(readFileSync(out, 'utf8'), 'LAST GOOD PAGE');
  assert.equal(existsSync(`${out}.tmp`), false);
});

test('gh is found outside the repository and node_modules: a planted gh never runs', () => {
  const root = tmp();
  cpSync(join(FIX, 'full'), root, { recursive: true });
  mkdirSync(join(root, '.git'));
  const marker = join(tmp(), 'ran');
  const planted = fakeGh(join(root, 'node_modules', '.bin'), `touch ${marker}; exit 1`);
  const inRepo = fakeGh(join(root, 'tools'), `touch ${marker}; exit 1`);
  const outside = fakeGh(join(tmp(), 'bin'), 'echo "real gh missing" >&2; exit 1');
  const elsewhere = fakeGh(join(tmp(), 'node_modules', '.bin'), `touch ${marker}; exit 1`);
  const env = { ...process.env, PATH: [planted, inRepo, elsewhere, outside, process.env.PATH].join(':') };
  const r = spawnSync(process.execPath, [SCRIPT, root, '--out', join(tmp(), 'p.html')], { encoding: 'utf8', env });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /real gh missing/);
  assert.equal(existsSync(marker), false, 'the planted gh ran');
});

test('the same tree, answers and CHECK_NOW render byte-identical pages', () => {
  assert.equal(page(), page());
});

test('the page is self-contained: no script, no external request, a lang, light and dark, a scroll gutter', () => {
  const html = page();
  assert.doesNotMatch(html, /<script\b|\bsrc=|url\(|@import|<link\b/i);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /html \{ scrollbar-gutter: stable; \}/);
  assert.match(html, /user-select: all/);
  for (const href of html.match(/href="[^"]*"/g) ?? []) assert.match(href, /^href="https:\/\/github\.com\/acme\/harbour\/issues\/\d+"$/);
});

test('escapeHtml drops a bidi override; escapeShown shows it as \\u202e; both escape markup', () => {
  assert.equal(escapeHtml('a‮b<&>"\''), 'ab&lt;&amp;&gt;&quot;&#39;');
  assert.equal(escapeShown('a‮b<&>"\''), 'a\\u202eb&lt;&amp;&gt;&quot;&#39;');
});

test('a root given without --out is the one read, and the page lands in the temp dir', () => {
  const home = tmp();
  const r = spawnSync(process.execPath, [SCRIPT, join(FIX, 'none')], { encoding: 'utf8', cwd: home, env: { ...process.env, TMPDIR: home } });
  assert.equal(r.status, 0, r.stderr);
  const file = join(realpathSync(home), 'work-order', 'acme-harbour.html');
  assert.equal(realpathSync(r.stdout.trim()), file);
  assert.match(readFileSync(file, 'utf8'), /No milestone is active/);
});

test('real gh answers a missing issue with data, a NOT_FOUND error and exit 1: the page says "not found", any other error stops it', () => {
  const answer = (errors) => `if [ "$1" = pr ]; then echo '[]'; exit 0; fi\necho '${JSON.stringify({ data: { repository: { i10: null, i11: null, i16: null } }, errors })}'; exit 1`;
  const run = (errors) => {
    const bin = fakeGh(join(tmp(), 'bin'), answer(errors));
    const saved = process.env.PATH;
    process.env.PATH = `${bin}:${saved}`;
    try {
      return render(collect(join(FIX, 'full'), realGh(join(FIX, 'full'))));
    } finally {
      process.env.PATH = saved;
    }
  };
  assert.match(text(run([{ type: 'NOT_FOUND' }])), /#10 not found/);
  assert.throws(() => run([{ type: 'NOT_FOUND' }, { type: 'FORBIDDEN' }]), /gh failed/);
});

test('an issue number too large to be one, or a Touches line too long, never reaches a query or the page', () => {
  const w = world();
  w.issues[2] = issue(16, { body: body({ blockedBy: `#${'9'.repeat(30)}, #13`, touches: Array.from({ length: 31 }, (_, i) => `ci/${i}/**`).join(', ') }) });
  const gh = stub(w);
  const leaf = collect(join(FIX, 'full'), gh).milestone.items[2].leaves[0];
  assert.deepEqual(leaf.blockers.map((b) => b.n), [13]);
  assert.equal(leaf.touches, null);
  assert.ok(gh.calls.every((c) => !c.join(' ').includes('999999999')));
});
