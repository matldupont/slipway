---
id: L-01
date: 2026-09-21
rule: Acceptance criteria are counts, identities, commands or Given/When/Then, never adjectives.
failure: An acceptance criterion written as an adjective ("lower contrast") is met by a change nobody can see.
enforcement:
  status: check
  pointer: i1
---

An adjective is satisfied by any nonzero change. I1 flags adjectives at intake. A criterion that cannot fail, such as "returns 200", passes I1; cold review asks whether each would fail on the broken behaviour.
