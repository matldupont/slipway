---
name: review-doc
description: Adversarially review a planning document (the PRD, a feature doc, a milestone) from a fresh context and write the review into docs/reviews/ with provenance lines R1 can check. Use at step 3 of the slipway path, when `pnpm meta` reports R1 `review/missing`, or when the user says "review the PRD", "adversarial review", "argue with this doc". Not for code: a pull request diff is reviewed by a code-review skill, and this one never reads a diff.
---

# Adversarial document review

Argue with a planning document before anything is built on it. Output is a file in
`docs/reviews/`, not a chat answer — R1 checks that it exists, names what it read, and quotes a
version line still in the target.

**This is not a code review.** It reads a document, not a diff, and its findings are about the
plan: contradictions, gaps, assumptions stated as facts, things that cannot fail. A pull request
is reviewed by a code-review skill instead.

**Run it in a session that did not write the document.** If this session drafted or edited the
target (the `/kickoff` session, most often), stop and say so: the author's context is exactly
what a reviewer must not share. The user opens a new session and runs the skill there.

## 1 — Read the target, and only the target

```bash
git rev-parse --short HEAD        # the sha you are reviewing at
```

Read the document in full. Then read what it depends on, to check it against something:
`docs/product/FRAME.md` (does every feature serve the question?), `decisions.md`, the
milestones it schedules, `docs/domain-invariants.md`, and the lessons in `process/lessons/`.
Do not read the codebase unless a claim is about the code — then verify that claim, and say how.

## 2 — Refute by default

Every claim is wrong until the document or a command shows otherwise. Work through, in order:

1. **The question.** Does the document serve FRAME's question, or has it drifted into what is
   interesting to build? Name each feature that does not.
2. **Criteria that cannot fail.** Acceptance written as an adjective, a number with no unit, or
   "returns 200". Quote each one.
3. **Assumptions stated as facts.** Anything asserted about users, law, cost, a third party or
   the code with no evidence line. Each becomes a risk with a test, or a decision with an owner.
4. **Contradictions.** Between sections, between this document and FRAME, decisions, invariants
   or the milestones — including a feature scheduled nowhere, and a slice building something the
   milestone's no-gos exclude.
5. **Scope.** What is in that should be out, and what is out that the question needs.
6. **Sequencing.** Does the order test the riskiest assumption first? Is machinery before
   surface? Does any milestone depend on one later than itself?
7. **What is missing.** Failure, empty and abuse cases; the unhappy path; who pays, who is
   counted, who is told; what happens at the boundary.

Severity is in the template: S0 can invalidate the business or the build, S1 loses money or
breaks a stated principle, S2 is a real defect, S3 is hygiene. Escalating needs a stated reason;
lowering is free. **Nothing here is a decision** — the review argues, the owner resolves.

## 3 — Write the file

Copy `docs/reviews/TEMPLATE.md` to `docs/reviews/<YYYY-MM-DD>-<target>-<version>.md`
(e.g. `2026-09-22-prd-0.2.2.md`) and fill it:

- `Reviewed: <path> @ <sha>` — the path you read and the sha from step 1.
- `Version line: <copied verbatim from the file>` — open the file and copy it. Do not retype it
  from memory; that is the failure R1 exists for, and a paraphrase turns it red.
- The register, then one section per finding: where (by ID, never by heading), what is wrong with
  the passage quoted, and a proposed resolution to argue with.

Then run `pnpm meta` — R1 must be green — and commit the review on a branch with a PR
(`Lane: bounded`, `## Verification` showing the R1 output, `## Links` the PRD's PR or `none:`).

## 4 — Hand back

List the S0 and S1 findings in the chat, each in one line, and say plainly that none of them is
decided. The owner resolves each one in the document, bumps its `Version:` and change log, and —
because the version line moves — **a substantive revision needs a fresh review**. R1 turns red
when the PRD leaves draft with no review naming its current version.
