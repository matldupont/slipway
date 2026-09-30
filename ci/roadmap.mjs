#!/usr/bin/env node
// roadmap — the milestone page for people on the project who do not read the repo (F-02,
// dev/features/roadmap-page.md). One self-contained index.html, from docs/milestones/ only, and only the fields
// project() names. Deterministic: same tree, same today, same sha, same bytes. No network, no subprocess (D-004).
//
//   node ci/roadmap.mjs [root] --out <dir> [--sha <sha>]   write <dir>/index.html, or print why not
//   node ci/roadmap.mjs [root] --enabled                   print enabled=true|false (for $GITHUB_OUTPUT)
//
// Off unless AGENT.md's `Roadmap page` row says `public`. Off writes nothing and exits 0; a value it does not
// know exits 1 and writes nothing, so a typo never publishes.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentRow, today as localToday } from './checks/lib/clock.mjs';
import { readMilestoneModel } from './checks/lib/milestones.mjs';
import { milestoneNumber } from './checks/lib/risks.mjs';
import { escapeHtml } from './checks/lib/html.mjs';
import { UNSAFE } from './checks/lib/report.mjs';

const ROW = 'Roadmap page';

// 'off' or 'public'. Throws on any other value.
export function roadmapSwitch(root) {
  const value = agentRow(root, ROW, 'Skill Configuration');
  if (!value || value === 'off' || value.startsWith('<')) return 'off';
  if (value === 'public') return 'public';
  throw new Error(`AGENT.md ${ROW} is "${value.replace(new RegExp(UNSAFE.source, 'gv'), '')}": use off or public`);
}

// The allowlist (dev/features/roadmap-page.md → The allowlist). Every field the page shows is named here, and
// nothing else in a model entry reaches the page: a field added to readMilestoneModel for another view stays out.
// Only frontmatter-backed fields: nothing read from the body's sections, so no-gos stay off (D-017, revised
// 2026-09-30). Appetite dates never for shaping milestones.
export function project(m) {
  return {
    id: m.id,
    title: m.title,
    status: m.status,
    kind: m.kind,
    summary: m.summary,
    appetite: m.status === 'shaping' || !m.appetite ? null : { start: m.appetite.start, end: m.appetite.end },
    extended: m.status === 'active' ? m.extended : null,
    clock: m.status === 'active' && m.clock ? { day: m.clock.day, of: m.clock.of, end: m.clock.end, overrun: m.clock.overrun } : null,
  };
}

const DROP = new RegExp(UNSAFE.source, 'gv');

