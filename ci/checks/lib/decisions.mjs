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
//   Starts: M1.1 · RISK-1, RISK-2   the test milestone it starts and the value risks that milestone runs (D-047, #477)
//
// A heading's status suffix is read too: each clause after the first, split on ` · `, that starts `reopens when`,
// `reopens if`, `closes when`, `closes if` or `provisional until` is a condition (`provisional until` reopens).
// `Reopened YYYY-MM-DD:`, `Closed YYYY-MM-DD:` and `Reviewed YYYY-MM-DD:` lines are outcomes, read as nothing.
//
// The record is a file a pull request carries and what is read here reaches every session through the hook: every line
// is cut at 500 characters before a pattern reads it (past the cut, only visible()'s linear normalising, a length, a
// substring search and hasClause's character loop, none a pattern, read a heading to make it unreadable), every pattern
// is anchored or bounded, and free text from the record is returned only in `text` fields. Callers print ids, the table's words (`said`) and paths, never `text`.

import { lstatSync, readdirSync } from 'node:fs';
import { posix } from 'node:path';
import { docFrontmatter, FEATURE_DIRS, isFeatureDoc, LEAD, readFeatureFiles, visible } from './feature-docs.mjs';
import { citedFeatures, contents, MILESTONE_ID, milestoneId, testsLine } from './milestones.mjs';
import { notPlainFile, quotedVersion, readPlain, reviewProvenance, versionLines } from './review-header.mjs';
import { CLAUSE_START, fenced, fid, HEADING, hasClause, mask, parseEvent, PROSE, squash, unquoted } from './decision-text.mjs';

export { fenced, fid, mask, parseEvent };

