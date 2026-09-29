#!/usr/bin/env node
// The intake, ticket and review skills slipway ships (F-04, dev/features/intake-skills.md; #93): each fits in 300 lines,
// each intake skill ends by asking what else the new issue changes, and every AGENT.md key a skill reads is a
// documented row; no command names a repository or label of its own. Internal: `pnpm meta` runs it in
// slipway, never in a project.
//
// A skill cites its keys on one line, `**Reads:** `Key`, `Key``. process/intake.md → Configuration lists each
// key with the skills that read it, and either a default or the question asked when it is missing.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { plain, section, table } from '../ci/checks/lib/markdown.mjs';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(SRC, p), 'utf8');

const FOUR = ['log-feature', 'log-bug', 'log-followup', 'work-ticket'];
const INTAKE = FOUR.filter((s) => s.startsWith('log-'));
// /pr-review (#93) ships the owner's proven skill whole, references and features/ beside it.
const REVIEW = 'pr-review';
const SKILLS = [...FOUR, REVIEW];
const REQUIRED = SKILLS;
const MAX_LINES = 300;
// Exempt from the cap by name: it ships whole rather than rewritten to fit (#93). The cap is not raised.
const UNCAPPED = [REVIEW];
// Reference sections a skill may keep below its last step.
const AFTER_RIPPLE = ['Edge cases'];

