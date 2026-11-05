// Records for scripts/mt1.test.mjs: ci/mutation.mjs's empty record with what a case sets, a test of it, and the
// verdict with its exit code, as MT1 would print it.

import { emptyRecord } from '../../ci/mutation.mjs';
import { verdict } from '../../ci/checks/meta/mt1-tests-can-fail.mjs';

export const HEAD = '1111111111111111111111111111111111111111';
export const FILE = 'pkgs/app/src/cart.test.ts';
export const TODAY = '2026-11-04';

export const rec = (o = {}) => ({ ...emptyRecord(600), head: HEAD, base: '2'.repeat(40), seconds: 30, runs: [{ package: 'app', call: 'vitest run', version: '5.0.3' }], ...o });
export const test = (o = {}) => ({
  package: 'app', file: FILE, name: 'adds', line: 3, subjects: ['pkgs/app/src/cart.ts'], tried: 1,
  failedOn: { file: 'pkgs/app/src/cart.ts', line: 2, kind: 'body', by: 'assertion' }, crashes: 0, lastCrash: null,
  unreadFailures: 0, lastUnread: null, state: 'judged', ...o,
});
export const nj = (why, o = {}) => ({ file: `pkgs/app/src/${why}.test.ts`, name: why, why, detail: null, ...o });
export const entry = (id, expires = '2099-12-31') => ({ id, expires, reason: 'r', owner: 'o' });

export function judge(record, { registry = [], head = HEAD, today = TODAY } = {}) {
  const v = verdict(record, { registry, today, head });
  return { ...v, exit: v.broken ? 2 : v.findings.length ? 1 : 0, ids: v.findings.map((f) => f.where), warned: v.warnings.map((w) => w.where) };
}

// Every message a person reads: each finding's and warning's detail with its fix, and an exit 2's message.
export const messages = (v) => [...v.findings, ...v.warnings].map((f) => `${f.detail} ${f.fix ?? ''}`).concat(v.broken ? [v.broken] : []);
