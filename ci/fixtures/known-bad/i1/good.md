### Problem
Clients wait days to hear whether a walk is confirmed.

### Acceptance
- p95 time-to-confirm < 40% of the booking window
- `pnpm --filter web test` exits 0
- Given two bookings for the same slot within 100 ms, then exactly one is confirmed

### Seams
adds a person

### Seams detail
who pays: client · who is counted: both sides · who is told: the walker · what is promised: a confirmation within the window
