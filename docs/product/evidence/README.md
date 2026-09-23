# Evidence

Raw material behind `FRAME.md` Results: one file per interview round or test. Referenced by
directory, never as a list of files.

## Interviews

Ask about specific past behaviour, not opinions about the future. "Tell me about the last time
you…" beats "would you use…". Compliments are not evidence; commitments are — time (a
follow-up), reputation (an introduction), money (a pre-order).

| Date | Who (segment) | Past behaviour, in their words | Commitment given |
|---|---|---|---|

## Tests

One section per risk tested, or one file named `RISK-n-<test>.md`.

```
### RISK-n — <assumption>
Threshold (written <date>, before the test): …
Method: …
Tracked: #n
Window: <yyyy-mm-dd>..<yyyy-mm-dd>
Result (<date>): … — met / not met
Decision: continue · reframe · D-nnn
```

`Tracked:` names the issue (or `OD-`/`D-` id) running the test, and `Window:` when it runs. When FRAME's
Tracker cell names none, `pnpm status` and K1 read `Tracked:` from here, so a test that has an issue shows
as scheduled rather than untested.
