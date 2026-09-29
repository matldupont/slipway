# Finding validation

The four gates Step 4 applies to every finding before it can reach the
output. Single source of truth for validation mechanics — SKILL.md
carries the summary table, this file carries the how and the failure
modes each gate exists to stop.

**The premise:** subagents return plausible findings. Plausible is cheap.
What survives review is what you can *anchor* — and the instinct to
validate by opening the file at `HEAD` and reading the cited line
confirms only the thing that was never in doubt. The line exists. It says
what the agent said. Neither fact tells you the PR introduced it, nor
that the author hasn't already fixed exactly what you're flagging.

Validate against the **diff**, not the checkout.

## Gate 1: Anchor

Is `finding.line` inside `diff.changedLines[finding.file]`?

`compute.ts` emits `changedLines` as post-image `[start, end]` ranges per
new path. The check is a lookup:

```js
const anchored = (output.diff.changedLines[f.file] ?? [])
  .some(([start, end]) => f.line >= start && f.line <= end);
```

Fail → the PR didn't touch that line. Relabel `[FOLLOW-UP]` (see SKILL.md
Step 5, including the tracker search it carries) or drop. Do **not** ship
it as `[BLOCKING]`, `[FIX]` or `[NIT]`: all three ask this author to act,
and an author told their PR broke something it never touched discounts
the rest of the review.

Two ways this gate is worth more than it looks:

- Whole categories of plausible-and-true finding live in untouched code.
  Missing error-tracker coverage on an error path, a raw `error.message`
  reaching a toast, an `aria-label` that omits state — all real, none
  caused by the diff in front of you.
- It is the only gate that cannot be satisfied by reading harder. No
  amount of care while reading `HEAD` distinguishes a line the PR added
  from a line it merely sits beside.

### Deleted code is the exception — mind it

A finding about code the PR **removed** has no post-image line and will
fail Gate 1 while being entirely real. Anchor these to
`diff.removedHunks[oldPath]` and cite the range.

Take this gate's exception seriously, because deletion-based findings are
routinely the strongest in a review — a removed guard clause, a dropped
test, a deleted early return. They're invisible to anyone reading `HEAD`,
which means the subagents mostly miss them too, and a mechanical
anchor-in-post-image rule would throw away the few that surface. The
classic shape:

> A guard clause is deleted. The comment above it — which describes the
> guard — is left untouched, and now asserts behaviour the code no longer
> has. The test that covered it is deleted in the same hunk.

Nothing at `HEAD` looks wrong. The diff shows all three at once.

### A comment the diff falsified is the other exception

The PR changes code, and a comment or doc line near it — untouched — now
describes behaviour the code no longer has. The comment's own line fails
Gate 1, but the staleness arrived with this PR and is this PR's to fix.

Anchor to the **changed line that falsified it** and cite the comment's
line as the evidence:

> `status.ts:74` adds a second derivation for the optional rows; the
> module doc at `status.ts:8-10` still claims one predicate per row, so
> the two fields it promises can never disagree now can.

That is the honest anchor rather than a workaround, and the distinction
is worth stating because it feels like one: the finding is about the new
code, and the comment is what proves the new code changed something the
file still advertises. Anchoring to the comment's own line instead would
fail the gate and file a regression this PR caused under `[FOLLOW-UP]`,
punting the author's own mess to a ticket.

The exception is narrow, and the question that bounds it is: **did a
changed line make this wrong?** If the comment was already wrong before
the PR, nothing falsified it, and `[FOLLOW-UP]` is the correct lane.

## Gate 2: Post-image

Read the finding's lines **from the diff hunk**.

`git diff origin/<target>...HEAD -- <file>` (or the worktree equivalent).
Specifically check:

- **Did the author already fix this?** Fire-and-forget rewritten as
  `await` + `try/catch`; a stale comment rewritten; a guard restored. A
  subagent working from a stale premise — or from an unresolved thread
  describing an *earlier* revision of the PR — will report the old state
  confidently.
- **Is a claim-type finding still about the current text?** Findings about
  comments and test names are the most fragile, because the comment the
  thread complained about may be the one the PR rewrote.