const MAX = 500;
const ENTRY = new RegExp(`${LEAD}(P?D)-(\\d{1,9})\\b`);
// A heading of level 1 or 2, a decision's or not, ends the entry above it (`## Week 1 — decide before M1 closes`).
const TOP = new RegExp(LEAD.replace('#{1,6}', '#{1,2}'));
const LABELS = [['Amends:', 'changes'], ['Reopens when:', 'reopens'], ['Closes when:', 'closes']];
const GROUPS = / · |\)\*[ \t]{0,20}\*\(/g;
const OUTCOME = /^(?:Reopened|Closed|Reviewed) \d{4}-\d{2}-\d{2}:/;
// `M2 item 4` and `M1.1 item 4` name a position; `M1.1` names a milestone, never an item (#476).
const POSITION = new RegExp(`\\b(${MILESTONE_ID})(?:['’]s)? (?:Contents )?item (\\d{1,9})\\b|\\bitem (\\d{1,9}) of (${MILESTONE_ID})\\b`, 'g');
const DECISION_ID = /\b(P?D)-(\d{1,9})\b/g;
// `Starts: M1.1 · RISK-1, RISK-2`, exactly: the milestone, a middle dot, then the risks, comma-separated.
const STARTS = new RegExp(`^Starts: (${MILESTONE_ID}) · (RISK-\\d{1,9}(?:, RISK-\\d{1,9}){0,49})$`);

function condition(kind, where, line, raw) {
  const text = squash(raw);
  if (kind === 'changes') {
    const tokens = text.split(/ ?, ?| and /i);
    const features = [...new Set(tokens.map((t) => t.match(/^F-(\d{1,9})$/)?.[1]).filter(Boolean).map(Number))];
    return { kind, where, line, text, features, readable: text !== '' && tokens.every((t) => /^F-\d{1,9}$/.test(t)) };
  }
  const events = text === '' ? [null] : text.split(/ or /i).map(parseEvent);
  const readable = events.every((e) => e?.readable);
  return { kind, where, line, text, events: events.filter(Boolean), readable };
}

const clauseCondition = (clause) => {
  const m = clause.match(CLAUSE_START);
  return m ? [m[1]?.toLowerCase() === 'closes' ? 'closes' : 'reopens', clause.slice(m[0].length)] : null;
};

const proseHit = (s) => PROSE.some((p) => p.test(unquoted(s)));

// For the `Starts:` reader only (#477, D-047): for each line, the first line above it that could hide text in the
// rendered file, as `{ line, what }`, or null. A `Starts:` line grants a pass, so it is read only when nothing above it
// could hide it: no HTML comment marker, no code fence, no HTML block at column 0, and no lone carriage return in the
// file. A false alarm moves the decision; it is never a false pass. No parser: one linear scan, `includes` and anchored
// tests on each line.
const FENCE_LINE = /^ {0,3}(?:```|~~~)/;
const HTML_BLOCK = /^<[A-Za-z!/]/;
function hidersAbove(md) {
  const text = md.replace(/^\uFEFF/, '');
  const lines = text.split(/\r\n|\r|\n/);
  const lone = text.search(/\r(?!\n)/);
  let first = lone < 0 ? null : { line: text.slice(0, lone).split(/\r\n|\r|\n/).length, what: 'a lone carriage return' };
  return lines.map((l, i) => {
    const above = first && first.line <= i ? first : null;
    if (!first) {
      const what = l.includes('<!--') || l.includes('-->') ? 'an HTML comment marker' : FENCE_LINE.test(l) ? 'a code fence' : HTML_BLOCK.test(l) ? 'an HTML block' : null;
      if (what) first = { line: i + 1, what };
    }
    return above;
  });
}

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
  // The backstop (the owner's calls, 2026-10-14, after three review rounds each found a typo that hid a heading clause,
  // and again on #466): a typo can make a condition louder, never silent. A clause opening the suffix reading did not
  // take makes the decision unreadable: in the heading before the suffix (a stray backtick or a quoted suffix
  // included), in a part of the suffix that is not read as a clause (the first, the status, or one that opens with a
  // backtick, a quote or a mark), or in what a cut at MAX dropped. A heading in a fence is an entry (ID1), so a clause
  // opening in it is unreadable too (the owner, #466). Last, the heading is read whole, each clause read above as its
  // text after the opening, so a ` · `, `)* *(` or `*(` between the words of an opening never hides it.
  const whole = [at < 0 ? e.text : e.text.slice(0, at)];
  let hidden = e.cut || hasClause(whole[0]);
  parts.forEach(([off, raw], i) => {
    const c = raw.trim();
    clauses.push({ text: c });
    const hit = i > 0 ? clauseCondition(c) : null;
    whole.push(hit ? hit[1] : raw);
    // A heading the cut at MAX shortened may have lost an event: its clauses are never read, as a cut labelled line's.
    if (hit) conditions.push({ ...condition(hit[0], 'heading', e.line, hit[1]), ...(e.cut ? { readable: false } : {}) });
    // A part holding a clause opening is a condition clause, if an unreadable one: never prose too (AR-4).
    else if (hasClause(raw)) hidden = true;
    else proseClauses.push(e.masked.slice(at + 2 + off, at + 2 + off + raw.length));
  });
  if (hidden || hasClause(whole.join(' '))) conditions.push({ kind: 'reopens', where: 'heading', line: e.line, text: e.text, events: [], readable: false });
  const proseLines = [];
  // `Starts:` lines: the test milestones this decision starts (#477). One below a line that could hide it (hidersAbove),
  // cut, or of any other shape starts nothing; `hider` says which line, so K1 can say what to move.
  const starts = [];
  for (const b of e.body) {
    if (b.text.startsWith('Starts:')) {
      const m = !b.cut ? b.text.trimEnd().match(STARTS) : null;
      if (m && b.hider) starts.push({ line: b.line, milestone: milestoneId(m[1]), readable: false, hider: b.hider });
      else starts.push(m ? { line: b.line, milestone: milestoneId(m[1]), risks: m[2].split(', '), readable: true } : { line: b.line, readable: false });
      continue;
    }
    // A label is read on the line as written: a stray backtick above it in the paragraph never hides it (a code span is
    // no reason to skip a label, §2). One inside a fence under a decision is unreadable, never read and never skipped:
    // a stray fence marker can pair with a later fence and hide it (the owner, #466). A labelled line the cut at MAX
    // shortened may have lost an event: it is unreadable too, never read short.
    const label = LABELS.find(([l]) => b.text.startsWith(l));
    if (label) conditions.push({ ...condition(label[1], 'line', b.line, b.text.slice(label[0].length)), ...(b.cut || b.fenced ? { readable: false } : {}) });
    // A stray heading is counted once, as a stray, never as prose too.
    else if (!OUTCOME.test(b.masked) && !b.stray) proseLines.push(b.masked);
  }
  const positions = [];
  for (const { line, masked } of [{ line: e.line, masked: e.masked }, ...e.body]) {
    for (const m of masked.matchAll(POSITION)) positions.push({ line, milestone: milestoneId(m[1] ?? m[4]), item: Number(m[2] ?? m[3]) });
  }
  const readable = conditions.some((c) => c.kind !== 'changes' && c.readable);
  // A condition clause, readable or not, is never read as prose: counted once, in the Unreadable line (AR-4 of the 0.3 review).
  const prose = !readable && (proseClauses.some(proseHit) || proseLines.some(proseHit));
  // Decided only when the heading's first status clause says so: `*(decided …)*` or `*(accepted …)*`, never a later one.
  const first = e.text.indexOf('*(');
  const decided = first >= 0 && /^(?:decided|accepted)\b/i.test(e.text.slice(first + 2, first + 12));
  return { id: e.id, key: e.key, line: e.line, text: e.text, decided, clauses, conditions, positions, prose, starts, body: e.body.map(({ line, text }) => ({ line, text })) };
}

// The record as data, from decisions.md's text: `{ entries, strays }`, in file order. An entry is a heading `LEAD` finds
// with a decision id, a heading in a fence included (ID1's reading: nothing is skipped). `id` is as written, `key` the id
// compared by prefix and number (`D-044` and `D-44` are `D-44`). `strays`: labelled lines in no entry, and headings with no
// id holding a clause opening, in an entry or not (in a fence too), but a fenced example above the first entry.
export function parseDecisions(md) {
  const whole = visible(md);
  const lines = whole.map(({ line, text }) => ({ line, text: text.slice(0, MAX) }));
  const masked = mask(lines.map((l) => l.text));
  const fence = fenced(lines.map((l) => l.text));
  const hiders = hidersAbove(md);
  const entries = [];
  const strays = [];
  let cur = null;
  lines.forEach(({ line, text }, i) => {
    const m = text.match(ENTRY);
    if (m) {
      // A heading the cut at MAX shortened is unreadable when the whole line holds a suffix, which may have lost a clause
      // or an event of one, or a clause opening anywhere (hasClause reads past the cut, linearly).
      const cut = whole[i].text.length > MAX && (whole[i].text.includes('*(') || hasClause(whole[i].text));
      cur = { id: `${m[1]}-${m[2]}`, key: `${m[1]}-${Number(m[2])}`, line, text, masked: masked[i], fenced: fence[i], cut, body: [] };
      entries.push(cur);
    } else {
      if (TOP.test(text)) cur = null;
      // A labelled line in no entry, or a heading with no id holding a clause opening anywhere (a typo'd `### PD3` inside
      // an entry included), is a stray: never silent.
      const label = !cur && LABELS.some(([l]) => text.startsWith(l));
      const stray = (label || (HEADING.test(text) && hasClause(whole[i].text))) && (entries.length || !fence[i]);
      if (cur) cur.body.push({ line, text, masked: masked[i], fenced: fence[i], hider: hiders[i] === undefined ? { line: 1, what: 'an unreadable line' } : hiders[i], cut: whole[i].text.length > MAX, stray });
      if (stray) strays.push(line);
    }
  });
  return { entries: entries.map(finish), strays };
}

