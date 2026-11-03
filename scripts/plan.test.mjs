#!/usr/bin/env node
// The planner and the owed things it ranks (F-17 §1 to §3, dev/features/parallel-plan.md; #538). One test per rule of §3,
// then the owner's order, the shaping rules (AR-4, AR-6 of the 0.3 review) and the wording that rides this step. Every
// owed thing here is built by owed.mjs from its kind's row, so a fact the table gets wrong fails a test too.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import test from 'node:test';
import { STEPS } from '../ci/checks/lib/steps.mjs';
import { form, isKey, KIND_ORDER, KINDS, line, ownerBusy, thing, WHO } from '../ci/checks/lib/owed.mjs';
import { citationFor, decisionThings } from '../ci/checks/lib/decision-lines.mjs';
import { CAP, OFFLINE, plan } from '../ci/checks/lib/plan.mjs';

// An owed thing of a kind, with files and what a case changes.
const owe = (kind, f = {}) => thing(kind, { text: `${kind} text.`, files: [], ...f });
const AGENT_MAIN = { who: 'agent', files: ['apps/**'] };
const OWNER_MAIN = { who: 'you', files: ['docs/PRD.md'] };
const run = (o) => plan({ main: AGENT_MAIN, owed: [], leaves: [], inProgress: [], shape: null, online: true, ...o });
const keys = (xs) => xs.map((t) => t.key);
const leaf = (n, f = {}) => ({ n, title: `leaf ${n}`, ready: true, claimed: false, touches: [`src/l${n}/**`], ...f });

test('waits: a thing waiting on a key still in the run, or on a phrase, is not offered; on a key that left the run, it is', () => {
  const cite = owe('owed-citation', { key: 'owed-citation:D-1:F-6', files: ['dev/features/a.md'] });
  const review = (waits) => owe('feature-review', { key: 'feature-review:a', waits, waitsWords: 'the citation below', files: ['docs/reviews/**'] });
  assert.deepEqual(keys(run({ owed: [cite, review(cite.key)] }).parallel), ['owed-citation:D-1:F-6']);
  assert.deepEqual(keys(run({ owed: [review(cite.key)] }).parallel), ['feature-review:a']);
  assert.deepEqual(keys(run({ owed: [review('its doc')] }).parallel), []);
  assert.equal(run({ owed: [review('its doc')] }).rest[0].startable, false);
});

test('unknown files: a thing whose files are null is never offered, and is still startable', () => {
  const r = run({ owed: [owe('design', { files: null })] });
  assert.deepEqual(r.parallel, []);
  assert.equal(r.rest[0].startable, true);
});

test('overlap: files that meet the main step, work in progress or a pick already taken keep a thing out; [] meets nothing', () => {
  const t = (key, files, kind = 'design') => owe(kind, { key, files });
  assert.deepEqual(keys(run({ owed: [t('a', ['apps/web/x.ts'])] }).parallel), [], 'main step');
  assert.deepEqual(keys(run({ owed: [t('a', ['docs/a.md'])], inProgress: [['docs/**']] }).parallel), [], 'work in progress');
  assert.deepEqual(keys(run({ owed: [t('a', ['docs/a.md']), t('b', ['docs/a.md'])] }).parallel), ['a'], 'a pick already taken');
  assert.deepEqual(keys(run({ owed: [t('a', [])], inProgress: [['docs/**']] }).parallel), ['a'], 'no files at all');
  assert.deepEqual(keys(run({ owed: [t('a', ['docs/a.md'])], inProgress: [null] }).parallel), [], 'work in progress with unknown files meets everything');
  assert.deepEqual(keys(plan({ main: { who: 'agent', files: null }, owed: [t('a', ['docs/a.md'])], online: true }).parallel), [], 'a main step with unknown files');
});

test('the person rule: the owner is never offered two things, the main step included', () => {
  const you = (key) => owe('open-decision', { key, rank: 2, files: [`${key}.md`] });
  assert.deepEqual(keys(run({ owed: [you('a'), you('b')] }).parallel), ['a'], 'one owner thing beside an agent step');
  assert.deepEqual(keys(plan({ main: OWNER_MAIN, owed: [you('a')], online: true }).parallel), [], 'an owner step');
  const both = owe('shape', { key: 'shape:x', files: ['x.md'] });
  assert.deepEqual(keys(plan({ main: { who: 'you and an agent', files: [] }, owed: [both], online: true }).parallel), []);
  const either = (key) => owe('risk-tracker', { key, files: [`${key}.md`] });
  assert.deepEqual(keys(plan({ main: OWNER_MAIN, owed: [either('a'), either('b')], online: true }).parallel), ['a', 'b'], '`you or an agent` is agent work');
});

