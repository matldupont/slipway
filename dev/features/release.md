---
prd-ref: D-027
status: draft
---

# F-10 — Release: slipway is published to npm as `use-slipway`, staged from version tags in CI

## Problem

Today a project starts with `npx github:matldupont/slipway acme` and takes updates from
`github:matldupont/slipway#main` (`package.json:15`, `scripts/lib/install.mjs:15`). So every new project and
every sync takes whatever `main` is at that moment. There are no versions to pin, announce or roll back to, and
the first command on the landing page is a GitHub address. `slipway` is taken on npm by an unrelated package;
`use-slipway` is the owner's, reserved as the placeholder `use-slipway@0.0.0`.

**Job:** when I start a project or take a slipway update, I want to name a released version instead of whatever
`main` is today, so I can see what I am taking, pin it, and go back.

Epic #43; issue #91. The owner decided on 2026-09-25 to publish as `use-slipway` when the landing page (#55) goes
live, and on 2026-10-05 the release rule, where their approval sits, and the licence (D-027).

**Argued against.** The ask survives; the form of the release is what was decided.

| option | for | against | verdict |
|---|---|---|---|
| keep the GitHub form only | nothing to publish or secure | no versions; the landing page's first command is a repository address | rejected |
| publish from a maintainer's machine | one command | a long-lived token on a laptop; no provenance | rejected |
| publish on every merge to `main` | no tag step | a version per merge; a release nobody chose; a bad merge ships | rejected |
| CI publishes directly on a tag, after an approval click on the GitHub run | one click | the click comes before the package exists, so it does not bind what is published; an action whose tag moved after the click publishes anything | rejected |
| scoped package or organisation | cleaner namespace | a second thing to own; `use-slipway` is the owner's already | declined |
| **CI stages the release on a version tag (npm trusted publishing, provenance); the owner approves that exact package at npm with their second factor** | no token anywhere; each release is chosen twice (the tag, the approval); the approval binds the package itself | a one-time setup by hand on npmjs.com and GitHub; one approval per release | **proceed** |

## Contract

Verified against: 66ac014 2026-10-05 — re-read on `main`: `package.json`, `scripts/new-project.mjs`,
`scripts/lib/install.mjs`, `scripts/lib/base.mjs`, `scripts/sync.mjs`, `dev/ownership.yaml`,
`.github/workflows/ci.yml`, `ci/checks/meta/pk1-packed.mjs`, `w1-declared-vs-invoked.mjs`, `fo1-fail-open.mjs`.
npm's rules read the same day at `https://docs.npmjs.com/trusted-publishers` and
`https://docs.npmjs.com/staged-publishing`; the registry read with `npm view use-slipway`.

### The release rule (D-027)

- **What a release is.** A pull request that sets `package.json`'s `version`, merged to `main`; then the tag
  `v<version>` pushed by the owner on that merge commit; then the owner's approval of the staged package at npm.
  Nothing else publishes: no merge, no schedule, no local machine. A session never creates or pushes a tag, never
  publishes and never approves.
- **Numbers.** Semantic versions. While below 1.0, a breaking change to what a project receives or to a command
  raises the minor number, anything else the patch number. The tag must equal `package.json`'s `version`. The
  first releases are `0.1.0-rc.1`, then `0.1.0`, above the placeholder `0.0.0`.
- **Pre-releases.** A version with a pre-release part (`0.2.0-rc.1`) goes out under the npm label `next`, never
  `latest`. Whether a version is a pre-release is read from `package.json`'s `version` after the equality check,
  never from the tag's text.
- **How a project moves.** A project's `use-slipway` script runs `npx --loglevel=error use-slipway@latest`, so it
  takes the newest release each time it syncs. To pin, the owner edits that one line to `use-slipway@0.3.0`.
  Sync treats the script as a merged key: it updates the line while the project's value still equals slipway's
  old one, and reports the line, never overwrites it, once the owner changed it.
