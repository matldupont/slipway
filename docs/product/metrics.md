# <Product> — Metrics

> What "working" means, measured. Started in M1 (the skeleton wires the first events), used
> weekly from the private beta on. An analytics pipeline nobody has seen fire is
> indistinguishable from one that is broken: a signup funnel can be redesigned across several
> PRs with analytics dead, and the weekly review then reads a funnel that records nothing.

## Activation hypothesis

The action (or set of actions, within N days of signup) that we believe predicts a user
sticking around. A hypothesis until real cohorts confirm it: compare retention of users who
did it against those who did not, then replace the guess.

- Hypothesis: <…e.g. completes the core action twice within 7 days…>
- Confirmed on: <…date, cohort size…>

## Events

Name events `object_action`, lowercase snake_case, present tense (`booking_create`,
`signup_complete`). Keep the list short — 8 to 12 before launch. **Never put personal,
financial or health data in event properties**; sensitive data often needs express consent —
check the rules where your users are.

| Event | Fires when | Properties | PII? | Tested by |
|---|---|---|---|---|
| `signup_complete` | <…> | <…> | no | <…e2e test path…> |

## Dashboard

One dashboard: signups, activation rate, weekly retention by cohort, error rate. Link: <…>

## Weekly review

Dated, one line each. Metrics, 3–5 user conversations, and what changes because of them.

| Date | Signups | Activation | W1 / W4 retention | Errors | Conversations | Decision |
|---|---|---|---|---|---|---|

## Product–market fit survey

Monthly, once 40+ people have used the product at least twice in the last two weeks: "How
would you feel if you could no longer use <Product>?" Track the share answering *very
disappointed*; 40% is the usual bar. Spend half the next cycle on what the very-disappointed
love, half on what holds back the somewhat-disappointed whose main benefit matches theirs.
