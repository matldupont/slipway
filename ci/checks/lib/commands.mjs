// Reads what CI actually runs, and what those commands invoke.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Every shell command line a workflow runs: inline `run:` values and the lines of
// `run: |` / `run: >` block scalars. Shell comment lines inside a block are dropped:
// a gate that only appears in a comment is not an invocation.
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
      const value = m[3].replace(/\s+#.*$/, '').trim();
      if (/^[|>][+-]?[0-9]?[+-]?$/.test(value)) {
        let j = i + 1;
        for (; j < lines.length; j++) {
          const l = lines[j];
          if (/^\s*$/.test(l)) continue;
          if (l.length - l.trimStart().length <= keyIndent) break;
          const cmd = l.trim();
          if (!cmd.startsWith('#')) out.push({ where: `${rel}:${j + 1}`, cmd });
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

const tokenize = (cmd) =>
  cmd.replace(/(&&|\|\||;|\|)/g, ' $1 ').split(/\s+/).map((t) => t.replace(/^['"]|['"]$/g, '')).filter(Boolean);

// The invocations in one command line:
//   { kind: 'pnpm-script', script, filters, recursive }
//   { kind: 'turbo', tasks, filtered }
//   { kind: 'node', path }
export function parseCommand(cmd) {
  const toks = tokenize(cmd);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
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
