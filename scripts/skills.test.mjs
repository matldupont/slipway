#!/usr/bin/env node
// The intake and ticket skills slipway ships (F-04, dev/features/intake-skills.md): each fits in 300 lines,
// each intake skill ends by asking what else the new issue changes, and every AGENT.md key a skill reads is a
// documented row; no command names a repository or label of its own. Internal: `pnpm meta` runs it in
// slipway, never in a project.
//
// A skill cites its keys on one line, `**Reads:** `Key`, `Key``. process/intake.md → Configuration lists each
// key with the skills that read it, and either a default or the question asked when it is missing.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { plain, section, table } from '../ci/checks/lib/markdown.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(SRC, p), 'utf8');

const FOUR = ['log-feature', 'log-bug', 'log-followup', 'work-ticket'];
const INTAKE = FOUR.filter((s) => s.startsWith('log-'));
// Shipped so far; each build-map step of #46 adds the skill it ships.
const REQUIRED = ['log-followup', 'log-feature', 'log-bug'];
const MAX_LINES = 300;
// Reference sections a skill may keep below its last step.
const AFTER_RIPPLE = ['Edge cases'];

// A repository, label, milestone or board written into a command, instead of a {placeholder} filled from AGENT.md.
function hardCoded(md) {
  const found = [];
  for (const m of md.matchAll(/--(repo|label|milestone|add-project)[ =]+"?([^\s"`]+)/g)) {
    if (!m[2].startsWith('{')) found.push(`--${m[1]} ${m[2]}`);
  }
  for (const m of md.matchAll(/\brepos\/(\{repo\}|[^\s"`/{]+\/[^\s"`/]+)\//g)) if (m[1] !== '{repo}') found.push(`repos/${m[1]}/`);
  return found;
}

const skillPath = (s) => `.claude/skills/${s}/SKILL.md`;
const present = FOUR.filter((s) => existsSync(join(SRC, skillPath(s))));

// AGENT.md §Skill Configuration: key → what it controls.
const agentRows = new Map(
  (table(section(read('AGENT.md'), 'Skill Configuration', 2))?.rows ?? []).map((r) => [plain(r[0]), r[2] ?? ''])
);

// process/intake.md → Configuration: key → { readers, fallback, question }.
const intake = read('process/intake.md');
const readersOf = (cell) => {
  const c = plain(cell);
  if (/^all four$/i.test(c)) return new Set(FOUR);
  const names = new Set(FOUR.filter((s) => new RegExp(`(^|[^\\w-])${s}([^\\w-]|$)`).test(c)));
  if (/the three log- skills/i.test(c)) INTAKE.forEach((s) => names.add(s));
  return names;
};
const dash = (c) => plain(c) === '' || plain(c) === '—';
const intakeRows = new Map(
  (table(section(intake, 'Configuration', 2))?.rows ?? []).map((r) => [
    plain(r[0]),
    { readers: readersOf(r[1] ?? ''), fallback: !dash(r[2] ?? ''), question: !dash(r[3] ?? '') },
  ])
);

const reads = (md) => {
  // The line runs to the paragraph's end: it may wrap.
  const line = md.match(/^\*\*Reads:\*\*([\s\S]*?)(?:\n\s*\n|(?![\s\S]))/m)?.[1] ?? '';
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
};

test('the skills shipped so far are present', () => {
  for (const s of REQUIRED) assert.ok(present.includes(s), `${skillPath(s)} is missing`);
});

test('the tables the skills read parse', () => {
  assert.ok(agentRows.size >= 18, `AGENT.md §Skill Configuration has ${agentRows.size} rows; its table did not parse`);
  assert.ok(intakeRows.size > 0, 'process/intake.md → Configuration has no table');
});

for (const s of present) {
  const md = read(skillPath(s));

  test(`${s}: at most ${MAX_LINES} lines, and named for its folder`, () => {
    const lines = md.split('\n').length - (md.endsWith('\n') ? 1 : 0);
    assert.ok(lines <= MAX_LINES, `${skillPath(s)} is ${lines} lines; move shared steps to process/intake.md`);
    assert.match(md, new RegExp(`^---\\nname: ${s}\\n`), `${skillPath(s)} frontmatter must start with name: ${s}`);
  });

  test(`${s}: every key it reads is a documented AGENT.md row, listed for it in process/intake.md`, () => {
    const keys = reads(md);
    assert.ok(keys.length > 0, `${skillPath(s)} has no **Reads:** line`);
    for (const k of keys) {
      assert.ok(agentRows.has(k), `${s} reads \`${k}\`, which is not a row of AGENT.md §Skill Configuration`);
      assert.ok(plain(agentRows.get(k)) !== '', `AGENT.md row \`${k}\` does not say what it controls`);
      assert.ok(intakeRows.get(k)?.readers.has(s), `process/intake.md → Configuration does not list ${s} as reading \`${k}\``);
    }
    // Both directions: a key named in the body is on the Reads line, and intake lists nothing the skill does not read.
    const prose = md.replace(/^```[\s\S]*?^```/gm, '');
    const named = new Set([...prose.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).filter((k) => agentRows.has(k)));
    for (const k of named) assert.ok(keys.includes(k), `${s} names \`${k}\` but its **Reads:** line does not`);
    for (const [k, row] of intakeRows) {
      if (row.readers.has(s)) assert.ok(keys.includes(k), `process/intake.md says ${s} reads \`${k}\`; its **Reads:** line does not`);
    }
  });

  test(`${s}: every section of process/intake.md it cites exists`, () => {
    for (const m of md.matchAll(/`process\/intake\.md`\s*→\s*([A-Z][A-Za-z ]*[a-z])/g)) {
      assert.ok(section(intake, m[1], 2) !== null, `${s} cites process/intake.md → ${m[1]}, which has no \`## ${m[1]}\``);
    }
  });

  if (INTAKE.includes(s)) {
    test(`${s}: ends with a Ripple step that runs the shared procedure`, () => {
      const headings = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
      assert.ok(headings.includes('Ripple'), `${skillPath(s)} has no \`## Ripple\``);
      // Last step, after filing: every phase comes before it, and only reference sections after it.
      const at = headings.indexOf('Ripple');
      assert.ok(headings.slice(0, at).some((h) => /^Phase \d/.test(h)), `${s}: \`## Ripple\` must come after the phases`);
      const after = headings.slice(at + 1).filter((h) => !AFTER_RIPPLE.includes(h));
      assert.deepEqual(after, [], `${s}: \`## Ripple\` must be the last step; found after it: ${after.join(', ')}`);
      assert.match(section(md, 'Ripple', 2), /`process\/intake\.md` → Ripple/, `${s}'s Ripple must run process/intake.md → Ripple`);
      assert.match(section(md, 'Ripple', 2), /\*\*Terms:\*\*/, `${s}'s Ripple must say which terms it collects`);
    });
  }
}

test('no command in a skill or process/intake.md names a repository, label, milestone or board', () => {
  for (const p of [...present.map(skillPath), 'process/intake.md']) {
    assert.deepEqual(hardCoded(read(p)), [], `${p} writes these into commands; read them from AGENT.md as {placeholders}`);
  }
});

test('process/intake.md: every key is an AGENT.md row, with either a default or a question', () => {
  for (const [k, row] of intakeRows) {
    assert.ok(agentRows.has(k), `process/intake.md lists \`${k}\`, which AGENT.md §Skill Configuration lacks`);
    assert.ok(row.fallback !== row.question, `\`${k}\` needs exactly one of a default (a later row) or a question (a row since creation)`);
    assert.ok(row.readers.size > 0, `\`${k}\` names no skill that reads it`);
  }
});

test('AGENT.md: every row says what it controls', () => {
  for (const [k, controls] of agentRows) assert.ok(plain(controls) !== '', `AGENT.md row \`${k}\` has an empty "What it controls" cell`);
});
