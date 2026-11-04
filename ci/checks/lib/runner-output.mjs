// What the tests-can-fail step reads from Vitest (dev/features/tests-can-fail.md §3.5, §3.9, §8, D-037): the listing
// of `vitest list --json --includeTaskLocation`, the result of `--reporter=json`, and in a failed test's
// failureMessages the error's name and the first frame of its stack. Nothing else ties the step to a version.
// The readers are tested on recorded outputs (scripts/fixtures/vitest/), so a reader of the format is tested on the
// format. Pure: it reads values it is handed.

// The Vitest majors scripts/fixtures/vitest/ holds a recording of. A major with none is exit 2 before anything runs.
export const RECORDED_MAJORS = ['4', '5'];
const RANGE = 'Vitest 4 and 5';
const CRASHES = new Set(['TypeError', 'ReferenceError', 'RangeError']);
const NOT_RUN = new Set(['skipped', 'pending', 'todo', 'disabled']);

// The runner's output is not the shape this step was written for: §5's last message, naming the range and the version.
export class RunnerShape extends Error {}
const shape = (what, pkg, version) =>
  new RunnerShape(`The test runner did not ${what}. This step was written for ${RANGE}; ${pkg} has ${version ?? 'no version this step can read'}.`);
export const LISTING = 'say where each test is';
export const RESULT = 'write a result this step can read';

export const isRecordedMajor = (version) => typeof version === 'string' && RECORDED_MAJORS.includes(version.split('.')[0]);

// A test's name as both outputs give it: its describe blocks, then its title, joined by ` > `.
export const titleOf = (entry) => [...(entry.ancestorTitles ?? []).filter(Boolean), entry.title].join(' > ');

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * The listing: each test's absolute file, name and first line. A test with no line throws RunnerShape.
 * @returns {Array<{ file: string, name: string, line: number }>}
 */
export function readListing(value, pkg, version) {
  if (!Array.isArray(value)) throw shape(LISTING, pkg, version);
  return value.map((t) => {
    const line = t?.location?.line;
    if (!isObject(t) || typeof t.file !== 'string' || typeof t.name !== 'string' || !Number.isInteger(line) || line < 1) throw shape(LISTING, pkg, version);
    return { file: t.file, name: t.name, line };
  });
}

/**
 * A result: for each test file, whether it loaded, and each test's name, status and failure messages. A result
 * not of the recorded shape, or a failed test with no failureMessages, throws RunnerShape.
 * @returns {Array<{ file: string, loaded: boolean, tests: Array<{ name: string, status: string, failureMessages: string[] }> }>}
 */
export function readResult(value, pkg, version) {
  if (!isObject(value) || !Array.isArray(value.testResults)) throw shape(RESULT, pkg, version);
  return value.testResults.map((file) => {
    if (!isObject(file) || typeof file.name !== 'string' || !Array.isArray(file.assertionResults)) throw shape(RESULT, pkg, version);
    const tests = file.assertionResults.map((a) => {
      if (!isObject(a) || typeof a.title !== 'string' || typeof a.status !== 'string') throw shape(RESULT, pkg, version);
      const messages = a.failureMessages ?? [];
      if (a.status === 'failed' && (!Array.isArray(messages) || !messages.length || messages.some((m) => typeof m !== 'string'))) throw shape(RESULT, pkg, version);
      return { name: titleOf(a), status: a.status, failureMessages: messages };
    });
    // A file that failed with no test in it did not load: a change broke it, or it never could load.
    return { file: file.name, loaded: !(file.status === 'failed' && tests.length === 0), tests };
  });
}

export const notRun = (status) => NOT_RUN.has(status);

// The first frame of a stack: the absolute file and line, or null when it cannot be read.
function firstFrame(message) {
  const frame = message.split('\n').find((l) => /^\s+at\s/.test(l));
  const m = frame && /(?:\(|\s)(?:file:\/\/)?(\/[^():]+?):(\d+):\d+\)?\s*$/.exec(frame);
  return m ? { file: m[1], line: Number(m[2]) } : null;
}

/**
 * What one failure counts for (§3.9): the error's name is the first word of the first failureMessages entry; a
 * TypeError, ReferenceError or RangeError counts only when the first frame of that entry's stack is in the test's
 * own file, on a line inside one of its `expect(...)` calls. A timeout counts for nothing. A first word that is
 * not an error's name counts for nothing and is named.
 * @param {string[]} messages
 * @param {string} testFile  the test file's absolute path
 * @param {Array<{ first: number, last: number }>} expects
 * @returns {{ counts: true, by: string } | { counts: false, timeout: true } | { counts: false, crash: { type: string, file: string | null, line: number | null } } | { counts: false, unnamed: string }}
 */
export function failure(messages, testFile, expects) {
  const first = messages[0];
  if (/^Error: (?:Test|Hook) timed out in \d+ms/.test(first)) return { counts: false, timeout: true };
  const name = /^((?:[A-Za-z_$][\w$]*)?(?:Error|Exception))(?::|\s|$)/.exec(first)?.[1];
  if (!name) return { counts: false, unnamed: first.split(/[\s:]/)[0].slice(0, 60) };
  if (!CRASHES.has(name)) return { counts: true, by: name };
  const frame = firstFrame(first);
  if (frame && frame.file === testFile && expects.some((e) => frame.line >= e.first && frame.line <= e.last)) return { counts: true, by: `${name} inside an expect` };
  return { counts: false, crash: { type: name, file: frame?.file ?? null, line: frame?.line ?? null } };
}
