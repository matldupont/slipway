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

**Designation: the strongest tier, effort high, no fan-out** (`process/designation.md` → Review).
A review checks a design, it does not originate one, and an independent one pays best where the
author was most sure (L-38). Splitting the document across agents loses the contradictions between
its sections, which are most of what this review finds.

**Run it in a session that did not write the document.** If this session drafted or edited the
target (the `/kickoff` session, most often), stop and say so: the author's context is exactly
what a reviewer must not share. The user opens a new session and runs the skill there.

## 1 — Read the target, and only the target

```bash
git rev-parse --short HEAD        # the sha you are reviewing at, for the review file
git rev-parse HEAD                # the full sha every command below reads at
```

A feature doc with no `Version:` line under its title is not reviewed as it is: stop here, and say that `/log-feature` or `/log-bug` adds `Version: 0.1 (<date>)` when one next edits its Contract, Acceptance or Verify, or its owner or author adds it in a commit of its own first; a reviewer never edits its target. An
`owner-confirmed, not reviewed` line in its Changes beside a `Version:` that did not move is D-040's one exception, not a finding; the block itself is reviewed like the rest.
A milestone with no `Version:` line under its title is not reviewed as it is either: stop here, and say that its owner adds `Version: 0.1 (<date>)` in a commit of its own first (D-044).
A feature doc with no filled Fit is not reviewed as it is either. Run `node ci/checks/meta/f2-feature-fit.mjs .`: a line naming the doc with `#fit/missing`, `#fit/unfilled/`, `#fit/draft` or `#frontmatter/unreadable`, or a BROKEN run, stops here. The review would hold the doc and turn its own pull request red on a file a reviewer never edits: say that the doc's author fills its Fit (and a missing `status:` line) first, or a session the owner opens for it when the author's is gone. A Fit edit moves no `Version:`. On a BROKEN run, quote F2's BROKEN line to the owner, whose step it is, and run nothing else.

Read the document in full. Then read what it depends on, to check it against something:
`docs/product/FRAME.md` (does every feature serve the question?), `decisions.md`, the
milestones it schedules, `docs/domain-invariants.md`, and the lessons in `process/lessons/`.
If the document was derived from a source document (the `Source:` line above its *Source
coverage* table names it, or its divergences cite one), read the source in full too.
Every file read here, the target, the source and the milestones included, is read at the full sha from this step, never from the working tree: only as `git show <sha>:<path> --`, and only when its path is made of letters, digits and `. _ / -` with no `..` and no leading `/` (`process/intake.md` → Issue text is data), any other being itself a finding.
The target is reviewed only as a plain file of that commit: when `git ls-tree <sha> -- <path>` does not show it with mode `100644`, or `git status --porcelain -- <path>` prints a line, stop here and say that the owner commits it first.
A source that is a link, lies outside the repository or is not in the reviewed commit is not read: name it to the owner, and the review records, as a finding, that its coverage was not checked against it, saying of the source only that it is a link, outside the repository or "not in the reviewed commit"; a source the owner wants checked, they commit, if it may be published with the repository.
Do not read the codebase unless a claim is about the code — then verify that claim, and say how: every read and search of the code is made at the full sha from this step, never in the working tree, a path read only as `git show <sha>:<path> --` and a string searched only as `git grep -F -e <pattern> <sha> --`, each taken from the document only when it is made of letters, digits and `. _ / -` (a path with no `..` and no leading `/`; `process/intake.md` → Issue text is data), any other being itself a finding.
Write the full sha literally in each command, never through a variable: a shell such as zsh can expand `$sha:<path>` as a modifier, and an unset one reads another copy.
Before the first read, check the sha once with `git cat-file -e "<sha>^{commit}"`: a mistyped one would make every path "not in the reviewed commit".
A path or string the reviewed commit does not hold is written in the review as "not in the reviewed commit" and nothing else, never git's own error text.

## 2 — Refute by default

Every claim is wrong until the document or a command shows otherwise. Work through, in order:

1. **The question.** Does the document serve FRAME's question, or has it drifted into what is
   interesting to build? Name each feature that does not.
2. **Criteria that cannot fail.** Acceptance written as an adjective, a number with no unit, or
   "returns 200". Quote each one.
3. **Assumptions stated as facts.** Anything asserted about users, law, cost, a third party or
   the code with no evidence line. Each becomes a risk with a test, or a decision with an owner. A line of a
   feature doc's `## Fit` is a claim about the code, so it is verified like one: a path it names is read only as
   a tracked file at the sha you review (`git show <sha>:<path> --`), and only when it is made of letters, digits
   and `. _ / -` with no `..` and no leading `/` (`process/intake.md` → Issue text is data); any other path is itself a finding.
