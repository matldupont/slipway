#!/usr/bin/env node
// status — where the project is, and the next step on the slipway path (SLIPWAY.md). Deterministic: read
// from the repository, no model, no network. Agents believe whatever state they are handed,
// so the state is computed, never hand-maintained — a hand-kept plan reads "in progress"
// long after the work finished.
//
//   node ci/status.mjs [root]            print
//   node ci/status.mjs --write [root]    also write STATE.md (gitignored)
//   node ci/status.mjs --hook [root]     SessionStart hook output: the same text as context, and STATE.md rewritten
//   node ci/status.mjs --refresh [root]  the Stop hook's call: rewrite STATE.md, print nothing, cut off after 20 s
//
// Free text a document carries (a risk's assumption and a decision's title in a line, a Contents item, a [NEEDS CLARIFICATION] or
// [PARKED] marker) is quoted through excerpt(): one line, cut at a word, unsafe characters dropped, in double
// quotes the text cannot close. Identifiers read from a file that no check shapes (a risk or milestone id, a file name) print only in their plain shape, else in words. The few that print as read (the Active milestone line's title, a lesson id, the PRD version), each line passed through escapeControl at
// the end. Anything a session must act on (a command, an id) is built from validated values, never from the text.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { today as localToday } from './checks/lib/clock.mjs';
import { decisionLines } from './checks/lib/decision-lines.mjs';
import { resolveDecision } from './checks/lib/decision-ref.mjs';
import { readDecisions, testStart } from './checks/lib/decisions.mjs';
import { designBefore, hasAccessibilityLine } from './checks/lib/design.mjs';
import { frontEnd } from './checks/lib/frame.mjs';
import { frontmatter } from './checks/lib/frontmatter.mjs';
import { NOT_A_FILE, readManifest, readProjectFile, sha256 } from './checks/lib/manifest.mjs';
import { commentLines, replaceComments, section } from './checks/lib/markdown.mjs';
import { appetiteClock, compareMilestones, contents, marker, MILESTONE_ID, milestoneId, milestoneKey, owing, parseAppetite, readMilestones, started } from './checks/lib/milestones.mjs';
import { readRegister, milestonesNamed } from './checks/lib/register.mjs';
import { escapeControl, excerpt } from './checks/lib/report.mjs';
import { isPrdPath, quotedVersion, readPlain, reviewProvenance, versionLines } from './checks/lib/review-header.mjs';
import { owedReviews } from './checks/lib/spec-review.mjs';
import { readDeadlines, readRisks, settled, TRACKER } from './checks/lib/risks.mjs';
import { stepLines, whoLine } from './checks/lib/steps.mjs';
import { discoverWorkspace } from './checks/lib/workspace.mjs';

