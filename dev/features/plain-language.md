---
prd-ref: D-016
status: draft
---

# F-16 — Plain language: slipway's own text says what to do next in short, plain terms

Version: 0.1 (2026-10-14)

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
- Of the last 200 commit subjects on `main`, 167 are over 72 characters. The longest is 198. Of 34 open issues,
  28 have a title over 72 characters.
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
feature turns that test into a form checks can fail.

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
the questions a skill asks, a PR or issue body, a commit subject, an issue or PR title. Skills, `process/intake.md`
and the checks' own source comments are agent text and are not held to the form; what they show or post is.

### §1 The standard: `process/writing.md`

One page, under 600 words, eight rules. Each rule is one sentence of instruction and one before/after pair taken
from slipway's own text on `main`, cited by file. The rules, in this order:

1. **Action first.** The first line says what to do next, or what changed. Pair: the Next line above.
2. **The project's words.** A check id or a decision id appears beside its plain meaning, or not at all.
   Pair: step 2's "done when" cell in `SLIPWAY.md`.
3. **One idea per sentence.** A sentence that needs a semicolon and a parenthesis is two sentences. Pair: the step 2
   Next line in `ci/status.mjs` (four clauses).
4. **Something concrete behind every claim.** A command, a file, a number or an example; with none, cut the claim.
5. **Say what was not done or checked.**
6. **Keep the owner's words.** Quote what the owner said in an issue or a conversation; do not paraphrase it.
7. **Length matches the need.** No recap endings, no throat-clearing, no epigrams.
8. **Subjects and titles.** A commit subject, a PR title and an issue title stay under 72 characters, in plain
   words, saying what changed for the reader. Review rounds and ids go in the body. Pair: the `#385` subject above.

Two lines of scope at the top: who it is for (what an agent shows or posts, and what a person edits) and what it is
not for (skills and `process/intake.md`). One line at the end: no template gains a section without the owner's yes,
and a section cut never comes back.

Two pointers so the standard is read: `process/intake.md` → Issue body, "In the project's words" gains one
sentence, "The form follows `process/writing.md`."; `process/slipway-rules.md` → Working rules gains one line,
"What a person reads follows `process/writing.md`: action first, the project's words, one idea per sentence."
Both files are owner-only; the PR says so under Gate changes.

### §2 `pnpm status` and `STATE.md` (`ci/status.mjs`, `ci/checks/lib/steps.mjs`)

**The Next line** is `**Next:** ` followed by two to four sentences: the action, the reason, and who does it and
how long. The form a test holds on every S1 fixture:

- the first sentence is 14 words or fewer and ends with a period;
- no sentence holds `;` or ` — `, the words `Step n`, a check id (the upper-cased prefix of any file under
  `ci/checks/meta/`) or a decision id (`D-` or `PD-` and digits);
- the whole line is 260 characters or fewer, the title excerpts it quotes included (`excerpt()` already caps those);
- the last sentence starts with `You`, `Yours`, `Agent`, `You and an agent` or `A fresh session`.

`STEPS` in `steps.mjs` gains `who` and `time` per step, copied from the path table's "Who, and how long" column;
`scripts/steps.test.mjs` holds the table to the list for those two as it does for the name. The Next line reads them
from there and never spells one itself.

The text per case, replacing `next()`'s branches one for one. `{…}` is filled from the repo as today:

| case | Next line |
|---|---|
| step 0, settings unfilled | `Run /bootstrap. It fills the {n} settings AGENT.md still needs ({names}) and sets up the app. You and an agent, {time}.` |
| step 0, no app | `Run /bootstrap. There is no app yet; it scaffolds one and opens the first PR. You and an agent, {time}.` |
| step 1 | `Run /kickoff to finish docs/product/FRAME.md. Its open questions need an answer or a parked assumption before the frame is done. You, {time}.` |
| step 2 | `Test {RISK-n, title} with real people. Nothing past the skeleton can start until every value risk has a result in docs/product/evidence/. Yours, {time}; an agent prepares the materials.` |
| step 3, no review | `Finish /kickoff, then run /review-doc docs/PRD.md in a new session. The PRD needs a review before it is approved, or the checks go red. You, {time}.` |
| step 3, reviewed | `Resolve the review's findings in docs/PRD.md, then set Status: approved. {version} has its review; a milestone can go active once the PRD is approved. You, {time}.` |
| more than one active | `Set every milestone but one to shaping or closed. {ids} are all active, and the checks stay red until one is. You.` |
| appetite ended | `Close {id} with /close-milestone, kill it, or record an extension. Its appetite ended {date}. You.` |
| active, next item | `Start item {n} of {id} in a fresh session: /log-feature {id}#{n}. "{excerpt}". Agent.` |
| active, every item started | `Finish {id}'s open issues, then run /close-milestone once its gate is green. Every item has an issue. Agent.` |
| active, no numbered id | `Pick the next slice from {id}'s Contents and its lane. Agent.` |
| skeleton shaping | `Activate {id}: set real appetite dates and status: active, then build its first slice. Agent, {time}.` |
| choose the next bet | `Choose the next bet: activate one of {ids} with appetite dates, or shape a new one. You.` |
| nothing shaped | `Shape the next bet from docs/product/metrics.md. No milestone is active or shaped. You, {time}.` |

