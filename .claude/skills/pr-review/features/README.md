# pr-review/features/compute.ts

Deterministic feature extractor for the `pr-review` skill. Resolves PR
identity, fetches the PR's head and base commits into this clone as objects,
extracts the linked GitHub issue, computes readiness signals, and reads
slipway-repo context — emitting a typed JSON output the skill prompt
consumes.

It never checks the PR out. It is the one place that reads the PR's files:
it writes a **review folder** (`reviewDir`) in the system temp directory,
fresh per run and owner-only (0700) — `diff.patch` (the pinned
`git diff <base>...<head>`), `files/<n>.head` and `files/<n>.base` (each
changed file's text at the head and at the merge-base, under numbered names), and `index.json` mapping each
number to the author's file name as data. Reviewers read it with their
Read and Grep tools; `--cleanup <reviewDir.path>` deletes it.

No name the author chose reaches a command: git gets only commit and
object ids, as argv arrays with no shell, and returns paths NUL-separated
(`-z`). A link is written as its target's text, never as a link, and no
file is written executable. Every git call goes through `execGit`, which
runs only the commands in `GIT_ALLOWED` (reads, fetches and the reviewer's
own-checkout comparison) with hooks off; every gh call goes through
`execGh` and `GH_ALLOWED` (reads only). A test fails if any other path to
git or gh appears.

The deterministic work happens in TypeScript so the agent only does the
synthesis steps (brief, parallel subagent dispatch, consolidation,
casual/formal output).

## Why a separate script

The first four steps of PR review — identify the PR, fetch its commits, find
the linked issue, evaluate readiness — are mechanical. Running them inside
the prompt burns LLM tokens, makes silent bugs more likely (e.g. a
zero-match query returning null and reading as "no issue" instead of "lookup
failed"), and ties the skill to a specific host's MCP ecosystem. The script:

- Has explicit error paths (PR resolution failure, missing project path,
  issue lookup failure)
- Has a typed schema with an `isFeatureOutput` guard for the prompt to
  validate
- Runs the same way in any host (Claude Code, Cursor, Codex, CI) that has
  `gh` and `git` on PATH
- Is unit-tested (120+ tests, see Testing section)

## Runtime

Zero-dependency TypeScript, Node stdlib only. No install step on a current
Node — 22.18+ strips types natively:

```bash
node /path/to/pr-review/features/compute.ts [<pr-url-or-number-or-branch>] [options]
```

On older runtimes, or if you prefer them:

```bash
bun /path/to/pr-review/features/compute.ts [<pr-url-or-number-or-branch>] [options]
npx tsx /path/to/pr-review/features/compute.ts [<pr-url-or-number-or-branch>] [options]
```

Requires `gh` (authenticated — `gh auth status`) and `git` on PATH, plus
Node 18+ or any modern bun.

## Usage

```bash
# Most common: pass the PR URL, let the script handle everything
node pr-review/features/compute.ts https://github.com/owner/repo/pull/123

# By bare number (project inferred from origin remote, or pass --project-path)
node pr-review/features/compute.ts 123

# Omit the ref entirely to resolve the PR for the current branch
node pr-review/features/compute.ts

# Force project path (e.g. when running from outside the target repo)
node pr-review/features/compute.ts 123 --project-path owner/repo

# Skip the linked-issue fetch (still extracts the issue number)
node pr-review/features/compute.ts 123 --skip-ticket

# Tone hint for downstream rendering (default: casual)
node pr-review/features/compute.ts 123 --tone formal

# Diagnostic logging to stderr (includes swallowed gh/git stderr)
node pr-review/features/compute.ts 123 --verbose

# Configuration from the project's AGENT.md (SKILL.md → Configuration).
# `none` turns an input off; it never falls back to the default path.
node pr-review/features/compute.ts 123 --issue-repo owner/issues \
  --invariants none --milestones docs/milestones --cold-review process/cold-review.md
```

| Flag | Default | `none` |
|------|---------|--------|
| `--issue-repo <owner/repo>` | none: only the PR's own repo | — |
| `--invariants <path>` | `docs/domain-invariants.md` | no invariants read |
| `--milestones <dir>` | `docs/milestones` | no milestones read |
| `--cold-review <path>` | `process/cold-review.md` | no checklist; `coldReviewApplies` false |

Paths are relative to the repository root and may not start with `/` or
contain `..`. They are read from the PR's base commit (GitHub's `baseRefOid`, fetched
by sha; `slipway.readFrom`), never its head, a working tree or a branch
looked up by name, and a committed symlink is never followed. When that
commit cannot be read the output carries `hardHalt: base_unreadable`.
The linked issue is loaded only from the PR's own repo or `--issue-repo`;
a reference to any other gives `ticketLookupFailure.reason:
"repo_not_allowed"`. Every git call runs with `core.hooksPath=/dev/null`.

The PR's head is fetched by sha (`headRefOid`) as objects, never checked
out; when it cannot be fetched the output carries `hardHalt:
head_unreadable`. Asking for a checkout (`--worktree`, `--worktree-dir`)
fails with a message naming the replacement.

```bash
# At the end of the review: delete the folder. Refuses anything that is not
# a pr-review-… folder in the temp directory holding its index.
node pr-review/features/compute.ts --cleanup /path/from/reviewDir.path
```

### Before starting Claude Code: `--check-checkout`

A checkout's settings hooks run when Claude Code starts in it, before any
skill, so a check inside the review comes too late for the checkout it runs
in. Before starting Claude Code in a checkout that may hold someone else's
PR, run the pre-launch check **from outside it**, with the compute.ts of
your own clean checkout of the base branch:

```bash
node /path/to/your-clean-checkout/.claude/skills/pr-review/features/compute.ts --check-checkout /path/to/that-checkout
node /path/to/your-clean-checkout/.claude/skills/pr-review/features/compute.ts --check-checkout /path/to/that-checkout --base origin/release
```

It exits 0 only when the checkout is the base's with nothing changed or
added. The base is `--base`, default `origin/HEAD`, read in **your** clean
checkout, where the command runs, never in the one it checks: a clone of the
author's fork has the author's commits under `origin/`. A full commit id is
taken as is, and the checked checkout must hold it (fetch the base repository
into it first). Nothing changed or added means: no tracked file
differs, committed or not, no submodule moved or changed (whatever
`.gitmodules` says to ignore), and no untracked file is left unignored. The
whole tree, not a list of files: Claude Code loads `.claude/`, `CLAUDE.md`
and its imports and `.mcp.json`, and those run hook scripts, `ci/`,
`package.json` and the tests, through symlinks and submodules. That also
covers a PR's `.CLAUDE/settings.local.json`, which a case-insensitive disk
writes into `.claude/`. A git command that fails, an unknown base, or a
folder that is not a checkout is exit 1. It prints each differing path
escaped, and runs git with hooks off, as every call here does. The review
makes the same comparison with the PR's base commit (`hardHalt:
running_in_pr_checkout`), so review from a clean checkout, without your own
uncommitted work.

Files the checkout's ignore rules hide are not compared, since your own
local settings and `node_modules/` live there. A PR can leave its own there
too: it force-commits files, and a `git reset <base>` keeps them on disk,
hidden by the base's ignore rules or by a `.gitignore` of the PR's own, or
named as a case-insensitive disk folds them. So the check also reads git's
record of where HEAD has been (`logs/HEAD` in the checkout's git folder),
which a PR cannot write: when HEAD has ever been on a commit outside the
base's history, the checkout is refused, however its files hide. It is read
from the file itself, since git's own reflog commands fall back to HEAD's
commit when the record is missing. A record that is missing, empty or
unreadable, or switched off (`core.logAllRefUpdates=false`), refuses too.

That refuses a checkout where you have checked out your own branches as
well. Review from a fresh worktree off the base; every refusal prints the
one command that makes it:

```bash
git -C '/path/to/checkout' worktree add --detach '/path/to/checkout-review-1a2b3c4d' <base sha>
```

Still not seen: a file a PR's code wrote into an ignored path of a checkout
that never left the base (an install script you ran there), and a record
git has already pruned (`gc.reflogExpireUnreachable`, 30 days by default).
Run nothing from a PR in a checkout you review from.

## Environment

| Variable | Purpose |
|----------|---------|
| `GH_HOST` | GitHub host for `gh` (e.g. `github.example.com`). Required for GitHub Enterprise |

`gh` must already be authenticated (`gh auth status`) — the script has no
API-key fallback; it shells out to `gh` for everything, including the linked
GitHub issue.

## Output schema

The script emits a single JSON object on stdout. It writes no file but its review folder (it also fetches the PR's commits into the clone's object store, which runs nothing): `--output-path` is refused, since the script runs pre-approved.
The TypeScript schema is in `compute.ts`; `isFeatureOutput()` exported from
there validates the shape.

```jsonc
{
  "schemaVersion": 3,
  "tone": "casual",                 // "casual" | "formal" (echoes the --tone flag)
  "reviewMode": "peer",             // self | peer — author vs authenticated user
  "pr": {                            // null only when hardHalt.reason === "pr_not_found"
    "number": 123,
    "url": "https://github.com/owner/repo/pull/123",
    "title": "feat: add foo",
    "description": "...",
    "sourceBranch": "feature/foo",   // headRefName
    "targetBranch": "main",          // baseRefName
    "headSha": "abc123...",
    "author": { "username": "alice" },
    "projectPath": "owner/repo",
    "mergeStateStatus": "CLEAN",     // GitHub's mergeStateStatus
    "mergeable": "MERGEABLE",        // GitHub's mergeable
    "draft": false
  },
  "ticket": {
    "number": 42,
    "identifier": "#42",
    "url": "https://github.com/owner/repo/issues/42",
    "title": "Add foo",
    "description": "...",
    "state": "OPEN",
    "parentIdentifier": null,
    "source": "closingIssuesReferences",   // closingIssuesReferences | body
    "acceptance": "- p95 < 400ms\n- ...",  // the issue body's "Acceptance" section, if present
    "contract": null,                       // an embedded feature-doc "Contract" section, if present
    "verify": null                          // an embedded feature-doc "Verify" section, if present
  },
  "ticketLookupFailure": null,   // populated when ticket is null; see below
  "diff": {
    "filesChanged": 12,
    "linesAdded": 35,
    "linesRemoved": 635,
    "changedLines": { "src/order.ts": [[12, 14], [40, 42]] },   // post-image ranges — Step 4 anchor gate
    "removedHunks": { "src/order.test.ts": [[88, 120]] }        // pre-image ranges — for deletion-based findings
  },
  "diffFetchFailed": false,   // true when gh failed fetching the diff; numbers above are then zeroed and unreliable
  "checks": {
    "failing": [],
    "pending": [],
    "passing": ["build (ubuntu-latest)"]   // required checks only, via `gh pr checks --required`
  },
  "readiness": {
    "passed": false,
    "blockers": [
      {
        "check": "mergeable",   // mergeable | checks | draft | description | unresolved_threads
        "severity": "HIGH",
        "detail": "..."
      }
    ]
  },
  "unresolvedThreads": [
    {
      "id": "thread-node-id",
      "author": "cody",
      "body": "full comment body",     // judge "addressed?" from this
      "bodyExcerpt": "first 200 chars of the comment",   // brief/log lines only
      "filePath": "path/to/file.ts",   // null for general threads
      "createdAt": "2026-04-30T18:00:00Z"
    }
  ],
  "slipway": {
    "present": false,             // true when the repo carries slipway markers
    "readFrom": null,              // the base commit the markers were read from; null: base not fetched
    "lane": null,                  // "trivial" | "bounded" | "feature", from a `Lane:` line in the PR body
    "verificationSection": null,   // the PR body's "## Verification" section, if present
    "coldReviewApplies": false,    // the --cold-review checklist exists AND diff touches a money/auth/schema/deletion path
    "coldReviewChecklistPath": null,
    "domainInvariants": [],        // parsed from the --invariants doc
    "invariantsAtRisk": [],        // invariant IDs whose enforcing test path was touched by a removed hunk
    "activeMilestones": []         // --milestones/*.md with status: active, plus their No-gos bullets
  },
  "headReviewed": { "sha": "abc123...", "moved": false },   // moved: GitHub reported another head after the diff was read
  "reviewDir": {                   // null when the review halts
    "path": "/tmp/pr-review-AbC123",
    "index": "/tmp/pr-review-AbC123/index.json",
    "diff": "/tmp/pr-review-AbC123/diff.patch",
    "files": [
      { "n": 1, "path": "src/order.ts", "status": "M",   // path: the author's text, data only
        "head": "files/1.head", "base": "files/1.base", "headMode": "100644", "baseMode": "100644",
        "symlink": false, "binary": false, "tooLarge": false }
    ]
  },
  "hardHalt": null   // populated only when truly unreviewable
}
```

### Ticket lookup failure shape

When `ticket` is `null`, `ticketLookupFailure` is populated:

```jsonc
{
  "extractedNumber": 42,          // null when no issue reference was findable
  "source": "body",                // null when no issue reference was findable
  "reason": "issue_not_found",
  // | "no_id_found"        - no closingIssuesReferences and no Closes/Fixes/Part of #N in the body
  // | "skipped"             - --skip-ticket passed
  // | "issue_not_found"     - gh reported the issue doesn't exist
  // | "api_error"           - gh returned an error fetching the issue
  // | "repo_not_allowed"    - a repo other than the PR's or --issue-repo; never loaded
  "errorMessage": "optional details for api_error"
}
```

### Hard-halt shape

When the PR is truly unreviewable, the agent should stop and ask the user:

```jsonc
{
  "reason": "empty_diff",          // pr_not_found | empty_diff | no_description_no_ticket | base_unreadable | head_unreadable | running_in_pr_checkout
  "detail": "PR has no file changes to review"
}
```

When `reason: "pr_not_found"`, `pr` will be `null` — always check
`hardHalt` before dereferencing `pr`.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — JSON written to stdout; with `--check-checkout`, the checkout's loaded files are the base's |
| `1` | Bad arguments (unknown flag, invalid `--tone`); with `--check-checkout`, a checkout whose loaded files are not the base's, or a comparison that could not run |
| `2` | Compute failure (`gh` error, project path unresolvable, PR not found) |

## Testing

```bash
node --test compute.test.ts
# or
npx tsx --test compute.test.ts
bun test compute.test.ts
```

Tests cover CLI parsing (incl. `--tone` and current-branch resolution when
no positional is given), URL/number extraction, remote-URL parsing for all
three Git URL shapes, linked-issue extraction from both
`closingIssuesReferences` and body keywords (`Closes`/`Fixes`/`Part of #N`),
markdown-section extraction (issue-form `###` and feature-doc `##`
headings), unresolved-review-thread filtering, required-check bucketing
(failing/pending/passing), readiness logic across each blocker check, the
`GhNotFoundError` class, hard-halt detection that distinguishes "gh fetch
failed" from "PR is genuinely empty", unified-diff parsing including a
deleted-lines-only diff and a pure rename, slipway-context detection
(present vs absent, domain-invariant risk, active-milestone No-gos), and,
against a real temporary git repo, fetching a head that exists only under
`pull/N/head` without writing a file to the working tree, hooks staying
off, `runGit` refusing every command that writes a working tree, and the
checkout comparison (each loaded file and start-up hook script changed in
turn, a differently cased `.claude/` folder, a symlink's target, a
submodule, a checkout reset to the base after holding the PR, HEAD's record
missing, empty or switched off, a failing git command, and
`--check-checkout`'s exit codes, including pasting the worktree command it
prints). A
source scan fails if compute.ts reaches git other than through `execGit`,
or names a git command outside `GIT_ALLOWED`.
