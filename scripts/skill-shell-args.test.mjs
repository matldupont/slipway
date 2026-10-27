#!/usr/bin/env node
// No skill or process doc puts project text inside a double-quoted shell argument (#501). Inside double quotes a
// shell still expands `$(…)` and backticks, so a milestone title or a question copied there would run as a command.
// Project text goes in through a file (`--title "$(cat {dir}/title.txt)"`, `--body-file`), and only a value in a
// checked shape (process/intake.md → Issue text is data) is written into a command. Internal: `pnpm meta` runs it in
// slipway, never in a project. Nothing here spawns a shell: the fixtures are inert text.

import assert from 'node:assert/strict';
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A command a skill tells an agent to run.
const COMMAND = /(^|[\s(|;&])(gh|git|node|pnpm|curl|echo|printf|rg|grep|jq|sh|bash)\s/;
// Placeholders, `{…}` or `<…>`, whose value is shape-checked before it reaches a command, so a double-quoted one is
// safe: a configured setting, a value process/intake.md → Issue text is data limits to letters, digits and
// `. _ / # -`, an issue or milestone number, a sha. Adding a name here says where its shape is checked.
const SHAPED = new Set([
  'repo', 'checkout', 'owner', 'base', 'default branch', 'branch', 'path', 'doc path', 'dir', 'prdir', 'label',
  'project', 'term', 'words', 'n', 'number', 'parent', 'pr', 'sha',
]);

// Every command in a markdown file: each line of a fenced block, and each inline code span, with its line number.
export function commands(md) {
  const out = [];
  const lines = md.split('\n');
  let fence = null;
  const prose = [];
  lines.forEach((l, i) => {
    const f = l.match(/^\s*(`{3,}|~{3,})/);
    if (f && (!fence || (f[1][0] === fence[0] && f[1].length >= fence.length))) {
      fence = fence ? null : f[1];
      prose.push('');
      return;
    }
    if (fence) {
      // A line ending in `\` continues on the next: the command is read whole, from its first line.
      const start = i > 0 && /\\$/.test(lines[i - 1]) ? null : i;
      if (start !== null) {
        let text = l;
        for (let j = i; /\\$/.test(lines[j]) && j + 1 < lines.length; j++) text = `${text.slice(0, -1)} ${lines[j + 1]}`;
        if (COMMAND.test(text)) out.push({ line: i + 1, text });
      }
      prose.push('');
    } else prose.push(l);
  });
  const text = prose.join('\n');
  for (const m of text.matchAll(/(`+)([^`]+?)\1/g)) {
    if (!COMMAND.test(m[2])) continue;
    out.push({ line: text.slice(0, m.index).split('\n').length, text: m[2].replace(/\s*\n\s*/g, ' ') });
  }
  return out;
}

// The double-quoted arguments of one command that carry project text: a `<…>` or `{…}` placeholder whose value no
// shape check covers. Git's `^{commit}` is syntax, not a placeholder. Single quotes expand nothing, and an unquoted
// placeholder is not scanned.
export function unsafeArgs(cmd) {
  const found = [];
  for (const m of cmd.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const names = [...m[1].matchAll(/(?<!\^)\{([a-z][^{}]*)\}|<([A-Za-z][^<>]*)>/g)].map((p) => (p[1] ?? p[2]).trim());
    if (names.some((name) => !SHAPED.has(name))) found.push(m[0]);
  }
  return found;
}

function markdownFiles(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = lstatSync(p);
    if (s.isSymbolicLink()) continue;
    if (s.isDirectory()) markdownFiles(p, out);
    else if (f.endsWith('.md')) out.push(p);
  }
  return out;
}

test('the scan finds project text in a double-quoted argument, inert fixtures', () => {
  // Known-bad: each holds project text where a shell would expand it. Plain strings; nothing runs them.
  const bad = [
    '```bash\ngh issue list --milestone "<title>" --state all\n```',
    'Run `gh issue create --title\n   "<question>" --body "<what it blocks>"` now.',
    'Run `gh issue list --search "{question}"` first.',
    'Run `git commit -m "fix: {subject}"` then.',
    '```bash\ngh issue create --label bug \\\n  --title "<question>"\n```',
    'Run `echo "{question}" > {dir}/title.txt` first.',
    '````markdown\n```\nnot a command\n```\ngh issue list --search "<key words>"\n````',
  ];
  for (const md of bad) {
    const hits = commands(md).flatMap((c) => unsafeArgs(c.text));
    assert.ok(hits.length > 0, `not caught: ${md}`);
  }
  // Known-good: text from a file, a shape-checked value, a digits-only number, words in single quotes.
  const good = [
    '```bash\ngh issue create --repo {repo} --title "$(cat {dir}/title.txt)" --body-file {dir}/issue.md\n```',
    'Run `git log origin/{base} --oneline -5 -- "{path}"`.',
    'Run `gh issue list --milestone {number} --state all`.',
    "Run `gh issue list --search '{words}'`.",
    "Run `gh api repos/{owner}/{repo}/milestones --jq '.[] | \"\\(.number)\\t\\(.title)\"'`.",
    'Write `"<title>"` as the heading.',
  ];
  for (const md of good) assert.deepEqual(commands(md).flatMap((c) => unsafeArgs(c.text)), [], md);
});

test('no skill or process doc puts project text inside a double-quoted shell argument', () => {
  const files = [...markdownFiles(join(SRC, '.claude/skills')), ...markdownFiles(join(SRC, 'process'))];
  assert.ok(files.length > 10, 'the scan read the skills and process docs');
  const found = files.flatMap((f) =>
    commands(readFileSync(f, 'utf8')).flatMap((c) => unsafeArgs(c.text).map((a) => `${relative(SRC, f)}:${c.line} ${a}`))
  );
  assert.deepEqual(found, [], 'put the text in a file and pass it with $(cat …) or --body-file, or pass a shape-checked id');
});

test('/close-milestone reads its issues by the milestone number, never its title', () => {
  const md = readFileSync(join(SRC, '.claude/skills/close-milestone/SKILL.md'), 'utf8');
  const lists = commands(md).filter((c) => /gh issue list[^`]*--milestone/.test(c.text));
  assert.ok(lists.length > 0, 'the skill lists the milestone\'s issues');
  for (const c of lists) assert.match(c.text, /--milestone \{number\}(\s|$)/, `line ${c.line}: ${c.text}`);
  assert.match(md, /`\{number\}`, used only when it is digits/);
  assert.ok(commands(md).some((c) => /issues\/\{n\} -F milestone=\{number\}/.test(c.text)), 'an issue moves by the milestone\'s number');
});

test('/clarify files a tracker with its title from a file and its body from --body-file', () => {
  const md = readFileSync(join(SRC, '.claude/skills/clarify/SKILL.md'), 'utf8');
  const creates = commands(md).filter((c) => /gh issue create/.test(c.text));
  assert.ok(creates.length > 0, 'the skill files an issue');
  for (const c of creates) {
    assert.match(c.text, /--title "\$\(cat \{dir\}\/title\.txt\)"/, `line ${c.line}: ${c.text}`);
    assert.match(c.text, /--body-file \{dir\}\/issue\.md/, `line ${c.line}: ${c.text}`);
  }
  for (const c of commands(md).filter((c) => /--search/.test(c.text))) assert.match(c.text, /--search '\{words\}'/, `line ${c.line}`);
});
