#!/usr/bin/env node
// MT1, the tests-can-fail verdict (dev/features/tests-can-fail.md §1, §4, §5; #633): what it must not report, which
// PC1 cannot hold (it fails a case that passes), its messages, the "MT1 on that record" halves of step 3's blocks on
// the stand-in project of scripts/mutation/, and where the step runs and where it does not. Each part holds one area.
// Internal: `pnpm meta` runs it in slipway, never in a project.

import './mt1/records.part.mjs';
import './mt1/messages.part.mjs';
import './mt1/run.part.mjs';
import './mt1/wiring.part.mjs';
