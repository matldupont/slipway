---
id: L-71
date: 2026-10-22
rule: A list of banned or counted phrases is a snapshot of one season's writing, so it carries a review date and is read again on it.
failure: expected, not yet seen — the prose check's rules (ci/prose/Slipway/) go stale: a phrase nobody writes any more is still blocked, or new junk passes because the list never learned it (F-16 §8, 0.3 review AR-3)
enforcement:
  status: prose
  pointer: process/writing.md
  review-by: 2027-04-14
---

The prose check blocks three kinds of unambiguous junk and counts five kinds of warning, all from word lists. Writing habits move within a model generation. The ratchet keeps the warning count from rising; it cannot tell that a list has gone stale. L1 reads `review-by` for a prose lesson, so on 2027-04-14 it fails until someone reads the lists again and moves the date. The reading asks two things: which listed phrase no longer appears anywhere, and which new phrase a cold reader would call junk.
