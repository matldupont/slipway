// What the DS1 tests share: a project folder built from a frame line, milestones, decisions and registry entries, and a
// way to run DS1 on it. Every text here is inert.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { done, run } from './lk1-lockfile.mjs';

export const TODAY = '2026-10-19';
export const A11Y = 'Screens built here meet WCAG 2.2 AA, held by an automated accessibility check in CI (axe).';
export const DESIGN = 'Design: a direction, the component set built to WCAG 2.2 AA, and the flows for M2 — by the owner. (no feature: design)';

// The frame, with `line` under its Job story (null: no front-end line at all).
export const frame = (line = 'Front end: a web app') =>
  `---\nstatus: framed\n---\n\n# Frame\n\n## Job story\n\nWhen I plan a product, I want a design first, so I can build to it.\n\n${line ?? ''}\n\n## The question it answers\n\nWhat do I build next?\n`;

// One milestone document: `contents` and `gate` are lists of lines (written as `1.` items and `-` bullets), `fields`
// extra frontmatter lines (`screens: none`).
export const milestone = ({ id = 'M2', status = 'active', kind = 'mvp', fields = [], contents = ['A slice (F-1)'], gate = ['`pnpm verify` green on main', A11Y] } = {}) =>
  `---\nid: ${id}\nstatus: ${status}\nkind: ${kind}\nappetite: 2026-10-01..2026-10-31\n${fields.map((f) => `${f}\n`).join('')}---\n\n# ${id} — A milestone\n\n## Contents\n\n${contents.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n## No-gos\n\n- Payments\n\n## Gate\n\n${gate.map((g) => `- ${g}`).join('\n')}\n\n## Kill criteria\n\n- fewer than 3 of 10 users finish the flow\n`;

// A registry entry for `id` (a milestone id, or a whole id when it holds a `#`).
export const entry = (id, { reason = 'the sign-in form has no automated check yet', owner = 'build lead', expires = '2026-12-01' } = {}) =>
  `  - id: ${id.includes('#') ? id : `docs/milestones#${id}/accessibility`}\n${reason === null ? '' : `    reason: ${reason}\n`}${owner === null ? '' : `    owner: ${owner}\n`}${expires === null ? '' : `    expires: ${expires}\n`}`;

// The files of a project: { frame, milestones: { 'M2-x.md': text }, decisions, entries: [entry(...)] }.
export const files = ({ frame: f = frame(), milestones = {}, decisions = '# Decisions\n', entries = null } = {}) => ({
  'docs/product/FRAME.md': f,
  'decisions.md': decisions,
  ...Object.fromEntries(Object.entries(milestones).map(([name, text]) => [`docs/milestones/${name}`, text])),
  ...(entries === null ? {} : { 'ci/exceptions.yaml': entries.length ? `exceptions:\n${entries.join('')}` : 'exceptions: []\n' }),
});

export const write = (dir, tree) => {
  for (const [p, body] of Object.entries(tree)) {
    if (body === null) continue;
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
};

// DS1 on a fresh folder holding `tree`: { status, out, json }, json being report()'s @@json line.
export const ds1 = (tree, env = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'ds1-'));
  write(dir, tree);
  try {
    return run('ci/checks/meta/ds1-design-before-screens.mjs', dir, { CHECK_TODAY: TODAY, ...env });
  } finally {
    done(dir);
  }
};
