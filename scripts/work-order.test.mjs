// The work-order page (F-07, dev/features/work-order.md): one case per Acceptance line, fixture roots in
// scripts/fixtures/work-order/, and a stub `gh` that answers from data below, so no test calls GitHub.

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, request } from 'node:http';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { escapeHtml, escapeShown } from '../ci/checks/lib/html.mjs';
import { collect, DEFAULT_PORT, keepFresh, parseArgs, realGh, render, serve } from '../ci/work-order.mjs';

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

// Deferred checks (F-09, #176): an item that owes a check is not finished, whatever the state of its issue.
const OWED = '   Owed: staging journey "book a walk" — staging';
function owing(n, ...lines) {
  const root = tmp();
  cpSync(join(FIX, 'full'), root, { recursive: true });
  const p = join(root, 'docs', 'milestones', 'M1-booking.md');
  const md = readFileSync(p, 'utf8').split('\n');
  md.splice(md.findIndex((l) => l.startsWith(`${n}. `)) + 1, 0, ...lines);
  writeFileSync(p, md.join('\n'));
  return root;
}
const shown = (html) => text(html).replace(/&#39;/g, "'");
const items = (html) => between(html, '<h2>Items</h2>', html.includes('<h2>Finished</h2>') ? '<h2>Finished</h2>' : '</main>');

test('an item with sub-issues that owes a check: its open rows are read as before, the heading says what is owed, and it is not finished', () => {
  const html = page(world(), owing(2, OWED));
  assert.match(nextOf(html), /#15/);
  assert.match(shown(items(html)), /2\. Slice with steps \(F-02\) · owes staging journey 'book a walk'/);
  assert.match(text(html), /#13 Issue 13 · PR #20 \(draft\)/);
  assert.match(html, /<code>\/work-ticket 15<\/code>/);
  const w = world();
  w.issues[1].subIssues.nodes = w.issues[1].subIssues.nodes.map((i) => ({ ...i, state: 'CLOSED', stateReason: 'COMPLETED' }));
  w.prs = [];
  const shut = page(w, owing(2, OWED));
  assert.match(shown(items(shut)), /2\. Slice with steps \(F-02\) · owes staging journey 'book a walk'/, 'every sub-issue closed, and still not finished');
  assert.match(between(shut, '<h2>Finished</h2>', '</main>'), /<summary>1 finished/);
  assert.match(between(page(w), '<h2>Finished</h2>', '</main>'), /<summary>2 finished/, 'without the Owed: line it is finished');
});

test('a single-issue item that owes a check: not in Next, its row reads "owes …" with no /work-ticket command, not finished', () => {
  const html = page(world(), owing(3, OWED));
  assert.doesNotMatch(nextOf(html), /#16/);
  assert.match(nextOf(page()), /#16/, 'without the Owed: line it is ready');
  assert.match(shown(items(html)), /#16 Issue 16 · owes staging journey 'book a walk'/);
  assert.doesNotMatch(text(html), /#16 Issue 16 · open/);
  assert.doesNotMatch(html, /\/work-ticket 16/);
  const model = collect(owing(3, OWED), stub(world()));
  assert.equal(model.milestone.items[2].leaves[0].ready, false);
});

test('an item whose issue was closed while it owes a check still reads "owes …", shown and not finished', () => {
  const html = page(world(), owing(1, OWED));
  assert.match(shown(items(html)), /1\. Finished slice \(F-01\) · owes staging journey 'book a walk'/);
  assert.match(shown(items(html)), /#10 Issue 10 · owes staging journey 'book a walk'/);
  assert.doesNotMatch(between(html, '<h3><span class="id">1.</span>', '</article>'), /done or dropped/, 'the row is not folded away');
  assert.doesNotMatch(html, /<h2>Finished<\/h2>/);
  assert.doesNotMatch(html, /\/work-ticket 10/);
});

test('a single-issue item with an open PR that owes a check: the row reads "PR #n · owes …"', () => {
  const w = world();
  w.prs.push({ number: 21, isDraft: false, body: 'Part of #16' });
  const html = page(w, owing(3, OWED));
  assert.match(shown(items(html)), /#16 Issue 16 · PR #21 · owes staging journey 'book a walk'/);
  assert.doesNotMatch(nextOf(html), /#16/);
});

test('an unresolved fail reads "failed …", an unreadable line "owes" the line itself; a recorded pass owes nothing; project text is escaped', () => {
  const url = (n) => `https://github.com/acme/harbour/issues/16#issuecomment-${n}`;
  const failed = page(world(), owing(3, `   Ran: journey <b>"x"</b> — staging 2026-03-10 fail ${url(1)}`));
  assert.match(items(failed), /Single slice \(F-03\) · failed journey &lt;b&gt;&#39;x&#39;&lt;\/b&gt;<\/h3>/);
  assert.doesNotMatch(failed, /<b>'x'/);
  assert.doesNotMatch(failed, /issuecomment/, 'a URL is never on the page');
  const unreadable = page(world(), owing(3, '- owed: x — staging'));
  assert.match(shown(items(unreadable)), /3\. Single slice \(F-03\) · owes - owed: x — staging/);
  assert.doesNotMatch(nextOf(unreadable), /#16/);
  const passed = page(world(), owing(3, `   Ran: x — staging 2026-03-09 fail ${url(1)}`, `   Ran: x — staging 2026-03-10 pass ${url(2)}`));
  assert.equal(passed, page(), 'the page reads as it does with no check lines');
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

// --watch (#177): the refresh tag, the interval, the zone of the stamp, and a failed refresh keeping the last page.
test('the refresh tag is on the page only with --watch, carries the interval, and the page still has no script', () => {
  const model = collect(join(FIX, 'full'), stub(world()));
  assert.doesNotMatch(render(model), /http-equiv/i);
  const html = render(model, { refresh: 45 });
  assert.match(html, /<meta http-equiv="refresh" content="45">/);
  assert.doesNotMatch(html, /<script\b/i);
  const none = render(collect(join(FIX, 'none'), stub(world())), { refresh: 60 });
  assert.match(none, /<meta http-equiv="refresh" content="60">/);
});

test('--every below 15 seconds, not a whole number, or without --watch is refused; 60 is the default', () => {
  assert.equal(parseArgs(['--watch']).every, 60);
  assert.equal(parseArgs(['--watch', '--every', '15']).every, 15);
  for (const bad of [['--watch', '--every', '14'], ['--watch', '--every', '0'], ['--watch', '--every', '1.5'], ['--watch', '--every', '-20'], ['--watch', '--every', 'soon'], ['--watch', '--every'], ['--every', '30'], ['--watch', '--bogus'], ['a', 'b']]) {
    assert.ok(parseArgs(bad).error, `accepted ${bad.join(' ')}`);
  }
  const r = spawnSync(process.execPath, [SCRIPT, join(FIX, 'none'), '--watch', '--every', '14'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--every is whole seconds, 15 to 86400/);
  assert.equal(r.stdout, '');
});

test('the page says when it was updated, in the project zone', () => {
  assert.match(text(page()), /Updated 2026-03-11 12:00 UTC from acme\/harbour/);
  const root = tmp();
  cpSync(join(FIX, 'full'), root, { recursive: true });
  const agent = join(root, 'AGENT.md');
  writeFileSync(agent, readFileSync(agent, 'utf8').replace('| Timezone | `UTC` |', '| Timezone | `America/Toronto` |'));
  assert.match(text(render(collect(root, stub(world())))), /Updated 2026-03-11 08:00 EDT from acme\/harbour/);
});

test('a refresh that fails keeps the last good page, says why and when it was last updated, and the loop goes on', async () => {
  const out = join(tmp(), 'page.html');
  const w = world();
  const good = stub(w);
  let broken = false;
  const gh = (args) => {
    if (broken) throw Object.assign(new Error('x'), { stderr: 'HTTP 502: bad gateway\nsecond line' });
    return good(args);
  };
  const model = collect(join(FIX, 'full'), gh);
  const first = render(model, { refresh: 15 });
  writeFileSync(out, first);
  const said = [];
  let round = 0;
  const seen = [];
  await keepFresh(join(FIX, 'full'), gh, out, 15, {
    model,
    rounds: 3,
    say: (t) => said.push(t),
    sleep: async () => {
      round += 1;
      broken = round === 2;
      if (round > 1) seen.push(readFileSync(out, 'utf8'));
    },
  });
  seen.push(readFileSync(out, 'utf8'));
  assert.equal(seen.length, 3);
  // seen: after a good refresh, after the failed one, after the next good one.
  const failed = seen[1];
  assert.match(text(failed), /Last updated 2026-03-11 12:00 UTC; the latest refresh failed: gh failed \(see gh auth status\): HTTP 502: bad gateway from acme\/harbour/);
  assert.doesNotMatch(failed, /second line/);
  assert.match(failed, /content="15"/);
  assert.equal(failed.replace(/<p class="meta">[^<]*<\/p>/, ''), first.replace(/<p class="meta">[^<]*<\/p>/, ''), 'the rest of the page is the last good one');
  assert.match(text(seen[2]), /Updated 2026-03-11 12:00 UTC/, 'the next refresh that works clears the line');
  assert.doesNotMatch(seen[0] + seen[2], /refresh failed/);
  assert.equal(said.length, 1);
  assert.match(said[0], /the latest refresh failed: gh failed/);
  assert.equal(existsSync(`${out}.tmp`), false);
});

test('--watch: the first render that fails exits 1; one that works prints the path once, writes a refreshing page and keeps running', async () => {
  const out = join(tmp(), 'page.html');
  const bin = fakeGh(join(tmp(), 'bin'), 'echo "not logged in" >&2; exit 1');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const bad = spawnSync(process.execPath, [SCRIPT, join(FIX, 'full'), '--out', out, '--watch'], { encoding: 'utf8', env });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /gh auth status.*not logged in/);
  assert.equal(existsSync(out), false);

  const child = spawn(process.execPath, [SCRIPT, join(FIX, 'none'), '--out', out, '--watch', '--every', '15'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  const line = await new Promise((res, rej) => {
    child.on('error', rej);
    child.on('exit', (c) => rej(new Error(`exited ${c} before printing the path`)));
    child.stdout.on('data', (d) => {
      stdout += d;
      if (stdout.includes('\n')) res(stdout);
    });
  }).finally(() => child.removeAllListeners('exit'));
  const exited = new Promise((res) => child.on('exit', (code, signal) => res({ code, signal })));
  try {
    assert.equal(line, `${out}\n`);
    assert.match(readFileSync(out, 'utf8'), /<meta http-equiv="refresh" content="15">/);
    assert.equal(child.exitCode, null, 'still running');
  } finally {
    child.kill('SIGINT');
  }
  const { code } = await exited;
  assert.equal(code, 130);
  assert.equal(existsSync(`${out}.tmp`), false);
});

// --serve (#183): the page on 127.0.0.1 for the owner's browser, one fixed file, nothing else.
const PAGE = '<!doctype html><title>page</title><p>SENTINEL-served</p>';
const ask = (port, { method = 'GET', path = '/', host = `127.0.0.1:${port}` } = {}) =>
  new Promise((res, rej) => {
    const r = request({ host: '127.0.0.1', port, method, path, headers: { host } }, (m) => {
      let text = '';
      m.on('data', (d) => (text += d));
      m.on('end', () => res({ status: m.statusCode, headers: m.headers, text }));
    });
    r.on('error', rej);
    r.end();
  });
const served = async (port) => {
  const file = join(tmp(), 'page.html');
  writeFileSync(file, PAGE);
  const s = await serve(file, { port });
  return { ...s, file, stop: () => new Promise((r) => (s.server.closeAllConnections(), s.server.close(r))) };
};

test('--serve implies --watch; --port is 1 to 65535 and only with --serve; without --serve nothing listens', () => {
  assert.deepEqual([parseArgs(['--serve']).serve, parseArgs(['--serve']).watch, parseArgs(['--serve']).port], [true, true, undefined]);
  assert.equal(parseArgs(['--serve', '--port', '8080']).port, 8080);
  assert.equal(parseArgs(['--serve', '--every', '20']).every, 20);
  for (const bad of [['--port', '8080'], ['--serve', '--port', '0'], ['--serve', '--port', '65536'], ['--serve', '--port', 'x'], ['--serve', '--port'], ['--serve', '--port', '-1']]) {
    assert.ok(parseArgs(bad).error, bad.join(' '));
  }
  const plain = parseArgs([]);
  assert.deepEqual([plain.serve, plain.watch], [false, false]);
});

test('the server is bound to 127.0.0.1 only', async () => {
  const s = await served(0);
  try {
    assert.deepEqual([s.server.address().address, s.server.address().family], ['127.0.0.1', 'IPv4']);
    assert.equal(s.url, `http://127.0.0.1:${s.port}/`);
  } finally {
    await s.stop();
  }
});

test('GET and HEAD of / answer 200 with the current page; any other path is 404 and any other method 405', async () => {
  const s = await served(0);
  try {
    const get = await ask(s.port);
    assert.equal(get.status, 200);
    assert.equal(get.text, PAGE);
    const head = await ask(s.port, { method: 'HEAD' });
    assert.deepEqual([head.status, head.text, head.headers['content-length']], [200, '', String(Buffer.byteLength(PAGE))]);
    writeFileSync(s.file, `${PAGE}<p>newer</p>`);
    assert.match((await ask(s.port)).text, /newer/);
    for (const path of ['/index.html', '/..%2f..%2fetc%2fpasswd', '/../../etc/passwd', '/%2e%2e/', '//', '/x/', '/page.html']) {
      const r = await ask(s.port, { path });
      assert.equal(r.status, 404, path);
      assert.doesNotMatch(r.text, /SENTINEL-served/);
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) assert.equal((await ask(s.port, { method })).status, 405, method);
    assert.equal((await ask(s.port, { method: 'POST', path: '/x' })).status, 405);
    assert.equal((await ask(s.port, { method: 'POST' })).headers.allow, 'GET, HEAD');
  } finally {
    await s.stop();
  }
});

test('a Host that is not 127.0.0.1:<port> or localhost:<port> answers 403, and the page never leaves', async () => {
  const s = await served(0);
  try {
    for (const host of [`evil.example:${s.port}`, `evil.example`, `127.0.0.1`, `localhost`, `127.0.0.1:${s.port + 1}`, `[::1]:${s.port}`, `127.0.0.1.evil.example:${s.port}`]) {
      const r = await ask(s.port, { host });
      assert.equal(r.status, 403, JSON.stringify(host));
      assert.doesNotMatch(r.text, /SENTINEL-served/);
    }
    assert.equal((await ask(s.port, { host: `localhost:${s.port}` })).status, 200);
    assert.equal((await ask(s.port, { host: `LOCALHOST:${s.port}` })).status, 200);
    assert.equal((await ask(s.port, { method: 'POST', host: 'evil.example' })).status, 403);
  } finally {
    await s.stop();
  }
});

test('every response carries the content type, no-store, nosniff and a policy that allows inline styles and nothing else', async () => {
  const s = await served(0);
  try {
    for (const r of [await ask(s.port), await ask(s.port, { path: '/x' }), await ask(s.port, { method: 'POST' }), await ask(s.port, { host: 'evil.example' })]) {
      assert.equal(r.headers['cache-control'], 'no-store');
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
      const csp = r.headers['content-security-policy'];
      assert.match(csp, /^default-src 'none'; style-src 'unsafe-inline'/);
      assert.doesNotMatch(csp, /script-src|https?:|\*/);
    }
    assert.equal((await ask(s.port)).headers['content-type'], 'text/html; charset=utf-8');
    assert.doesNotMatch((await ask(s.port)).text, /<script/i);
  } finally {
    await s.stop();
  }
});

test('the rendered page, served, still has no script and a refresh tag', async () => {
  const s = await served(0);
  try {
    writeFileSync(s.file, render(collect(join(FIX, 'none'), () => '[]'), { refresh: 60 }));
    const r = await ask(s.port);
    assert.doesNotMatch(r.text, /<script/i);
    assert.match(r.text, /<meta http-equiv="refresh" content="60">/);
  } finally {
    await s.stop();
  }
});

test('with no port the default is tried first and a taken one falls back to a free port; a taken --port rejects', async () => {
  const taker = createServer();
  const held = await new Promise((res) => {
    taker.once('error', () => res(false));
    taker.listen(DEFAULT_PORT, '127.0.0.1', () => res(true));
  });
  const file = join(tmp(), 'page.html');
  writeFileSync(file, PAGE);
  const s = await serve(file);
  try {
    assert.notEqual(s.port, DEFAULT_PORT, held ? 'the default was ours and taken' : 'the default was taken by something else');
    assert.equal((await ask(s.port)).status, 200);
    await assert.rejects(serve(file, { port: s.port }), /port \d+ is taken/);
  } finally {
    s.server.closeAllConnections();
    s.server.close();
    if (held) taker.close();
  }
});

test('--serve: prints the address once and nothing else, serves until SIGINT, which closes the server; a taken --port exits 1', async () => {
  const out = join(tmp(), 'page.html');
  const child = spawn(process.execPath, [SCRIPT, join(FIX, 'none'), '--out', out, '--serve'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  await new Promise((res, rej) => {
    child.on('error', rej);
    child.on('exit', (c) => rej(new Error(`exited ${c} before printing the address`)));
    child.stdout.on('data', (d) => {
      stdout += d;
      if (stdout.includes('\n')) res();
    });
  }).finally(() => child.removeAllListeners('exit'));
  const exited = new Promise((res) => child.on('exit', (code) => res(code)));
  const m = stdout.match(/^http:\/\/127\.0\.0\.1:(\d+)\/\n$/);
  assert.ok(m, `one address line, got ${JSON.stringify(stdout)}`);
  const port = Number(m[1]);
  try {
    const r = await ask(port);
    assert.equal(r.status, 200);
    assert.equal(r.text, readFileSync(out, 'utf8'));
    assert.match(r.text, /<meta http-equiv="refresh" content="60">/);
    const clash = spawnSync(process.execPath, [SCRIPT, join(FIX, 'none'), '--out', join(tmp(), 'b.html'), '--serve', '--port', String(port)], { encoding: 'utf8' });
    assert.equal(clash.status, 1);
    assert.match(clash.stderr, new RegExp(`port ${port} is taken`));
    assert.equal(clash.stdout, '');
  } finally {
    child.kill('SIGINT');
  }
  assert.equal(await exited, 130);
  await assert.rejects(ask(port), { code: 'ECONNREFUSED' });
});

test('without --serve the run exits on its own (no listener keeps it alive) and prints the file path', async () => {
  const out = join(tmp(), 'page.html');
  const r = spawnSync(process.execPath, [SCRIPT, join(FIX, 'none'), '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, `${out}\n`);
});
