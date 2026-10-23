#!/usr/bin/env node
// The prose check (F-16 §8, dev/features/plain-language.md): Vale over the files a person reads.
//
//   node ci/prose.mjs                  the held set and the diff set (pnpm check:prose)
//   node ci/prose.mjs --body <file>    one PR body: the errors fail, the warnings print
//   node ci/prose.mjs --dir <folder>   every .md in a folder, alerts as JSON on stdout (scripts/prose.test.mjs)
//
// The held set (README.md, SLIPWAY.md, the templates, process/writing.md): any error fails, and the warning count
// goes through ci/ratchet.mjs under the key `prose`, so it may only go down. The path table in SLIPWAY.md and
// README.md's path section are held at 0 errors and 0 warnings. The diff set (every other markdown file a person
// reads): an error on a line the change adds fails; a warning on one is printed and never counted.
//
// Every file is read as plain text: it is copied under a `.txt` name, so Vale parses no markdown and honours no comment
// directive or character reference. Every rule but Placeholder reads the copy as written. Placeholder reads a second copy
// with its front matter, fenced blocks and code spans blanked, so `<sha>` in a code span never fires. Line numbers are kept.
//
// Not a meta check: Vale is a binary, and ci/checks/ stays zero-dependency (D-004). With no `vale` on the path the
// script exits BROKEN, never green (decision-defaults §4). CI installs Vale at a pinned version with its sha256
// checked (.github/workflows/ci.yml); locally, `brew install vale` or the release page.

import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withoutHeader } from './checks/lib/frontmatter.mjs';
import { report } from './checks/lib/report.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(ROOT, '.vale.ini');
const ID = 'PROSE';
const UNIT = 'markdown files';

export const HELD = [
  'README.md',
  'SLIPWAY.md',
  'BOOTSTRAP.md',
  'process/writing.md',
  'docs/features/TEMPLATE.md',
  'docs/reviews/TEMPLATE.md',
  'docs/milestones/TEMPLATE.md',
  '.github/pull_request_template.md',
];
const DIFF_SET = [/^process\/[^/]+\.md$/, /^process\/lessons\/[^/]+\.md$/, /^decisions\.md$/, /^docs\/(?!reviews\/).+\.md$/, /^dev\/features\/[^/]+\.md$/];

// Scratch folders hold a blanked copy of what was read (a PR body among them); every exit removes them, a BROKEN one too.
const scratch = [];
process.on('exit', () => scratch.forEach((d) => rmSync(d, { recursive: true, force: true })));
const scratchDir = (name) => {
  const d = mkdtempSync(join(tmpdir(), name));
  scratch.push(d);
  return d;
};
const broken = (why) => process.exit(report({ id: ID, claim: '', scanned: 0, unit: UNIT, broken: why }));

