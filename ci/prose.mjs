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
// directive or character reference. The warning rules read the copy as written. Chatbot and Recap read a copy with each
// phrase as a reader sees it (asSeen()): escapes and character references decoded, odd spaces, invisible characters and
// curly apostrophes made plain, emphasis marks dropped, and the marks before a line's first word taken off. Placeholder reads a third copy with
// its front matter, fenced blocks and code spans blanked, so `<sha>` in a code span never fires. Line numbers are kept.
//
// Not a meta check: Vale is a binary, and ci/checks/ stays zero-dependency (D-004). With no `vale` on the path the
// script exits BROKEN, never green (decision-defaults §4). CI installs Vale at a pinned version with its sha256
// checked (.github/workflows/ci.yml); locally, `brew install vale` or the release page.

import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unseen } from './checks/lib/feature-docs.mjs';
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
// A doc's name ends .md or .markdown in any case, as GitHub renders it.
const DIFF_SET = [/^process\/[^/]+\.(?:md|markdown)$/i, /^process\/lessons\/[^/]+\.(?:md|markdown)$/i, /^decisions\.md$/, /^docs\/(?!reviews\/)[\s\S]+\.(?:md|markdown)$/i, /^dev\/features\/[^/]+\.(?:md|markdown)$/i];

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
    .replace(/(?<!`)(?<!(?<!\\)(?:\\\\)*\\)(`+)(?!`)((?:(?!\n[ \t]*\n|\n {0,3}(?:#{1,6}\s|[-*+]\s|1[.)]\s|>))[\s\S])+?)(?<!`)\1(?!`)/g, (span) => span.replace(/[^\n]/g, 'x'));
}

// The named character references asSeen() decodes: punctuation the two error rules match, apostrophes, spaces and
// characters that print as nothing. Any other name is left as written.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", excl: '!', comma: ',', period: '.', colon: ':', semi: ';', quest: '?',
  lsquo: '\u2018', rsquo: '\u2019', rsquor: '\u2019', nbsp: '\u00a0', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009',
  hairsp: '\u200a', numsp: '\u2007', puncsp: '\u2008', MediumSpace: '\u205f', NonBreakingSpace: '\u00a0', Tab: '\t',
  NewLine: ' ', NoBreak: '\u2060', zwj: '\u200d', zwnj: '\u200c', ZeroWidthSpace: '\u200b', shy: '\u00ad',
};
// A number GitHub replaces (zero, a surrogate, past U+10FFFF) is U+FFFD; a decoded line break is a space, so lines keep
// their numbers.
const decode = (n) => (n === 0 || n >= 0x110000 || (n >= 0xd800 && n <= 0xdfff) ? '\ufffd' : n === 10 || n === 13 ? ' ' : String.fromCodePoint(n));

// The copy the Chatbot and Recap rules read: the text as a reader sees the phrase, with every line break kept, so Vale's
// line numbers are git's. Character-level only, never markdown read: a backslash before ASCII punctuation is dropped
// (CommonMark), a character reference is decoded (a number, or a name in NAMED), a Unicode space is a plain space, a
// character that prints as nothing is taken out (unseen()), a curly apostrophe is a straight one, every emphasis mark
// (`*`, `_`, `~`) is taken out, and the quote and list marks, spaces and tabs before a line's first word are taken off,
// so a phrase wrapped across quoted lines reads as one. A lone CR (which GitHub reads as a line end) becomes a form feed: Vale counts no line for it, Recap reads
// a line start after it, and Chatbot's \s+ crosses it. Exported for scripts/prose.test.mjs.
export function asSeen(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\r')
    .map((part) =>
      unseen(
        part
          .replace(/\\([!-\/:-@[-`{-~])|&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([A-Za-z][A-Za-z\d]{0,31}));/g, (all, esc, dec, hex, name) =>
            esc ?? (dec ? decode(Number(dec)) : hex ? decode(parseInt(hex, 16)) : (Object.hasOwn(NAMED, name) ? NAMED[name] : all)),
          )
          .replace(/[\p{Zs}\r\v\f\u0085\u2028\u2029]/gu, ' '),
      )
        .replace(/[\u2018\u2019\u02bc\u2032\uff07]/g, "'")
        .replace(/[*_~]/g, '')
        .replace(/^(?:[ \t>]|[-+](?=[ \t])|\d{1,9}[.)](?=[ \t]))+/gm, ''),
    )
    .join('\f');
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

