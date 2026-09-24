// Reads what CI actually runs, and what those commands invoke.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Every shell command line a workflow runs: inline `run:` values and the lines of
// `run: |` / `run: >` block scalars. A shell comment — a whole line or a trailing unquoted
// ` #` onward — is dropped: a gate that only appears in a comment is not an invocation.
export function stripShellComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i).trimEnd();
  }
  return line.trimEnd();
}

export function workflowCommands(root) {
  const dir = join(root, '.github', 'workflows');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter((e) => /\.ya?ml$/.test(e)).sort()) {
    const rel = `.github/workflows/${f}`;
    const lines = readFileSync(join(dir, f), 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\s*)(-\s+)?run\s*:\s*(.*)$/);
      if (!m) continue;
      const keyIndent = m[1].length + (m[2] ? m[2].length : 0);
      const value = stripShellComment(m[3]).trim();
      if (/^[|>][+-]?[0-9]?[+-]?$/.test(value)) {
        let j = i + 1;
        for (; j < lines.length; j++) {
          const l = lines[j];
          if (/^\s*$/.test(l)) continue;
          if (l.length - l.trimStart().length <= keyIndent) break;
          const cmd = stripShellComment(l.trim());
          if (cmd) out.push({ where: `${rel}:${j + 1}`, cmd });
        }
        i = j - 1;
      } else if (value) {
        out.push({ where: `${rel}:${i + 1}`, cmd: value.replace(/^(['"])(.*)\1$/, '$2') });
      }
    }
  }
  return out;
}

const SEPARATORS = new Set(['&&', '||', ';', '|']);
const PNPM_BUILTINS = new Set([
  'install', 'i', 'add', 'remove', 'rm', 'update', 'up', 'exec', 'dlx', 'x', 'create', 'store', 'fetch',
  'prune', 'link', 'unlink', 'import', 'rebuild', 'outdated', 'list', 'ls', 'why', 'publish', 'pack',
  'audit', 'config', 'env', 'setup', 'init', 'deploy', 'patch', 'patch-commit', 'licenses', 'root',
  'bin', 'doctor', 'self-update', 'approve-builds',
]);
const PNPM_VALUE_FLAGS = new Set(['--filter', '-F', '--dir', '-C', '--workspace-concurrency', '--reporter']);

// Quote-aware: whitespace and `&&` `||` `;` `|` split only outside quotes, so a quoted
// `"node x.mjs"` stays one token and never reads as an invocation.
function tokenize(cmd) {
  const toks = [];
  let cur = '';
  let quote = null;
  let has = false;
  const flush = () => { if (has) toks.push(cur); cur = ''; has = false; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) { if (c === quote) quote = null; else cur += c; continue; }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (/\s/.test(c)) { flush(); continue; }
    const two = cmd.slice(i, i + 2);
    if (two === '&&' || two === '||') { flush(); toks.push(two); i++; continue; }
    if (c === ';' || c === '|') { flush(); toks.push(c); continue; }
    cur += c; has = true;
  }
  flush();
  return toks;
}

// Text-printing commands: their arguments are data, never invocations.
const PRINTERS = new Set(['echo', 'printf']);

// The invocations in one command line. The right side of `||` is conditional (it runs only
// when the left failed), so it is not an invocation (up to the next `;` or `&&`); an `echo`/`printf` segment prints.
//   { kind: 'pnpm-script', script, filters, recursive }
//   { kind: 'turbo', tasks, filtered }
//   { kind: 'node', path }
export function parseCommand(cmd) {
  const toks = tokenize(cmd);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    if (toks[i] === '||') {
      while (i + 1 < toks.length && toks[i + 1] !== ';' && toks[i + 1] !== '&&') i++;
      continue;
    }
    if (PRINTERS.has(toks[i]) && (i === 0 || SEPARATORS.has(toks[i - 1]))) {
      while (i + 1 < toks.length && !SEPARATORS.has(toks[i + 1])) i++;
      continue;
    }
    if (toks[i] === 'pnpm') {
      const filters = [];
      let recursive = false;
      let command = null;
      let script = null;
      let j = i + 1;
      for (; j < toks.length && !SEPARATORS.has(toks[j]); j++) {
        const t = toks[j];
        if (t === '-r' || t === '--recursive') { recursive = true; continue; }
        if (t.startsWith('--filter=')) { filters.push(t.slice('--filter='.length)); continue; }
        if (PNPM_VALUE_FLAGS.has(t)) { if (t === '--filter' || t === '-F') filters.push(toks[j + 1] ?? ''); j++; continue; }
        if (/^-F./.test(t)) { filters.push(t.slice(2)); continue; }
        if (t.startsWith('-')) continue;
        if (command === null) {
          command = t;
          if (t !== 'run' && t !== 'run-script') { script = PNPM_BUILTINS.has(t) ? null : t; break; }
          continue;
        }
        script = t;
        break;
      }
      if (script) out.push({ kind: 'pnpm-script', script, filters, recursive });
      i = j;
    } else if (toks[i] === 'turbo') {
      const tasks = [];
      let filtered = false;
      let sawRun = false;
      let j = i + 1;
      for (; j < toks.length && !SEPARATORS.has(toks[j]); j++) {
        const t = toks[j];
        if (t === 'run') { sawRun = true; continue; }
        if (t === '--filter' || t === '-F') { filtered = true; j++; continue; }
        if (t.startsWith('--filter=') || /^-F./.test(t) || t === '--affected') { filtered = true; continue; }
        if (t.startsWith('-')) continue;
        if (sawRun) tasks.push(t);
      }
      if (tasks.length) out.push({ kind: 'turbo', tasks, filtered });
      i = j;
    } else if (toks[i] === 'node' && toks[i + 1] && !toks[i + 1].startsWith('-')) {
      out.push({ kind: 'node', path: toks[i + 1].replace(/^\.\//, '') });
    }
  }
  return out;
}