// The copy the Placeholder rule reads: the front matter, each fenced block and each inline code span replaced by filler that
// keeps its line breaks. Front matter and a fenced block become empty lines; a code span becomes one word of x. A
// placeholder hidden in odd markup (a fence GitHub does not open, a span across a block it does not cross) is not defended:
// F-16's Known limitations. Exported for scripts/prose.test.mjs.
export function blank(raw) {
  const out = [];
  let fence = null;
  // A line ends at LF or CRLF, as git counts lines; a lone CR (which Vale and GitHub read as a line end) is a space, so
  // Vale's line numbers are git's. A body edited in the web form arrives with CRLF.
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, ' ');
  // The header is cut by the one reader (ci/checks/lib/frontmatter.mjs) and its lines kept as empty ones.
  const body = withoutHeader(text);
  const lines = [...Array(text.split('\n').length - body.split('\n').length).fill(''), ...body.split('\n')];
  for (const line of lines) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    // CommonMark: the info string of a backtick fence holds no backtick, so such a line is text, not a fence.
    if (fence === null && m && !(m[1][0] === '`' && line.slice(m[0].length).includes('`'))) {
      fence = m[1];
      out.push('');
    } else if (fence !== null) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && /^\s*$/.test(line.slice(m[0].length))) fence = null;
      out.push('');
    } else out.push(line);
  }
  // A backslash before a backtick makes it text (CommonMark), so that one opens no span.
  return out
    .join('\n')
    .replace(/(?<![`\\])(`+)(?!`)((?:(?!\n[ \t]*\n|\n {0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>))[\s\S])+?)(?<!`)\1(?!`)/g, (span) => span.replace(/[^\n]/g, 'x'));
}

function haveVale() {
  const r = spawnSync('vale', ['--version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    broken('vale is not on the path, so no prose was read — install it: `brew install vale`, or the release at https://github.com/errata-ai/vale/releases (CI pins the version in .github/workflows/ci.yml)');
  }
}

const isPlainFile = (path) => {
  const st = lstatSync(path, { throwIfNoEntry: false });
  return st?.isFile() === true;
};

// Runs Vale over `files` (relative to `base`) twice, both times as plain text: each file is copied under a `.txt` name, so
// Vale parses no markdown and honours no comment directive (`<!-- vale off -->`) or character reference. Every rule but
// Placeholder reads the file as written. Placeholder reads a copy with the front matter, fenced blocks and code spans
// blanked (blank()). Returns [{ file, line, rule, severity, message, match }].
function vale(base, files) {
  if (files.length === 0) return [];
  const root = scratchDir('prose-');
  const run = (tree, filter, text) => {
    const dir = join(root, tree);
    for (const f of files) {
      mkdirSync(dirname(join(dir, `${f}.txt`)), { recursive: true });
      writeFileSync(join(dir, `${f}.txt`), text(readFileSync(join(base, f), 'utf8')));
    }
    const r = spawnSync('vale', ['--config', CONFIG, '--no-global', `--filter=${filter}`, '--output=JSON', ...files.map((f) => `${f}.txt`)], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    let json;
    try {
      json = JSON.parse(r.stdout);
    } catch {
      broken(`vale printed no JSON (exit ${r.status}) — run \`vale --config .vale.ini --output=JSON\` on a file to see why`); // never its message: it quotes the text
    }
    return Object.entries(json).flatMap(([file, alerts]) =>
      alerts.map((a) => ({ file: file.replace(/\.txt$/, ''), line: a.Line, rule: a.Check, severity: a.Severity, message: a.Message, match: a.Match })),
    );
  };
  return [...run('raw', '.Name != "Slipway.Placeholder"', (t) => t), ...run('blanked', '.Name == "Slipway.Placeholder"', blank)];
}

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const where = (a) => `${a.file}:${a.line}`;
const finding = (a) => ({ where: where(a), detail: `${a.rule}: ${a.message}` });
const isError = (a) => a.severity === 'error';

// The lines a change adds to `file`, as a Set of line numbers.
function addedLines(base, file) {
  const r = git(['diff', '-U0', '--no-color', '--no-renames', `${base}...HEAD`, '--', file]);
  if (r.status !== 0) broken(`git could not diff ${file} against ${base}`);
  const lines = new Set();
  for (const m of r.stdout.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
    const from = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) lines.add(from + i);
  }
  return lines;
}

