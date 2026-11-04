#!/usr/bin/env node
// The tests-can-fail run (dev/features/tests-can-fail.md §1, §3, §7, §8; #632): ci/mutation.mjs on temporary projects
// whose `vitest` is a stand-in that answers in the recorded shapes (scripts/fixtures/mutation/standin/), and the
// readers it uses. Each part holds one area, so no file grows past what a reader keeps in mind.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import './mutation/calls.part.mjs';
import './mutation/mutants.part.mjs';
import './mutation/run.part.mjs';
import './mutation/changes.part.mjs';
import './mutation/packages.part.mjs';
import './mutation/limits.part.mjs';
import './mutation/processes.part.mjs';