The step 2 line's two tails today (where thresholds go; a decision to build ahead) move to Needs attention as one line:
`To build ahead of {RISK-n}, record a decision with the cost if wrong and what reopens it, and put its id in the
risk's Result.` The "Meanwhile (yours)" tail on an active milestone's line moves to Also unblocked: `(you) Test
{RISK-n}: {riskLine}.`

**Every other line status prints for a person** (Also unblocked, Needs attention, the per-step lines) starts with
the action or the state, and puts an id in brackets after its meaning: `Decide the frontend framework (D-005, open
since week 1)`, not `Open decision: D-005 Frontend framework (open — week 1)`. The lines F-15 adds (#440, owed
decisions) were reviewed three times at their wording and are left as that Contract says; the cold read at the next
close (§9) measures them with the rest.

Fixtures: every `expect.json` under `ci/fixtures/status/` is rewritten to the new text, each in its own commit so
the diff reads case by case. S1 gains one check, `<case>#next-form`, failing a Next line that breaks the four rules
above, and a known-bad case under `ci/fixtures/known-bad/s1/` holds a line that does.

### §3 Check failure messages (`ci/checks/lib/report.mjs`, every `ci/checks/meta/*.mjs`, `.github/workflows/issue-shape.yml`)

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

Rules a test holds, over every finding every check emits on every known-bad fixture (`CHECK_JSON=1`):

- `detail` and `fix` are each one sentence, 160 characters or fewer, ending with a period;
- neither holds a check id, a decision id or a lesson id (`L-`, `PL-`); `where` may;
- `fix` starts with a verb in the imperative: the test holds a short list (`write`, `add`, `copy`, `remove`,
  `name`, `set`, `run`, `move`, `answer`, `record`, `rename`, `delete`, `keep`, `edit`, `list`, `file`, `say`,
  `cut`, `fill`, `put`, `read`, `give`), extended in the same PR when a message needs another.

The issue-shape workflow stops parsing the text (`sed -n 's/^I1: …'`) and reads the `@@json` line, posting
`detail` and `fix` as one bullet each. `ci/checks/lib/report.mjs`'s own header comment states the three-line form.

Size: 113 `findings.push` and `warnings.push` sites and 19 claims. The format and `report.test.mjs` land first;
the messages follow in the same PR when its diff stays under about 400 lines, otherwise in a second PR under the
same issue, grouped by check. A finding with no `fix` prints its `detail` alone until its check is rewritten, and
the shape test lists the checks still owed, so the gap is visible, never silent.

### §4 `README.md` and the path table in `SLIPWAY.md`