// Which value risks a `kind: test` milestone is started for (#477, D-047): `{ released, causes }`, or null for a milestone
// of another kind. `entryOf(key)` is a decision entry by key (`PD-1`). Released, a risk no longer holds that milestone in
// K1 and status; it is released only when the milestone's `decided:` line names an entry whose first heading clause is
// decided or accepted, with a readable `Starts:` line naming this milestone's id exactly, and its `tests:` line names the
// same risks as that `Starts:` line. `causes` says, in the owner's words, why not; K1 reports them, status only reads
// `released`. K1 and status both read it here, so they cannot disagree about what a test milestone frees.
export function testStart(fm, entryOf) {
  const t = testsLine(fm);
  if (!t) return null;
  const causes = [];
  const id = milestoneId(fm.id);
  const said = typeof fm.decided === 'string' ? fm.decided.trim() : '';
  const ref = said.match(/^(P?D)-(\d{1,9})$/i);
  const e = ref && entryOf(`${ref[1].toUpperCase()}-${Number(ref[2])}`);
  const line = e?.starts.find((s) => s.readable && s.milestone === id);
  const hidden = !line && e?.starts.find((s) => s.hider && s.milestone === id);
  if (!said) causes.push(`it names no decision: starting a test milestone is the owner's call, recorded in decisions.md with a "Starts: ${fm.id} · RISK-n" line and named on a decided: PD-<n> line`);
  else if (!e) causes.push(`decided: names no decision heading in decisions.md`);
  else if (!e.decided) causes.push(`${e.id} is not marked decided or accepted in its heading: the owner decides first`);
  else if (hidden) causes.push(`${e.id}'s Starts: line for ${fm.id} (decisions.md line ${hidden.line}) is not read: line ${hidden.hider.line} above it holds ${hidden.hider.what}, which can hide text in the rendered file; move the decision above line ${hidden.hider.line}, or remove it`);
  else if (!line) causes.push(`${e.id} has no "Starts: ${fm.id} · RISK-n" line: the owner's decision names the test milestone it starts`);
  else if (t.ids.length) {
    const want = new Set(line.risks);
    const extra = t.ids.filter((r) => !want.has(r));
    const missing = line.risks.filter((r) => !t.ids.includes(r));
    if (extra.length || missing.length) causes.push(`its tests: line and ${e.id}'s Starts: line must name the same risks${extra.length ? `; ${extra.join(', ')} ${extra.length > 1 ? 'are' : 'is'} not on the Starts: line` : ''}${missing.length ? `; ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} not on the tests: line` : ''}`);
  }
  return { released: causes.length ? [] : t.ids, causes };
}

