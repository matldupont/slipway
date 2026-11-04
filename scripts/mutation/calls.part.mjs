// scripts/mutation.test.mjs, part: how a package's tests are run (runner-call.mjs), what Vitest's output reads as
// (runner-output.mjs, on the recordings of scripts/fixtures/vitest/), and the runner calls' environment.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readTestsCanFail, runnerCall } from '../../ci/checks/lib/runner-call.mjs';
import { failure, readListing, readResult, RECORDED_MAJORS, RunnerShape } from '../../ci/checks/lib/runner-output.mjs';
import { runnerEnv } from '../../ci/checks/lib/mutation-calls.mjs';
import { escapeRegExp } from '../../ci/checks/lib/mutation-processes.mjs';

const VITEST = fileURLToPath(new URL('../fixtures/vitest/', import.meta.url));
// `<copy>` stands for the folder the recording was made in; a real run's paths are absolute.
const recorded = (major, name) => JSON.parse(readFileSync(`${VITEST}${major}/${name}.json`, 'utf8').replaceAll('<copy>', '/tmp/c'));

test('runnerCall() reads the two plain calls, the node flag kept, and refuses the rest with a reason', () => {
  assert.deepEqual(runnerCall('vitest run'), { runner: 'vitest', flags: [], path: null, args: [] });
  assert.deepEqual(runnerCall('vitest'), { runner: 'vitest', flags: [], path: null, args: [] });
  assert.deepEqual(runnerCall('vitest run --project unit'), { runner: 'vitest', flags: [], path: null, args: ['--project', 'unit'] });
  assert.deepEqual(runnerCall('node --env-file-if-exists=.env.test node_modules/vitest/vitest.mjs run'), {
    runner: 'node', flags: ['--env-file-if-exists=.env.test'], path: 'node_modules/vitest/vitest.mjs', args: [],
  });
  for (const script of ['cross-env CI=1 vitest run', 'vitest run && tsc', 'node build.mjs', 'vitest run "a b"']) {
    assert.ok(runnerCall(script).unreadable, script);
  }
});

test('no argument of a test script leaves a word behind as a filter or changes what a one-file run executes (AR-12)', () => {
  // Dropped with its value: the step gives its own reporter and output file.
  for (const script of ['vitest run --reporter verbose', 'vitest run --reporter=dot', 'vitest run --outputFile=x', 'vitest run --outputFile x', 'vitest run --outputFile.json=x', 'vitest run --outputFile.json x', 'vitest run --reporter.x=y', 'vitest run --output-file=x', 'vitest --watch']) {
    assert.deepEqual(runnerCall(script).args, [], script);
  }
  // Refused: the call is the project's to write.
  for (const script of ['vitest run --coverage', 'vitest run --coverage.enabled=true', 'vitest run --shard=1/2', 'vitest run --changed', 'vitest run --bail=1', 'vitest run -t name', 'vitest run --test-name-pattern=x', 'vitest run src/']) {
    assert.ok(runnerCall(script).unreadable, script);
  }
});

test('ci/tests-can-fail.yaml: both keys, neither, an unknown package or key is refused; two run: entries are both kept (AR-13)', () => {
  const names = new Set(['api', 'web']);
  const read = (body) => readTestsCanFail(`entries:\n${body}`, names);
  const two = read('  - package: api\n    run: vitest run --project unit\n  - package: api\n    run: vitest run --project integration\n  - package: web\n    keep-out: e2e/\n    reason: browser tests\n');
  assert.deepEqual(two.runs.get('api'), ['vitest run --project unit', 'vitest run --project integration']);
  assert.deepEqual(two.keepOut, [{ package: 'web', path: 'e2e', reason: 'browser tests' }]);
  for (const [body, says] of [
    ['  - package: api\n    run: vitest run\n    keep-out: e2e\n    reason: x\n', 'not both'],
    ['  - package: api\n    reason: x\n', 'not neither'],
    ['  - package: nope\n    run: vitest run\n', 'no package here is named nope'],
    ['  - package: api\n    runs: vitest run\n', 'cannot read'],
    ['  - package: api\n    run: vitest run && tsc\n', 'not a plain call'],
    ['  - package: web\n    keep-out: e2e\n', 'needs a reason'],
  ]) assert.throws(() => read(body), (e) => e.message.includes(says), says);
});

test('each major has a recording, and the listing gives each test its file, name and line', () => {
  assert.deepEqual(readdirSync(VITEST).filter((f) => !f.includes('.')).sort(), RECORDED_MAJORS);
  for (const major of RECORDED_MAJORS) {
    const listing = readListing(recorded(major, 'listing'), 'web', `${major}.0.0`);
    assert.ok(listing.length > 3);
    for (const t of listing) assert.ok(t.file.startsWith('/tmp/c/') && t.name && t.line > 0, JSON.stringify(t));
    const result = readResult(recorded(major, 'result-passed'), 'web', `${major}.0.0`);
    assert.ok(result[0].loaded && result[0].tests.every((t) => t.status === 'passed'));
  }
});

