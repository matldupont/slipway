---
id: L-20
date: 2026-09-21
rule: The stash stack is shared across worktrees and sessions; never pop blind.
failure: A stash pop in a shared checkout applies another session's changes and drops its stash.
enforcement:
  status: check
  pointer: process/harness/README.md#Permissions
---

The harness permissions make destructive git operations ask-level, once installed at bootstrap.
