---
status: framed
---

# Product — Frame

## Job story

When month-end comes and the bank statement does not match the books, I want to see which entries are missing, so I can close the month without a day of hunting.

## The question it answers

Which entries are missing from my books this month?

## Risks

| ID | Assumption | Category | Impact if wrong | Cheapest test | Threshold (set before) | Result | Tracker |
|---|---|---|---|---|---|---|---|
| RISK-1 | Bookkeepers need bank reconciliation | value | not usable | | | experience: table stakes | |
| RISK-2 | Month-end is the painful moment | value | wrong moment | | | experience: domain expertise | |
| RISK-3 | Bookkeepers will import statements | value | no data | | | experience: because I said so | |
| RISK-4 | Missing entries matter more than wrong ones | value | wrong question | | | **Experience — creator is the user** | |