test('the five recorded failures count, count, count, do not count, and count; a timeout and an unnamed first word count for nothing', () => {
  const testFile = (major, name) => /at (\/tmp\/c[^:]+\.test\.tsx?)/.exec(recorded(major, name).failureMessages[0])?.[1];
  for (const major of RECORDED_MAJORS) {
    const read = (name, file, expects = []) => failure(recorded(major, name).failureMessages, file, expects);
    assert.equal(read('failure-AssertionError', '/nowhere').counts, true, 'an assertion failure');
    assert.equal(read('failure-TestingLibraryElementError', '/nowhere').counts, true, 'a query that found no element');
    assert.deepEqual(read('failure-Error', '/nowhere'), { counts: true, by: 'Error' }, "the code's own throw of a plain Error");
    const crash = read('failure-crash', '/tmp/c/copy/apps/web/src/lib/search.test.ts', [{ first: 1, last: 99 }]);
    assert.equal(crash.counts, false, 'a crash whose first frame is in the code');
    assert.deepEqual({ type: crash.crash.type, line: crash.crash.line }, { type: 'TypeError', line: 11 });
    const inExpect = testFile(major, 'failure-TypeError-in-expect');
    assert.equal(read('failure-TypeError-in-expect', inExpect, [{ first: 15, last: 15 }]).counts, true, 'a TypeError inside an expect');
    assert.equal(read('failure-TypeError-in-expect', inExpect, [{ first: 16, last: 18 }]).counts, false, 'the same TypeError outside every expect');
  }
  assert.deepEqual(failure(['Error: Test timed out in 5000ms.\nIf this is a long-running test…'], '/t', []), { counts: false, timeout: true });
  assert.deepEqual(failure(['boom: something\n    at /t:1:1'], '/t', []), { counts: false, unnamed: 'boom' });
});

test('a listing with no line, or a failure with no failureMessages, throws the message naming the range and the version', () => {
  for (const major of RECORDED_MAJORS) {
    const listing = recorded(major, 'listing').map(({ location, ...t }) => t);
    assert.throws(() => readListing(listing, 'web', '9.1.0'), (e) => e instanceof RunnerShape && e.message === 'The test runner did not say where each test is. This step was written for Vitest 4 and 5; web has 9.1.0.');
    const result = recorded(major, 'result-passed');
    result.testResults[0].assertionResults[0] = { ...recorded(major, 'failure-AssertionError'), failureMessages: undefined };
    assert.throws(() => readResult(result, 'web', '9.1.0'), (e) => e instanceof RunnerShape && e.message.includes('write a result this step can read') && e.message.includes('Vitest 4 and 5; web has 9.1.0'));
  }
});

test('a runner call gets a fixed environment: the kept variables and what GITHUB_ENV holds, nothing else', () => {
  process.env.TCF_PROBE = '1';
  process.env.LC_ALL = 'C';
  try {
    const env = runnerEnv('TCF_PROBE=2\nNOT A LINE\nDATABASE_URL=postgres://localhost/test\n');
    assert.equal(env.TCF_PROBE, '2');
    assert.equal(env.DATABASE_URL, 'postgres://localhost/test');
    assert.equal(env.LC_ALL, 'C');
    assert.equal(env.PATH, process.env.PATH);
    assert.equal('TCF_PROBE' in runnerEnv(''), false);
    for (const key of Object.keys(runnerEnv(''))) assert.ok(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TERM', 'CI'].includes(key) || key.startsWith('LC_'), key);
  } finally {
    delete process.env.TCF_PROBE;
    delete process.env.LC_ALL;
  }
});

test('the folder pgrep looks for is escaped: a + or a ( from TMPDIR is a character', () => {
  const folder = '/tmp/a+b(c)/tests-can-fail-x.y';
  assert.ok(new RegExp(escapeRegExp(folder)).test(`node ${folder}/copy/vitest.mjs`));
  assert.equal(new RegExp(escapeRegExp(folder)).test('node /tmp/aab(c)/tests-can-fail-x.y'), false);
});

test('a dropped flag written without a value does not take the next flag as its value', () => {
  assert.deepEqual(runnerCall('vitest run --outputFile.json --config=vitest.unit.ts').args, ['--config=vitest.unit.ts']);
  assert.deepEqual(runnerCall('vitest run --reporter --project unit').args, ['--project', 'unit']);
});

test('a --root, --dir or --config value that is absolute or leaves the package is refused, in both forms; one inside is kept', () => {
  for (const script of ['vitest run --root ../x', 'vitest run -r /etc', 'vitest run --dir=a/../../b', 'vitest run --config=/tmp/v.ts', 'vitest run -c ../v.ts', 'vitest run --config C:/v.ts']) {
    assert.match(runnerCall(script).unreadable ?? '', /names a path outside the package/, script);
  }
  assert.deepEqual(runnerCall('vitest run --dir src --config=config/vitest.ts --root=.').args, ['--dir', 'src', '--config=config/vitest.ts', '--root=.']);
});

test('a short-flag cluster holding t, any single-dash word holding t, and --t are refused as a name filter; one without t is kept', () => {
  for (const script of ['vitest run -ut=foo', 'vitest run -tu', 'vitest run -at', 'vitest run --t=foo', 'vitest run --t foo', 'vitest run -u1t=foo', 'vitest run -.t=foo', 'vitest run ---t=foo', 'vitest run ----t=foo', 'vitest run ---r=/x', 'vitest run -ur=/abs', 'vitest run -uc=../../x.ts']) assert.match(runnerCall(script).unreadable ?? '', /changes which tests a one-file run executes/, script);
  assert.deepEqual(runnerCall('vitest run -ua').args, ['-ua']);
});
