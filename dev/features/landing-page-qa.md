# QA plan — the landing page (`site/index.html`)

Surface: the page a stranger reads before running `npx use-slipway`. Spec: `dev/features/landing-page.md`;
claims: `dev/features/landing-page-claims.md`. Serve `site/` locally (`python3 -m http.server --directory site`).

| Journey | Steps | Expected | Automated by |
|---|---|---|---|
| The first command is above the fold on a phone | open the page at 390×844, scrolled to the top, after the fonts load; measure the first command's own text line (`.start .cmd`'s first text node) | its bottom edge is at or above 844 px, and the lede's bottom edge is above its top edge | none |
| The first command is above the fold on a laptop | the same at 1280×800 | its bottom edge is at or above 800 px | none |
| Nothing overflows on a phone | at 390×844 with the fonts loaded, read `document.documentElement.scrollWidth` and the right edge of every element in `main` except `.line` | `scrollWidth` is at most `clientWidth`, and no such element's right edge is past the viewport's | none |
| The scrollbar does not shift the layout | read `getComputedStyle(document.documentElement).scrollbarGutter` | `stable` | none |
| The page says only what the repository supports | pick 5 sentences of §06 and follow each to its row in `dev/features/landing-page-claims.md` and its source | each row's source states what the sentence says, at the source's current text | none |
| The two commands are the ones the README shows | compare `.start .cmd` text with the README's first code block | the same two commands, `npx use-slipway acme --dry-run` and `npx use-slipway acme` | none |
