---
prd-ref: D-016
status: draft
---

# F-02 — Roadmap page: project state for people who don't read the repo

## Problem

A project on slipway keeps its state in the repo, and `pnpm status` computes it for agents and the
owner. A non-technical member of the project (a co-founder, a client, a collaborator) has no way to see
it: `STATE.md` is gitignored and agent-voiced, issues are ticket-level, and milestone docs are written
for whoever builds them.

Evidence: the owner reports a non-technical member on a live slipway project who needs this today
(2026-09-24). Today the owner explains the state by hand, which goes stale as soon as it is sent.

**Job:** when someone on the project who does not read code asks "where are we?", I want to send them a
link that is always current, so I can stop writing status updates by hand and they can stop reading
stale ones.

Decided in D-016: a generated static page, rebuilt by CI, opt-in, from an allowlist of milestone fields.

## Contract

Verified against: 880af92 2026-09-24 — every code-state claim below re-checked against `main` on that
date. Evidence rots within days; re-verify before building (L-18).

### Switch

A new row in AGENT.md §Skill Configuration, below `Timezone`:

```
| Roadmap page | `off` — or `public`: CI publishes docs/milestones/ as a page (F-02). Public means anyone with the URL can read it |
```

Read like `Timezone` (`ci/checks/lib/clock.mjs` `zone()`): the cell's first code span, else its first
word. The values:

| value | meaning |
|---|---|
| no row, `off`, or an unfilled `<…>` | off: nothing is rendered or published |
| `public` | render and publish to GitHub Pages |
| anything else | error: exit 1 naming the row and the values it takes. A typo fails loudly and publishes nothing |

AGENT.md is `seeded`, so an existing project gets the row only when `/sync-slipway` offers the seeded
diff, or by hand. No row means off, so a sync never starts publishing anything.

### Renderer — `ci/roadmap.mjs`

```
node ci/roadmap.mjs [root] --out <dir> [--sha <sha>]   write <dir>/index.html, or print why not
node ci/roadmap.mjs [root] --enabled                   print enabled=true|false (for $GITHUB_OUTPUT)
```

Zero-dependency, like everything under `ci/` (D-004). No network and no subprocess: the sha comes in
from `--sha` (the workflow passes `${{ github.sha }}`), and is shown as its first 7 characters. "Today"
comes from `ci/checks/lib/clock.mjs` `today(root)`, so it honours `Timezone`, `CHECK_TODAY` and
`CHECK_NOW`. Same tree, same today, same sha: byte-identical output.

It reads milestones through `ci/checks/lib/milestones.mjs` (`readMilestones`, `parseAppetite`), the lib
`pnpm status`, MS1 and K1 share, so the page and status cannot disagree about which milestone is active.
The day count moves into that lib as `appetiteClock(appetite, today)` →
`{ day, of, end, overrun }`, and `ci/status.mjs` uses it too; S1 proves status did not change.

**The allowlist.** The page shows these fields and nothing else:

| field | from |
|---|---|
| project name | AGENT.md `Product name` row; omitted while it is `<Product>` |
| milestone id, title, status, kind | frontmatter, and the H1 with its `M<n> — ` prefix removed |
| summary | frontmatter `summary` (the line the PRD's milestones table already shows) |
| appetite | frontmatter `appetite`, as dates and, for the active milestone, the clock |
| no-gos | the bullets under `## No-gos`, for active and shaping milestones only |
| build stamp | today, and the short sha |

Never: `## Why`, `## Contents`, `## Rabbit holes`, `## Gate`, `## Kill criteria`, `## Retro`,
`decisions.md`, the PRD, FRAME, risks, open questions, lessons, issues or PRs. Adding a field is a
change to this table and to the sentinel test.

**Layout**, top to bottom:

1. **Now**: the active milestone. Title, summary, "day 5 of 14 · time budget ends 2026-10-08", its
   no-gos under "Not in this one". Overrun and not extended: "Past its time budget, being wrapped up"
   (never a negative or over-100% count). `extended:` set: "Extended", with the dates.
2. **Next**: shaping milestones, in milestone-number order, with summary and no-gos. No dates: a shaping
   appetite is a guess.
3. **Done**: closed milestones, newest appetite end first, with summary and end date.
4. **Stopped**: killed milestones, with summary. Omitted when there are none.
5. Footer: "Updated <today> from <sha7>. A time budget is a limit, not a deadline: when it ends, the
   scope is cut, not the date moved."

Values: a field containing `<…>` (a template placeholder) is omitted; a shaping milestone with no usable
summary shows "Being shaped". A milestone without valid frontmatter or `id` is skipped (MS1 reports it).
No milestones at all: the page says "No milestones yet". Text goes through `plain()` from
`ci/checks/lib/markdown.mjs` and is then HTML-escaped; no markdown is rendered and no HTML passes through.

**Page.** One self-contained `index.html`: inline CSS, no script, no external request (fonts, images,
analytics). `<meta name="robots" content="noindex, nofollow">`. Light and dark by
`prefers-color-scheme`, readable at 360px wide with no horizontal scroll. `lang="en"`.

Off: `--out` writes nothing, prints `roadmap: off (AGENT.md Roadmap page)` and exits 0.

### Workflow — `.github/workflows/roadmap.yml`

```yaml
on:
  push: { branches: [main] }
  schedule: [{ cron: '17 9 * * *' }]   # daily, for the day count
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
```

One job, skipped on a template repository (like `ci.yml`'s verify). Steps: checkout, setup-node 24 (no
install), `node ci/roadmap.mjs --enabled >> "$GITHUB_OUTPUT"`, then, only when enabled: render to
`_site`, `actions/upload-pages-artifact`, `actions/deploy-pages`. No `continue-on-error` (M3).

Once per project, the owner sets Settings → Pages → Source to **GitHub Actions**. Until then the deploy
step fails and says so; the render step has already proved the page builds.

### Ownership

`ci/roadmap.mjs` and the workflow are `managed` (existing `ci/**` and `.github/**` globs). The test and
its fixture roots are `internal`: `scripts/roadmap.test.mjs`, `scripts/fixtures/roadmap/**`. O1 needs no
new glob.

## Seams

A **channel**: the page is a new way project state reaches people.

- **Who pays:** nobody; GitHub Pages on the project's own plan.
- **Who's counted:** nobody; no analytics, by design.
- **Who's told:** whoever the owner gives the URL. Nothing is sent.
- **What's promised:** the page's own footer: a time budget is not a deadline. No marketing surface.

## Threat model

The risk is publishing: `public` puts repo text on the open web, and many projects are private repos.

- **Only the allowlist leaves the repo.** A test plants a sentinel string in every excluded source
  (decisions, PRD, FRAME, each excluded milestone section) and fails if it appears in the output.
- **Off by default, fail-closed.** No row, `off`, a placeholder or an unknown value publishes nothing.
- **No injection.** Every value is escaped; the page has no script, so a milestone title cannot run code
  in a reader's browser.
- **Least privilege.** The workflow has `contents: read`; it can write only to Pages.

Not defended: `noindex` asks search engines not to list the page; it does not stop anyone reading it.
The URL (`<owner>.github.io/<repo>/`) is guessable. Anything in a published field is public.

## Known limitations

- The URL is predictable, and `noindex` is honoured only by well-behaved crawlers. A project-site
  `robots.txt` is ignored (crawlers read it at the domain root), so the meta tag is the only signal.
- GitHub Pages from a private repo needs a paid plan. On a free plan, `public` fails at deploy.
- The day count updates once a day. GitHub delays scheduled runs under load, and disables them after 60
  days without repository activity.
- The page shows the milestone's words. A `summary` or no-go written in jargon reads as jargon; the page
  does not rewrite it.

## Acceptance

```
Given AGENT.md with no Roadmap page row, or `off`
When  node ci/roadmap.mjs <root> --out <dir> runs
Then  it exits 0, prints "roadmap: off (AGENT.md Roadmap page)", and <dir> does not exist afterwards;
      --enabled prints enabled=false
```

```
Given `public`, M0 closed, M1 active 2026-03-09..2026-03-15, M2 shaping, M3 killed, CHECK_TODAY=2026-03-11
When  the renderer runs with --sha 0123456789abcdef
Then  index.html has Now (M1, "day 3 of 7", its no-gos), Next (M2 with no-gos and no dates), Done (M0),
      Stopped (M3), "0123456", the noindex meta, and no <script> element
```

```
Given the fixture above with SENTINEL-<source> planted in decisions.md, docs/PRD.md, FRAME.md and each
      excluded milestone section (Why, Contents, Rabbit holes, Gate, Kill criteria, Retro)
When  the renderer runs
Then  no SENTINEL string appears in index.html
```

```
Given a milestone summary `<script>alert(1)</script> & "q"`
When  the renderer runs
Then  it appears escaped (&lt;script&gt;…&amp;…) and the page still has no <script> element
```

```
Given the active milestone's appetite ended yesterday and it has no extended:
When  the renderer runs
Then  Now reads "Past its time budget, being wrapped up", with no day count
```

```
Given `Roadmap page | pubic`
When  the renderer runs, with --out or --enabled
Then  it exits 1 naming the row and the values off and public, and writes nothing
```

```
Given `public` and no milestone files, or only TEMPLATE.md, or a shaping summary `<…one line…>`
When  the renderer runs
Then  the page says "No milestones yet", or shows that milestone as "Being shaped"
```

```
Given the same tree, CHECK_TODAY and sha
When  the renderer runs twice
Then  both outputs are byte-identical
```

```
Given the S1 fixture roots under ci/fixtures/status
When  pnpm meta runs after status moves to appetiteClock
Then  S1 is green and status output is unchanged for every case
```

End to end: the owner's project with the non-technical reader has the row set to `public`; a push to
`main` publishes the page; it renders at phone and desktop width. Screenshots and URL in the PR.

## Verify

```
node scripts/roadmap.test.mjs     # one case per Acceptance block, fixture roots in scripts/fixtures/roadmap/
pnpm meta                         # S1 (status unchanged), M1 (the test is wired into CI), M3, O1
CHECK_TODAY=2026-03-11 node ci/roadmap.mjs scripts/fixtures/roadmap/full --out /tmp/roadmap --sha 0123456789abcdef
```

Plus the workflow run on the real project: its URL, and the page at 360px and desktop width.

## Build map

Machinery before surface. Each step merges with `pnpm meta` green.

1. **Renderer**: `appetiteClock` in `milestones.mjs` (status switched to it), `ci/roadmap.mjs`, the
   AGENT.md row, `scripts/roadmap.test.mjs` and its fixture roots, wired into `meta`. Publishes nothing.
   ~M.
2. **Publish**: `.github/workflows/roadmap.yml`, the enable steps in `BOOTSTRAP.md` (optional, after
   §1), and the real run on the owner's project. ~S.

## Out of scope

- **A private page** (Cloudflare Pages with Access, a `private` value of the same row). Add it when a
  project's roadmap cannot be public.
- **Rendering per request.** Declined in D-016; reopens only with live GitHub state.
- **Live GitHub state** (open PRs, CI, issues in flight). That is for technical readers; they have GitHub.
- **Extracting `ci/status.mjs` into a pure model.** Planned as a prerequisite in discussion, then dropped:
  it was needed only for a Worker that cannot read the filesystem. The page shares `milestones.mjs` with
  status instead.
- **A plain-language field separate from `summary`.** Use `summary` first; add a field only if readers
  find it too technical.
- **Retros on the page.** They are written for the next milestone's builders. Revisit if readers ask
  what a milestone delivered and `summary` does not answer it.
- **A GitHub Projects board.** Declined in D-016.

## Open questions

- **Which project, and can it host Pages?** The first project is private. Pages from a private repo
  needs GitHub Pro or higher. (Owner: before step 2.) If not, step 2 waits for the `private` value, or
  the project uses a public mirror.

## Changes

After `status: shipped`, behaviour changes are recorded here as deltas instead of rewriting
the Contract, so the doc stays true without losing its history. One line each:

- <date> · ADDED | MODIFIED | REMOVED · what changed · #PR
