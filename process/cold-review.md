# Cold review

## When

Before merge on any change touching money, auth, schema or data deletion — and anywhere you are
confident. Independent review pays best on exactly the claims the author was sure of (L-38).

## How

- **A fresh context**, not the session that wrote the change. The author's labels are inferences.
- **Refute by default.** Each claim is wrong until the diff or a command shows otherwise.
- Output a `## Cold review` section in the PR: the reviewer, the head each round reviewed, findings with
  `file:line` and what became of each, a verdict. What is committed for a finding, and when, is
  `/work-ticket`'s to say (`.claude/skills/work-ticket/SKILL.md` → Rounds 2 and 3, step 4; D-031).
- `/work-ticket` runs this on the pull requests it opens. Any other pull request, by hand or by a
  teammate, is reviewed with `/pr-review`, whose `output_mode: cold-review` writes that section.
- The line that closes the section, naming the last reviewed head and the pull request's head, is owed by
  whoever puts the section in the pull request: `/work-ticket` writes it (Phase 6). A `/pr-review` cold review
  names the one head it read and never writes that line; a person who pastes one into a pull request adds it.

## When to stop

The bar is the GUARANTEES block (`.claude/skills/work-ticket/SKILL.md` → The guarantees): a baseline that holds
with or without a threat model, the invariants, the acceptance lines, and the threat model when one is stated.
The round cap and the cluster signal live in the same skill, Phase 5 → Rounds 2 and 3. Read them there; this
file does not restate them.

Another round runs only when the last one found a finding that breaks a line of that block. What becomes of
anything else (a fix made before that round's verify, a known limitation, a follow-up), and what is committed
when, is Rounds 2 and 3, step 4 of the same skill (L-68, D-031).

A review never writes a threat model. A feature doc that is still being shaped states its `Threat model` and
`Known limitations` first (`docs/features/TEMPLATE.md`); a review of a change with none is held to the baseline.

Findings that start with "when the environment has…" (a credential helper, a symlinked parent, a fork, a
platform setting) are limitations until the spec promises otherwise. When a round finds only these,
the change probably holds surface it should not: moving the surface out ends the review; patching it
adds the next layer.

Making this a required check is deferred until the first consequence-bearing path lands (L-50).
A new checklist line needs a lesson naming the failure it prevents.

## Checklist

### L-01 — Would each acceptance criterion fail on the broken behaviour?
I1 catches adjectives. It cannot catch a criterion that passes no matter what, such as "returns 200".

### L-02 — Does the title bound the diff?
Compare the changed-file list with the title. Split or rename when the diff reaches files the title does not imply.

### L-04 — Can each new or changed test fail?
Revert the mechanism and run that file, that case. Commit first.

### L-05 — Does every absence claim name its command and scope?
Re-run load-bearing ones unscoped, and search the symbol rather than the module path.

### L-06 — Is a sweep enumerated by the construct that causes the problem?
State N found of M causes. Enumerating by your own fix only finds sites that already have it.

### L-09 — Does each clause of a compound predicate have a test that dies without it?

### L-13 — Is a claim drawn from a doc checked against the code, not the doc?

### L-14 — Does the change rest on the live call path?
Near-namesake modules both contain true statements; only one runs. Prefer a short integration probe to reading.

### L-15 — Did a shared predicate change for one caller?
List every caller, and which of them can supply any new input.

### L-16 — Was a required parameter added?
The PR carries a table per call site: the producer, the value it passes, and why that is the caller's own notion of it.

### L-23 — Did a visual spec start from a render of the current product?

### L-24 — Does every pinned tool install in CI assert the resolved binary?

### L-29 — Are a subagent's adjectives (legacy, dead, unused) backed by evidence?

### L-36 — Does the PR say what it did not verify?
An agent's screenshot does not verify motion or responsive layout.

### L-40 — Were per-item writes confirmed by an independent read-back?

### L-42 — Does every read path that joins display data scope by owner, not only the row filter?
