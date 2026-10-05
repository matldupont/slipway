#!/usr/bin/env node
// The release rule (D-027, F-10: dev/features/release.md), run by .github/workflows/release.yml so none of it
// is inline shell. Internal: no project receives it. Node built-ins only (D-004).
//
//   release.mjs <tag>       the tag is v<MAJOR>.<MINOR>.<PATCH> with an optional -pre part and nothing else, it
//                           equals `v` + package.json's version, and npm can stage (11.15.0 or later). Prints one
//                           line, `label=next` for a pre-release and `label=latest` otherwise.
//   release.mjs --summary   reads `npm pack --dry-run --json` on stdin and prints what is about to be staged, as
//                           markdown: the owner compares it with the staged package before approving.
//
// Any failure exits 1 with its reason on stderr and nothing on stdout: stdout goes to $GITHUB_OUTPUT and
// $GITHUB_STEP_SUMMARY. package.json is the one beside this folder, never the working directory's. These guard
// the owner's mistakes; they are not security controls: a run that edits this file removes them.
//
// It imports nothing but node: built-ins, on purpose: the job that holds the publishing identity runs this one
// file of the repository and no other (scripts/release.test.mjs holds that).

import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const NPM_MIN = '11.15.0';
const TAG = /^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const PLAIN = /^(\d+)\.(\d+)\.(\d+)$/;
// Text headed to a job summary, on one line: no control character, and none that reorders or hides text (bidi
// and zero-width formats, line and paragraph separators). scripts/lib/ui.mjs has `oneLine` for a terminal; it is
// not imported, see above.
const oneLine = (text) => String(text).replace(/[\n\t\u2028\u2029]+/g, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '');
// A value as it was given, on one line: a tag can hold a line break.
const shown = (v) => JSON.stringify(v) ?? String(v);

// 'latest' or 'next' for a release of `version` tagged `tag`, staged by npm `npmVersion`. Throws otherwise.
export function label(tag, version, npmVersion) {
  const both = `the tag is ${shown(tag)} and package.json's version is ${shown(version)}`;
  if (!TAG.test(tag)) {
    throw new Error(`${both}: a release tag is v<MAJOR>.<MINOR>.<PATCH> with an optional -pre part of letters, digits, . and -, and nothing else`);
  }
  if (typeof version !== 'string' || tag !== `v${version}`) throw new Error(`${both}: the tag must be v + that version — set the version in a pull request first, then tag its merge commit`);
  const found = PLAIN.exec(typeof npmVersion === 'string' ? npmVersion : '');
  if (!found) throw new Error(`staging needs npm ${NPM_MIN} or later, and npm's version reads as ${shown(npmVersion)}`);
  const min = PLAIN.exec(NPM_MIN);
  for (let i = 1; i <= 3; i++) {
    if (Number(found[i]) > Number(min[i])) break;
    if (Number(found[i]) < Number(min[i])) throw new Error(`staging needs npm ${NPM_MIN} or later, and this is npm ${npmVersion}`);
  }
  // Read from the version, never from the tag's text; after the checks above the two are equal.
  return version.includes('-') ? 'next' : 'latest';
}

// What `npm pack --dry-run --json` printed, as markdown. Every value sits in a fenced block, cleaned to one
// line, so a file's name is shown and never read as markup. Throws on anything but npm's list.
export function summary(packJson) {
  let pack;
  try {
    pack = JSON.parse(packJson)[0];
  } catch {
    pack = null;
  }
  const fields = ['name', 'version', 'integrity', 'shasum'];
  const files = pack?.files;
  if (!pack || fields.some((f) => typeof pack[f] !== 'string' || pack[f] === '') || !Array.isArray(files) || files.length === 0 || files.some((f) => typeof f?.path !== 'string')) {
    throw new Error('the input is not what `npm pack --dry-run --json` prints: a list holding one package with its name, version, integrity, shasum and files');
  }
  const head = [...fields.map((f) => `${`${f}:`.padEnd(11)}${oneLine(pack[f])}`), `${'files:'.padEnd(11)}${files.length}`].join('\n');
  const list = files.map((f) => oneLine(f.path)).join('\n');
  const longest = Math.max(0, ...(`${head}\n${list}`.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `## What is about to be staged\n\n${fence}\n${head}\n${fence}\n\nCompare the integrity and the files with the staged package before approving it.\n\n${fence}\n${list}\n${fence}\n`;
}

function main(args) {
  if (args.length !== 1) throw new Error('usage: release.mjs <tag> | release.mjs --summary < the output of `npm pack --dry-run --json`');
  if (args[0] === '--summary') return summary(readFileSync(0, 'utf8'));
  const manifest = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  let version;
  try {
    version = JSON.parse(readFileSync(manifest, 'utf8')).version;
  } catch (e) {
    throw new Error(`the tag is ${shown(args[0])}, and package.json's version cannot be read (${shown(e.code ?? e.message)})`);
  }
  const npm = spawnSync('npm', ['--version'], { encoding: 'utf8' });
  const npmVersion = npm.error || npm.status !== 0 ? `nothing (${npm.error?.code ?? `npm exited ${npm.status}`})` : npm.stdout.trim();
  return `label=${label(args[0], version, npmVersion)}\n`;
}

const invoked = (() => {
  try {
    return realpathSync(resolve(process.argv[1] ?? '')) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
if (invoked) {
  try {
    process.stdout.write(main(process.argv.slice(2)));
  } catch (e) {
    process.stderr.write(`release: ${e.message}\n`);
    process.exitCode = 1;
  }
}
