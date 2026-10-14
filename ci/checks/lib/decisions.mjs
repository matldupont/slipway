// The decisions record as data: the one reader of decisions.md for what a decision still owes (F-15,
// dev/features/owed-decisions.md §2). DC1, `pnpm status`, P1, sync and /close-milestone read it through here, so they
// cannot disagree about which entry amends what, which condition fired, or which one cannot be read. It never exits,
// so a program that is not a check can import it.
//
// Three labelled lines may sit under a decision's heading, at column 0, with no list mark and no emphasis:
//
//   Amends: F-07                    the features it changes; owed until that feature's doc or Contents line names it
//   Reopens when: F-07 is reviewed  one event, or several joined by ` or `, from the closed list in EVENTS below
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
import { notPlainFile, quotedVersion, readPlain, reviewProvenance } from './review-header.mjs';

const MAX = 500;
const ENTRY = new RegExp(`${LEAD}(P?D)-(\\d{1,9})\\b`);
const HEADING = new RegExp(LEAD);
// A heading of level 1 or 2, a decision's or not, ends the entry above it (`## Week 1 — decide before M1 closes`).
const TOP = new RegExp(LEAD.replace('#{1,6}', '#{1,2}'));
const FENCE = /^ {0,3}```/;
const LABELS = [['Amends:', 'changes'], ['Reopens when:', 'reopens'], ['Closes when:', 'closes']];
const OUTCOME = /^(?:Reopened|Closed|Reviewed) \d{4}-\d{2}-\d{2}:/;
const CLAUSES = [['reopens when', 'reopens'], ['reopens if', 'reopens'], ['closes when', 'closes'], ['closes if', 'closes'], ['provisional until', 'reopens']];
const PROSE = [/\b(?:revisit(?:ed)?|reopen(?:s|ed)?)(?: it| this| them)? (?:when|if|once|after)\b/i, /\bcloses? (?:when|if|once)\b/i, /\bprovisional until\b/i];
const POSITION = /\bM(\d{1,9})(?:['’]s)? (?:Contents )?item (\d{1,9})\b|\bitem (\d{1,9}) of M(\d{1,9})\b/g;
const DECISION_ID = /\b(P?D)-(\d{1,9})\b/g;
// `#<n> closes` is read at the pull request that closes the issue (§8), and that reader ships in build step 5. Until
// then the event is unreadable, flagged so status can say what reads it (§6).
export const ISSUE_READABLE = false;

export const fid = (n) => `F-${String(n).padStart(2, '0')}`;
const blank = (s) => ' '.repeat(s.length);

// Each line with fenced blocks and code spans blanked, columns kept. A fence (``` to ```) is blanked whole, its
// marker lines too. A code span is backtick to backtick within a paragraph (consecutive non-blank lines, a heading
// standing alone), so a span crosses the hard wraps decisions.md is written with; an unmatched backtick blanks to the
// paragraph's end.
export function mask(lines) {
  const out = [];
  let fence = false;
  for (const l of lines) {
    if (FENCE.test(l)) fence = !fence;
    out.push(fence || FENCE.test(l) ? blank(l) : l);
  }
  let open = false;
  for (let i = 0; i < out.length; i++) {
    const alone = HEADING.test(out[i]);
    if (out[i].trim() === '' || alone) open = false;
    let s = '';
    for (const ch of out[i]) {
      if (ch === '`') {
        open = !open;
        s += ' ';
      } else s += open ? ' ' : ch;
    }
    out[i] = s;
    if (alone) open = false;
  }
  return out;
}

// What a condition's text reads as: backticks and a closing full stop removed, whitespace squashed.
const squash = (s) => s.replace(/`/g, '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');

function isDay(date) {
  const day = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === date;
}

// One event of §3's table, or null. Verbs are case folded; ids keep their case. `said` is the event in the table's
// words, built from the numbers read, never from the record's text.
export function parseEvent(part) {
  let m = part.match(/^F-(\d{1,9}) (.{1,40})$/);
  if (m) {
    const n = Number(m[1]);
    const kind = { 'has a doc': 'doc', 'has a feature doc': 'doc', 'is reviewed': 'reviewed', 'is shipped': 'shipped' }[m[2].toLowerCase()];
    const verb = { doc: 'has a doc', reviewed: 'is reviewed', shipped: 'is shipped' }[kind];
    return kind ? { kind, feature: n, readable: true, said: `${fid(n)} ${verb}` } : null;
  }
  m = part.match(/^M(\d{1,9}) (.{1,40})$/);
  if (m) {
    const n = Number(m[1]);
    const kind = { 'is active': 'active', 'is activated': 'active', 'goes active': 'active', 'is closed': 'closed', closes: 'closed' }[m[2].toLowerCase()];
    return kind ? { kind, milestone: n, readable: true, said: `M${n} is ${kind}` } : null;
  }
  m = part.match(/^(\d{4}-\d{2}-\d{2}) (passes|has passed)$/i);
  if (m) return isDay(m[1]) ? { kind: 'date', date: m[1], readable: true, said: `${m[1]} passes` } : null;
  m = part.match(/^(?:([\w.-]{1,100}\/[\w.-]{1,100}))?#(\d{1,9}) (closes|lands|is closed)$/i);
  if (m) return { kind: 'issue', repo: m[1] ?? null, issue: Number(m[2]), readable: ISSUE_READABLE, said: `#${Number(m[2])} closes` };
  return null;
}

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

