# Adversarial review — <document> <version>

Reviewed: <path to the document> @ <git sha of the commit you read>
Version line: <the document's version line, copied from the file, not from memory>
Review date: <yyyy-mm-dd>
Status: for argument — nothing here is a decision until the owners resolve it

> R1 checks the two lines above against the tree. A review whose version line is no longer in the document
> is stale and turns CI red. Copying the line is the point: it cannot be transcribed without opening the
> file under review.

## Severity

| Level | Meaning |
|---|---|
| S0 | Can invalidate the business or the build. Resolve before writing code. |
| S1 | Loses money, breaks correctness, or breaches a stated principle. Fix in the spec before the affected phase. |
| S2 | A real defect or contradiction. Cheap now, expensive later. |
| S3 | Inconsistency or hygiene. Batch these. |

## Register

| ID | Finding | Sev | Owner | Blocks | Tracker |
|---|---|---|---|---|---|
| AR-1 | | | | | |

Tracker is the issue (`#n`), `OD-` or `D-` id a finding became, filled when the owner files it — so the
finding and the work that resolves it point at each other.

## Findings

### AR-1 — <title>

**Where:** the document's IDs (F-01, OD-3), not its headings.

What is wrong, with the passage quoted.

**Proposed resolution.** A starting position to argue with, not a decision.
