# Decisions

Record decisions here as they are made. This project's own are `PD-<n>`.

## PD-1 — The web app and the API live in one repository *(decided 2026-09-01)*

`apps/web` (the sign-in and home screens) and `apps/api` (the JSON API) share one pnpm workspace.

## PD-2 — Roles live in the identity provider's user metadata *(decided 2026-09-05)*

Each account's role (walker or client) is stored in the identity provider's user metadata, and the web app
reads it from the signed-in session to choose the home screen. No roles table.

## PD-3 — Transactional email goes through one vendor *(decided 2026-09-10)*

Sign-in links and booking reminders are sent through a single email vendor's API, called only from `apps/api`.

## PD-4 — The database is the source of truth for who a user is *(decided 2026-09-18)*

Users and their roles live in the `users` table. The identity provider's SDK is imported in one module only,
`apps/api/src/auth.ts`; nothing else, the web app included, may import it.
