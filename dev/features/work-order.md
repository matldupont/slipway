---
prd-ref: D-022
status: draft
---

# F-07 — Work order: which sessions the owner can start now, rendered locally from the repo and GitHub

Version: 0.3 (2026-11-04)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar the sha and date of a `Verified against:` line; a single acceptance block the owner
confirmed (`/log-bug`) is the one change that leaves it.

## Problem

**Job:** when I sit down to start agent sessions on my active milestone, I want to see which pieces of work
are ready, which of them can run side by side without touching the same files, and the exact command and
model each one starts with, so I can start several sessions at once without re-reading every issue or
keeping an order by hand.

A project on slipway keeps its plan in the active milestone's Contents and its work in GitHub issues. Nothing
joins the two for the owner:

- `pnpm status` names one next step. It stays offline (D-020), so it cannot say which issues are open, which
  have a PR, or what each waits on.
- The roadmap page (F-02, #41) is for people who don't read the repo. It is published, so it shows milestone
  fields only: never an issue, a command or a PR (D-017).
- The issues carry the rest (`Blocked by:`, the designation block), one issue at a time. Working out what can
  run in parallel means opening every open issue and comparing what each changes.

Evidence: since 2026-09-24 the owner has run several sessions a day on slipway and on a private project from a
hand-built version of this page, kept current by a separate agent session. It works, and it drifts the way
D-017 said a hand-kept source of truth would: on 2026-09-27 two new issues were invisible for a day because
they were added to the page's items but not to its order; on 2026-09-28 the list and the order on the epic
disagreed until the owner noticed; the same day three open issues were missing from its graph. Each miss was
caught by the owner, not by anything that fires. Its "Next" rule (up to three ready items whose areas overlap
nothing in progress; an item with no areas conflicts with everything) is the one this page computes. Workaround
today: that hand-kept page, or opening each issue. Frequency: every time the owner starts a session. Why now:
#68 builds the milestone page renderer this reuses, and projects are in their first milestones.

Serves `SLIPWAY.md`'s thesis, a rule exists only where something fires: the order of work is computed from
the milestone and the issues on every run, so it cannot drift. And D-016: the owner sees the command to run,
not the machinery behind it. Decision: D-022 (new, below). Related: F-02 (#41, #68). Part of epic #43.

**Verdict: PROCEED** as asked, with the parallel-safety line (`Touches:`) as repository paths.

| option | for | against | verdict |
|---|---|---|---|
| Do nothing (hand-kept page) | Works today | Drifts; an agent session spends its time keeping it; every owner rebuilds it | rejected |
| Add it to `pnpm status` | One command owners already run | Status runs in every session's hook and stays offline (D-020); a network call there slows and can fail every session start | rejected |
| Add issues to the roadmap page | One page | That page is published; D-017 keeps issues and commands off it | rejected |
| A GitHub Projects board | Native, live | A second hand-kept source of truth (declined in D-017); has no notion of parallel-safety | rejected |
| Terminal output instead of a page | No HTML to render | No folding, links or designation panels; the evidence is a page used daily | deferred (a `--text` flag, if asked) |
| A local page, rendered on demand from the milestone and GitHub | Never drifts; nothing published; reuses #68's renderer | Needs `gh` and a network call | **selected** |

## Fit

What this feature takes from the product it joins, as built and as amended by 0.2 (#607); paths and lines at 833f538.

Reuses:
- `readMilestones()`, `readMilestoneModel()`, `contents()`, `marker()` and `owing()` in `ci/checks/lib/milestones.mjs`
  (`:79`, `:245`, `:112`, `:202`, `:179`): the active milestone, its items, each item's issue and what it still owes;
  `appetiteClock()` (`:44`, #68) for "day N of M".
- `blockers()`, `touches()`, `overlap()` and `designation()` in `ci/checks/lib/issue-body.mjs` (`:35`, `:50`, `:68`,
  `:27`): the three things read from an issue body, and the overlap rule.
- `trustedEnvAt()` in `ci/checks/lib/manifest.mjs:86`: the PATH without the repository's or `node_modules`' entries,
  shared with the git lookup, for every `gh` call.
- `agentRow()`, `zone()` and `today()` in `ci/checks/lib/clock.mjs` (`:33`, `:40`, `:45`): the `Issue repo` and
  `Product name` cells, the project's timezone and day.
- `escapeShown()` in `ci/checks/lib/html.mjs:14`, `escapeControl()` and `excerpt()` in `ci/checks/lib/report.mjs`
  (`:53`, `:60`), `plain()` in `ci/checks/lib/markdown.mjs:161` and `hasPlaceholder()` in
  `ci/checks/lib/frontmatter.mjs:75`: how each value is cleaned before the page shows it.

Numbers:
- The picks cap, 3, is `PICKS` in `ci/work-order.mjs:29`.
- The designation is cut at `DESIGNATION_MAX`, 600, and a `Blocked by:` line keeps at most `BLOCKERS_MAX`, 50,
  numbers, both in `ci/checks/lib/issue-body.mjs:10`–`11`.
- The open pull requests read, 200 at most, is the `--limit` in `ci/work-order.mjs:109`.
- `--watch`'s 15-second floor and `--serve`'s default port 4747 are `MIN_EVERY` and `DEFAULT_PORT` in
  `ci/work-order.mjs:247`–`248`.
- A blocker's status (issue, pull request or unknown, 0.2) is decided once, in `collect()`; the page only prints it.

New: `ci/work-order.mjs`, the page. Nothing else reads the active milestone's issues from GitHub, judges which ready
issues can run side by side, or renders them for the owner: `pnpm status` stays offline (D-020) and the roadmap page
is published, so it shows no issue (D-017).

## Contract

Verified against: a09b863 2026-09-30 — `ci/checks/lib/milestones.mjs` (`readMilestones`, `contents`,
`started` and its ` · #n` marker), `ci/checks/lib/report.mjs` (`escapeControl`, `UNSAFE`),
`ci/checks/lib/manifest.mjs` (`gitEnv`, private: PATH with repo and `node_modules` entries dropped),
`ci/checks/lib/clock.mjs` (`today`, `CHECK_NOW`), `ci/checks/lib/markdown.mjs` (`section`, `plain`),
`process/intake.md` → Issue body (Links, the designation block), `dev/features/roadmap-page.md` (#68's
contract: `appetiteClock`, HTML escaping net-new and private to `ci/roadmap.mjs`), `.gitignore` (`seeded`).

Verified against: 833f538 2026-11-04 — for 0.2 and 0.3 (#607): `ci/work-order.mjs:42`–`58` (`realGh()` keeps an
answer whose every error is `NOT_FOUND`, on any alias), `:70`–`75` (`issues()` asks every number as `issue(number:)`),
`:131`–`138` (a `Blocked by` number not returned is `missing` and holds its leaf), `:157` and `:163` (`missing` printed
"not found"), `ci/checks/lib/issue-body.mjs:35`–`41` (`blockers()` takes any `#n`); GitHub's answer to
`issueOrPullRequest(number:)`, asked 2026-11-04: `__typename` `PullRequest` and `MERGED` for a merged pull request,
`Issue` and `OPEN` for an issue, and for a number it holds as neither (`99999`, `0`) the alias `null` with one error
of type `NOT_FOUND` whose `path` is `["repository", alias]`, exit 1. A deleted or moved issue, and a discussion
number (discussions are off in this repository), were not asked: they are expected to answer as a typo does.

Decisions this rests on, in words: the page is local, owner-only and never published, and it may show issue
numbers, titles and commands, which the published roadmap page may not [D-022, D-017]. `pnpm status` stays
offline, so the live view is a separate command [D-020]. `ci/` scripts take no npm dependency [D-004]. A
started Contents item ends with ` · #n` [D-020].

### The `Touches:` line (step 1)

An optional segment of an issue's `### Links`, written by `/log-feature`, `/log-followup` and `/log-bug`:

```
Part of: #43 · Blocked by: #68 · Touches: ci/work-order.mjs, ci/checks/lib/**, package.json · Lane: feature
```

- **Entries:** repository paths or globs, comma-separated, each made of `A-Z a-z 0-9 . _ - / *`, no `..`,
  no leading `/`. Backticks around an entry are allowed and ignored.
- **What intake writes:** every path the Contract, root cause or scope says the PR changes. When it is not
  sure of the files, it writes the folder (`ci/checks/**`), never a narrower guess: a line that is too narrow
  reads as safe to run in parallel when it is not. When it cannot name even a folder, it omits the line.
- **A split:** each sub-issue gets its own line, for the files that step changes.
- `process/intake.md` → Issue body → Links documents it; the three `log-` skills name it where they list the
  Links line; `.github/ISSUE_TEMPLATE/feature.yml` and `bug.yml` mention it in the Links field's description.
  I1 does not check it (it is optional, and the page treats a bad entry as unknown).

### The command (step 2)

```
node ci/work-order.mjs [root] [--out <file>]
pnpm work-order                                  # the same, from package.json
```

Writes one self-contained HTML file and prints its path. Default `--out`:
`{os.tmpdir()}/work-order/{owner}-{repo}.html`, so the file never lands in the repository and cannot be
committed. The file is written to `{out}.tmp` and renamed, so a failed run leaves the last good page as it was.
Zero-dependency (D-004).

**Settings.** `Issue repo` is read as `process/intake.md` → Configuration reads it: from
`dev/skill-configuration.md` when it exists and `.slipway/manifest.json` does not, otherwise from the root
`AGENT.md`; the cell's first code span, else its first word. It must match `^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`;
missing, `<owner/repo>` or anything else: exit 1, `work-order: set Issue repo in AGENT.md (owner/name)`, write
nothing.

**GitHub.** Through `gh`, with `execFileSync` and a fixed argument array, never a shell. PATH is the one
`manifest.mjs` builds for git: entries inside the repository and under any `node_modules` dropped, run from
outside the repository. Step 2 exports that PATH filter from `manifest.mjs` (one place for both lookups)
instead of copying it. At most three calls per run:

1. `gh api graphql` — for each started item's issue: `number title state stateReason body` and its
   `subIssues(first: 50)` with the same fields, in GitHub's sub-issue order.
2. `gh pr list --repo {repo} --state open --limit 200 --json number,isDraft,body`.
3. `gh api graphql` — every `Blocked by` number not already fetched, as `issueOrPullRequest(number: n)` under the
   alias `p{n}`: `__typename`, `... on Issue { state stateReason }` and `... on PullRequest { state }` (skipped when
   none). `__typename` alone tells an issue from a pull request. A `Blocked by:` line may name a pull request on
   purpose, to hold a ticket until it merges (#607).

`gh` missing, signed out, or exiting non-zero: exit 1, naming `gh auth status` and the first line of its
stderr (through `escapeControl`, cut to 200 characters), and write nothing. One answer is kept despite the exit
(#607): when every error has type `NOT_FOUND` and a `path` of `["repository", alias]` naming an alias the answer
gives as `null`. Any other error, beside it or alone, fails the run as above.

**The model.**

- **Milestone:** the one `status: active` doc from `readMilestones`. None: the page says "No milestone is
  active. Run `pnpm status` for the next step." and nothing else, exit 0.
- **Items:** `contents(md)`, placeholders (`<…>`) skipped. An item is **started** when `started(text)`; its
  issue is the marker's number. A marker naming another repository shows "in {owner/repo}; not read" and no
  status. The marker is removed from the text shown.
- **Leaves:** a started item's issue, or, when it has sub-issues, those sub-issues in order (one level; a
  sub-issue's own sub-issues are not read). An issue number GitHub does not return shows "#n not found".
- **Leaf status:** `done` (closed as completed) · `dropped` (closed as not planned or duplicate) ·
  `PR #x` or `PR #x (draft)` (an open PR whose body names the leaf as `Closes #n`, `Fixes #n`, `Resolves #n`
  or `Part of #n`, case-insensitive, `#n` as a whole reference so `#4` never matches `#43`; the lowest PR
  number when several) · `open`.
- **From an issue body, only three things are read,** and nothing else of it reaches the page:
  - the designation: the `## Recommended Mode / Model / Effort` section (`section(body, …, 2)`), through
    `plain()`, cut to 600 characters with `…`;
  - `Blocked by:` in `### Links`, up to the next ` · ` or line end: its `#\d+` references, as numbers. `none`
    or empty is none. Any other text there (an F-ID "(no issue yet)") is an unfiled blocker, shown as "waits
    on work not filed yet", never as the text;
  - `Touches:`, parsed as above. Missing: unknown. An entry that breaks the rules makes the whole line
    unknown.
- **A blocker's status** (#607): a `Blocked by` number GitHub returns as an issue reads as a leaf does, `done`,
  `dropped` or `open`. One it returns as a pull request reads `pull request, open`, `pull request, merged` or `pull
  request, closed unmerged`. One it returns as neither (its alias `null` with a `NOT_FOUND` error: a typo, a deleted
  or moved issue) is `unknown`. An unknown blocker never fails the read: every other leaf and blocker reads as it
  would if that number were an open issue.
- **Findings on a leaf** (#607), shown only on an `open` leaf, where a blocker holds something:
  - its unknown blockers, in one finding: `Correct or remove {list} on #{m}'s Blocked by line. GitHub holds no issue
    or pull request by that number in this repository.` `{list}` is the first three as `#a, #b, #c`, then `and {k}
    more`; "that number" reads "those numbers" for two or more;
  - each pull request blocker closed unmerged: `PR #{n} closed unmerged; check the wait.` (F-18's words, the owner,
    2026-11-04). It holds until the `Blocked by:` line is edited; nothing releases it by age.
- **Ready:** status `open`, nothing owed (F-09), every blocker cleared, and the `Blocked by:` line filed (no unfiled
  blocker). An issue clears when closed, as completed, not planned or duplicate; a pull request clears when merged.
  An open pull request, one closed unmerged and an unknown blocker hold the leaf.
- **In progress:** status `PR`.
- **Overlap:** an entry's key is its text up to the first `*`. Two entries overlap when one key is a string
  prefix of the other (`ci/checks/` overlaps `ci/checks/lib/milestones.mjs`; `ci/check` overlaps
  `ci/checks-old`: a false overlap is the safe mistake). Unknown overlaps everything, and anything overlaps it.
- **Next:** walk leaves in Contents order, then sub-issue order. Take a ready leaf when it overlaps nothing in
  progress and nothing already taken. Stop at three. Then, when fewer than three were taken and an item is not
  started, add the first such item as "Shape item {k}" with `/log-feature {id}#{k}`: one at most, since
  shaping edits the milestone doc.

**The page**, top to bottom:

1. **Header:** product name (omitted while `<Product>`), the milestone's id, title and summary; "day N of M"
   from `appetiteClock` (#68), or "Past its time budget"; "Updated {CHECK_NOW-aware time, in AGENT.md Timezone} from {repo}". With `--watch` (#177) the page also carries
   `<meta http-equiv="refresh">`, and a refresh that failed adds "Last updated {time}; the latest refresh failed: {why}".
2. **Next:** each pick with its `#n` link, title, "Touches {entries}" or "Touches: not listed", its start
   command and its designation.
3. **Items**, in Contents order: the item's number and text; for each leaf, `#n` linked to
   `https://github.com/{repo}/issues/{n}`, its title, status, "Blocked by #a (open), #b (done), #c (pull request,
   open), #d (unknown)" (a pull request blocker linked to `https://github.com/{repo}/pull/{n}`), the leaf's findings, its start command `/work-ticket {n}` when `open`, and its designation in a closed `<details>`. An unstarted item shows
   `/log-feature {id}#{k}`. Done and dropped leaves of an open item fold into a closed `<details>` inside it.
4. **Finished:** items whose leaves are all done or dropped, in one closed `<details>` at the end.

Every link is built from a validated repo and a number; no URL is taken from GitHub or the repository. Every
text value (Contents text, titles, designation, touches, stderr) goes through `escapeControl`, then HTML
escaping (`& < > " '`). The page has no `<script>`, no external request, and `lang="en"`; commands are in
`<code>` with `user-select: all`, so one click selects one. Inline CSS: light and dark by
`prefers-color-scheme`, no horizontal scroll at 360px, `scrollbar-gutter: stable` on `html`. Same tree, same
GitHub answers and same `CHECK_NOW`: byte-identical output.

**Escaping moves to a shared lib.** #68 keeps its HTML escaping private to `ci/roadmap.mjs` until a second use.
This is that use: step 2 moves it to `ci/checks/lib/html.mjs` (`escapeHtml`, applying `escapeControl` first)
and switches `ci/roadmap.mjs` to it. `appetiteClock` is #68's, reused as is.

**Code shape.** `ci/work-order.mjs` exports `collect(root, gh)` (settings, milestone, GitHub → a model) and
`render(model)` (model → HTML string), and runs them when invoked directly. `gh` is a function
`(args) → stdout`; tests pass a stub that answers from fixture JSON, so no test calls GitHub.

**Ownership.** `ci/work-order.mjs` and `ci/checks/lib/html.mjs` are `managed` (the `ci/**` glob). The
`work-order` script is a `package.json` script (`merged`). `scripts/work-order.test.mjs` and
`scripts/fixtures/work-order/**` are `internal`. O1 needs no new glob.

### Decisions the orchestrator session made

The owner routed this doc's design questions to the session that orders slipway's work; each was its call,
not the owner's:

- **Milestone only.** The page reads the active milestone. An epic as a source (slipway runs under #43 with
  no milestone, by design) is deferred: #43's order is prose in its body, not the sub-issue order.
- **`Touches:` is paths or globs,** not area names: overlap is mechanical, and a later check can compare the
  line with a PR's diff. Intake writes the folder when unsure; a missing line overlaps everything.
- **Temp dir by default,** printed, with `--out`: the file can never be committed, and `.gitignore` is a
  seeded file a sync would not update.
- **`gh` through `manifest.mjs`'s PATH filter,** the same rule as the git lookup, one place.
- **Escaping:** `escapeControl` first, then HTML. The shared HTML escape lands in step 2, not in #68.

## Seams

none: the page is written to the owner's own machine and opened by them. It adds no person (it reads what
the owner can already read with `gh`), no channel (nothing is published or sent) and no promise.

## Threat model

The page renders text other people can write (issue titles and bodies, PR bodies; on a public repository,
anyone can open an issue) into an HTML file the owner opens in a browser, and it runs a subprocess.

- **No injection into the page.** Every value is control-escaped and HTML-escaped; the page has no script;
  links are built from the validated repo and a number. A test plants `<script>`, `"><img onerror>` and a
  bidi override in a title and a designation and finds them escaped, with 0 `<script>` elements.
- **Only three things leave an issue body.** A test plants `SENTINEL-<place>` in an issue body's Problem,
  Contract and Acceptance, in a PR body and in a comment-like trailer, and finds 0 in the page; the planted
  designation text is found.
- **Bounded reads.** The designation is cut to 600 characters; issues outside the milestone's markers, their
  sub-issues and the issues a fetched issue names as `Blocked by` (state only) are never fetched, so an issue someone else files never appears unless the owner's
  milestone names it or it is a sub-issue (which only a repository writer can link).
- **No hijacked `gh`.** Fixed argument arrays, no shell; PATH without repository or `node_modules` entries;
  the repo is validated before it reaches an argument.
- **Nothing published.** No network write; the file goes to the temp dir unless `--out` says otherwise.
- **`--serve` (#183) is reachable from the owner's machine only.** Defended: another machine on the network (the
  server binds `127.0.0.1`, never all interfaces; a test asserts the bound address); another website in the
  owner's browser (a `Host` other than `127.0.0.1:<port>` or `localhost:<port>` answers 403, the page has no
  script, and the response's content policy allows inline styles and nothing else); a request for any other
  file (only `GET` and `HEAD` of `/` answer 200, from the one generated file; no request value is joined to a path).

Not defended: a repository writer can link any issue as a sub-issue or write any `Touches:` line, and the page
believes it. `gh` itself, and the token it holds, are trusted. The temp dir is readable by the owner's own
account, like any other file of theirs.

## Known limitations

- A pull request closed unmerged holds its leaf until the `Blocked by:` line is edited, even when a reopened or
  replacement pull request now carries the work (the owner, 2026-11-04).
- A session working an issue with no PR yet looks ready, so Next can offer it twice. `/work-ticket` opens a
  draft PR early; until then, the owner knows what they started.
- `Touches:` is what intake expected, not what the PR changed. Comparing the two is a later check.
- Issues filed before step 1 have no `Touches:` line, so each overlaps everything until one is added by hand.
- One level of sub-issues; a marker in another repository is shown, not read.
- More than 200 open PRs: a PR beyond the first 200 is not seen.
- `--serve`: another user account on the same machine can reach a loopback port. That is the owner's own machine,
  on the trusted side of D-023's line.

## Acceptance

Step 1 — the `Touches:` line:

```
Given process/intake.md on the step-1 branch
When  its Issue body → Links rule is read
Then  it lists `Touches:` with the entry rules, the folder-when-unsure rule and "omit when unknown"
And   `node scripts/skills.test.mjs` fails when that text is removed
```

```
Given the three log- skills on the step-1 branch
When  each one's Links line is read (log-feature Phase 5 and Phase 6, log-followup, log-bug)
Then  each names `Touches:`, and `node ci/checks/meta/i1-issue-shape.mjs` still accepts a body with and without it
```

Step 2 — the page (fixture root with M1 active 2026-03-09..2026-03-15, `CHECK_NOW=2026-03-11T12:00:00Z`, a
stubbed `gh`):

```
Given items 1 (· #10, closed completed), 2 (· #11 with sub-issues #12 done, #13 PR draft Touches ci/c/**,
      #14 open blocked by #13, #15 open Touches ci/a/**), 3 (· #16 open Touches ci/b.mjs), 4 (no marker)
When  the page is rendered
Then  Next lists #15 and #16 and "Shape item 4" with `/log-feature M1#4`, and not #14
And   #13 shows "PR #20 (draft)", #14 "Blocked by #13 (open)", item 1 is inside the closed Finished <details>
And   "day 3 of 7" is in the header
```

```
Given #13 in progress Touches ci/a/x.mjs and #15 Touches ci/a/**
When  the page is rendered
Then  #15 is not in Next
```

```
Given the first ready issue has no Touches line, a later ready issue has one, and nothing is in progress
When  the page is rendered
Then  Next holds the first issue and no other issue, with "Touches: not listed"
```

Blocked by numbers that are not issues (#607):

```
Given an open leaf with nothing owed whose only blocker is an open pull request
When  the page is rendered
Then  the blocker shows "(pull request, open)", linked to /pull/{n}, and the leaf is not in Next
```

```
Given the same leaf with that pull request merged
When  the page is rendered
Then  the blocker shows "(pull request, merged)" and the leaf is in Next
And   with the pull request closed unmerged instead, the blocker shows "(pull request, closed unmerged)", the leaf
      carries "PR #{n} closed unmerged; check the wait." and is not in Next
```

```
Given the real gh path (realGh) answering a Blocked by number with a null alias and one NOT_FOUND error on that
      alias's path, exit 1
When  the page is rendered
Then  that blocker shows "(unknown)", its leaf carries "Correct or remove #{n} on #{m}'s Blocked by line. GitHub holds
      no issue or pull request by that number in this repository.", the leaf is not in Next, and every other leaf,
      blocker and pick is the same as in a run where that number is an open issue
And   a done leaf naming the same number carries no finding
```

```
Given the same answer with a NOT_FOUND error beside an error of another type, or a NOT_FOUND on an alias the answer
      gives data for
When  `node ci/work-order.mjs <root>` runs
Then  it exits 1 naming gh auth status, and writes nothing
```

```
Given a title `<script>alert(1)</script>` with U+202E, and `SENTINEL-<place>` in every body section but the designation
When  the page is rendered
Then  the output has 0 `<script` elements, shows `&lt;script&gt;` and `‮`, and contains 0 SENTINEL strings
```

```
Given no active milestone
When  `node ci/work-order.mjs <root>` runs
Then  it exits 0 and the page says "No milestone is active"
```

```
Given Issue repo `<owner/repo>`, or a stub gh that exits 1
When  `node ci/work-order.mjs <root> --out <file>` runs with an existing <file>
Then  it exits 1 naming the cause, and <file> is byte-identical to before
```

```
Given the same fixture and CHECK_NOW
When  the page is rendered twice
Then  both outputs are byte-identical
```

```
Given ci/roadmap.mjs after the move to ci/checks/lib/html.mjs
When  scripts/roadmap.test.mjs runs
Then  it passes unchanged
```

## Verify

```
node scripts/skills.test.mjs                 # step 1: the Touches rule in intake.md and the three skills
node scripts/work-order.test.mjs             # step 2: one case per Acceptance line, fixtures in scripts/fixtures/work-order/
node scripts/roadmap.test.mjs                # step 2: unchanged after the escape move
pnpm meta                                    # both steps: I1, O1, W1 see the new test wired in
pnpm work-order                              # step 2, real run on a project with an active milestone
```

Open the printed file at 360px and at desktop width, in light and dark, and attach screenshots to the step-2
PR.

## Build map

1. #157 — The `Touches:` line: `process/intake.md` → Issue body, the three `log-` skills' Links lines, the two issue
   forms' Links description, `scripts/skills.test.mjs`. — rules and skills, ~60 lines.
2. #158 — The page: `ci/work-order.mjs`, `ci/checks/lib/html.mjs` (and `ci/roadmap.mjs` switched to it), the PATH
   filter exported from `ci/checks/lib/manifest.mjs`, the `work-order` script in `package.json`,
   `scripts/work-order.test.mjs` and fixtures, wired into `pnpm meta`. — checks lib and a script, ~450 lines
   with tests. Blocked by #68 (it reuses `appetiteClock` and #68's escaping) and by step 1.

### `--serve` (#183)

`pnpm work-order --serve [--port <n>]` does everything `--watch` does and serves the page from a `node:http`
server (no dependency), printing one line, `http://127.0.0.1:<port>/`, until Ctrl-C closes it. Only `GET` and
`HEAD` of `/` answer 200 with the current file; any other path is 404, any other method 405, a foreign `Host` 403.
Responses carry `text/html; charset=utf-8`, `no-store`, `nosniff` and `default-src 'none'; style-src 'unsafe-inline'`
(plus `frame-ancestors 'none'`). The default port is 4747, so the address can be bookmarked; when taken the server
takes a free one and prints it. An explicit `--port` that is taken exits 1. Without `--serve` nothing listens.
Reload stays the `--watch` refresh tag: no websockets, no HTTPS, no opening the browser, nothing but the one page.

## Out of scope

- An epic as a source, for a repository with no active milestone (slipway itself): later, once an epic's
  sub-issue order is its order of work.
- Terminal output (`--text`): only if asked.
- A check that compares a PR's changed files with its issue's `Touches:` line: a later feature.
- Detecting work started with no PR (branches, worktrees): accepted as a known limitation.
- Publishing, hosting or sharing the page: never (D-022). The roadmap page is the shared view.
- Deeper sub-issue trees, and markers in another repository: when a real milestone needs them.

## Open questions

- D-050 (2026-10-23) amends this page: its Next comes from the plan `pnpm status` uses (F-17,
  `dev/features/parallel-plan.md` §10), with ready builds first, shaping only when fewer than three are ready, and only
  the owner's pull requests and branches marking a leaf in progress. D-050's all or nothing excepts a not-found item
  issue and a not-found `Blocked by` number (its 2026-11-04 note, #607), so this page's read keeps its 0.3 rule when
  step 5 moves it onto F-17's. F-17's Build map step 5 edits this Contract,
  Acceptance and Verify to match, and this doc's review covers only those sections, in one round. Owner: F-17's step 5.
- D-055 (2026-11-02) replaces this page with the milestone board, `pnpm board` (F-18,
  `dev/features/milestone-board.md`): the page gains one pinned script under a content policy in place of "no script",
  and `pnpm work-order` runs the board. F-18's Build map step 2 renames `ci/work-order.mjs` and records it here under
  Changes. Owner: F-18's step 2.

## Changes

- 2026-09-30 · ADDED · spec · #156 (steps #157, #158)
- 2026-09-30 · ADDED · `--serve`: a loopback address to click, with its threat model and limitation · #183
- 2026-11-04 · MODIFIED · 0.2: a `Blocked by` number is read as an issue or a pull request; an open pull request
  holds its leaf, a merged or closed one clears it, and a number GitHub holds as neither is unknown, with a finding,
  never a failed read (the owner, 2026-11-02). Fit filled from the code as amended. #607
- 2026-11-04 · MODIFIED · 0.3, from the 0.2 review (`docs/reviews/2026-11-04-work-order-0.2.md`), the last round: a
  pull request closed unmerged now holds, with F-18's line (the owner, 2026-11-04, replacing "closed clears", AR-12);
  `__typename` read (AR-1); an answer kept only when each `NOT_FOUND` names a `null` alias; the comparison run is one
  where the number is an open issue (AR-2); findings on open leaves only, a leaf's unknown numbers in one finding
  (AR-6); the Acceptance blocks
  sharpened (AR-7); Ready names owed checks and the three close reasons (AR-8); the finding's action first and in
  F-17's words (AR-9); the `Verified against:` lines corrected (AR-5, AR-10). AR-3 and AR-4 went to the owner:
  AR-3 is taken in F-17 0.5, AR-4 is a follow-up through the orchestrator. #607
- 2026-11-04 · FIXED · the hostile-text Acceptance block was deleted by mistake in 0.3 and restored unchanged (the
  owner, 2026-11-04); the 0.3 review's AR-1. No version move. #607
