# Posting comments inline (interactive only)

Optional final step for `pr-review`. Turns selected findings into one
GitHub review with inline diff comments on the PR. The user picks what
gets posted, every time.

## When this step is allowed

Posting is **interactive-only**. Run it only when all of these hold:

- The caller did **not** signal `output_mode: structured` or
  `output_mode: cold-review`
- The skill was **not** invoked by another skill or an automated caller
  (auto-review bots, CI, `tone: formal` contexts)
- A human is present to make the selection

If any of those fail, skip this step entirely and return findings. A
programmatic caller decides what to do with them — it must never reach
GitHub through this skill.

## Selection: the user picks, always

Never post a comment the user did not explicitly select, and never post
before asking. Posting is not pre-approved either: each `gh api` call below
asks the user for permission when it runs. **SKILL.md Step 6 defines the ask** — option labels,
ordering, and the "None" option. Run it from there; this doc only covers
what happens once the user has chosen.

How you render that ask depends on the host:

| Host capability | How to ask |
|-----------------|------------|
| Structured multi-select (e.g. Cursor's `AskQuestion` with `allow_multiple: true`) | One option per postable finding, plus the "none" option |
| Plain chat only | Numbered list, ask the user to reply with the numbers they want posted |

Both are equivalent — the guarantee is the explicit human selection, not
the widget. Either form lists `[BLOCKING]` → `[FIX]` → `[NIT]` and omits
`[FOLLOW-UP]` entirely; those aren't comments on this diff.

Post the selected comments verbatim from the final list, in the tone
already established, with the label tag stripped.

## Mechanics: one review, JSON body, verify the response

Unlike GitLab's discussions API, GitHub's pull-request-reviews API doesn't
quietly downgrade a malformed inline comment to a timeline note — it
either anchors the comment on the diff or rejects the whole request with
`422`. That's a better failure mode, but it means a single bad line number
can fail every comment in the batch if you post them together carelessly,
so build the payload deliberately and check the response.

**1. Get the head commit SHA.** Use `headReviewed.sha` from
`compute.ts`'s output — the review's `commit_id` must be the exact SHA
the diff was read against, not a branch name, and never a fresh
`gh pr view` read: a push since the review would attach the comments to
a commit nobody reviewed.

**2. Post one review via a JSON request body:**

Write the body with your file-writing tool (Claude Code: Write), never a
shell heredoc: it carries the author's file paths and quoted code. Put it
in the review folder, so Step 7 deletes it:

```jsonc
// <reviewDir.path>/review-payload.json
{
  "commit_id": "<head sha>",
  "event": "COMMENT",
  "comments": [
    {
      "path": "src/order.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "comment text with ```snippets``` as needed"
    }
  ]
}
```

```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews -X POST --input <reviewDir.path>/review-payload.json
```

`gh api` takes the repository in the path, and has no `-R`: a `-R` fails
the call. Write the values out: `{owner}/{repo}` is `pr.projectPath` and
`{number}` is `pr.number` from compute.ts's output, used only when they are
made of letters, digits and `. _ / -`, and `<reviewDir.path>` is the folder
compute.ts made. No shell variables, and nothing else on the line: this is
one of the two commands Step 6 asks the user for (SKILL.md → Commands and
tools).

Batching every selected finding into one `comments[]` array and one
`POST` creates a single review with all the inline comments attached
together, which reads far better than N separate reviews trickling in.

**3. Comment shapes:**

- **Single-line comment**: `path`, `line`, `side: "RIGHT"` (the line
  number is in the PR's new/post-image file).
- **Multi-line comment** (a finding that spans a range): add
  `start_line` and `start_side: "RIGHT"` alongside `line`/`side` —
  `start_line` is the first line of the range, `line` is the last.
- **Finding on deleted code** (Gate 1's deletion exception, anchored via
  `hunk_cited` in `diff.removedHunks`): use `side: "LEFT"` with `line`
  set to the pre-image line number. `path` is still the file's current
  path (or its old path if the file itself was deleted).

`event: "COMMENT"` — never `"APPROVE"` or `"REQUEST_CHANGES"`. This skill
hands back findings and lets the user's own judgment stand as the
approval decision; it doesn't render one on their behalf.

## Anchor rules

- `path` / `line` must fall inside the PR's diff — specifically inside
  `diff.changedLines[path]` (or `diff.removedHunks[path]` for a
  `side: "LEFT"` comment). This is exactly Step 4's Gate 1, already
  verified before a finding reached the posting list.
- If a finding points at a file the PR doesn't touch, anchor on the
  nearest changed file/line that motivates the comment and name the real
  location in the body (e.g. "in `_layout.tsx`:").

## Verify every post

Check the response status and inspect the returned review. A `422`
means at least one comment's `path`/`line` fell outside the diff —
report which finding failed rather than retrying the batch blindly, since
resubmitting the same bad line just fails again:

A non-zero exit with "Unprocessable Entity" means that: re-check
`diff.changedLines` for the offending finding's `file:line` before
retrying the same command.

A `2xx` response's body includes `id` (the review id) and each comment's
own id under `/repos/{owner}/{repo}/pulls/{number}/comments` if you need
to confirm placement afterward — but a successful `POST` to `/reviews`
is itself the confirmation; GitHub doesn't accept the request and silently
drop the position the way GitLab's discussions API could.
