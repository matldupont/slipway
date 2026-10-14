// The decisions record as data: the one reader of decisions.md for what a decision still owes (F-15,
// dev/features/owed-decisions.md §2). DC1, `pnpm status`, P1, sync and /close-milestone read it through here, so they
// cannot disagree about which entry amends what, which condition fired, or which one cannot be read. It never exits,
// so a program that is not a check can import it.
//
// Three labelled lines may sit under a decision's heading, at column 0, with no list mark and no emphasis:
//
//   Amends: F-07                    the features it changes; owed until that feature's doc or Contents line names it
//   Reopens when: F-07 is reviewed  one event, or several joined by ` or `, from §3's closed list (parseEvent)
//   Closes when: M2 is closed
//
// A heading's status suffix is read too: each clause after the first, split on ` · `, that starts `reopens when`,
// `reopens if`, `closes when`, `closes if` or `provisional until` is a condition (`provisional until` reopens).
// `Reopened YYYY-MM-DD:`, `Closed YYYY-MM-DD:` and `Reviewed YYYY-MM-DD:` lines are outcomes, read as nothing.
//
// The record is a file a pull request carries and what is read here reaches every session through the hook: every line
// is cut at 500 characters before a pattern reads it, every pattern is anchored or bounded, and free text from the
// record is returned only in `text` fields. Callers print ids, the table's words (`said`) and paths, never `text`.

import { readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { docFrontmatter, isFeatureDoc, LEAD, readFeatureFiles, visible } from './feature-docs.mjs';
import { citedFeatures, contents } from './milestones.mjs';
import { notPlainFile, quotedVersion, readPlain, reviewProvenance, versionLines } from './review-header.mjs';
import { fenced, fid, ISSUE_READABLE, mask, parseEvent, squash, unquoted } from './decision-text.mjs';

export { fenced, fid, ISSUE_READABLE, mask, parseEvent };

const MAX = 500;
const ENTRY = new RegExp(`${LEAD}(P?D)-(\\d{1,9})\\b`);
// A heading of level 1 or 2, a decision's or not, ends the entry above it (`## Week 1 — decide before M1 closes`).
const TOP = new RegExp(LEAD.replace('#{1,6}', '#{1,2}'));
const LABELS = [['Amends:', 'changes'], ['Reopens when:', 'reopens'], ['Closes when:', 'closes']];
const GROUPS = / · |\)\*[ \t]{0,20}\*\(/g;
const OUTCOME = /^(?:Reopened|Closed|Reviewed) \d{4}-\d{2}-\d{2}:/;
const CLAUSES = [['reopens when', 'reopens'], ['reopens if', 'reopens'], ['closes when', 'closes'], ['closes if', 'closes'], ['provisional until', 'reopens']];
const PROSE = [/\b(?:revisit(?:ed)?|reopen(?:s|ed)?)(?: it| this| them)? (?:when|if|once|after)\b/i, /\bcloses? (?:when|if|once)\b/i, /\bprovisional until\b/i];
const POSITION = /\bM(\d{1,9})(?:['’]s)? (?:Contents )?item (\d{1,9})\b|\bitem (\d{1,9}) of M(\d{1,9})\b/g;
const DECISION_ID = /\b(P?D)-(\d{1,9})\b/g;

function condition(kind, where, line, raw) {
  const text = squash(raw);
  if (kind === 'changes') {
    const tokens = text.split(/ ?, ?| and /i);
    const features = [...new Set(tokens.map((t) => t.match(/^F-(\d{1,9})$/)?.[1]).filter(Boolean).map(Number))];
    return { kind, where, line, text, features, readable: text !== '' && tokens.every((t) => /^F-\d{1,9}$/.test(t)), issueOnly: false };
  }
  const events = text === '' ? [null] : text.split(/ or /i).map(parseEvent);
  const readable = events.every((e) => e?.readable);
  return { kind, where, line, text, events: events.filter(Boolean), readable, issueOnly: !readable && events.every((e) => e && (e.readable || e.kind === 'issue')) };
}

const clauseCondition = (clause) => {
  const lower = clause.toLowerCase();
  const hit = CLAUSES.find(([w]) => lower.startsWith(w) && (lower.length === w.length || /\s/.test(lower[w.length])));
  return hit ? [hit[1], clause.slice(hit[0].length)] : null;
};

const proseHit = (s) => PROSE.some((p) => p.test(unquoted(s)));

function finish(e) {
  const conditions = [];
  // The status suffix runs from the heading's first `*(` outside a code span to its end. Its clauses are split on ` · `
  // and on a `)* *(` between two groups, and a closing `)*` is removed: a parenthesis inside it, a second group, or
  // text after it never hides a clause. Each clause is read as written, and its prose from the masked heading at the
  // same columns, so a code span in it is not prose.
  const at = e.masked.indexOf('*(');
  const suffix = at < 0 ? '' : e.text.slice(at + 2);
  const parts = [];
  let from = 0;
  for (const m of suffix.matchAll(GROUPS)) {
    parts.push([from, suffix.slice(from, m.index)]);
    from = m.index + m[0].length;
  }
  if (at >= 0) parts.push([from, suffix.slice(from).trimEnd().replace(/\)\*$/, '')]);
  const clauses = [];
  const proseClauses = [];
  parts.forEach(([off, raw], i) => {
    const c = raw.trim();
    clauses.push({ text: c });
    const hit = i > 0 ? clauseCondition(c) : null;
    if (hit) conditions.push(condition(hit[0], 'heading', e.line, hit[1]));
    else proseClauses.push(e.masked.slice(at + 2 + off, at + 2 + off + raw.length));
  });
  const proseLines = [];
  for (const b of e.body) {
    // A label is read on the line as written, outside a fence: a stray backtick above it in the paragraph never hides
    // it (a code span is no reason to skip a label, §2; only a fence is).
    const label = b.fenced ? null : LABELS.find(([l]) => b.text.startsWith(l));
    if (label) conditions.push(condition(label[1], 'line', b.line, b.text.slice(label[0].length)));
    else if (!OUTCOME.test(b.masked)) proseLines.push(b.masked);
  }
  const positions = [];
  for (const { line, masked } of [{ line: e.line, masked: e.masked }, ...e.body]) {
    for (const m of masked.matchAll(POSITION)) positions.push({ line, milestone: Number(m[1] ?? m[4]), item: Number(m[2] ?? m[3]) });
  }
  const readable = conditions.some((c) => c.kind !== 'changes' && c.readable);
  // A condition clause, readable or not, is never read as prose: one unreadable clause is counted once, in the
  // Unreadable line, as a labelled line is (AR-4 of the 0.3 review, the orchestrator session's advice).
  const prose = !readable && (proseClauses.some(proseHit) || proseLines.some(proseHit));
  return { id: e.id, key: e.key, line: e.line, text: e.text, clauses, conditions, positions, prose, body: e.body.map(({ line, text }) => ({ line, text })) };
}

// The record as data, from decisions.md's text: `{ entries }`, in file order. An entry is a heading `LEAD` finds with
// a decision id, a heading in a fence included (ID1's reading: nothing is skipped). `id` is as written, `key` the id
// compared by prefix and number (`D-044` and `D-44` are `D-44`).
export function parseDecisions(md) {
  const lines = visible(md).map(({ line, text }) => ({ line, text: text.slice(0, MAX) }));
  const masked = mask(lines.map((l) => l.text));
  const fence = fenced(lines.map((l) => l.text));
  const entries = [];
  let cur = null;
  lines.forEach(({ line, text }, i) => {
    const m = text.match(ENTRY);
    if (m) {
      cur = { id: `${m[1]}-${m[2]}`, key: `${m[1]}-${Number(m[2])}`, line, text, masked: masked[i], body: [] };
      entries.push(cur);
    } else if (TOP.test(text)) cur = null;
    else if (cur) cur.body.push({ line, text, masked: masked[i], fenced: fence[i] });
  });
  return { entries: entries.map(finish) };
}

// Whether `text` names the decision `key` as a whole word: `D-44` matches `D-044`, never `D-4`, `D-440` or `PD-44`.
// Every decision key a text names, each once, so a doc is read once however many decisions ask about it.
const keysOf = (text) => new Set([...text.matchAll(DECISION_ID)].map((m) => `${m[1]}-${Number(m[2])}`));
export const namesDecision = (text, key) => keysOf(text).has(key);

const cut = (md) => visible(md).map((l) => l.text.slice(0, MAX)).join('\n');
const milestoneNumber = (id) => (typeof id === 'string' ? id.match(/^m(\d{1,9})$/i)?.[1] : undefined);

// The `*.md` names directly in a folder of the tree, by name; none when the folder is missing or not a folder.
// Each file is then opened only through readPlain(), so a link, a folder named `x.md` or a file reached through a link
// is skipped, never read and never a throw: the tree is a pull request's to shape.
const listed = (root, dir, skip) => {
  try {
    return readdirSync(posix.join(root, dir)).filter((f) => f.endsWith('.md') && !skip.includes(f)).sort();
  } catch {
    return [];
  }
};
const plainFiles = (root, dir, skip) => listed(root, dir, skip).map((f) => readPlain(root, `${dir}/${f}`)).filter((t) => t !== null);

// The feature docs, never a throw: a docs/features or dev/features that is a file is read as no docs.
const featureFiles = (root) => {
  try {
    return readFeatureFiles(root).filter((f) => f.regular);
  } catch {
    return [];
  }
};

// Everything the events and citations read, once: each doc's decision keys, whether a review of it is current and
// whether it is shipped; the docs carrying each F-id; and for each F-id, the decision keys the Contents items citing it
// name in milestones not killed. Every call after reads only these.
function readTree(root) {
  const reviews = plainFiles(root, 'docs/reviews', ['TEMPLATE.md']).map(reviewProvenance).filter((r) => r.reviewed && r.version);
  const quoted = new Map();
  for (const r of reviews) {
    const path = posix.normalize(r.reviewed.path);
    quoted.set(path, [...(quoted.get(path) ?? []), r.version]);
  }
  const files = featureFiles(root).map((f) => {
    const lines = versionLines(f.md);
    return {
      ...f,
      keys: keysOf(cut(f.md)),
      reviewed: (quoted.get(f.path) ?? []).some((v) => quotedVersion(f.md, v, lines) === 'current'),
      shipped: String(docFrontmatter(f.md)?.status ?? '').toLowerCase() === 'shipped',
    };
  });
  const milestones = plainFiles(root, 'docs/milestones', ['TEMPLATE.md', 'README.md'])
    .map((md) => ({ md, fm: docFrontmatter(md) }))
    .filter((m) => m.fm)
    .map(({ md, fm }) => ({
      n: Number(milestoneNumber(fm.id) ?? NaN),
      status: fm.status,
      items: contents(md).map((it) => ({ features: citedFeatures(it.text.slice(0, MAX)), keys: keysOf(it.text.slice(0, MAX)) })),
    }));
  const itemKeys = new Map();
  for (const m of milestones.filter((x) => x.status !== 'killed')) {
    for (const it of m.items) for (const n of it.features) itemKeys.set(n, new Set([...(itemKeys.get(n) ?? []), ...it.keys]));
  }
  const byFeature = (keep) => {
    const map = new Map();
    for (const f of files.filter(keep)) for (const n of f.ns) map.set(n, [...(map.get(n) ?? []), f]);
    return map;
  };
  return { milestones, carrying: byFeature(() => true), docs: byFeature(isFeatureDoc), itemKeys };
}

// `{ missing, entries, owed(), fired(today), unreadable(), proseCount() }` for the decisions.md at `root`. `missing` is
// null, or why decisions.md cannot be read ('does not exist', 'is a link, not a file', …), and the record is then
// empty. The tree (feature docs, milestones, reviews) is read once, on the first call that needs it.
export function readDecisions(root) {
  const missing = notPlainFile(root, 'decisions.md');
  const { entries } = missing ? { entries: [] } : parseDecisions(readPlain(root, 'decisions.md') ?? '');
  let tree;
  const t = () => (tree ??= readTree(root));

  const carrying = (n) => t().carrying.get(n) ?? [];
  const docsOf = (n) => t().docs.get(n) ?? [];
  const cited = (key, n) => carrying(n).some((f) => f.keys.has(key)) || Boolean(t().itemKeys.get(n)?.has(key));
  const amendsOf = new Map(entries.map((e) => [e, [...new Set(e.conditions.filter((c) => c.kind === 'changes' && c.readable).flatMap((c) => c.features))]]));
  const amends = (e) => amendsOf.get(e);

  // The Amends: features nothing names yet (§4): `{ id, key, feature, docs }`, `docs` the paths of the docs carrying
  // that F-id (a companion included), empty when no doc carries it yet.
  const owed = () => entries.flatMap((e) => amends(e).filter((n) => !cited(e.key, n)).map((n) => ({ id: e.id, key: e.key, feature: n, docs: carrying(n).map((f) => f.path) })));

  const fires = (e, ev, today) => {
    if (ev.kind === 'doc') return docsOf(ev.feature).length ? ev : null;
    if (ev.kind === 'reviewed') {
      // AR-1 of the 0.3 review: while the same decision's Amends: for this feature is owed, a current review is of a
      // doc that does not carry the amendment yet, so it does not fire.
      if (amends(e).includes(ev.feature) && !cited(e.key, ev.feature)) return null;
      const doc = docsOf(ev.feature).find((d) => d.reviewed);
      return doc ? { ...ev, doc: doc.path, named: doc.keys.has(e.key) } : null;
    }
    if (ev.kind === 'shipped') return docsOf(ev.feature).some((d) => d.shipped) ? ev : null;
    if (ev.kind === 'active' || ev.kind === 'closed') {
      // AR-2 of the 0.3 review: a killed milestone came through active as a closed one did; the words say which.
      const states = ev.kind === 'active' ? ['active', 'closed', 'killed'] : ['closed', 'killed'];
      const m = t().milestones.find((x) => x.n === ev.milestone && states.includes(x.status));
      return m ? { ...ev, status: m.status, said: `M${ev.milestone} is ${m.status}` } : null;
    }
    if (ev.kind === 'date') return today > ev.date ? ev : null;
    return null;
  };
  // The conditions whose event has happened (§3): `{ id, key, kind, where, line, events }`, `events` those that fired.
  const fired = (today) =>
    entries.flatMap((e) =>
      e.conditions
        .filter((c) => c.kind !== 'changes' && c.readable)
        .map((c) => ({ id: e.id, key: e.key, kind: c.kind, where: c.where, line: c.line, events: c.events.map((ev) => fires(e, ev, today)).filter(Boolean) }))
        .filter((c) => c.events.length)
    );

  // The entries with a condition or Amends: line that cannot be read, in file order. `issueOnly` when every one of
  // them is unreadable only for an issue event, which the pull-request reader will read (§6's parenthesis).
  const unreadable = () =>
    entries.flatMap((e) => {
      const bad = e.conditions.filter((c) => !c.readable);
      return bad.length ? [{ id: e.id, key: e.key, line: e.line, issueOnly: bad.every((c) => c.issueOnly) }] : [];
    });

  return { missing, entries, owed, fired, unreadable, proseCount: () => entries.filter((e) => e.prose).map((e) => e.id) };
}
