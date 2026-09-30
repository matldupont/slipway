# Decision defaults — what a session decides before asking the owner

Read by `/work-ticket`, `/log-bug`, `/log-feature` and `/log-followup` before they ask the owner a design
question. D-016 says owners get product questions; these ten defaults answer the engineering ones. Apply them
in order: the first that settles a question decides it. A question none of them settles, and anything under
"What these never settle", goes to the owner.

## §1 — Reuse before inventing

When a rule, function or check elsewhere already answers the question, use it, and share the code when you can.
**Why:** a second copy drifts from the first, and a reviewer has to learn both.

## §2 — Fix it once, at the boundary

Prefer the one place that covers every case (an output escape, a shared parser) to a fix at each call site.
**Why:** a fix per call site misses the next call site; one at the boundary covers the ones not written yet.

## §3 — The trust line

Defend against content from other people: their pull requests, issues, fixtures and dependencies. A defence
against the owner's own working tree, or against a deliberate local action, is a known limitation written in
the PR, not a fix. **Why:** the owner can already change anything on their own machine; a defence there costs
prompts on ordinary work and protects nothing (D-023).

## §4 — Fail closed

When a check cannot tell (git cannot answer, a file will not parse, a value is not recognised), it reports
broken or fails. It never passes. **Why:** a check that passes when it cannot see is a gate anyone can walk
through by breaking its input.

## §5 — Stricter when both work

A lookalike of a gate path fails rather than counts; a whole file counts rather than its parsed keys. Take the
looser rule only when the stricter one would prompt on ordinary work. **Why:** a false alarm costs one look; a
missed one costs the gate.

## §6 — Security work builds the defence only

Fixtures are inert text, a probe writes a marker under a temp directory at most, and nothing builds or runs a
working attack. **Why:** the oracle for a hole is a known-bad fixture, and a working attack in the repository
is a hazard of its own.

## §7 — The review cap holds

After the last allowed review round, anything new is a known limitation or a follow-up, never a restarted
budget. **Why:** a review with no end finds a new layer every round (`/work-ticket` → Rounds 2 and 3).

## §8 — Out of scope is a follow-up

Work outside the ticket is filed as a follow-up, except the same bug in code the ticket already touches, which
is fixed there and said so in the PR. **Why:** a diff that grows past its ticket is reviewed against a promise
nobody made.

## §9 — Prove it on real data

A check that reads project files is run once against a real project's files before it ships. **Why:** a
fixture holds what its author expected; a real project holds what people wrote.

## §10 — Prove a change where it runs

Do not add machinery only so the template can show a green run. **Why:** machinery nobody needs is kept up
forever, and a green run in the template proves nothing about a project.

## What these never settle

Each of these goes to the owner, whatever a default says:

- **An edit the harness asks about.** Its permission prompt is the owner's approval, and a default is not.
- **Spending money.**
- **Creating or deleting anything outside the repository.**
- **Product decisions:** who the users are, what they pay, what they see.

## Recording it

A question a default settles is decided, not asked, and the run records it as `decided by decision-defaults §n`
with the question in a few words: in the `## Verification` of the PR it opens, or in the issue body when it
opens none.
