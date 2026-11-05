// How the tests-can-fail step runs a package's tests (dev/features/tests-can-fail.md §3.3, D-037): its `test` script,
// or the `run:` entries of ci/tests-can-fail.yaml, read word by word as one of two plain calls to Vitest. This is not
// a shell parser and does not become one: a script it cannot read is the project's to state. Pure: it reads text.

import { readList } from './yaml-list.mjs';

// A word of a call: letters, digits and `. _ / = : @ -`. A quote, `&&`, `|`, `;`, `$` or `>` is a shell's to read.
const WORD = /^[A-Za-z0-9._/=:@-]+$/;
// Flags whose value is the next word. Any other word that is not a flag would be left behind as a filter.
const TAKES_VALUE = new Set(['--project', '--config', '-c', '--root', '-r', '--dir', '--environment', '--pool', '--mode']);
// Dropped, with their value: the step gives its own.
const DROPPED = new Set(['--reporter', '--outputFile']);
// What changes which tests a one-file run executes, or what it does: the call is the project's to write.
const REFUSED = ['--coverage', '--shard', '--changed', '--bail', '--testNamePattern', '-t', '--related', '--tagsFilter'];

const refused = (word) => REFUSED.some((f) => word === f || word.startsWith(`${f}=`) || word.startsWith(`${f}.`));
// A single-dash word holding `t` before any `=` (`-ut=foo`, `-u1t`) can be read by the runner's argument parser as
// a name filter too; each is refused, whatever its other characters. The parser reads a word of three or more dashes
// as a cluster as well, so every such word is refused.
const dashes = (word) => word.length - word.replace(/^-+/, '').length;
const clusterWithT = (word) => dashes(word) > 2 || (/^-[^-]/.test(word) && word.split('=')[0].includes('t'));
// A cluster holding `r` or `c` (`-ur=`) names the root or config past the path check below: each flag goes on its own.
const clusterWithPath = (word) => /^-[^-]/.test(word) && word.split('=')[0].length > 2 && /[rc]/.test(word.split('=')[0]);
// The parser reads a one-letter flag written with two dashes (`--t`, `--r=x`) as the one-dash flag.
// It writes a flag's name into the options it hands the runner, split at each `.`, and keeps the words it leaves
// behind as file filters under `_`. A name holding `_`, or a segment every object already has (`constructor`,
// `toString`…) or `prototype`, is written outside those options or into that list. Each segment is read as the parser
// writes it: past a leading `no-`, and with `-x` as `X` (`--no-to-string` is `toString`). No option of Vitest 4 or 5
// is named any of these ways.
const OBJECT_KEYS = new Set([...Object.getOwnPropertyNames(Object.prototype), 'prototype']);
const outsideOptions = (word) => {
  const name = word.split('=')[0];
  const keys = name.replace(/^-+/, '').replace(/^no-/, '').split('.');
  return name.includes('_') || keys.some((key) => OBJECT_KEYS.has(key) || OBJECT_KEYS.has(key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())));
};
const oneLetter = (word) => (/^--[A-Za-z](=|$)/.test(word) ? word.slice(1) : word);
// Flags whose value is the config file or the folder the runner starts from: it stays inside the package. Other
// flags that name a path (setup files, a node flag) are not read here.
const PATHS = new Set(['--config', '-c', '--root', '-r', '--dir']);
const leaves = (value) => value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.split('/').includes('..');

/**
 * @param {string} script  a `test` script or a `run:` entry
 * @returns {{ runner: 'vitest' | 'node', flags: string[], path: string | null, args: string[] } | { unreadable: string }}
 *   `path` is the node form's path to vitest.mjs, as written; `args` are the call's own arguments, `run` and the
 *   step's own flags left out.
 */
