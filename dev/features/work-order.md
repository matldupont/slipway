---
prd-ref: D-022
status: draft
---

# F-07 — Work order: which sessions the owner can start now, rendered locally from the repo and GitHub

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

## Contract

Verified against: a09b863 2026-09-30 — `ci/checks/lib/milestones.mjs` (`readMilestones`, `contents`,
`started` and its ` · #n` marker), `ci/checks/lib/report.mjs` (`escapeControl`, `UNSAFE`),
`ci/checks/lib/manifest.mjs` (`gitEnv`, private: PATH with repo and `node_modules` entries dropped),
`ci/checks/lib/clock.mjs` (`today`, `CHECK_NOW`), `ci/checks/lib/markdown.mjs` (`section`, `plain`),
`process/intake.md` → Issue body (Links, the designation block), `dev/features/roadmap-page.md` (#68's
contract: `appetiteClock`, HTML escaping net-new and private to `ci/roadmap.mjs`), `.gitignore` (`seeded`).

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
3. `gh api graphql` — `state stateReason` for every `Blocked by` issue not already fetched (skipped when
   none).

`gh` missing, signed out, or exiting non-zero: exit 1, naming `gh auth status` and the first line of its
stderr (through `escapeControl`, cut to 200 characters), and write nothing.

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
- **Ready:** status `open`, and every blocker closed (either reason).
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
   `https://github.com/{repo}/issues/{n}`, its title, status, "Blocked by #a (open), #b (done)", its start
   command `/work-ticket {n}` when `open`, and its designation in a closed `<details>`. An unstarted item shows
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

none

## Changes

- 2026-09-30 · ADDED · spec · #156 (steps #157, #158)
- 2026-09-30 · ADDED · `--serve`: a loopback address to click, with its threat model and limitation · #183
