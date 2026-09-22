# slipway

A slipway is where a ship is built and then launched down the ramp. This is a starting point for a product
built with coding agents: a path from a loose idea to a shipped, measured product, and the checks that keep
that path honest.

One thesis runs through it: **a rule exists only where something fires.** Every step ends in something that
goes red — a check, a hook, a clock — not in a promise.

**Requires:** Node 24 + pnpm, GitHub, Claude Code. **Defaults**, decided in week 1 (D-005–D-008): TypeScript,
React + Vite, Cloudflare.

## Start a project

**You need:** Node 24+, pnpm 10, git, and the GitHub CLI logged in (`gh auth login`).

From the folder you keep projects in, pass the new project's folder name:

```bash
npx github:matldupont/slipway acme --dry-run    # print the plan, change nothing
npx github:matldupont/slipway acme              # create ./acme and the GitHub repo
```

That creates `./acme` and a **private** GitHub repository named after the folder, under your account. Then
`cd acme`, follow [`BOOTSTRAP.md`](BOOTSTRAP.md), and run `pnpm status`.

| Option | Effect |
|---|---|
| `--name "Acme Walks"` | product name used in the docs (default: the folder name, title-cased) |
| `--repo owner/name` | GitHub repository (default: your login / the folder name) |
| `--public` | create a public repository instead of a private one |
| `--keep-email` | commit with your own git identity instead of your GitHub noreply address |
| `--no-harness` | don't install the agent harness into `.claude/settings.json` |
| `--no-github` | local only: copy, fill placeholders and commit; create nothing on GitHub |
| `--dry-run` | print every step without writing anything |

From a clone instead of npx: `node slipway/scripts/new-project.mjs acme` takes the same options.

**What it does:** copies the template without its history; fills the placeholders; initialises git on `main`
installs the **agent harness** (`.claude/settings.json`: approval prompts for risky git and config edits, the
session-start status, the Stop gate — see `process/harness/README.md`; `--no-harness` skips it); commits as your
**GitHub noreply address**, so no personal email is published (and GitHub's
"block pushes that expose my email" setting does not reject the push); creates the repository and pushes;
creates the `needs-shape` label; **attempts** to protect `main` and writes the outcome into `decisions.md`
as D-001. That edit is left uncommitted — `main` may now refuse direct pushes — so it goes in your first PR.

**The first CI run on `main` is red, on purpose:** `verify` has no app to check yet, and a gate that could
not have proven anything never reports green. It says so ("no workspace packages — add an app") and turns
green once BOOTSTRAP §1 adds one.

**Branch protection on a private repository** needs a paid GitHub plan. On a free plan GitHub refuses, and
D-001 records the accepted risk and the fallback: CI still runs on every push to `main`, so a direct push
turns it red rather than being blocked.

**If a run fails partway,** it stops at the failing step and says which one, leaving everything before it in
place. Re-running fails once the GitHub repository exists, so finish from where it stopped instead:
- **Failed pushing:** fix the cause, then `git push -u origin main` in the new folder.
- **Label or protection step:** do it in the repository's settings, using the list in BOOTSTRAP §0.
- **To start over:** `gh repo delete owner/name` (needs `gh auth refresh -s delete_repo` once), remove the
  folder, and run the script again.

## Then follow the path

[`SLIPWAY.md`](SLIPWAY.md) is the guide, copied into every project:

**0** Bootstrap → **1** Frame (`/kickoff`) → **2** Test the riskiest assumption → **3** Shape the PRD and
milestones → **4** Walking skeleton → **5** Build loop → **6** Close the milestone (`/close-milestone`) →
**7** Learn from users → back to 5.

At any point, `pnpm status` says which step you are on and what to do next.
