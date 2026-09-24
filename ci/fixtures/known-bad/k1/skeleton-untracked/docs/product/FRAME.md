---
status: framed
---

# Product — Frame

## Job story

When a client texts to move tomorrow's walk, I want to see my whole day and who still owes me, so I can say yes without double-booking.

## The question it answers

Where do I need to be tomorrow, and who hasn't paid?

## Risks

Written before the Tracker column existed, with Category renamed: the table must still parse, by header
where it matches and by the template's position where it does not.

| ID | Assumption | Type | Impact if wrong | Cheapest test | Threshold (set before) | Result |
|---|---|---|---|---|---|---|
| RISK-1 | Walkers will leave group texts | value | no product | concierge test | 3 of 5 re-engage | |
| RISK-2 | Clients will book in the app | value | walkers re-key texts | diary study | 3 of 5 | |
| RISK-3 | Slot conflicts resolve fast enough | feasibility | rewrite | spike | p95 < 200 ms | |
| RISK-4 | Walkers will pay monthly | value | no business | fake door | 3% click | 4% — met |
| RISK-5 | Walkers invoice weekly | value | wrong billing model | interviews | 4 of 6 | |
| RISK-6 | Walkers accept a deposit | value | no-shows stay unpaid | fake door | 2% click | |
