// What sync prints for the owner (F-08 §3–§4, dev/features/cli-output.md; #166): the plan, and what --apply
// did, as lines on ui.mjs's rail. Each function takes a `ui()` and plain data, and returns the text: sync.mjs
// decides what is in the data, this file only lays it out. Every string from outside (a commit subject, a
// path, a note) reaches the terminal through `u.clean`, `u.link`, `u.section` or `u.line`.

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { oneLine } from './ui.mjs';

// A conventional-commit subject: `type(scope)!: `, the scope and the `!` optional.
export const CONVENTIONAL = /^([a-z]+)(?:\(([^)]+)\))?!?: /;

const NEW_MAX = 8; // "What's new" lists this many, then `… +N more`
const SETTLED = "/sync-slipway settles what follows from slipway and asks only about your project.";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const short = (sha) => sha.slice(0, 7);

// The commit page of a `github:owner/repo` source, or null: any other source has no page to link.
function commitUrl(source, sha) {
  const gh = /^github:([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(source ?? '');
  return gh ? `https://github.com/${gh[1]}/${gh[2]}/commit/${sha}` : null;
}

// A path in the project, linked to its file when the terminal takes links. A path holding a line break would
// print a line of its own on the rail, so it is shown on one line.
const fileLink = (u, root, text, file) => u.link(oneLine(text), pathToFileURL(join(root, file)).href);

// Text cut to the terminal's width with `…`; a pipe has no width, so it is never cut. 3 is the rail's width.
function cut(u, text, indent = 0) {
  const t = u.clean(text);
  const max = u.width - 3 - indent;
  return t.length > max && max > 1 ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * What changes, in counts and in words: one line per kind of change, never a kind's own name. `counts` is
 * kind → rows; `absorbed` and `stale` are the overrides --apply removes and the ones left excusing nothing.
 */
function changeLines(counts, { absorbed = 0, stale = 0 } = {}) {
  const n = (kind) => counts[kind] ?? 0;
  const files = [['replace', 'updated'], ['add', 'added'], ['delete', 'removed']].filter(([k]) => n(k));
  return [
    files.map(([k, verb], i) => (i ? `${n(k)} ${verb}` : `${plural(n(k), 'slipway file')} ${verb}`)).join(' · '),
    n('merge') && `${plural(n('merge'), 'file')} you edited combined with slipway's changes`,
    n('merged: key updated') && `${plural(n('merged: key updated'), 'package.json script')} updated`,
    n('no longer tracked') && `${plural(n('no longer tracked'), 'file')} slipway stopped shipping ${n('no longer tracked') === 1 ? 'stays' : 'stay'} yours`,
    absorbed && `${plural(absorbed, 'override')} removed: slipway's copy now equals yours`,
    stale && `${plural(stale, 'override')} left with nothing to excuse: slipway no longer maintains the file`,
  ].filter(Boolean);
}

const gap = (u) => u.style('dim', '│');
const remoteAndNotes = (u, { remote, notes = [] }) => [
  ...(remote ? [u.line(`remote: ${remote}`)] : []),
  ...notes.map((n) => u.line(`note: ${n}`)),
];
const settledTitle = (n) => `Settled with you: ${n} of your files started from slipway's template, and the template changed.`;

/**
 * The plan (§3). `view`: `{ root, branch, source, base, target, remote, notes, commits, owed, counts,
 * absorbed, stale, next, log }` — `commits` the non-merge subjects newest first, `owed` the items under
 * "Needs you by hand" (`{ kind, path, next, file }`), `log` true for every change instead of what's new.
 */
export function planText(u, view) {
  const { root, branch, source, base, target, commits, owed, counts, next, log } = view;
  const sha = (s) => { const url = commitUrl(source, s); return url ? u.link(short(s), url) : u.clean(short(s)); };
  const parsed = commits.map((subject) => ({ subject, m: CONVENTIONAL.exec(subject) }));
  const feats = parsed.filter((c) => c.m?.[1] === 'feat');
  const fixes = parsed.filter((c) => c.m?.[1] === 'fix').length;
  const other = commits.length - feats.length - fixes;
  const split = [feats.length && `${feats.length} new`, fixes && plural(fixes, 'fix', 'fixes'), other && `${other} other`].filter(Boolean).join(', ');

  const out = [[
    u.section('◇', `slipway sync on ${branch}`),
    `${sha(base)} → ${target ? sha(target) : u.clean('this slipway (its files match no slipway commit)')}`,
    ...(commits.length ? [u.clean(`${plural(commits.length, 'change')}: ${split}`)] : []),
  ].join(' · '), ...remoteAndNotes(u, view), gap(u)];

  if (owed.length) {
    const width = Math.max(...owed.map((i) => i.kind.length));
    out.push(u.section('◆', `Needs you by hand (${owed.length})`));
    for (const i of owed) out.push(`${u.line(`${i.kind.padEnd(width)}  `)}${fileLink(u, root, i.path, i.file)}`, u.line(`next: ${i.next}`, { indent: 2 }));
  } else out.push(u.section('◇', 'Nothing needs you by hand.'));
  out.push(gap(u));

  const settled = counts['seeded: upstream changed'] ?? 0;
  if (settled) out.push(u.section('◇', settledTitle(settled)), u.line(SETTLED), gap(u));

  const changes = changeLines(counts, view);
  if (changes.length) out.push(u.section('◇', 'What changes'), ...changes.map((l) => u.line(l)), gap(u));

  if (log && commits.length) {
    out.push(u.section('◇', `Every change (${commits.length})`), ...commits.map((s) => u.line(s)), gap(u));
  } else if (feats.length) {
    const shown = feats.slice(0, NEW_MAX).map(({ subject, m }) => ({ scope: m[2] ?? '', what: subject.slice(m[0].length) }));
    const width = Math.max(...shown.map((s) => u.clean(s.scope).length));
    out.push(u.section('◇', `What's new (${feats.length}; every change: --log)`));
    for (const s of shown) out.push(u.line(cut(u, width ? `${u.clean(s.scope).padEnd(width)}  ${s.what}` : s.what)));
    if (feats.length > NEW_MAX) out.push(u.line(`… +${feats.length - NEW_MAX} more`));
    out.push(gap(u));
  }
  out.push(u.line(`Next: ${next}`, { last: true }));
  return `${out.join('\n')}\n`;
}

/**
 * What --apply did (§4). `view`: `{ root, name, branch, commit, message, remote, notes, owed, settled,
 * counts, absorbed, stale, also }` — `owed` every leftover (`{ path, file, text }`), `settled` the reference
 * diffs written, `also` lines for "What changed" that are not counts (the harness, when nothing is owed).
 */
export function appliedText(u, view) {
  const { root, name, branch, commit, message, owed, settled, counts, also = [] } = view;
  const out = [u.section('◇', `slipway sync applied on ${name} (from ${branch}) · commit ${short(commit)}`), u.line(message), ...remoteAndNotes(u, view), gap(u)];
  if (owed.length) {
    out.push(u.section('◆', `Needs you before this branch merges (${owed.length})`));
    for (const i of owed) out.push(`${u.line('')}${fileLink(u, root, i.path, i.file)}${oneLine(`  ${i.text}`)}`);
    out.push(u.line('sync exits 1 until these are settled; nothing failed'), gap(u));
  }
  if (settled) {
    out.push(u.section('◇', settledTitle(settled)), u.line("slipway's change to each is saved under .slipway/upstream/ to read, not to apply as a patch."), u.line(SETTLED), gap(u));
  }
  const changes = [...changeLines(counts, view), ...also];
  if (changes.length) out.push(u.section('◇', 'What changed'), ...changes.map((l) => u.line(l)), gap(u));
  out.push(u.line('Next: in Claude Code, /sync-slipway settles the rest and opens the PR (if it sent you here, go back to that session)', { last: true }));
  return `${out.join('\n')}\n`;
}

// --apply with nothing to do: the header, and the one line that says so.
export function alreadyText(u, { branch, target }) {
  return `${u.section('◇', `slipway sync on ${branch}`)}\n${u.line(`Already at ${target.slice(0, 12)} — nothing to apply, nothing written.`, { last: true })}\n`;
}
