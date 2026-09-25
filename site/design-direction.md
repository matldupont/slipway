# Direction — slipway single-page site
Surface class: marketing
Date: 2026-09-23

## Job
Tell a skeptical engineer — one who has watched a coding agent report "done" on work that was never run —
what slipway is, what a week with it looks like and whether it fits their project, in plain words, so
they can decide in five minutes whether to try it.

## Revisions
- **2026-09-24, owner:** neutral grey read as "pure grey". The ground moved to the steel blue of the mark's
  own metal (oklch 0.245 0.028 255) and the owner kept it; it is shared by all three designs. Orange use
  widened in the manual (headline, numerals, markers, one full band), which retires the manual's original
  "orange is never a fill" rule.
- **2026-09-24, owner:** voice is the candid builder (first person, real incidents) with occasional dry
  lines. Three designs were compared with identical copy; the owner chose this one (Manual) on
  2026-09-24. Styles: `css/base.css` (brand tokens, resets), `css/manual.css` (everything else).

## Pinned by the brief (not up for divergence)
- The slipway assets: the graphite ramp mark, the lockup, the orange glow line.
- The colour scheme they carry: charcoal ground (#2c2c2c, sampled from the asset background so the
  images sit on the page without a seam), paper-white wordmark ink, one orange.
- Plain language: answer the engineer's questions; no jargon, no AI-speak.

## Commitment
> "A 1970s standards manual for a shipyard: numbered sections hung in a margin column, flush-left type on
> a strict grid, no boxes at all — and the only colour on the page is the orange line where something
> fires."

## Reference domains
1. **Naval architecture lines plan** (technical drawing) — hairline stations along a baseline, numbered
   ticks, the hull drawn in one line weight. Source of the stepped ramp diagram and the tick motif.
2. **1970s corporate standards manual** (editorial/print, e.g. transit and agency graphics manuals) —
   numbered sections (1.0, 2.0), hanging numerals in a narrow margin column, specimen plates with
   captions, everything flush-left, one family doing the hierarchy.
3. **Slipway launch practice** (the subject's own world) — the ship sits on the ramp until it is proven,
   then goes down it once. The orange line is the waterline: the moment of launch.

Era: **1970s corporate identity** — as a constraint on gestures (strict modular grid, few weights,
generous margins, numbered sections, no ornament), not as retro costume.

## Decisions
- **Display face: Saira** (variable, `wdth` 50–125). Its squared bowls match the lockup's wordmark, so the
  headings read as the brand without redrawing it; the condensed width sets the big hanging section
  numerals. The safe option — a neutral grotesque — would make the wordmark the only branded type on the
  page.
- **Body face: Archivo** (variable). A grotesque with 1970s American-gothic roots, at normal width for
  reading. Relationship to Saira: both grotesques, Archivo carries the reading, Saira carries identity.
- **Mono: Martian Mono** — commands and step codes only. Squarish, so it sits with Saira; chosen over the
  dev-site default monos.
- **Type ratio: 1.414** (marketing, wide). Hanging numerals are off-scale on purpose.
- **Colour: oklch, neutral grey family (chroma 0 to 0.01), one orange** — `oklch(0.74 0.18 58)` —
  sampled from the glow line. The orange's chroma is the only chroma on the page.
- **Surface:** there are no containers. The grid is the container: a narrow margin column carries the
  section number, the text column carries the answer. Peers in a list hang from a numeral, not a box.
  One section is a **paper plate** — the page inverted to paper-white stock with charcoal ink, like a
  specimen plate in a manual — for the table of failures and what catches each one.
- **Motion:** signature moment = the orange launch line draws out along the bottom of the ramp diagram
  as it scrolls into view (scroll-driven, static fallback, off under reduced motion). Everything else is
  still.
- **Texture:** station ticks — a short numbered tick rule, like the stations on a lines plan, under each
  section number. Used for sections only.

## Forbidden here
- No rounded corners anywhere (the images keep their own shapes).
- No boxes: no cards, no bordered panels, no bento, no three-up feature grid.
- No fake terminal windows (title bars, traffic-light dots). Commands are set type.
- Orange is a line or a short label on charcoal. Never a fill, never a button background, never on paper.
- No gradients except the photographed mark's own lighting and the one glow on the launch line.
- No drop shadows.
- No centred text blocks — everything flush-left to the grid.
- No icons or emoji.
- No marketing verbs: supercharge, unlock, seamless, effortless, AI-powered, 10x, "ship faster".

## Signature
**The launch ramp:** the eight steps of the path drawn as the mark's own stepped ramp in hairline, each
tread labelled with the step, who does it and how long — ending in the orange line, which draws out as
you reach it.

## Pass two — what changed after the similar-prompt test
Generic "landing page for a developer tool" returns: dark ground, neon accent glow, a fake terminal
window, a bento grid of features, a mono font everywhere, a centred hero with "Ship faster". The dark
ground and orange are pinned by the brand, so the divergence has to come from everything else: removed
the terminal window and bento outright (Forbidden), moved mono to commands only, made the headings the
engineer's literal questions in a numbered manual structure instead of feature names, and kept the glow
to a single line. Removed before shipping: a planned grain overlay on the ground — the photographed mark
already carries the material, and grain on top was a second texture.



## Designs explored and not chosen (2026-09-24)
Two other directions were built with identical copy and compared behind a switcher, then removed:
- **Machined object**: the logo render as a centred product shot, Archivo at `wdth 125`/800 for all
  display type, milled steel panels, orange as dominant fields. Not chosen: it reads as a product launch,
  which argues against "no hype", and the long first-person copy sits awkwardly in heavy panels.
- **Shipyard blueprint**: grid paper, a double sheet border, sections as bordered detail views, B612
  throughout, the mark redrawn as a line drawing, orange only for launch and failure. Not chosen: the
  concept upstages the message, all-caps headings slow the questions, and the drawing needed real
  illustration work.
Both remain in git history on the landing-page branch if a later version wants them.
