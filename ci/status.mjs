#!/usr/bin/env node
// status — where the project is, and the next step on the slipway path (SLIPWAY.md). Deterministic: read
// from the repository, no model, no network. Agents believe whatever state they are handed,
// so the state is computed, never hand-maintained — a hand-kept plan reads "in progress"
// long after the work finished.
//
//   node ci/status.mjs [root]            print
//   node ci/status.mjs --write [root]    also write STATE.md (gitignored)
//   node ci/status.mjs --hook [root]     SessionStart hook output: the same text as context
//
// Free text a document carries (a milestone title in the Next line, a Contents item, a [NEEDS CLARIFICATION] or
// [PARKED] marker) is quoted through excerpt(): one line, cut at a word, unsafe characters dropped, in double
// quotes the text cannot close. Identifiers and names read from a file (the Active milestone line's title, risk and
// milestone ids, a decision title, a lesson id, file names) print as read, each line passed through escapeControl at
// the end. Anything a session must act on (a command, an id) is built from validated values, never from the text.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { today as localToday } from './checks/lib/clock.mjs';
import { frontmatter } from './checks/lib/frontmatter.mjs';
import { section } from './checks/lib/markdown.mjs';
import { appetiteClock, contents, marker, owing, parseAppetite, readMilestones, started } from './checks/lib/milestones.mjs';
import { escapeControl, excerpt } from './checks/lib/report.mjs';
import { isPrdPath, readPlain, reviewProvenance } from './checks/lib/review-header.mjs';
import { milestoneNumber, readDeadlines, readRisks, TRACKER } from './checks/lib/risks.mjs';
import { discoverWorkspace } from './checks/lib/workspace.mjs';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--')) ?? '.';
let today;
try {
  today = localToday(root);
} catch (e) {
  process.stderr.write(`status: ${escapeControl(e.message)}\n`);
  process.exit(2);
}
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null);
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
// Settled by experience only when K1 would pass it: a missing `Wrong if:` line is said, never "settled".
const riskState = (r) => {
  if (r.claimsExperience && !r.experience) return `${r.id} needs an experience reason (table stakes, creator is the user or domain expertise)`;
  if (r.experience) return r.refutation ? `${r.id} settled by experience (${r.experience.rationale})` : `${r.id} needs a Wrong if: line (experience: ${r.experience.rationale})`;
  if (r.tested) return `${r.id} tested`;
  if (!r.tracker) return r.value ? `${r.id} untested (no tracker)` : `${r.id} untested`;
  const w = r.window === 'unreadable'
    ? ', window unreadable — write yyyy-mm-dd..yyyy-mm-dd'
    : r.window && `, window ${r.window.start}..${r.window.end}${r.window.end < today ? ' — overran' : ''}`;
  return `${r.id} scheduled (${r.tracker}${w || ''})`;
};

