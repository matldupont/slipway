---
name: sync-slipway
description: Take a newer slipway into this project — explain what changed, have the owner run the sync, resolve its conflicts, settle slipway's changes to the project's own files and ask the owner only about their project, and open the PR. Also adopts sync once in a project created before `.slipway/manifest.json` existed. Use when the user says "sync slipway", "update slipway", "take the latest slipway", "adopt sync", or when D1 reports `manifest/missing`.
---

# Sync slipway

`sync` is a script; this skill is the judgment around it. The script decides what may be written and
writes it. You explain, resolve and record. Run it with the owner present, because two steps are theirs.

**What you never do:**

- Run `sync --apply` or `sync --adopt --apply`, or unset `CLAUDECODE` to get past their refusal. The
  owner runs both in their own terminal. `--apply` installs the harness, and `--adopt --apply` decides
  which edits D1 excuses: an agent never installs its own hooks or excuses its own drift.
- Edit `.slipway/manifest.json`. Sync writes it.
- Edit a managed file, except to resolve conflict markers that sync left in it (step 3).
- Renumber slipway's own `L-`/`D-` IDs. Only the project's own move, to `PL-`/`PD-` (D-015).
- Change a file the project owns beyond what §3 settles or the owner chose. A change that needs a
  project value is never settled.

Every command below is `npx github:matldupont/slipway#<ref> sync …`. `<ref>` is the target: `main`, or
a sha the owner names. In slipway's own checkout it is `node <slipway>/scripts/new-project.mjs sync …`.

## 1 — Plan and explain

Run `sync` (the plan; it writes nothing). If it says there is no manifest, adopt first (§Adopt), then
come back here.

The plan prints the base, the target, slipway's commits between them, one count line per bucket with what
sync does with it, and only the rows that need the owner, each with its next command. `--verbose` prints one
row per path; the `seeded: upstream changed` diffs are references to port by hand, not patches. Explain the
change in the project's terms, not slipway's:

- Group the commit subjects by what they touch, using the conventional-commit scope: **checks** (`m1`,
  `d1`, `ci`…), **skills** (`bootstrap`, `clarify`…), **docs and templates**, **sync itself**. Say
  what each group changes for this project: a new check that may go red, a new step in a skill it uses,
  a template it already filled in.
- Read the rows that need the owner, and say what each will ask of them: `merge` (conflicts possible),
  `collision`, `keep (edited)`, `merged: key reported`, and the harness. `seeded: upstream changed` rows
  mostly settle without them (§3): say that some may bring a question about the project.

Ask for a yes before step 2. A no ends the skill, with nothing written.

## 2 — The owner applies

Give the owner the exact command, to run in **their own terminal**, not through you:

```bash
npx github:matldupont/slipway#<ref> sync --apply
```

It creates `slipway/sync-<target>` from the current branch and commits everything in one commit. Exit 1
means some rows need the owner (step 3). It is not a failure. Read its output together.

## 3 — Resolve

Work through what `--apply` listed, on the sync branch:

- **Conflict markers** (`merge` with conflicts). A prose file you can resolve: keep every line of the
  project's version and take slipway's change around it, then show the owner the result. Code or config
  with a real conflict goes to the owner. The file keeps its override.
- **Seeded diffs**, `.slipway/upstream/<path>.diff`: settle what follows from slipway, then ask the owner
  about the rest, in the project's terms (below). Delete each `.diff` file once every change in it is
  handled.
- **Collision**, **keep (edited)**, **stale override**, **key reported**, **harness**: follow the line
  sync printed for each, with the owner's choice. Removing a stale override from
  `.slipway/overrides.yaml` is an edit the owner approves.

### Seeded diffs: settle, then ask

