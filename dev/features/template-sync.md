---
prd-ref: D-015
status: draft
---

# F-01 — Template sync: projects take slipway updates without losing anything

## Problem

A project built on slipway has no way to take a newer slipway except by hand. `new-project` copies the
template without history. It records the version only in the first commit (`chore: start from slipway
<sha>`) and the README (`Built on slipway <sha>`), and nothing records which file belongs to whom.

Evidence: sidebar synced by hand twice in two days (matldupont/sidebar#11, #12). Each time an agent
picked files from a slipway sha by judgment: seven files in #12, and `docs/product/FRAME.md`
deliberately left out because the project had filled it in. Nothing checked that a check came with its
fixture, a skill with the lesson it cites, or a library change with every check that calls it. Links read
`none: template sync, no issue`, so the next sync cannot tell what was already taken. Slipway changes
daily (#1–#11 in its first week), so the gap between hand syncs keeps growing.

**Job:** when slipway ships a change, I want to see what my project is missing and take it, so I can keep
the current gates without re-reading slipway's history or risking my own docs.

Decided in D-015: ownership classes, locked managed files, `PL-`/`PD-` prefixes, a script plus a skill.

## Contract

### Ownership classes

Slipway declares every path it ships in `dev/ownership.yaml`: an ordered list of `{ glob, class }`, first
match wins. It uses the declared YAML subset (D-004), like `ci/exceptions.yaml`.

| class | who owns it | what sync does |
|---|---|---|
| `managed` | slipway | replace it when the project's copy still matches its install hash; three-way merge when the path is in the overrides list; refuse when it drifted undeclared |
| `seeded` | the project, after creation | never write it. Report slipway's own diff for it (base → target) so the skill can offer to port it |
| `merged` | both, structurally | `package.json` `scripts` only: add new keys; update a key whose project value still equals the base value; report the rest |
| `internal` | slipway only | never shipped: `dev/**`, `scripts/**`, `STATE.md`, `.git`, `node_modules`, `.DS_Store` |

Initial assignment, to be confirmed in step 1:
- `managed`: `ci/**`, `.github/**`, `.claude/skills/**`, `process/**` (except `process/anchor`), lessons
  `process/lessons/L-*`, `SLIPWAY.md`, `BOOTSTRAP.md`, `docs/features/TEMPLATE.md`, the templates' READMEs.
- `seeded`: `docs/PRD.md`, `docs/product/**`, `docs/milestones/**`, `docs/conventions.md`,
  `docs/domain-invariants.md`, `docs/testing-strategy.md`, `decisions.md`, `AGENT.md`, `CLAUDE.md`,
  `README.md`, `.gitignore`, `process/anchor`.
- `merged`: `package.json`.

Rules that hold for every class:
- A path in the project that is not in the manifest is the project's. Sync never touches it, so adding a
  file always works: a project skill, a project check, a `PL-` lesson.
- A new template file at a path the project already has is a **collision**. It is reported, never
  written.
- A slipway release with an unclassified shipped path is refused by `new-project` and by sync, and O1
  fails in slipway's CI.

**`CLAUDE.md` extension point.** `CLAUDE.md` is `seeded`: projects edit it by design. Its "Stack:" line
changes after D-005–D-008. Slipway's working rules move to a `managed` file that `CLAUDE.md` imports with
`@process/slipway-rules.md`. The rules then update without any merge, and the project's own lines stay
its own. This refines D-015's "marked blocks in `CLAUDE.md`": an import needs no merge logic.

### Manifest and overrides (per project)

`.slipway/manifest.json`, written by `new-project` and rewritten by every sync, in the same commit as the
files it describes:

```json
{
  "slipway": "<full sha of the template version installed>",
  "source": "github:matldupont/slipway",
  "answers": { "name": "Acme", "repo": "owner/acme" },
  "files": { "<path>": { "class": "managed", "sha256": "<hash of the content as written>" } }
}
```

`answers` records the placeholder values, so a sync can reproduce what `new-project` wrote from any
slipway version, the way Copier keeps its answers file.

Under `npx github:…` the package has no `.git`, so `new-project` resolves the sha with `git ls-remote`
and confirms it by comparing every shipped file's hash with that commit's tree. If they don't match, it
records `"slipway": null` with the version, and sync resolves the base by closest match, as adopt does.

`.slipway/overrides.yaml` lists the managed files the project changed on purpose: `path` and `reason`.
Both files are `seeded`.

### D1 — drift (ships to projects)

| finding | fires when |
|---|---|
| `drift/<path>` | a managed file's hash differs from the manifest, or it was deleted, and it is not in overrides |
| `override/stale/<path>` | an override lists a path that matches its manifest hash again, or that is not a managed file in the manifest |
| `override/reason/<path>` | an override has an empty reason; it excuses nothing, so the file's drift is reported too |
| `manifest/missing` | no manifest (BROKEN, not green): the fix is `sync --adopt` |

**In slipway itself** (settled in step 2, #15): template mode. With no manifest and both `dev/ownership.yaml`
and `scripts/new-project.mjs` present — internal files `new-project` never copies, so a project's own
`dev/` folder is not enough — D1 exits green with that exact claim. Adding `d1` to the
project's `meta` only was the alternative, but M1 in slipway fails on a check file no workflow runs.
What proves D1 on a real install is `scripts/new-project.test.mjs` (internal, in slipway's `meta`): it
creates a project, runs D1 and M1 in it, then drifts a file and deletes the manifest.

The sha is confirmed the same way in both places it comes from: slipway's own checkout offers `HEAD`,
anywhere else `git ls-remote <source> HEAD` plus a shallow blobless fetch of that commit's tree, and it
counts only when every copied file's git blob id equals the tree's and every path the commit ships was
copied. A credential in the source URL is stripped before it reaches the manifest. `SLIPWAY_SOURCE` overrides the
source (a fork, or the test's local repository).

### O1 — ownership (slipway only)

`unclassified/<path>`: a path that `new-project` would copy matches no glob. It runs in slipway's CI and
as a precondition in `new-project` and sync. Its fixture is `internal`.

### Sync script

The entry point is a subcommand of the package's existing bin, so the sync code always comes from the
**target** version:

```bash
npx github:matldupont/slipway#<ref> sync            # plan only, the default
npx github:matldupont/slipway#<ref> sync --apply
npx github:matldupont/slipway#<ref> sync --adopt    # a project without a manifest
```

Zero dependencies (D-004): Node stdlib, `git`, and `gh` only for the PR.

1. **Preflight.** Refuse a dirty tree, a detached HEAD, or D1 red. Create `slipway/sync-<short sha>` from
   the current branch; never write to `main`.
2. **Resolve.** The base is the manifest's `slipway` sha and the target is the ref. Read both trees with
   `git archive` or `git show <sha>:<path>` from a clone of `source`, cached in the OS temp dir.
3. **Plan.** Print one row per path: `replace`, `merge`, `add`, `delete`, `keep (edited)`,
   `collision`, `seeded: upstream changed`, `merged: key updated or reported`, `unchanged`. `--plan` stops
   here and writes nothing.
4. **Apply**, class by class:
   - `managed`, pristine: write the target content.
   - `managed`, overridden: `git merge-file <ours> <base> <theirs>`. Conflict markers stay in the file,
     the file is listed in the PR, and sync exits 1.
   - Added in the target: write it unless the path exists (collision).
   - Removed in the target: delete it if pristine, otherwise keep it and report. Git history holds every
     deleted file.
   - `seeded`: write nothing. Save the base → target diff to `.slipway/upstream/<path>.diff` for the
     skill, in the same branch.
   - `merged`: the `package.json` rule above. `new-project` and sync share one function that derives the
     project's `package.json` from the template's.
5. **Record.** Rewrite the manifest, commit everything as `chore: sync slipway <base>..<target>`, and
   print the plan with the commit.

**Harness.** When the target changes `process/harness/settings.json`, sync updates both copies only
because the owner ran it, and it prints that it did, the way `new-project` step 2b does. The skill never
does this step: an agent never installs its own hooks.

**Adopt.** For a project with no manifest, the base comes from `--base`, else from a sha in the
`chore: start from slipway <x>` commit or the README line. Under `npx` that `<x>` is `package.json`'s
version, not a sha (sidebar's says `0.1.0`), so adopt then proposes the **closest match**: the slipway
commit whose tree matches the most of the project's shipped files, with the runner-up's count, for the
owner to confirm. Every current file is
hashed against the base. Pristine files enter the manifest as they are; differing managed files are
listed for the owner to override or revert. Nothing is written until the owner re-runs with
`--adopt --apply`.

### `/sync-slipway` skill (managed, ships to projects)

1. Run `sync` (plan). Explain the base → target change in project terms from `git log` between the two
   shas: conventional-commit subjects, grouped by check, skill or doc.
2. On a yes, have the owner run `--apply`, since the harness step needs the owner.
3. Resolve conflict markers in prose files. Offer each `seeded: upstream changed` diff one at a time:
   port it, adapt it, or decline it with a line in the PR.
4. On adopt: move the project's own lessons and decisions to `PL-`/`PD-`, rewriting citations in
   files the project owns. The manifest lists slipway's own IDs, so which ones are the project's is
   known.
5. Run `pnpm verify` and `pnpm meta`, then open the PR with `## Verification` naming the plan, each
   conflict and how it was resolved, and each seeded diff taken or declined.

Verified against: e801604 2026-09-23 — `new-project` SKIP (scripts/new-project.mjs:34), placeholder
files (:35), version recording (:107, :138, :172), no git tags in slipway, lessons up to L-67, and
sidebar#12's file list.

## Seams

Changes a template, adds two checks and a skill, and changes `new-project`. No person, channel or promise.
It changes what every project receives: a sync that loses work would reach every downstream repo, so each
sync step that deletes or overwrites gets a cold review (`process/cold-review.md`).

## Acceptance

```
Given a project whose managed files all match the manifest
When  sync --apply runs against a newer target
Then  every managed file equals the target, the manifest records the target sha,
      and nothing lands on main
```

```
Given a seeded file (docs/PRD.md) that slipway also changed
When  sync --apply runs
Then  the file's bytes are unchanged and .slipway/upstream/docs/PRD.md.diff holds slipway's diff
```

```
Given an overridden managed file whose lines conflict with the target
When  sync --apply runs
Then  the file holds conflict markers with both sides, sync exits 1, and no line of the project's
      version is missing from the file
```

```
Given a managed file edited without an override
When  pnpm meta runs
Then  D1 reports drift/<path>; and sync --apply refuses before writing anything
```

```
Given a dirty working tree
When  sync --apply runs
Then  it exits non-zero and git status is byte-identical afterwards
```

```
Given a file the target removed, which the project edited
When  sync --apply runs
Then  the file is kept and reported as keep (edited)
```

```
Given sidebar at its current commit, with no manifest
When  sync --adopt runs
Then  the base resolves to the sha in "chore: start from slipway 0.1.0" or the README, every file is
      classified, and nothing is written without --apply
```

## Verify

```
pnpm meta                          # M6 runs D1's and O1's known-bad fixtures
node scripts/checks/sync.test.mjs  # temp-repo cases: one per Acceptance block
node scripts/new-project.mjs /tmp/sync-probe --no-github --dry-run
```

Plus one real run: adopt, then sync, on a throwaway copy of sidebar, with the plan and PR pasted in the PR.

## Build map

Machinery before surface. Each step merges with `pnpm meta` green.

1. **Ownership map and O1** (#14): `dev/ownership.yaml`, O1 with its fixture, and `new-project` taking its skip
   list from the map. Move the working rules to `process/slipway-rules.md` behind a `CLAUDE.md` import.
   Layer: template + check. ~M.
2. **Manifest and D1** (#15): `new-project` writes `.slipway/manifest.json`; D1 with its fixtures; the shared
   `package.json` derivation. ~M.
3. **Sync plan (read-only)** (#16): the bin subcommand, preflight, resolve, classify and print. It writes
   nothing, so it can run against sidebar safely. ~M.
4. **Sync apply** (#17): per-class writes, merge-file, deletes, seeded diffs, manifest rewrite, the harness step.
   Temp-repo tests for every guarantee. Cold review: it writes and deletes. ~L.
5. **`/sync-slipway` and adopt** (#18): the skill, `--adopt`, `PL-`/`PD-` in L1 and in the templates, and
   `SLIPWAY.md`/`BOOTSTRAP.md` text. First real run: sidebar. ~M.

## Out of scope

- **Tagged releases and a changelog.** Sync targets a sha until slipway tags; the skill summarises
  `git log`. Add them when a second project syncs, or when a sync explanation turns out wrong.
- **Per-version migration scripts.** None is needed yet. The first change that must rewrite project
  files adds the `migrations/` runner, with its own fixture.
- **A scheduled "update available" workflow.** It needs tags to compare against; comes after them.
- **Shipping skills as a plugin and checks as a package.** Declined in D-015; revisit if overrides pile
  up.
- **Structured merges beyond `package.json` scripts.** Settings keys and `.gitignore` lines stay
  seeded or managed until a sync shows they need more.

## Open questions

- ~~**How D1 behaves in slipway itself**~~ (settled in step 2, #15): template mode, with a test that runs
  D1 in a created project. See D1 above.
- ~~**Glob matching**~~ (settled in step 1, #14). `path.matchesGlob` is stable on Node 24.12 but never
  matches a dot-segment under `**` (`ci/**` misses `ci/fixtures/…/.github/…`), so
  `ci/checks/lib/ownership.mjs` has its own `*`/`?`/`**` matcher. Its tests are O1's fixture cases, which M6
  compares finding by finding.
- **Does `CLAUDE.md`'s `@import` load in every surface slipway supports** (CLI, desktop, cloud)?
  (Owner: step 1.) Confirm with `/memory` before moving the rules.
- ~~**Project-written files under managed globs**~~ (settled in step 2, #15). D1 checks only the paths
  the manifest lists, so a lesson or skill the project adds under `process/**` or `.claude/skills/**` is
  never policed. (Step 1 already seeds `ci/exceptions.yaml`, the project's own M3 registry.)
- **Review home.** `/review-doc` writes to `docs/reviews/`, which ships. A review of this doc should go
  to `dev/reviews/` until the skill takes a destination.

## Changes

After `status: shipped`, behaviour changes are recorded here as deltas instead of rewriting
the Contract, so the doc stays true without losing its history. One line each:

- <date> · ADDED | MODIFIED | REMOVED · what changed · #PR
