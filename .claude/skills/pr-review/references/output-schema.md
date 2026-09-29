# Output schema reference

The skill's structured output extends `FeatureOutput` (from
`features/compute.ts`) with `findings[]` and `verdict`. Single source of
truth — no parallel schema in the prose.

## The unified shape

```jsonc
{
  // -- everything below this line is `FeatureOutput` verbatim from compute.ts --
  "schemaVersion": 2,
  "reviewMode": "peer",                      // self | peer — author vs authenticated user; "peer" on any doubt
  "tone": "casual",                         // "casual" | "formal"
  "pr": {                                    // null only when hardHalt.reason === "pr_not_found"
    "number": 123,
    "url": "https://github.com/owner/repo/pull/123",
    "title": "feat: add foo",
    "description": "...",
    "sourceBranch": "feature/foo",          // camelCase; GitHub's headRefName
    "targetBranch": "main",                 // camelCase; GitHub's baseRefName
    "headSha": "abc123...",
    "author": { "username": "alice" },
    "projectPath": "owner/repo",
    "mergeStateStatus": "CLEAN",
    "mergeable": "MERGEABLE",
    "draft": false
  },
  "worktree": {
    "created": false,
    "path": null,
    "branch": null,
    "headSha": null,                          // the commit checked out, when created
    "reason": "..."
  },
  "ticket": {                                // null when not resolved
    "number": 42,
    "identifier": "#42",
    "url": "https://github.com/owner/repo/issues/42",
    "title": "Add foo",
    "description": "...",
    "state": "OPEN",
    "parentIdentifier": null,
    "source": "closingIssuesReferences",     // closingIssuesReferences | body
    "acceptance": "- p95 < 400ms\n- ...",    // the issue body's "Acceptance" section
    "contract": null,                         // an embedded feature-doc "Contract" section, if present
    "verify": null                            // an embedded feature-doc "Verify" section, if present
  },
  "ticketLookupFailure": null,               // shape below
  "diff": {
    "filesChanged": 12,
    "linesAdded": 35,
    "linesRemoved": 635,
    // Post-image `[start, end]` ranges the PR added/modified, keyed by new path.
    // Step 4's anchor gate: a finding outside these is FOLLOW-UP.
    "changedLines": { "src/order.ts": [[12, 14], [40, 42]] },
    // Pre-image ranges the PR deleted, keyed by old path. Findings about removed
    // code have no post-image line and cite these instead.
    "removedHunks": { "src/order.test.ts": [[88, 120]] }
  },
  "diffFetchFailed": false,                  // true when gh failed; `diff` numbers are zeroed and untrustworthy
  "checks": {
    "failing": [],
    "pending": [],
    "passing": ["build (ubuntu-latest)"]     // required checks only, via `gh pr checks --required`
  },
  "readiness": {
    "passed": false,
    "blockers": [
      {
        "check": "mergeable",
        "severity": "HIGH",
        "detail": "..."
      }
    ]
  },
  "unresolvedThreads": [
    {
      "id": "thread-node-id",
      "author": "cody",
      "body": "full comment body",            // judge "addressed?" from THIS
      "bodyExcerpt": "first 200 chars",        // brief/log lines only
      "filePath": "path/to/file.ts",           // null for general threads
      "createdAt": "2026-04-30T18:00:00Z"
    }
  ],
  "slipway": {
    "present": false,
    "readFrom": null,                         // base commit the markers were read from, never the PR's head
    "lane": null,                             // trivial | bounded | feature — from a `Lane:` line in the PR body
    "verificationSection": null,               // the PR body's "## Verification" section
    "coldReviewApplies": false,
    "coldReviewChecklistPath": null,
    "domainInvariants": [],
    "invariantsAtRisk": [],
    "activeMilestones": []
  },
  "headReviewed": {                          // null only when pr is null
    "sha": "abc123...",                      // the commit this review reads; every output names it
    "source": "worktree",                    // worktree | pr
    "moved": false                           // true: PR pushed to during setup; also a head_moved readiness blocker
  },
  "hardHalt": null,                          // shape below

  // -- skill-added fields (Step 5 output) --
  "findings": [
    {
      "label": "BLOCKING",                   // BLOCKING | FIX | NIT | FOLLOW-UP
      "file": "src/order.ts",
      "line": 42,
      "concern": "branch doesn't guard against nil user when flag is off",
      "suggested_snippet": "if (!user?.enabledFor(\"thing\")) return;",
      "language": "typescript",
      "lens": "correctness",                 // correctness | testing-a11y | security-observability | readiness
      "agreement": 2,                        // # of subagents that flagged this
      "actionable": true,                    // suggested_snippet is a complete drop-in fix

      // -- Step 4 gate results (references/finding-validation.md) --
      "anchored_in_diff": true,              // Gate 1; false ⇒ label must be FOLLOW-UP
      "hunk_cited": null,                    // "file:start-end" — required for deletion-based findings
      "blocking_rationale": null,            // required when Gate 4 escalated a finding to BLOCKING
      "ticket_search": null,                 // required on FOLLOW-UP: terms searched, or that no tracker was reachable
      "claim_type": "none"                   // inward | outward | none
    }
  ],
  "verdict": "real blocker — finding f1 must be addressed before merge"
}
```

