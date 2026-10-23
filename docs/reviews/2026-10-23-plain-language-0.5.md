# Adversarial review — F-16 plain language 0.5

Reviewed: dev/features/plain-language.md @ 4b0d3b6
Version line: Version: 0.5 (2026-10-23)
Supersedes: docs/reviews/2026-10-14-plain-language-0.1.md
Supersedes: docs/reviews/2026-10-15-plain-language-0.2.md
Supersedes: docs/reviews/2026-10-22-plain-language-0.3.md
Supersedes: docs/reviews/2026-10-23-plain-language-0.4.md
Review date: 2026-10-23
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks `Reviewed:` and `Version line:` against the tree. A review whose version line is no longer in the
> document is stale and turns CI red, until a current review of the same document names it in `Supersedes:`.
> Copying the line is the point: it cannot be transcribed without opening the file under review. A review of
> a revised document adds one line under `Version line:` for each earlier review of that document, written
> as `Supersedes: docs/reviews/<file>`. When the document was moved or renamed, that includes each review whose
> `Reviewed:` path no longer exists and was this document's.

4b0d3b6 was the head of `matldupont/i462-prose-linter-5b9810` (PR #522) when this review began. This session did not
write or edit the document.

**Scope, by the owner's word:** "one fresh review of the 0.5 changes only". That is `git diff 8bd2b93 4b0d3b6` on the
doc: §8's "What Vale reads" bullet, the Chatbot list, the Sentence rule's line and the ids sentence after it, the
ratchet's baseline, the fixture's controls, §9's baseline, the new `Verified against:` line, two Known-limitations
lines, the Acceptance sentence on a chatbot opener, and the 0.5 Changes entry. The rest of the doc was read for
contradictions with the changed lines, not reviewed again. `ci/prose.mjs`, `.vale.ini`, the eight rule files, the
prose fixture and `scripts/prose.test.mjs` were read at 4b0d3b6 only to check the doc's claims against them.

F-16 has one ID and nine numbered Contract sections, so each finding is located by `F-16 §n` (or the section name)
and the line range at 4b0d3b6.

## The 0.4 findings

0.5 does not touch them. Each has a tracker in the 0.4 review's register at 4b0d3b6: AR-1 is #521, AR-2 to AR-6 are
#524. They are not re-judged here.

**What was read.** In full at 4b0d3b6: the doc, `ci/prose.mjs`, `.vale.ini`, `ci/prose/Slipway/*.yml`, the files under
`ci/fixtures/known-bad/prose/`, and the 0.4 review. In part: `scripts/prose.test.mjs` (its diff from 8bd2b93),
`ci/baselines.json`, and four files at 2c71f61 (`ci/prose.mjs`, `.vale.ini`, `Sentence.yml`, `ci/baselines.json`).

**Verified, and how.**
- At 2c71f61, `ci/prose.mjs` writes each file under its own name through `blank()` (line 105), `.vale.ini` has a
  `[*.md]` section and no `[*.txt]` one, `Sentence.yml` is `scope: sentence` with `max: 34`, and `ci/baselines.json`
  holds `prose` 136 (AR-2).
- At 4b0d3b6, `blank()` imported from `ci/prose.mjs` and run with node on three inputs: a code span is blanked; a
  four-space indented code block is returned as written, `<date>` included (AR-11).
- `git grep` at 4b0d3b6 over every `*.md` outside `ci/fixtures/` for five of the nine Chatbot phrases: no hit.
- `README.md`'s "Then follow the path" section at 4b0d3b6 holds no fenced block (AR-7 is a trap, not a red build).

**Not verified.** Vale is not installed in this session, so no rule was run: the claims about what a rule matches are
read from its regex. `scripts/prose.test.mjs` was not run. The baseline of 166 was not recounted (AR-9).

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | Known limitations says the Chatbot and Recap rules "have no such gap"; that does not hold | S2 | owner | #462 | fixed here (the claim is cut); the class is #530 |
| AR-2 | The 0.5 `Verified against:` line names 2c71f61, where none of its four claims is true | S2 | owner | #462 | fixed here (sha 4b0d3b6) |
| AR-3 | No Acceptance line holds 0.5's behaviour: a directive or entity changes nothing, a phrase in code fails | S2 | owner | #462 | #524 |
| AR-4 | CheckId and DecisionId now read code; §1 rule 2's "one rule" and §8's "outside code" say they do not | S2 | owner | #462 | #524 |
| AR-5 | "A doc cannot quote a chatbot phrase" holds only for added lines in two sets; PR bodies go unsaid | S3 | owner | — | #524 |
| AR-6 | The Acceptance's fixture controls still read as 0.4's; §8 changed them | S3 | owner | — | #524 |
| AR-7 | The Sentence limitation leaves out fenced blocks, and "never an error" is false where warnings are held at 0 | S3 | owner | — | #524 |
| AR-8 | The Chatbot paraphrase leaves out three of the nine phrases' kind, and the list leaves the Contract | S3 | owner | — | #524 |
| AR-9 | The baseline of 166 names a date and no sha | S3 | owner | — | #524 |
| AR-10 | Markdown-era text survives: `ci/prose.mjs`'s header and §8's reason for `scope: raw` | S3 | owner | — | #524 |
| AR-11 | The masker's other direction: an indented code block is not blanked, so a format in it fails | S3 | owner | — | #524 |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — The Chatbot and Recap rules have a gap of their own

**Where:** F-16 Known limitations, lines 468–470.

"The Chatbot and Recap rules read the file as written and have no such gap."

Reading the file as written closes the masker's gap. It does not close every gap. Both rules are regexes over the
source, and the page a reader sees is the rendered markdown. This review found one class of text that renders as a
listed phrase, or a recap opening, and is not matched by the rule's regex. It reaches the gate from a PR's committed
files or its body. In the house form for an open security observation: **Security: 1 observation open, detail sent to
the orchestrator privately.**

The class was already there at 0.4, when both rules were `scope: raw` on the blanked copy. 0.5 does not weaken the
gate. What 0.5 adds is the sentence saying the gap is not there, written the round the owner chose B to close
evasions. A reader takes it as a defence the check holds.

**Proposed resolution.** Either close the class (the private note names ways to), or cut "and have no such gap" and
add a Known-limitations line that names the class in plain words without its mechanism.

### AR-2 — The new `Verified against:` line names a commit where its claims are false

**Where:** F-16 §9, line 434.

"Verified against: 2c71f61 2026-10-23 — re-read for 0.5: `ci/prose.mjs` copies every file under a `.txt` name and runs
Placeholder on a blanked copy; `.vale.ini` has one `[*.txt]` section; a table row ends a Sentence run;
`ci/baselines.json` holds `prose` 166."

At 2c71f61 each of the four is false: the script writes the blanked copy under the file's own name, `.vale.ini` reads
`[*.md]`, `Sentence.yml` is Vale's `sentence` scope with `max: 34` (no table-divider rule), and the baseline is 136.
All four became true in 4b0d3b6, the commit that carries 0.5. A commit cannot name its own sha, which is likely how the
parent's sha got there.

L-18 asks for a `Verified against:` line so a later reader can check the claim at that commit. This one sends them to
the commit before the change.

**Proposed resolution.** Name 4b0d3b6 (or any later sha the four still hold at) in a follow-up commit. The doc's own
rule lets the sha and date of a `Verified against:` line change without a Version move.

### AR-3 — The Acceptance does not hold what 0.5 was for

**Where:** F-16 Acceptance, lines 554–570; Verify, line 597; §8 lines 362–367.

0.5 exists to make two things true: no comment directive or character reference switches a rule off, and a chatbot
phrase in a code span or a fenced block fails. `scripts/prose.test.mjs` at 4b0d3b6 tests both (the two tests added in
the range). The Contract does not: no Acceptance block names a directive, an entity, or a phrase in code, and the
Verify comment for the test still reads "each rule trips once; controls quiet; BROKEN without vale".

Issues embed the Acceptance. A later change that brought back markdown parsing, or blanked code for every rule again,
would break a test that no line of the spec requires.

**Proposed resolution.** Add one Acceptance block: given a file with a chatbot phrase after a `vale off` comment, after
a comment written with a character reference, in a code span and in a fenced block, when `node scripts/prose.test.mjs`
runs, then each fails on Chatbot at its line, and a placeholder after the same comments still fails on Placeholder.
Extend the Verify comment to match.

### AR-4 — Ids in code now count, against §1 rule 2's "one rule"

**Where:** F-16 §1 rule 2, lines 130–133; §8, lines 380–384.

§1 rule 2: "The one rule, which §2's lines and §8's `DecisionId.yml` both use: an id outside a code span that is not
inside brackets is bare." §8 still says CheckId and DecisionId flag an id "outside code and outside brackets".

Under 0.5 both rules read the raw copy. Their regexes skip an id only when a backtick or bracket touches it. So an id
inside a longer code span (`` `run R1 now` ``) and an id on a line of a fenced block (a pasted check output) now count,
where at 0.4 the blanked copy hid them. 0.5's new sentence, "A check or decision id alone in backticks or in brackets
is not counted", is true, and says the narrower rule beside a line that still says the wider one.

The warnings ratchet on the held set, so the change in what counts is likely part of why the baseline moved from 136 to 166.

**Proposed resolution.** Either give CheckId and DecisionId the blanked copy, as Placeholder has, and keep §1 rule 2's
one rule; or change §1 rule 2 and §8 to say what is now counted ("an id not touching a backtick or a bracket"), and
say that §2's form test and the prose rules no longer share one rule.

### AR-5 — "A doc cannot quote a chatbot phrase" overstates where it holds

**Where:** F-16 §8, lines 366–367 and 392–395.

"So a doc cannot quote a chatbot phrase, in code or out of it, and a change that adds one fails."

It holds on the held set and on the lines a PR adds in the diff set. A doc under `docs/reviews/`, `.claude/**`, a
fixture, a markdown file outside the diff set's patterns, and an unchanged line of a diff-set file can hold one. The
consequence for PR bodies is not stated: the PR-bodies bullet does not say a body can no longer quote a phrase in a
code span, though the test's clean body was changed for exactly that.

**Proposed resolution.** "So no file the check reads can add a chatbot phrase, in code or out of it, and neither can a
PR body." The sets are already defined two bullets up.

### AR-6 — The Acceptance's fixture line was not moved with §8

**Where:** F-16 §8, lines 398–400; Acceptance, lines 555–557.

§8 now lists the fifth control as "a `<sha>` and `<date>` in a code span and a fenced block". The Acceptance still
lists it as "a <sha> in a code span in the diff set's shape". The fixture at 4b0d3b6 (`control-code.md`) holds a
`<sha>` in a code span and `<date> TBD` in a fenced block. §8's wording also implies both formats are in both places.

**Proposed resolution.** Write the control once, as the fixture holds it ("a `<sha>` in a code span, and a `<date>`
and a `TBD` in a fenced block"), in §8 and the Acceptance.

### AR-7 — The Sentence limitation is incomplete, and one half is false

**Where:** F-16 Known limitations, lines 466–467; §8, lines 383–384 and 388–389.

"The sentence-length rule is a regex over plain text: a code span with a period in it, or a list marker, can miscount
a sentence. A warning, never an error."

Two gaps. First, Sentence now reads fenced blocks: lines with no `.`, `?` or `!` and no blank line between them run
together, so a block of commands or a Given/When/Then block of 35 words or more counts as one long sentence. Second,
"never an error" is false in the path table's rows and `README.md`'s "Then follow the path" section, which are held at
0 warnings: there a Sentence warning fails the job. That section holds no fence at 4b0d3b6, so nothing is red today; a
fenced block added to it later would fail on a rule the doc says cannot fail.

**Proposed resolution.** Name fenced blocks in the limitation, and write "A warning, which fails only inside the text
held at 0 warnings".

### AR-8 — The Chatbot paraphrase drops a kind, and the list leaves the Contract

**Where:** F-16 §8, lines 370–371; Acceptance, line 567.

"nine openers and sign-offs a chatbot adds (a thanks for the question, an offer of more help, a statement about being
an AI), the list in the rule file."

Three of the nine are one-word exclamations of agreement, a kind the parenthesis does not name; one is praise of the
question, not a thanks. Read as a summary, the parenthesis misdescribes a third of the list.

The larger effect: the list was part of the Contract at 0.4, so changing it moved the Version and earned a review.
Now "the list in the rule file" can change with no Version move. `ci/prose/**` is still a gate file, so the PR names
the change under Gate changes, but the spec no longer says what the rule holds. Nothing pins "nine".

**Proposed resolution.** Name the five kinds (a sign-off hoping it helped, praise for the question, a one-word
exclamation of agreement, an offer of more help, a statement about being an AI), and pin the count in
`scripts/prose.test.mjs` so the doc's "nine" can fail.

### AR-9 — The baseline names a date and no sha

**Where:** F-16 §8, lines 388–389; §9, line 413.

"166 on the held set, read as plain text (#462's own run on 2026-10-23)". 0.4 wrote "136 on the held set at 04b47c0".
The held set changed in this PR, so the count depends on which commit was read, and a date does not say.

**Proposed resolution.** Name the sha of the run, as 0.4 did. This review did not recount it.

### AR-10 — Text from the markdown era survives

**Where:** `ci/prose.mjs` lines 13–14; F-16 §8, lines 368–369.

The script's header comment still says "Vale reads a copy of each file with its code spans and fenced blocks blanked,
so `<sha>` in a code span never fires and a phrase a doc quotes in code never trips the chatbot rule". Since 4b0d3b6
the second half is the opposite of what happens. The function comment at lines 97–100 is right; the header is not.

§8 gives `scope: raw` the reason "so a `<date>` is read as text and not as an HTML tag". With every file read as
`.txt`, nothing is parsed as HTML, so the reason no longer applies. The rules may still need `scope: raw`, for the
paragraph anchor in Recap and for line wraps; the doc should give the reason that holds.

**Proposed resolution.** Rewrite the header to match lines 97–100. In §8, state why `scope: raw` stays, or drop the
reason.

### AR-11 — The masker also fails in the other direction

**Where:** F-16 Known limitations, lines 468–470; `ci/prose.mjs` `blank()`, lines 59–83.

The new line covers a placeholder the masker hides when GitHub would show it. It does not cover the reverse: text
GitHub shows as code that the masker leaves in place. A four-space indented code block is not blanked (checked with
node on `blank()` at 4b0d3b6), so a `<date>` in one fails Placeholder, and the message tells the author to "move the
format into a code span", which is already where the reader sees it.

This behaviour is not new in 0.5. The new line is the first place the doc describes the masker's limits, so it
should describe both.

**Proposed resolution.** Add one sentence: an indented code block is read as prose, so a format in one fails; use a
fence.
