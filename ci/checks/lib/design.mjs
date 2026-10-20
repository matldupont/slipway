// Design before screens (F-14 §2, §3): the design item, the accessibility line, and the one predicate DS1 and
// `pnpm status` share, "is there a design item before this milestone". It lives beside lib/milestones.mjs and reads
// through it, so both readers see the same Contents items and the same Gate bullets.

import { hasPlaceholder } from './frontmatter.mjs';
import { plain, section } from './markdown.mjs';
import { bullets, compareMilestones, contents, milestoneKey, started } from './milestones.mjs';

// The design items of a milestone: Contents items whose text, after plain() (emphasis marks dropped), starts
// `Design:` in any letter case, and holds no template placeholder. `position` counts the items from 1 as GitHub
// renders them: a list written `1. 1. 1.` has items 1, 2 and 3. `first` is true when every item above it is started
// (carries its ` · #n` marker), the first item included: such an item is design before the work still to start.
export function designItems(md) {
  const items = contents(md);
  const out = [];
  let above = true;
  items.forEach((item, i) => {
    if (/^design:/i.test(plain(item.text)) && !hasPlaceholder(item.text)) out.push({ position: i + 1, first: above });
    above &&= started(item.text);
  });
  return out;
}

// Whether the milestone's `## Gate` holds the accessibility line: a bullet whose text, its indented lines joined with
// one space, contains `WCAG 2.2 AA` and holds no placeholder. A line that wraps between "2.2" and "AA" is still read;
// the template's own line, unfilled, is not one.
export function hasAccessibilityLine(md) {
  return bullets(section(md, 'Gate', 2)).some((b) => b.replace(/\s+/g, ' ').includes('WCAG 2.2 AA') && !hasPlaceholder(b));
}

// Whether milestone `a` comes before `b` (both from readMilestones(), whose order is id order with every document whose
// id is not `M<n>` after them, by file name): by number when both ids are `M<n>` or `M<n>.<k>`, so M2 is before M10;
// otherwise by that order.
function before(a, b, list) {
  return milestoneKey(a.fm?.id) && milestoneKey(b.fm?.id) ? compareMilestones(a.fm.id, b.fm.id) < 0 : list.indexOf(a) < list.indexOf(b);
}

// What gives `target` its design: `{ id, file, position }` of the item, or null. An item in `target` itself counts when
// it is item 1 or below started items only (designItems() `first`). An item in an earlier milestone counts when that
// milestone's status is one of `count`: DS1 asks of what is delivered or begun (`closed`, `active`), status of a plan
// (every status but `killed`). The nearest earlier milestone is named.
export function designBefore(target, milestones, count) {
  const own = designItems(target.md).find((d) => d.first);
  if (own) return { id: target.fm.id, file: target.file, position: own.position };
  for (const m of milestones.toReversed()) {
    if (m === target || !count.includes(m.fm?.status) || !before(m, target, milestones)) continue;
    const item = designItems(m.md)[0];
    if (item) return { id: m.fm.id, file: m.file, position: item.position };
  }
  return null;
}
