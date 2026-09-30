#!/usr/bin/env node
// work-order — the owner's page for the active milestone: which issues are ready, which can run side by side, and
// the command each starts with (F-07, dev/features/work-order.md). Written to the owner's temp dir, never published.
//
//   node ci/work-order.mjs [root] [--out <file>]     write the page, print its path
//
// collect(root, gh) reads the settings, the milestone and GitHub into a model; render(model) makes the page.
// `gh` is a function (args) -> stdout, so a test answers from fixtures. Zero dependencies (D-004).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentRow, today as localToday } from './checks/lib/clock.mjs';
import { PLACEHOLDER } from './checks/lib/frontmatter.mjs';
import { escapeShown } from './checks/lib/html.mjs';
import { blockers, designation, overlap, touches } from './checks/lib/issue-body.mjs';
import { trustedEnvAt } from './checks/lib/manifest.mjs';
import { plain } from './checks/lib/markdown.mjs';
import { contents, readMilestoneModel, readMilestones, started } from './checks/lib/milestones.mjs';
import { escapeControl } from './checks/lib/report.mjs';

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MARKER = /(?:^|\s)·\s*(?:([\w.-]+\/[\w.-]+))?#(\d+)$/;
const FIELDS = 'number title state stateReason body';
const PICKS = 3;

class Stop extends Error {}

function settings(root) {
  const own = existsSync(join(root, 'dev', 'skill-configuration.md')) && !existsSync(join(root, '.slipway', 'manifest.json'));
  const file = own ? join('dev', 'skill-configuration.md') : 'AGENT.md';
  const repo = agentRow(root, 'Issue repo', 'Skill Configuration', file);
  if (!REPO.test(repo) || repo.split('/').some((s) => /^\.+$/.test(s))) throw new Stop('set Issue repo in AGENT.md (owner/name)');
  const product = agentRow(root, 'Product name', 'Skill Configuration', file);
  return { repo, product: product && !product.startsWith('<') ? product : null };
}

