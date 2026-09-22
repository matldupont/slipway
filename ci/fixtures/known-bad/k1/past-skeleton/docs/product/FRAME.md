---
status: framed
---

# Product — Frame

## Job story

When a client texts to move tomorrow's walk, I want to see my whole day and who still owes me, so I can say yes without double-booking.

## The question it answers

Where do I need to be tomorrow, and who hasn't paid?

## Non-users

Walking companies with dispatchers.

<!-- [NEEDS CLARIFICATION: is this segment real?] -->

## Risks

| ID | Assumption | Category | Impact if wrong | Cheapest test | Threshold (set before) | Result |
|---|---|---|---|---|---|---|
| RISK-1 | Walkers will leave group texts | value | no product | concierge test | 3 of 5 re-engage | 4 of 5 — met |
| RISK-2 | Clients will book in the app | Value | walkers re-key texts | diary study | 3 of 5 | |
| RISK-3 | Slot conflicts resolve fast enough | feasibility | rewrite | spike | p95 < 200 ms | |
| RISK-4 | Walkers will pay monthly | value | no business | fake door | 3% click | D-007 |
| RISK-5 | The add flow is learnable | usability | support load | hallway test | | done |
| RISK-6 | Two walkers share one client list | value, viability | wrong model | interviews | | |
