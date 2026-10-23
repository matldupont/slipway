# ID2 known-bad fixtures

Each case is the folder `ci/checks/lib/open-pr-ids.mjs` writes in CI: `this.diff`, and `open/<n>.diff` for each other
open pull request. Every file is inert text.

- `clash`: this pull request adds `PD-7` and `F-12`; #41 adds `PD-007` (one id by number) and #52 adds `F-12`. #63
  adds `PD-8`, a different id, and edits the `PD-7` heading in its own diff only as a move (removed and added), so it is
  no finding.
- `heading-text`: #77 adds `## D-3 — SECRET-WORDS-FROM-ANOTHER-PR`; the finding names `#77` and `D-3` only.
  `scripts/id2.test.mjs` checks that none of the heading's other text reaches the output.