const args = process.argv.slice(2);
// The turn-end refresh runs before the gate inside the Stop hook's budget (#397): a read that never returns (a pipe left
// where a file is read) is cut off after 20 s, and the hook goes on.
const REFRESH_LIMIT_MS = 20_000;
if (args.includes('--refresh')) {
  // The work runs in a child killed at the limit, before this process reads anything; a temporary file the child
  // leaves is ignored (.gitignore). Never fails, prints nothing.
  spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--refresh-run', ...args.filter((a) => a !== '--refresh')], { stdio: 'ignore', timeout: REFRESH_LIMIT_MS, killSignal: 'SIGKILL' });
  process.exit(0);
}
const root = args.find((a) => !a.startsWith('--')) ?? '.';
let today;
try {
  today = localToday(root);
} catch (e) {
  process.stderr.write(`status: ${escapeControl(e.message)}\n`);
  process.exit(2);
}
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null);
// A file name printed in a line: only in the plain shape, else in words (a name a pull request carries is project text).
const named = (f) => (/^[A-Za-z0-9._\/-]{1,100}$/.test(String(f)) ? f : 'a file with an unusual name');
// Ids read from files no check shapes: printed only as M<n> or RISK-n (at most 9 digits), else counted in words.
const MID = new RegExp(`^${MILESTONE_ID}$`);
// A tracker reference is printed only in the shapes the checks read (`owner/repo#n`, `#n`, a decision id), else as "tracked".
const trackerRef = (t) => (/^(?:[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100})?#\d{1,9}$|^(?:OD|PD|D)-\d{1,9}$/.test(String(t)) ? t : 'tracked');
const RID = /^RISK-\d{1,9}$/i;
const idList = (list, ref, more) => {
  const ok = list.filter((x) => ref.test(String(x.id))).map((x) => x.id);
  const odd = list.length - ok.length;
  const shown = ok.length > 3 ? `${ok.slice(0, 3).join(', ')} and ${ok.length - 3 + odd} more` : ok.join(', ');
  return ok.length ? (odd && ok.length <= 3 ? `${shown} and ${odd} more` : shown) : more;
};
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ---- facts
const agent = read('AGENT.md') ?? '';
// The AGENT.md rows only the owner can fill, still holding their `<…>` placeholder (backticked or not).
const placeholders = [...agent.matchAll(/^\|\s*(Product name|Issue repo|GitHub project|Timezone|Domain invariants doc)[^|]*\|\s*`?</gm)].map((m) => m[1]);
const bootstrapped = placeholders.length === 0;
let packages = 0;
try { packages = discoverWorkspace(root).packages.length; } catch { /* reported as 0 */ }

const frameMd = read('docs/product/FRAME.md');
const frame = frameMd ? frontmatter(frameMd)?.status ?? 'unknown' : 'missing';
const risks = frameMd ? readRisks(root, frameMd).rows : [];
// A value risk with no Result is scheduled when a tracker names where its test is being run, untested
// otherwise. K1 needs the tracker once any milestone is underway.
const untestedValue = risks.filter((r) => r.value && !r.tested);
const untracked = untestedValue.filter((r) => !r.tracker);
// The test milestones, shaping or active, that the owner's decision started for the risk (#477, decisions.mjs → testStart):
// K1 and status read one answer. Read at call time: `ms` is below.
const testedIn = (r) => ms.filter((m) => (m.status === 'shaping' || m.status === 'active') && frees(m, r)).map((m) => m.id);
const riskState = (r) => {
  const state = riskStateAlone(r);
  const tests = !r.tested && r.value ? testedIn(r) : [];
  return tests.length ? `${state}, being tested in ${tests.join(', ')}` : state;
};
// Settled by experience only when K1 would pass it: a missing `Wrong if:` line is said, never "settled".
const riskStateAlone = (r) => {
  if (r.claimsExperience && !r.experience) return `${r.id} needs an experience reason (table stakes, creator is the user or domain expertise)`;
  if (r.experience) return r.refutation ? `${r.id} settled by experience (${r.experience.rationale})` : `${r.id} needs a Wrong if: line (experience: ${r.experience.rationale})`;
  if (r.builtAhead) return `${r.id} built ahead (${r.builtAhead})`;
  if (r.tested) return `${r.id} tested`;
  if (!r.tracker) return r.value ? `${r.id} untested (no tracker)` : `${r.id} untested`;
  const w = r.window === 'unreadable'
    ? ', window unreadable — write yyyy-mm-dd..yyyy-mm-dd'
    : r.window && `, window ${r.window.start}..${r.window.end}${r.window.end < today ? ' — overran' : ''}`;
  return `${r.id} scheduled (${trackerRef(r.tracker)}${w || ''})`;
};

// A seeded file nobody has edited yet: its bytes are the ones the install manifest recorded. Without a readable manifest
// (slipway itself, a project older than sync) every file that exists counts as edited.
let seeded = {};
try { seeded = readManifest(root)?.files ?? {}; } catch { /* no manifest to compare with */ }
const touched = (p) => {
  const bytes = readProjectFile(root, p);
  return bytes !== null && (bytes === NOT_A_FILE || seeded[p]?.sha256 !== sha256(bytes));
};

const prd = readPlain(root, 'docs/PRD.md') ?? '';
const prdStatus = (prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim() ?? 'missing';
const ods = [...prd.matchAll(/^###\s+(OD-\d+)\s+—\s+(.+)$/gm)]
  .map((m) => ({ id: m[1], title: m[2].trim(), blocking: /BLOCKING/.test(section(prd, `${m[1]} — ${m[2].trim()}`, 3) ?? '') }))
  .filter((o) => !o.title.startsWith('<'));
const prdVersion = (prd.match(/^Version:\s*(.+)$/m) ?? [])[1]?.trim() ?? null;
// A review of the PRD's current version, the way R1 counts one: both read the review's header, and compare the line
// it quotes with the PRD's version line, through lib/review-header.mjs; and it names that version, as it always had to.
const prdVersionLines = versionLines(prd);
const reviewsDir = join(root, 'docs', 'reviews');
const prdReviews = existsSync(reviewsDir)
  ? readdirSync(reviewsDir).filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md').filter((f) => {
      const text = readPlain(root, `docs/reviews/${f}`);
      if (text === null) return false;
      const { reviewed, version } = reviewProvenance(text);
      return !!reviewed && isPrdPath(reviewed.path) && !!prdVersion && !!version && version.includes(prdVersion) && quotedVersion(prd, version, prdVersionLines) === 'current';
    })
  : [];
// The findings register of each of those reviews. A warning, never a gate: a register that cannot be read is said
// and nothing else changes. Printed text is the review's ids and Blocks cells, so each goes through excerpt().
const registers = prdReviews.map((f) => {
  try {
    return { file: f, ...readRegister(readPlain(root, `docs/reviews/${f}`) ?? '') };
  } catch {
    return { file: f, state: 'unparsed', rows: [], hasTracker: false };
  }
});
// Each feature doc not shipped whose current version no review names (#493), the way P1 holds a pull request to one
// (spec-review.mjs → owedReviews): one line each. A doc's id, version and path are printed only in their plain shapes; a
// doc with no `Version:` line, or several, is said so in words.
const featureVersion = (md) => {
  const lines = versionLines(md);
  if (lines.length !== 1) return lines.length ? 'has several Version: lines, so no review can name one' : 'has no Version: line, so no review can name its version: add Version: 0.1 first';
  const v = lines[0].match(/^Version:\s*(\d{1,4}(?:\.\d{1,4}){0,3})(?![\w.])/)?.[1];
  return v ? `at ${v} has no review of that version` : 'has no review of its current Version: line';
};
const featureLines = owedReviews(root).map((f) => {
  const ids = f.ns.slice(0, 3).map((n) => `F-${n}`).join(', ');
  const doc = named(f.path) === f.path ? f.path : `on the doc for ${ids} (a file with an unusual name)`;
  return `(you) Run /review-doc ${doc} in a fresh session. ${ids} ${featureVersion(f.md)}. Its build tickets wait on that review.`;
});
const decisions = read('decisions.md') ?? '';
// Marker text, quoted through excerpt(); empty when nothing printable is left (or no text, or a cap `max` is given).
const quoted = (t, max) => {
  const q = t == null ? '' : excerpt(t, max);
  return q ? `"${q}"` : '';
};
// A heading's title is project text: quoted through excerpt(), and its status is said only in the two shapes the record uses.
const openSince = (status) => {
  const m = status.match(/^open — (week \d+|reopened \d{4}-\d{2}-\d{2})$/);
  return m ? (m[1].startsWith('week') ? `open since ${m[1]}` : `open, ${m[1]}`) : 'open';
};
const openDecisions = [...decisions.matchAll(/^##\s+(P?D-\d+)\s+—\s+(.+?)\s*\*\((open[^)\n]*)\)\*/gm)].map((m) => `(you) ${m[2].endsWith('?') ? 'Answer' : 'Decide'} ${quoted(m[2]) || 'the open decision'} (${m[1]}, ${openSince(m[3])})`);
// What a decision still owes, which condition fired and what cannot be read (F-15 §6): ids, event words and paths only.
const owedDecisions = decisionLines(readDecisions(root), today);

const { milestones } = readMilestones(root);
let decisionsByKey;
const decisionOf = (key) => (decisionsByKey ??= new Map(readDecisions(root).entries.map((e) => [e.key, e]))).get(key);
// Whether a test milestone is started, by the owner's decision, for this risk.
const frees = (m, r) => Boolean(testStart(m, decisionOf)?.released.includes((r.id ?? '').toUpperCase()));
const ms = milestones.filter((m) => m.fm?.id).map((m) => ({ ...m.fm, file: m.file, md: m.md, title: (m.md.match(/^#\s+(.+)$/m) ?? [])[1] ?? m.fm.id }));
const active = ms.filter((m) => m.status === 'active');
const cur = active[0];
// Design before screens (F-14 §4), asked of a plan: DS1 holds the active milestone, status says what each shaping one in a
// front-end project has no place for yet. A design item counts in any earlier milestone but a killed one, a shaping one
// included (lib/design.mjs designBefore()). A frame still holding the template's line is unfinished, and Next already
// sends its owner to /kickoff, which asks; with the front end unrecorded no milestone is held to anything.
const fe = frameMd ? frontEnd(frameMd) : null;
const designLines = (() => {
  if (fe?.state === 'unrecorded') return fe.why === 'placeholder' ? [] : ['docs/product/FRAME.md does not say where people use the product: write its Front end: line'];
  if (fe?.state !== 'screens') return [];
  return milestones
    .filter((m) => m.fm?.id && m.fm.status === 'shaping' && !(typeof m.fm.screens === 'string' && m.fm.screens.trim().toLowerCase() === 'none'))
    .flatMap((m) => {
      // An id is printed only in the shape the skills accept, else in words (milestoneRef below).
      const id = milestoneId(m.fm.id) ?? 'A shaping milestone';
      const named = typeof m.fm.design === 'string' && resolveDecision(decisions, m.fm.design, { decided: true }).ok;
      return [
        ...(m.fm.kind !== 'skeleton' && !named && !designBefore(m, milestones, ['shaping', 'active', 'closed']) ? [`${id} has no design item before it: add one to an earlier milestone, or as its item 1`] : []),
        ...(hasAccessibilityLine(m.md) ? [] : [`${id}'s Gate does not say how its screens meet WCAG 2.2 AA: write the line with what holds it, or set screens: none`]),
      ];
    });
})();
const curAppetite = cur && parseAppetite(cur.appetite);
// What an untested value risk holds back: K1 refuses any milestone past the skeleton until it has a Result, except a
// test milestone for the risks its `tests:` line names (#477) until it closes; every other untested value risk still holds it.
const held = (m) => m.kind !== 'skeleton' && untestedValue.some((r) => m.status === 'closed' || !frees(m, r));
const pastSkeletonUnderway = ms.filter((m) => held(m) && (m.status === 'active' || m.status === 'closed'));
const blockedByRisk = ms.filter((m) => held(m) && m.status === 'shaping').map((m) => m.id);
const riskBlocks = pastSkeletonUnderway.length
  ? `${pastSkeletonUnderway.map((m) => m.id).join(', ')} underway with it untested — pnpm meta is red until it has a Result`
  : `blocks ${blockedByRisk.length ? `${blockedByRisk.join(', ')} activation` : 'every milestone past the skeleton'}`;
