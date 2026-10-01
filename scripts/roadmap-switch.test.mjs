#!/usr/bin/env node
// The roadmap page's switch (ci/roadmap.mjs roadmapSwitch, #168): which AGENT.md shapes turn the page on, and what
// an off page says. The switch reads raw lines, so each case is the off fixture (no Roadmap page row) with text
// added, written to a temp dir. Inert text; nothing here runs. The renderer's own cases are in roadmap.test.mjs.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROADMAP = join(SRC, 'ci', 'roadmap.mjs');
const FIX = join(SRC, 'scripts', 'fixtures', 'roadmap');

const run = (root, args) => spawnSync(process.execPath, [ROADMAP, root, ...args], { encoding: 'utf8', env: { ...process.env, CHECK_TODAY: '2026-03-11', CHECK_NOW: '' } });

const made = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'roadmap-switch-'));
  made.push(d);
  return d;
};
after(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

// The off fixture's AGENT.md ends with its Skill Configuration table, so text added after it is a further row.
function agent(edit) {
  const root = tmp();
  cpSync(join(FIX, 'off'), root, { recursive: true });
  writeFileSync(join(root, 'AGENT.md'), edit(readFileSync(join(root, 'AGENT.md'), 'utf8')));
  return root;
}
const row = (v) => `| Roadmap page | \`${v}\` | example |`;
const [PUB, OFF] = [row('public'), row('off')];
const MARK = 'a code fence or comment sits above or on the Roadmap page row; move the Skill Configuration section above it';
const SECTION = 'the Roadmap page row is not under ## Skill Configuration';
const START = 'the Roadmap page row must start its line with | Roadmap page |';

test('a lone public row that is hidden, indented or outside Skill Configuration leaves the page off, and says why', () => {
  const shapes = {
    'in an HTML comment': [(a) => `${a}\n<!-- example:\n${PUB}\n-->\n`, MARK],
    'in a code fence': [(a) => `${a}\n\`\`\`\n${PUB}\n\`\`\`\n`, MARK],
    'in a ~~~ fence': [(a) => `${a}\n~~~\n${PUB}\n~~~\n`, MARK],
    'in a fence, after a <!-- in inline code': [(a) => `${a}\nWrite \`<!--\` to hide a note:\n\n\`\`\`html\n${PUB}\n\`\`\`\n`, MARK],
    'a comment opened above the heading': [(a) => `<!--\n${a}${PUB}\n-->\n`, MARK],
    'a balanced fence above the heading': [(a) => `\`\`\`\nls\n\`\`\`\n\n${a}${PUB}\n`, MARK],
    'a --> alone above the heading': [(a) => `-->\n${a}${PUB}\n`, MARK],
    'a comment on the row line, around the value': [(a) => `${a}| Roadmap page | <!-- \`public\` --> \`off\` | example |\n`, MARK],
    'a hidden row with a value it does not know': [(a) => `${a}<!--\n${row('pubic')}\n-->\n`, MARK],
    'in an indented code block': [(a) => `${a}\n    ${PUB}\n`, START],
    'in another ## section': [(a) => `${a}\n## Examples\n\n| Key | Value | What |\n|---|---|---|\n${PUB}\n`, SECTION],
    'under a # heading': [(a) => `${a}\n# Other\n\n${PUB}\n`, SECTION],
    'under an empty ## heading': [(a) => `${a}\n##\n\n${PUB}\n`, SECTION],
    'under a heading indented two spaces': [(a) => `${a}\n  ## Examples\n\n${PUB}\n`, SECTION],
    'under a setext heading, ---': [(a) => `${a}\nOther\n-----\n\n${PUB}\n`, SECTION],
    'under a setext heading, ===': [(a) => `${a}\nOther\n===\n\n${PUB}\n`, SECTION],
    'under a heading that follows a lone CR': [(a) => `${a}x\r## Examples\r${PUB}\n`, SECTION],
    'after an indented Skill Configuration heading in an example': [(a) => `## Examples\n\n    ## Skill Configuration\n\n${PUB}\n\n${a.replace(/^# .*\n/, '').replace('## Skill Configuration', '## Settings')}`, SECTION],
  };
  for (const [name, [edit, why]] of Object.entries(shapes)) {
    const root = agent(edit);
    const e = run(root, ['--enabled']);
    assert.deepEqual([e.status, e.stdout], [0, `enabled=false\nreason=${why}\n`], name);
    const out = join(tmp(), 'site');
    assert.equal(run(root, ['--out', out]).stdout, `roadmap: off (${why})\n`, name);
    assert.equal(existsSync(out), false, name);
  }
});

test('two Roadmap page rows, in any order and with any values, leave the page off and name the count', () => {
  const hide = (r) => `<!--\n${r}\n-->`;
  const pairs = [[hide(PUB), OFF], [OFF, hide(PUB)], [PUB, PUB], [PUB, 'Roadmap page | off'], [PUB, '| roadmap page | pubic |'], [`${PUB}\r${OFF}`, '']];
  for (const [first, second] of pairs) {
    const r = run(agent((a) => `${a}${first}\n${second}\n`), ['--enabled']);
    assert.deepEqual([r.status, r.stdout], [0, 'enabled=false\nreason=2 Roadmap page rows; keep one\n'], `${first} / ${second}`);
  }
});

test('one public row under ## Skill Configuration is on, and --enabled prints one line whatever the cell holds', () => {
  assert.equal(run(agent((a) => `${a}${PUB}\n`), ['--enabled']).stdout, 'enabled=true\n');
  assert.equal(run(agent((a) => `${a}\n### Sub\n\n${PUB}\n`), ['--enabled']).stdout, 'enabled=true\n', 'a ### inside the section');
  assert.equal(run(agent((a) => `${a}${PUB}\n\n\`\`\`\nls\n\`\`\`\n<!-- note -->\n`), ['--enabled']).stdout, 'enabled=true\n', 'marks below the row');
  // What a cell holds never reaches --enabled's output, which the workflow appends to $GITHUB_OUTPUT.
  const cut = '| Roadmap page | `public`\nenabled=false | reason=x |';
  assert.equal(run(agent((a) => `${a}${cut}\n`), ['--enabled']).stdout, 'enabled=true\n');
  const two = run(agent((a) => `${a}| Roadmap page | reason=x enabled=true |\n${PUB}\n`), ['--enabled']);
  assert.equal(two.stdout, 'enabled=false\nreason=2 Roadmap page rows; keep one\n');
});

test('an off row says nothing more, whatever sits above it', () => {
  for (const edit of [(a) => `${a}${OFF}\n`, (a) => `\`\`\`\nls\n\`\`\`\n\n${a}${OFF}\n`, (a) => `${a}\n## Examples\n\n${OFF}\n`]) {
    const root = agent(edit);
    assert.equal(run(root, ['--enabled']).stdout, 'enabled=false\n');
    assert.equal(run(root, ['--out', join(tmp(), 'site')]).stdout, 'roadmap: off (AGENT.md Roadmap page)\n');
  }
});

test('the page shows the project name only from one plain Product name row; a hidden one is never shown', () => {
  const page = (edit) => {
    const out = join(tmp(), 'site');
    const r = run(agent((a) => edit(`${a}${PUB}\n`)), ['--out', out, '--sha', '0123456789abcdef']);
    assert.equal(r.status, 0, r.stderr);
    return readFileSync(join(out, 'index.html'), 'utf8');
  };
  assert.match(page((a) => a), /<title>Harbour roadmap<\/title>/);
  const visible = /^\| Product name \|.*\n/m;
  const hiddenRow = '| Product name | `SENTINEL` | example |';
  const shapes = {
    'no visible row, one in a comment below': (a) => `${a.replace(visible, '')}<!--\n${hiddenRow}\n-->\n`,
    'no visible row, one in a fence below': (a) => `${a.replace(visible, '')}\`\`\`\n${hiddenRow}\n\`\`\`\n`,
    'a visible row and a commented one': (a) => `${a}<!--\n${hiddenRow}\n-->\n`,
    'no visible row, one under another heading': (a) => `${a.replace(visible, '')}\n## Examples\n\n${hiddenRow}\n`,
  };
  for (const [name, edit] of Object.entries(shapes)) {
    const html = page(edit);
    assert.match(html, /<title>Roadmap<\/title>/, name);
    assert.doesNotMatch(html, /SENTINEL/, name);
  }
});