// Every decision key a text names, once: `D-44` matches `D-044`, never `D-4`, `D-440` or `PD-44`, and a doc is read once.
const keysOf = (text) => new Set([...text.matchAll(DECISION_ID)].map((m) => `${m[1]}-${Number(m[2])}`));
export const namesDecision = (text, key) => keysOf(text).has(key);

const cut = (md) => visible(md).map((l) => l.text.slice(0, MAX)).join('\n');

// Whether a folder of the tree, or one above it (`docs`, `dev`), is a link, a dangling one included: named unread.
const isLink = (root, dir) =>
  dir.split('/').some((_, i, parts) => {
    try { return lstatSync(posix.join(root, ...parts.slice(0, i + 1))).isSymbolicLink(); } catch { return false; }
  });

// The `*.md` names directly in a folder of the tree, by name; none when the folder is missing or not a folder, and a
// folder that is there but cannot be read (a file or a link in its place) is added to `unread`. Each file is then opened only
// through readPlain(), so a link, a folder named `x.md` or a file reached through a link is skipped, never read and
// never a throw: the tree is a pull request's to shape.
const listed = (root, dir, skip, unread) => {
  try {
    if (!isLink(root, dir)) return readdirSync(posix.join(root, dir)).filter((f) => f.endsWith('.md') && !skip.includes(f)).sort();
    unread.push(dir);
  } catch (err) {
    if (err?.code !== 'ENOENT') unread.push(dir);
  }
  return [];
};
const plainFiles = (root, dir, skip, unread) => listed(root, dir, skip, unread).map((f) => readPlain(root, `${dir}/${f}`)).filter((t) => t !== null);

// The feature docs, each folder read on its own and never a throw: a docs/features or dev/features that cannot be read,
// is a link, sits under one or is not a folder, is added to `unread`, and the other folder's docs are still read.
const featureFiles = (root, unread) =>
  FEATURE_DIRS.flatMap((dir) => {
    try {
      const files = readFeatureFiles(root, [dir]);
      if (!files.some((f) => f.folder)) return files.filter((f) => f.regular);
    } catch { /* named unread below */ }
    unread.push(dir);
    return [];
  });

// Each item under every key `keys(item)` names, in a Map of lists built in place, so the cost is linear in the adds: the
// one grouping the reviews by path and the docs by F-id share.
export const indexBy = (items, keys) => {
  const map = new Map();
  for (const item of items) {
    for (const k of keys(item)) {
      const list = map.get(k);
      if (list) list.push(item);
      else map.set(k, [item]);
    }
  }
  return map;
};

