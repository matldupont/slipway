# Conventions

The one way this codebase does each recurring thing, with the file that shows it. Read by
agents before writing new code (`/work-ticket`) and by review (`/pr-review`): code that
duplicates an existing helper or breaks a rule written here is a `[FIX]`, citing the line.

**Short, human-written, and grown from real divergences.** Add a row only when two ways of
doing the same thing have appeared, or an agent reached for the wrong one — the same bar as a
lesson. Do not describe the architecture or restate the README: generated overviews make agents
worse, while specific rules like these are followed.

| Concern | The one way | Canonical example | Never |
|---|---|---|---|
| Data fetching | <…> | `<…path…>` | <…> |
| Forms and validation | <…> | `<…path…>` | <…> |
| Errors (client and server) | <…> | `<…path…>` | <…> |
| Money and dates | D-009 | `<…path…>` | floats for money; local time for instants |
| Styling | <…> | `<…path…>` | <…> |
| Shared code | lives in `packages/*`; apps import packages, never the reverse | `<…path…>` | copy a helper between apps |

## Before writing something new

Search for an existing helper, component, hook or type that does it (by behaviour, not only by
name), and cite what you found — or that you searched and found nothing — in the PR. A second
implementation of an existing thing is debt from the day it merges.
