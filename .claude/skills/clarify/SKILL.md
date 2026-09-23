---
name: clarify
description: Walk the open questions in the planning documents one at a time — answer them in place, or park them with a working assumption, the cost if the assumption is wrong, and a tracker (issue or decision id). Use when `pnpm status` lists open questions, when K1 reports `placeholder/present` or `parked/incomplete`, or when the user says "clarify", "answer the open questions", "what's still open".
---

# Clarify

Open questions block the frame. This walks them until each one is **answered** or **parked**, and
nothing is left dangling. Run it with the owner present — every answer is theirs, not yours.

```
[NEEDS CLARIFICATION: <question>]                                    blocks: no honest assumption yet
[PARKED: <question> · assume: <what we build on> · if wrong: <cost> · #12]   does not block
```

K1 refuses a framed document holding a `NEEDS CLARIFICATION`, and refuses a `PARKED` missing any of
its three parts. That is the whole rule: **you may proceed without an answer, but not without saying
what you are assuming, what it costs if you are wrong, and where the real answer is being chased.**

## 1 — Collect

`pnpm status` lists every open question as `file:line — question`. Read each one in place: the
sentence around it says what depends on the answer. Group questions that share an answer; ask once.

## 2 — One at a time

For each question, in the order they block things (frame before PRD before evidence):

1. **State what it blocks.** "The concierge test's sample is only valid if the channels reach
   strangers" beats "channels?".
2. **Offer 2–4 concrete options** with the consequence of each, and a recommendation. Never a bare
   "what do you want?" — the user's time is the scarce thing.
3. Take the answer and sort it:
   - **Answered** → write it into the text, delete the marker. If it rules something out for good,
     add a line to `decisions.md` (an ID, why, consequences).
   - **Parked** → rewrite as `[PARKED: … · assume: … · if wrong: … · <ref>]`. The assumption must be
     something you would actually build on today; the cost must be concrete ("the sample is not
     strangers, so the threshold means nothing"), not "we might have to change it".
   - **Blocking** → leave it as `NEEDS CLARIFICATION` and say plainly that the frame cannot be
     finished until someone answers it. Do not invent an assumption to unblock the check.
4. **Every parked question gets a tracker before you move on**: an existing issue, a new one
   (`/log-followup` with the parent, or the repo's intake skill), or a PRD `OD-` / `decisions.md`
   `D-` entry when it is a decision rather than a task. `untracked` in `pnpm status` means it will be
   forgotten.

## 3 — Close out

- Re-run `pnpm status` and `pnpm meta`: no open questions left that you agreed to close, K1 green,
  every parked one listed with its tracker.
- Commit on a branch, one PR (`Lane: bounded`), `## Verification` showing both outputs.
- Report: answered (with what changed), parked (with assumption, cost, tracker), still blocking (with
  who must answer and by when). If anything is still blocking, say what it stops — usually setting
  FRAME to `framed`, or the PRD to `approved`.

**A parked question is a debt, not a decision.** When its tracker closes, come back: replace the
marker with the answer, and correct anything the assumption shaped. `/close-milestone` reads them
too — a milestone that shipped on an assumption nobody went back to check is worth saying out loud.