- **Does the hunk show something the agent missed?** Removed clauses and
  deleted tests sit right there in the same hunk.

Fail → drop. An unverified finding is worse than a missing one: it
outlives the PR, gets believed by the next author, and shapes the change
built on top of it.

## Gate 3: Snippet

Every identifier in `suggested_snippet` must resolve at the anchor —
declared in the file, imported, in scope, spelled right.

Snippets get pasted verbatim into a diff comment, so a snippet calling a
variable that doesn't exist reads as authoritative and wastes the
author's time proving it wrong. The trap is that Gates 1–2 ask "is the
concern real?" and pass a finding whose *concern* is sound while its fix
references an invented symbol. They're separate questions; ask both.

Fail → strip the snippet, keep the concern. A concern with no snippet is
a fine comment. Never repair a snippet by inventing a different symbol.

If the fix genuinely needs a value that isn't in scope, hoist it and show
the hoist — using only symbols you confirmed:

```ts
const isDeferredSetup =
  surface === StorefrontSurface.Web && !!setup && isSavedForLater(setup);
```

## Gate 4: Label

Re-derive every label from the Step 5 table. Do not inherit.

Each label answers a question about the author's reaction, so derive it
by asking that question rather than by sizing the finding:

| Ask | Label |
|-----|-------|
| Would you withhold approval? | `[BLOCKING]` |
| Would it annoy you to see it merge as-is, though you wouldn't block? | `[FIX]` |
| Would you shrug if they closed it unactioned? | `[NIT]` |
| Is it not about this diff at all? | `[FOLLOW-UP]` |

- **Lowering** a subagent's label: free, no justification needed.
- **Escalating to `[BLOCKING]`**: requires a stated reason in the finding.

The asymmetry is deliberate. Inflation is the common direction, it
happens on impression rather than against the table, and it's invisible
in the output — a `[FIX]` shipped as `[BLOCKING]` looks exactly like a
real one, and a reviewer whose blockers turn out to be negotiable stops
being believed on the ones that aren't. Two specific checks:

- **Consensus is evidence too.** If both subagents that raised it said
  `[FIX]`, escalating needs an argument, not a hunch.
- **The table already places the common cases.** An a11y gap is `[FIX]`
  there. Don't re-litigate it per-finding.

`[BLOCKING]` asserts you'd hold up the merge. If a reload, a retry, or a
second click resolves the user-visible damage, it isn't one.

## On a slipway repo: `process/cold-review.md` folds in here

When `slipway.coldReviewApplies` is true (the repo carries a
`process/cold-review.md` checklist and this diff touches money, auth,
schema, or data deletion), apply that checklist's items alongside these
four gates rather than instead of them — the checklist catches a
different class of miss (a criterion that passes no matter what, a title
that doesn't bound the diff) that these gates don't test for. See
SKILL.md's "slipway integration" section for when this raises the
subagent count.

## Applying the gates

Cheapest order — each gate can eliminate work for the next:

1. **Anchor** every finding first (one lookup each, no file reads).
2. **Post-image** read the surviving ones, grouped by file so one
   `git diff <file>` serves several findings.
3. **Snippet** check whatever still carries a `suggested_snippet`.
4. **Label** relabel the final set together, so the labels are consistent
   relative to each other and not just to the table.

Then continue with Step 4's remaining items (drop what nobody would say,
coverage bar, merge overlap, solo skepticism, budget).

## What to record

Carry the gate results on each finding so the consistency pass and any
programmatic caller can see the provenance (fields in
`references/output-schema.md`):

| Field | Meaning |
|-------|---------|
| `anchored_in_diff` | Gate 1 result. `false` ⇒ the label must be `[FOLLOW-UP]` |
| `hunk_cited` | `file:start-end` backing a deletion-based finding or an "addressed" thread |
| `blocking_rationale` | Required when Gate 4 escalated a finding to `[BLOCKING]` |
| `ticket_search` | Required on `[FOLLOW-UP]` — the terms searched, or that no tracker was reachable |
| `claim_type` | `inward` / `outward` / `none` — which flavour of claim verification applied |
