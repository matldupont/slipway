# Writing standard

For text a person reads or edits: what an agent shows or posts (status, check messages, PR and issue bodies, questions) and what a person edits. Not for skills, `process/intake.md` or `decisions.md`, which instruct agents. "Before" texts are quoted as of `4481f71`.

1. **Action first.** The first line says what to do next, or what changed.
   Pair: `ci/status.mjs` printed "Step 0 (you + agent) — Bootstrap: run /bootstrap (AGENT.md still has placeholders: Timezone; no app yet); BOOTSTRAP.md is the reference." It should print "Run /bootstrap. It fills the 1 setting AGENT.md still needs and sets up the app. You and an agent, 1 to 2 hours."
2. **The project's words.** A check, decision or lesson id follows its plain meaning, in brackets, or is not written. An id outside a code span and outside brackets is bare.
   Pair: `SLIPWAY.md` step 2 says "K1 blocks every milestone past the skeleton until each value risk has a Result". It should say "No milestone past the skeleton can start until each value risk has a result (K1)."
3. **One idea per sentence.** A sentence that needs a semicolon and a parenthesis is two sentences.
   Pair: `ci/status.mjs` chains four clauses in the step 2 line, with a dash, a colon and a parenthesis. It should be "Test RISK-1 with real people. Nothing past the skeleton can start until every value risk has a result. Yours, days to weeks."
4. **Something concrete behind every claim.** A command, a file, a number or an example. With none, cut the claim.
   Pair: `README.md` says "It assumes an engineer is reading the diffs." It should say "It assumes an engineer reads each diff, so every PR body names the commands it ran."
5. **Say what was not done or checked.**
   Pair: `process/lessons/L-36-say-what-was-not-verified.md` is the lesson. A `## Verification` that lists commands and stops reads as complete. One that ends "Not verified: the layout on a phone" is honest.
6. **Keep the owner's words.** Quote what the owner said in an issue or a conversation. Do not paraphrase it.
   Pair: `dev/features/owed-decisions.md` quotes "the owner's word, #440: anything a decision leaves owed must come up by itself". A paraphrase, "the owner wants owed decisions to be visible", loses the part that matters.
7. **Length matches the need.** No recap endings, no throat-clearing, no epigrams.
   Pair: `README.md` says "a rule exists only where something fires." The row in `SLIPWAY.md`'s status table says it with a count: "`check` | 12 | a check or harness rule fires on violation".
8. **Subjects and titles.** A commit subject, a PR title and an issue title are 72 characters or fewer, in plain words, saying what changed for the reader. Review rounds and ids go in the body.
   Pair: commit `3d74d36`, which touched `ci/checks/lib/ratchet.mjs`, has a 149-character subject starting "fix(checks): review round 2 — the id scan's comment says what it takes". It should be "fix(checks): say what the id scan takes (#430)".

No template gains a section without the owner's yes, and a section cut never comes back. The feature template, `docs/features/TEMPLATE.md`, has 12 sections today.