// A milestone id is printed only in the shape the skills accept; any other is said in words.
const milestoneRef = (m, fallback) => (MID.test(String(m.id)) ? m.id : fallback);
// What an untested value risk holds back, as a sentence; a milestone id is printed only in the shape the skills accept.
const riskBlocksSentence = pastSkeletonUnderway.length
  ? `${idList(pastSkeletonUnderway, MID, 'A milestone')} ${pastSkeletonUnderway.length > 1 ? 'are' : 'is'} underway with it untested, so the checks stay red until it has a result.`
  : `It blocks ${blockedByRisk.length ? `${idList(ms.filter((m) => blockedByRisk.includes(m.id)), MID, 'a milestone')} activation` : 'every milestone past the skeleton'}.`;
// An existential risk — any category, so K1's value gate may not cover it — whose test the PRD schedules
// after the first milestone past the skeleton starts, or at no milestone at all. A warning, not a K1
// finding: "existential" is the owner's word, and building ahead of it on purpose is a recorded decision.
// The Impact cell must start with the word (`Existential: no lawful revenue`), so "not existential" is not.
// Read only where the PRD's risk table has a Resolves by column.
const deadlines = readDeadlines(prd);
const idsOf = (pred) => ms.filter(pred).map((m) => milestoneId(m.id)).filter(Boolean).sort(compareMilestones);
const skeletons = idsOf((m) => m.kind === 'skeleton');
const bets = idsOf((m) => m.kind !== 'skeleton');
const firstBet = bets.length ? bets[0] : skeletons.length ? `M${milestoneKey(skeletons.at(-1))[0] + 1}` : null;
// For one risk, a test milestone started for it is not a bet: it runs the test this warning asks for (#477). A killed
// test milestone is no bet either.
const firstBetFor = (r) => idsOf((m) => m.kind !== 'skeleton' && !(m.kind === 'test' && (m.status === 'killed' || frees(m, r))))[0] ?? (skeletons.length ? `M${milestoneKey(skeletons.at(-1))[0] + 1}` : null);
const existential = deadlines && firstBet !== null
  ? risks.filter((r) => !r.tested && /^\W*existential\b/i.test(r.impact ?? '')).flatMap((r) => {
      const d = deadlines.get((r.id ?? '').toUpperCase());
      const firstBet = firstBetFor(r);
      if (firstBet === null || (d?.before && compareMilestones(d.before, firstBet) <= 0)) return [];
      const when = !d ? 'has no row in the PRD risk table' : d.before ? `resolves ${quoted(d.cell) || 'in a cell that cannot be shown'}, after ${firstBet} starts` : `resolves ${quoted(d.cell || 'blank')}, which names no milestone`;
      const who = RID.test(String(r.id)) ? r.id : 'A risk with an unusual id';
      return [`${who} is existential and untested, and ${when}: schedule its test before ${firstBet}, or record a decision in decisions.md to build ahead (cost if wrong, and what reopens it) and put its id in ${RID.test(String(r.id)) ? `${r.id}'s` : 'its'} Result`];
    })
  : [];

// A high-severity finding with no tracker, and the active or closed milestone its Blocks cell names. A cell that
// names no milestone adds nothing.
// At most this many lines in all: a long register, or many reviews, must not fill the session's context. The
// findings that matter most come first: the ones that block an active or closed milestone, then S0, then S1; what
// is left out is counted, with how many of it are S0 or block a milestone.
const REGISTER_LINES = 20;
const registerLines = [];
let registerLeft = REGISTER_LINES;
let registerUnlisted = 0;
let registerHot = 0;
const say = (line) => (registerLeft > 0 ? (registerLeft--, registerLines.push(line)) : registerUnlisted++);
for (const r of registers) {
  if (r.state === 'unparsed') say(`Review register in ${named(r.file)} cannot be read — no ID and Sev columns, or no finding with a severity of S0 to S3`);
  if (r.state !== 'ok') continue;
  if (r.skipped) say(`Review register in ${named(r.file)} has ${r.skipped} finding(s) whose severity reads none of S0 to S3 — they are not counted; write each as S0, S1, S2 or S3`);
  if (!r.hasTracker) {
    say(`Review register in ${named(r.file)} has no Tracker column — no finding is reported as untracked; add the column (docs/reviews/TEMPLATE.md)`);
    continue;
  }
  const untracked = r.rows
    .filter((f) => !f.tracked && (f.sev === 'S0' || f.sev === 'S1'))
    .map((f) => ({
      f,
      held: milestonesNamed(f.blocks).flatMap((id) => {
        const m = ms.find((x) => String(x.id).toUpperCase() === id && (x.status === 'active' || x.status === 'closed'));
        return m ? [`${id} (${m.status})`] : [];
      }),
    }))
    .sort((x, y) => (y.held.length > 0) - (x.held.length > 0) || x.f.sev.localeCompare(y.f.sev));
  const shown = untracked.slice(0, Math.max(registerLeft, 0));
  for (const { f, held } of shown) say(`Review finding "${excerpt(f.id)}" (${f.sev}) in ${named(r.file)} has no tracker${held.length ? `; blocks ${held.join(', ')}` : ''}`);
  const rest = untracked.slice(shown.length);
  if (rest.length) {
    const hot = rest.filter(({ f, held }) => f.sev === 'S0' || held.length).length;
    registerUnlisted += rest.length;
    registerHot += hot;
  }
}
if (registerUnlisted) registerLines.push(`Review registers: ${registerUnlisted} more line(s) not listed${registerHot ? `, ${registerHot} of them S0 or blocking a milestone` : ''} — fix the ones above first`);
// Per severity, how many findings of the register have a tracker and how many do not.
const registerStanding = (r) => {
  const sevs = ['S0', 'S1', 'S2', 'S3'].filter((s) => r.rows.some((f) => f.sev === s));
  return `${named(r.file)}: ${sevs.map((s) => `${s} ${r.rows.filter((f) => f.sev === s && f.tracked).length} with a tracker, ${r.rows.filter((f) => f.sev === s && !f.tracked).length} without`).join(' · ')}`;
};

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.md') && f !== 'TEMPLATE.md') out.push(p);
  }
  return out;
}
// Open questions, with the question itself: a count tells nobody what to answer. Parked ones
// (assumption + cost + tracker) are listed apart — they are decided-enough to build on.
// Marker text, quoted through excerpt(); empty when nothing printable is left.
const open_ = [];
const parked_ = [];
for (const file of walk(join(root, 'docs'))) {
  const rel_ = named(relative(root, file));
  // Comments are blanked, not removed, so line numbers hold. A marker sitting whole inside inline code is the
  // template explaining the syntax, not a question; an escaped backtick is not code. Every span is matched so
  // that the gap between two spans is never read as one.
  const lines = replaceComments(readFileSync(file, 'utf8'), commentLines).split(/\r?\n/).map((l) => l.replace(/(?<!\\)`[^`\n]*`/g, (span) => (/\[(?:NEEDS CLARIFICATION|PARKED)[^\]]*\]/.test(span) ? '' : span)));
  lines.forEach((line, i) => {
    for (const [, body] of line.matchAll(/\[NEEDS CLARIFICATION:?([^\]]*)\]/g)) open_.push(`${rel_}:${i + 1} — ${quoted(body) || 'no question written'}`);
    for (const [, body] of line.matchAll(/\[PARKED:([^\]]*)\]/g)) {
      const found = body.match(TRACKER)?.[0];
      const ref = found ? trackerRef(found) : 'untracked';
      parked_.push(`${rel_}:${i + 1} — ${quoted(body.split('·')[0]) || 'no text'} (${ref})`);
    }
  });
}

// Checks the active milestone's items still owe (F-09): moved to after merge and not recorded, failed with no bug
// named, or written in a way nothing can read. These lines enter every session through the hook, and a milestone
// doc is text a pull request can carry, so they print no project text from a check line: only the item's number,
// its issue's number, a count, a date that is a calendar day, and the file to open. The milestone's id is printed
// only in the shape the skills accept.
const owed_ = [];
for (const item of cur ? contents(cur.md) : []) {
  const owes = owing(item);
  const issue = marker(item.text)?.issue;
  const where = `${MID.test(String(cur.id)) ? cur.id : 'the active milestone'} item ${item.n}`;
  const file = `docs/milestones/${named(cur.file)}`;
  const [owed, failed, unreadable] = ['owed', 'ran', 'unreadable'].map((k) => owes.filter((c) => c.kind === k));
  if (owed.length) owed_.push(`Owed check: ${where} (#${issue}) — ${owed.length} check(s) moved to after merge with no run recorded (the Owed: lines under it in ${file}): run each, post the result as a comment on #${issue}, then change the Owed line to Ran with that comment's link; #${issue} stays open until then (reopen it if it was closed)`);
  if (failed.length) owed_.push(`Failed check: ${where} (#${issue}) — ${failed.length} run(s) failed on ${[...new Set(failed.map((c) => c.date))].join(', ')} (the Ran: lines under it in ${file}): fix and run it again, file the bug and name it on the line, or, when the owner accepts the result, remove its line in a pull request that records that decision`);
  if (unreadable.length) owed_.push(`Unreadable check line: ${where} — ${unreadable.length} line(s) under it start owed: or ran: and cannot be read, so each counts as owed: write it as Owed: or Ran: (${file})`);
}

const anchor = (read('process/anchor') ?? '').trim();
const lessonsDir = join(root, 'process', 'lessons');
const dueSoon = existsSync(lessonsDir)
  ? readdirSync(lessonsDir).filter((f) => /^P?L-.*\.md$/.test(f)).flatMap((f) => {
      const fm = frontmatter(readFileSync(join(lessonsDir, f), 'utf8'));
      const rb = fm?.enforcement?.['review-by'];
      if (!rb) return [];
      let due = rb;
      const rel = rb.match(/^\+(\d+)d$/);
      if (rel && anchor) {
        const d = new Date(`${anchor}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + Number(rel[1]));
        due = d.toISOString().slice(0, 10);
      }
      return /^\d{4}-\d{2}-\d{2}$/.test(due) && days(today, due) <= 14 ? [`Review the lesson (${fm.id}) by ${due}.`] : [];
    })
  : [];

// Step 0 while there is no app, or while rows are unfilled and no milestone is underway yet. A running project
// synced onto rows it never had is not sent back to bootstrap: the rows go under Needs attention instead.
const step0 = packages === 0 || (!bootstrapped && !ms.some((m) => m.status === 'active' || m.status === 'closed'));

// ---- the next step on the slipway path
// Each Next line is two to four sentences: the action, the reason, and who does it and how long (process/writing.md; S1 holds
// the form). The who and the time are read from the step list, never spelled here. Project text (a risk's assumption, a
// Contents item) is quoted through excerpt(); an id is printed only where it is read from a file the checks already validate.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// The first untested value risk, named for the person who tests it, and how many more wait behind it.
// A risk's id is read from the frame's ID column, which no check shapes: it is printed only as RISK-n, else as words.
const riskRef = (r) => (RID.test(String(r.id)) ? r.id : 'a risk with an unusual id');
const firstRisk = () => {
  const r = untestedValue[0];
  const more = untestedValue.length - 1;
  const quote = quoted(r.assumption, 30);
  const named = quote ? `${riskRef(r)}, ${quote}` : riskRef(r);
  return { r, text: more ? `${named}${quote ? ',' : ''} and ${more} more` : named };
};
// Set when the Next line names the risk, so Needs attention says how to build ahead of it.
let riskNamed = null;
const testTheRisk = () => {
  const { r, text } = firstRisk();
  riskNamed = riskRef(r);
  return r.tracker
    ? `Finish testing ${text}. Its test is already scheduled. Nothing past the skeleton can start until every value risk has a result in docs/product/evidence/. ${whoLine(2)}`
    : `Test ${text} with real people. Nothing past the skeleton can start until every value risk has a result in docs/product/evidence/. An agent prepares the materials. ${whoLine(2)}`;
};
function next() {
  if (step0) {
    return placeholders.length
      ? `Run /bootstrap. It fills the ${plural(placeholders.length, 'setting', 'settings')} AGENT.md still needs (${placeholders.join(', ')})${packages === 0 ? ' and sets up the app' : ''}. ${whoLine(0)}`
      : `Run /bootstrap. There is no app yet, so it scaffolds one and opens the first PR. ${whoLine(0)}`;
  }
  if (frame !== 'framed') return `Run /kickoff to finish docs/product/FRAME.md. Its open questions need an answer or a parked assumption before the frame is done. ${whoLine(1)}`;
  if (!ms.some((m) => m.status !== 'shaping') && untestedValue.length) return testTheRisk();
  if (prdStatus === 'draft' && !cur && !ms.some((m) => m.status === 'closed')) {
    return prdReviews.length
      ? `Resolve the review's findings in docs/PRD.md, then set Status: approved. PRD ${prdVersion} has its review, and a milestone can go active once the PRD is approved. ${whoLine(3)}`
      : `Finish /kickoff, then run /review-doc docs/PRD.md in a new session. The PRD needs a review before it is approved, or the checks go red. ${whoLine(3)}`;
  }
  if (active.length > 1) return `Set every milestone but one to shaping or closed. ${idList(active, MID, 'Several milestones')} are all active, and the checks stay red until one is. You.`;
  if (cur && curAppetite && curAppetite.end < today && !cur.extended) {
    return `Close ${milestoneRef(cur, 'the active milestone')} with /close-milestone, kill it, or record an extension. Its appetite ended ${curAppetite.end}. You.`;
  }
  if (cur) {
    const stepN = cur.kind === 'skeleton' ? 4 : 5;
    // The command is built from the id and the item's number, never from its text, and only for an id the
    // skill accepts (process/intake.md → Milestone item): this line enters every session through the hook.
    const items = contents(cur.md).filter((i) => !i.text.trim().startsWith('<'));
    if (items.length && MID.test(String(cur.id))) {
      const item = items.find((i) => !started(i.text));
      if (!item) return `Finish ${cur.id}'s open issues, then run /close-milestone once its gate is green. Every item has an issue. ${whoLine(stepN)}`;
      return `Start item ${item.n} of ${cur.id} in a fresh session with /log-feature ${cur.id}#${item.n}. It reads "${excerpt(item.text)}". ${whoLine(stepN)}`;
    }
    return `Pick the next slice from ${milestoneRef(cur, 'the active milestone')}'s Contents. Then size the process it needs (process/slipway-rules.md#Lanes). ${whoLine(stepN)}`;
  }
  const shaping = ms.filter((m) => m.status === 'shaping');
  const skeleton = shaping.find((m) => m.kind === 'skeleton');
  if (skeleton) return `Activate ${milestoneRef(skeleton, 'the skeleton milestone')} with real appetite dates and status active. Then build its first slice. ${whoLine(4)}`;
  if (untestedValue.length) return testTheRisk();
  return shaping.length
    ? `Activate one of ${idList(shaping, MID, 'the shaping milestones')}, or shape a new bet. Set its appetite dates when it goes active. ${whoLine(6)}`
    : `Shape the next bet from docs/product/metrics.md. No milestone is active or shaped. ${whoLine(7)}`;
}

// ---- render
const L = [];
L.push(`# STATE — generated by \`pnpm status\` on ${today}. Do not edit; regenerate.`, '');
L.push(`**Next:** ${next()}`, '');
// Work that is not the Next line but is not waiting on it either.
const also = [];
if (frame === 'framed' && !cur) {
  const skel = ms.find((m) => m.kind === 'skeleton' && m.status === 'shaping');
  if (skel && untestedValue.length) {
    const first = untracked.length ? ` Then name where ${idList(untracked, RID, 'each risk')} is being tested, in the Tracker column of docs/product/FRAME.md.` : '';
    also.push(`(agent) Activate the walking skeleton (${milestoneRef(skel, 'the skeleton milestone')}) and build it in parallel. An untested value risk does not block it.${first}`);
  }
}
if (cur && untestedValue.length) also.push(`(you) Test the untested value risks (${idList(untestedValue, RID, 'the risks')}). ${riskBlocksSentence}`);
if (prd && !prdReviews.length && (frame === 'framed' || prdStatus !== 'draft')) {
  also.push(`(fresh session) Run /review-doc docs/PRD.md. The PRD at ${prdVersion ?? '?'} has no adversarial review, and it needs one before Status: approved.`);
}
if (open_.length) also.push(`(you) Answer the ${open_.length} open question(s) below, or park each with an assumption, the cost if wrong, and a tracker.`);
if (also.length) L.push('**Also unblocked:**', ...also.map((a) => `- ${a}`), '');

L.push('## Where things stand', '');
// Every step at once: the Next line names one, but step 4 runs beside step 2 and step 7 sends the project back to 5.
const valueRisks = risks.filter((r) => r.value);
L.push(...stepLines({
  bootstrapped,
  packages,
  frame,
  frameTouched: touched('docs/product/FRAME.md'),
  valueRisks: valueRisks.length,
  settled: valueRisks.filter(settled).length,
  scheduled: valueRisks.filter((r) => !settled(r) && r.tracker).length,
  prdStatus,
  prdTouched: touched('docs/PRD.md'),
  milestones: ms,
}), '');
L.push(`- Bootstrap: ${bootstrapped ? 'AGENT.md filled' : 'AGENT.md has placeholders'} · ${packages} workspace package(s)`);
L.push(`- Frame: ${frame}${risks.length ? ` · risks: ${risks.map(riskState).join(', ')}${untestedValue.length ? ` · ${riskBlocks}` : ''}` : ''}`);
L.push(`- PRD: ${prdStatus}${prdVersion ? ` ${prdVersion}` : ''} · review: ${prdReviews.length ? prdReviews.map(named).join(', ') : 'none for this version'}${ods.length ? ` · open questions: ${ods.map((o) => o.id + (o.blocking ? ' (BLOCKING)' : '')).join(', ')}` : ''}`);
for (const r of registers) if (r.state === 'ok' && r.hasTracker && r.rows.length) L.push(`- Review register: ${registerStanding(r)}`);
if (cur) {
  const c = curAppetite && appetiteClock(curAppetite, today);
  const clock = c ? `day ${c.day} of ${c.of}, last day ${c.end}${c.overrun ? ' — OVERRUN' : ''}` : 'no appetite';
  L.push(`- Active milestone: **${cur.title}** (${cur.kind ?? 'no kind'}) · ${clock}`);
} else L.push('- Active milestone: none');
L.push('');
if (ms.length) {
  L.push('## Milestones', '', '| id | status | kind | appetite | file |', '|---|---|---|---|---|');
  for (const m of ms) L.push(`| ${m.id} | ${m.status} | ${m.kind ?? ''} | ${m.appetite ?? ''} | docs/milestones/${named(m.file)} |`);
  L.push('');
}
const attention = [
  ...(prd && !prdReviews.length && (frame === 'framed' || prdStatus !== 'draft') ? [`Run /review-doc docs/PRD.md in a fresh session. PRD ${prdVersion ?? ''} has no adversarial review, and it needs one before it leaves draft.`] : []),
  // While no milestone is active or closed the step 3 line is the Next line (next() above); with one, the approval is still owed.
  ...(prdStatus === 'draft' && prdReviews.length && (cur || ms.some((m) => m.status === 'closed')) ? [`Resolve the review's findings in docs/PRD.md, then set Status: approved. PRD ${prdVersion} is reviewed (${prdReviews.map(named).join(', ')}) and still a draft.`] : []),
  ...(!bootstrapped && !step0 ? [`Fill each unfilled AGENT.md row: ${placeholders.join(', ')}. The skills read them${placeholders.includes('Timezone') ? ', and Timezone also sets when a deadline day ends' : ''}.`] : []),
  ...(riskNamed ? [`To build ahead of the risk (${riskNamed}), record a decision with the cost if wrong and what reopens it, and put its id in the risk's Result; or make the milestone a \`kind: test\` milestone for that risk (D-047).`] : []),
  ...((riskNamed || (cur && untestedValue.length)) && untracked.length ? ['File the issue that runs each untested value risk, and name it in the Tracker column of docs/product/FRAME.md.'] : []),
  ...registerLines,
  ...featureLines,
  ...designLines,
  ...existential.map((e) => `Existential risk: ${e}`),
  ...openDecisions,
  ...owedDecisions,
  ...open_.map((c) => `Open question: ${c}`),
  ...owed_,
  ...parked_.map((c) => `Parked: ${c}`),
  ...dueSoon,
];
L.push('## Needs attention', '');
// One at a time: a list spread into one call overflows the stack when it is long enough.
for (const a of attention.length ? attention : ['nothing']) L.push(`- ${a}`);
L.push('');
// Project text is printed as read (milestone titles, ids, deadlines, file names): each line is escaped on its own,
// so a line break a file name or a value carries is shown as \u000a and never starts a line (a forged Next:, a CI
// log command), here and in the hook's context.
const text = L.map(escapeControl).join('\n');

// The two hook modes keep STATE.md current (#374). The guard runs them only from the working tree it has cleared, so a
// session whose gate files changed never reaches this line. A folder that cannot be written does not stop the hook: it
// still hands on the state and exits 0.
// The file is written beside STATE.md and renamed over it: a link or a pipe left at that ignored path is replaced, never
// written through, and a reader never sees half a file.
// --write uses the same write, and still fails loudly where the hooks stay quiet.
const writeState = () => {
  const tmp = join(root, `.STATE.md.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, text + '\n', { flag: 'wx' });
    renameSync(tmp, join(root, 'STATE.md'));
  } catch (e) {
    // An EEXIST file is not this run's to remove; a clean-up that fails changes nothing about the error.
    if (e.code !== 'EEXIST') try { rmSync(tmp, { force: true }); } catch { /* the original error is the one to report */ }
    throw e;
  }
};
const refresh = () => {
  try { writeState(); } catch { /* read-only folder, or a folder where the file goes: nothing to keep current */ }
};
if (args.includes('--hook')) {
  refresh();
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }) + '\n');
} else if (args.includes('--refresh-run')) {
  refresh();
} else {
  process.stdout.write(text + '\n');
  if (args.includes('--write')) writeState();
}
