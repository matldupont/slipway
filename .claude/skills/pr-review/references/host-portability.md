# Host portability

`pr-review` runs from Claude Code, Cursor, Codex, CI, anywhere with a
shell — the workflow doesn't bake in vendor names. Where the skill
mentions a capability, use whatever your host provides.

## Capability map

| Capability | Per-host guidance |
|------------|-------------------|
| **Subagent dispatch** | Use your host's task primitive for parallel subagents (Cursor: `Task` with `subagent_type: code-analyzer`, falling back to `generalPurpose`; Claude Code: `Task` with no `subagent_type`; Codex: equivalent). Foreground, ≤2 in flight — see "Why the dispatch cap is load-bearing" below for how much that matters on your host. |
| **Linked-issue fetch** | `compute.ts` shells out to `gh issue view` directly — no API key, no MCP fallback needed. If `gh` itself is unauthenticated or unreachable, the calling agent should fall back to the host's GitHub MCP integration using `ticketLookupFailure.extractedNumber`. |
| **Reading the PR** | Nothing to check out and no root to move: compute.ts writes a review folder, read with the host's file-read tool (see below). |
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

## The PR is never on disk

The review reads the pull request without checking it out: compute.ts
fetches its head and base commits into the clone the skill runs in, as
objects, and writes a review folder in the system temp directory — the
diff, each changed file's head and base text under numbered names, and an
index. The review reads that folder with the host's file-read tool
(Claude Code: Read), by absolute path, and runs no shell command on it:
it is outside the workspace, so Claude Code asks the user for each one. A
host with a search tool (Grep) may search it. Claude Code builds without
one search the workspace, never the folder, with the one `rg` form in
SKILL.md → Commands and tools. Stay in the original workspace; don't move the agent's root to
the folder. The workspace root holds the user's own branch, so a PR file
is never read from it. `compute.ts --cleanup <reviewDir.path>` deletes the
folder at the end.

## Required environment

### `gh` authentication

`compute.ts` and the review's own setup and posting steps shell out to `gh`
directly — there's no API-key fallback; subagents run no `gh` command. Before invoking the skill, confirm, in your own
terminal (the review does not run it, since it would ask you once more):

```bash
gh auth status
```

If that fails, the agent should stop and tell the user to run
`gh auth login` rather than attempting the review — every downstream
call (PR view, diff, checks, issue view, the reviewThreads GraphQL query)
depends on it, and a half-authenticated run produces confusing partial
output instead of a clean failure.

### `git` safety for reviewers

The review never writes a PR's files to disk, so a folder the PR commits
laid out as a bare repository, with a command in its config, is never a
place the review runs git. Still set
`git config --global safe.bareRepository explicit` on every machine that
reviews: it covers a checkout of someone else's branch you made yourself,
including one the review is started from by mistake.

### GitHub Enterprise

Set `GH_HOST` before invoking the skill so `gh` targets the right server:

```bash
export GH_HOST=github.example.com
gh auth status   # confirms you're authenticated against GH_HOST, not github.com
```

Unlike GitLab's self-hosted story, `gh` reads `GH_HOST` itself and there's
no separate "REST endpoint vs. login host" mismatch to derive — the one
env var is the whole story.

## Tone in different hosts

For interactive use, `--tone casual` is the default and matches the
casual register the workflow was designed for. For automated callers
(auto-review bots, CI, formal-context teams), pass `--tone formal` —
Step 5's human output template flips to a buttoned-up register.

Structured output mode (`output_mode: structured`) ignores tone for the
JSON payload itself; `output.tone` is included as metadata so the
calling skill knows what register the parent expected.
