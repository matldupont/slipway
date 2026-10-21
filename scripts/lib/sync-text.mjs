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
// --apply wrote the sync skill or a file it cites (#216): a session that began the sync holds the old copy.
export const SKILL_CHANGED = 'The sync skill changed in this sync: once your tree is on the sync commit, read .claude/skills/sync-slipway/SKILL.md again before you continue.';
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

// The target as the owner reads it (F-10): the release and its commit, or the commit alone when it is no
// release's — a commit carries a version number without being that release. `sha` is already as shown.
export const targetName = (version, sha) => (version ? `use-slipway ${oneLine(version)}, commit ${sha}` : `commit ${sha}, not a release`);

// What the owner reads of the count sync records in ci/baselines.json (F-12, dev/features/feature-fit.md §3), one
// sentence per line, in the project's words (D-016): never a check's id. `count` holds numbers only: `{ n,
// noStatus, drafts, others }` — the held docs with no filled Fit, how many of them are counted for a missing
// status line, how many drafts not yet held lack Fit, how many files in each of the two folders are not
// feature docs, having no F-number heading (`{ 'docs/features/': 1 }`), and how many `*.md` in each are a link or
// a folder, not a file (`notFiles`, the same shape). The plan, --apply and --json's notes carry the same lines.
//
// No text of the project's reaches a line: no file name, no path, no error text. The notes are read to the owner
// by an agent, and a file name is a sentence someone else wrote. The folders are named from this list alone.
const FEATURE_FOLDERS = ['docs/features/', 'dev/features/'];
export function countLines({ n, noStatus = 0, drafts = 0, others = {}, notFiles = {} }) {
  const lines = [
    n === 0
      ? 'No feature doc that is shipped, reviewed or scheduled is missing its Fit section. The count is recorded at 0 and may not go up.'
      : `${plural(n, 'feature doc')} that ${n === 1 ? 'is' : 'are'} shipped, reviewed or scheduled ${n === 1 ? 'has' : 'have'} no Fit section filled in yet. The count is recorded at ${n} and may only go down.`,
  ];
  if (noStatus) lines.push(`Of these, ${noStatus} ${noStatus === 1 ? 'has' : 'have'} no readable status line in ${noStatus === 1 ? 'its' : 'their'} header, so ${noStatus === 1 ? 'it is' : 'they are'} counted whatever ${noStatus === 1 ? 'its' : 'their'} Fit says; give ${noStatus === 1 ? 'it' : 'each'} one and it is read normally.`);
  if (drafts) lines.push(`${plural(drafts, 'feature doc')} still being drafted ${drafts === 1 ? 'has' : 'have'} no Fit section filled in yet; ${drafts === 1 ? 'it' : 'each'} needs one before it is reviewed, scheduled or shipped.`);
  const byFolder = (counts) => {
    const folders = FEATURE_FOLDERS.filter((d) => Number.isInteger(counts[d]) && counts[d] > 0);
    return { folders, n: folders.reduce((sum, d) => sum + counts[d], 0) };
  };
  const files = byFolder(others);
  if (files.n) lines.push(`${plural(files.n, 'file')} in ${files.folders.join(' and ')} ${files.n === 1 ? 'is not a feature doc, having no F-number heading, and is' : 'are not feature docs, having no F-number heading, and are'} not counted.`);
  const entries = byFolder(notFiles);
  if (entries.n) lines.push(`${plural(entries.n, 'entry', 'entries')} named \`*.md\` in ${entries.folders.join(' and ')} ${entries.n === 1 ? 'is a link or a folder, not a file, so it is' : 'are links or folders, not files, so they are'} not read and not counted.`);
  return lines;
}
// What the owner reads of the decisions whose conditions status cannot see (F-15 §7): ids only, from `readDecisions`, never
// a decision's own words. `prose` are the decisions that say when they reopen or close in prose alone, `issues` those
// waiting on an issue; one sentence, or none when both are empty.
const DECISION_IDS = /^P?D-\d{1,9}$/;
const CAP = 20;
const idList = (ids) => {
  const safe = ids.filter((id) => DECISION_IDS.test(id));
  return safe.length > CAP ? `${safe.slice(0, CAP).join(', ')} and ${safe.length - CAP} more` : safe.join(', ');
};
export function decisionNote({ prose = [], issues = [] }) {
  const [p, i] = [prose, issues].map((ids) => ids.filter((id) => DECISION_IDS.test(id)));
  const parts = [];
  if (p.length) parts.push(`${plural(p.length, 'decision')} say${p.length === 1 ? 's' : ''} when ${p.length === 1 ? 'it reopens' : 'they reopen'} or ${p.length === 1 ? 'closes' : 'close'} in prose only (${idList(p)})`);
  if (i.length) parts.push(`${p.length ? i.length : plural(i.length, 'decision')} ${i.length === 1 ? 'waits' : 'wait'} on an issue status cannot see (${idList(i)})`);
  if (!parts.length) return [];
  const why = [p.length && 'nothing reads a prose condition until it is written as an event', i.length && 'check the issue by hand'].filter(Boolean).join('; ');
  return [`${parts.join(', and ')}: ${why}`];
}
// The feature docs owed a review of their current version (#493), counted by id: `ns` is each doc's F-<n> numbers, the
// first one naming it. Status names each with its command; the note only counts them.
export function reviewNote(docs) {
  if (!docs.length) return [];
  const ids = docs.map((ns) => `F-${ns[0]}`);
  const shown = ids.length > CAP ? `${ids.slice(0, CAP).join(', ')} and ${ids.length - CAP} more` : ids.join(', ');
  return [`${plural(docs.length, 'feature doc')} ${docs.length === 1 ? 'has' : 'have'} no review of ${docs.length === 1 ? 'its' : 'their'} current version (${shown}): pnpm status lists each with its /review-doc command, and ${docs.length === 1 ? 'its' : 'their'} build tickets wait on that review`];
}
// An error's code for a refusal, as ` (ENOENT)`, only when it is capitals, digits and underscores; else nothing.
export const codeNote = (e) => (/^[A-Z][A-Z0-9_]{1,30}$/.test(e?.code ?? '') ? ` (${e.code})` : '');
const countSection = (u, count, applied) => [u.section('◇', `${count.file} — count recorded${applied ? ` at ${count.n}` : ''}`), ...countLines(count).map((l) => u.line(l)), gap(u)];

