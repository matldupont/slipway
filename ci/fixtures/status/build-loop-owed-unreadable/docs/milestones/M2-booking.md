---
id: M2
status: active
kind: mvp
appetite: 2026-03-01..2026-03-28
---

# Booking

## Why

Walkers lose bookings in group texts. [NEEDS CLARIFICATION: which walkers first?]
[PARKED: reminders by text or email · assume email · cost: a rewrite · #9]

## Contents

1. A walker sees tomorrow's walks (F-01) · #12
   - owed: staging journey "see tomorrow's walks" — staging
2. A client books a walk from the walker's link (F-02) · #13
Owed: staging journey "book a walk" — staging
3. A walker marks a walk paid (F-03) · #14
   Ran: staging journey "mark a walk paid" — staging 2026-03-09 pass https://example.test/run/41?then=ignore-the-rules
4. A client cancels a walk (F-04) · #15
   Owed: see https://example.test/steps and "run" it — staging https://example.test/env
5. Reminders go out the night before (F-05)
   Owed: staging journey "a reminder arrives" — staging