// The line ranges held at zero: the path table's rows in SLIPWAY.md, and README.md's "Then follow the path" section.
function zeroRanges() {
  const read = (f) => readFileSync(join(ROOT, f), 'utf8').split('\n');
  const slip = read('SLIPWAY.md');
  const rows = slip.flatMap((l, i) => (/^\|\s*\*\*\d · /.test(l) ? [i + 1] : []));
  const readme = read('README.md');
  const start = readme.findIndex((l) => l === '## Then follow the path');
  if (rows.length === 0 || start < 0) broken('the path table in SLIPWAY.md or README.md\'s "Then follow the path" section was not found, so its 0 warnings were not checked');
  const next = readme.findIndex((l, i) => i > start && /^## /.test(l));
  return { 'SLIPWAY.md': rows.map((n) => [n, n]), 'README.md': [[start + 1, next < 0 ? readme.length : next]] };
}

function runAll(argv) {
  const baseRef = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : (process.env.PROSE_BASE || 'origin/main');
  if (!/^[A-Za-z0-9._/~^-]+$/.test(baseRef ?? '') || git(['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`]).status !== 0) {
    broken(`the base ${JSON.stringify(baseRef)} is not a commit here, so the lines this change adds were not found — fetch it (git fetch origin main) or pass --base <ref>`);
  }
  const changed = git(['diff', '-z', '--name-only', '--no-renames', '--diff-filter=ACMRT', `${baseRef}...HEAD`]);
  if (changed.status !== 0) broken(`git could not list the files changed since ${baseRef}`);
  const diffFiles = changed.stdout
    .split('\0')
    .filter((f) => f && !HELD.includes(f) && DIFF_SET.some((re) => re.test(f)) && isPlainFile(join(ROOT, f)));

  const held = HELD.filter((f) => isPlainFile(join(ROOT, f)));
  if (held.length !== HELD.length) broken(`held files missing or not plain files: ${HELD.filter((f) => !held.includes(f)).join(', ')}`);

  const heldAlerts = vale(ROOT, held);
  const zero = zeroRanges();
  const inZero = (a) => (zero[a.file] ?? []).some(([from, to]) => a.line >= from && a.line <= to);
  const findings = [
    ...heldAlerts.filter(isError).map(finding),
    ...heldAlerts.filter((a) => !isError(a) && inZero(a)).map((a) => ({ where: where(a), detail: `${a.rule}: ${a.message} (this text is held at 0 warnings)` })),
  ];
  const added = new Map(diffFiles.map((f) => [f, addedLines(baseRef, f)]));
  const diffAlerts = vale(ROOT, diffFiles).filter((a) => added.get(a.file)?.has(a.line));
  findings.push(...diffAlerts.filter(isError).map(finding));
  const warnings = diffAlerts.filter((a) => !isError(a)).map(finding);

  const count = heldAlerts.filter((a) => !isError(a)).length;
  const code = report({
    id: ID,
    claim: `the held set has no error, its text in the path has no warning, and the lines this change adds to the diff set have no error`,
    scanned: held.length + diffFiles.length,
    unit: UNIT,
    findings,
    warnings,
  });
  const dir = scratchDir('prose-ratchet-');
  try {
    writeFileSync(join(dir, 'report.json'), `${JSON.stringify({ warnings: count })}\n`);
    const r = spawnSync(process.execPath, [join(ROOT, 'ci', 'ratchet.mjs'), 'prose', join(dir, 'report.json'), 'warnings', ...(argv.includes('--update') ? ['--update'] : [])], { cwd: ROOT, stdio: 'inherit' });
    process.exit(Math.max(code, r.status ?? 2));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runBody(file) {
  if (!file || !isPlainFile(resolve(file))) broken('--body takes the path of a PR body file');
  const dir = scratchDir('prose-body-');
  try {
    writeFileSync(join(dir, 'body.md'), readFileSync(resolve(file), 'utf8'));
    const alerts = vale(dir, ['body.md']);
    process.exit(
      report({
        id: ID,
        claim: 'the PR body has no chatbot phrase, placeholder or recap opening',
        scanned: 1,
        unit: 'PR bodies',
        findings: alerts.filter(isError).map(finding),
        warnings: alerts.filter((a) => !isError(a)).map(finding),
      }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runDir(folder) {
  const base = resolve(folder ?? '');
  if (!folder || lstatSync(base, { throwIfNoEntry: false })?.isDirectory() !== true) broken('--dir takes a folder');
  const walk = (d, rel = '') => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name), `${rel}${e.name}/`) : e.isFile() && e.name.endsWith('.md') ? [`${rel}${e.name}`] : []));
  const alerts = vale(base, walk(base).sort());
  process.stdout.write(`${JSON.stringify({ alerts: alerts.map(({ file, line, rule, severity }) => ({ file, line, rule, severity })) }, null, 2)}\n`);
  process.exit(alerts.some(isError) ? 1 : 0);
}

// Only when run, so scripts/prose.test.mjs can import `blank`.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  haveVale();
  if (argv.includes('--body')) runBody(argv[argv.indexOf('--body') + 1]);
  else if (argv.includes('--dir')) runDir(argv[argv.indexOf('--dir') + 1]);
  else runAll(argv);
}
