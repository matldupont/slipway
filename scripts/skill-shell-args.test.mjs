#!/usr/bin/env node
// No skill or process doc puts project text inside a double-quoted shell argument (#501). Inside double quotes a
// shell still expands `$(…)` and backticks, so a milestone title or a question copied there would run as a command.
// Project text goes in through a file (`--title "$(cat {dir}/title.txt)"`, `--body-file`), and only a value in a
// checked shape (process/intake.md → Issue text is data) is written into a command. Internal: `pnpm meta` runs it in
// slipway, never in a project. Nothing here spawns a shell: the fixtures are inert text.

import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  'project', 'term', 'n', 'number', 'parent', 'pr', 'sha',
]);

// Every command in a markdown file: each line of a fenced block, and each inline code span, with its line number.
// A fence opens with an info string or none, and, as in CommonMark, closes only with a bare run of its own character
// at least as long. Indentation and a backtick in the info string are not read as CommonMark reads them.
export function commands(md) {
  const out = [];
  const lines = md.split('\n');
  let fence = null;
  let continued = false;
  const prose = [];
  lines.forEach((l, i) => {
    const f = fence ? l.match(/^\s*(`{3,}|~{3,})\s*$/) : l.match(/^\s*(`{3,}|~{3,})/);
    if (f && (!fence || (f[1][0] === fence[0] && f[1].length >= fence.length))) {
      fence = fence ? null : f[1];
      continued = false;
      prose.push('');
      return;
    }
    if (fence) {
      // A line ending in `\` continues on the next: the command is read whole, from its first line. Only a line inside
      // the fence continues; the fence's own opening line never does.
      if (!continued) {
        let text = l;
        for (let j = i; /\\$/.test(lines[j]) && j + 1 < lines.length; j++) text = `${text.slice(0, -1)} ${lines[j + 1]}`;
        if (COMMAND.test(text)) out.push({ line: i + 1, text });
      }
      continued = /\\$/.test(l);
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

// Every markdown file under dir. A symbolic link is never followed, and is listed in `links` so the scan fails on
// it rather than leave what it points at unread.
export function markdownFiles(dir, out = [], links = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = lstatSync(p);
    if (s.isSymbolicLink()) links.push(p);
    else if (s.isDirectory()) markdownFiles(p, out, links);
    else if (f.endsWith('.md')) out.push(p);
  }
  return { files: out, links };
}

test('the scan finds project text in a double-quoted argument, inert fixtures', () => {
  // Known-bad: each holds project text where a shell would expand it. Plain strings; nothing runs them.
  const bad = [
    '```bash\ngh issue list --milestone "<title>" --state all\n```',
    'Run `gh issue create --title\n   "<question>" --body "<what it blocks>"` now.',
    'Run `gh issue list --search "{question}"` first.',
    'Run `gh issue list --search "{words}"` first.',
    'Run `git commit -m "fix: {subject}"` then.',
    '```bash\ngh issue create --label bug \\\n  --title "<question>"\n```',
    'Run `echo "{question}" > {dir}/title.txt` first.',
    '````markdown\n```\ngh issue list --search "<key words>"\n```\n````',
    '```bash \\\ngh issue list --search "<key words>"\n```',
    '````markdown\n````bash\ngh issue list --search "<key words>"\n````\n````',
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

test('the scan lists a symbolic link rather than skip it, an inert link in a temporary folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-shell-args-'));
  try {
    mkdirSync(join(dir, 'skill'));
    writeFileSync(join(dir, 'skill/SKILL.md'), 'text\n');
    symlinkSync(join(dir, 'skill/SKILL.md'), join(dir, 'skill/linked.md'));
    const { files, links } = markdownFiles(dir);
    assert.deepEqual([files.map((f) => relative(dir, f)), links.map((f) => relative(dir, f))], [['skill/SKILL.md'], ['skill/linked.md']]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('no skill or process doc puts project text inside a double-quoted shell argument', () => {
  const read = [markdownFiles(join(SRC, '.claude/skills')), markdownFiles(join(SRC, 'process'))];
  const files = read.flatMap((r) => r.files);
  assert.ok(files.length > 10, 'the scan read the skills and process docs');
  assert.deepEqual(read.flatMap((r) => r.links).map((p) => relative(SRC, p)), [], 'a link is never followed: put the file itself there');
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
  assert.match(md, /`\{number\}`, `\{next\}` and `\{n\}` are each used only when they are digits/);
  assert.ok(commands(md).some((c) => /issues\/\{n\} -F milestone=\{next\}(\s|$)/.test(c.text)), 'an issue moves by the next milestone\'s number');
  assert.ok(commands(md).some((c) => /milestones -F title=@\{dir\}\/milestone-title\.txt/.test(c.text)), 'a new milestone\'s title comes from a file');
  const step = md.replace(/\s+/g, ' ');
  assert.match(step, /When `Issue milestone` is `active` and the next milestone has no GitHub milestone, say which and ask whether to create it now\. On a yes,/, 'a milestone is created only on the owner\'s yes');
  assert.match(step, /On a no, the issue stays where it is, the GitHub milestone stays open, and the close says so in one line\./, 'a no leaves the issue and the milestone, and says so');
  assert.match(step, /once no open issue is left in it, close the GitHub milestone/, 'a milestone closes only when empty');
  assert.match(step, /`\{repo\}` is `Issue repo`, used only when it is `owner\/name`/, 'the repository is shape-checked');
});

test('/close-milestone names the issue repository in every gh command', () => {
  const md = readFileSync(join(SRC, '.claude/skills/close-milestone/SKILL.md'), 'utf8');
  const gh = commands(md).filter((c) => /(^|\s)gh\s/.test(c.text) && !/gh repo view --json nameWithOwner/.test(c.text));
  assert.ok(gh.length >= 5, 'the skill\'s gh commands were read');
  for (const c of gh) assert.match(c.text, /--repo \{repo\}(\s|$)|\srepos\/\{repo\}\//, `line ${c.line}: ${c.text}`);
  assert.match(md, /ask the owner to confirm `\{repo\}`\s+before the first write/);
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
  const check = md.indexOf('node ci/checks/meta/i1-issue-shape.mjs {dir}');
  assert.ok(check >= 0 && check < md.indexOf('gh issue create'), 'the issue check runs before the issue is filed');
  assert.match(md.replace(/\s+/g, ' '), /ask the owner to confirm `\{repo\}` first/, '/clarify confirms the repository before it files');
});
