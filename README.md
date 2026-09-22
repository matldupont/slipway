# slipway

A slipway is where a ship is built and then launched down the ramp. This is a starting point for a product
built with coding agents: a path from a loose idea to a shipped, measured product, and the checks that keep
that path honest.

One thesis runs through it: **a rule exists only where something fires.** Every step ends in something that
goes red — a check, a hook, a clock — not in a promise.

**Requires:** Node 24 + pnpm, GitHub, Claude Code. **Defaults**, decided in week 1 (D-005–D-008): TypeScript,
React + Vite, Cloudflare.

## Start a project

```bash
git clone <this repository> slipway
node slipway/scripts/new-project.mjs ~/code/acme --repo you/acme --dry-run   # see what it will do
node slipway/scripts/new-project.mjs ~/code/acme --repo you/acme             # --public for a public repo
```

It copies the template without its history, fills the placeholders, creates the GitHub repository on `main`,
creates the label the issue workflow needs, attempts branch protection and records the outcome. Then, in the
new project, follow [`BOOTSTRAP.md`](BOOTSTRAP.md) and run `pnpm status`.

## Then follow the path

[`SLIPWAY.md`](SLIPWAY.md) is the guide, copied into every project:

**0** Bootstrap → **1** Frame (`/kickoff`) → **2** Test the riskiest assumption → **3** Shape the PRD and
milestones → **4** Walking skeleton → **5** Build loop → **6** Close the milestone (`/close-milestone`) →
**7** Learn from users → back to 5.

At any point, `pnpm status` says which step you are on and what to do next.
