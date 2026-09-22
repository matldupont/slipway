---
name: kickoff
description: Turn a loose PRD, notes or an idea into this template's planning spine — FRAME.md (job story, the question the product answers, risks), a riskiest-assumption test, a PRD with stable IDs, week-1 decisions, and shaped milestones — ending in a readiness gate. Use at steps 1–3 of SLIPWAY.md, when the user says "kick off", "start the project", "here's my PRD", or when `pnpm status` says the frame or shape is unfinished.
---

# Kickoff

Steps 1–3 of the slipway path (`SLIPWAY.md`): **Frame → Test the risk → Shape.** Output is files in this repo,
never a chat summary. One question at a time; the user owns every answer.

Before anything: run `pnpm status` and read it. If it reports a later step, say so and stop —
kickoff is not a way to re-plan a running project (that is a new milestone, via
`docs/milestones/TEMPLATE.md`).

Read, in this order and nothing more: the user's input, `docs/product/FRAME.md`,
`docs/PRD.md`, `decisions.md`, `docs/milestones/TEMPLATE.md`,
`docs/milestones/M1-walking-skeleton.md`. Search `process/lessons/` for anything touching
planning (`grep -l -i "plan\|scope\|acceptance\|decision" process/lessons/*.md`) and apply
what is there.

## Rules

- **Ask, one question per message.** Offer 2–4 concrete options with a recommendation when
  you can. Never ask what the input already answers.
- **Nothing invented.** Anything the user has not said and you cannot derive goes into the
  file as `[NEEDS CLARIFICATION: <question>]`, never as a plausible guess.
- **Constraints vs preferences.** When the user states something, ask only if it is unclear
  which one it is (L-39).
- **Stay under a page per artifact.** FRAME is one page; each milestone is one screen.
- Write each file as soon as its phase ends, so the user can read and edit it.

## Phase 1 — Frame (`docs/product/FRAME.md`)

Work through, in order:

1. **The moment.** "When does someone reach for this?" Get a situation, not a persona.
2. **The job story.** Draft "When …, I want to …, so I can …" and have the user correct it.
   The outcome is a change in their life, not a feature.
3. **The question it answers.** One line, in the user's words — e.g. for a dog walkers'
   scheduling app: "Where do I need to be tomorrow, and who hasn't paid?" Test it: every feature in the loose PRD
   either serves this question or is marked for later. Show the user that sort.
4. **Four forces.** Push, pull, anxiety, habit. Push hard on habit: what do they do today,
   precisely? That is the competitor.
5. **Non-users.** Who is this deliberately not for?
6. **Press release and hard questions.** Draft them; the user edits. If the release cannot
   say why this beats the habit, stop and say so — the idea is not ready.
7. **Risks.** List 4–8 assumptions that could kill it, each tagged value / usability /
   feasibility / viability / ethical. Rank by impact × how little evidence exists. Propose
   the cheapest test for the top value risk — interviews about past behaviour, a concierge
   run done by hand, a fake door — and ask the user for the **Threshold** before anything
   runs. Leave Result empty.

Write FRAME.md with `status: draft`. When no placeholder or clarification remains, ask the
user to confirm, then set `status: framed`.

## Phase 2 — Test the risk (`docs/product/evidence/`)

You cannot run interviews; the user can. Produce what they need:

- an interview guide: 6–8 questions about specific past behaviour ("tell me about the last
  time you…"), no pitching, no "would you use";
- a results table and the threshold, copied from FRAME, dated today;
- for a concierge test: exactly what the user will do by hand, for how many people, for how
  long.

Tell the user plainly: **no milestone past the walking skeleton can start (K1) until each value
risk has a Result or a recorded override (`D-nnn`).** The skeleton may be built in parallel
with the test. When results come back, record them in FRAME's Result column and in
`evidence/`; if the threshold was missed, the options are reframe (back to phase 1) or proceed
anyway with a decision in `decisions.md` that says why.

## Phase 3 — Shape

1. **PRD (`docs/PRD.md`).** Fill it from the input and FRAME: stable IDs everywhere (PRIN-,
   F-, OD-, RISK- reused from FRAME). Features that do not serve the question in FRAME go to
   §4 *Out, explicitly* with where they go. Every open decision gets a working assumption and
   impact-if-wrong; only business-invalidating ones are BLOCKING.
2. **Week-1 decisions (`decisions.md`).** Walk the entries marked *(week 1)*. For each: decide
   with the user, or defer with the event that reopens it. These are the expensive-to-reverse
   choices; do not let one slide into month three. Once D-005–D-008 are decided, rewrite the
   `Stack:` line at the top of `CLAUDE.md` to state the decided stack — agents read it first.
3. **Milestones (`docs/milestones/`).** M1 is always the walking skeleton — fill its
   placeholders with this product's thinnest core path. Then 2–4 more from the template:
   typically an MVP that answers the question for a handful of real users, then what it takes
   to charge or launch. Each gets an appetite (days or weeks, not a date guess), vertical
   slices, no-gos (move most of the loose PRD here), rabbit holes, a gate that can go red, and
   kill criteria written now. All stay `status: shaping`.
4. **Readiness gate.** Re-read M1 and M2 as the engineer who must build them. For each slice
   ask: can it be built without inventing a decision nobody recorded? Report:

   ```
   Readiness: PASS | CONCERNS | FAIL
   - <slice>: <decision that would have to be invented> → OD-n / D-n created
   ```

   Every concern becomes an OD- in the PRD (with a working assumption) or a D- entry. FAIL
   means a BLOCKING question is open; say who must answer it.

## Hand-off

1. Bump the PRD `Version:` and add a change-log line.
2. Tell the user to get the adversarial review **from a fresh session** — not this one:
   `docs/reviews/TEMPLATE.md`, pinned to the PRD version line (R1 checks it). The author's
   context is the thing a reviewer must not share.
3. Run `pnpm meta` and `pnpm status`; paste both. `status` should now point at step 4 or at
   the risk test.
4. Commit on a branch and open a PR whose `## Verification` shows those two outputs.

Stop there. Starting M1 is the user's call: they set its appetite dates and `status: active`.