export function runnerCall(script) {
  const words = String(script).trim().split(/ +/);
  const bad = words.find((w) => !WORD.test(w));
  if (bad !== undefined) return { unreadable: 'it holds a word that is not plain' };
  let at = 0;
  const flags = [];
  let path = null;
  let runner;
  if (words[0] === 'vitest') {
    runner = 'vitest';
    at = 1;
  } else if (words[0] === 'node') {
    runner = 'node';
    at = 1;
    while (at < words.length && words[at].startsWith('-')) flags.push(words[at++]);
    path = words[at++] ?? '';
    if (!/(^|\/)vitest\.mjs$/.test(path)) return { unreadable: 'its node call does not run vitest.mjs' };
  } else return { unreadable: 'its first word is neither vitest nor node' };
  if (words[at] === 'run') at += 1;
  const args = [];
  while (at < words.length) {
    const word = oneLetter(words[at++]);
    // cac reads --test-name-pattern as --testNamePattern.
    const name = word.split('=')[0].replace(/(?<=^--.+)-([a-z])/g, (_, c) => c.toUpperCase());
    // --outputFile.json=x and --reporter.x are the same flags, keyed by reporter.
    const base = name.split('.')[0];
    if (word === '--watch' || word === '--run') continue;
    if (word.startsWith('-') && outsideOptions(word)) return { unreadable: `it passes ${word.split('=')[0]}, which the runner's argument parser writes outside its options` };
    if (DROPPED.has(base)) {
      if (!word.includes('=') && !words[at]?.startsWith('-')) at += 1;
      continue;
    }
    if (refused(name) || refused(word) || clusterWithT(word)) return { unreadable: `it passes ${clusterWithT(word) ? word.split('=')[0] : name}, which changes which tests a one-file run executes` };
    if (clusterWithPath(word)) return { unreadable: `it passes ${word.split('=')[0]}, which names the root or config inside a cluster of flags` };
    if (word.includes('=') && PATHS.has(name) && leaves(word.slice(word.indexOf('=') + 1))) return { unreadable: `its ${name} names a path outside the package` };
    if (TAKES_VALUE.has(word)) {
      const value = words[at++];
      if (value === undefined || value.startsWith('-')) return { unreadable: `${word} has no value` };
      if (PATHS.has(word) && leaves(value)) return { unreadable: `its ${word} names a path outside the package` };
      args.push(word, value);
      continue;
    }
    if (!word.startsWith('-')) return { unreadable: `it leaves ${word} behind as a filter` };
    args.push(word);
  }
  return { runner, flags, path, args };
}

// The exit-2 message for a script runnerCall() cannot read (§3.3), the script quoted by the caller's escape.
export const unreadableScript = (pkg, script) =>
  `\`${pkg}\`'s \`test\` script is not a plain call to the test runner, so this step cannot tell which tests it runs: ${script}. Write the call in \`ci/tests-can-fail.yaml\`: \`- package: ${pkg}\` and \`run: vitest run …\` or \`run: node … node_modules/vitest/vitest.mjs run …\`.`;

/**
 * ci/tests-can-fail.yaml (§3.3, §6), read strictly: one list of entries, each a `run:` or a `keep-out:` with a
 * `reason:`. Throws, naming the line, on an entry with both or neither, a package not in `names`, a key not
 * named here, or a `run:` runnerCall() cannot read.
 * @param {string} text
 * @param {Set<string>} names  the workspace's package names
 * @returns {{ runs: Map<string, string[]>, keepOut: Array<{ package: string, path: string, reason: string }> }}
 */
export function readTestsCanFail(text, names) {
  let entries;
  try {
    entries = readList(text, ['package', 'run', 'keep-out', 'reason'], { strict: true });
  } catch (e) {
    throw new Error(`ci/tests-can-fail.yaml: ${e.message}`);
  }
  const runs = new Map();
  const keepOut = [];
  for (const entry of entries) {
    const where = `ci/tests-can-fail.yaml: line ${entry.line}`;
    if (!names.has(entry.package)) throw new Error(`${where}: no package here is named ${entry.package}`);
    const hasRun = 'run' in entry;
    const hasKeepOut = 'keep-out' in entry;
    if (hasRun === hasKeepOut) throw new Error(`${where}: an entry holds a run: or a keep-out:, not ${hasRun ? 'both' : 'neither'}`);
    if (hasRun) {
      const call = runnerCall(entry.run);
      if (call.unreadable) throw new Error(`${where}: the run: is not a plain call to the test runner (${call.unreadable})`);
      runs.set(entry.package, [...(runs.get(entry.package) ?? []), entry.run]);
    } else {
      const path = entry['keep-out'].replace(/\/+$/, '');
      if (!path || path.split('/').includes('..') || path.startsWith('/')) throw new Error(`${where}: keep-out: names no path inside the package`);
      if (!entry.reason?.trim()) throw new Error(`${where}: a keep-out: needs a reason:`);
      keepOut.push({ package: entry.package, path, reason: entry.reason });
    }
  }
  return { runs, keepOut };
}