Each `.diff` is slipway's change to its template copy of a file the project owns. Take its changes one at
a time (one file's diff can hold several), and decide first whether a change needs the owner at all.
Three kinds never do (D-016). Settle them, and record each for the PR's `## Verification` under
**Decided by sync**, with a one-line reason:

- **Already there.** Every line the change adds is already in the project's file. Nothing to write.
- **Not there to change.** The text the change edits, or sits beside, is not in the project's file,
  because the project rewrote or removed it. Decline, and say in the reason what slipway's new text says,
  so the owner can take it at their next edit of that file.
- **Follows from sync.** The change keeps the file in step with a file this sync replaced. That covers
  a link to that file, text that moved into it, slipway's own decision it cites, or slipway's guidance
  (still unedited in the project's file) for a format one of the replaced checks reads. Take it as
  written. When text moved, first confirm that every line the change removes is in the replaced file,
  and keep the project's own lines.

Everything else goes to the owner. So does any change that needs a value only the project has (a
timezone, a tracker, a date, an estimate), even when you can find a likely one: propose it, and say
where you found it. One file often splits: settle part of it, and ask about the rest. Changes that one
answer settles share one question, such as a new PRD section and the milestone field it is built from.

**Asking.** A question is about the project, never the mechanism. It names the project's own thing, what
changes for them, and what each answer means for the project, with your recommendation and what you
found. The owner answers it from what they know of the product. A question never contains `hunk`,
`diff`, `seeded`, `managed`, `port`, `PD-`, `PL-` or a check id (`K1`, `MS1`, `R1`, `D1`). That detail
goes in the PR, beside the owner's answer and the edit it made. Two examples from a real sync
(2026-09-24):

| Asked about the mechanism | Asked about the project |
|---|---|
| "AGENT.md's Timezone row: port as written, or adapt?" | "Which timezone should deadlines and appetite dates use? Your hosting and decisions say Chicago. Left as the machine's local time, CI runs in UTC, so a deadline day ends at 7 pm Chicago time (6 pm in winter)." |
| "FRAME adds a Tracker column that K1 requires once M1 is active: fill it?" | "Where is the test for 'customers will pay for a same-day booking' tracked? I found #9 'pilot sign-up channels'. Is that it?" |

## 4 — Adopted: move the project's own IDs

Only after an adopt, and **right after `--adopt --apply`, on the adopt branch, before step 1's sync**.
At that point a project file cites only IDs that were in the project before the adopt. After a sync or a ported diff, a citation of a newer slipway ID with the same number
would be indistinguishable.

The adopt report listed "the project's own IDs": lessons at paths slipway never shipped, and decisions
that the base's `decisions.md` lacks (or that the target has under a different title, where slipway
reused the number). The list is a proposal: a lesson or decision the project copied from slipway by hand
and then edited can appear in it. Confirm each one with the owner. Then, for each one:

- A lesson: `L-<n>` becomes `PL-<n>` (keep the number). Rename the file to match and change its `id:`.
- A decision: `D-<n>` becomes `PD-<n>` in its `decisions.md` heading.
- Rewrite each citation (`grep -rnw 'L-<n>'`) in the files the project owns: every file that is not
  `managed` in `.slipway/manifest.json`, and never anything under `.slipway/`. Managed files cite
  slipway's IDs only, so leave them as they are.

Never rename an ID the report did not list.

## 5 — Verify and open the PR

Run `pnpm verify` and `pnpm meta`. Both must be green; D1 must be green with no stale override. Commit the
resolutions on the sync branch, then open one PR (`Lane: bounded`) whose body has:

- `## What`: base → target, and the grouped explanation from step 1.
- `## Verification`: the plan as printed, each conflict and how it was resolved, **Decided by sync** (each
  settled change, its file and its one-line reason), each question as asked with the owner's answer and
  the edit it made, each ID moved, and the `pnpm verify` and `pnpm meta` results. Also say what was not
  verified.
- `## Links`: `none: slipway sync <base>..<target>`.

When the sync brings `.gitattributes` for the first time, the PR says so: a working tree checked out
before it keeps CRLF files until `git add --renormalize .`.

## Adopt

For a project created before `.slipway/manifest.json` existed. Run it once, then continue at §1.

1. Run `sync --adopt`. The base is the sha in the first commit or README. When neither names a sha,
   the command stops, proposes the closest slipway commit and shows the runner-up's count. Show
   the owner both, and let them confirm with `--base <sha>`, or name another base.
2. With the base confirmed, the report lists every path the base ships: `pristine`, `differs`,
   `missing`, `seeded`, `merged`. For each managed file that differs or is missing, ask the owner:
   **keep** (the project changed it on purpose, and the reason goes in `overrides.yaml`) or **revert**
   (take the base's bytes; the project's version stays in git history).
3. Give the owner the command to run in their own terminal:

   ```bash
   npx github:matldupont/slipway#<ref> sync --adopt --apply --base <sha> \
     --keep <path>=<reason> --revert <path>
   ```

   It commits the manifest, the overrides and the reverts on `slipway/adopt-<base>`. A file that
   `overrides.yaml` already lists with a reason counts as kept.
4. On that branch, move the project's own IDs (§4) and commit, then run `sync` (§1). Carry the adopt
   report into the PR's `## Verification`.
