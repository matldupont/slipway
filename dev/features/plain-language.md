---
prd-ref: D-046
status: draft
---

# F-16 — Plain language: slipway's own text says what to do next in short, plain terms

Version: 0.2 (2026-10-14)

The line above is the one a `/review-doc` review quotes. Any edit inside the Contract, Acceptance or Verify
below moves it, in the same commit, bar the sha and date of a `Verified against:` line.

## Problem

**Job:** when I open a project built on slipway, I want its status, its check failures and its docs to tell me
what to do next and why in words I already know, so I can act without looking anything up.

Slipway's own text is hard to read. The line meant to tell the engineer what to do next is:

> **Next:** Step 0 (you + agent) — Bootstrap: run /bootstrap (AGENT.md still has placeholders: Product name,
> Issue repo, GitHub project, Domain invariants doc, Timezone; no app yet); BOOTSTRAP.md is the reference.

It should be:

> **Next:** Run /bootstrap. It fills the 5 settings AGENT.md still needs and sets up the app. You and an
> agent, 1 to 2 hours.

The same pattern runs through the surfaces a person reads. Evidence, read on `main` at `8a5205c` on 2026-10-14:

- The step table in `SLIPWAY.md` says step 2 is done when "**K1** blocks every milestone past the skeleton until
  each value risk has a Result, or is settled by experience with what would prove it wrong written down".
- A check failure reads `I1: feature-no-contract-verify.md#contract/missing: Links says Lane: feature, so ###
  Contract must be copied in from the feature doc, never only linked — it is missing`. The id comes first, the
  fix is buried in the middle.
- Of the last 200 commit subjects on `main`, 167 are over 72 characters. Of 34 open issues,
  28 have a title over 72 characters.
  The longest is 448 code points, then 317 and 245.
- Subjects carry review bookkeeping: `fix(status): review round 1 — step 5 waits on an open value risk while the
  skeleton is active, settled shares K1's Threshold rule, and a test pins it (#385)`.

Four patterns sit under these: an internal id stands in for its meaning (K1, D-005, R1); the reason, the
exception and the reference are chained into one sentence; the action comes after the explanation; agent
instructions and the text a person reads are written in the same voice.

