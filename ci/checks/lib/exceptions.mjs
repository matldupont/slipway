// ci/exceptions.yaml, the exception registry: one dated entry per excused finding. FO1 reads the entries that
// excuse a `continue-on-error`; LK1 reads the ones whose id starts `pnpm-lock.yaml#` (lib/pnpm-lock.mjs).

import { existsSync, readFileSync } from 'node:fs';
import { readList } from './yaml-list.mjs';

export function loadRegistry(path) {
  if (!existsSync(path)) return [];
  return readList(readFileSync(path, 'utf8'), ['id', 'expires', 'reason', 'owner']);
}
