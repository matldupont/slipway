---
prd-ref: D-055
status: draft
---

# F-18 — Milestone board: `pnpm board` keeps the active milestone's plan open on screen and current

Version: 0.1 (2026-11-02)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar the sha and date of a `Verified against:` line; a single acceptance block the owner
confirmed (`/log-bug`) is the one change that leaves it.

## Problem

**Job:** when I am running a milestone and glance at my second screen, I want one board that shows how far through
its time it is, what is done, running, next and left, what is waiting on me, and what I can hand to agents side by
side with the command for each, so I can steer the milestone without rebuilding that picture from status, GitHub and
memory.

The owner, 2026-11-02: "It needs to be the visual part of slipway (per milestone) in the sense that it's clear and
answers the questions I have as the one running the project and see what I need to do next and what I can hand to
agents, including parallel work." "this board also has to hot-reload. I'd keep it open on the screen as my living
milestone/project board." "I can start it from pnpm to run it."

**Evidence.** The owner runs a project on slipway from a board kept by hand in a separate agent session, with an
appetite bar, Done / Running / Next / Left columns, the gate checklist, a Waiting-on-you panel and Next items that
can run side by side, each with its command, model and effort. It drifts the way D-017 predicted for anything kept
by hand: a plan step with no issue was ticked done; after a decision killed a milestone, the page kept its old text;
an open issue was missing from it. `pnpm work-order` (F-07) is computed, so it cannot drift that way, but it is
plain, it reloads the whole page on a timer, and real use found three bugs: it prints `~~strikethrough~~` as raw
markdown; it lists one issue under two items; it calls an issue Next although the issue waits on another change,
a wait written only in the issue's prose. **Workaround:** the hand-kept board, or `pnpm status` plus GitHub.
**Frequency:** all day, every working day. **Why now:** F-17 (#538–#542) builds the one plan status and the page
share; this is the surface that shows it.

Serves `SLIPWAY.md`'s thesis, a rule exists only where something fires: every line on the board is computed from
the tree and GitHub on each read, so none can drift. And D-016: the owner sees the action and the command, in the
project's words. Decision: D-055. Builds on F-07 (`dev/features/work-order.md`) and F-17
(`dev/features/parallel-plan.md`).

**Verdict: RESHAPE** → the work-order page becomes the board, under one command, `pnpm board`. It shows F-17's plan
and works out none of its own; the one rule it adds to that plan (holding a prose wait) goes into the shared plan,
so status says the same.

| option | for | against | verdict |
|---|---|---|---|
| Do nothing (hand-kept board) | Works today, the owner likes its shape | Drifted three ways; an agent session spends its time keeping it | rejected |
| Restyle `pnpm work-order` only | Small | Still a timed full reload that loses scroll and open sections; no Waiting-on-you, gate or appetite; a stopped server looks like a quiet page | rejected |
| A second page beside work-order | Leaves F-07 alone | Two pages naming Next, two to keep in step (the owner chose one: "Replace it") | rejected |
| A GitHub Projects board | Native, live | Hand-kept columns (D-017 declined it); no parallel-safety, no appetite, no owed work | rejected |
| An editor or Claude pane over `plan.mjs` | Lives beside the chat | Not on a second screen all day; F-17 leaves a pane as a later import | deferred |
| **The work-order page grown into the board, live from a local server** | One page, computed, reuses F-07 and F-17 whole | Needs a pinned script on the page and a file watcher | **selected** |

## Fit

Searched by behaviour on `main` at 0820023 (2026-11-02): a page served for the owner, an issue's status from GitHub,
a plan of what can start, a file watcher, inline markdown to HTML, a milestone's gate read, and a time bar. The `## Fit`
of every doc in `dev/features/` and the one open pull request (#599, skills only) were read.

Reuses:
- `ci/work-order.mjs` (F-07): `collect()` at `:91`, `render()` at `:191`, `parseArgs()` at `:254`, `writeAtomic()` at
  `:286`, `serve()` at `:308` (loopback, `GET`/`HEAD /` only, foreign `Host` 403) and `keepFresh()` at `:345`. The
  file becomes `ci/board.mjs`; nothing is copied.
- `ci/checks/lib/plan.mjs`, `ci/checks/lib/owed.mjs`, `ci/checks/lib/github-state.mjs` (F-17 §1–§6, built by #538 and
  #541): the main step, the picks, the owed things with who, blocks, waits and files, work in progress, claims, and
  the one 5-second GitHub read. The board takes these whole; after #542, `collect()` already reads through them.
- `ci/checks/lib/issue-body.mjs`: `blockers()`, `touches()`, `overlap()`, `designation()`.
- `ci/checks/lib/milestones.mjs`: `readMilestones()`, `readMilestoneModel()` (its `clock`: day, of, overrun),
  `contents()`, `marker()`, `owing()`.
- `ci/checks/lib/html.mjs`: `escapeShown()`; `ci/checks/lib/clock.mjs`: `today()`, `zone()`, `CHECK_NOW`.
- `ci/checks/lib/markdown.mjs`: `section()` for the milestone's `## Gate`.
- `site/css/base.css`: the steel and orange tokens, copied as values into the page's inline style (the page loads
  nothing). Direction: `dev/board/design-direction.md`; specimen: `dev/board/specimen.html`.

Numbers:
- **Day N of M**: `readMilestoneModel()`'s `clock`, as F-07 shows it today.
- **Issues done of total** (the rail's bar): `ci/board.mjs`, from the plan's leaves (§2).
- **Count in each column, and Waiting on you**: `ci/board.mjs`, counting what it shows.
- **Open issues: on this milestone, elsewhere**: `ci/board.mjs`, from the open-issue count and list the shared read adds
  (§3).

New: a file watcher and a read schedule (nothing in the repository watches files); an `ETag` and a pinned script that
swaps the page in place (F-07 forbade any script; D-055 replaces that with a content policy); inline markdown for
Contents text (`plain()` strips `*`, `_` and backticks and nothing else, `ci/checks/lib/markdown.mjs:161`); the gate
read as a checklist; prose waits in the shared plan.

## Contract

Verified against: 0820023 2026-11-02 — `ci/work-order.mjs` (the line numbers above; `PICKS = 3` at `:29`; leaves built
per item at `:121`–`:128`, so an issue two items name is listed twice; `blockers()` read from `Blocked by:` only at
`:117`; item text through `plain()` at `:105`), `ci/checks/lib/markdown.mjs:161` (`plain()` leaves `~~`),
`dev/features/work-order.md` (no `<script>` at `:162`, `--serve` at `:329`), `dev/features/parallel-plan.md` 0.3
(§1–§10), `package.json` (`work-order` at `:25`, `status` at `:24`), `decisions.md` (D-022, D-050). `plan.mjs`,
`owed.mjs` and `github-state.mjs` do not exist on `main` yet: every claim about them is F-17 0.3's Contract, and the
build re-reads them after #542 merges (L-18).

Decisions this rests on, in words: the work order is a local page, never hosted, published or committed, and may show
issue titles, blockers, commands and designations [D-022]; status and the page name the same main step and picks from
one function, status reads the owner's GitHub work once per run within five seconds, all or nothing, with no cache,
and only the owner's own pull requests and claims mark work in progress [D-050]; the work-order page becomes the board
under `pnpm board`, one pinned script replaces "the page has no script" with a content policy that lets only that
script run, and a wait written only in an issue's prose holds that issue in the shared plan [D-055]; status is
computed, never hand-kept [D-020]; owners see actions in the project's words [D-016]; issue text is printed only
escaped [#501].

### §1 The command

```
pnpm board [root] [--port <n>]          # serve the board at http://127.0.0.1:4747/ and keep it current
pnpm board [root] --out <file>          # write the board once to <file> and exit (no server, no script)
pnpm work-order …                       # the same as pnpm board, with one stderr line: "pnpm work-order is now pnpm board"
```

`ci/work-order.mjs` is renamed `ci/board.mjs` (`git mv`, so its history follows) and `scripts/work-order.test.mjs`
`scripts/board.test.mjs`. `package.json` gains `"board": "node ci/board.mjs"`; `work-order` becomes
`node ci/board.mjs --alias`, which prints the line above and runs as `board`. `--watch` and `--every` go: serving is
watching. `--port` keeps F-07's rules (1–65535; taken: exit 1; omitted: 4747, else a free port, printed). Settings,
`gh` failures and the exit codes are F-07's as F-17 §10 amends them.

### §2 The model — `board(root, read)`

`read` is one answer of the shared read (F-17 §5, as §3 extends it), or `null` when GitHub was not read. `board()`
calls `plan()` and the readers above and returns:

```js
{
  product, repo,
  milestone: { id, title, summary, appetite: { start, end }, clock } | null,
  ended: { id, status: 'closed' | 'killed', date } | null,   // the latest milestone, when none is active
  next,                       // the exact text of status's Next line (§3)
  columns: { done: [Strip], running: [Strip], next: [Pick], left: [Strip] },
  yours: { soon: [Owed], folded: [Owed] },
  gate: [{ text, state: 'proven' | 'not yet' | 'unproven' }],
  issues: { open, onMilestone, elsewhere: [{ n, title }], more },
  readAt, githubAt, failed,   // times in the AGENT.md Timezone; failed: §4's reason words or undefined
}
// Strip: { n, title, item, state, why?, pr?, changedAt? }   Pick: plan's pick + { command, designation }
```

**Every leaf is in exactly one column.** A leaf is an issue the active milestone reaches: an item's issue, or its
sub-issues (F-07's rule).

- **Done:** closed as completed. Closed as not planned or duplicate is *dropped*, folded under Done and never counted
  as done.
- **Running:** in work in progress as F-17 §2 defines it: the owner's open pull request closes or is part of it, or a
  branch claims it. The strip says which, with the pull request's number, draft or not, and its checks' rollup.
- **Next:** the plan's main step and picks, in its order, at most three (F-17 §3). A leaf pick shows its issue,
  `/work-ticket {n}` and its designation's mode, model and effort; the shaping pick shows `/log-feature {id}#{k}`; an
  owed-thing pick shows its text. Each carries its who (`agent`, `you`, `you and an agent`, `you or an agent`): what is
  not `you` can be handed to an agent.
- **Left:** every other open leaf, and every Contents item with no issue yet (`Not filed: /log-feature {id}#{k}`).
  Each says why it is not Next, in fixed words: `waits on #n` (its `Blocked by:`), `says it waits on #n: add Blocked by:
  #n` (§3), `shares files with #n` (work in progress), `files not listed`, `claimed by a branch`, `owes {check}`,
  `can start, after the three above` (the cap or the person rule), `not ready` (GitHub not read).

**An issue appears once.** An issue reached from two items, or as a sub-issue of two, is one strip, under the first
item in Contents order; the later item shows `#n is listed under item {k}`.

**Nothing is done without an issue.** An item with no issue, an issue GitHub does not return, and an item whose
issue's sub-issues are not all done or dropped are never in Done and never counted done. The rail's bar is
`done ÷ (leaves − dropped + items with no issue)`: a step nobody has filed lowers the bar, never raises it.

**Item text.** Contents text renders through `inlineMarkdown()`, new in `ci/checks/lib/html.mjs`: it escapes first
(`escapeShown()`), then turns `~~x~~` into `<s>`, `**x**` into `<strong>`, `` `x` `` into `<code>` and `[t](u)` into
`t` (no link is built from text). Nothing else is markup. A struck-through item is shown struck, as the owner wrote it.

**Waiting on you.** The plan's owed things and F-17 §6's kinds whose who is `you` or `you and an agent`. `soon`:
those of rank 1 (they block the active milestone closing), then those of rank 4 dated on or before the appetite's
last day, by date; at most 7, with `and {k} more` folded under. `folded`: the owner's other things, project-wide,
behind one closed `<details>` with their count. `you or an agent` work is in Next or Left, not here.

**The gate.** The milestone's `## Gate` list items, each with a state the board can prove or none:

- `proven`: the line names one or more `#n`, each closed as completed; or names a QA plan path (`docs/qa/…`) and the
  milestone has a `Ran: {that path} … pass` line with no later `fail` for it (F-09's lines).
- `not yet`: it names those, and they are not.
- `unproven`: anything else, shown as `the board cannot check this; /close-milestone does`. Never ticked.

**No active milestone.** When the latest milestone (by appetite end) is `closed` or `killed`, the page says
`{id} was {closed | killed} on {date}.`, then status's Next line, then the open-issue footer; no columns, no rail.
With no milestone at all, F-07's line: `No milestone is active. Run pnpm status for the next step.` The page is a
function of the tree and the read: the same inputs give the same bytes (`CHECK_NOW`), and changed inputs re-render.

**The open-issue footer.** `{open} open issues in {repo} · {onMilestone} on {id} · {elsewhere} elsewhere`, the
elsewhere list (number and title) behind a closed `<details>`. `onMilestone + elsewhere = open` always; above 100,
`100 or more`, the first 100 listed and `{more} more on GitHub`.

### §3 What the shared plan gains (step 1)

The board shows the plan; anything it needs that the plan lacks goes into the plan, so status says it too.

- **Prose waits** [D-055]. `proseWaits(body)` in `ci/checks/lib/issue-body.mjs` returns the issue numbers an issue's
  text says it waits on: the phrases `after #n`, `waits on #n`, `waiting on #n`, `once #n`, `depends on #n`,
  `blocked by #n` and `build after #n`, case-insensitive, `#n` a whole reference (`#4` never matches `#43`), outside
  fenced code, inline code and the `Blocked by:` segment of `### Links`; a number already on that segment is not a
  prose wait. A leaf with a prose wait on an open issue is not ready, everywhere the plan reads leaves; a closed one
  holds nothing. It is never held silently: it becomes an owed thing of kind `prose-wait`, who `you or an agent`,
  rank 1, files `[]`, text `#{m} says it waits on #{n} but has no Blocked by line for it, so it is not offered. Add
  Blocked by: #{n} to its Links line, or remove the wait.` When the held leaf comes before the main step in the
  plan's order, the Next line ends with `#{m} is held: add Blocked by: #{n} to its Links line.`, within F-16's form
  (`nextFormBreaks()`). Offline, status reads no issue, so nothing is held or printed: the bodies come in the same
  5-second read (F-17 §5), and no fetch is added.
- **The open-issue list.** The read's GraphQL call gains `repository { issues(states: OPEN, first: 100) { totalCount
  nodes { number title } } }`, inside the same call and budget. Status reads only `totalCount` for its GitHub line;
  titles never reach status's output (F-17 §7).
- **One Next.** `ci/status.mjs` exports `statusModel(root, read)`, the function its own printing calls, returning at
  least `{ next }`. The board's header prints that `next` as is.

### §4 The live board (step 3)

**Reads.** One read is the files and GitHub together: the tree through `board()`, and the shared read as a child
under F-17's 5-second budget. No answer of GitHub is reused across reads [D-050].

- At start; then after any change under the root, once it has been quiet for 1 second, but never sooner than 10
  seconds after the last GitHub read; and every 30 seconds when nothing changed.
- Changes come from `fs.watch(root, { recursive: true })`, ignoring `node_modules/`, `.git/objects/`, `.git/logs/`
  and the `--out` file. An event only marks the board dirty: no path from an event is read or printed. Where the
  watch cannot start (`ERR_FEATURE_UNAVAILABLE_ON_PLATFORM`, `EMFILE`), the 30-second read stands alone and the
  header says `files: read every 30 seconds`.
- A GitHub read that fails (any F-17 §5 reason): the files are re-read now; the columns stay those of the last good
  read, under `GitHub not read at {HH:MM} ({reason}); columns as of {HH:MM}.` in the signal colour. With no good
  read yet, the columns say `not ready` and nothing is offered.
- A strip whose column, state or why changed in the latest read that changed anything carries `changed {HH:MM}`.

**The server.** F-07's `serve()` and its rules (127.0.0.1 only, `GET`/`HEAD /` only, foreign `Host` 403, other paths
404, other methods 405), serving the latest page from memory. Each response carries `ETag: "{sha-256 of the bytes,
hex}"`; a request whose `If-None-Match` matches gets `304` with no body. Headers: F-07's, with the content policy
`default-src 'none'; script-src 'sha256-{hash}'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none';
form-action 'none'; frame-ancestors 'none'`.

**The script.** One `<script>` at the end of `<body>`, outside `<main>`, a fixed string in `ci/board.mjs` with no
value of any read in it; its hash is computed from that string. Every 15 seconds it fetches `location.pathname` with
`cache: 'no-store'` and the last `ETag`:

- `200`: parses the text with `DOMParser`, replaces `<main>` with the parsed `<main>`, keeps open every `<details>`
  whose `id` was open, and leaves scroll alone. It never builds HTML from data and never uses `innerHTML`.
- `304`: nothing.
- a failed fetch: sets the `#live` line's `textContent` to `Server stopped at {HH:MM}; this is the last good board.`
  and keeps polling; the next `200` clears it.

`<noscript><meta http-equiv="refresh" content="15"></noscript>` is the fallback. `--out` writes the page with no
script and no refresh. `<details>` ids are fixed words and numbers (`done-more`, `yours-more`, `item-3`,
`issues-elsewhere`).

**The page** follows `dev/board/design-direction.md` and `dev/board/specimen.html`: header (milestone id and title,
`#live` line, status's Next line), the appetite rail, then Done · Running · Next · Left beside Waiting on you and the
gate; Waiting on you comes first when the columns stack. Light and dark follow the system [D-055]; `scrollbar-gutter:
stable` on `html`; no horizontal scroll at 360px; WCAG 2.2 AA contrast on every token pair; no motion.

## Seams

none: a local page for the owner, on their own machine; it adds no person, no channel and no promise.

## Threat model

**Defends:** the owner's browser and machine against text other people wrote (issue titles and bodies, Contents text,
pull request data) and against web pages on other sites.

- **No script but the pinned one.** Every value is escaped as F-07 does; the content policy lets only the script whose
  hash it names run, so a missed escape cannot run anything, an inline handler included (no `'unsafe-hashes'`). The
  swap parses with `DOMParser` (scripts in the parsed document never run) and inserts nodes, never strings.
- **No link from text.** Links are built from the validated repo and a number; `inlineMarkdown()` builds none.
- **Reachable only from this machine.** 127.0.0.1, the `Host` check against DNS rebinding, `frame-ancestors 'none'`;
  `connect-src 'self'`, so the page talks to nothing else.
- **The watcher reads nothing it is told.** A file event marks the board dirty; reads are `board()`'s fixed reads.
- **GitHub** is read only by F-17's child: trusted PATH, the owner's `gh` login, a fixed argument array, no shell.

**Does not defend:** another local user or process on the same machine reading the loopback page (F-07's #183
limitation); the owner's own tree (D-023).

## Known limitations

- A prose wait is matched on its phrase: a sentence of history (`after #498 merged, …`) holds an issue too. The hold
  says so on the board and in status, and adding or removing a `Blocked by:` line clears it; an I1 rule at filing is the
  follow-up (Out of scope).
- A busy tree reads GitHub at most every 10 seconds; with an agent editing all day that is up to 360 reads an hour,
  inside GitHub's GraphQL budget for one account but not free.
- A change shows on the page within about 30 seconds (10 between reads, 5 for the read, 15 for the page's poll).
- At most 100 open issues listed and 100 of the owner's pull requests read (F-17 §5).
- Gate lines that name no issue and no QA plan stay `unproven`: the board cannot run a check.
- The swap replaces `<main>`: a text selection or focus inside it is lost on a change.

## Acceptance

```
Given a fixture milestone with items 1–5, leaves done, dropped, in a PR, claimed, ready, blocked, and an item with no issue
When  board() runs on it with a recorded read
Then  every leaf is in exactly one of done, running, next, left, the no-issue item is in left as "Not filed", and dropped is folded under done

Given item 2 and item 4 both name #20
When  the board renders
Then  #20 appears once, under item 2, and item 4 shows "#20 is listed under item 2"

Given item 3 has no issue and every leaf is done
When  the board renders
Then  item 3 is in left, nothing for it is in done, and the rail's bar is below 100%

Given a Contents line "~~Old idea~~ **now** `x`"
When  the board renders
Then  it contains <s>Old idea</s>, <strong>now</strong>, <code>x</code>, and no "~~" or "**"

Given #31's body says "Build after #30 lands" and its Blocked by line is empty, and #30 is open
When  plan() runs, online
Then  #31 is not offered by status or the board, a prose-wait line names #31 and #30, and the board's left says "says it waits on #30: add Blocked by: #30"

Given the same, with #30 closed
Then  #31 is offered as before

Given the same body with "#30" only inside a code block, or "#300"
Then  nothing is held

Given every status fixture with a GitHub read
When  statusModel() and the board run on it
Then  the board's header Next text equals status's Next line, byte for byte

Given the active milestone's file is changed to status: killed
When  the board reads again
Then  the page says "{id} was killed on {date}.", shows status's Next, and has no columns

Given an open issue that no item reaches
When  the board renders
Then  the footer lists it under elsewhere, and onMilestone + elsewhere equals the open count

Given rank-1 and rank-4 owed things of the owner's, one dated after the appetite's end, and a rank-5 one
When  the board renders
Then  Waiting on you lists the rank-1 then the in-appetite rank-4, and folds the other two

Given a gate line naming #40 (closed as completed), one naming docs/qa/x.md with a Ran pass line, and a prose line
Then  the first two are proven and the third is unproven, never ticked

Given pnpm board is running
When  a request to / carries a foreign Host, another path, or POST
Then  403, 404, 405, as F-07

Given two requests in a row with no change between
Then  the second, sending If-None-Match, gets 304 with no body

Given the served page
Then  it has exactly one <script>, its sha-256 matches script-src in the response's Content-Security-Policy, and the policy is the one §4 gives

Given a title "<img src=x onerror=alert(1)>" and a Contents line "<script>x</script>"
Then  both are escaped text, and the page still has exactly one <script>

Given a fake clock and watcher
When  a file changes 2 seconds after a GitHub read
Then  the next read starts 10 seconds after that read, not before; with no change, 30 seconds after it

Given the GitHub read fails after a good one
When  the board reads again
Then  the columns are the good read's, under "GitHub not read at … (reason); columns as of …", and file-read parts are current

Given the server is stopped while the page is open
When  the page's next poll fails
Then  the #live line says "Server stopped at {HH:MM}; this is the last good board."

Given pnpm work-order is run
Then  stderr has "pnpm work-order is now pnpm board" and the board starts

Given the page in a 360px viewport, light and dark
Then  no horizontal scroll, every token pair meets WCAG 2.2 AA, and ui-craft's check passes
```

## Verify

```
node scripts/board.test.mjs              # §1, §2, §4: columns, once, no-issue, inline markdown, gate, ended, footer, server, ETag, CSP, script, schedule
node scripts/plan.test.mjs               # §3: prose waits held, closed released, code and #300 ignored, the Next sentence
node scripts/github-state.test.mjs       # §3: the open-issue list inside the one read, titles absent from status
node scripts/plan-shared.test.mjs        # status's Next and the board's header, on one fixture
pnpm meta                                # S1 over the status fixtures, the prose-wait fixture included; everything wired
pnpm board                               # by hand, in a project with an active milestone: screenshots light and dark, 1440px and 390px
node ~/.claude/skills/ui-craft/scripts/check-ui.mjs dev/board   # the direction's checks
```

## Build map

All after #542. Owner-only files, asked for at each edit and named under `## Gate changes`: `ci/**` in every step,
`package.json`'s scripts in steps 1–3 (each wires its tests into `meta`).

1. #601 — **The plan gains prose waits, the open-issue list and one Next** — `ci/checks/lib/issue-body.mjs`
   (`proseWaits()`), `ci/checks/lib/plan.mjs`, `ci/checks/lib/owed.mjs` (`prose-wait`), `ci/checks/lib/github-state.mjs`,
   `ci/status.mjs` (`statusModel()`), fixtures and tests. Status changes; the page does not yet. Before the pull request is
   marked ready, #541's timed run is repeated with the open-issue field in the read, its time in this doc's Changes; over
   5 seconds, the step stops and asks the owner. ~300 lines.
2. #602 — **The board's model and page** — `ci/work-order.mjs` → `ci/board.mjs` (`board()`, the render per the direction,
   `--out`), `inlineMarkdown()` in `ci/checks/lib/html.mjs`, `scripts/work-order.test.mjs` → `scripts/board.test.mjs`,
   `package.json` (`board`, the `work-order` alias), F-07's doc's Changes line. Static, no server change. Blocked by
   step 1. ~450 lines.
3. #603 — **The board stays live** — the watcher and read schedule, `ETag` and `304`, the content policy, the pinned script,
   `<noscript>`, the failure lines, `changed`; tests with a fake clock and watcher; the hand run with screenshots.
   Blocked by step 2. ~350 lines.

## Out of scope

- An I1 rule that refuses a prose wait with no matching `Blocked by:` line, so new issues are caught at filing and the
  hold covers only older ones (the owner, 2026-11-02): a follow-up issue, filed after this doc.
- Removing the `work-order` alias: a follow-up issue, after the release that ships step 2.
- Server-sent events or websockets: the owner chose a 15-second poll with an `ETag`.
- A board for a repository with no active milestone, or across milestones (F-07's deferral stands).
- Starting sessions from the page: it shows commands to copy; nothing on it acts.
- Hosting, publishing or sharing the page (D-022).
- A Claude or editor pane: F-17 leaves it as an import of `plan.mjs`.

## Open questions

None open. Answered by the owner on 2026-11-02, recorded in D-055:

- ~~One page or two?~~ "Replace it": the board replaces the work-order page; `pnpm work-order` points to it.
- ~~A script on the page?~~ One pinned script under a content policy, as §4 gives it, the owner's terms whole.
- ~~Theme?~~ Follow the system: steel dark, the same palette on paper in light.
- ~~Prose waits in status too?~~ Both, on three conditions: no network fetch added (§3: the bodies come in the same
  read; offline nothing is held); a narrow match, released when `#n` is closed, never silent; the I1 rule as a
  follow-up.

## Changes

- 2026-11-02 · ADDED · 0.1, shaped from the owner's request for a live per-milestone board · #600