The owner's words (research note of 2026-10-14): "The engineer running a project needs to know three things:
what's next, why, and whether the last step worked." Workaround: none. The owner edits the agent's writing by
hand and re-reads status every session. Frequency: every session, every check failure, every pull request. Why
now: the next real milestone runs on a released slipway (#379), and its engineer reads these surfaces cold.

The decision this builds on says a check that fails or a question a skill asks has to make sense to someone
who has never opened slipway's own docs, naming the project's own thing and the next action (D-016). This
feature turns that test into a form checks can fail, and the owner's answers to its first review are recorded as
D-046: a check fails only on unambiguous junk, the rest ratchets, nothing new reaches a project before a project's
text is measured, and the outcome is measured on slipway's own PRs and status.

**Source:** the owner's research note of 2026-10-14, "AI slop: how Slipway stops producing it", kept on the owner's
machine outside this repository. Where each of its items went:

| the note's item | here |
|---|---|
| `process/writing.md`, eight rules with before/after pairs | §1 |
| the five surfaces rewritten, in order | §2 to §6 |
| agent text split from human text; one line per skill's output section | §1 scope lines; §5 for three skills; the other eight in Out of scope |
| `/pr-review`'s forced casual voice | Out of scope |
| templates only lose sections | §1's last line, pinned by a test (§6) |
| Vale: block junk, ratchet the rest, in `pnpm verify` | §8, as a CI job of its own, since `pnpm verify` is BROKEN in slipway by design and meta checks are zero-dependency (D-004); revives L-54 |
| P1: a `## What` over 150 words; a body naming a file the diff does not touch | Out of scope, tracker filed at step 6 (D-046) |
| the agent honesty checks | Out of scope, shaped with #51 |
| the UI step (`ui-craft`, four directions) | not this feature |
| check that it worked: the cold read at close | §9, measured in slipway (D-046) |

**Verdict: PROCEED**, as the owner decided on 2026-10-14. Rejected:

| option | for | against | verdict |
|---|---|---|---|
| do nothing | no work | every session and every failure costs a lookup; the next milestone's engineer reads it cold | rejected |
| rewrite the surfaces, no check | fast | the next agent PR writes it back the old way; nothing fires | rejected |
| a prompt rule only ("write plainly"), in `CLAUDE.md` | one line | the model swaps in synonyms for banned words; a rule with no check drifts (the owner's research, "Don't") | rejected |
| an AI-text detector in CI | catches "AI voice" | readers score at chance and detectors flag plain writing by non-native writers; no study supports it as a gate | rejected |
| a long banned-word list in CI | precise | word lists go stale within a model generation (Wikipedia keeps one per era); it blocks on taste | rejected: a short list of unambiguous junk blocks, the rest only ratchets |
| the plan: a one-page standard, the surfaces rewritten in stages, one check per rule a person can read | each stage is one small PR; the standard is tested on itself | 7 PRs; the check lists go stale and need a review date | **proceeds** |

## Fit

Reuses:
- `report()` in `ci/checks/lib/report.mjs`: every check prints through it, so the failure form changes in one
  place, and the `@@json` line PC1 compares stays as it is.
- The known-bad fixtures and their `expected.json` under `ci/fixtures/known-bad/` (`pc1-positive-control.mjs`):
  PC1 compares a finding's `where`, so a reworded message keeps every fixture green, and a new field on a
  finding breaks nothing.
- The status fixtures and S1 (`ci/fixtures/status/*/expect.json`, `ci/checks/meta/s1-status.mjs`): the one
  place the Next line's text is pinned, case by case.
- The step list in `ci/checks/lib/steps.mjs` and `scripts/steps.test.mjs`: the step names live there once and
  the path table in `SLIPWAY.md` is held to it. The who-and-how-long column joins it the same way.
- `ci/ratchet.mjs` and `ci/baselines.json`: a number that may only go down. The Vale warning count is one more key.
- The PR body workflow (`.github/workflows/pr-body.yml`): it already writes the body and the changed-file sidecar
  for P1; the title and the commit subjects are two more files in the same folder.
- `scripts/skills.test.mjs`: reads every shipped `SKILL.md` and holds it to rules; the question rule is one more test there.
- D-016's test, and F-03's audit (`dev/features/concept-audit.md`), which listed where machinery shows and reworded
  the checks once by hand. #355 cut the site's catch-phrases the same way. Neither left a check behind.

Numbers:
- The Vale warning count: read by `ci/ratchet.mjs` against the `prose` key in `ci/baselines.json`, nowhere else.
- A title's or subject's length: computed in P1 on the text as written, in code points.
- "1 to 2 hours", "an afternoon", "days to weeks": the path table's column, read from `ci/checks/lib/steps.mjs`.

New: `process/writing.md`, the standard itself; a `fix` field on a finding and the three-line failure form;
`.vale.ini` with its rules under `ci/prose/` and the `check:prose` script; a `who` and `time` per step in
`steps.mjs`. Nothing existing holds a writing rule, a fix line, a prose check or a time per step: searched
`rg -i 'vale|writing|plain|readab'` over `ci/`, `scripts/`, `process/` and `.claude/skills/` and found the
"In the project's words" rule in `process/intake.md`, which says what a body must not say and nothing about form.

## Contract

The unit of execution, in the order the stages land. "A person reads it" means: `pnpm status` and `STATE.md`,
a check's output, `README.md`, `SLIPWAY.md`, `BOOTSTRAP.md`, `process/*.md`, the feature and milestone docs,
the questions a skill asks, a PR or issue body, a commit subject, an issue or PR title. Skills, `process/intake.md`,
`decisions.md` and the checks' own source comments are agent text and are not held to the form; what they show or
post is. Every stage changes a gate file (`ci/**`, `process/**`, `.claude/skills/**`, the forms, the workflows), so
every PR carries `## Gate changes` and `/work-ticket` reviews each on the strongest tier at `xhigh` (D-035).

### §1 The standard: `process/writing.md`

One page, under 600 words, eight rules. Each rule is one sentence of instruction and one before/after pair taken
from slipway's own text on `main`, cited by file. The rules, in this order:

1. **Action first.** The first line says what to do next, or what changed. Pair: the Next line above.
2. **The project's words.** A check id, a decision id or a lesson id follows its plain meaning, in brackets, or is not
   written: `Decide the frontend framework (D-005, open since week 1)`. The one rule, which §2's lines and §8's
   `DecisionId.yml` both use: an id outside a code span that is not inside brackets is bare. Pair: step 2's "done
   when" cell in `SLIPWAY.md`.
3. **One idea per sentence.** A sentence that needs a semicolon and a parenthesis is two sentences. Pair: the step 2
   Next line in `ci/status.mjs` (four clauses).
4. **Something concrete behind every claim.** A command, a file, a number or an example; with none, cut the claim.
   Pair: `README.md`'s "It assumes an engineer is reading the diffs" against a line that names the diff.
5. **Say what was not done or checked.** Pair: a `## Verification` with a command list and no "not verified" line
   (L-36), against one that names the device not tested.
6. **Keep the owner's words.** Quote what the owner said in an issue or a conversation; do not paraphrase it. Pair:
   #440's "the owner's word" line against its paraphrase in an earlier draft.
7. **Length matches the need.** No recap endings, no throat-clearing, no epigrams. Pair: "a rule exists only where
   something fires" against the gate table's row that says what fires.
8. **Subjects and titles.** A commit subject, a PR title and an issue title are 72 characters or fewer, in plain
   words, saying what changed for the reader. Review rounds and ids go in the body. Pair: the `#385` subject above.

Two lines of scope at the top: who it is for (what an agent shows or posts, and what a person edits) and what it is
not for (skills, `process/intake.md`, `decisions.md`). One line at the end: no template gains a section without the
owner's yes, and a section cut never comes back; the feature template has 11 sections, and `scripts/f2.test.mjs`
pins that count (§6).

Two pointers so the standard is read: `process/intake.md` → Issue body, "In the project's words" gains one
sentence, "The form follows `process/writing.md`."; `process/slipway-rules.md` → Working rules gains one line,
"What a person reads follows `process/writing.md`: action first, the project's words, one idea per sentence."
Both files are owner-only; the PR says so under Gate changes.

A test, `scripts/writing.test.mjs`: the file exists, is under 600 words, has eight numbered rules, and each rule's
paragraph holds the word "Pair:" and a file path.

### §2 `pnpm status` and `STATE.md` (`ci/status.mjs`, `ci/checks/lib/steps.mjs`, `SLIPWAY.md`'s who-and-how-long column)

**The Next line** is `**Next:** ` followed by two to four sentences: the action, the reason, and who does it and
how long. The form a test holds on every S1 fixture, after the quoted spans are removed (a `"…"` item excerpt, a risk
title: project text the rules cannot govern):

- the first sentence is 14 words or fewer and ends with a period;
- no sentence holds `;` or ` — `, the words `Step n`, a check id (the upper-cased prefix of any file under
  `ci/checks/meta/`) or a decision id (`D-` or `PD-` and digits);
- the whole line is 260 characters or fewer, the quoted spans included (`excerpt()` already caps those);
- the last sentence starts with `You`, `Yours`, `Agent`, `You and an agent` or `A fresh session`.

`STEPS` in `steps.mjs` gains `who` and `time` per step. This stage also rewrites the path table's "Who, and how
long" column in `SLIPWAY.md` to plain text in the same words (`you and an agent, 1 to 2 hours`; `you, an afternoon`;
`yours, days to weeks`; `you, 1 to 2 days`; `agent, days`; `agent, one issue per session`; `you, an afternoon`; `you,
weekly`), and `scripts/steps.test.mjs` holds the column to the list as it does the name. The Next line reads `time`
from there and never spells one itself; `who` is in the row's text, since it varies by case.

The text per case, replacing `next()`'s branches one for one. `{…}` is filled from the repo as today:

| case | Next line |
|---|---|
| step 0, settings unfilled | `Run /bootstrap. It fills the {n} settings AGENT.md still needs ({names}) and sets up the app. You and an agent, {time}.` |
| step 0, no app | `Run /bootstrap. There is no app yet, so it scaffolds one and opens the first PR. You and an agent, {time}.` |
| step 1 | `Run /kickoff to finish docs/product/FRAME.md. Its open questions need an answer or a parked assumption before the frame is done. You, {time}.` |
| step 2 | `Test {RISK-n, "title"} with real people. Nothing past the skeleton can start until every value risk has a result in docs/product/evidence/. Yours, {time}. An agent prepares the materials.` |
| step 3, no review | `Finish /kickoff, then run /review-doc docs/PRD.md in a new session. The PRD needs a review before it is approved, or the checks go red. You, {time}.` |
| step 3, reviewed | `Resolve the review's findings in docs/PRD.md, then set Status: approved. {version} has its review, and a milestone can go active once the PRD is approved. You, {time}.` |
| more than one active | `Set every milestone but one to shaping or closed. {ids} are all active, and the checks stay red until one is. You.` |
| appetite ended | `Close {id} with /close-milestone, kill it, or record an extension. Its appetite ended {date}. You.` |
| active, next item | `Start item {n} of {id} in a fresh session: /log-feature {id}#{n}. "{excerpt}". Agent, {time}.` |
| active, every item started | `Finish {id}'s open issues, then run /close-milestone once its gate is green. Every item has an issue. Agent, {time}.` |
| active, no numbered id | `Pick the next slice from {id}'s Contents and its lane. Agent, {time}.` |
| skeleton shaping | `Activate {id}: set real appetite dates and status: active, then build its first slice. Agent, {time}.` |
| choose the next bet | `Activate one of {ids}, or shape a new bet. Set its appetite dates when it goes active. You, {time}.` |
| nothing shaped | `Shape the next bet from docs/product/metrics.md. No milestone is active or shaped. You, {time}.` |

The step 2 line's two tails today (where thresholds go; a decision to build ahead) move to Needs attention as one line:
`To build ahead of {RISK-n}, record a decision with the cost if wrong and what reopens it, and put its id in the
risk's Result.` The "Meanwhile (yours)" tail on an active milestone's line moves to Also unblocked: `(you) Test
{RISK-n}: {riskLine}.`

**Every other line status prints for a person** (Also unblocked, Needs attention, the per-step lines) starts with
the action or the state, and puts an id in brackets after its meaning (§1 rule 2): `Decide the frontend framework
(D-005, open since week 1)`, not `Open decision: D-005 Frontend framework (open — week 1)`. Only the Next line is
tested for form; the PR lists every other line it changes, before and after. The lines F-15 adds (#440, owed
decisions) were reviewed three times at their wording and are left as that Contract says; §9 measures them with the rest.

Fixtures: every `expect.json` under `ci/fixtures/status/` is rewritten to the new text, each in its own commit so
the diff reads case by case. S1 gains one check, `<case>#next-form`, failing a Next line that breaks the four rules
above, and a known-bad case under `ci/fixtures/known-bad/s1/` holds a line that does.

### §3 Check failure messages (`ci/checks/lib/report.mjs`, every `ci/checks/meta/*.mjs`, the readers below)

A finding is `{ where, detail, fix }`. `detail` says what is wrong in one sentence; `fix` says what to do in one
sentence. `report()` prints a finding as three lines and the id last:

```
"Contrast is lower" is an adjective, not a test.
  Fix: write a number, a command, a comparison, Given/When/Then or an issue reference.
  I1 · adjective-ac.md#ac/unfalsifiable/1
```

The summary lines keep their denominator and put the id last: `scanned 13 issue bodies (I1)`, `FAIL: 14 findings in
13 issue bodies (I1)`, `PASS: {claim} (I1)`, `BROKEN: {why} (I1)`. A warning prints as a finding with `Warning:` in
front of its first line. The `@@json` line is unchanged in shape, with `fix` added to each finding: PC1 compares
`where` and is not touched.

Two tests hold it, in `scripts/report.test.mjs`:

- **Static:** every `findings.push` and `warnings.push` call under `ci/checks/meta/` passes a `fix` key, read from
  the source text. A site with none is named; 113 sites at 8a5205c.
- **On output:** over every finding every check emits on every known-bad fixture (`CHECK_JSON=1`): `detail` and `fix`
  are each one sentence, 160 characters or fewer, ending with a period; neither holds a check id, a decision id or a
  lesson id (`L-`, `PL-`), while `where` may; `fix` starts with a verb in the imperative from a list in the test
  (`write`, `add`, `copy`, `remove`, `name`, `set`, `run`, `move`, `answer`, `record`, `rename`, `delete`, `keep`,
  `edit`, `list`, `file`, `say`, `cut`, `fill`, `put`, `read`, `give`), extended in the same PR when a message needs
  another.

Readers of the old text form, each changed in this stage: `.github/workflows/issue-shape.yml` (its `sed` over
`I1: …` lines becomes a read of the `@@json` line, posting `detail` and `fix` as one bullet each);
`scripts/f2.test.mjs:62` and `:70`, `scripts/r1.test.mjs:56`, `scripts/lk1.test.mjs:22` (assert `F2: PASS`,
`R1: PASS`, `LK1: PASS` and one `F2: warning:` line); `/review-doc` step 1 (reads F2's lines by their tags). The
header comment of `report.mjs` states the three-line form.

Size: 113 sites and 19 claims. The format, the two tests and the readers land first; the messages follow in the
same PR when its diff stays under about 400 lines, otherwise in a second PR under the same issue, grouped by check.
Until then the static test names the sites still owed, so the gap is visible, never silent, and a finding with no
`fix` prints its `detail` alone.

### §4 `README.md` and the path table in `SLIPWAY.md`

- The path table's "Done when (what fires)" cells name no check id. The id's meaning is written instead ("a check
  blocks every milestone until…"), and the gate table further down keeps the ids, written in code spans, so that
  table is the lookup and §8's `CheckId.yml` does not count it. A test in `scripts/steps.test.mjs` greps the path
  table's rows for the check-id tokens and fails on one.
- `README.md`'s "Then follow the path" section says what `pnpm status` says and no more; its first paragraph drops
  the thesis sentence, which moves to `SLIPWAY.md` where the gate table shows what fires. The option table and the
  failure paragraphs stay.
- The path table and `README.md`'s path section are held at 0 errors and 0 warnings by §8's script; the rest of
  `SLIPWAY.md` (117 bare check ids at 3e532a9, most in the gate table and the Validation section) is counted once
  the gate table is in code spans, and the number goes in this doc's Changes and the ratchet's baseline.

The gate table's `verify` and FO1 rows are #444's; this stage leaves them to it, whichever lands second rebases.

### §5 The questions `/kickoff`, `/bootstrap` and `/close-milestone` ask

Every question these skills put to the owner is written inside double quotes ending `?"`, so the test can find it;
a question described in prose ("ask the owner which…") is rewritten as a quoted one. Each meets: 25 words or fewer;
one question mark; no check id, decision id, lesson id, or a word from the skill's own `## Phase` headings; it names
the project's own thing (a file, a risk, a milestone, a setting) when it asks about one. `scripts/skills.test.mjs`
reads the three files, holds every quoted question to the first three rules, and records a floor per skill (the
count the PR lands: at 3e532a9 the three mention asking 8, 11 and 2 times, and quote 5, 1 and 0), failing below it.
The fourth rule is the PR's list, before and after, one line per question. The three skills' output sections gain one
line: "Before showing or posting, edit against `process/writing.md`." The other eight skills are out of scope for
this stage (§Out of scope).

`/close-milestone`'s retro gains one optional line, worded for the project: "Could you tell what was next, and what
each PR did, without looking anything up? Note what you had to edit." It feeds §9 only in slipway.

### §6 The PR and issue templates

The cut is decided by a count the PR records first, over the last 20 issues filed through intake and every feature
doc on `main`: a section is cut when it holds `none`, a restatement of another section or the template's own text in
16 of 20 (or in four of five docs); below that it stays and the PR says so. The candidates:

- `.github/ISSUE_TEMPLATE/feature.yml` and `bug.yml`: `Seams detail` merges into `Seams`, one field: `none`, with
  one line of why, or who pays, who is counted, who is told, what is promised. I1 reads the merged field; its
  `seams/none-without-reason` and `seams/unenumerated` findings stay, on the one field; a body on the old form, with
  both headings, still passes (the issue-shape workflow runs on `edited`, so old issues meet the new I1).
- `docs/features/TEMPLATE.md`: `## Open questions` is cut. In a project, a question with an owner is a
  `[NEEDS CLARIFICATION]` marker where it sits, which `/clarify` and `pnpm status` read under `docs/`; in slipway's
  own tree nothing reads a marker under `dev/features/`, so a question there is a line under Known limitations
  naming its owner, or an issue. `/log-feature` and `/review-doc` stop writing the section. The template's section
  count goes from 12 to 11, and `scripts/f2.test.mjs` pins it as the number a sync may lower and never raise.
- The designation trailer that appears in filed issues ("Per `process/designation.md` (L-31): is there ground
  truth…") is in no file at 3e532a9: agents copy it from older issues. `process/intake.md`'s designation block gains
  one sentence, "The block is the code block alone, with no sentence after it", and I1 warns on a body whose last
  non-empty line starts `Per `.
- `.github/pull_request_template.md` keeps its three sections (P1 requires each); its comment text is rewritten
  to the form: what to write, one line each, no example that reads as an instruction.

Nothing is added. Existing issues and docs are not edited: a doc with an `## Open questions` section still passes
every check (F1, F2 and R1 read other sections), and merged PR bodies are not read.

### §7 P1 reads the PR title and every commit subject (`ci/checks/meta/p1-pr-body.mjs`, `.github/workflows/pr-body.yml`)

In slipway's own repository only (D-046): the workflow writes `title.txt` (the PR title) and `commits.txt` (one
subject per line, `git log --format=%s base..head`) beside the body when `github.event.repository.is_template` is
true, the inverse of `verify`'s guard. With neither file present the rules below do not run, as the gate-changes
rules do without their sidecar, so a project's P1 is unchanged until a decision ships them. Findings, each with its
`fix`:

- `title/long`, `commit/long:<sha7>`: more than 72 code points.
- `title/id`, `commit/id:<sha7>`: a bare check id, decision id or lesson id as a whole word.
- `title/review-round`, `commit/review-round:<sha7>`: the words `review round` followed by a number, in any case.

A merge commit (`Merge branch`, `Merge pull request`) and a revert (`Revert "`) are skipped by all three subject
rules and named in one warning. The conventional prefix (`type(scope):`) counts toward the 72. Existing history is
never read: only `base..head`. Known-bad fixtures: one body folder per finding kind under `ci/fixtures/known-bad/p1/`,
with `expected.json` rows, and a good case with a merge and a revert subject. A title or subject is other people's
content: printed through `escapeControl`, length computed on the text as written, in code points.

### §8 A Vale prose check (`.vale.ini`, `ci/prose/`, `ci/prose.mjs`, `package.json` `check:prose`, `.github/workflows/ci.yml`, `dev/ownership.yaml`)

- **Where it runs.** A `prose` job in `ci.yml`, on the same two triggers as `meta`, that installs Vale at a pinned
  version with its sha256 checked, then runs `pnpm check:prose`. The job runs only in slipway's own repository
  (`if: github.event.repository.is_template`): a project's docs are not measured yet (D-046). Locally, `pnpm
  check:prose` with no `vale` on the path exits BROKEN, saying `brew install vale` or the release URL: never green
  (decision-defaults §4). It is not a meta check: `ci/checks/` stays zero-dependency (D-004).
- **Two sets of files.** The **held set**, where errors fail and warnings ratchet: `README.md`, `SLIPWAY.md`,
  `BOOTSTRAP.md`, `process/writing.md`, `docs/features/TEMPLATE.md`, `docs/reviews/TEMPLATE.md`,
  `docs/milestones/TEMPLATE.md`, `.github/pull_request_template.md`. The **diff set**, every other markdown file a
  person reads (`process/*.md`, `process/lessons/*.md`, `decisions.md`, `docs/**/*.md` except `docs/reviews/**`,
  `dev/features/*.md`): errors fail on the lines a PR adds, warnings on those lines are printed and never counted.
  Not `.claude/**` (agent text), not fixtures.
- **Errors, which fail:** three rules under `ci/prose/Slipway/`, each with `scope: raw`, so a `<date>` is read as
  text and not as an HTML tag:
  - `Chatbot.yml`: `I hope this helps`, `Great question`, `Certainly!`, `As an AI`, `Let me know if`, `Happy to help`,
    `I'd be happy to`, `Absolutely!`, `Of course!`.
  - `Placeholder.yml`: `<` + lower-case words + `>` (`<date>`, `<main sha>`), `TBD`, `XXX`, `lorem ipsum`. Not in a
    template (a file whose name holds `TEMPLATE` or `_template`) and not in a seeded file (`docs/PRD.md`,
    `docs/product/FRAME.md`, `docs/milestones/M1-walking-skeleton.md`: the `seeded` class in `dev/ownership.yaml`,
    which keeps its placeholders by design); never `[NEEDS CLARIFICATION]`, which is a marker checks read.
  - `Recap.yml`: a paragraph starting `In summary`, `In conclusion`, `To summarize`, `To sum up`, `Overall,`.
- **Warnings, which ratchet on the held set:** `CheckId.yml` (a check id as a word outside code and outside
  brackets), `DecisionId.yml` (`D-` or `PD-` and digits, outside code and outside brackets: §1 rule 2's one rule),
  `Hedge.yml` (`may possibly`, `might potentially`, `could perhaps`, `seems to suggest`), `Verb.yml` (`serves as`,
  `boasts`, `showcases`, `delves`, `underscores`), `Sentence.yml` (a sentence of 35 words or more).
- **The ratchet.** `ci/prose.mjs` runs `vale --output=JSON` over the held set, fails on any error, writes
  `{ "warnings": n }` to a temp report and runs `ci/ratchet.mjs prose <report> warnings`; then runs the three error
  rules over the lines `git diff base...HEAD` adds in the diff set, failing on any, and prints that set's warnings.
  The baseline key `prose` is recorded by the PR that adds the check, with `--update`, at the held set's count that
  day, after §4 has put the gate table's ids in code spans; the path table and README's path section are held at 0
  by the same script, outside the count. `scripts/new-project.mjs` does not seed the `prose` key: a project runs no
  prose job.
- **PR bodies.** In slipway only, the pr-body workflow runs the three error rules on `body.md` after P1, under the
  same `is_template` guard; warnings are printed, never fail. Issue bodies stay with I1: the issue-shape workflow
  does not install Vale.
- **Ownership.** `.vale.ini`, `ci/prose/**`, `ci/prose.mjs`, `ci/fixtures/known-bad/prose/**` and
  `scripts/prose.test.mjs` are classed `internal` in `dev/ownership.yaml`: slipway's own, shipped to no project.
- **Known-bad fixture.** `ci/fixtures/known-bad/prose/` holds one file per rule with the line that trips it, and
  three control lines that raise nothing (a marker, a `<date>` in a file named `TEMPLATE.md`, a check id in a code
  span); `scripts/prose.test.mjs` runs `ci/prose.mjs` on the folder and expects each rule's name in the JSON once,
  and exits BROKEN when `vale` is missing.
- **Review date.** `process/lessons/L-54-docs-lint.md` moves to `enforcement: status: check`, `pointer: ci/prose/`,
  `review-by: 2027-04-14`: L1 reads it, so a word list left alone comes back on that date. Shipping the check to
  projects is a follow-up issue filed by this stage's PR (D-046), linked from this doc's Changes.

### §9 What proves it worked

Measured in slipway's own repository, so the figures live here (D-046). The fixed set: the bodies of the last five
PRs an agent opened on `main`, and one `pnpm status` read cold. The owner reads each as a stranger would and counts
two things: minutes until they can say what the PR did (or what is next), and the edits they would make to the text
before showing it to a colleague. Three readings: before step 1 merges (the baseline, taken by the owner on the set
at 8a5205c), after step 3, after step 7. Each is a dated line in this doc's Changes:
`YYYY-MM-DD · MEASURED · {minutes} min, {edits} edits over 5 PRs and 1 status read · after step {n}`. A reading
flat or worse than the one before stops the next stage until the doc is reshaped. The optional retro line in
`/close-milestone` (§5) is a project's own; nothing in slipway reads it.

Verified against: 8a5205c 2026-10-14 — `ci/status.mjs:271–303` (`next()`'s fourteen branches), `ci/checks/lib/report.mjs`
(`{where, detail}` findings, id-first lines, the `@@json` contract), `ci/checks/meta/pc1-positive-control.mjs`
(compares `where`), `.github/workflows/issue-shape.yml` (the `sed` that reads `I1: …` lines), `.github/workflows/pr-body.yml`
(writes `body.md` and the sidecar only), `ci/checks/lib/steps.mjs` (`STEPS` holds `n` and `name`), `ci/ratchet.mjs`
(name, report, dot path), `ci.yml` (`verify` guarded by `is_template`), `.github/ISSUE_TEMPLATE/feature.yml`
(`seams` and `seams-detail` fields), `docs/features/TEMPLATE.md` (12 sections), `git log --format=%s -200`
(167 subjects over 72, the longest 448), `gh issue list` (28 of 34 open titles over 72). Re-read at 3e532a9 for the
0.1 review: `SLIPWAY.md` holds 117 bare check ids outside code; `scripts/f2.test.mjs:62,70`, `r1.test.mjs:56` and
`lk1.test.mjs:22` assert the old output form; the three skills quote 5, 1 and 0 questions; the designation trailer is
in no file; `dev/ownership.yaml` has no class for a root `.vale.ini`. No `process/writing.md`, `.vale.ini` or `vale`
reference exists in the tree.

## Seams

none: no person, channel or promise is added. Every new rule runs in slipway's own repository until a project's text
has been measured (D-046), so no project's engineer meets one. The time per step on the Next line is the path table's
existing estimate, read from one list.

## Threat model

Beyond baseline, two things read other people's content and one runs a binary:

- A PR title and a commit subject reach P1 from the event. Each is printed through `escapeControl` and never
  run; a length is computed in code points. A subject can hold anything a contributor types.
- Vale reads repository markdown, a PR's committed files among them, and runs only the rule files in the tree
  (`ci/prose/**`, `.vale.ini`): no script rule is used, and a change to those files is a gate change the PR check
  names, as a change to P1 is today. The binary is pinned by version and sha256 in the workflow, never fetched as
  `latest`.
- `ci/prose.mjs` prints file text in findings: through `escapeOutput`, as every check does.

Not defended: a sentence written to pass the rules while saying nothing. §9's readings are for that.

## Known limitations

- The rule lists are a snapshot. Words fall out of fashion; the ratchet keeps the count from rising, not the
  list from going stale. L-54's review date brings it back.
- "Plain" beyond the pinned rules is judgment. A line can pass every rule and still read badly; §9's readings are the
  measure, and the rules are the floor.
- Vale is a binary. `pnpm meta` stays zero-dependency, so the prose check is a CI job of its own and a local
  run needs Vale installed; without it the script is BROKEN, not green.
- The sentence-length rule is a regex over markdown and will miscount a sentence that holds a code span with a
  period in it. A warning, never an error.
- §3 may take two PRs under one issue; until the last check is rewritten, its findings print without a fix line
  and the static test names the sites owed.
- The Next-line form is tested on fixtures; project text inside the quoted spans is excluded from the rules, so a
  milestone title with a semicolon is printed as written.
- Only the Next line has a form test; the other status lines are held by the PR's before/after list and §9.
- This branch's own subjects were written before P1 holds them: one is 77 code points, and history is not rewritten.
- Existing history, issue titles and docs in `docs/reviews/` are never rewritten.

## Acceptance

```
Given process/writing.md
When  node scripts/writing.test.mjs
Then  the file is under 600 words, has 8 numbered rules, and each rule names a Pair: with a file path; the two pointer sentences are in process/intake.md and process/slipway-rules.md
```

```
Given the status fixtures under ci/fixtures/status/
When  node ci/checks/meta/s1-status.mjs ci/fixtures/status
Then  every case's Next line is the §2 text for its case, and with its quoted spans removed: 2 to 4 sentences, first sentence 14 words or fewer, no `;`, no ` — `, no `Step n`, no check id, no decision id, 260 characters or fewer, last sentence naming who
```

```
Given ci/fixtures/known-bad/s1/ holding a Next line with a semicolon and a check id outside any quoted span
When  S1 runs on it
Then  it exits 1 with exactly <case>#next-form, and PC1's expected.json names it
```

```
Given SLIPWAY.md's path table after §2
When  node scripts/steps.test.mjs
Then  each row's who-and-how-long cell equals STEPS[n].who and .time, in plain text with no markup
```

```
Given every findings.push and warnings.push under ci/checks/meta/
When  node scripts/report.test.mjs
Then  each passes a fix key, or is named as owed; and over every finding every check emits on every known-bad fixture under CHECK_JSON=1, detail and fix are each one sentence of 160 characters or fewer ending with a period, no id in either, fix starting with a verb from the list; the printed form is three lines with the id last
```

```
Given an issue body that fails I1
When  the issue-shape workflow comments
Then  the comment holds one bullet per finding with its detail and its Fix line, read from the @@json line
```

```
Given scripts/f2.test.mjs, r1.test.mjs and lk1.test.mjs after §3
When  pnpm meta
Then  each asserts the new summary form (PASS: … (F2)) and passes
```

```
Given SLIPWAY.md's path table after §4
When  node scripts/steps.test.mjs
Then  no "Done when" cell holds a check-id token, and every id in the gate table is inside a code span
```

```
Given the three skills kickoff, bootstrap and close-milestone
When  node scripts/skills.test.mjs
Then  every quoted question ending ?" is 25 words or fewer, has one question mark and no check, decision, lesson id or Phase-heading word; each skill has at least its recorded floor of quoted questions; each output section names process/writing.md
```

```
Given the feature form, the bug form and docs/features/TEMPLATE.md after §6, and the counts the PR recorded
When  node ci/checks/meta/i1-issue-shape.mjs ci/fixtures/known-bad/i1 and pnpm meta
Then  I1 reads one Seams field and still fails none-without-reason and unenumerated; a body with both old headings passes; a body ending with a "Per " line warns; TEMPLATE.md has 11 sections and scripts/f2.test.mjs pins the count; every existing doc under dev/features/ still passes F1, F2 and R1
```

```
Given a PR folder with title.txt of 73 code points, commits.txt holding a 90-character subject, a subject with "K1" as a word, a subject with "review round 2", a merge subject of 100 characters and a revert subject of 100 characters
When  node ci/checks/meta/p1-pr-body.mjs <folder>
Then  it exits 1 with title/long, commit/long, commit/id and commit/review-round, one each, and one warning naming the two skipped subjects; a title of exactly 72 passes; the same folder with no title.txt and no commits.txt runs none of the four
```

```
Given .github/workflows/pr-body.yml after §7
When  it is read
Then  the title and commits files are written only under if: github.event.repository.is_template, and the Vale step on the body is under the same guard
```

```
Given ci/fixtures/known-bad/prose/, one file per rule and three control lines
When  node scripts/prose.test.mjs
Then  each error rule fails its file, each warning rule is counted once, the three controls raise nothing; with vale absent the script exits 2
```

```
Given the held set after §4 and the diff set
When  pnpm check:prose
Then  the path table and README's path section have 0 errors and 0 warnings; the held set has 0 errors and a warning count not above the prose key in ci/baselines.json; the lines this PR adds in the diff set have 0 errors
```

```
Given a PR on slipway's repository whose body holds "I hope this helps"
When  the pr-body workflow runs
Then  it fails on Chatbot, naming the phrase and the fix
```

```
Given dev/ownership.yaml after §8
When  node ci/checks/meta/o1-ownership.mjs . and node scripts/new-project.test.mjs
Then  .vale.ini, ci/prose/**, ci/prose.mjs and the prose fixture are internal, and a new project's ci/baselines.json has no prose key
```

```
Given process/lessons/L-54-docs-lint.md after §8
When  node ci/checks/meta/l1-lessons.mjs .
Then  its status is check, its pointer is ci/prose/ and its review-by is 2027-04-14
```

```
Given this doc's Changes section
When  step 1's PR is opened, and again after step 3 and step 7 merge
Then  it holds a MEASURED line with minutes and edits over 5 PRs and 1 status read, dated, and the stage after a flat or worse reading has not started
```

## Verify

```
pnpm meta                                                        # every check and test, slipway's gate
node scripts/writing.test.mjs                                    # §1: the standard's shape and its two pointers
node ci/checks/meta/s1-status.mjs ci/fixtures/status             # §2: the Next lines, case by case, and the form
node ci/checks/meta/pc1-positive-control.mjs                     # §2, §3, §7, §8: each known-bad fixture fails for its reason
node scripts/report.test.mjs                                     # §3: every push site has a fix; the three-line form, the id last
node scripts/steps.test.mjs                                      # §2, §4: the path table against STEPS; no check id in it
node scripts/skills.test.mjs                                     # §5: the questions, the floor, the writing.md line
node ci/checks/meta/i1-issue-shape.mjs ci/fixtures/known-bad/i1  # §6: one Seams field, old form still passes
node scripts/f2.test.mjs                                         # §6: the template's section count
node ci/checks/meta/p1-pr-body.mjs ci/fixtures/known-bad/p1      # §7: title and subject findings
node scripts/prose.test.mjs                                      # §8: each rule trips once; controls quiet; BROKEN without vale
pnpm check:prose                                                 # §8: 0 errors; warnings not above the baseline
node ci/checks/meta/o1-ownership.mjs .                           # §8: the new files are classed internal
node ci/checks/meta/l1-lessons.mjs .                             # §8: L-54 is a check with a review date
```

## Build map

One PR per stage, in this order; each merges on its own with `pnpm meta` green. Every step changes a gate file
and is reviewed on the strongest tier at `xhigh` (D-035).

1. #456 · `process/writing.md`, its test, the two pointer lines, the status rewrite and the who-and-how-long
   column (§1, §2): `process/`, `ci/status.mjs`, `ci/checks/lib/steps.mjs`, `SLIPWAY.md` (one column),
   `ci/fixtures/status/**`, S1, `scripts/writing.test.mjs`, `scripts/steps.test.mjs`. ~400 lines, most of them
   fixtures. The owner's baseline reading (§9) is a Changes line in this PR.
2. #457 · Check failure messages (§3): `ci/checks/lib/report.mjs`, every `ci/checks/meta/*.mjs`, `issue-shape.yml`,
   `scripts/report.test.mjs`, `f2.test.mjs`, `r1.test.mjs`, `lk1.test.mjs`, `/review-doc` step 1. Large; the format
   first, the messages after, under one issue.
3. #458 · `README.md` and the path table (§4): the two files, `steps.test.mjs`; the gate table's ids into code
   spans. ~150 lines. The second §9 reading follows its merge.
4. #459 · The three skills' questions (§5): `.claude/skills/{kickoff,bootstrap,close-milestone}/SKILL.md`,
   `scripts/skills.test.mjs`. ~200 lines.
5. #460 · The templates (§6): two forms, `TEMPLATE.md`, `process/intake.md`, I1 and its fixtures, `scripts/f2.test.mjs`,
   `/log-feature`, `/review-doc`. ~200 lines.
6. #461 · P1 on titles and subjects (§7): P1, `pr-body.yml`, `ci/fixtures/known-bad/p1/**`; files the two P1 rules
   that wait as a follow-up. ~200 lines.
7. #462 · Vale (§8): `.vale.ini`, `ci/prose/**`, `ci/prose.mjs`, `package.json`, `ci.yml`, `pr-body.yml`,
   `dev/ownership.yaml`, `scripts/new-project.mjs`, the fixture, `scripts/prose.test.mjs`, `ci/baselines.json`,
   `process/lessons/L-54-docs-lint.md`; files the shipping follow-up. ~350 lines. The third §9 reading follows its merge.

## Out of scope

- **Agent honesty checks:** a new dependency must exist and be over 30 days old, a test edited beside its code needs
  a "Tests changed" line, a stop-and-ask rule when tests and spec disagree, coverage on changed lines, `jscpd` and
  `knip` on new findings. Shaped with #51 (product tests must be able to fail), after this feature's first issues
  land. The owner, 2026-10-14.
- **Two more P1 rules from the source note:** a `## What` over about 150 words, and a body naming a file the diff
  does not touch (the note's evidence: such PRs merged 28% of the time against 80%). Tracker: filed by step 6's PR.
- **The other eight skills' output sections** (`/clarify`, `/log-*`, `/work-ticket`, `/review-doc`, `/sync-slipway`,
  `/pr-review`): one "edit against `writing.md`" line each, and `/pr-review`'s scripted casual phrases ("tiny thing",
  "take it or leave it"). A follow-up once stage 4 shows the line is read.
- **Shipping the prose job, the body's chatbot check and P1's title rules to projects.** Slipway only until a real
  project's docs have been measured once (D-046). Tracker: filed by step 7's PR.
- **`sync`'s output:** its own doc, F-08 (`dev/features/cli-output.md`).
- **The site's copy** (`site/index.html`): #355 cut its catch-phrases; #287's run by an outside engineer is the test.
- **`pnpm status` as a parallel plan** (#445): its lines take the §2 form when it is shaped; it follows stage 1.
- **F-15's status lines** (#440): reworded by #456 at the owner's ask of 2026-10-15, to this standard. Ids, who acts, what each blocks and what it waits on are unchanged; §9 measures them with the rest.
- **Existing history, open issue titles, `docs/reviews/`:** left alone.

## Changes

- 2026-10-14 · ADDED · the feature, 8 sections of Contract, 7 build steps · #455 (steps #456 to #462)
- 2026-10-14 · MODIFIED · Version 0.2: the owner's five answers to the 0.1 review (`docs/reviews/2026-10-14-plain-language-0.1.md`, AR-1, AR-2, AR-3, AR-6, AR-11, recorded as D-046); the other eighteen findings taken as spec corrections (AR-4, AR-5, AR-7 to AR-10, AR-12 to AR-23); merged PR bodies are not read for §6 (the owner, 2026-10-14) · #455
- 2026-10-15 · REVIEWED · 0.2 review (`docs/reviews/2026-10-15-plain-language-0.2.md`), 13 findings, the last whole-document review. AR-1 (the placeholder rule read code spans) decided by the owner as a build line in #462: the rule skips code spans and fenced blocks, as the decisions reader does. AR-2 to AR-13 ride #456, #457, #461 and #462 as build lines; the Contract's wording is corrected at the end of the build, in #462's PR · #455
- 2026-10-15 · MODIFIED · the owner's ask for #456: the decision lines `pnpm status` prints since PR #475 (`ci/checks/lib/decision-lines.mjs`) are status text too, so the standard applies to them; only their wording changes. Out of scope below is corrected here; §2's sentence that leaves them as written is corrected with the rest of the Contract at the end of the build, in #462's PR · #456
