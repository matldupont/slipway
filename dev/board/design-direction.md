# Direction — the milestone board (`pnpm board`)
Surface class: product (inherits the brand primitives of `site/`, with its own product layer)
Date: 2026-11-02

<!-- ui-craft
faces: system-ui, ui-monospace
era: none (inherited brand)
pinned: system-ui, ui-monospace
system: slipway
-->

## Job
Kept open all day on a second screen by the person running the project. At a glance: how far through its time the
milestone is, what is done, running, next and left, what is waiting on them, and what they can hand to agents now,
side by side, with the command to paste.

## From the author
- Pinned: "Follow system" (2026-11-02) → dark is the site's steel ground and orange; light is the same palette on paper.
- Pinned: "easy to look at"; "I'd keep it open on the screen as my living milestone/project board" → read across a
  room, high exposure, so no motion for style and no novelty in behaviour.
- Pinned: "Done / Running / Next / Left", an appetite bar, the gate checklist, a Waiting-on-you panel (the owner's
  hand-kept boards).
- Pinned by the page's content policy: no web fonts, no images fetched, nothing outside the page (`default-src 'none'`).
  The faces are the system's own.
- Assumed: dense is right (a front-end engineer reading it many times a day), and colour never carries a state alone.

## Commitment
> "A slipway's planning rail read across the room: steel ground, hairline rails instead of boxes, every command in
> monospace, and orange only where you must act."

## Reference domains
1. **Shipyard T-card planning board** — cards slotted in vertical rails, a coloured tab on the card's edge. Source of
   the columns as rails and each piece of work as a strip with a left tab, not a boxed card.
2. **Railway departure board** — fixed columns read at a distance, tabular figures, no decoration. Source of the Next
   rows: who · issue · command · model and effort, aligned across rows.
3. **Lines plan station ticks** (shared with the site) — numbered ticks on a hairline. Source of the appetite rail.

## Decisions
- Display and body face: `system-ui` stack. Weight and size carry hierarchy; there is one family.
- Mono: `ui-monospace` stack, for commands, issue numbers, ids, dates and every figure (`tabular-nums`).
- Type ratio: 1.2 (product). Base 15px; steps 12.5 · 15 · 18 · 21.6.
- Colour: oklch. Steel family, hue 250–255, chroma ≤ 0.03, from `site/css/base.css` (`--ground`, `--ink`, `--ink-2`,
  `--ink-3`, `--rule`; paper tokens for light). One signal orange, `oklch(0.76 0.18 55)` on steel and
  `oklch(0.5 0.15 45)` on paper. A cool accent for Running only, `oklch(0.72 0.08 240)` (paper: `oklch(0.45 0.09 240)`).
  Done recedes to `--ink-3`.
- Surface: columns are rails, separated by one hairline (`--rule`). A piece of work is a strip: a 2px left tab in its
  column's colour, text flush-left, a hairline under it. No borders on four sides, no fills behind cards.
- Shape: radius 0 everywhere; depth is never shown, only order and rules.
- Space: base 4px. 4 inside a strip's lines · 8 between a strip's rows · 12 between strips · 24 between panels ·
  40 above the board. Columns collapse to one stack by container query under ~56rem, Next first.
- Motion: none. Signature moment = none moving; the signature is static (below). See Motion gate.
- Texture: station ticks, on the appetite rail only.

## Motion gate
- Rejected — a strip sliding between columns when a swap moves it: seen tens of times a day; data being read does not
  move for style.
- Rejected — the appetite fill growing on load: seen on every swap (every 15 seconds).
- Rejected — a fade on swap: it would flash four times a minute on an idle board.
- Kept — none. A strip that changed in the latest swap carries a static `changed {HH:MM}` label in `--ink-2` until the
  next change: state indication without movement.

## Forbidden here
- Rounded corners, shadows, gradients, glows (the site's glow line stays on the site).
- Four-sided boxes and filled cards; a bento grid.
- Orange for anything but what waits on the owner: the Waiting-on-you panel, a `you` tag, today's tick, and the
  server-stopped line (restarting it is the owner's). Never orange as a fill.
- Colour as the only signal: every column has its name, every strip its state in words, every who tag its text.
- Icons, emoji, avatars, web fonts, external requests.
- Any animation or transition.
- Centred text; raw markdown shown as markdown (`~~x~~`, `**x**`).

## Signature
**The appetite rail:** the milestone's days as station ticks along a hairline, the share of its issues done drawn
under them as a steel bar on the same scale, and today's tick in orange — ahead of or behind time, read in one look.

## Pass two
Same brief with the site's tokens and no reference domains gave a boxed four-column kanban with rounded cards: the
default the T-card rail replaces. The rail survives the disagreement test: someone could prefer cards.

## Verify (at build)
Render with a fixture, screenshot light and dark at 1440px and 390px, run ui-craft's `scripts/check-ui.mjs` and the
`wcag` contrast check on every token pair the page uses.