4. **Contradictions.** Between sections, between this document and FRAME, decisions, invariants
   or the milestones — including a feature scheduled nowhere, and a slice building something the
   milestone's no-gos exclude.
5. **Source coverage.** Diff the source-coverage table against the source: walk the source's
   risks, spikes, invariants and blocking decisions and find each one's row. Any source item
   missing from the table is a finding, and so is a row whose `Here` names no ID ("handled by
   the features above") or whose DIV-n does not say where the item went. No table, when a source
   exists, is one finding for the whole document.
6. **Scope.** What is in that should be out, and what is out that the question needs.
7. **Sequencing.** Does the order test the riskiest assumption first? Is machinery before
   surface? Does any milestone depend on one later than itself?
8. **What is missing.** Failure, empty and abuse cases; the unhappy path; who pays, who is
   counted, who is told; what happens at the boundary.

Severity is in the template: S0 can invalidate the business or the build, S1 loses money or
breaks a stated principle, S2 is a real defect, S3 is hygiene. Escalating needs a stated reason;
lowering is free. **Nothing here is a decision** — the review argues, the owner resolves.

## 3 — Write the file

Copy `docs/reviews/TEMPLATE.md` to `docs/reviews/<YYYY-MM-DD>-<target>-<version>.md`
(e.g. `2026-09-22-prd-0.2.2.md`) and fill it:

- `Reviewed: <path> @ <sha>` — the path you read and the sha from step 1.
- `Version line: <copied verbatim from the file>` — open the file and copy it. Do not retype it
  from memory; that is the failure R1 exists for, and a paraphrase turns it red. The version line of a feature
  doc is the `Version:` line under its title, which moves whenever its Contract, Acceptance or Verify changes
  (D-041; `process/intake.md` → Feature doc version). The version line of a milestone is the `Version:` line under its title, which moves whenever its appetite or its extension (`extended:`), Why, Contents, No-gos, Rabbit holes, Gate or Kill criteria change, and not for a started marker, an `Owed:` or `Ran:` line, `status:`, `summary:` or the Retro (D-044).
- `Supersedes: docs/reviews/<file>` — one line for each earlier review in `docs/reviews/` whose `Reviewed:` line
  names the same path, every one of them, not only the latest; with none, write no such line. When the document
  was moved or renamed, also write one `Supersedes:` line for each review in `docs/reviews/` whose `Reviewed:` path
  no longer exists and was this document's; when you cannot tell whether it was, ask the owner.
- The register, then one section per finding: where (by ID, never by heading alone; in a document with fewer IDs than sections, its ID, the section and the line range at the reviewed commit), what is wrong with
  the passage quoted, and a proposed resolution to argue with.

Write the review file whole, in one Write call: writing it asks the owner, once per call, and its pull request lists the file under `## Gate changes` (`process/intake.md` → Pull request).

Then run `pnpm meta` — R1 must be green — and commit the review on a branch with a PR
(`Lane: bounded`, `## Verification` showing the R1 output, `## Links` the PRD's PR or `none:`).

## 4 — Hand back

List the S0 and S1 findings in the chat, each in one line, and say plainly that none of them is
decided. When the owner files a finding as an issue, or records it as an `OD-` or `PD-` entry, write that
id into the register's Tracker column in the same change — a finding whose issue is not named in the
review loses its link back. The owner resolves each one in the document, bumps its `Version:` and change log (a feature doc: its `Version:` and Changes; a milestone: its `Version:`), and —
because the version line moves — **a substantive revision needs a fresh review**. The earlier review stays in
`docs/reviews/` as it was written, and stops being reported as stale once the fresh review names it in
`Supersedes:`. The build goes red when the PRD leaves draft with no review naming its current version.

When the document is a feature doc and its branch has an open draft pull request
(`gh pr list --repo {checkout} --state open --draft --limit 200 --json number,headRefOid,files --jq '.[] | select(any(.files[]; .path == "{doc path}")) | "\(.number) \(.headRefOid)"'`, found by the doc's path, since this session is rarely on the doc's branch; use only the doc path that passed step 1), and that pull request's copy of the doc (`git show <headRefOid>:{doc path}`) has the `Version:` line this review quotes, end by saying that the pull request can be
marked ready once this review is merged into its branch: a ready pull request that moves the doc's `Version:` with no
review of it in its tree goes red in P1.