test('rank 5 blocks nothing status tracks: never offered, never startable', () => {
  const r = run({ owed: [owe('agent-rows', { files: ['AGENT.md'] })] });
  assert.deepEqual(r.parallel, []);
  assert.equal(r.rest[0].startable, false);
});

test('the cap counts the main step: at most 2 picks, and the rest stay startable', () => {
  assert.equal(CAP, 3);
  const t = (key) => owe('owed-check', { key, files: [`${key}.md`] });
  const r = run({ owed: ['a', 'b', 'c', 'd'].map(t) });
  assert.deepEqual(keys(r.parallel), ['a', 'b']);
  assert.deepEqual(r.rest.map((x) => [x.key, x.startable]), [['c', true], ['d', true]]);
});

test('the order within a rank: ranks soonest first, §2\'s table order inside a rank, a date first in rank 4', () => {
  const t = (kind, key, f = {}) => owe(kind, { key, files: [`${key}.md`], ...f });
  const lesson = (key, date) => t('lesson', key, { date, who: 'agent' });
  const owed = [lesson('late', '2026-12-01'), lesson('soon', '2026-11-05'), t('design', 'design'), t('prd-review', 'review'), t('owed-check', 'check')];
  const r = plan({ main: { who: 'agent', files: [] }, owed, online: true });
  assert.deepEqual(keys(r.parallel), ['check', 'review'], 'rank 1 before rank 2, the table\'s prd-review before design');
  assert.deepEqual(r.rest.map((x) => x.key), ['late', 'soon', 'design'], 'rest keeps the order it came in');
  const lessons = plan({ main: { ...AGENT_MAIN, files: [] }, owed: owed.slice(0, 2), online: true });
  assert.deepEqual(keys(lessons.parallel), ['soon', 'late'], 'in rank 4 the earlier date comes first');
  assert.ok(KIND_ORDER.indexOf('prd-review') < KIND_ORDER.indexOf('design'));
});

test('the owner\'s order: beside an agent step, an untested value risk is taken and an open question in the PRD is marked startable', () => {
  const risk = owe('risk-test', { key: 'risk-test', files: ['docs/product/evidence/**', 'docs/product/FRAME.md'] });
  const question = owe('open-question', { key: 'open-question:docs/PRD.md:9', rank: 2, words: "the PRD's approval", files: ['docs/PRD.md'] });
  const r = run({ owed: [question, risk] });
  assert.deepEqual(keys(r.parallel), ['risk-test']);
  assert.deepEqual(r.rest.map((x) => [x.key, x.startable]), [['open-question:docs/PRD.md:9', true]]);
});

test('a shaping main step: it is the owner\'s work too, so an owner thing with no overlap is not taken', () => {
  const t = owe('risk-test', { files: ['docs/product/evidence/**'] });
  const r = plan({ main: { who: 'you and an agent', files: ['docs/milestones/**', 'docs/PRD.md'], kind: 'shape' }, owed: [t], shape: { id: 'M2', n: 1 }, online: true });
  assert.deepEqual(r.parallel, []);
  assert.equal(r.rest[0].startable, true);
});

test('the skeleton: not taken beside a main step that writes package.json, taken beside one that writes docs/product only', () => {
  const skeleton = owe('skeleton', { key: 'skeleton:M1', files: ['docs/milestones/M1.md', 'apps/web/**', 'package.json', 'pnpm-lock.yaml'] });
  assert.deepEqual(plan({ main: { who: 'you', files: ['package.json'] }, owed: [skeleton], online: true }).parallel, []);
  assert.deepEqual(keys(plan({ main: { who: 'you', files: ['docs/product/**'] }, owed: [skeleton], online: true }).parallel), ['skeleton:M1']);
});

test('offline: every pick ends with the sentence that says pull requests were not read; online none does', () => {
  const owed = [owe('owed-check', { key: 'a', files: ['a.md'] }), owe('owed-check', { key: 'b', files: ['b.md'] })];
  const off = run({ owed, leaves: [leaf(1)], online: false });
  assert.equal(off.parallel.length, 2);
  for (const p of off.parallel) assert.ok(p.text.endsWith(` ${OFFLINE}`), p.text);
  assert.ok(owed.every((t) => !t.text.includes(OFFLINE)), 'the input is not changed');
  for (const p of run({ owed }).parallel) assert.ok(!p.text.includes(OFFLINE));
  assert.equal(OFFLINE, 'Status did not read open pull requests, so check them for the same files first.');
});

