---
prd-ref: D-016
status: draft
---

# F-08 — CLI output: sync answers what needs you and what to run next, first

## Problem

**Job:** when I run `sync` to take a newer slipway, I want to see at once whether anything needs me, what
changes for my project and the command to run next, so I can take the update without reading two hundred
lines about slipway's history.

`sync` prints one output for two readers. The owner reads it in their terminal; `/sync-slipway` reads the
same text to explain the sync. The text is shaped for the skill: every commit subject, what each bucket
means, a paragraph on what a base is. The owner pays for it on every run.

Evidence (2026-09-30, a read-only plan on a scratch clone of a private project, base `25b7c28` → target
`a09b863`):

- **207 lines, 186 of them commit subjects**, merge commits and "review round N" fixes included. The line
  that answers "what do I do" is line 206.
- **It contradicts itself.** Seven rows read `yours — slipway's template changed`, which `/sync-slipway` then
  walks the owner through, and the plan ends "Nothing needs you."
- **Machinery shows** (D-016): 40-character shas, "631 rows", "241 unchanged", and the base paragraph on every
  run.
- **The bucket column is 34 characters wide,** padded to its longest label, so every meaning wraps.

The owner's words: "right now it spits out a lot … the point is to answer the right questions at the right
time." Workaround: scroll to the bottom, or let `/sync-slipway` read it. Frequency: every sync in every
project, and `sync` is the command every adopter runs once #91 publishes slipway. Why now: real use hit it
(#43: "the sync and machinery fixes stop here unless real use hits one"), and the public release makes
sync's output a first impression.

Serves D-016's test: output makes sense to someone who never opened slipway's docs, names the project's own
thing and the next action. Serves #43's sync yardstick: afterwards the owner can say what changed.

**Verdict: RESHAPE** — split the two readers, put the verdict first, and give the terminal a considered look
with a small zero-dependency helper. Asking to apply from the plan itself (the ask's fourth part) waits for
its own decision (Out of scope).

| option | for | against | verdict |
|---|---|---|---|
| Do nothing | no work | the verdict stays on the last line of a 200-line plan, and contradicts the rows above it | rejected |
| Cap the commit list at N lines | a one-line change | a symptom: the contradiction, the machinery and the two readers in one output remain | rejected |
| The ask: split readers, verdict first, a vendored look, and `sync` asks "apply?" on a terminal | the whole experience at once | the prompt changes D-015's flow (plan, then the owner runs `--apply`) and adds a stdin path the tests must drive | reshaped |
| A terminal UI dependency (`@clack/prompts`, Ink) | polish for free | npx installs it on every sync; D-015 makes sync a zero-dependency script | rejected |
| **Reshaped:** `--json` for the skill, a verdict-first default, `scripts/lib/ui.mjs` | each reader gets what it needs; no dependency; no flow change | the skill's reading moves to a schema it depends on | **chosen** |

## Contract

Verified against: a09b863 2026-09-30 — read `scripts/sync.mjs` (`main`, `print`, `apply`, `preflight`'s log),
`scripts/lib/summary.mjs`, `scripts/adopt.mjs`'s imports, `scripts/lib/install.mjs` (`syncCommand`),
`.claude/skills/sync-slipway/SKILL.md` steps 1–3, and ran the plan above.

What is true today:

- `sync` accepts `--plan`, `--apply`, `--verbose` (`scripts/sync.mjs` `USAGE`). Refusals print
  `sync: <reason>` to stderr and exit 1.
- The plan (`print`) writes the header (branch, source, full base sha, full target sha, remote, notes), then
  every subject of `git log --format=%s base..target`, merges included, then `BASE_WHY`, then one line per
  non-empty bucket with its meaning (`unchanged` included), then "Needs you" or "Nothing needs you.", then
  "Plan only — nothing was written. Carry it out with: …".
- "Needs you" lists only `collision`, `merged: key reported` and `keep (edited)` rows (`OWNER_ROWS`) and stale
  overrides. `seeded: upstream changed` rows are not in it, because `/sync-slipway` settles most of them.
- `--apply` calls `print` again, then one block per kind of leftover, then "Sync exits 1: …" when a row needs
  the owner. Exit 0, or 1 when the owner owes something (#135 kept that exit from reading as a crash).
- `scripts/lib/summary.mjs` (`BASE_WHY`, `bucketLines`, `needsLines`) is shared with `sync --adopt`.
- `/sync-slipway` step 1 runs the plan, reads the text, and groups the commit subjects by conventional-commit
  scope itself.

### 1. `scripts/lib/ui.mjs` — the terminal look (new, zero dependency)

Node built-ins only (`node:util`, `node:tty`); no package is added [D-015: sync is a zero-dependency script;
D-004 holds for the checks it imports].

- `ui(stream, env = process.env)` returns `{ tty, color, links, width, style, link, clean, section, line }`.
  - `tty`: `stream.isTTY === true`. `color`: `tty`, no `NO_COLOR`, `TERM` not `dumb`; `FORCE_COLOR` set to a
    non-`0` value turns it on anyway. Colour is applied with `util.styleText(format, text, { validateStream:
    false })`, only when `color` is true.
  - `links` (OSC 8 hyperlinks): `tty` and one of `FORCE_HYPERLINK=1`, `TERM_PROGRAM` in `iTerm.app`,
    `vscode`, `WezTerm`, `ghostty`, `WarpTerminal`, or `VTE_VERSION` ≥ 5000. `FORCE_HYPERLINK=0` turns it off.
  - `width`: `stream.columns` when `tty`, else `Infinity` (a pipe is never truncated).
  - `clean(text)`: removes C0 controls except newline and tab, DEL, and C1 controls (U+0080–U+009F), so a
    commit subject or path cannot move the cursor or open an escape.
  - `link(text, url)`: `text` alone unless `links`; otherwise the OSC 8 sequence around `clean(text)`, with a
    `url` that is `file:` or `https:` and holds no control character (anything else: `text` alone).
  - `section(glyph, title)` and `line(text, { indent })`: a title line and a body line on the rail below.
    Glyphs: `◆` a section that needs the owner, `◇` any other section, `│` the rail, `└` the last line. The
    same glyphs print on a pipe; only colour and links depend on the terminal.
- Every string ui.mjs writes goes through `clean`. It never reads stdin and never animates: sync runs
  `spawnSync` throughout, so the event loop cannot draw a spinner.

### 2. `sync --json` — the skill's reader

- `--json` is accepted with `--plan` or alone. With `--apply` it is refused before anything runs:
  `sync: --json is for the plan; --apply prints for the owner — nothing was written`, exit 1. With
  `--verbose` it is refused the same way ("choose one").
- stdout is one JSON document, `JSON.stringify(doc, null, 2)` plus a newline; nothing else is written to
  stdout or stderr on success. Exit 0. A refusal is unchanged: `sync: <reason>` on stderr, exit 1, stdout
  empty. DEL and the C1 controls (U+007F–U+009F), which `JSON.stringify` leaves raw, are written as `\u00XX`
  too: a parser reads the same document.
- The document, schema 1:

  ```json
  {
    "schema": 1,
    "branch": "main",
    "source": "github:matldupont/slipway",
    "base": "<40 hex>",
    "target": "<40 hex> | null",
    "targetVersion": "<version> | null",
    "remote": "<the remote line> | null",
    "notes": ["<note>"],
    "commits": [{ "subject": "<subject>", "type": "feat | null", "scope": "sync | null" }],
    "buckets": [{ "kind": "replace", "label": "replace", "count": 52, "meaning": "<MEANING[kind]>" }],
    "rows": [{ "kind": "replace", "label": "replace", "path": "<path>" }],
    "needsYou": [{ "kind": "<label>", "path": "<path or overrides line>", "next": "<next step>" }],
    "overrides": { "absorbed": [{ "line": 3, "path": "<path>" }], "stale": [{ "line": 5, "path": "<path>" }] },
    "skillChanged": false,
    "alreadyPast": false,
    "nothingToTake": false,
    "next": "pnpm -s use-slipway sync --apply"
  }
  ```

  - `commits`: `git log --no-merges --format=%s base..target`, newest first. `type` and `scope` parse
    `^([a-z]+)(?:\(([^)]+)\))?!?: ` and are `null` when a subject does not match.
  - `buckets`: every kind with a count above 0, `unchanged` included, in `KINDS` order. `rows`: every row, as
    `--verbose` lists them. `needsYou`: the same items the human plan lists under "Needs you by hand".
  - Shas are full here: the skill cites them in the PR.
  - `skillChanged` (#216, added under schema 1): `true` when a row that `--apply` writes (`replace`, `add` or
    `merge`) is `.claude/skills/sync-slipway/SKILL.md` or `process/intake.md`, which the skill cites; else `false`.
  - `targetVersion` (#231, added under schema 1): the release the target is, when the tag `v<version>` in the
    source names the target commit; else `null`.
  - `alreadyPast` (#231, added under schema 1): `true` when the project's base is a descendant of the target.
    Then `rows`, `commits`, `buckets` and `needsYou` are empty, and `next` is the sentence the text plan prints
    (`your project is already past …; nothing to take`), not a command.
  - `nothingToTake` (#245, added under schema 1): `true` whenever nothing is applied. Two cases: `alreadyPast`,
    and a project at the target (base and target are one commit, every row is `unchanged`, and no note
    or override is left to say anything about), with a manifest that records the target's version and either
    that commit or none. A manifest that records another commit or version is corrected by `--apply`, as before. `next`
    is a command; when `nothingToTake` is `true`, it is a sentence for the owner (`Already at <target> — nothing
    to apply, nothing written`, or the `alreadyPast` one). `/sync-slipway` step 1 reads it: it says the sentence
    and stops.
- `/sync-slipway` step 1 runs `sync --json` and explains from it: it groups `commits` by `scope`, and reads
  `needsYou` and the `seeded: upstream changed` bucket for what each will ask. Step 2 is unchanged: the owner
  runs `--apply` in their own terminal and the skill reads that output with them.
- `/sync-slipway` step 5 (#196) writes the sync pull request's `## Gate changes` lines from the check's own
  commands: no schema change; the path list comes from the check's own script after the apply. The skill drafts
  the body, runs `ci/checks/lib/gate-files.mjs` and `ci/checks/meta/p1-pr-body.mjs` as `pr-body.yml` does, and
  writes one line per `gate-changes/unmentioned:<path>` finding. A `sync --json` field was refused: the plan
  runs before the apply, so it would read the project's harness rules, not the target's, and a second matcher
  path would drift from P1. After a sync the script on the branch is the target's version while CI's check
  runs with the base branch's rules; if they differ, the check's finding names the missing path and the session
  adds the line. The verdict and the reason on each line stay the session's judgment.

### 3. The default plan — for the owner

The plan (no flag, or `--plan`) prints, in this order, through ui.mjs (counts illustrative):

```
◇  slipway sync on main · 25b7c28 → use-slipway 0.2.0, commit a09b863 · 164 changes: 21 new, 118 fixes, 25 other
│  remote: <only when not level, or not checked>
│  note: <each note>
│
◆  Needs you by hand (2)
│  collision  docs/x.md
│    next: to keep yours, list it with a reason; to take slipway's, copy its file from a09b863c91e3
│
◇  Settled with you: 7 of your files started from slipway's template, and the template changed.
│  /sync-slipway settles what follows from slipway and asks only about your project.
│
◇  What changes
│  52 slipway files updated · 217 added · 111 removed
│  2 package.json scripts updated
│  1 file slipway stopped shipping stays yours
│  2 overrides removed: slipway's copy now equals yours
│
◇  What's new (21; every change: --log)
│  sync     warn when the checked-out branch is behind its remote
│  intake   issue-shape comments what is missing, not just a label
│  … +13 more
│
└  Next: pnpm -s use-slipway sync --apply
```

- **Order:** header, what needs the owner, what `/sync-slipway` settles, what changes, what's new, next. A
  section with nothing in it is not printed, except "Needs you by hand": with no rows it prints one line,
  `◇  Nothing needs you by hand.`
- **Header:** shas at 7 characters, each a link to `https://github.com/<owner>/<repo>/commit/<sha>` when the
  source is a `github:` source and `links` is on. The change count is the number of non-merge commits, split by
  type: `feat` new, `fix` fixes, anything else other.
- **Needs you by hand:** the items `needsYou` carries, one per path, `next:` beneath each; each path links to
  its `file:` URL in the project when `links` is on.
- **Settled with you:** printed only when the `seeded: upstream changed` bucket is above 0; never "Nothing needs
  you" while it is.
- **What changes:** counts only, in words, never the kind names `replace`, `unchanged` or `rows`; `unchanged`
  is not printed. Removed and stale overrides are said here in one line each kind.
- **What's new:** `feat` commits, newest first, `scope` then the subject with its `type(scope): ` prefix
  removed; at most 8 lines, then `… +N more`. With no `feat` commit, the section is omitted. Each line is
  cut to `width` with `…`.
- **Next:** the command from `syncCommand(root)` with `--apply`. It is the last line.
- `BASE_WHY` is printed by `--help`, not by the plan.
- `--log`: the same plan, with "What's new" replaced by every non-merge commit subject, newest first, uncut.
- `--verbose`: unchanged (one line per path, then the counts), but for control characters: a subject, a
  path or a note is cleaned as ui.mjs cleans, so ordinary text prints byte for byte as before.
- `--log` is the plan's alone: with `--apply`, `--json` or `--verbose` it is refused before anything runs.
- Progress: on a terminal only (stdout and stderr both), before the plan, one line on **stderr**,
  `◇  Reading slipway's history…`, overwritten with `\r` and cleared once the plan is computed. Never on a
  pipe, never with `--json`.

### 4. `--apply` — what it did

`--apply` no longer reprints the plan. It prints, through ui.mjs:

```
◇  slipway sync applied on slipway/sync-a09b863c91e3 (from main) · commit 1a2b3c4
│  chore: sync slipway 25b7c281238b..a09b863c91e3
│  took use-slipway 0.2.0, commit a09b863
│
◆  Needs you before this branch merges (3)
│  docs/y.md  merge — 2 conflicts; resolve them, and keep its override
│  …
│  sync exits 1 until these are settled; nothing failed
│
◇  Settled with you: 7 of your files started from slipway's template, and the template changed.
│  slipway's change to each is saved under .slipway/upstream/ to read, not to apply as a patch.
│  /sync-slipway settles what follows from slipway and asks only about your project.
│
◇  What changed
│  52 slipway files updated · 217 added · 111 removed …
│
└  Next: in Claude Code, /sync-slipway settles the rest and opens the PR (if it sent you here, go back to that session)
```

- The `Next:` line reads the same from both ways in: the owner who started in the terminal, and the one
  `/sync-slipway` sent here.
- The harness, when this run installed it, is said under "What changed" in the past tense, with nothing
  left to run.
- `--apply --verbose` prints the per-path list and its counts first, as the plan's `--verbose` does, then
  the output above.

- "Needs you before this branch merges" holds every leftover `apply` reports today (conflicts, collisions,
  `keep (edited)` both kinds, stale overrides, `script kept, yours differs`, the harness when it is owed), one
  line per path with its instruction. Diffs written under `.slipway/upstream/` are counted in one line under
  "Settled with you", as in the plan.
- **The skill changed in this sync (#216).** The command-line tool is always current, since a project runs slipway's `main` every time; the skill is as of the last sync, so a sync that changes it (or `process/intake.md`, which it cites) says so, and the session reads the new copy before it continues. When `--apply` writes either file, "What changed" ends
  with one line, `The sync skill changed in this sync: once your tree is on the sync commit, read
  .claude/skills/sync-slipway/SKILL.md again before you continue.`; the plan's text never carries it, and
  `--json` carries the same fact as `skillChanged`. The skill's step after the apply says: when the apply
  reported that the skill changed, once your tree is on the sync commit, read the skill again from it and
  follow it from the step after the apply.
- "Already at <target> — nothing to apply, nothing written." stays, as the only line after the header. The
  plan prints it too when there is nothing to take (#245), after the `remote:` line when there is one, and
  names no `--apply`; `--verbose` keeps its listing. A project created from a registry copy records no commit:
  at the target it is told the same, nothing is written, and the commit is recorded by the first sync that
  has something to apply (the base is found by content until then).
- The package's bin sets the exit code and lets the process end (#245): exiting under output a pipe has not
  taken cut `--json` at 65,536 bytes.
- The target reads `use-slipway <version>, commit <sha>` wherever it is shown, or `commit <sha>, not a release`
  when no release tag names that commit (#231, `dev/features/release.md` → Sync with releases).
- Exit codes are unchanged: 0, or 1 when the owner owes something.

### What is reused

- `KINDS`, `LABEL`, `MEANING`, `OWNER_ROWS`, `nextStep`, `staleLine`, `syncCommand` in `scripts/sync.mjs` and
  `scripts/lib/install.mjs`: the words stay, only the layout changes.
- `scripts/lib/summary.mjs` stays as it is for `sync --adopt`; sync stops importing `bucketLines` and
  `needsLines`. `BASE_WHY` moves into sync's `--help`.
- Searched for an existing terminal helper by behaviour (`rg -n "isTTY|NO_COLOR|styleText|\\\\x1b\\[" scripts
  ci`): none; `ci/checks` prints plain text. ui.mjs is net-new.

## Seams

none: developer tooling. It changes what `sync` prints, not what it writes, and adds no person, channel or
promise.

## Threat model

`sync` prints text it did not write: commit subjects from slipway's history (the source can be any URL the
manifest names) and paths from the project. Printed raw, a control sequence in either could move the cursor,
rewrite earlier lines, retitle the terminal, or plant a hyperlink whose text and target differ.

- **Defends:** every string ui.mjs prints passes `clean`; a link's URL is `file:` or `https:` with no control
  character, and its text is cleaned. The JSON output escapes C0 controls by `JSON.stringify`, and DEL and
  the C1 controls after it.
- **Against:** a commit subject or path crafted to act on the owner's terminal.
- **Does not defend:** what the owner's terminal does with printable Unicode (look-alike characters, bidi
  overrides in a subject). D1 already rejects control characters in manifest paths (#33).

## Known limitations

- No animated spinner: sync is synchronous (`spawnSync`), so the progress line is static.
- The hyperlink allowlist misses some terminals; `FORCE_HYPERLINK=1` opts in, `=0` opts out.
- "What's new" relies on conventional-commit subjects; a subject that does not parse counts as other and is
  listed only by `--log`.
- `--json` is sync's alone in this slice; `sync --adopt` keeps its current output.
- `commits` leaves merge commits out, so a change made only in a merge commit has no entry there; its files
  are still in `rows` and `buckets`.
- A project that records no commit (created from a registry copy) and has nothing to take keeps none (#245), so
  each sync finds its base by content until one has something to apply. When several commits hold the same
  slipway files the newest is taken (F-01's limitation), so a base can sit later than the release the project
  came from; template and script changes between the two are then not reported at the first real sync.
- The skill change line (#216) works from the first sync after it ships, since the tool is always current, but
  the skill sentence that tells a session to act on it arrives with that same sync: the first sync still runs on
  the old copy of the skill.

## Acceptance

```
Given the sync test's fixture project behind slipway by commits of type feat, fix and a merge
When  `sync` runs with stdout not a terminal
Then  stdout contains no ESC byte (0x1b), no 40-hex sha, no "rows", no "unchanged", and no fix or merge subject;
      the first section after the header is "Needs you by hand" (or "Nothing needs you by hand."),
      and the last line starts "└  Next: " and ends with "sync --apply"

Given a fixture with 200 non-merge commits (10 feat) and no row that needs the owner
When  `sync` runs
Then  stdout is at most 30 lines, lists 8 feat subjects and "… +2 more"

Given a fixture whose only non-unchanged rows are `seeded: upstream changed`
When  `sync` runs
Then  stdout says "Settled with you: <n> of your files" and never "Nothing needs you."

Given the same fixture
When  `sync --log` runs
Then  every non-merge subject in base..target is printed, and no merge subject

Given the same fixture
When  `sync --json` runs
Then  stdout parses as JSON with schema 1, rows.length equals the row count `--verbose` prints,
      commits has no merge subject, stderr is empty, and the exit code is 0

Given `sync --json --apply` or `sync --json --verbose`
When  it runs
Then  it exits 1 with a `sync: ` line on stderr, stdout is empty, and no branch or file is written

Given a fake terminal stream (isTTY true) with NO_COLOR=1 and FORCE_HYPERLINK=1
When  `sync` runs
Then  stdout has no SGR sequence (ESC "[" … "m") and has an OSC 8 link around a sha

Given a commit subject containing ESC, BEL and U+009B
When  `sync` and `sync --log` print it
Then  none of those characters reaches stdout

Given the fixture with a collision
When  `sync --apply` runs
Then  stdout does not repeat the plan's bucket meanings, lists the collision once with its instruction,
      ends with a line starting "└  Next: ", and the exit code is 1 (0 with nothing owed, as today)

Given `sync --adopt` on the adopt tests' fixtures
When  it runs
Then  its output is unchanged: every existing adopt assertion in scripts/sync.test.mjs passes unedited

Given the finished change
When  `node -e "console.log(Object.keys(require('./package.json').dependencies ?? {}).length)"` runs
Then  it prints 0, and `rg -n "^import" scripts/lib/ui.mjs` shows only `node:` specifiers

Given `.claude/skills/sync-slipway/SKILL.md`
When  `rg -n "sync --json" .claude/skills/sync-slipway/SKILL.md` runs
Then  it matches step 1

`pnpm meta` exits 0.
```

## Verify

```
node scripts/ui.test.mjs
node scripts/sync.test.mjs
node scripts/skills.test.mjs
rg -n "sync --json" .claude/skills/sync-slipway/SKILL.md
pnpm meta
```

Then by hand, on a scratch clone of a real project one release behind: `sync`, `sync --log`, `sync --json |
node -e "JSON.parse(require('fs').readFileSync(0))"`, and `sync` in iTerm or Ghostty (colour and links) and
piped to `cat` (neither). Paste the plain plan's line count in the PR.

## Build map

1. #164 — `scripts/lib/ui.mjs` and `scripts/ui.test.mjs` (capability detection, `clean`, `link`, sections), and the
   test added to `pnpm meta` — scripts, ~200 lines. Nothing prints through it yet.
2. #165 — `sync --json` (§2), its tests in `scripts/sync.test.mjs`, and `/sync-slipway` step 1 reading it — scripts
   and skills, ~250 lines. The human plan is untouched, so the skill never reads text that is about to move.
3. #166 — The default plan, `--log`, the progress line and `--apply`'s output through ui.mjs (§3, §4); `BASE_WHY` to
   `--help`; `scripts/sync.test.mjs` assertions moved to the new layout; F-01's Changes line — scripts, ~400
   lines.

## Out of scope

- **`sync` asks to apply on a terminal** (the plan, then "Apply on `slipway/sync-<sha>`?" when stdin and stdout
  are terminals and `CLAUDECODE` is unset). A later iteration of this doc, with a decision: it changes D-015's
  flow, where the owner runs `--apply` as its own command after reading the plan.
- **`sync --adopt`, `new-project` and `pnpm status` output:** later iterations of this doc, one follow-up each,
  once this ships and a real sync is scored against #43's yardstick.
- **Exit codes:** #135 settled that a sync that needs the owner exits 1 without reading as a crash.
- **A terminal UI dependency** (`@clack/prompts`, Ink, listr2): declined above.
- **Publishing and the command's name:** #91.

## Open questions

none

## Changes

- 2026-09-30 · ADDED · shaped from the owner's report on sync's output · #161
- 2026-10-01 · MODIFIED · step 2 built: `sync --json` and `/sync-slipway` step 1 reading it; `--json` also escapes DEL and C1 controls · #165
- 2026-10-01 · MODIFIED · step 3 built: the plan, `--log`, the progress line and `--apply`'s output through ui.mjs (two spaces after a glyph, as the pictures show); `--verbose` cleans control characters; `--apply`'s `Next:` line serves both ways in · #166
- 2026-10-01 · MODIFIED · `--apply` says when the sync skill (or the doc it cites) changed, `--json` gains `skillChanged`, and `/sync-slipway` reads its new copy before it continues · #216
- 2026-10-05 · MODIFIED · the target is named as its release (`use-slipway <version>, commit <sha>`) or as a commit that is not one; `--json` gains `targetVersion` and `alreadyPast` · #231
- 2026-10-05 · MODIFIED · the plan says "Already at …" when there is nothing to take, `--json` gains `nothingToTake`, and the bin no longer exits under its own output · #245
