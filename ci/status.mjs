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
const clarifications = walk(join(root, 'docs'))
  .map((p) => ({ p: relative(root, p), n: (readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '').match(/\[NEEDS CLARIFICATION/g) ?? []).length }))
  .filter((x) => x.n);

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
    return `Step 0 — Bootstrap: follow BOOTSTRAP.md (${missing.join('; ')}).`;
  }
  if (frame !== 'framed') return 'Step 1 — Frame: finish docs/product/FRAME.md (run /kickoff), then set status: framed.';
  if (!ms.some((m) => m.status !== 'shaping') && untestedValue.length) {
    return `Step 2 — Test the risk: ${untestedValue.join(', ')} has no Result. Write the threshold first, then test (docs/product/evidence/).`;
  }
  if (prdStatus === 'draft' && !cur && !ms.some((m) => m.status === 'closed')) {
    return 'Step 3 — Shape: PRD with IDs, week-1 decisions in decisions.md, milestone pitches, fresh-context review; then set PRD Status: approved.';
  }
  if (active.length > 1) return `Fix: ${active.length} milestones are active (${active.map((m) => m.id).join(', ')}). One at a time — MS1 is red.`;
  if (cur && curAppetite && curAppetite.end < today && !cur.extended) {
    return `Circuit breaker: ${cur.id}'s appetite ended ${curAppetite.end}. Cut scope and close it (/close-milestone), kill it, or record an extension.`;
  }
  if (cur) return `${cur.kind === 'skeleton' ? 'Step 4 — Walking skeleton' : 'Step 5 — Build loop'}: ${cur.title}. Next slice from its Contents; pick the lane (CLAUDE.md#Lanes).`;
  const shaping = ms.filter((m) => m.status === 'shaping');
  if (shaping.some((m) => m.kind === 'skeleton')) {
    return 'Step 4 — Walking skeleton: set M1 to active with real appetite dates and build its first slice.';
  }
  return shaping.length
    ? `Step 6 — Choose the next bet: activate one of ${shaping.map((m) => m.id).join(', ')} (set appetite dates), or shape a new one.`
    : 'Step 6/7 — No milestone active or shaped: shape the next bet from docs/product/metrics.md evidence.';
}

// ---- render
const L = [];
L.push(`# STATE — generated by \`pnpm status\` on ${today}. Do not edit; regenerate.`, '');
L.push(`**Next:** ${next()}`, '');
L.push('## Where things stand', '');
L.push(`- Bootstrap: ${bootstrapped ? 'AGENT.md filled' : 'AGENT.md has placeholders'} · ${packages} workspace package(s)`);
L.push(`- Frame: ${frame}${risks.length ? ` · ${risks.length} risk(s), untested value risks: ${untestedValue.join(', ') || 'none'}` : ''}`);
L.push(`- PRD: ${prdStatus}${ods.length ? ` · open questions: ${ods.map((o) => o.id + (o.blocking ? ' (BLOCKING)' : '')).join(', ')}` : ''}`);
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
  ...openDecisions.map((d) => `Open decision: ${d}`),
  ...clarifications.map((c) => `${c.n} [NEEDS CLARIFICATION] in ${c.p}`),
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
