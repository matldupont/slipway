// The frame's front-end line (F-14 §1): where people use the product, read from docs/product/FRAME.md. DS1 and
// `pnpm status` read it here, so they never disagree about whether a project has a front end. K1 reads the rest of the
// frame; the Risks table is lib/risks.mjs's.
//
// The line is the one line of the frame's prose (prose(): no comments, no fenced code, no frontmatter) that starts
// `Front end:` at column 0, written exactly so: `**Front end:**` and `Front-end:` are no line, which fails closed with
// a message that says to write it. Its value is the text after the label, trimmed.
//
//   none        the value's first word is `none`, in any case, ended by anything that is not a letter, digit or `_`
//               (`none`, `NONE (an API)`, `none.`, `none(a CLI)`); what follows it is for people
//   screens     any other value, an unknown word and a `[PARKED: …]` answer among them: a front end until answered
//   unrecorded  no line (`why: 'missing'`), two or more (`several`), an empty value (`empty`), or a value still holding
//               a template placeholder or a [NEEDS CLARIFICATION] (`placeholder`)

import { hasPlaceholder } from './frontmatter.mjs';
import { prose } from './markdown.mjs';

export const FRONT_END_LABEL = 'Front end:';

// `{ state, why, value }`: `why` is null unless the state is unrecorded; `value` is the text after the label, or null.
export function frontEnd(md) {
  const lines = prose(md ?? '').split(/\r?\n/).filter((l) => l.startsWith(FRONT_END_LABEL));
  const unrecorded = (why, value = null) => ({ state: 'unrecorded', why, value });
  if (!lines.length) return unrecorded('missing');
  if (lines.length > 1) return unrecorded('several');
  const value = lines[0].slice(FRONT_END_LABEL.length).trim();
  if (!value) return unrecorded('empty');
  if (hasPlaceholder(value)) return unrecorded('placeholder', value);
  return { state: /^none\b/i.test(value) ? 'none' : 'screens', why: null, value };
}
