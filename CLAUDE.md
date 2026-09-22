# Agent instructions

Stack: TypeScript · React (Vite) · Cloudflare — slipway's defaults until decisions.md D-005–D-008 are made; then
this line states the decided stack. Tooling: Node 24 + pnpm. Skill configuration lives in `AGENT.md`.

## Where we are

The SessionStart hook injects `pnpm status` output. Read its **Next** line before anything else; without
the hook, run `pnpm status` first. It is computed from the repo — trust it over ticket bodies and older docs.

## Gates

- `pnpm verify` is the gate. CI, agents and humans run the same command; work is not done until it is green.
- `pnpm meta` checks the checks. A new check needs a known-bad fixture (M6) and a CI invocation (M1).
- `main` is the deploy branch. Work on a branch and land through a PR whose `## Verification` names what
  was run, and what was not.
- Never add `continue-on-error` without an entry in `ci/exceptions.yaml` (M3).
- Never weaken a gate to pass it. Lint, type and test configs, workflows and `ci/**` are ask-level edits.

## Planning flow

The slipway path (`SLIPWAY.md`): `docs/product/FRAME.md` → risk test → `docs/PRD.md`, week-1 decisions and milestones
(`/kickoff`) → fresh-context adversarial review in `docs/reviews/` → M1 walking skeleton → build loop, one
milestone at a time → `/close-milestone`.

- **One active milestone.** Work belongs to it or waits. Anything outside its Contents goes to its no-gos, a
  later milestone, or a declined lesson — not into the current diff.
- When a milestone's appetite ends, stop and run `/close-milestone`; extending needs a decision (MS1).
- Execution issues **embed** the feature doc's Contract and `Verify` block; they do not link to it.
- Before building on a code-state claim in an issue or doc, re-verify it against `main` and record
  `Verified against: <sha> <date>` (L-18).
- Record decisions in `decisions.md` when they are made, not afterwards.
- Before calling work done on money, auth, schema or data-deletion paths, run `process/cold-review.md` from
  a fresh context, refuting by default.
- Choose model and effort with `process/designation.md`.

## Lanes

Size the process to the change, and state the lane in the PR's `## What`. When unsure, take the bigger lane.

| Lane | When | Needs |
|---|---|---|
| trivial | one sentence describes it, no new behaviour (typo, rename, dependency bump) | branch + PR with `## Verification`; links `none: trivial` |
| bounded | one session, one coherent unit | an issue from the form (acceptance + seams), plan inline in the issue |
| feature | several sessions, or a new concept, surface or data shape | a feature doc with Contract and `Verify`, then issues that embed it (`/log-feature`, `/work-ticket`) |

Never call work done without fresh output from the commands that prove it. The Stop hook runs
`pnpm verify:fast` and will not let a red turn end.

## Working rules

Each rule below is a lesson in `process/lessons/`, which records where it fires.

- Before writing a new helper, component, hook or type, search for an existing one by behaviour and follow
  `docs/conventions.md`; cite what you found, or that you searched and found nothing, in the PR.
- Search open PRs and issues for the same files before filing or starting work (L-19).
- A follow-up question asks for an explanation, not a change. Separate hard constraints from preferences;
  when something does change, say so (L-39).
- Never rebase- or squash-merge a PR that others are stacked on; merge it with a merge commit, and read
  `git cherry` before force-pushing a child (L-21).

## Agents

- State the absolute working path in every spawned-agent prompt, twice. After the agent reports, run
  `git status` in that tree (L-26).
- Never `cd` into another checkout, even to read; use `git -C <path>` (L-27).
- Run anything a shell command settles inline. Keep agents for judgment, and guard every agent result
  before using it (L-30).
- Before resuming a workflow, confirm it resumes in the same transcript directory; otherwise salvage from
  its journal instead of re-running (L-35).

## Notes

- Before diagnosing a failure, search `process/lessons/` for the failing filename (L-32).
- Index a note by its most valuable content, not its title topic; split a file that grows a second topic (L-33).
- A new lesson is a file in `process/lessons/` with an enforcement status. L1 checks it.