// Runs Vale over `files` (relative to `base`) three times, each time as plain text: each file is copied under a `.txt` name,
// so Vale parses no markdown and honours no comment directive (`<!-- vale off -->`) or character reference. The warning
// rules read the file as written, a line ending at LF or CRLF as git counts lines, and a lone CR (which Vale and GitHub
// read as a line end) a space, so Vale's line numbers are git's. Chatbot and Recap read the copy asSeen() makes.
// Placeholder reads a copy with the front matter, fenced blocks and code spans blanked (blank()).
// Returns [{ file, line, rule, severity, message, match }].
function vale(base, files) {
  if (files.length === 0) return [];
  const root = scratchDir('prose-');
  const run = (tree, filter, text) => {
    const dir = join(root, tree);
    for (const f of files) {
      mkdirSync(dirname(join(dir, `${f}.txt`)), { recursive: true });
      writeFileSync(join(dir, `${f}.txt`), text(readFileSync(join(base, f), 'utf8')));
    }
    const r = spawnSync('vale', ['--config', CONFIG, '--no-global', `--filter=${filter}`, '--output=JSON', '--', ...files.map((f) => `${f}.txt`)], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 && r.status !== 1) broken(`vale exited ${r.status}`);
    let json;
    try {
      json = JSON.parse(r.stdout);
    } catch {
      broken(`vale printed no JSON (exit ${r.status}) — run \`vale --config .vale.ini --no-global --output=JSON\` on a file to see why`); // never its message: it quotes the text
    }
    return Object.entries(json).flatMap(([file, alerts]) =>
      alerts.map((a) => ({ file: file.replace(/\.txt$/, ''), line: a.Line, rule: a.Check, severity: a.Severity, message: a.Message, match: a.Match })),
    );
  };
  return [
    ...run('raw', '.Name not in ["Slipway.Placeholder", "Slipway.Chatbot", "Slipway.Recap"]', (t) => t.replace(/\r\n/g, '\n').replace(/\r/g, ' ')),
    ...run('seen', '.Name in ["Slipway.Chatbot", "Slipway.Recap"]', asSeen),
    ...run('blanked', '.Name == "Slipway.Placeholder"', blank),
  ];
}

const git = (args, cwd = ROOT) => spawnSync('git', args, { cwd, encoding: 'utf8' });
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

// The diff set: the files changed since `baseRef` that a person reads, outside the held set. A doc git reads as binary
// (UTF-16, or one with a NUL byte) has no lines git can add, so it is BROKEN, named, never passed unread. Exported for
// scripts/prose.test.mjs, which runs it in a scratch repository (`cwd`).
export function diffSet(baseRef, cwd = ROOT) {
  const changed = git(['diff', '-z', '--numstat', '--no-renames', '--diff-filter=ACMRT', `${baseRef}...HEAD`], cwd);
  if (changed.status !== 0) broken(`git could not list the files changed since ${baseRef}`);
  const rows = changed.stdout.split('\0').filter(Boolean).map((row) => /^(-|\d+)\t(-|\d+)\t([\s\S]*)$/.exec(row));
  if (rows.some((m) => m === null)) broken(`git printed a changed-file row this script cannot read`);
  const files = rows.filter(([, , , f]) => !HELD.includes(f) && DIFF_SET.some((re) => re.test(f)) && isPlainFile(join(cwd, f)));
  const binary = files.filter(([, add, del]) => add === '-' && del === '-').map(([, , , f]) => f);
  if (binary.length > 0) broken(`git reads ${binary.map((f) => JSON.stringify(f)).join(', ')} as binary, so its added lines were not found — save it as UTF-8 text`);
  return files.map(([, , , f]) => f);
}

function runAll(argv) {
  const baseRef = argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : (process.env.PROSE_BASE || 'origin/main');
  if (!/^[A-Za-z0-9._/~^-]+$/.test(baseRef ?? '') || git(['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`]).status !== 0) {
    broken(`the base ${JSON.stringify(baseRef)} is not a commit here, so the lines this change adds were not found — fetch it (git fetch origin main) or pass --base <ref>`);
  }
  const diffFiles = diffSet(baseRef);

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