- The path table's "Done when (what fires)" cells name no check id. The id's meaning is written instead ("a check
  blocks every milestone until…"), and the gate table further down keeps the ids: that table is the lookup. A test
  in `scripts/steps.test.mjs` greps the path table's rows for the check-id tokens and fails on one.
- The "Who, and how long" column is the one the Next line reads (§2), so its wording is the form `steps.mjs` holds.
- `README.md`'s "Then follow the path" section says what `pnpm status` says and no more; its first paragraph drops
  the thesis sentence, which moves to `SLIPWAY.md` where the gate table shows what fires. The option table and the
  failure paragraphs stay.
- Both files pass Vale with 0 errors and 0 warnings (§8); the ratchet's baseline excludes them, so a warning there fails.

The gate table's `verify` and FO1 rows are #444's; this stage leaves them to it, whichever lands second rebases.

### §5 The questions `/kickoff`, `/bootstrap` and `/close-milestone` ask

A question to the owner is written in the skill inside double quotes and ends with `?"`. Each one in the three
skills meets: 25 words or fewer; one question mark; no check id, decision id, lesson id or skill phase name;
it names the project's own thing (a file, a risk, a milestone, a setting) when it asks about one. `scripts/skills.test.mjs`
reads the three files and holds every quoted question to the first three rules; the fourth is the PR's list,
before and after, one line per question. The three skills' output sections gain one line: "Before showing or
posting, edit against `process/writing.md`." The other eight skills are out of scope for this stage (§Out of scope).

### §6 The PR and issue templates

Cut, because the last 20 issues filed through intake and the last 20 merged PR bodies fill them with nothing
(the PR records both counts, read with `gh`, before the cut):

- `.github/ISSUE_TEMPLATE/feature.yml` and `bug.yml`: `Seams detail` merges into `Seams`, one field: `none`, with
  one line of why, or who pays, who is counted, who is told, what is promised. I1 reads the merged field; its
  `seams/none-without-reason` and `seams/unenumerated` findings stay, on the one field.
- `docs/features/TEMPLATE.md`: `## Open questions` is cut. A question with an owner is a `[NEEDS CLARIFICATION]`
  marker where it sits, which `/clarify` and `pnpm status` already read; a question with no owner is a line under
  Known limitations. `/log-feature` and `/review-doc` stop writing the section. The template's section count goes
  from 12 to 11 and is written in `writing.md`'s last line as the number a sync may lower and never raise.
- The designation trailer intake skills append ("Per `process/designation.md` (L-31): is there ground truth…")
  is cut from `process/intake.md`'s block; the one line with mode, model, effort and its case stays.
- `.github/pull_request_template.md` keeps its three sections (P1 requires each); its comment text is rewritten
  to the form: what to write, one line each, no example that reads as an instruction.

Nothing is added. Existing issues and docs are not edited: a doc with an `## Open questions` section still passes
every check (F1, F2 and R1 read other sections).

### §7 P1 reads the PR title and every commit subject (`ci/checks/meta/p1-pr-body.mjs`, `.github/workflows/pr-body.yml`)

The workflow writes two more files beside the body: `title.txt` (the PR title) and `commits.txt` (one subject per
line, `git log --format=%s base..head`). With neither file present the rules below do not run, as the gate-changes
rules do without their sidecar. Findings, each with its `fix`:

- `title/long`, `commit/long:<sha7>`: over 72 code points.
- `title/id`, `commit/id:<sha7>`: a bare check id, decision id or lesson id as a whole word. A merge commit (`Merge
  branch`, `Merge pull request`) and a revert (`Revert "`) are skipped and said so in a warning.
- `title/review-round`, `commit/review-round:<sha7>`: the words `review round` followed by a number, in any case.

The conventional prefix (`type(scope):`) counts toward the 72. Existing history is never read: only `base..head`.
Known-bad fixtures: one body folder per finding kind under `ci/fixtures/known-bad/p1/`, with `expected.json` rows,
and a good case with a merge and a revert subject. A title or subject is other people's content: printed through
`escapeControl`, length computed on the escaped text's code points.

### §8 A Vale prose check (`.vale.ini`, `ci/prose/`, `ci/prose.mjs`, `package.json` `check:prose`, `.github/workflows/ci.yml`)

- **Where it runs.** A `prose` job in `ci.yml`, on the same two triggers as `meta`, that installs Vale at a pinned
  version with its sha256 checked, then runs `pnpm check:prose`. The job runs only in slipway's own repository
  (`if: github.event.repository.is_template`, the inverse of `verify`'s guard): a project's docs are not measured
  yet (§Out of scope). Locally, `pnpm check:prose` with no `vale` on the path exits BROKEN, saying `brew install
  vale` or the release URL: never green (decision-defaults §4). It is not a meta check: `ci/checks/` stays
  zero-dependency (D-004).
- **What it reads.** `README.md`, `SLIPWAY.md`, `BOOTSTRAP.md`, `process/*.md`, `process/lessons/*.md`,
  `decisions.md`, `docs/**/*.md` except `docs/reviews/**` (a review is a record, never edited), `dev/features/*.md`,
  `.github/pull_request_template.md`. Not `.claude/**` (agent text), not fixtures.
- **Errors, which fail:** three rules under `ci/prose/Slipway/`:
  - `Chatbot.yml`: `I hope this helps`, `Great question`, `Certainly!`, `As an AI`, `Let me know if`, `Happy to help`,
    `I'd be happy to`, `Absolutely!`, `Of course!`.
  - `Placeholder.yml`: `<` + lower-case words + `>` (`<date>`, `<main sha>`), `TBD`, `XXX`, `lorem ipsum`; not in a file
    whose name holds `TEMPLATE` or `_template`, and never `[NEEDS CLARIFICATION]`, which is a marker checks read.
  - `Recap.yml`: a paragraph starting `In summary`, `In conclusion`, `To summarize`, `To sum up`, `Overall,`.
- **Warnings, which ratchet:** `CheckId.yml` (a bare check id as a word, outside code), `DecisionId.yml` (`D-` or
  `PD-` and digits outside code, not followed by a plain meaning on the same line in brackets: the rule flags every
  bare one and the ratchet holds the count), `Hedge.yml` (`may possibly`, `might potentially`, `could perhaps`,
  `seems to suggest`), `Verb.yml` (`serves as`, `boasts`, `showcases`, `delves`, `underscores`), `Sentence.yml`
  (a sentence of 35 words or more).
- **The ratchet.** `ci/prose.mjs` runs `vale --output=JSON` over the files above, fails on any error, writes
  `{ "warnings": n }` to a temp report and runs `ci/ratchet.mjs prose <report> warnings`. The baseline key `prose` is
  recorded by the PR that adds the check, with `--update`, at the count that day; `README.md` and `SLIPWAY.md` are
  held at 0 by the same script (§4), outside the count. Each PR after that lowers it or leaves it.
- **PR bodies.** The pr-body workflow runs the three error rules on `body.md` after P1; warnings are printed, never
  fail. Issue bodies stay with I1: the issue-shape workflow does not install Vale.
- **Known-bad fixture.** `ci/fixtures/known-bad/prose/` holds one file per rule with the line that trips it;
  `scripts/prose.test.mjs` runs `ci/prose.mjs` on the folder and expects each rule's name in the JSON once, and
  exits BROKEN when `vale` is missing. The rule files carry a `review-by` date (2027-04-14) in a header comment,
  and L1's reviewer line in `process/lessons/README.md` names it: a word list left alone goes stale.

### §9 What proves it worked

At each `/close-milestone`, the owner opens `pnpm status` and five recent PRs cold and answers: could I tell what is
next and what each PR did in under a minute, without a lookup? The retro records yes or no, and how much of the
agent's writing was edited. This is the test the owner set; the checks above are what keep the text there between
closes. The retro line is a sentence in `/close-milestone`'s retro section, added in §5's PR.

Verified against: 8a5205c 2026-10-14 — `ci/status.mjs:271–303` (`next()`'s fourteen branches), `ci/checks/lib/report.mjs`
(`{where, detail}` findings, id-first lines, the `@@json` contract), `ci/checks/meta/pc1-positive-control.mjs`
(compares `where`), `.github/workflows/issue-shape.yml` (the `sed` that reads `I1: …` lines), `.github/workflows/pr-body.yml`
(writes `body.md` and the sidecar only), `ci/checks/lib/steps.mjs` (`STEPS` holds `n` and `name`), `ci/ratchet.mjs`
(name, report, dot path), `ci.yml` (`verify` guarded by `is_template`), `.github/ISSUE_TEMPLATE/feature.yml`
(`seams` and `seams-detail` fields), `docs/features/TEMPLATE.md` (12 sections), `git log --format=%s -200`
(167 subjects over 72), `gh issue list` (28 of 34 open titles over 72). No `process/writing.md`, `.vale.ini` or
`vale` reference exists in the tree.

## Seams

none: no person, channel or promise is added. The time per step on the Next line is the path table's existing
estimate, read from one list, not a new promise.

## Threat model

Beyond baseline, two things read other people's content and one runs a binary:

- A PR title and a commit subject reach P1 from the event. Each is printed through `escapeControl` and never
  run; a length is computed on the escaped text. A subject can hold anything a contributor types.
- Vale reads repository markdown, a PR's committed files among them. Vale matches text and runs nothing from it;
  its config (`.vale.ini`, `ci/prose/**`) is under `ci/**` and the root, so a change to the rules is a gate change
  the PR check names. The binary is pinned by version and sha256 in the workflow, never fetched by `latest`.
- `ci/prose.mjs` prints file text in findings: through `escapeOutput`, as every check does.

Not defended: a sentence written to pass the rules while saying nothing. The cold read at close (§9) is for that.

## Known limitations

- The rule lists are a snapshot. Words fall out of fashion; the ratchet keeps the count from rising, not the
  list from going stale. The `review-by` date and L1 bring it back.
- "Plain" beyond the pinned rules is judgment. A line can pass every rule and still read badly; the owner's
  cold read at close is the measure, and the rules are the floor.
- Vale is a binary. `pnpm meta` stays zero-dependency, so the prose check is a CI job of its own and a local
  run needs Vale installed; without it the script is BROKEN, not green.
- The sentence-length rule is a regex over markdown and will miscount a sentence that holds a code span with a
  period in it. A warning, never an error.
- §3 may take two PRs under one issue; until the last check is rewritten, its findings print without a fix line
  and the shape test says which checks are owed.
- Existing history, issue titles and docs in `docs/reviews/` are never rewritten.

## Acceptance

```
Given the status fixtures under ci/fixtures/status/
When  node ci/checks/meta/s1-status.mjs ci/fixtures/status
Then  every case's Next line is the §2 text for its case, 2 to 4 sentences, first sentence 14 words or fewer, no `;`, no ` — `, no `Step n`, no check id, no decision id, 260 characters or fewer, last sentence naming who
```

```
Given ci/fixtures/known-bad/s1/ holding a Next line with a semicolon and a check id
When  S1 runs on it
Then  it exits 1 with exactly <case>#next-form, and PC1's expected.json names it
```

```
Given every known-bad fixture under ci/fixtures/known-bad/
When  CHECK_JSON=1 node ci/checks/meta/<check>.mjs <fixture> for each check
Then  every finding has detail and fix, each one sentence of 160 characters or fewer ending with a period, no id in either, fix starting with a verb from the list; the printed form is three lines with the id last
```

```
Given an issue body that fails I1
When  the issue-shape workflow comments
Then  the comment holds one bullet per finding with its detail and its Fix line, read from the @@json line
```

```
Given SLIPWAY.md's path table
When  node scripts/steps.test.mjs
Then  no "Done when" cell holds a check-id token, and each row's who and time equal STEPS[n].who and .time
```

```
Given the three skills kickoff, bootstrap and close-milestone
When  node scripts/skills.test.mjs
Then  every quoted question ending ?" is 25 words or fewer, has one question mark and no check, decision, lesson or phase id, and each output section names process/writing.md
```

```
Given the feature form, the bug form and docs/features/TEMPLATE.md after §6
When  node ci/checks/meta/i1-issue-shape.mjs ci/fixtures/known-bad/i1 and pnpm meta
Then  I1 reads one Seams field and still fails none-without-reason and unenumerated; TEMPLATE.md has 11 sections; every existing doc under dev/features/ still passes F1, F2 and R1
```

```
Given a PR folder with title.txt of 73 code points, commits.txt holding a 90-character subject, a subject with "K1" as a word, a subject with "review round 2", a merge subject and a revert subject
When  node ci/checks/meta/p1-pr-body.mjs <folder>
Then  it exits 1 with title/long, commit/long, commit/id and commit/review-round, one each, and a warning naming the two skipped subjects; the same folder with no title.txt and no commits.txt runs none of the four
```

```
Given ci/fixtures/known-bad/prose/, one file per rule
When  node scripts/prose.test.mjs
Then  each error rule fails its file and each warning rule is counted once; with vale absent the script exits 2
```

```
Given README.md and SLIPWAY.md after §4, and the rest of the files §8 lists
When  pnpm check:prose
Then  README.md and SLIPWAY.md have 0 errors and 0 warnings; the other files have 0 errors and a warning count not above the `prose` key in ci/baselines.json
```

```
Given a PR whose body holds "I hope this helps"
When  the pr-body workflow runs
Then  it fails on Chatbot, naming the phrase and the fix
```

```
Given this feature's seven PRs
When  each is opened
Then  its title and every commit subject are under 72 characters, name no bare id and no review round: the first PRs by hand, the last two by P1
```

```
Given the next /close-milestone after the last stage lands
When  the owner reads pnpm status and five PRs cold
Then  the retro holds a yes or no to "what is next, and what each PR did, in under a minute" and the edit count
```

## Verify

```
pnpm meta                                                        # every check and test, slipway's gate
node ci/checks/meta/s1-status.mjs ci/fixtures/status             # §2: the Next lines, case by case
node ci/checks/meta/pc1-positive-control.mjs                     # §2, §3, §7, §8: each known-bad fixture fails for its reason
node scripts/report.test.mjs                                     # §3: the three-line form, the id last
node scripts/steps.test.mjs                                      # §4: the path table against STEPS, who and time
node scripts/skills.test.mjs                                     # §5: the questions, the writing.md line
node ci/checks/meta/i1-issue-shape.mjs ci/fixtures/known-bad/i1  # §6: one Seams field
node ci/checks/meta/p1-pr-body.mjs ci/fixtures/known-bad/p1      # §7: title and subject findings
node scripts/prose.test.mjs                                      # §8: each rule trips once; BROKEN without vale
pnpm check:prose                                                 # §8: 0 errors, warnings not above the baseline
```

## Build map

One PR per stage, in this order; each merges on its own with `pnpm meta` green.

1. `process/writing.md`, the two pointer lines, and the status rewrite (§1, §2): `process/`, `ci/status.mjs`,
   `ci/checks/lib/steps.mjs`, `ci/fixtures/status/**`, S1. ~350 lines, most of them fixtures.
2. Check failure messages (§3): `ci/checks/lib/report.mjs`, every `ci/checks/meta/*.mjs`, `issue-shape.yml`,
   `scripts/report.test.mjs`. Large; the format first, the messages after, under one issue.
3. `README.md` and the path table (§4): the two files, `steps.test.mjs`. ~120 lines.
4. The three skills' questions (§5): `.claude/skills/{kickoff,bootstrap,close-milestone}/SKILL.md`,
   `scripts/skills.test.mjs`. ~150 lines.
5. The templates (§6): two forms, `TEMPLATE.md`, `process/intake.md`, I1, `/log-feature`, `/review-doc`. ~150 lines.
6. P1 on titles and subjects (§7): P1, `pr-body.yml`, `ci/fixtures/known-bad/p1/**`. ~200 lines.
7. Vale (§8): `.vale.ini`, `ci/prose/**`, `ci/prose.mjs`, `package.json`, `ci.yml`, `pr-body.yml`, the fixture,
   `scripts/prose.test.mjs`, `ci/baselines.json`. ~300 lines.

Steps 1 to 5 change files the harness asks about (`ci/**`, `process/`, `.claude/skills/**`, the forms); every PR
carries `## Gate changes`. Steps 6 and 7 change what the gate runs, so `/work-ticket` reviews them on the strongest
tier at `xhigh` (D-035).

## Out of scope

- **Agent honesty checks:** a new dependency must exist and be over 30 days old, a test edited beside its code needs
  a "Tests changed" line, a stop-and-ask rule when tests and spec disagree, coverage on changed lines, `jscpd` and
  `knip` on new findings. Shaped with #51 (product tests must be able to fail), after this feature's first issues
  land. The owner, 2026-10-14.
- **The other eight skills' output sections** (`/clarify`, `/log-*`, `/work-ticket`, `/review-doc`, `/sync-slipway`,
  `/pr-review`): one "edit against `writing.md`" line each, and `/pr-review`'s scripted casual phrases ("tiny thing",
  "take it or leave it"). A follow-up once stage 5 shows the line is read.
- **Shipping the prose check to projects.** The job runs in slipway only until a real project's docs have been
  measured once (the next close under #379, or #287's notes); then a decision on the baseline sync records.
- **`sync`'s output:** its own doc, F-08 (`dev/features/cli-output.md`).
- **The site's copy** (`site/index.html`): #355 cut its catch-phrases; #287's run by an outside engineer is the test.
- **`pnpm status` as a parallel plan** (#445): its lines take the §2 form when it is shaped; it follows stage 1.
- **F-15's status lines** (#440): reviewed at their wording; measured at the next close, not rewritten here.
- **Existing history, open issue titles, `docs/reviews/`:** left alone.

## Open questions

none

## Changes

- 2026-10-14 · ADDED · the feature, 8 sections of Contract, 7 build steps · #TBD