const prd = readPlain(root, 'docs/PRD.md') ?? '';
const prdStatus = (prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim() ?? 'missing';
const ods = [...prd.matchAll(/^###\s+(OD-\d+)\s+—\s+(.+)$/gm)]
  .map((m) => ({ id: m[1], title: m[2].trim(), blocking: /BLOCKING/.test(section(prd, `${m[1]} — ${m[2].trim()}`, 3) ?? '') }))
  .filter((o) => !o.title.startsWith('<'));
const prdVersion = (prd.match(/^Version:\s*(.+)$/m) ?? [])[1]?.trim() ?? null;
// A review of the PRD's current version, the way R1 counts one: both read the review's header through lib/review-header.mjs.
const reviewsDir = join(root, 'docs', 'reviews');
const prdReviews = existsSync(reviewsDir)
  ? readdirSync(reviewsDir).filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md').filter((f) => {
      const text = readPlain(root, `docs/reviews/${f}`);
      if (text === null) return false;
      const { reviewed, version } = reviewProvenance(text);
      return !!reviewed && isPrdPath(reviewed.path) && !!prdVersion && !!version && version.includes(prdVersion);
    })
  : [];
const decisions = read('decisions.md') ?? '';
const openDecisions = [...decisions.matchAll(/^##\s+(P?D-\d+)\s+—\s+(.+?)\s*\*\((open[^)]*)\)\*/gm)].map((m) => `${m[1]} ${m[2]} (${m[3]})`);

const { milestones } = readMilestones(root);
const ms = milestones.filter((m) => m.fm?.id).map((m) => ({ ...m.fm, file: m.file, md: m.md, title: (m.md.match(/^#\s+(.+)$/m) ?? [])[1] ?? m.fm.id }));
const active = ms.filter((m) => m.status === 'active');
const cur = active[0];
const curAppetite = cur && parseAppetite(cur.appetite);
// What an untested value risk holds back: K1 refuses any milestone past the skeleton until it has a Result.
const pastSkeletonUnderway = ms.filter((m) => m.kind !== 'skeleton' && (m.status === 'active' || m.status === 'closed'));
const blockedByRisk = ms.filter((m) => m.kind !== 'skeleton' && m.status === 'shaping').map((m) => m.id);
const riskBlocks = pastSkeletonUnderway.length
  ? `${pastSkeletonUnderway.map((m) => m.id).join(', ')} underway with it untested — pnpm meta is red until it has a Result`
  : `blocks ${blockedByRisk.length ? `${blockedByRisk.join(', ')} activation` : 'every milestone past the skeleton'}`;
const riskLine = untestedValue.length ? `${untestedValue.map(riskState).join(', ')} · ${riskBlocks}` : '';
const riskFile = untracked.length ? ' File the issue that runs each untested one and name it in FRAME\'s Tracker column.' : '';
// An existential risk — any category, so K1's value gate may not cover it — whose test the PRD schedules
// after the first milestone past the skeleton starts, or at no milestone at all. A warning, not a K1
// finding: "existential" is the owner's word, and building ahead of it on purpose is a recorded decision.
// The Impact cell must start with the word (`Existential: no lawful revenue`), so "not existential" is not.
// Read only where the PRD's risk table has a Resolves by column.
const deadlines = readDeadlines(prd);
const skeletons = ms.filter((m) => m.kind === 'skeleton').map((m) => milestoneNumber(m.id)).filter((n) => n >= 0);
const bets = ms.filter((m) => m.kind !== 'skeleton').map((m) => milestoneNumber(m.id)).filter((n) => n >= 0);
const firstBet = bets.length ? Math.min(...bets) : skeletons.length ? Math.max(...skeletons) + 1 : null;
const existential = deadlines && firstBet !== null
  ? risks.filter((r) => !r.tested && /^\W*existential\b/i.test(r.impact ?? '')).flatMap((r) => {
      const d = deadlines.get((r.id ?? '').toUpperCase());
      if (d?.before && milestoneNumber(d.before) <= firstBet) return [];
      const when = !d ? 'has no row in the PRD risk table' : d.before ? `resolves ${d.cell}, after M${firstBet} starts` : `resolves "${d.cell || 'blank'}", which names no milestone`;
      return [`${r.id} is existential and untested, and ${when}: schedule its test before M${firstBet}, or record a decision in decisions.md to build ahead (cost if wrong, and what reopens it) and put its id in ${r.id}'s Result`];
    })
  : [];

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
const quoted = (t) => {
  const q = excerpt(t);
  return q ? `"${q}"` : '';
};
const open_ = [];
const parked_ = [];
for (const file of walk(join(root, 'docs'))) {
  const rel_ = relative(root, file);
  // Comments are blanked, not removed, so line numbers hold. A marker sitting whole inside inline code is the
  // template explaining the syntax, not a question; an escaped backtick is not code. Every span is matched so
  // that the gap between two spans is never read as one.
  const lines = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, '')).split(/\r?\n/).map((l) => l.replace(/(?<!\\)`[^`\n]*`/g, (span) => (/\[(?:NEEDS CLARIFICATION|PARKED)[^\]]*\]/.test(span) ? '' : span)));
  lines.forEach((line, i) => {
    for (const [, body] of line.matchAll(/\[NEEDS CLARIFICATION:?([^\]]*)\]/g)) open_.push(`${rel_}:${i + 1} — ${quoted(body) || 'no question written'}`);
    for (const [, body] of line.matchAll(/\[PARKED:([^\]]*)\]/g)) {
      const ref = body.match(TRACKER)?.[0] ?? 'untracked';
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
  const where = `${/^M\d+$/.test(String(cur.id)) ? cur.id : 'the active milestone'} item ${item.n}`;
  const file = `docs/milestones/${cur.file}`;
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
      return /^\d{4}-\d{2}-\d{2}$/.test(due) && days(today, due) <= 14 ? [`${fm.id} due ${due}`] : [];
    })
  : [];

// Step 0 while there is no app, or while rows are unfilled and no milestone is underway yet. A running project
// synced onto rows it never had is not sent back to bootstrap: the rows go under Needs attention instead.
const step0 = packages === 0 || (!bootstrapped && !ms.some((m) => m.status === 'active' || m.status === 'closed'));

// ---- the next step on the slipway path
function next() {
  if (step0) {
    const missing = [!bootstrapped && `AGENT.md still has placeholders: ${placeholders.join(', ')}`, packages === 0 && 'no app yet'].filter(Boolean);
    return `Step 0 (you + agent) — Bootstrap: run /bootstrap (${missing.join('; ')}); BOOTSTRAP.md is the reference.`;
  }
  if (frame !== 'framed') return 'Step 1 (you, with /kickoff) — Frame: finish docs/product/FRAME.md, answer or park its open questions, then set status: framed.';
  const testTheRisk = `Step 2 (YOURS, not an agent's — days to weeks) — Test the risk: ${riskLine}. An agent can prepare the materials; running the test with real people is yours.${riskFile} Thresholds and results go in docs/product/evidence/ — or record a decision in decisions.md to build ahead (cost if wrong, and what reopens it) and put its id in the risk's Result.`;
  if (!ms.some((m) => m.status !== 'shaping') && untestedValue.length) return testTheRisk;
  if (prdStatus === 'draft' && !cur && !ms.some((m) => m.status === 'closed')) {
    return prdReviews.length
      ? `Step 3 (you) — Shape: ${prdVersion} is reviewed. Resolve the review's findings in the PRD, then set Status: approved and activate a milestone.`
      : `Step 3 (you, with /kickoff) — Shape: PRD with IDs, week-1 decisions and milestone pitches (/kickoff). Then, in a NEW session, run /review-doc docs/PRD.md — the adversarial review of the document, not a code review of a pull request — and only then set Status: approved (the build goes red otherwise).`;
  }
  if (active.length > 1) return `Fix: ${active.length} milestones are active (${active.map((m) => m.id).join(', ')}). One at a time; pnpm meta is red until then.`;
  if (cur && curAppetite && curAppetite.end < today && !cur.extended) {
    return `Circuit breaker: ${cur.id}'s appetite ended ${curAppetite.end}. Cut scope and close it (/close-milestone), kill it, or record an extension.`;
  }
  if (cur) {
    const risk = untestedValue.length ? ` Meanwhile (yours): ${riskLine}.${riskFile}` : '';
    const lead = `${cur.kind === 'skeleton' ? 'Step 4 (agent) — Walking skeleton' : 'Step 5 (agent) — Build loop'}: ${excerpt(cur.title)}`;
    // The command is built from the id and the item's number, never from its text, and only for an id the
    // skill accepts (process/intake.md → Milestone item): this line enters every session through the hook.
    const items = contents(cur.md).filter((i) => !i.text.trim().startsWith('<'));
    if (items.length && /^M\d+$/.test(String(cur.id))) {
      const item = items.find((i) => !started(i.text));
      if (!item) return `${lead}. Every Contents item has an issue: finish them, then run /close-milestone once its Gate is green.${risk}`;
      return `${lead}. Next slice: item ${item.n}, "${excerpt(item.text)}". Start it in a fresh session with /log-feature ${cur.id}#${item.n}.${risk}`;
    }
    return `${lead}. Next slice from its Contents; pick the lane (process/slipway-rules.md#Lanes).${risk}`;
  }
  const shaping = ms.filter((m) => m.status === 'shaping');
  if (shaping.some((m) => m.kind === 'skeleton')) {
    return 'Step 4 (agent) — Walking skeleton: activate the skeleton milestone (real appetite dates, status: active) and build its first slice.';
  }
  if (untestedValue.length) return testTheRisk;
  return shaping.length
    ? `Step 6 (you) — Choose the next bet: activate one of ${shaping.map((m) => m.id).join(', ')} (set appetite dates), or shape a new one.`
    : 'Step 6/7 (you) — No milestone active or shaped: shape the next bet from docs/product/metrics.md evidence.';
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
    const first = untracked.length ? ` — then name where ${untracked.map((r) => r.id).join(', ')} is being tested (FRAME's Tracker column)` : '';
    also.push(`(agent) ${skel.id} — the walking skeleton is not blocked by an untested value risk: activate it and build in parallel${first}`);
  }
}
if (prd && !prdReviews.length && (frame === 'framed' || prdStatus !== 'draft')) {
  also.push(`(fresh session) /review-doc docs/PRD.md — the PRD at ${prdVersion ?? '?'} has no adversarial review; needed before Status: approved`);
}
if (open_.length) also.push(`(you) ${open_.length} open question(s) below — answer, or park with an assumption, the cost if wrong, and a tracker`);
if (also.length) L.push('**Also unblocked:**', ...also.map((a) => `- ${a}`), '');

L.push('## Where things stand', '');
L.push(`- Bootstrap: ${bootstrapped ? 'AGENT.md filled' : 'AGENT.md has placeholders'} · ${packages} workspace package(s)`);
L.push(`- Frame: ${frame}${risks.length ? ` · risks: ${risks.map(riskState).join(', ')}${untestedValue.length ? ` · ${riskBlocks}` : ''}` : ''}`);
L.push(`- PRD: ${prdStatus}${prdVersion ? ` ${prdVersion}` : ''} · review: ${prdReviews.length ? prdReviews.join(', ') : 'none for this version'}${ods.length ? ` · open questions: ${ods.map((o) => o.id + (o.blocking ? ' (BLOCKING)' : '')).join(', ')}` : ''}`);
if (cur) {
  const c = curAppetite && appetiteClock(curAppetite, today);
  const clock = c ? `day ${c.day} of ${c.of}, last day ${c.end}${c.overrun ? ' — OVERRUN' : ''}` : 'no appetite';
  L.push(`- Active milestone: **${cur.title}** (${cur.kind ?? 'no kind'}) · ${clock}`);
} else L.push('- Active milestone: none');
L.push('');
if (ms.length) {
  L.push('## Milestones', '', '| id | status | kind | appetite | file |', '|---|---|---|---|---|');
  for (const m of ms) L.push(`| ${m.id} | ${m.status} | ${m.kind ?? ''} | ${m.appetite ?? ''} | docs/milestones/${m.file} |`);
  L.push('');
}
const attention = [
  ...(prd && !prdReviews.length && (frame === 'framed' || prdStatus !== 'draft') ? [`PRD ${prdVersion ?? ''} has no adversarial review — run /review-doc docs/PRD.md in a fresh session (needed before the PRD leaves draft)`] : []),
  // While no milestone is active or closed the step 3 line is the Next line (next() above); with one, the approval is still owed.
  ...(prdStatus === 'draft' && prdReviews.length && (cur || ms.some((m) => m.status === 'closed')) ? [`PRD ${prdVersion} is reviewed (${prdReviews.join(', ')}) and still a draft — resolve the review's findings in the PRD, then set Status: approved`] : []),
  ...(!bootstrapped && !step0 ? [`AGENT.md rows still unfilled: ${placeholders.join(', ')} — the skills read them${placeholders.includes('Timezone') ? ' (Timezone also sets when a deadline day ends)' : ''}; fill each row`] : []),
  ...existential.map((e) => `Existential risk: ${e}`),
  ...openDecisions.map((d) => `Open decision: ${d}`),
  ...open_.map((c) => `Open question: ${c}`),
  ...owed_,
  ...parked_.map((c) => `Parked: ${c}`),
  ...dueSoon.map((d) => `Lesson review: ${d}`),
];
L.push('## Needs attention', '', ...(attention.length ? attention.map((a) => `- ${a}`) : ['- nothing']), '');
// Project text is printed as read (milestone titles, ids, deadlines, file names): each line is escaped on its own,
// so a line break a file name or a value carries is shown as \u000a and never starts a line (a forged Next:, a CI
// log command), here and in the hook's context.
const text = L.map(escapeControl).join('\n');

if (args.includes('--hook')) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }) + '\n');
} else {
  process.stdout.write(text + '\n');
  if (args.includes('--write')) writeFileSync(join(root, 'STATE.md'), text + '\n');
}
