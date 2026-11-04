// A temporary project for scripts/mutation.test.mjs: a git repository with one workspace package, `pkgs/app`, whose
// `vitest` is the stand-in runner of scripts/fixtures/mutation/standin/, installed offline once so the run's own
// install in its copy needs nothing from the network. `main` holds the base; `work` is checked out for the change.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STANDIN = fileURLToPath(new URL('../fixtures/mutation/standin/', import.meta.url));
const RECORDED = fileURLToPath(new URL('../fixtures/vitest/', import.meta.url));
export const MUTATION = fileURLToPath(new URL('../../ci/mutation.mjs', import.meta.url));

const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function write(root, files) {
  for (const [path, text] of Object.entries(files)) {
    const at = join(root, path);
    if (text === null) {
      rmSync(at, { force: true });
      continue;
    }
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, text);
  }
}

/**
 * @param {{ base?: Record<string, string>, config?: object, version?: string, test?: string | null, pkg?: object, parent?: string }} [o]
 */
export function project({ base = {}, config = {}, version = '5.0.3', test = 'vitest run', pkg = {}, parent = tmpdir() } = {}) {
  const root = realpathSync(mkdtempSync(join(parent, 'mutation-test-')));
  const major = version.split('.')[0];
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  const app = { name: 'app', private: true, ...(test === null ? {} : { scripts: { test } }), devDependencies: { vitest: 'link:../../standin' }, ...pkg };
  write(root, {
    '.gitignore': 'node_modules/\nstandin/state.json\n',
    'package.json': JSON.stringify({ name: 'root', private: true }),
    'pnpm-workspace.yaml': 'packages:\n  - pkgs/*\n',
    'pkgs/app/package.json': JSON.stringify(app),
    'standin/package.json': JSON.stringify({ name: 'vitest', version }),
    'standin/config.json': JSON.stringify(config),
    ...base,
  });
  cpSync(join(STANDIN, 'vitest.mjs'), join(root, 'standin/vitest.mjs'));
  cpSync(join(STANDIN, 'worker.mjs'), join(root, 'standin/worker.mjs'));
  // A version with no recording answers with Vitest 5's, so a run that reads the version first can refuse it.
  cpSync(join(RECORDED, existsSync(join(RECORDED, major)) ? major : '5'), join(root, 'standin/recorded'), { recursive: true });
  execFileSync('pnpm', ['install', '--offline'], { cwd: root, stdio: 'ignore' });
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'base']);
  git(root, ['checkout', '-q', '-b', 'work']);
  const p = {
    root,
    git: (args) => git(root, args),
    // Writes the files (null deletes one) and commits them on the checked-out branch.
    commit(files, message = 'change') {
      write(root, files);
      git(root, ['add', '-A']);
      git(root, ['commit', '-q', '--allow-empty', '-m', message]);
      return p;
    },
    write: (files) => write(root, files),
    config(value) {
      write(root, { 'standin/config.json': JSON.stringify(value) });
      return p;
    },
    // ci/mutation.mjs as a script, in the project: its exit status, its record and what it said on stderr.
    run(args = [], env = {}) {
      const r = spawnSync(process.execPath, [MUTATION, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120_000 });
      let record = null;
      try {
        record = JSON.parse(r.stdout);
      } catch {
        /* none printed */
      }
      return { status: r.status, signal: r.signal, record, stderr: r.stderr, stdout: r.stdout };
    },
    start(args = [], env = {}) {
      return spawn(process.execPath, [MUTATION, ...args], { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    },
    read: (path) => readFileSync(join(root, path), 'utf8'),
    remove: () => rmSync(root, { recursive: true, force: true }),
  };
  return p;
}

// A source file and a test of it: `cart.ts` adds and totals, and its test file holds the tests named.
export const CART = 'export function add(a, b) {\n  return a + b;\n}\nexport function total(xs) {\n  return xs.reduce((s, x) => s + x, 0);\n}\n';
export const testFile = (names, { imports = "import { add } from './cart';" } = {}) =>
  `import { it, expect } from 'vitest';\n${imports}\n\n${names.map((n) => `it('${n}', () => {\n  expect(add(1, 2)).toBe(3);\n});\n`).join('\n')}`;