// A line with its quoted text (between straight or curly double quotes) blanked, in one pass: a quote with no close
// after it is left as written, and once a close is known to be missing it is not looked for again.
const QUOTE = { '"': '"', '“': '”' };
function unquoted(s) {
  let out = '';
  const gone = new Set();
  for (let i = 0; i < s.length; i++) {
    const close = QUOTE[s[i]];
    const end = close && !gone.has(close) ? s.indexOf(close, i + 1) : -1;
    if (close && end < 0) gone.add(close);
    if (end < 0) out += s[i];
    else {
      out += blank(s.slice(i, end + 1));
      i = end;
    }
  }
  return out;
}
const proseHit = (s) => PROSE.some((p) => p.test(unquoted(s)));

function finish(e) {
  const conditions = [];
  // The status suffix runs from the heading's last `*(` to its end, a closing `)*` removed: a parenthesis inside it,
  // or text after the `)*`, never hides a clause. Each clause is read as written, and its prose from the masked
  // heading at the same columns, so a code span in it is not prose.
  const at = e.text.lastIndexOf('*(');
  const parts = at < 0 ? [] : e.text.slice(at + 2).trimEnd().replace(/\)\*$/, '').split(' · ');
  const clauses = [];
  const proseClauses = [];
  let off = at + 2;
  parts.forEach((raw, i) => {
    const c = raw.trim();
    clauses.push({ text: c });
    const hit = i > 0 ? clauseCondition(c) : null;
    if (hit) conditions.push(condition(hit[0], 'heading', e.line, hit[1]));
    else proseClauses.push(e.masked.slice(off, off + raw.length));
    off += raw.length + 3;
  });
  const proseLines = [];
  for (const b of e.body) {
    const label = LABELS.find(([l]) => b.masked.startsWith(l));
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
  const entries = [];
  let cur = null;
  lines.forEach(({ line, text }, i) => {
    const m = text.match(ENTRY);
    if (m) {
      cur = { id: `${m[1]}-${m[2]}`, key: `${m[1]}-${Number(m[2])}`, line, text, masked: masked[i], body: [] };
      entries.push(cur);
    } else if (TOP.test(text)) cur = null;
    else if (cur) cur.body.push({ line, text, masked: masked[i] });
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

function readTree(root) {
  const files = readFeatureFiles(root).filter((f) => f.regular).map((f) => ({ ...f, seen: cut(f.md), keys: keysOf(cut(f.md)) }));
  const milestones = plainFiles(root, 'docs/milestones', ['TEMPLATE.md', 'README.md'])
    .map((md) => ({ md, fm: docFrontmatter(md) }))
    .filter((m) => m.fm)
    .map(({ md, fm }) => ({
      n: Number(milestoneNumber(fm.id) ?? NaN),
      status: fm.status,
      items: contents(md).map((it) => ({ features: new Set(citedFeatures(it.text.slice(0, MAX))), keys: keysOf(it.text.slice(0, MAX)) })),
    }));
  const reviews = plainFiles(root, 'docs/reviews', ['TEMPLATE.md']).map(reviewProvenance).filter((r) => r.reviewed && r.version);
  return { files, milestones, reviews };
}

// `{ missing, entries, owed(), fired(today), unreadable(), proseCount() }` for the decisions.md at `root`. `missing` is
// null, or why decisions.md cannot be read ('does not exist', 'is a link, not a file', …), and the record is then
// empty. The tree (feature docs, milestones, reviews) is read once, on the first call that needs it.
export function readDecisions(root) {
  const missing = notPlainFile(root, 'decisions.md');
  const { entries } = missing ? { entries: [] } : parseDecisions(readPlain(root, 'decisions.md') ?? '');
  let tree;
  const t = () => (tree ??= readTree(root));

  const carrying = (n) => t().files.filter((f) => f.ns.includes(n));
  const docsOf = (n) => t().files.filter((f) => isFeatureDoc(f) && f.ns.includes(n));
  // Each doc and Contents item holds the decision keys it names, read once, so a record of many entries stays linear.
  const cited = (key, n) => carrying(n).some((f) => f.keys.has(key)) || t().milestones.some((m) => m.status !== 'killed' && m.items.some((it) => it.features.has(n) && it.keys.has(key)));
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
      const doc = docsOf(ev.feature).find((d) => t().reviews.some((r) => posix.normalize(r.reviewed.path) === d.path && quotedVersion(d.md, r.version) === 'current'));
      return doc ? { ...ev, doc: doc.path, named: doc.keys.has(e.key) } : null;
    }
    if (ev.kind === 'shipped') return docsOf(ev.feature).some((d) => String(docFrontmatter(d.md)?.status ?? '').toLowerCase() === 'shipped') ? ev : null;
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
