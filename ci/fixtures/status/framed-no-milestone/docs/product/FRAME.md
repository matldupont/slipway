---
status: framed
---

# Product — Frame

## Job story

When a client texts to move tomorrow's walk, I want to see my whole day and who still owes me, so I can say yes without double-booking.

## The question it answers

Where do I need to be tomorrow, and who hasn't paid?

## Risks

| ID | Assumption | Category | Impact if wrong | Cheapest test | Threshold (set before) | Result | Tracker |
|---|---|---|---|---|---|---|---|
| RISK-1 | Walkers will leave group texts | value | no product | concierge test | 3 of 5 re-engage | 4 of 5 — met | #2 |
| RISK-2 | Clients will book in the app | value | walkers re-key texts | diary study | 3 of 5 | | #7 |
| RISK-3 | Walkers will pay monthly | value | no business | fake door | 3% click | | |
| RISK-4 | Walkers trust the reminder | value | missed walks | reminder trial | 4 of 5 on time | | D-4 |
| RISK-5 | Walkers want invoices | value | wasted build | interviews | 3 of 5 ask | | |
| RISK-6 | A walk fits one slot | value | wrong model | calendar audit | 9 of 10 walks | | #9 |
| RISK-7 | Slot conflicts resolve fast enough | feasibility | rewrite | spike | p95 < 200 ms | | |
