# QA plans

Referenced **by directory** (`docs/qa/`), never as a list of files. Per-file references rot; a directory
reference keeps new plans in use without anyone updating a list.

One plan per user-facing surface per environment: a plan's journeys all run in one environment, the one its check
names, and a journey that runs elsewhere gets its own plan (`process/intake.md` → Deferred check). Every journey has a falsifiable expected result — what is on screen, what
was stored, what was sent — never "works".

| Journey | Steps | Expected | Automated by |
|---|---|---|---|