const KIND = { skeleton: 'First end-to-end version', mvp: 'First usable version', release: 'Release', bet: 'Improvement' };
const byNumber = (a, b) => (milestoneNumber(a.id) || 0) - (milestoneNumber(b.id) || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// A projected milestone: it prints what project() left in it, so project() is the one gate.
function card(m, when) {
  const h = [`<article>`, `<h3><span class="id">${escapeHtml(m.id)}</span>${m.title ? ` ${escapeHtml(m.title)}` : ''}</h3>`];
  const meta = [m.kind && KIND[m.kind], when].filter(Boolean);
  if (meta.length) h.push(`<p class="meta">${meta.map((t) => `<span>${escapeHtml(t)}</span>`).join(' · ')}</p>`);
  h.push(`<p>${escapeHtml(m.summary ?? (m.status === 'shaping' ? 'Being shaped' : ''))}</p>`);
  h.push(`</article>`);
  return h.join('\n');
}

function nowLine(m) {
  const a = m.appetite;
  if (!a) return null;
  if (m.extended) return `Extended · time budget was ${a.start} to ${a.end}`;
  const c = m.clock;
  if (c.overrun) return 'Past its time budget, being wrapped up';
  if (c.day < 1) return `Starts ${a.start} · time budget ends ${c.end}`;
  return `day ${c.day} of ${c.of} · time budget ends ${c.end}`;
}

// The page, from model entries (readMilestoneModel). Each entry passes through project() first.
export function renderPage({ product, milestones, today, sha }) {
  const ms = milestones.map(project);
  const now = ms.filter((m) => m.status === 'active').sort(byNumber);
  const next = ms.filter((m) => m.status === 'shaping').sort(byNumber);
  const done = ms.filter((m) => m.status === 'closed').sort((a, b) => (b.appetite?.end ?? '').localeCompare(a.appetite?.end ?? '') || byNumber(a, b));
  const stopped = ms.filter((m) => m.status === 'killed').sort(byNumber);
  const name = product ? escapeHtml(product) : '';
  const sections = [];
  if (!ms.length) sections.push('<section><p>No milestones yet.</p></section>');
  else {
    sections.push(`<section><h2>Now</h2>\n${now.length ? now.map((m) => card(m, nowLine(m))).join('\n') : '<p>Nothing is being built right now.</p>'}</section>`);
    if (next.length) sections.push(`<section><h2>Next</h2>\n${next.map((m) => card(m)).join('\n')}</section>`);
    if (done.length) sections.push(`<section><h2>Done</h2>\n${done.map((m) => card(m, m.appetite && `Ended ${m.appetite.end}`)).join('\n')}</section>`);
    if (stopped.length) sections.push(`<section><h2>Stopped</h2>\n${stopped.map((m) => card(m)).join('\n')}</section>`);
  }
  const from = sha ? ` from ${escapeHtml(sha.slice(0, 7))}` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${name ? `${name} roadmap` : 'Roadmap'}</title>
<style>
:root { color-scheme: light dark; --bg: #f7f7f5; --fg: #1d1d1b; --muted: #5f5f5a; --card: #ffffff; --line: #deded8; --accent: #2f5d8a; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --fg: #ececea; --muted: #a3a39c; --card: #1f1f1d; --line: #34342f; --accent: #8bb4dc; } }
html { scrollbar-gutter: stable; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; overflow-wrap: break-word; }
main { max-width: 42rem; margin: 0 auto; padding: 2rem 1rem 3rem; }
h1 { font-size: 1.5rem; margin: 0 0 1.5rem; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 2rem 0 0.75rem; }
h3 { font-size: 1.1rem; margin: 0 0 0.25rem; }
.id { color: var(--accent); }
article { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 1rem; margin: 0 0 0.75rem; }
article p { margin: 0.25rem 0 0; }
.meta { color: var(--muted); font-size: 0.9rem; }
.meta span { white-space: nowrap; }
footer { color: var(--muted); font-size: 0.85rem; border-top: 1px solid var(--line); margin-top: 2rem; padding-top: 1rem; }
</style>
</head>
<body>
<main>
<h1>${name ? `${name} roadmap` : 'Roadmap'}</h1>
${sections.join('\n')}
<footer>Updated ${escapeHtml(today)}${from}. A time budget is a limit, not a deadline: when it ends, the scope is cut, not the date moved.</footer>
</main>
</body>
</html>
`;
}

function main(argv) {
  const args = argv.slice(2);
  const flag = (f) => {
    const i = args.indexOf(f);
    return i < 0 ? undefined : args[i + 1];
  };
  const out = flag('--out');
  const sha = flag('--sha');
  const root = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out' && args[i - 1] !== '--sha') ?? '.';
  const enabled = args.includes('--enabled');
  if (!enabled && !out) {
    process.stderr.write('usage: node ci/roadmap.mjs [root] --out <dir> [--sha <sha>] | --enabled\n');
    return 2;
  }
  if (sha !== undefined && !/^[0-9a-f]{7,64}$/i.test(sha)) {
    process.stderr.write('roadmap: --sha takes a hex commit sha\n');
    return 2;
  }
  let on;
  try {
    on = roadmapSwitch(root) === 'public';
  } catch (e) {
    process.stderr.write(`roadmap: ${e.message}\n`);
    return 1;
  }
  if (enabled) {
    process.stdout.write(`enabled=${on}\n`);
    return 0;
  }
  if (!on) {
    process.stdout.write(`roadmap: off (AGENT.md ${ROW})\n`);
    return 0;
  }
  let html;
  try {
    const today = localToday(root);
    const product = agentRow(root, 'Product name');
    html = renderPage({ product: product && !product.startsWith('<') ? product : null, milestones: readMilestoneModel(root, today), today, sha });
  } catch (e) {
    process.stderr.write(`roadmap: ${e.message.replace(DROP, '')}\n`);
    return 1;
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), html);
  process.stdout.write(`roadmap: wrote ${join(out, 'index.html')}\n`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