const gap = (u) => u.style('dim', '│');
const remoteAndNotes = (u, { remote, notes = [] }) => [
  ...(remote ? [u.line(`remote: ${remote}`)] : []),
  ...notes.map((n) => u.line(`note: ${n}`)),
];
// "Needs you by hand": one item per path, its next step beneath.
function owedLines(u, root, owed) {
  const width = Math.max(...owed.map((i) => i.kind.length));
  return [
    u.section('◆', `Needs you by hand (${owed.length})`),
    ...owed.flatMap((i) => [`${u.line(`${i.kind.padEnd(width)}  `)}${fileLink(u, root, i.path, i.file)}`, u.line(`next: ${i.next}`, { indent: 2 })]),
  ];
}
const settledTitle = (n) => `Settled with you: ${n} of your files started from slipway's template, and the template changed.`;

/**
 * The plan (§3). `view`: `{ root, branch, source, base, target, remote, notes, commits, owed, counts,
 * absorbed, stale, next, log, version, count }` — `count` what countLines() takes, with the `file` it is recorded in, or null, `version` the release the target is, or null, `commits` the non-merge subjects newest first, `owed` the items under
 * "Needs you by hand" (`{ kind, path, next, file }`), `log` true for every change instead of what's new.
 */
export function planText(u, view) {
  const { root, branch, source, base, target, version, commits, owed, counts, next, log } = view;
  const sha = (s) => { const url = commitUrl(source, s); return url ? u.link(short(s), url) : u.clean(short(s)); };
  const parsed = commits.map((subject) => ({ subject, m: CONVENTIONAL.exec(subject) }));
  const feats = parsed.filter((c) => c.m?.[1] === 'feat');
  const fixes = parsed.filter((c) => c.m?.[1] === 'fix').length;
  const other = commits.length - feats.length - fixes;
  const split = [feats.length && `${feats.length} new`, fixes && plural(fixes, 'fix', 'fixes'), other && `${other} other`].filter(Boolean).join(', ');

  const out = [[
    u.section('◇', `slipway sync on ${branch}`),
    `${sha(base)} → ${target ? targetName(version, sha(target)) : u.clean('this slipway (its files match no slipway commit)')}`,
    ...(commits.length ? [u.clean(`${plural(commits.length, 'change')}: ${split}`)] : []),
  ].join(' · '), ...remoteAndNotes(u, view), gap(u)];

  if (owed.length) out.push(...owedLines(u, root, owed));
  else out.push(u.section('◇', 'Nothing needs you by hand.'));
  out.push(gap(u));

  const settled = counts['seeded: upstream changed'] ?? 0;
  if (settled) out.push(u.section('◇', settledTitle(settled)), u.line(SETTLED), gap(u));
  if (view.count) out.push(...countSection(u, view.count, false));

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
 * counts, absorbed, stale, also, target, version }` — `target` and `version` what was taken, `owed` every leftover (`{ path, file, text }`), `settled` the reference
 * diffs written, `also` lines for "What changed" that are not counts (the harness, when nothing is owed), `skill`
 * true when --apply wrote the sync skill or a file it cites.
 */
export function appliedText(u, view) {
  const { root, name, branch, commit, message, target, version, owed, settled, counts, also = [], skill = false } = view;
  const out = [u.section('◇', `slipway sync applied on ${name} (from ${branch}) · commit ${short(commit)}`), u.line(message), u.line(`took ${targetName(version, short(target))}`), ...remoteAndNotes(u, view), gap(u)];
  if (owed.length) {
    out.push(u.section('◆', `Needs you before this branch merges (${owed.length})`));
    for (const i of owed) out.push(`${u.line('')}${fileLink(u, root, i.path, i.file)}${oneLine(`  ${i.text}`)}`);
    out.push(u.line('sync exits 1 until these are settled; nothing failed'), gap(u));
  }
  if (settled) {
    out.push(u.section('◇', settledTitle(settled)), u.line("slipway's change to each is saved under .slipway/upstream/ to read, not to apply as a patch."), u.line(SETTLED), gap(u));
  }
  if (view.count) out.push(...countSection(u, view.count, true));
  const changes = [...changeLines(counts, view), ...also, ...(skill ? [SKILL_CHANGED] : [])];
  if (changes.length) out.push(u.section('◇', 'What changed'), ...changes.map((l) => u.line(l)), gap(u));
  out.push(u.line('Next: in Claude Code, /sync-slipway settles the rest and opens the PR (if it sent you here, go back to that session)', { last: true }));
  return `${out.join('\n')}\n`;
}

// Nothing to take: the one sentence the plan, --apply and --json's `next` all carry.
export const alreadyLine = ({ version, target }) => `Already at ${targetName(version, target.slice(0, 12))} — nothing to apply, nothing written.`;

// The plan or --apply with nothing to take: the header, the remote and notes, what still needs the owner by
// hand (`owed`, as the plan lists it), and that sentence where `Next:` would be.
export function alreadyText(u, view) {
  const { root, branch, owed = [] } = view;
  return `${[u.section('◇', `slipway sync on ${branch}`), ...remoteAndNotes(u, view), ...(owed.length ? [gap(u), ...owedLines(u, root, owed), gap(u)] : []), u.line(alreadyLine(view), { last: true })].join('\n')}\n`;
}

// The project's base is past the target: the one sentence the plan, --apply and --json's `next` all carry.
export const pastLine = ({ version, target }) =>
  (version
    ? `your project is already past use-slipway ${oneLine(version)} (commit ${target.slice(0, 12)}); nothing to take`
    : `your project is already past commit ${target.slice(0, 12)}, which is not a release; nothing to take`);

// The plan or --apply for such a project: the header, the remote and notes, and that sentence. Nothing was written.
export function pastText(u, view) {
  return `${[u.section('◇', `slipway sync on ${view.branch}`), ...remoteAndNotes(u, view), u.line(pastLine(view), { last: true })].join('\n')}\n`;
}
