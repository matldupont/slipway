# pr-review/features/compute.ts

Deterministic feature extractor for the `pr-review` skill. Resolves PR
identity, optionally sets up a review worktree, extracts the linked GitHub
issue, computes readiness signals, and reads slipway-repo context — emitting
a typed JSON output the skill prompt consumes.

The deterministic work happens in TypeScript so the agent only does the
synthesis steps (brief, parallel subagent dispatch, consolidation,
casual/formal output).

## Why a separate script

The first four steps of PR review — identify the PR, set up a worktree, find
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
- Is unit-tested (110+ tests, see Testing section)

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

# With a worktree (default is no worktree; interactive reviews should
# always pass this)
node pr-review/features/compute.ts 123 --worktree

# Custom worktree parent directory (override $PR_REVIEW_WORKTREE_DIR).
# Must resolve OUTSIDE the repo — a relative path resolves against your cwd,
# so `--worktree-dir .reviews` from the repo root is rejected. Prefer the
# default (the repo's sibling directory) unless you have a reason not to.
node pr-review/features/compute.ts 123 --worktree --worktree-dir ~/work/wt

# Force project path (e.g. when running from outside the target repo)
node pr-review/features/compute.ts 123 --project-path owner/repo

# Skip the linked-issue fetch (still extracts the issue number)
node pr-review/features/compute.ts 123 --skip-ticket

# Tone hint for downstream rendering (default: casual)
node pr-review/features/compute.ts 123 --tone formal

# Write to a file instead of stdout
node pr-review/features/compute.ts 123 --output-path /tmp/features.json

# Diagnostic logging to stderr (includes swallowed gh/git stderr)
node pr-review/features/compute.ts 123 --verbose

# Configuration from the project's AGENT.md (SKILL.md → Configuration).
# `none` turns an input off; it never falls back to the default path.
node pr-review/features/compute.ts 123 \
  --invariants none --milestones docs/milestones --cold-review process/cold-review.md
```

| Flag | Default | `none` |
|------|---------|--------|
| `--invariants <path>` | `docs/domain-invariants.md` | no invariants read |
| `--milestones <dir>` | `docs/milestones` | no milestones read |
| `--cold-review <path>` | `process/cold-review.md` | no checklist; `coldReviewApplies` false |

Paths are relative to the repository root and may not start with `/` or
contain `..`. They are read from the PR's base commit (`slipway.readFrom`),
never its head or a working tree, and a committed symlink is never
followed. The linked issue is read from the repository its reference names
(`owner/repo#N`, or the closing reference's own); `#N` is the PR's repo.

## Environment

| Variable | Purpose |
|----------|---------|
| `GH_HOST` | GitHub host for `gh` (e.g. `github.example.com`). Required for GitHub Enterprise |
| `PR_REVIEW_WORKTREE_DIR` | Default parent directory for worktrees (overridden by `--worktree-dir`) |

`gh` must already be authenticated (`gh auth status`) — the script has no
API-key fallback; it shells out to `gh` for everything, including the linked
GitHub issue.

## Output schema

The script emits a single JSON object on stdout (or to `--output-path`).
The TypeScript schema is in `compute.ts`; `isFeatureOutput()` exported from
there validates the shape.

```jsonc
{
  "schemaVersion": 2,
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
  "worktree": {
    "created": false,
    "path": null,
    "branch": null,
    "reason": "worktree creation not requested (pass --worktree to enable)"
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
  "headReviewed": { "sha": "abc123...", "source": "worktree", "moved": false },
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
  "errorMessage": "optional details for api_error"
}
```

### Hard-halt shape

When the PR is truly unreviewable, the agent should stop and ask the user:

```jsonc
{
  "reason": "empty_diff",          // pr_not_found | empty_diff | no_description_no_ticket
  "detail": "PR has no file changes to review"
}
```

When `reason: "pr_not_found"`, `pr` will be `null` — always check
`hardHalt` before dereferencing `pr`.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success — JSON written to stdout (or `--output-path`) |
| `1` | Bad arguments (unknown flag, invalid `--tone`) |
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
(present vs absent, domain-invariant risk, active-milestone No-gos), and
worktree setup against a real temporary git repo (including reuse via a
re-pushed `pull/N/head` ref, and the dirty-tree bail).