// A repository, label, milestone or board written into a command, instead of a {placeholder} filled from AGENT.md.
function hardCoded(md) {
  const found = [];
  for (const m of md.matchAll(/--(repo|label|milestone|add-project)[ =]+"?([^\s"`]+)/g)) {
    if (!m[2].startsWith('{')) found.push(`--${m[1]} ${m[2]}`);
  }
  // A shell variable (`${OWNER}`) is filled at run time, like a {placeholder}; neither is a repository written in.
  for (const m of md.matchAll(/\brepos\/(\{repo\}|[^\s"`/{$]+\/[^\s"`/]+)\//g)) if (m[1] !== '{repo}') found.push(`repos/${m[1]}/`);
  return found;
}

const skillPath = (s) => `.claude/skills/${s}/SKILL.md`;
const present = SKILLS.filter((s) => existsSync(join(SRC, skillPath(s))));

// AGENT.md §Skill Configuration: key → what it controls.
const agentRows = new Map(
  (table(section(read('AGENT.md'), 'Skill Configuration', 2))?.rows ?? []).map((r) => [plain(r[0]), r[2] ?? ''])
);

// process/intake.md → Configuration: key → { readers, fallback, question }.
const intake = read('process/intake.md');
const readersOf = (cell) => {
  const c = plain(cell);
  const names = new Set(SKILLS.filter((s) => new RegExp(`(^|[^\\w-])${s}([^\\w-]|$)`).test(c)));
  if (/^all four\b/i.test(c)) FOUR.forEach((s) => names.add(s));
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

test('the four skills and /pr-review are present', () => {
  for (const s of REQUIRED) assert.ok(present.includes(s), `${skillPath(s)} is missing`);
});

test('the tables the skills read parse', () => {
  assert.ok(agentRows.size >= 18, `AGENT.md §Skill Configuration has ${agentRows.size} rows; its table did not parse`);
  assert.ok(intakeRows.size > 0, 'process/intake.md → Configuration has no table');
});

for (const s of present) {
  const md = read(skillPath(s));

  test(`${s}: at most ${MAX_LINES} lines${UNCAPPED.includes(s) ? ' (exempt by name)' : ''}, and named for its folder`, () => {
    const lines = md.split('\n').length - (md.endsWith('\n') ? 1 : 0);
    if (!UNCAPPED.includes(s)) assert.ok(lines <= MAX_LINES, `${skillPath(s)} is ${lines} lines; move shared steps to process/intake.md`);
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

// Every markdown file /pr-review ships, not only its SKILL.md: its references carry commands too.
const reviewFiles = (exts) => {
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(SRC, rel), { withFileTypes: true })) {
      const p = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
    }
  };
  if (existsSync(join(SRC, `.claude/skills/${REVIEW}`))) walk(`.claude/skills/${REVIEW}`);
  return out;
};

test('no command in a skill or process/intake.md names a repository, label, milestone or board', () => {
  for (const p of [...new Set([...present.map(skillPath), ...reviewFiles(['.md']), 'process/intake.md'])]) {
    assert.deepEqual(hardCoded(read(p)), [], `${p} writes these into commands; read them from AGENT.md as {placeholders}`);
  }
});

// /pr-review came from one owner's install: what it ships names no real repository or person. Example repositories
// use placeholder owners, and the test fixtures use made-up handles. Private project names are checked by eye before
// each push; a list of them here would publish them.
const EXAMPLE_OWNERS = new Set(['owner', 'a', 'g', 'some', 'cli']);
const EXAMPLE_HANDLES = new Set(['octo-author', 'octo-peer', 'alice', 'bob', 'cody']);
test('/pr-review names no real repository, and its fixtures no real person', () => {
  const hits = [];
  for (const p of reviewFiles(['.md', '.ts'])) {
    for (const m of read(p).matchAll(/github\.com[/:](?:\d+\/)?([A-Za-z0-9_.-]+)\/[A-Za-z0-9_.-]+/g)) {
      if (!EXAMPLE_OWNERS.has(m[1])) hits.push(`${p}: ${m[0]}`);
    }
  }
  const tests = reviewFiles(['.test.ts']);
  assert.ok(tests.length > 0, `/pr-review ships no test file`);
  for (const p of tests) {
    const t = read(p);
    const handles = [
      ...[...t.matchAll(/\b(?:login|username):\s*"([^"]+)"/g)].map((m) => m[1]),
      ...[...t.matchAll(/detectReviewMode\(([^)]*\))/g)].flatMap((m) => [...m[1].matchAll(/"([^"]*)"/g)].map((q) => q[1])),
    ];
    for (const h of handles) if (h && !EXAMPLE_HANDLES.has(h.toLowerCase())) hits.push(`${p}: handle "${h}"`);
  }
  assert.deepEqual(hits, [], 'use owner/repo and the made-up handles instead');
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

// Slipway's own settings (#117): read before AGENT.md, whose placeholders stay for new projects. Internal, so this
// guard runs in slipway only. A key intake.md gains later is a missing row here, not a silent fallback.
const SETTINGS = 'dev/skill-configuration.md';
const MANIFEST_PATH = '.slipway/manifest.json';
const rowsOf = (md) => new Map((table(section(md, 'Skill Configuration', 2))?.rows ?? []).map((r) => [plain(r[0]), plain(r[1] ?? '')]));
// process/intake.md → Configuration's rule, as code: the settings file only where no manifest is, and one file, never
// a mix. A project always has a manifest, so a settings file it adds is never read.
function settingsFor(root) {
  const has = (p) => existsSync(join(root, p));
  const file = has(SETTINGS) && !has(MANIFEST_PATH) ? SETTINGS : 'AGENT.md';
  return { file, rows: rowsOf(readFileSync(join(root, file), 'utf8')) };
}

test(`${SETTINGS}: every key process/intake.md lists, each filled, none outside AGENT.md`, () => {
  const { file, rows } = settingsFor(SRC);
  assert.equal(file, SETTINGS, `slipway has no ${MANIFEST_PATH}, so its skills read ${SETTINGS}`);
  for (const k of intakeRows.keys()) {
    assert.ok(rows.has(k), `${SETTINGS} lacks \`${k}\`, which process/intake.md lists`);
    assert.ok(rows.get(k) !== '', `${SETTINGS} row \`${k}\` has no value`);
    assert.doesNotMatch(rows.get(k), /<[^>\n]*>/, `${SETTINGS} row \`${k}\` still holds a <…> placeholder`);
  }
  for (const k of rows.keys()) assert.ok(agentRows.has(k), `${SETTINGS} has \`${k}\`, which is not a row of AGENT.md §Skill Configuration`);
});

test(`a project with a manifest reads AGENT.md even when it has ${SETTINGS}; without one, only the settings file`, () => {
  const root = mkdtempSync(join(tmpdir(), 'slipway-settings-'));
  try {
    const conf = (repo, gate) => `## Skill Configuration\n\n| Key | Value | What |\n|---|---|---|\n| Issue repo | \`${repo}\` | x |\n${gate ? `| Quality gate | \`${gate}\` | x |\n` : ''}`;
    writeFileSync(join(root, 'AGENT.md'), conf('owner/project', 'pnpm verify'));
    mkdirSync(join(root, 'dev'));
    writeFileSync(join(root, SETTINGS), conf('someone/else', null));
    mkdirSync(join(root, '.slipway'));
    writeFileSync(join(root, MANIFEST_PATH), '{}');
    let got = settingsFor(root);
    assert.equal(got.file, 'AGENT.md');
    assert.equal(got.rows.get('Issue repo'), 'owner/project');
    rmSync(join(root, MANIFEST_PATH));
    got = settingsFor(root);
    assert.equal(got.file, SETTINGS);
    assert.equal(got.rows.get('Issue repo'), 'someone/else');
    assert.equal(got.rows.has('Quality gate'), false, 'a row the settings file lacks is not taken from AGENT.md');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test(`process/intake.md → Configuration states that rule: ${SETTINGS} first, only without a manifest, never a mix`, () => {
  const first = plain((section(intake, 'Configuration', 2) ?? '').split(/\n\s*\n/).find((p) => p.trim()) ?? '').replace(/\s+/g, ' ');
  const at = first.indexOf(SETTINGS);
  assert.ok(at >= 0, `the first paragraph of process/intake.md → Configuration does not name ${SETTINGS}`);
  assert.ok(first.includes(`${SETTINGS} when it exists and ${MANIFEST_PATH} does not, both at the repository root`), 'the settings file must be read only where the repository root has no manifest');
  assert.doesNotMatch(first, /\bD1\b/, 'D1 does not guard this: a project can enter its template mode without a manifest');
  assert.ok(first.indexOf('AGENT.md', at) > at, `process/intake.md → Configuration must name AGENT.md after ${SETTINGS}, as the fallback`);
  assert.match(first, /Read one file, never a mix of the two/, 'intake must forbid mixing the two files');
});

test('work-ticket\'s rule files name the settings file, the manifest and slipway\'s markers', () => {
  const rules = read(skillPath('work-ticket')).match(/\*\*The rules the run is judged by:\*\*([\s\S]*?)\n\n/)?.[1] ?? '';
  for (const p of [SETTINGS, '.slipway/**', 'dev/ownership.yaml', 'scripts/new-project.mjs']) assert.ok(rules.includes(`\`${p}\``), `work-ticket's rule files do not name ${p}`);
});

// #124: a reused branch's planted settings ran their gate before the owner was asked. The rule-file check is
// Configuration's first paragraph, before a setting is resolved or read and before the first gate run.
test('work-ticket checks its rule files before it reads a setting or runs the gate', () => {
  const md = read(skillPath('work-ticket'));
  const conf = section(md, 'Configuration', 2) ?? '';
  const first = (conf.split(/\n\s*\n/).find((p) => p.trim()) ?? '').replace(/\s+/g, ' ');
  assert.match(first, /^\*\*First, before any setting is read or any command it names runs\.\*\*/, 'Configuration must open with the rule-file check');
  assert.ok(first.includes('**The rules the run is judged by:**'), 'the first paragraph of Configuration must be the rule-file check');
  assert.ok(first.includes('`git diff --name-only --no-renames origin/{base}`'), 'the rule-file check must run the diff');
  for (const p of ['each `AGENT.md` and `CLAUDE.md` at any depth', '`process/harness/**`']) assert.ok(first.includes(p), `the rule files must name ${p}`);
  assert.match(first, /again on checking out an existing branch before a file on it is read/, 'a reused branch must be checked before it is read');
  assert.match(first, /A check that cannot run is not a pass: stop\. With no remote, ask the owner for `\{base\}`/, 'a failed check must stop the run, not pass it');
  assert.match(first, /A no ends the run: name the rule files the branch changed and stop/, 'a no must end the run');
  // First hits over the whole file, any case, across line breaks: nothing above Configuration resolves the settings
  // or runs the gate.
  const flat = md.replace(/\s+/g, ' ');
  const at = (re) => flat.search(re);
  const check = flat.indexOf('`git diff --name-only --no-renames origin/{base}`');
  const resolve = at(/resolve[^.]*?`process\/intake\.md` → Configuration/i);
  const gate = at(/\brun[^.]*?`Quality gate`/i);
  assert.ok(resolve > 0 && gate > 0, 'work-ticket must resolve its settings and run `Quality gate`');
  assert.ok(check < resolve, 'work-ticket resolves its settings before its rule-file check');
  assert.ok(check < at(/read before Phase 1/i), 'work-ticket reads the docs its settings name before its rule-file check');
  assert.ok(resolve < gate, 'work-ticket runs `Quality gate` before resolving it');
  assert.match(section(md, 'Phase 3 — Build', 2) ?? '', /\*\*Branch\*\* per [^\n]*an existing one gets the rule-file check first/, 'Phase 3 must check a reused branch before building on it');
});

test('process/intake.md says when /work-ticket\'s rule-file check fires: before either settings file is read', () => {
  const first = plain((section(intake, 'Configuration', 2) ?? '').split(/\n\s*\n/).find((p) => p.trim()) ?? '').replace(/\s+/g, ' ');
  assert.match(first, /\/work-ticket asks before it reads either file when the branch's changes touch one; a no ends the run/);
  assert.doesNotMatch(first, /asks before any run whose diff touches/, 'the check fires before a read, not only before a run');
});

test('process/intake.md: the PR body it prescribes passes the PR check — a lane, commands in a code block, Links', () => {
  const pr = section(intake, 'Pull request', 2) ?? '';
  const body = pr.match(/^\s*~~~markdown\n([\s\S]*?)^\s*~~~/m)?.[1]?.replace(/^ {2}/gm, '');
  assert.ok(body, 'process/intake.md → Pull request has no ~~~markdown block holding the PR body');
  assert.match(section(body, 'What', 2) ?? '', /^Lane: /m, 'the body\'s ## What must state the lane');
  assert.match(section(body, 'Verification', 2) ?? '', /```/, 'the body\'s ## Verification must hold the commands in a code block (P1 wants evidence)');
  assert.match(section(body, 'Links', 2) ?? '', /#n/, 'the body\'s ## Links must reference the issue');
  assert.match(read(skillPath('work-ticket')), /`process\/intake\.md` → Pull request/, 'work-ticket must open its PR per process/intake.md → Pull request');
});

// Shipped text still speaking of the skills as someone's own install, or of a review skill slipway does not ship.
// Matched across line breaks, since the docs are hard-wrapped. History (decisions, feature docs, lessons, filled
// reviews) keeps its wording.
// /pr-review was on this list until #93 shipped it (revised 2026-09-28).
const STALE = [/\buser-level\b/i, /where (it is )?installed/i, /live outside slipway/i];
test('nothing slipway ships calls the skills user-level or installed elsewhere', () => {
  const files = execFileSync('git', ['ls-files', '*.md', '*.mjs', '*.sh', '*.html', '*.yml', '*.yaml', '*.json'], { cwd: SRC, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !/^(decisions\.md|dev\/|process\/lessons\/|scripts\/skills\.test\.mjs)/.test(f))
    .filter((f) => !f.startsWith('docs/reviews/') || f.endsWith('TEMPLATE.md'));
  const hits = [];
  for (const f of files) {
    if (!existsSync(join(SRC, f))) continue;
    const text = read(f).replace(/\s+/g, ' ');
    for (const re of STALE) if (re.test(text)) hits.push(`${f}: ${re}`);
  }
  assert.deepEqual(hits, [], 'these files still describe the shipped skills as installed elsewhere');
});

// One stop rule (L-68): the round cap, the cluster signal and the bar live in /work-ticket; cold-review.md
// points there, and neither file tells an agent to write a threat model the skill forbids.
test('process/cold-review.md and work-ticket give one answer to "does another round run?"', () => {
  const flat = (t) => t.replace(/\s+/g, ' ');
  const skill = flat(read(skillPath('work-ticket')));
  const stop = flat(section(read('process/cold-review.md'), 'When to stop', 2) ?? '');
  assert.ok(stop, 'process/cold-review.md has no ## When to stop');
  assert.match(skill, /Another round runs only when the last one broke a line of the GUARANTEES block\*\*, threat model or none/, 'work-ticket must state that a baseline break runs another round with no threat model');
  assert.match(skill, /`breaks: none` findings end the review/, 'work-ticket must say a round of only `breaks: none` findings ends the review');
  assert.match(skill, /Three rounds at most: a guarantee still broken after round 3 stops the run/, 'work-ticket must keep the round cap');
  assert.match(skill, /Cluster signal\.\*\* .*remove it, narrow it, or, when the acceptance needs it, move the surface/, 'the cluster signal must offer moving the surface');
  assert.match(stop, /work-ticket\/SKILL\.md` → The guarantees/, 'cold-review must take its bar from work-ticket → The guarantees');
  assert.match(stop, /Another round runs only when the last one found a finding that breaks a line of that block/, 'cold-review must give the same answer as work-ticket');
  assert.doesNotMatch(stop, /(three|3) rounds at most|stop patching/i, 'the cap and the cluster signal are stated once, in work-ticket');
  assert.doesNotMatch(stop, /write the threat model before/i, 'cold-review must not tell an agent to write a threat model');
  assert.match(stop, /A review never writes a threat model/, 'cold-review must forbid a review-written threat model, as work-ticket does');
  assert.match(skill, /never write one yourself/, 'work-ticket must keep forbidding a review-written threat model');
});

// F-06 (#118, D-020): /log-feature reads the decisions record in every run and asks about a conflict before it
// writes anything; `/log-feature M1#2` shapes a milestone's Contents item. The steps live in process/intake.md,
// since the skill is at its cap; these pin the lines that make the two fire.
test('process/intake.md → Decisions: read in full, a conflict asked before any branch, "neither yet" writes nothing', () => {
  const d = (section(intake, 'Decisions', 2) ?? '').replace(/\s+/g, ' ');
  assert.ok(d, 'process/intake.md has no ## Decisions');
  assert.match(d, /`decisions\.md`/, 'Decisions must name the record it reads');
  assert.match(d, /Read it in full/, 'Decisions must read the whole record, not only the ids the work cites');
  assert.match(d, /never by id alone/, 'a touched decision is judged by what it says, not by citation');
  assert.match(d, /Ask before any branch or doc exists/, 'a conflict is asked about before anything is written');
  assert.match(d, /\*\*neither yet\*\*/, 'the owner can answer that neither decision stands yet');
  assert.match(d, /Neither yet:\*\* stop\. Nothing is written/, '"neither yet" ends the run with nothing written');
  assert.match(d, /`Decisions: \{id\}/, 'Phase 3 prints a Decisions line');
});

test('process/intake.md → Milestone item: the argument is matched before use, and a started item names its issue', () => {
  const m = (section(intake, 'Milestone item', 2) ?? '').replace(/\s+/g, ' ');
  assert.ok(m, 'process/intake.md has no ## Milestone item');
  assert.match(m, /matching `\^M\\d\+#\\d\+\$` selects this form, and is used for nothing before it matches/, 'the argument is checked before it reaches anything');
  assert.match(m, /not `status: active`/, 'a milestone still being shaped stops the run');
  assert.match(m, /Phase 2, skipped,\*\* with one line: `\{id\} already made this bet/, 'the argument against building is replaced by one line');
  assert.match(m, /no F-ID is added and the PRD version is not bumped/, 'an item already in the PRD adds no F-ID');
  assert.match(m, /append ` · #\{issue\}` to the item's last line/, 'the started marker is written on the item\'s line');
  assert.match(m, /Phase 3 runs in full, Decisions included/, 'a milestone item reads the decisions record too');
});

test('/log-feature reads decisions.md before Phase 1 and cites both sections; /log-followup takes a Contents line as a frame', () => {
  const lf = read(skillPath('log-feature'));
  const before = (lf.match(/^Read before Phase 1[\s\S]*?\n\s*\n/m)?.[0] ?? '').replace(/\s+/g, ' ');
  assert.match(before, /`decisions\.md`/, '/log-feature must read decisions.md before Phase 1');
  assert.match(lf, /`\/log-feature M1#2`/, '/log-feature must name the milestone-item form');
  for (const [phase, re] of [['Phase 1 — Problem', /Milestone item/], ['Phase 2 — Argue against it', /Milestone item/], ['Phase 3 — What already exists', /`process\/intake\.md` → Decisions/], ['Phase 4 — Cut, spec, schedule', /`process\/intake\.md` → Milestone item/]]) {
    assert.match((section(lf, phase, 2) ?? '').replace(/\s+/g, ' '), re, `/log-feature ${phase} must cite ${re}`);
  }
  assert.match(section(lf, 'Phase 3 — What already exists', 2) ?? '', /^Decisions: /m, 'Phase 3\'s output block must carry a Decisions line');
  assert.match(read(skillPath('log-followup')).replace(/\s+/g, ' '), /milestone Contents line handed over by `\/log-feature` is a frame/, '/log-followup must accept a Contents line as its frame');
});
