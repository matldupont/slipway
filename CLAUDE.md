# Agent instructions

Stack: TypeScript · React (Vite) · Cloudflare — slipway's defaults until decisions.md D-005–D-008 are made; then
this line states the decided stack. Tooling: Node 24 + pnpm. Skill configuration lives in `AGENT.md`.

## Where we are

The SessionStart hook injects `pnpm status` output. Read its **Next** line before anything else; without
the hook, run `pnpm status` first. It is computed from the repo — trust it over ticket bodies and older docs.

## Slipway's rules

Gates, planning flow, lanes, working rules, agents and notes. Slipway owns the imported file and a sync
replaces it; this project's own rules go here in `CLAUDE.md`, above or below the import.

@process/slipway-rules.md
