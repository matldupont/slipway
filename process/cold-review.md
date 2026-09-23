# Cold review

## When

Before merge on any change touching money, auth, schema or data deletion — and anywhere you are
confident. Independent review pays best on exactly the claims the author was sure of (L-38).

## How

- **A fresh context**, not the session that wrote the change. The author's labels are inferences.
- **Refute by default.** Each claim is wrong until the diff or a command shows otherwise.
- Output a `## Cold review` section in the PR: the reviewer, the head sha reviewed, findings with
  `file:line`, a verdict. Every finding is fixed in the diff or explicitly waived there.

## When to stop

Another round runs only when the last round found a finding that **breaks a guarantee the spec states**:
lost work or data, a leaked secret, a gate an agent can pass without asking, a wrong answer on an
Acceptance case. Anything else is fixed in the same diff if it is cheap and in scope; otherwise it is
recorded in the spec's known limitations or filed as a follow-up. A spec with no threat model has no
guarantees to test against, so write the threat model before the next round, not another round (L-68).

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