- **A published version is final.** A rerun on a version npm already holds fails at npm, on purpose: a version is
  never replaced; a fix is the next version.
- **No credential anywhere.** Publishing uses npm trusted publishing (the workflow's OIDC identity). There is no
  `NPM_TOKEN`, in the repository or on a machine, and the package is set to refuse tokens.

### What holds a release, layer by layer

npm matches a trusted publisher on the repository, the workflow's file name and, when one is set, the
environment. It does not check the ref, the tag or the file's content. So any run of a file named `release.yml`
in the repository holds the publishing identity unless something outside the commit stops it. The layers, each
with where it lives and what it stops:

| layer | lives in | stops |
|---|---|---|
| The environment `npm`, limited to `v*` tags, named in npm's publisher link | GitHub settings | a branch or pull-request run of a file named `release.yml` getting the identity |
| A tag ruleset: only the owner creates, moves or deletes `v*` | GitHub settings | another collaborator, an app or a workflow's token minting a release tag |
| The harness asks before any `git push` | the owner's machine | a session with the owner's credentials pushing a tag unasked (GitHub cannot tell that session from the owner) |
| The publisher is stage-only: it may run `npm stage publish`, never `npm publish` or `npm dist-tag` | npm settings | a hostile run publishing or moving a label: it can only stage |
| The owner approves the staged package with their second factor | npm | everything that passed the layers above; no session holds the second factor |
| The package requires two-factor authentication and disallows tokens | npm settings | a publish with a token from any machine |
| Repository name, ancestor of `main`, tag equals version, npm version | `release.yml` | the owner's mistakes only: a run that edits the file removes them. Not security controls |

### Package identity

- `package.json`: `name` becomes `use-slipway`; `private: true` is dropped; `bin` is
  `{"use-slipway": "scripts/new-project.mjs"}`, the one bin (the `create-slipway` bin is dropped, and the comment at
  `scripts/new-project.mjs:10` that promises `npm create slipway` goes with it). It gains `"license": "MIT"` and
  `"repository": {"type": "git", "url": "git+https://github.com/matldupont/slipway.git"}`: npm refuses a
  provenance publish whose `repository.url` does not match the repository that built it.
- A `LICENSE` file at the root holds the MIT text, with `matldupont` as the holder unless the owner changes the
  line in review. It is `internal` in `dev/ownership.yaml`: slipway's licence is not a project's.
- No `files` field is added: what ships stays what `npm pack` leaves after the ownership map, which PK1 checks
  (884 files, 973 KB packed today).
- `derivePackageJson` (`scripts/lib/install.mjs:99`) still gives a project `private: true`, its own `name`, and no
  `bin`, `description` or `version`; it now also drops `license` and `repository`.
- `npx use-slipway acme` creates a project; `npx use-slipway sync [--apply]` runs sync, with the same behaviour as
  the GitHub form. The GitHub form (`npx github:matldupont/slipway …`) still resolves with the renamed bin (npm
  runs a package's only bin) and stays documented for unreleased commits.
- A new project cannot be named after a command. `new-project` dispatches on `sync` as its first argument
  (`scripts/new-project.mjs:43`). A destination whose folder name is `sync` (reached today as `./sync`) is
  refused before anything is written: `"sync" is a use-slipway command, so a project cannot take that name —
  choose another folder name`.
- No `prepublishOnly` guard is added: `package.json` scripts are merged into every project, where it would block
  the project's own publish.

### Sync with releases

Today the plan and `--apply` are two separate runs of whatever `#main` is when each starts; neither is told the
other's target. What keeps them consistent is that apply computes its own rows from the code it is running and
names what it took: the branch `slipway/sync-<target sha>` (`apply` in `scripts/sync.mjs`), the commit message
`base..target`, and the manifest's `slipway` and `version` (`nextManifest`, which already reads the target's
`package.json`). A release that lands between the two is taken by apply, and apply says so. With releases:

- **The plan and apply name the version.** Where the target is shown (the plan's `target:` line, apply's
  result, the "already up to date" text), it reads `use-slipway <version>, commit <short sha>`. The plan's
  `--json` gains `targetVersion` beside `target`. A plan that named `0.2.0` and an apply that ran `0.3.0`
  shows as such in apply's output. The version is shown only when the tag `v<version>` in the source names the
  target commit: any other commit (`#main`, a sha, a branch) carries a version number without being that
  release, so it reads `commit <sha>, not a release`, and `targetVersion` is `null`. `--verbose` prints the
  full sha, as it did.
- **The target commit is the release's.** Under a registry install the package has no `.git`, and before #231
  the target was the newest commit on any branch whose slipway-owned files match the package's
  (`resolveBase` with `--branches`). A match on a side branch that never merges is not an
  ancestor of later `main`, so the project's next sync is refused. The order (`resolveTarget`, `scripts/lib/base.mjs`):
  1. slipway's own clean checkout: its `HEAD`, as today;
  2. the tag `v<version>` in the source clone, taken only when the slipway-owned files of its commit equal the
     package's exactly (a tag can move, so the content decides). "Slipway-owned" is every file the package
     ships to a project here, templates and `package.json` included, not only the managed class, and the
     ownership map itself, which says which files those are: a later commit that changed only a template, a
     script or a path's class still carries the release's version and its managed files, and a package from
     it is not the release;
  3. the newest matching commit reachable from the source's default branch;
  4. the newest matching commit on any branch, as today: the case of a ref off the default branch run on purpose
     (`npx github:…#<ref>`).
- **A project already past the release is told so.** When the target is a strict ancestor of the base (the
  project synced from `main` or a sha past the newest release), the plan and apply print `your project is already
  past use-slipway <version> (commit <short sha>); nothing to take` and exit 0, and nothing is written. `--json`
  prints its document with `alreadyPast: true`, no rows, and that sentence as `next`. When the target is not a
  release the sentence is `your project is already past commit <short sha>, which is not a release; nothing to
  take`. A target that diverged from the base, or shares no history with it, keeps today's refusals
  (`forwardOnly` in `scripts/sync.mjs`). A project that sync finds at the target is told "Already at" instead,
  whichever commit is later (#247, `dev/features/cli-output.md` → Nothing to take, and its Known limitations).
- The history source is unchanged: `github:matldupont/slipway` (the manifest's `source`). The registry delivers
  the code; git still says what changed.

### The release workflow (owner-only gate code)

`.github/workflows/release.yml`, shown to the owner before it is written. It is slipway's own: `internal` in
`dev/ownership.yaml`, above the `.github/**` managed row (first match wins), so no project receives it. It is
written in block style, as `ci.yml` is, so FO1 and W1 read it: a comment sits on the line above its job, never
after the job's name, which FO1 cannot read. The file as written (#232):

```yaml
name: release

# The owner pushes v<version> on a commit of main; this stages the package at npm, and the owner's approval
# there makes it public (D-027, dev/features/release.md). No token: npm trusted publishing.
on:
  push:
    tags: ['v*']

permissions:
  contents: read

concurrency:
  group: release
  cancel-in-progress: false

jobs:
  # No credential in this job: it runs the repository's own code.
  check:
    if: github.repository == 'matldupont/slipway'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: ${{ github.sha }}
          fetch-depth: 0
          persist-credentials: false
      - name: The tagged commit is on main
        run: git merge-base --is-ancestor "$GITHUB_SHA" origin/main
      - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86 # v6.0.10
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
      - name: Nothing under node_modules/ is tracked
        run: node ci/checks/meta/n1-node-modules.mjs .
      - run: pnpm meta

  # The only job that can reach npm: GitHub's own actions, scripts/release.mjs and npm. Installs nothing.
  publish:
    needs: check
    runs-on: ubuntu-latest
    environment: npm
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: ${{ github.sha }}
          persist-credentials: false
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24.21.0 # bundles npm 11.19.0; staging needs 11.15.0 or later
          registry-url: https://registry.npmjs.org
          package-manager-cache: false
      - name: The tag is this version, and npm can stage
        id: rule
        env:
          TAG: ${{ github.ref_name }}
        run: node scripts/release.mjs "$TAG" >> "$GITHUB_OUTPUT"
      - name: What is about to be staged
        run: npm pack --dry-run --json --ignore-scripts | node scripts/release.mjs --summary >> "$GITHUB_STEP_SUMMARY"
      - name: Stage the release
        env:
          LABEL: ${{ steps.rule.outputs.label }}
        run: npm stage publish --ignore-scripts --tag "$LABEL"
```

Rules the file keeps:

1. Two jobs. `check` runs the repository's code (`pnpm meta`, PK1 among it) with `contents: read` only. `publish`
   is the only job with `id-token: write`; it uses GitHub's own actions only, no pnpm, and installs nothing: the
   repository has no dependencies.
2. Both jobs check out `github.sha`, never the tag by name: a tag can move between jobs.
3. Every action is pinned by full commit sha. (`ci.yml`'s major-tag pins are a follow-up, not this work.)
4. No event text is interpolated into a `run:` line; it goes through `env:` and is quoted.
5. `npm stage publish` and `npm pack` run with `--ignore-scripts`. Provenance is automatic under trusted
   publishing; no flag is passed.
6. The exact Node version is pinned in `publish` (24.21.0 bundles npm 11.19.0), so the bundled npm does not
   drift; staging needs npm 11.15.0 or later. The job never upgrades npm in place.
7. One `concurrency` group, nothing cancelled: two tags cannot stage at once.
8. Neither checkout leaves GitHub's token in `.git/config` (`persist-credentials: false`): nothing after it needs git's
   credentials.

`scripts/release.mjs` holds the logic, with a test, so none of it is inline shell:

- `release.mjs <tag>`: the tag is `v` followed by `MAJOR.MINOR.PATCH` and an optional `-pre` part of letters,
  digits, `.` and `-`, and nothing else (no build metadata, no newline); it equals `v` + `package.json`'s
  `version`; `npm --version` is 11.15.0 or later. Any failure exits 1 naming both values and prints nothing to
  stdout. Success prints one line: `label=next` when the version has a pre-release part, else `label=latest`.
- `release.mjs --summary`: reads `npm pack --dry-run --json` on stdin and prints the package name, version,
  integrity hash, shasum, file count and file list as markdown. Unreadable input exits 1.
- Node stdlib only (D-004), and it imports no file of the repository: the `publish` job runs this one file. Its
  one-line text cleaner is a copy of the idea in `scripts/lib/ui.mjs` for that reason, and also drops bidi and
  zero-width characters. `scripts/release.test.mjs` is on the `meta` line of `package.json` (W1 requires it).
- `scripts/release.test.mjs` also requires `ci.yml` itself to run `pnpm meta` after N1 on pull requests and on
  `main`: W1 reads every workflow whatever starts it, so `release.yml`'s own `pnpm meta` would otherwise satisfy it
  with that step gone from `ci.yml`. The assertion goes when W1 counts only pull-request and branch workflows.

### Owner steps (outside the repository; a session never does these)

Once, before the first tag:

1. npmjs.com → `use-slipway` → trusted publisher: repository `matldupont/slipway`, workflow `release.yml`,
   environment `npm`, allowed action `npm stage publish` only.
2. npmjs.com → `use-slipway` → publishing access: require two-factor authentication and disallow tokens.
3. GitHub → environment `npm`, deployment limited to tags matching `v*`.
4. GitHub → a tag ruleset on `v*`: only the owner creates, updates or deletes.

Each release:

5. Merge the version PR; `git tag v<version> <merge sha>`; `git push origin v<version>`.
6. When the run has staged it, compare the run summary's integrity hash and file list with the staged package
   (`npm stage view`, `npm stage download`), and check it is the tag just pushed; then approve with the second
   factor (`npm stage approve`, or npmjs.com → Staged Packages).

On the first pre-release (`0.1.0-rc.1`), once:

7. In a scratch project, run a sync from `use-slipway@next` and confirm the plan names that version
   (`use-slipway <version>, commit <sha>`, not `commit <sha>, not a release`). Only a real registry copy can
   show that sync believes the tag: the tests use a `git archive` copy, which is not what npm packs.

The first release is cut in the same sitting as the cutover merge (Order, below).

### Order

The project script, the README, `BOOTSTRAP.md`, the landing page and the skill text that name `npx use-slipway`
change only after `0.1.0` is live: until then `use-slipway@latest` is the placeholder `0.0.0`, which does not run
slipway. The cutover is itself released at once, so no project sits between a script that asks for `latest` and
a `latest` older than its base for longer than the owner's sitting; "already past the release" covers the gap.

### Threat model

What the release defends, and against whom (a review stops here, per `process/cold-review.md#When to stop`):

- **Nobody but the owner makes a version public.** Against a pull request, a fork, another collaborator, a
  compromised action, a session on the owner's machine: the layers in the table above, of which the last (the
  second factor) holds when every other one fails.
- **No credential exists to steal.** No token in the repository, in CI secrets or on a machine; the package
  refuses tokens.
- **Code under test never holds the identity.** `pnpm meta` runs in `check`; `id-token: write` exists only in
  `publish`, which runs GitHub's actions, `scripts/release.mjs` and npm.
- **What is published says where it came from.** Provenance names the commit and the workflow run.
- **Not defended:** the owner (who can tag, approve, or change any setting); a compromise of GitHub's or npm's
  OIDC, or of the owner's npm second factor; code already merged to `main`; a staged package the owner approves
  without looking.

### Known limitations

- Three things npm's pages do not say, **not verified until the owner's `0.1.0-rc.1` run**: whether
  `npm stage publish --tag next` carries the label when the publisher may not run `npm dist-tag`; whether npm's
  `0.0.0-stage` placeholder for new packages touches the existing `0.0.0`; whether a staged package shows its
  provenance before approval. Nothing reads `latest` until the cutover, so a wrong label on the pre-release
  costs nothing.
- Also for the `0.1.0-rc.1` run: `actions/setup-node` with `registry-url` writes an `.npmrc` that names
  `NODE_AUTH_TOKEN`, which this workflow never sets. If npm reads the unset variable before trying its OIDC
  identity, the stage fails and nothing is staged; no secret is involved either way.
- The summary step is a pipe, and the shell reports only its last command: a failed `npm pack` fails the step
  because `release.mjs --summary` refuses input that is not npm's list.
- The settings in the owner steps live on npmjs.com and GitHub; no file in the repository can enforce or check
  them. A release with one missing is still held by the others.
- A hostile run prints its own summary, so the summary only proves anything for a run of the workflow as `main`
  holds it: the owner approves a stage only for a tag they just pushed.
- A published version cannot be changed or reused; a bad release is superseded (and may be deprecated by hand).
- Dropping `private: true` means npm no longer refuses a local `npm publish` outright; the package's
  two-factor requirement and the stage-only publisher are what stop it.
- A project that pinned `use-slipway@X` runs release X's sync code until its owner edits the line: pinning is the
  owner's choice and is reported, not overridden.
- With no tag and no clean checkout (the GitHub form on an untagged commit), several commits can hold the same
  slipway-owned files; sync takes the newest on the default branch, as F-01 already accepts.
- A commit after a release that changes only slipway's internal files other than the ownership map (its own
  scripts, checks and planning docs) ships a project the same files as the release, so a package from it is
  named as the release and the manifest records the tag's commit: for a project the two are the same content.
- Sync takes a tag whatever branch holds its commit. A tag off the default branch gives a manifest record the
  next sync's walk does not reach; that sync then finds the base by content or refuses, writing nothing. The
  release workflow's check that the tagged commit is on `main` is what keeps tags there.

## Seams

**Promise:** a published package is a public promise of versioned releases: the numbers mean what D-027 says, a
version is never replaced, and `latest` moves only on a package the owner approved. It also adds a supply-chain
surface (the publishing identity and provenance), handled by the Threat model. The package is MIT-licensed. No
new person or channel.

## Acceptance

```
Given a tag `v0.2.0` and `package.json` at `0.2.0`, and npm 11.15.0 or later
When  `node scripts/release.mjs v0.2.0` runs
Then  it exits 0 and prints exactly `label=latest`

Given a tag `v0.2.0-rc.1` and `package.json` at `0.2.0-rc.1`
When  `node scripts/release.mjs v0.2.0-rc.1` runs
Then  it exits 0 and prints exactly `label=next`

Given a tag `v0.2.0` and `package.json` at `0.2.1`, or a tag `0.2.0`, `v0.2`, `v0.2.0+build` or one holding a newline
When  `node scripts/release.mjs <tag>` runs
Then  it exits 1, names the tag and the version on stderr, and prints nothing on stdout

Given npm 11.14.9
When  `node scripts/release.mjs v0.2.0` runs
Then  it exits 1 naming 11.15.0 and the version found

Given `release.yml` as written
When  it is read
Then  only the `publish` job has `id-token: write`, every `uses:` ends in a 40-character commit sha, no `run:` line holds `${{`, and `publish` names no action outside `actions/`

Given the repository after the rename
When  `pnpm meta` runs
Then  it exits 0, PK1 included, with `release.yml` and `LICENSE` classified `internal` (O1)

Given the package after the rename
When  `npm pack --dry-run --json --ignore-scripts` runs
Then  the name is `use-slipway`, `bin` is `use-slipway` only, and `license` is `MIT`

Given a project created by `new-project`
When  its `package.json` is read
Then  it has `private: true` and no `bin`, `version`, `license` or `repository`

Given `node scripts/new-project.mjs ./sync`
When  it runs
Then  it exits 1 naming `sync` as a command, and no folder is created

Given a registry-style copy of slipway (no `.git`) at a version whose tag `v<version>` is in the source
When  sync plans
Then  the target commit is the tag's, and the plan reads `use-slipway <version>, commit <short sha>`

Given the same copy, with the tag moved to a commit whose slipway-owned files differ from the package's
When  sync plans
Then  the tag is not taken, and the target is the newest matching commit on the default branch

Given a matching commit on a side branch and an older matching commit on the default branch
When  sync plans from a registry-style copy with no tag
Then  the target is the default branch's commit

Given a project whose base is a descendant of the target
When  sync plans, or runs `--apply`
Then  it prints `already past use-slipway <version>`, exits 0, and writes nothing

Given a project whose base and target diverged
When  sync plans
Then  it refuses as today (`not newer than the base`)

Given a project that holds the old `use-slipway` script and has not edited it
When  `sync --apply` runs from the cutover release
Then  the script becomes `npx --loglevel=error use-slipway@latest`

Given a project whose owner edited the script to `use-slipway@0.3.0`
When  sync runs
Then  the line is left as it is and the plan reports it

Given the README, BOOTSTRAP.md and the landing page after the cutover
When  a reader looks for the first command
Then  each shows `npx use-slipway …` first, and the GitHub form is documented as the way to take an unreleased commit

Given the build's pull requests that change `release.yml`, `dev/ownership.yaml` or `package.json`'s scripts
When  each is opened
Then  its `## Gate changes` lists that file as stricter, the same or loosens, with the reason

Given the owner pushed `v0.1.0-rc.1` on a commit of `main`
When  the workflow has run and the owner approved the staged package
Then  `npm view use-slipway@0.1.0-rc.1 dist.attestations` shows provenance, and `npm view use-slipway dist-tags` shows `next` at it and `latest` unchanged

Given `use-slipway@0.1.0` is live
When  a person runs `npx use-slipway acme --dry-run` in an empty folder
Then  it prints the plan `npx github:matldupont/slipway acme --dry-run` prints
```

The last two need the registry and the owner's hands: they are owed on #91 after merge, and its comment records
each run (`process/intake.md` → Deferred check).

## Verify

```
pnpm meta
node scripts/release.test.mjs
node scripts/new-project.test.mjs
node scripts/sync.test.mjs
node scripts/packed.test.mjs
node ci/checks/meta/pk1-packed.mjs .
node ci/checks/meta/o1-ownership.mjs .
npm pack --dry-run --json --ignore-scripts
```

Owed after merge, the owner's: `npm view use-slipway@0.1.0-rc.1 dist.attestations`, `npm view use-slipway
dist-tags`, and `npx use-slipway acme --dry-run` against the published package. No session runs `npm publish`,
`npm stage publish` or `npm stage approve`, with or without `--dry-run` against the registry.

## Build map

Machinery before surface; each step merges alone with `pnpm meta` green. Designation scores each step on its
own case (`process/designation.md`).

1. **Package identity** (#230) — `package.json` (`name`, `bin`, `private`, `license`, `repository`), `LICENSE` and its
   `internal` row, `derivePackageJson`, the refusal of a project named `sync`, the stale comment, tests. ~150
   lines. Case 4: standard · `medium`.
2. **Sync with releases** (#231) — the version beside the commit, the target by tag then default branch, "already past
   the release", `targetVersion` in `--json`, tests for each. `scripts/sync.mjs`, `scripts/lib/base.mjs`,
   `scripts/lib/sync-text.mjs`. ~250 lines. Case 5: strongest · `medium`.
3. **Release workflow** (#232) — `.github/workflows/release.yml`, `scripts/release.mjs` and its test, the `internal` row
   in `dev/ownership.yaml`, the `meta` line. Shown to the owner before writing; cold review on the strongest
   tier. Blocked by step 1. ~200 lines. Case 5: strongest · `medium`.
4. *(the owner's, on #91: the four settings, then `0.1.0-rc.1` and `0.1.0`)*
5. **Cutover** (#233) — the project script value, `syncCommand`'s long form, the sync output's commands and fixtures,
   README, `BOOTSTRAP.md`, the landing page, the `sync-slipway` skill's command text; released in the same
   sitting. Blocked by steps 2 and 3 and by `0.1.0` being live. ~250 lines. Cases 3 and 4: standard · `medium`.

## Out of scope

- A scoped package or organisation, a changelog site, a GitHub Release per tag, and automatic updates in projects:
  a project still moves only when its owner runs sync. (None planned; each needs a decision.)
- Pinning `ci.yml`'s actions by commit sha: a follow-up of its own.
- A harness rule that asks before `npm publish`: the harness ships to every project.
- Verifying a package's provenance on the project's side before it runs, and signing the manifest.
- Deprecating or unpublishing releases: by hand on npmjs.com.

## Open questions

- ~~How are releases numbered, and what does a project take when it syncs?~~ Owner, 2026-10-05: semantic
  versions; the newest release at each sync; pin by editing one line.
- ~~Where does the owner's approval sit?~~ Owner, 2026-10-05: at npm, on the staged package, with their second
  factor.
- ~~Which licence?~~ Owner, 2026-10-05: MIT.
- The three "not verified" lines under Known limitations. Owner: the owner's `0.1.0-rc.1` run; each answer is
  recorded on #91 and moved into the Contract.

## Changes

- 2026-10-05 · ADDED · the feature doc and D-027 · #91
- 2026-10-05 · MODIFIED · the workflow block is the file as written: actions pinned by commit sha, job comments on their own lines, no token left by checkout; `release.mjs` imports no repository file · #232
- 2026-10-05 · MODIFIED · step 2 built: a target no release tag names reads `commit <sha>, not a release`; `--json` carries `alreadyPast` · #231
