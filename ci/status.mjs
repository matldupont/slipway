#!/usr/bin/env node
// status — where the project is, and the next step on the slipway path (SLIPWAY.md). Deterministic: read
// from the repository, no model, no network. Agents believe whatever state they are handed,
// so the state is computed, never hand-maintained — a hand-kept plan reads "in progress"
// long after the work finished.
//
//   node ci/status.mjs [root]            print
//   node ci/status.mjs --write [root]    also write STATE.md (gitignored)
//   node ci/status.mjs --hook [root]     SessionStart hook output: the same text as context

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { frontmatter, PLACEHOLDER } from './checks/lib/frontmatter.mjs';
import { section } from './checks/lib/markdown.mjs';
import { parseAppetite, readMilestones } from './checks/lib/milestones.mjs';
import { discoverWorkspace } from './checks/lib/workspace.mjs';

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--')) ?? '.';
const today = process.env.CHECK_TODAY ?? new Date().toISOString().slice(0, 10);
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ---- facts
const agent = read('AGENT.md') ?? '';
const bootstrapped = !agent.includes('<Product>') && !agent.includes('<owner/repo>');
let packages = 0;
try { packages = discoverWorkspace(root).packages.length; } catch { /* reported as 0 */ }

const frameMd = read('docs/product/FRAME.md');
const frame = frameMd ? frontmatter(frameMd)?.status ?? 'unknown' : 'missing';
const risks = (frameMd ? section(frameMd, 'Risks', 2) ?? '' : '')
  .split(/\r?\n/)
  .filter((l) => /^\|\s*RISK-\d+\s*\|/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const untestedValue = risks.filter((r) => /\bvalue\b/i.test(r[2] ?? '') && (!r[6] || PLACEHOLDER.test(r[6]))).map((r) => r[0]);

const prd = read('docs/PRD.md') ?? '';
const prdStatus = (prd.match(/^Status:\s*(.+)$/m) ?? [])[1]?.trim() ?? 'missing';
const ods = [...prd.matchAll(/^###\s+(OD-\d+)\s+—\s+(.+)$/gm)]
  .map((m) => ({ id: m[1], title: m[2].trim(), blocking: /BLOCKING/.test(section(prd, `${m[1]} — ${m[2].trim()}`, 3) ?? '') }))
  .filter((o) => !o.title.startsWith('<'));
const prdVersion = (prd.match(/^Version:\s*(.+)$/m) ?? [])[1]?.trim() ?? null;
// A review of the PRD's current version, the way R1 counts one.
const reviewsDir = join(root, 'docs', 'reviews');
const prdReviews = existsSync(reviewsDir)
  ? readdirSync(reviewsDir).filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md').filter((f) => {
      const lines = readFileSync(join(reviewsDir, f), 'utf8').split(/\r?\n/).map((l) => l.replace(/\*\*/g, '').replace(/^[>\s*_-]+/, '').trim());
      const target = lines.find((l) => /^Reviewed:\s*\S+\s+@\s+\S+/.test(l));
      const version = lines.find((l) => /^Version line:/.test(l));
      return !!target && target.includes('docs/PRD.md') && !!prdVersion && !!version && version.includes(prdVersion);
    })
  : [];
const decisions = read('decisions.md') ?? '';
const openDecisions = [...decisions.matchAll(/^##\s+(D-\d+)\s+—\s+(.+?)\s*\*\((open[^)]*)\)\*/gm)].map((m) => `${m[1]} ${m[2]} (${m[3]})`);

const { milestones } = readMilestones(root);
const ms = milestones.filter((m) => m.fm?.id).map((m) => ({ ...m.fm, file: m.file, title: (m.md.match(/^#\s+(.+)$/m) ?? [])[1] ?? m.fm.id }));
const active = ms.filter((m) => m.status === 'active');
const cur = active[0];
const curAppetite = cur && parseAppetite(cur.appetite);

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
const open_ = [];
const parked_ = [];
for (const file of walk(join(root, 'docs'))) {
  const rel_ = relative(root, file);
  const lines = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [, body] of line.matchAll(/\[NEEDS CLARIFICATION:?([^\]]*)\]/g)) open_.push(`${rel_}:${i + 1} — ${body.trim().slice(0, 90) || 'no question written'}`);
    for (const [, body] of line.matchAll(/\[PARKED:([^\]]*)\]/g)) {
      const ref = body.match(/#\d+|\b(?:OD|D)-\d+\b/)?.[0] ?? 'untracked';
      parked_.push(`${rel_}:${i + 1} — ${body.split('·')[0].trim().slice(0, 70)} (${ref})`);
    }
  });
}

const anchor = (read('process/anchor') ?? '').trim();
const lessonsDir = join(root, 'process', 'lessons');
const dueSoon = existsSync(lessonsDir)
  ? readdirSync(lessonsDir).filter((f) => /^L-.*\.md$/.test(f)).flatMap((f) => {
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

// ---- the next step on the slipway path
function next() {
  if (!bootstrapped || packages === 0) {
    const missing = [!bootstrapped && 'AGENT.md still has placeholders', packages === 0 && 'no app package yet (§1)'].filter(Boolean);
    return `Step 0 (you + agent) — Bootstrap: run /bootstrap (${missing.join('; ')}); BOOTSTRAP.md is the reference.`;
  }
  if (frame !== 'framed') return 'Step 1 (you, with /kickoff) — Frame: finish docs/product/FRAME.md, answer or park its open questions, then set status: framed.';
  if (!ms.some((m) => m.status !== 'shaping') && untestedValue.length) {
    return `Step 2 (YOURS, not an agent's — days to weeks) — Test the risk: ${untestedValue.join(', ')} has no Result. An agent can prepare the materials; running the test with real people is yours. Thresholds and results: docs/product/evidence/.`;
  }
  if (prdStatus === 'draft' && !cur && !ms.some((m) => m.status === 'closed')) {
    return prdReviews.length
      ? `Step 3 (you) — Shape: ${prdVersion} is reviewed. Resolve the review's findings in the PRD, then set Status: approved and activate a milestone.`
      : `Step 3 (you, with /kickoff) — Shape: PRD with IDs, week-1 decisions and milestone pitches (/kickoff). Then, in a NEW session, run /review-doc docs/PRD.md — the adversarial review of the document, not /pr-review — and only then set Status: approved (R1 turns red otherwise).`;
  }
  if (active.length > 1) return `Fix: ${active.length} milestones are active (${active.map((m) => m.id).join(', ')}). One at a time — MS1 is red.`;
  if (cur && curAppetite && curAppetite.end < today && !cur.extended) {
    return `Circuit breaker: ${cur.id}'s appetite ended ${curAppetite.end}. Cut scope and close it (/close-milestone), kill it, or record an extension.`;
  }
  if (cur) return `${cur.kind === 'skeleton' ? 'Step 4 (agent) — Walking skeleton' : 'Step 5 (agent) — Build loop'}: ${cur.title}. Next slice from its Contents; pick the lane (CLAUDE.md#Lanes).`;
  const shaping = ms.filter((m) => m.status === 'shaping');
  if (shaping.some((m) => m.kind === 'skeleton')) {
    return 'Step 4 (agent) — Walking skeleton: activate the skeleton milestone (real appetite dates, status: active) and build its first slice.';
  }
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
  if (skel && untestedValue.length) also.push(`(agent) ${skel.id} — the walking skeleton is not blocked by an untested value risk: activate it and build in parallel`);
}
if (prd && !prdReviews.length && (frame === 'framed' || prdStatus !== 'draft')) {
  also.push(`(fresh session) /review-doc docs/PRD.md — the PRD at ${prdVersion ?? '?'} has no adversarial review; needed before Status: approved`);
}
if (open_.length) also.push(`(you) ${open_.length} open question(s) below — answer, or park with an assumption, the cost if wrong, and a tracker`);
if (also.length) L.push('**Also unblocked:**', ...also.map((a) => `- ${a}`), '');

L.push('## Where things stand', '');
L.push(`- Bootstrap: ${bootstrapped ? 'AGENT.md filled' : 'AGENT.md has placeholders'} · ${packages} workspace package(s)`);
L.push(`- Frame: ${frame}${risks.length ? ` · ${risks.length} risk(s), untested value risks: ${untestedValue.join(', ') || 'none'}` : ''}`);
L.push(`- PRD: ${prdStatus}${prdVersion ? ` ${prdVersion}` : ''} · review: ${prdReviews.length ? prdReviews.join(', ') : 'none for this version'}${ods.length ? ` · open questions: ${ods.map((o) => o.id + (o.blocking ? ' (BLOCKING)' : '')).join(', ')}` : ''}`);
if (cur) {
  const a = curAppetite;
  const clock = a ? `day ${days(a.start, today) + 1} of ${days(a.start, a.end) + 1}, last day ${a.end}${a.end < today ? ' — OVERRUN' : ''}` : 'no appetite';
  L.push(`- Active milestone: **${cur.title}** (${cur.kind ?? 'no kind'}) · ${clock}`);
} else L.push('- Active milestone: none');
L.push('');
if (ms.length) {
  L.push('## Milestones', '', '| id | status | kind | appetite | file |', '|---|---|---|---|---|');
  for (const m of ms) L.push(`| ${m.id} | ${m.status} | ${m.kind ?? ''} | ${m.appetite ?? ''} | docs/milestones/${m.file} |`);
  L.push('');
}
const attention = [
  ...(prd && !prdReviews.length && (frame === 'framed' || prdStatus !== 'draft') ? [`PRD ${prdVersion ?? ''} has no adversarial review — run /review-doc docs/PRD.md in a fresh session (R1 requires one once Status leaves draft)`] : []),
  ...openDecisions.map((d) => `Open decision: ${d}`),
  ...open_.map((c) => `Open question: ${c}`),
  ...parked_.map((c) => `Parked: ${c}`),
  ...dueSoon.map((d) => `Lesson review: ${d}`),
];
L.push('## Needs attention', '', ...(attention.length ? attention.map((a) => `- ${a}`) : ['- nothing']), '');
const text = L.join('\n');

if (args.includes('--hook')) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }) + '\n');
} else {
  process.stdout.write(text + '\n');
  if (args.includes('--write')) writeFileSync(join(root, 'STATE.md'), text + '\n');
}
