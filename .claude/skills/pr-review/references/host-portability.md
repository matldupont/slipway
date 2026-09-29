# Host portability

`pr-review` runs from Claude Code, Cursor, Codex, CI, anywhere with a
shell — the workflow doesn't bake in vendor names. Where the skill
mentions a capability, use whatever your host provides.

## Capability map

| Capability | Per-host guidance |
|------------|-------------------|
| **Subagent dispatch** | Use your host's task primitive for parallel subagents (Cursor: `Task` with `subagent_type: code-analyzer`, falling back to `generalPurpose`; Claude Code: `Task` with no `subagent_type`; Codex: equivalent). Foreground, ≤2 in flight — see "Why the dispatch cap is load-bearing" below for how much that matters on your host. |
| **Linked-issue fetch** | `compute.ts` shells out to `gh issue view` directly — no API key, no MCP fallback needed. If `gh` itself is unauthenticated or unreachable, the calling agent should fall back to the host's GitHub MCP integration using `ticketLookupFailure.extractedNumber`. |
| **Moving the agent's root** | **Don't** — see below. Pass `output.worktree.path` to subagents and have them `cd` there. |
| **Asking the user which comments to post** | Structured multi-select if the host has one (Cursor: `AskQuestion` with `allow_multiple: true`); otherwise a numbered list the user replies to. See `references/posting.md`. |

## Does your host detach? (Step 3's concurrency cap)

Step 3 asks for foreground dispatch everywhere, and a concurrency cap of
2 only where the host can detach. One question decides it: **can a
dispatched batch outlive the turn that started it?**

**Cursor — yes, and the cap is load-bearing.** `run_in_background: true`
ends the agent's turn, so the review resumes only if the host's resume
loop brings it back. Across ten runs of this skill, every review that
fanned out 3+ that way died with `Agent turn stopped after repeated
resume attempts made no progress`; the only two that reached Step 5 had
dispatched 0 and 2. Several died holding a finished, culled finding list.

**Blocking primitives — no cap needed.** If your host's task tool returns
into the same turn, dispatch a layer's lenses together and skip the cap.
Confirm that rather than assuming it: guessing wrong costs you a review
that does all the work and then vanishes.

## Don't redirect the agent's root at the worktree

It reads like the obvious move, and it fails. The `--worktree` branch
(`pr-<number>`) is deliberately local-only — fetched from GitHub's
`pull/<number>/head` ref rather than checked out against the author's
own remote branch, so the review can never push to or interfere with
their work (and works identically for a fork PR, which has no
remote-tracking ref on `origin` at all). But hosts that redirect the
agent's working root generally re-resolve the destination's branch
against the remote first (Cursor's `move_agent_to_root` runs `git fetch
origin <current-branch>`), and a branch that exists nowhere on origin as
a normal ref makes that fail every time.

It is not recoverable by retrying with different arguments — the failure
is structural, not a call-signature problem. Stay in the original
workspace and drive the worktree by absolute path instead:

- Shell: set the working directory to `output.worktree.path`, or use
  `git -C "<worktree>" …`
- File reads and searches: absolute paths under the worktree
- Subagents: pass the path and have them `cd` first (their shells don't
  inherit the parent's)

The workspace root staying on the user's main checkout is expected. What
matters is that no PR code is ever read from it.

## Required environment

### `gh` authentication

`compute.ts` and every subagent shell out to `gh` directly — there's no
API-key fallback. Before invoking the skill, confirm:

```bash
gh auth status
```

If that fails, the agent should stop and tell the user to run
`gh auth login` rather than attempting the review — every downstream
call (PR view, diff, checks, issue view, the reviewThreads GraphQL query)
depends on it, and a half-authenticated run produces confusing partial
output instead of a clean failure.

### GitHub Enterprise

Set `GH_HOST` before invoking the skill so `gh` targets the right server:

```bash
export GH_HOST=github.example.com
gh auth status   # confirms you're authenticated against GH_HOST, not github.com
```

Unlike GitLab's self-hosted story, `gh` reads `GH_HOST` itself and there's
no separate "REST endpoint vs. login host" mismatch to derive — the one
env var is the whole story.

## Optional environment

| Variable | Effect |
|----------|--------|
| `PR_REVIEW_WORKTREE_DIR` | Default parent directory for `--worktree` (overridden by `--worktree-dir`). |

## Tone in different hosts

For interactive use, `--tone casual` is the default and matches the
casual register the workflow was designed for. For automated callers
(auto-review bots, CI, formal-context teams), pass `--tone formal` —
Step 5's human output template flips to a buttoned-up register.

Structured output mode (`output_mode: structured`) ignores tone for the
JSON payload itself; `output.tone` is included as metadata so the
calling skill knows what register the parent expected.
