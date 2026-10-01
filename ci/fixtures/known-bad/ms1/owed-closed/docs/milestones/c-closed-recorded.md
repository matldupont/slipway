---
id: M3
status: closed
kind: mvp
appetite: 2026-08-01..2026-08-14
---

# M3 — Booking

## Contents

1. A walker marks a walk paid (F-03) · #14
   Ran: staging journey "mark a walk paid" — staging 2026-08-09 fail https://github.com/acme/walks/issues/14#issuecomment-2002
   Ran: staging journey "mark a walk paid" — staging 2026-08-11 pass https://github.com/acme/walks/issues/14#issuecomment-2003
2. A client cancels a walk (F-04) · #15
   Ran: staging journey "cancel a walk" — staging 2026-08-11 fail https://github.com/acme/walks/issues/15#issuecomment-2004 · bug #21

## No-gos

- Payments

## Gate

- `pnpm verify` green on main

## Kill criteria

- fewer than 3 of 10 users finish the flow

## Retro

Shipped slices 1-2; cut 3.