## Common naming gotchas

- **`pr.sourceBranch` / `pr.targetBranch`** are camelCase. GitHub calls
  them `headRefName` / `baseRefName`; `compute.ts` renames them for
  continuity with the rest of this skill.
- **`ticket.identifier` is the `#42` form.** `ticket.number` is the bare
  integer — use it when you need to pass a number to `gh`.
- **`pr` can be `null`** — only when `hardHalt.reason === "pr_not_found"`.
  Always check `hardHalt` before dereferencing `pr`.
- **`checks` only carries required checks.** `gh pr checks --required`
  already resolves which checks are actually required via branch
  protection — non-required checks (a purely informational workflow, a
  third-party bot) are dropped, not just deprioritized.

## `ticketLookupFailure` shape

Populated when `ticket` is `null`:

```jsonc
{
  "extractedNumber": 42,           // null when no issue reference was findable
  "source": "body",                 // null when no issue reference was findable
  "reason": "issue_not_found",
  //   "no_id_found"          - no closingIssuesReferences and no Closes/Fixes/Part of #N in the body
  // | "skipped"               - --skip-ticket passed
  // | "issue_not_found"       - gh reported the issue doesn't exist
  // | "api_error"             - gh returned an error fetching the issue
  "errorMessage": "optional details for api_error"
}
```

## `hardHalt` shape

Populated only when the PR is truly unreviewable:

```jsonc
{
  "reason": "empty_diff",
  //   "pr_not_found"             - gh reported the PR doesn't exist (pr is null)
  // | "empty_diff"               - PR has zero file changes
  // | "no_description_no_ticket" - empty description AND no linked issue
  "detail": "PR has no file changes to review"
}
```

## Readiness signals → findings mapping

When emitting structured output:

- Each entry in `readiness.blockers` becomes a `findings[]` entry with
  `lens: "readiness"` and `label: "BLOCKING"`. The blocker's own
  `severity` field is `compute.ts` vocabulary and doesn't carry over —
  these are merge blockers by definition, which is the whole reason the
  script extracts them.
- Each entry in `unresolvedThreads` becomes a `findings[]` `BLOCKING`
  entry with `lens: "readiness"`, `file: thread.filePath`, `concern:
  thread.body` — the **full** body, not `bodyExcerpt`. The excerpt cuts
  at 200 chars and mid-sentence, and a truncated `concern` is how a
  thread gets judged (and re-raised) on a fragment.
- A thread may only be reported as addressed with `hunk_cited` set to the
  hunk that addresses it.
- The original `readiness` and `unresolvedThreads` blocks remain in the
  output so callers can choose to gate on them separately.

## `output_mode: cold-review`

A third rendering mode, alongside `human` and `structured` — see
SKILL.md Step 5. Signaled the same way as `output_mode: structured`: a
literal `output_mode: cold-review` line in the caller's prompt. Emits a
`## Cold review` section instead of (or alongside) the normal comment
list: reviewer, `headReviewed.sha`, findings as `file:line` with label, and a
one-line verdict — the shape `process/cold-review.md` asks for when a
slipway repo is present. Falls back to the normal `human` template when
`slipway.present` is false, since there's no cold-review convention to
match.

## Validation

Import the `isFeatureOutput` type guard from `features/compute.ts` to
validate the FeatureOutput portion of the schema. The skill-added
`findings[]` and `verdict` fields are validated by the caller (no shared
type guard at this time).