// Everything the events and citations read, once: each doc's decision keys, whether a review of it is current and
// whether it is shipped; the docs carrying each F-id; and for each F-id, the decision keys the Contents items citing it
// name in milestones not killed. Every call after reads only these.
function readTree(root) {
  const unread = [];
  const reviews = plainFiles(root, 'docs/reviews', ['TEMPLATE.md'], unread).map(reviewProvenance).filter((r) => r.reviewed && r.version);
  const quoted = indexBy(reviews, (r) => [posix.normalize(r.reviewed.path)]);
  const files = featureFiles(root, unread).map((f) => {
    const lines = versionLines(f.md);
    return {
      ...f,
      keys: keysOf(cut(f.md)),
      reviewed: (quoted.get(f.path) ?? []).some((r) => quotedVersion(f.md, r.version, lines) === 'current'),
      shipped: typeof docFrontmatter(f.md)?.status === 'string' && docFrontmatter(f.md).status.toLowerCase() === 'shipped',
    };
  });
  const milestones = plainFiles(root, 'docs/milestones', ['TEMPLATE.md', 'README.md'], unread)
    .map((md) => ({ md, fm: docFrontmatter(md) }))
    .filter((m) => m.fm)
    .map(({ md, fm }) => ({
      id: milestoneId(fm.id),
      status: fm.status,
      items: contents(md).map((it) => ({ features: citedFeatures(it.text.slice(0, MAX)), keys: keysOf(it.text.slice(0, MAX)) })),
    }));
  const itemKeys = new Map();
  for (const m of milestones.filter((x) => x.status !== 'killed')) {
    for (const it of m.items) {
      for (const n of it.features) {
        if (!itemKeys.has(n)) itemKeys.set(n, new Set());
        for (const k of it.keys) itemKeys.get(n).add(k);
      }
    }
  }
  const ns = (f) => f.ns;
  return { milestones, carrying: indexBy(files, ns), docs: indexBy(files.filter(isFeatureDoc), ns), itemKeys, unread: unread.sort() };
}

// `{ missing, entries, strays, owed(), fired(today), unreadable(), proseCount(), awaitingIssue(), unreadFolders() }` for the decisions.md at
// `root`. `missing` is null, or why decisions.md cannot be read ('does not exist', 'is a link, not a file', …), and the
// record is then empty. The tree (feature docs, milestones, reviews) is read once, on the first call that needs it;
// `unreadFolders()` names, sorted, each of its folders that is there but could not be read, so nothing it hid is silent.
export function readDecisions(root, file = 'decisions.md') {
  const missing = notPlainFile(root, file);
  const { entries, strays } = missing ? { entries: [], strays: [] } : parseDecisions(readPlain(root, file) ?? '');
  let tree;
  const t = () => (tree ??= readTree(root));

  const carrying = (n) => t().carrying.get(n) ?? [];
  const docsOf = (n) => t().docs.get(n) ?? [];
  const cited = (key, n) => carrying(n).some((f) => f.keys.has(key)) || Boolean(t().itemKeys.get(n)?.has(key));
  const amendsOf = new Map(entries.map((e) => [e, [...new Set(e.conditions.filter((c) => c.kind === 'changes' && c.readable).flatMap((c) => c.features))]]));
  const amends = (e) => amendsOf.get(e);

  // The Amends: features nothing names yet (§4): `{ id, key, feature, docs }`, `docs` the paths carrying that F-id.
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
      const m = t().milestones.find((x) => x.id && x.id === ev.milestone && states.includes(x.status));
      return m ? { ...ev, status: m.status, said: `${ev.milestone} is ${m.status}` } : null;
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

  // The entries with a condition or Amends: line that cannot be read, in file order.
  const unreadable = () => entries.flatMap((e) => (e.conditions.some((c) => !c.readable) ? [{ id: e.id, key: e.key, line: e.line }] : []));

  // A condition naming an issue: waiting, never also prose only. Status cannot see it happen (§3); P1 reads it at the
  // pull request that closes the issue (§8).
  const waits = (e) => e.conditions.some((c) => c.kind !== 'changes' && c.readable && c.events.some((ev) => ev.kind === 'issue'));
  // The readable issue events, in file order: `{ id, kind, where, issue, repo }`, `kind` the condition's (reopens or closes), `where` heading or line, and
  // `repo` as written, lower case, '' for the pull request's own repository.
  const issueEvents = () =>
    entries.flatMap((e) =>
      e.conditions
        .filter((c) => c.kind !== 'changes' && c.readable)
        .flatMap((c) => c.events.filter((ev) => ev.kind === 'issue').map((ev) => ({ id: e.id, kind: c.kind, where: c.where, issue: ev.issue, repo: ev.repo })))
    );
  return { missing, entries, strays, owed, fired, unreadable, issueEvents, proseCount: () => entries.filter((e) => e.prose && !waits(e)).map((e) => e.id), awaitingIssue: () => entries.filter(waits).map((e) => e.id), unreadFolders: () => [...t().unread] };
}
