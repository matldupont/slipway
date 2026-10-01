---
id: M1
status: active
kind: mvp
appetite: 2026-09-15..2026-09-28
---

# M1 — Booking

## Contents

1. A walker sees tomorrow's walks (F-01) · #13
   Ran: staging journey "see tomorrow's walks" — staging 2026-09-18 pass
2. A client books a walk (F-02) · #13
   Ran: staging journey "book a walk" — staging 2026-09-18 pass https://github.com/acme/walks/issues/99#issuecomment-3001
3. A walker marks a walk paid (F-03) · #14
   Ran: staging journey "mark a walk paid" — staging 2026-09-18 pass https://github.com/acme/walks/pull/14#issuecomment-3002
4. A client cancels a walk (F-04) · #15
   - owed: staging journey "cancel a walk" — staging
5. Reminders go out the night before (F-05)
   Owed: staging journey "a reminder arrives" — staging
6. A walker exports the week (F-06) · #17
   Owed: staging journey "export the week" — staging
   Ran: staging journey "open the export" — staging 2026-09-18 pass https://github.com/acme/walks/issues/17#issuecomment-3003

## No-gos

- Payments

## Gate

- `pnpm verify` green on main

## Kill criteria

- fewer than 3 of 10 users finish the flow

## Retro

Shipped slices 1-2; cut 3.