// `gh` for real: a fixed argument array, never a shell, found on a PATH without the repository's or node_modules'
// entries, run from outside the repository. GitHub answers a missing issue with data and a NOT_FOUND error, exit 1:
// that answer is used, any other error is not.
export function realGh(root) {
  const env = trustedEnvAt(root);
  return (args) => {
    try {
      return execFileSync('gh', args, { cwd: tmpdir(), env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
    } catch (e) {
      try {
        const r = JSON.parse(e.stdout);
        if (r.data?.repository && r.errors?.length && r.errors.every((x) => x.type === 'NOT_FOUND')) return e.stdout;
      } catch {}
      throw e;
    }
  };
}

function call(gh, args) {
  try {
    return gh(args);
  } catch (e) {
    const why = escapeControl(String(e.stderr || e.message || e).split('\n')[0]).slice(0, 200);
    throw new Stop(`gh failed (see gh auth status): ${why}`);
  }
}

// Issues by number, as GraphQL aliases i<n>. `numbers` are digits from a marker, never text.
function issues(gh, repo, numbers, shape) {
  const [owner, name] = repo.split('/');
  const q = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){${numbers.map((n) => `i${n}:issue(number:${n}){${shape}}`).join(' ')}}}`;
  const r = JSON.parse(call(gh, ['api', 'graphql', '-f', `query=${q}`, '-f', `owner=${owner}`, '-f', `name=${name}`]));
  return new Map(numbers.map((n) => [n, r.data?.repository?.[`i${n}`] ?? null]));
}

const statusOf = (i) => (i.state === 'CLOSED' ? (i.stateReason === 'NOT_PLANNED' || i.stateReason === 'DUPLICATE' ? 'dropped' : 'done') : 'open');

export function collect(root, gh) {
  const { repo, product } = settings(root);
  const now = process.env.CHECK_NOW ? new Date(process.env.CHECK_NOW) : new Date();
  const renderedAt = `${now.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  const base = { product, repo, renderedAt, milestone: null, next: [], shape: null };
  const m = readMilestoneModel(root, localToday(root)).find((x) => x.status === 'active');
  if (!m) return base;
  const md = readMilestones(root).milestones.find((x) => x.file === m.file).md;
  const items = contents(md)
    .filter((i) => !PLACEHOLDER.test(i.text))
    .map((i) => {
      const at = started(i.text) ? i.text.trimEnd().slice(-200).match(MARKER) : null;
      return { n: i.n, text: plain(i.text.replace(MARKER, '').replace(/\s+/g, ' ')), issue: at ? Number(at[2]) : null, foreign: at?.[1] && at[1].toLowerCase() !== repo.toLowerCase() ? at[1] : null };
    });
  const read = items.filter((i) => i.issue !== null && !i.foreign).map((i) => i.issue);
  const byNumber = read.length ? issues(gh, repo, [...new Set(read)], `${FIELDS} subIssues(first:50){nodes{${FIELDS}}}`) : new Map();
  const prs = read.length ? JSON.parse(call(gh, ['pr', 'list', '--repo', repo, '--state', 'open', '--limit', '200', '--json', 'number,isDraft,body'])) : [];
  const known = new Map();
  for (const i of byNumber.values()) for (const x of i ? [i, ...(i.subIssues?.nodes ?? [])] : []) known.set(x.number, x);
  const parsed = new Map();
  const leaf = (x) => {
    const c = statusOf(x);
    const ref = new RegExp(`\\b(?:closes|fixes|resolves|part of)\\s+#${x.number}(?!\\d)`, 'i');
    const pr = c === 'open' ? prs.filter((p) => ref.test(p.body ?? '')).sort((a, b) => a.number - b.number)[0] : null;
    const b = blockers(x.body ?? '');
    parsed.set(x.number, b.numbers);
    return { n: x.number, title: x.title, status: pr ? 'pr' : c, pr: pr ? { n: pr.number, draft: pr.isDraft } : null, unfiled: b.unfiled, touches: touches(x.body ?? ''), designation: designation(x.body ?? '') };
  };
  for (const i of items) {
    if (i.issue === null || i.foreign) continue;
    const top = byNumber.get(i.issue);
    const subs = top?.subIssues?.nodes ?? [];
    i.leaves = !top ? [{ n: i.issue, missing: true }] : (subs.length ? subs : [top]).map(leaf);
  }
  const leaves = items.flatMap((i) => i.leaves ?? []).filter((l) => !l.missing);
  const need = [...new Set([...parsed.values()].flat())].filter((n) => !known.has(n));
  const later = need.length ? issues(gh, repo, need, 'number state stateReason') : new Map();
  const state = (n) => {
    const x = known.get(n) ?? later.get(n);
    return x ? statusOf(x) : 'missing';
  };
  for (const l of leaves) {
    l.blockers = parsed.get(l.n).map((n) => ({ n, status: state(n) }));
    l.ready = l.status === 'open' && !l.unfiled && l.blockers.every((b) => b.status === 'done' || b.status === 'dropped');
  }
  const busy = leaves.filter((l) => l.status === 'pr').map((l) => l.touches);
  const next = [];
  for (const l of leaves) {
    if (next.length === PICKS) break;
    if (l.ready && ![...busy, ...next.map((x) => x.touches)].some((t) => overlap(l.touches, t))) next.push(l);
  }
  const unstarted = items.find((i) => i.issue === null && !i.foreign);
  const shape = next.length < PICKS && unstarted ? unstarted.n : null;
  const c = m.clock;
  const clock = !c ? null : c.overrun ? 'Past its time budget' : c.day < 1 ? `Starts ${m.appetite.start}` : `day ${c.day} of ${c.of}`;
  return { ...base, milestone: { id: m.id, title: m.title, summary: m.summary, clock, items }, next, shape };
}

const e = escapeShown;
const code = (t) => `<code>${e(t)}</code>`;
const link = (repo, n) => `<a href="https://github.com/${repo}/issues/${Number(n)}">#${Number(n)}</a>`;
const touchText = (l) => (l.touches ? `Touches ${l.touches.map(e).join(', ')}` : 'Touches: not listed');
const words = { open: 'open', done: 'done', dropped: 'dropped', missing: 'not found' };

function leafHtml(repo, l) {
  if (l.missing) return `<li>#${Number(l.n)} not found</li>`;
  const status = l.status === 'pr' ? `PR #${Number(l.pr.n)}${l.pr.draft ? ' (draft)' : ''}` : words[l.status];
  const wait = l.blockers.map((b) => `${link(repo, b.n)} (${words[b.status]})`);
  return [
    `<li><p>${link(repo, l.n)} ${e(l.title)} · <b>${e(status)}</b></p>`,
    wait.length || l.unfiled ? `<p class="meta">${[wait.length && `Blocked by ${wait.join(', ')}`, l.unfiled && 'Waits on work not filed yet'].filter(Boolean).join(' · ')}</p>` : '',
    l.status === 'open' ? `<p>${code(`/work-ticket ${Number(l.n)}`)}</p>` : '',
    l.designation ? `<details><summary>Model and effort</summary><p>${e(l.designation)}</p></details>` : '',
    '</li>',
  ].join('');
}

function itemHtml(repo, milestone, i) {
  const head = `<h3><span class="id">${i.n}.</span> ${e(i.text)}</h3>`;
  if (i.foreign) return `<article>${head}<p class="meta">in ${e(i.foreign)}; not read</p></article>`;
  if (i.issue === null) return `<article>${head}<p>${code(`/log-feature ${milestone.id}#${i.n}`)}</p></article>`;
  const open = i.leaves.filter((l) => l.missing || l.status === 'open' || l.status === 'pr');
  const shut = i.leaves.filter((l) => !open.includes(l));
  return [
    `<article>${head}`,
    `<ul>${open.map((l) => leafHtml(repo, l)).join('')}</ul>`,
    shut.length ? `<details><summary>${shut.length} done or dropped</summary><ul>${shut.map((l) => leafHtml(repo, l)).join('')}</ul></details>` : '',
    '</article>',
  ].join('\n');
}

const finished = (i) => i.issue !== null && !i.foreign && i.leaves.every((l) => !l.missing && (l.status === 'done' || l.status === 'dropped'));

export function render(model) {
  const { repo, product, milestone: m } = model;
  const title = `${product ? `${product} ` : ''}work order`;
  const body = [];
  if (!m) body.push('<p>No milestone is active. Run <code>pnpm status</code> for the next step.</p>');
  else {
    body.push(`<p class="meta">${[m.clock && e(m.clock), `Rendered ${e(model.renderedAt)} from ${e(repo)}`].filter(Boolean).join(' · ')}</p>`);
    body.push(`<h2>Next</h2>`);
    const picks = model.next.map((l) => `<article><p>${link(repo, l.n)} ${e(l.title)}</p><p class="meta">${touchText(l)}</p><p>${code(`/work-ticket ${l.n}`)}</p>${l.designation ? `<p class="meta">${e(l.designation)}</p>` : ''}</article>`);
    if (model.shape !== null) picks.push(`<article><p>Shape item ${model.shape}</p><p>${code(`/log-feature ${m.id}#${model.shape}`)}</p></article>`);
    body.push(picks.length ? picks.join('\n') : '<p>Nothing is ready to start.</p>');
    body.push('<h2>Items</h2>');
    body.push(...m.items.filter((i) => !finished(i)).map((i) => itemHtml(repo, m, i)));
    const done = m.items.filter(finished);
    if (done.length) body.push(`<h2>Finished</h2>\n<details><summary>${done.length} finished</summary>${done.map((i) => itemHtml(repo, m, i)).join('\n')}</details>`);
  }
  const heading = m ? `<h1>${product ? `${e(product)} · ` : ''}<span class="id">${e(m.id)}</span>${m.title ? ` ${e(m.title)}` : ''}</h1>${m.summary ? `<p>${e(m.summary)}</p>` : ''}` : `<h1>${e(title)}</h1>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${e(title)}</title>
<style>
:root { color-scheme: light dark; --bg: #f7f7f5; --fg: #1d1d1b; --muted: #5f5f5a; --card: #ffffff; --line: #deded8; --accent: #2f5d8a; }
@media (prefers-color-scheme: dark) { :root { --bg: #161615; --fg: #ececea; --muted: #a3a39c; --card: #1f1f1d; --line: #34342f; --accent: #8bb4dc; } }
html { scrollbar-gutter: stable; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; overflow-wrap: anywhere; }
main { max-width: 46rem; margin: 0 auto; padding: 2rem 1rem 3rem; }
h1 { font-size: 1.4rem; margin: 0 0 0.5rem; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 2rem 0 0.75rem; }
h3 { font-size: 1rem; margin: 0 0 0.25rem; }
.id, a { color: var(--accent); }
article { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 0.75rem 1rem; margin: 0 0 0.75rem; }
article p, li p { margin: 0.25rem 0 0; }
ul { margin: 0; padding-left: 1.25rem; }
.meta { color: var(--muted); font-size: 0.9rem; }
code { user-select: all; background: var(--bg); border: 1px solid var(--line); border-radius: 4px; padding: 0.1rem 0.35rem; }
details { margin: 0.5rem 0 0; }
summary { cursor: pointer; color: var(--muted); }
</style>
</head>
<body>
<main>
${heading}
${body.join('\n')}
</main>
</body>
</html>
`;
}

function main(argv) {
  const args = argv.slice(2);
  const at = args.indexOf('--out');
  const out = at < 0 ? undefined : args[at + 1];
  const root = args.find((a, i) => !a.startsWith('--') && i !== at + 1) ?? '.';
  if (at >= 0 && !out) {
    process.stderr.write('usage: node ci/work-order.mjs [root] [--out <file>]\n');
    return 2;
  }
  try {
    const model = collect(root, realGh(root));
    const file = resolve(out ?? join(tmpdir(), 'work-order', `${model.repo.replace('/', '-')}.html`));
    const html = render(model);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, html);
    renameSync(`${file}.tmp`, file);
    process.stdout.write(`${file}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`work-order: ${escapeControl(err instanceof Stop ? err.message : `stopped on an error: ${err.message}`)}\n`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv);