test('three ready leaves offer no shaping; one ready leaf with an unstarted item offers it beside the leaf while the owner is free', () => {
  const three = plan({ main: { who: 'agent', files: leaf(1).touches, issue: 1 }, leaves: [leaf(1), leaf(2), leaf(3)], shape: { id: 'M2', n: 4 }, online: true });
  assert.deepEqual(keys(three.parallel), ['leaf:2', 'leaf:3']);
  const one = plan({ main: { who: 'agent', files: leaf(1).touches, issue: 1 }, leaves: [leaf(1)], shape: { id: 'M2', n: 4 }, online: true });
  assert.deepEqual(keys(one.parallel), ['shape:M2#4']);
  assert.match(one.parallel[0].text, /\/log-feature M2#4/);
  const busy = plan({ main: { who: 'you', files: ['docs/PRD.md'] }, leaves: [leaf(1)], shape: { id: 'M2', n: 4 }, online: true });
  assert.deepEqual(keys(busy.parallel), ['leaf:1'], 'the owner is busy, so only the agent leaf');
});

test('a main step that shapes the item is not offered again as a pick', () => {
  const r = plan({ main: { who: 'agent', files: ['elsewhere/**'], kind: 'shape' }, shape: { id: 'M2', n: 1 }, online: true });
  assert.deepEqual(r.parallel, []);
});

test('AR-4: three ready leaves, all claimed, and an unstarted item: shaping is offered beside the "Finish the open work" step', () => {
  const claimed = [1, 2, 3].map((n) => leaf(n, { claimed: true }));
  const r = plan({ main: { who: 'agent', files: ['src/l1/**'] }, leaves: claimed, shape: { id: 'M2', n: 4 }, inProgress: [['src/l1/**']], online: true });
  assert.deepEqual(keys(r.parallel), ['shape:M2#4']);
});

test('AR-6: a rank-1 merge is taken ahead of the ready leaves and shaping, and the person rule leaves shaping out', () => {
  const merge = owe('merge', { key: 'merge:7', rank: 1, words: 'the active milestone closing', files: [] });
  const two = plan({ main: { who: 'agent', files: ['src/l1/**'], issue: 1 }, owed: [merge], leaves: [leaf(1), leaf(2), leaf(3)], online: true });
  assert.deepEqual(keys(two.parallel), ['merge:7', 'leaf:2']);
  const r = plan({ main: { who: 'agent', files: ['src/l1/**'], issue: 1 }, owed: [merge], leaves: [leaf(1)], shape: { id: 'M2', n: 4 }, online: true });
  assert.deepEqual(keys(r.parallel), ['merge:7']);
});

test('a ready leaf as the main step, a second ready leaf, an unstarted item and an untested existential risk: the leaf and shaping are taken, the risk is startable', () => {
  const risk = owe('existential', { key: 'existential:RISK-1', files: ['docs/PRD.md', 'docs/product/FRAME.md'] });
  const r = plan({ main: { who: 'agent', files: leaf(1).touches, issue: 1 }, owed: [risk], leaves: [leaf(1), leaf(2)], shape: { id: 'M2', n: 4 }, online: true });
  assert.deepEqual(keys(r.parallel), ['leaf:2', 'shape:M2#4']);
  assert.deepEqual(r.rest.map((x) => [x.key, x.startable]), [['existential:RISK-1', true]]);
});

test('a claimed leaf, an unready leaf and the main step\'s own leaf are never picks', () => {
  const r = plan({ main: { who: 'agent', files: leaf(1).touches, issue: 1 }, leaves: [leaf(1), leaf(2, { claimed: true }), leaf(3, { ready: false }), leaf(4)], online: true });
  assert.deepEqual(keys(r.parallel), ['leaf:4']);
});

test('the main step\'s own leaf is never a pick, even when its files meet nothing', () => {
  const r = plan({ main: { who: 'agent', files: ['elsewhere/**'], issue: 1 }, leaves: [leaf(1)], online: true });
  assert.deepEqual(r.parallel, []);
});

test('a leaf number or milestone id that is not a whole number or an M<n> id is never put in a command', () => {
  const r = plan({ main: AGENT_MAIN, leaves: [leaf('15; rm'), leaf(1.5), leaf(0)], shape: { id: 'M2; x', n: 1 }, online: true });
  assert.deepEqual(r.parallel, []);
  assert.deepEqual(plan({ main: AGENT_MAIN, shape: { id: 'M2', n: '1 x' }, online: true }).parallel, []);
  assert.deepEqual(keys(plan({ main: AGENT_MAIN, shape: { id: 'M1.1', n: 2 }, online: true }).parallel), ['shape:M1.1#2']);
});

test('a thing that writes no file is offered beside a main step whose files are unknown', () => {
  const merge = owe('merge', { key: 'merge:7', rank: 1, who: 'agent', files: [] });
  assert.deepEqual(keys(plan({ main: { who: 'agent', files: null }, owed: [merge], online: true }).parallel), ['merge:7']);
});

test('offline, a pick that carries the line it printed before also ends with the sentence', () => {
  const t = { ...owe('owed-check', { key: 'a', files: ['a.md'] }), line: 'row.' };
  const off = run({ owed: [t], online: false }).parallel[0];
  assert.equal(line(off), `row. ${OFFLINE}`);
  assert.equal(line(run({ owed: [t] }).parallel[0]), 'row.');
});

test('issue numbers past 9999 are offered; a non-string milestone id, and files that are not an array, are refused', () => {
  assert.deepEqual(keys(plan({ main: AGENT_MAIN, leaves: [leaf(10234)], online: true }).parallel), ['leaf:10234']);
  const id = { toString: () => 'M2' };
  assert.deepEqual(plan({ main: AGENT_MAIN, shape: { id, n: 1 }, online: true }).parallel, []);
  assert.deepEqual(plan({ main: { who: 'agent', files: null }, leaves: [leaf(5, { touches: '' })], online: true }).parallel, []);
});

test('offline, a pick whose line is null still ends with the sentence on the line it prints', () => {
  const t = { ...owe('owed-check', { key: 'a', files: ['a.md'] }), line: null };
  assert.ok(line(run({ owed: [t], online: false }).parallel[0]).includes(OFFLINE));
  assert.ok(!line(run({ owed: [t], online: false }).parallel[0]).startsWith('null'));
});

test('two things that share a key: a pick does not take its twin out of the rest', () => {
  const a = owe('open-question', { key: 'k', rank: 2, who: 'agent', files: ['a.md'] });
  const b = owe('open-question', { key: 'k', rank: 2, who: 'agent', files: ['a.md'] });
  const r = run({ owed: [a, b] });
  assert.equal(r.parallel.length, 1);
  assert.equal(r.rest.length, 1);
});

test('a feature review finds the decision citation for its feature, whose key carries the padded F-07', () => {
  const record = { missing: null, strays: [], owed: () => [{ id: 'PD-1', feature: 7, docs: [] }, { id: 'PD-2', feature: 12, docs: [] }], fired: () => [], unreadable: () => [], unreadFolders: () => [] };
  const things = decisionThings(record, '2026-03-10');
  assert.equal(citationFor(things, [7])?.key, 'owed-citation:PD-1:F-07');
  assert.equal(citationFor(things, [3, 12])?.key, 'owed-citation:PD-2:F-12');
  assert.equal(citationFor(things, [8]), undefined);
});

test('the person rule reads the main step\'s who from §4\'s table: `yours` and `you and an agent` are the owner\'s, and STEPS gives the other cases', () => {
  assert.ok(ownerBusy('you') && ownerBusy('yours') && ownerBusy('you and an agent'));
  assert.ok(!ownerBusy('agent') && !ownerBusy('you or an agent') && !ownerBusy('fresh session'));
  assert.deepEqual(STEPS.filter((s) => ownerBusy(s.who)).map((s) => s.n), [0, 1, 2, 3, 6, 7]);
  const t = owe('open-decision', { rank: 2, files: ['decisions.md'] });
  assert.deepEqual(plan({ main: { who: STEPS[2].who, files: [] }, owed: [t], online: true }).parallel, []);
  assert.deepEqual(keys(plan({ main: { who: STEPS[5].who, files: [] }, owed: [t], online: true }).parallel), ['open-decision']);
});

test('owed things: every kind has a known who and a rank, §1\'s form rebuilds a line, and a key wait needs its words', () => {
  for (const [kind, k] of Object.entries(KINDS)) {
    assert.ok(WHO.includes(k.who), kind);
    assert.ok([1, 2, 3, 4, 5].includes(k.rank), kind);
    assert.ok(k.words, kind);
  }
  assert.throws(() => thing('no-such-kind', { files: [] }), /no kind/);
  assert.throws(() => thing('constructor', { files: [] }), /no kind/);
  assert.throws(() => thing('lesson', { text: 't' }), /needs its files/);
  assert.throws(() => thing('feature-review', { text: 't', waits: 'owed-citation:D-1:F-6' }), /waitsWords/);
  assert.equal(isKey('owed-citation:D-1:F-6'), true);
  assert.equal(isKey('its doc'), false);
  assert.equal(isKey('GitHub'), false);
  const t = thing('owed-check', { key: 'owed-check:#12:4', text: 'Run the check.', files: [] });
  assert.equal(form(t), '(you or an agent) Run the check. It blocks the active milestone closing. It waits on nothing.');
  assert.equal(line(t), form(t));
  assert.equal(line({ ...t, line: 'as before' }), 'as before');
  assert.equal(form(thing('parked', { text: 'Parked: q.' })), 'Parked: q. It blocks nothing status tracks. It waits on its tracker.');
});

test('file sets that are not arrays: a leaf, an owed thing, the main step or work in progress with one is treated as unknown, and nothing throws', () => {
  const main = { who: 'agent', files: ['apps/**'] };
  const ok = owe('owed-check', { key: 'ok', files: ['ok.md'] });
  const r = plan({ main, owed: [ok], leaves: [leaf(5, { touches: '' }), leaf(6, { touches: { 0: 'x' } }), leaf(7)], online: true });
  assert.deepEqual(keys(r.parallel), ['ok', 'leaf:7'], 'the leaves with no array of files are left out, the leaf and thing with one are kept');
  const bad = { ...owe('owed-check', { key: 'bad', files: [] }), files: 'docs/**' };
  assert.deepEqual(keys(plan({ main, owed: [bad, ok], online: true }).parallel), ['ok']);
  assert.deepEqual(keys(plan({ main, owed: [ok], inProgress: ['docs/**', { length: 1 }], online: true }).parallel), [], 'work in progress that is not an array of files meets everything');
  assert.deepEqual(keys(plan({ main: { who: 'agent', files: 'apps/**' }, owed: [ok], online: true }).parallel), [], 'a main step whose files are not an array');
  assert.deepEqual(keys(plan({ main, owed: [ok], inProgress: 'docs/**', online: true }).parallel), ['ok'], 'no list of work in progress is none');
});

test('offline, a pick with no line at all carries the sentence in the form it prints and does not start with undefined', () => {
  const t = owe('owed-check', { key: 'a', files: ['a.md'] });
  assert.ok(!('line' in t));
  const off = run({ owed: [t], online: false }).parallel[0];
  assert.ok(!('line' in off), 'no line is made up');
  assert.equal(line(off), `(you or an agent) ${t.text} ${OFFLINE} It blocks the active milestone closing. It waits on nothing.`, 'the sentence stands before It blocks (F-17 §3)');
  assert.ok(!line(off).startsWith('undefined'));
  const shaping = run({ shape: { id: 'M2', n: 4 }, online: false }).parallel[0];
  assert.ok(shaping.text.endsWith(OFFLINE) && !('line' in shaping));
  assert.ok(line(shaping).includes(OFFLINE) && !line(shaping).startsWith('undefined'));
});

test('the file sets the kinds write are the wide ones: a narrower set lets a pick overlap a file it writes', () => {
  const has = (kind, ...paths) => paths.forEach((p) => assert.ok(KINDS[kind].files.includes(p), `${kind} writes ${p}`));
  has('design', 'docs/milestones/**');
  has('shape', 'docs/milestones/**', 'docs/features/**', 'dev/features/**', 'docs/PRD.md', 'decisions.md');
  has('needs-shape', 'docs/features/**', 'dev/features/**', 'docs/milestones/**', 'decisions.md');
  const cite = decisionThings({ missing: null, strays: [], owed: () => [{ id: 'PD-1', feature: 7, docs: ['dev/features/a.md'] }], fired: () => [], unreadable: () => [], unreadFolders: () => [] }, '2026-03-10')[0];
  assert.deepEqual(cite.files, ['dev/features/a.md', 'docs/milestones/**']);
});
