/**
 * Unit tests for pr-review/features/compute.ts.
 *
 * Most tests target pure functions (CLI parsing, URL/number extraction,
 * ticket extraction, readiness signal computation, diff parsing, slipway
 * detection) because they cover all logic the agent depends on. Worktree
 * setup is exercised against a real temporary git repo standing in for
 * GitHub (a `refs/pull/<n>/head` ref pushed to a local bare "remote").
 * `gh` and its GraphQL/REST calls are not mocked end-to-end; their callers
 * are tested through the pure sub-functions they decompose into.
 *
 * Runs under `node --test`, `npx tsx --test`, and `bun test`.
 */

import test from "node:test";
import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Use a workspace-local tmpdir for fixture repos. macOS' default tmpdir
// (under /var/folders) has extended-attribute restrictions that prevent
// `git init` from chmod'ing the .git/hooks directory.
const FIXTURE_ROOT = path.join(import.meta.dirname, ".test-tmp");
try { mkdirSync(FIXTURE_ROOT, { recursive: true }); } catch {}
process.on("exit", () => {
  try { rmSync(FIXTURE_ROOT, { recursive: true, force: true }); } catch {}
});
function workspaceMkdtemp(prefix: string): string {
  return mkdtempSync(path.join(FIXTURE_ROOT, prefix));
}

import {
  detectReviewMode,
  parseArgs,
  extractPrNumberFromUrl,
  projectPathFromUrl,
  projectPathFromRemoteUrl,
  resolvePRInput,
  extractIssueRef,
  extractMarkdownSection,
  extractUnresolvedThreads,
  summarizeRequiredChecks,
  parseFileDiff,
  splitDiffIntoFiles,
  extractPathsFromDiffBlock,
  parseUnifiedDiff,
  toLineRanges,
  computeReadiness,
  detectHardHalt,
  setupWorktree,
  resolveMainWorktreeRoot,
  isFeatureOutput,
  runGh,
  GhNotFoundError,
  extractLane,
  diffTouchesRiskPaths,
  parseDomainInvariants,
  findInvariantsAtRisk,
  parseActiveMilestone,
  detectSlipwayContext,
  parseSlipwayPath,
  resolveHeadReviewed,
  gitSlipwayReader,
  fetchBaseCommit,
  DEFAULT_SLIPWAY_PATHS,
  type PRMetadata,
  type IssueTicket,
  type UnresolvedThread,
  type FeatureOutput,
  type DiffStats,
} from "./compute.ts";

// ============================================================================
// reviewMode
// ============================================================================

test("detectReviewMode: author is the authenticated user", () => {
  const mode = detectReviewMode("octo-author", () => "octo-author");
  assert.equal(mode, "self");
});

test("detectReviewMode: author is somebody else", () => {
  const mode = detectReviewMode("octo-peer", () => "octo-author");
  assert.equal(mode, "peer");
});

test("detectReviewMode: username comparison ignores case", () => {
  const mode = detectReviewMode("Octo-Author", () => "octo-author");
  assert.equal(mode, "self");
});

// Each degraded case must land on "peer": that keeps the social bar on and
// suppresses nits, so a failure to identify the user can never turn a
// colleague's PR into the chattier self-review.
test("detectReviewMode: falls back to peer when gh returns nothing", () => {
  assert.equal(detectReviewMode("octo-author", () => ""), "peer");
});

// ============================================================================
// CLI args
// ============================================================================

test("parseArgs: no arguments means current-branch resolution", () => {
  const opts = parseArgs([]);
  assert.equal(opts.prInput, null);
  assert.equal(opts.withWorktree, false);
  assert.equal(opts.skipTicket, false);
});

test("parseArgs: options with no positional still means current-branch resolution", () => {
  const opts = parseArgs(["--worktree", "--tone", "formal"]);
  assert.equal(opts.prInput, null);
  assert.equal(opts.withWorktree, true);
  assert.equal(opts.tone, "formal");
});

test("parseArgs: accepts URL as positional", () => {
  const opts = parseArgs(["https://github.com/owner/repo/pull/123"]);
  assert.equal(opts.prInput, "https://github.com/owner/repo/pull/123");
  assert.equal(opts.withWorktree, false);
  assert.equal(opts.skipTicket, false);
});

test("parseArgs: parses all flags", () => {
  const opts = parseArgs([
    "42",
    "--project-path", "owner/repo",
    "--worktree",
    "--worktree-dir", "/tmp/worktrees",
    "--output-path", "/tmp/out.json",
    "--skip-ticket",
    "--verbose",
  ]);
  assert.equal(opts.prInput, "42");
  assert.equal(opts.projectPath, "owner/repo");
  assert.equal(opts.withWorktree, true);
  assert.equal(opts.worktreeDir, "/tmp/worktrees");
  assert.equal(opts.outputPath, "/tmp/out.json");
  assert.equal(opts.skipTicket, true);
  assert.equal(opts.verbose, true);
});

test("parseArgs: throws on unknown flag", () => {
  assert.throws(() => parseArgs(["42", "--unknown"]), /Unknown argument/);
});

test("parseArgs: slipway paths default to slipway's layout", () => {
  const opts = parseArgs(["42"]);
  assert.deepEqual(opts.slipwayPaths, DEFAULT_SLIPWAY_PATHS);
});

test("parseArgs: configured paths are taken as given", () => {
  const opts = parseArgs([
    "42",
    "--invariants", "docs/rules.md",
    "--milestones", "plan/milestones/",
    "--cold-review", "process/review.md",
  ]);
  assert.deepEqual(opts.slipwayPaths, {
    invariants: "docs/rules.md",
    milestones: "plan/milestones",
    coldReview: "process/review.md",
  });
});

test("parseArgs: 'none' turns each slipway input off rather than defaulting", () => {
  const opts = parseArgs(["42", "--invariants", "none", "--milestones", "None", "--cold-review", "none"]);
  assert.deepEqual(opts.slipwayPaths, { invariants: null, milestones: null, coldReview: null });
});

test("parseArgs: a slipway path flag with no value is an error, never the default", () => {
  assert.throws(() => parseArgs(["42", "--invariants"]), /needs a path or 'none'/);
  assert.throws(() => parseArgs(["42", "--invariants", ""]), /needs a path or 'none'/);
  assert.throws(() => parseArgs(["42", "--milestones", "--worktree"]), /needs a path or 'none'/);
});

test("parseSlipwayPath: refuses paths that leave the checkout", () => {
  assert.throws(() => parseSlipwayPath("--invariants", "/etc/passwd"), /inside the repository/);
  assert.throws(() => parseSlipwayPath("--invariants", "../other/docs.md"), /inside the repository/);
  assert.throws(() => parseSlipwayPath("--invariants", "docs/../../x.md"), /inside the repository/);
  assert.equal(parseSlipwayPath("--invariants", "docs/x..y.md"), "docs/x..y.md");
});

test("parseArgs: --issue-repo is gone; the reference names its own repository", () => {
  assert.throws(() => parseArgs(["42", "--issue-repo", "owner/issues"]), /Unknown argument/);
});

test("extractIssueRef: a closing reference carries its repository", () => {
  const got = extractIssueRef([{ number: 7, repository: { nameWithOwner: "owner/issues" } }], "");
  assert.deepEqual(got, { number: 7, source: "closingIssuesReferences", repo: "owner/issues" });
});

test("extractIssueRef: owner/repo#N in the body names that repository; #N the PR's own", () => {
  assert.deepEqual(extractIssueRef([], "Closes owner/issues#12"), { number: 12, source: "body", repo: "owner/issues" });
  assert.deepEqual(extractIssueRef([], "Closes #12"), { number: 12, source: "body", repo: null });
});

test("parseArgs: --tone defaults to casual", () => {
  assert.equal(parseArgs(["42"]).tone, "casual");
});

test("parseArgs: --tone accepts 'formal'", () => {
  assert.equal(parseArgs(["42", "--tone", "formal"]).tone, "formal");
});

test("parseArgs: --tone rejects invalid value", () => {
  assert.throws(() => parseArgs(["42", "--tone", "snarky"]), /must be 'casual' or 'formal'/);
});

// ============================================================================
// URL / number extraction
// ============================================================================

test("extractPrNumberFromUrl: extracts number from canonical URL", () => {
  assert.equal(extractPrNumberFromUrl("https://github.com/owner/repo/pull/45"), 45);
});

test("extractPrNumberFromUrl: handles trailing slash and query", () => {
  assert.equal(extractPrNumberFromUrl("https://github.com/owner/repo/pull/45/"), 45);
  assert.equal(extractPrNumberFromUrl("https://github.com/owner/repo/pull/45/files"), 45);
  assert.equal(extractPrNumberFromUrl("https://github.com/owner/repo/pull/45?diff=split"), 45);
});

test("extractPrNumberFromUrl: returns null for non-URL", () => {
  assert.equal(extractPrNumberFromUrl("45"), null);
  assert.equal(extractPrNumberFromUrl("not-a-url"), null);
});

test("projectPathFromUrl: extracts owner/repo", () => {
  assert.equal(
    projectPathFromUrl("https://github.com/cli/cli/pull/14485"),
    "cli/cli",
  );
});

test("projectPathFromUrl: works against GitHub Enterprise hosts too", () => {
  assert.equal(
    projectPathFromUrl("https://github.example.com/team/project/pull/9"),
    "team/project",
  );
});

test("projectPathFromUrl: returns null for non-PR URL", () => {
  assert.equal(projectPathFromUrl("https://github.com/some/path"), null);
});

test("projectPathFromRemoteUrl: https URL", () => {
  assert.equal(projectPathFromRemoteUrl("https://github.com/owner/repo.git"), "owner/repo");
});

test("projectPathFromRemoteUrl: ssh:// URL with port", () => {
  assert.equal(
    projectPathFromRemoteUrl("ssh://git@github.com:22/owner/repo.git"),
    "owner/repo",
  );
});

test("projectPathFromRemoteUrl: git@host: URL", () => {
  assert.equal(projectPathFromRemoteUrl("git@github.com:owner/repo.git"), "owner/repo");
});

test("projectPathFromRemoteUrl: handles missing .git suffix", () => {
  assert.equal(projectPathFromRemoteUrl("https://github.com/owner/repo"), "owner/repo");
  assert.equal(projectPathFromRemoteUrl("git@github.com:owner/repo"), "owner/repo");
});

test("projectPathFromRemoteUrl: returns null when no owner prefix", () => {
  assert.equal(projectPathFromRemoteUrl("https://github.com/repo.git"), null);
});

test("projectPathFromRemoteUrl: returns null for nonsense", () => {
  assert.equal(projectPathFromRemoteUrl("not a url"), null);
  assert.equal(projectPathFromRemoteUrl(""), null);
});

// ============================================================================
// resolvePRInput: URL / number / current-branch
// ============================================================================

test("resolvePRInput: URL → prRef + projectPath from URL", () => {
  const got = resolvePRInput("https://github.com/owner/repo/pull/42", null, "/tmp");
  assert.equal(got.prRef, "https://github.com/owner/repo/pull/42");
  assert.equal(got.projectPath, "owner/repo");
});

test("resolvePRInput: --project-path override beats URL inference", () => {
  const got = resolvePRInput("https://github.com/a/b/pull/42", "x/y", "/tmp");
  assert.equal(got.projectPath, "x/y");
});

test("resolvePRInput: bare number requires project path", () => {
  assert.throws(() => resolvePRInput("42", null, "/tmp"), /project path/i);
});

test("resolvePRInput: bare number with --project-path works", () => {
  const got = resolvePRInput("42", "g/p", "/tmp");
  assert.equal(got.prRef, "42");
  assert.equal(got.projectPath, "g/p");
});

// The defining GitHub-port behavior: omitting the positional resolves the PR
// for the current branch, via `gh pr view` with no ref, instead of throwing
// like the old GitLab-only CLI did.
test("resolvePRInput: null input (current branch) never throws, even with no project path", () => {
  const got = resolvePRInput(null, null, "/tmp");
  assert.equal(got.prRef, null);
  assert.equal(got.projectPath, null);
});

test("resolvePRInput: null input honors --project-path override", () => {
  const got = resolvePRInput(null, "g/p", "/tmp");
  assert.equal(got.prRef, null);
  assert.equal(got.projectPath, "g/p");
});

test("resolvePRInput: explicit branch name requires project path", () => {
  assert.throws(() => resolvePRInput("feature/x", null, "/tmp"), /project path/i);
});

// ============================================================================
// Linked-issue extraction
// ============================================================================

test("extractIssueRef: closingIssuesReferences wins over body keywords", () => {
  const got = extractIssueRef([{ number: 99 }], "Closes #42 as well");
  assert.deepEqual(got, { number: 99, source: "closingIssuesReferences", repo: null });
});

test("extractIssueRef: falls back to 'Closes #N' in body", () => {
  const got = extractIssueRef([], "Closes #42");
  assert.deepEqual(got, { number: 42, source: "body", repo: null });
});

test("extractIssueRef: recognizes 'Fixes #N'", () => {
  assert.deepEqual(extractIssueRef([], "Fixes #7"), { number: 7, source: "body", repo: null });
});

test("extractIssueRef: recognizes 'Fixed #N'", () => {
  assert.deepEqual(extractIssueRef([], "Fixed #7"), { number: 7, source: "body", repo: null });
});

test("extractIssueRef: recognizes 'Part of #N'", () => {
  assert.deepEqual(extractIssueRef([], "Part of #123, follow-up to come"), {
    number: 123,
    source: "body",
    repo: null,
  });
});

test("extractIssueRef: case-insensitive keyword match", () => {
  assert.deepEqual(extractIssueRef([], "closes #5"), { number: 5, source: "body", repo: null });
});

test("extractIssueRef: returns null when nothing matches", () => {
  assert.equal(extractIssueRef([], "See PR #5 for context"), null);
});

test("extractIssueRef: bare '#N' with no keyword does not match", () => {
  assert.equal(extractIssueRef([], "Related to #5"), null);
});

// ============================================================================
// extractMarkdownSection
// ============================================================================

test("extractMarkdownSection: extracts an h3 section (issue-form shape)", () => {
  const body = "### Problem\n\nSomething's wrong.\n\n### Acceptance\n\n- p95 < 400ms\n- tests pass\n\n### Seams\n\nnone";
  assert.equal(extractMarkdownSection(body, "Acceptance"), "- p95 < 400ms\n- tests pass");
});

test("extractMarkdownSection: extracts an h2 section (feature-doc shape)", () => {
  const body = "## Problem\n\nX\n\n## Contract\n\nThe unit of execution.\n\n## Verify\n\n```\npnpm verify\n```";
  assert.equal(extractMarkdownSection(body, "Contract"), "The unit of execution.");
  assert.equal(extractMarkdownSection(body, "Verify"), "```\npnpm verify\n```");
});

test("extractMarkdownSection: case-insensitive heading match", () => {
  const body = "### acceptance\n\nsomething checkable";
  assert.equal(extractMarkdownSection(body, "Acceptance"), "something checkable");
});

test("extractMarkdownSection: returns null when heading absent", () => {
  assert.equal(extractMarkdownSection("### Problem\n\nx", "Acceptance"), null);
});

test("extractMarkdownSection: returns null for an empty section", () => {
  assert.equal(extractMarkdownSection("### Acceptance\n\n### Seams\n\nx", "Acceptance"), null);
});

test("extractMarkdownSection: section runs to end of body when it's the last one", () => {
  const body = "### Problem\n\nx\n\n### Acceptance\n\nlast section\nmore text";
  assert.equal(extractMarkdownSection(body, "Acceptance"), "last section\nmore text");
});

// ============================================================================
// Unresolved review threads
// ============================================================================

test("extractUnresolvedThreads: returns empty when threads are empty", () => {
  assert.deepEqual(extractUnresolvedThreads([]), []);
});

test("extractUnresolvedThreads: skips resolved threads", () => {
  const threads = [
    {
      id: "t1",
      isResolved: true,
      comments: { nodes: [{ author: { login: "bob" }, body: "fixed", path: null, createdAt: "2026-05-01T00:00:00Z" }] },
    },
  ];
  assert.deepEqual(extractUnresolvedThreads(threads), []);
});

test("extractUnresolvedThreads: returns unresolved threads with full body + excerpt", () => {
  const threads = [
    {
      id: "thread-1",
      isResolved: false,
      comments: {
        nodes: [
          {
            author: { login: "cody" },
            body: "Could you split FE and BE de-registration?",
            path: "apps/features.yml",
            createdAt: "2026-04-30T18:00:00Z",
          },
        ],
      },
    },
    {
      id: "thread-2",
      isResolved: true,
      comments: { nodes: [{ author: { login: "bob" }, body: "Resolved earlier.", path: null, createdAt: "2026-04-29T00:00:00Z" }] },
    },
  ];
  const got = extractUnresolvedThreads(threads);
  assert.equal(got.length, 1);
  assert.equal(got[0].id, "thread-1");
  assert.equal(got[0].author, "cody");
  assert.equal(got[0].filePath, "apps/features.yml");
  assert.match(got[0].bodyExcerpt, /split FE and BE/);
});

test("extractUnresolvedThreads: truncates excerpt but keeps full body", () => {
  const long = "y".repeat(500);
  const threads = [
    {
      id: "t",
      isResolved: false,
      comments: { nodes: [{ author: { login: "cody" }, body: long, path: null, createdAt: "2026-05-01T00:00:00Z" }] },
    },
  ];
  const got = extractUnresolvedThreads(threads);
  assert.equal(got[0].body.length, 500);
  assert.equal(got[0].bodyExcerpt.length, 200);
});

test("extractUnresolvedThreads: handles a null author gracefully", () => {
  const threads = [
    {
      id: "t",
      isResolved: false,
      comments: { nodes: [{ author: null, body: "ghost comment", path: null, createdAt: "2026-05-01T00:00:00Z" }] },
    },
  ];
  assert.equal(extractUnresolvedThreads(threads)[0].author, "unknown");
});

// ============================================================================
// Required checks
// ============================================================================

test("summarizeRequiredChecks: buckets into failing/pending/passing", () => {
  const got = summarizeRequiredChecks([
    { name: "build", bucket: "pass" },
    { name: "test", bucket: "fail" },
    { name: "lint", bucket: "pending" },
    { name: "deploy-preview", bucket: "cancel" },
    { name: "flaky-skip", bucket: "skipping" },
  ]);
  assert.deepEqual(got.failing, ["test", "deploy-preview"]);
  assert.deepEqual(got.pending, ["lint"]);
  assert.deepEqual(got.passing, ["build", "flaky-skip"]);
});

test("summarizeRequiredChecks: all passing → nothing failing or pending", () => {
  const got = summarizeRequiredChecks([{ name: "build", bucket: "pass" }]);
  assert.deepEqual(got.failing, []);
  assert.deepEqual(got.pending, []);
});

test("summarizeRequiredChecks: empty input → all empty", () => {
  const got = summarizeRequiredChecks([]);
  assert.deepEqual(got, { failing: [], pending: [], passing: [] });
});

// ============================================================================
// Diff parsing / anchor index
// ============================================================================

test("toLineRanges: coalesces consecutive runs and splits on gaps", () => {
  assert.deepEqual(toLineRanges([]), []);
  assert.deepEqual(toLineRanges([7]), [[7, 7]]);
  assert.deepEqual(toLineRanges([1, 2, 3, 9, 10, 40]), [[1, 3], [9, 10], [40, 40]]);
});

test("parseFileDiff: maps added lines to post-image numbers", () => {
  const diff = ["@@ -10,3 +10,5 @@", " context a", "+added at 11", "+added at 12", " context b", " context c"].join("\n");
  const got = parseFileDiff(diff);
  assert.equal(got.added, 2);
  assert.equal(got.removed, 0);
  assert.deepEqual(got.changedLines, [[11, 12]]);
  assert.deepEqual(got.removedHunks, []);
});

test("parseFileDiff: maps removed lines to pre-image numbers", () => {
  const diff = ["@@ -100,4 +100,2 @@", " context", "-gone at 101", "-gone at 102", " context"].join("\n");
  const got = parseFileDiff(diff);
  assert.equal(got.added, 0);
  assert.equal(got.removed, 2);
  assert.deepEqual(got.changedLines, []);
  assert.deepEqual(got.removedHunks, [[101, 102]]);
});

test("parseFileDiff: tracks pre- and post-image counters independently across a replacement", () => {
  const diff = ["@@ -5,4 +5,4 @@", " keep 5", "-old 6", "+new 6", " keep 7", " keep 8"].join("\n");
  const got = parseFileDiff(diff);
  assert.deepEqual(got.changedLines, [[6, 6]]);
  assert.deepEqual(got.removedHunks, [[6, 6]]);
});

test("parseFileDiff: handles multiple hunks in one file", () => {
  const diff = ["@@ -1,2 +1,3 @@", " a", "+b", " c", "@@ -50,2 +51,3 @@", " d", "+e", " f"].join("\n");
  const got = parseFileDiff(diff);
  assert.equal(got.added, 2);
  assert.deepEqual(got.changedLines, [[2, 2], [52, 52]]);
});

test("parseFileDiff: ignores file headers and no-newline markers", () => {
  const diff = ["--- a/foo.ts", "+++ b/foo.ts", "@@ -1,1 +1,2 @@", " a", "+b", "\\ No newline at end of file"].join("\n");
  const got = parseFileDiff(diff);
  assert.equal(got.added, 1);
  assert.equal(got.removed, 0);
  assert.deepEqual(got.changedLines, [[2, 2]]);
});

test("parseFileDiff: counts a pure addition with no context", () => {
  const got = parseFileDiff(["@@ -0,0 +1,3 @@", "+one", "+two", "+three"].join("\n"));
  assert.equal(got.added, 3);
  assert.deepEqual(got.changedLines, [[1, 3]]);
});

test("splitDiffIntoFiles: splits a multi-file gh --patch blob, dropping the format-patch preamble", () => {
  const patch = [
    "From abc123 Mon Sep 17 00:00:00 2001",
    "From: Someone <someone@example.com>",
    "Subject: [PATCH] do things",
    "---",
    " a.ts | 1 +",
    " b.ts | 1 +",
    " 2 files changed",
    "",
    "diff --git a/a.ts b/a.ts",
    "index 111..222 100644",
    "--- a/a.ts",
    "+++ b/a.ts",
    "@@ -1,1 +1,2 @@",
    " keep",
    "+added",
    "diff --git a/b.ts b/b.ts",
    "index 333..444 100644",
    "--- a/b.ts",
    "+++ b/b.ts",
    "@@ -1,2 +1,1 @@",
    " keep",
    "-removed",
  ].join("\n");
  const blocks = splitDiffIntoFiles(patch);
  assert.equal(blocks.length, 2);
  assert.match(blocks[0], /^diff --git a\/a\.ts b\/a\.ts/);
  assert.match(blocks[1], /^diff --git a\/b\.ts b\/b\.ts/);
});

test("splitDiffIntoFiles: empty patch yields no blocks", () => {
  assert.deepEqual(splitDiffIntoFiles(""), []);
});

test("extractPathsFromDiffBlock: added file (old is /dev/null)", () => {
  const block = ["diff --git a/new.ts b/new.ts", "new file mode 100644", "index 000..111", "--- /dev/null", "+++ b/new.ts", "@@ -0,0 +1,1 @@", "+hi"].join("\n");
  assert.deepEqual(extractPathsFromDiffBlock(block), { oldPath: null, newPath: "new.ts" });
});

test("extractPathsFromDiffBlock: deleted file (new is /dev/null)", () => {
  const block = ["diff --git a/gone.ts b/gone.ts", "deleted file mode 100644", "index 111..000", "--- a/gone.ts", "+++ /dev/null", "@@ -1,1 +0,0 @@", "-bye"].join("\n");
  assert.deepEqual(extractPathsFromDiffBlock(block), { oldPath: "gone.ts", newPath: null });
});

test("extractPathsFromDiffBlock: modified file", () => {
  const block = ["diff --git a/x.ts b/x.ts", "index 111..222 100644", "--- a/x.ts", "+++ b/x.ts", "@@ -1,1 +1,1 @@", "-old", "+new"].join("\n");
  assert.deepEqual(extractPathsFromDiffBlock(block), { oldPath: "x.ts", newPath: "x.ts" });
});

test("extractPathsFromDiffBlock: pure rename with no content change falls back to the diff --git header", () => {
  const block = ["diff --git a/old-name.ts b/new-name.ts", "similarity index 100%", "rename from old-name.ts", "rename to new-name.ts"].join("\n");
  assert.deepEqual(extractPathsFromDiffBlock(block), { oldPath: "old-name.ts", newPath: "new-name.ts" });
});

test("parseUnifiedDiff: aggregates stats and anchor index across files", () => {
  const patch = [
    "From abc Mon Sep 17 00:00:00 2001",
    "Subject: [PATCH] change things",
    "---",
    "",
    "diff --git a/a.ts b/a.ts",
    "index 111..222 100644",
    "--- a/a.ts",
    "+++ b/a.ts",
    "@@ -1,1 +1,2 @@",
    " keep",
    "+added",
    "diff --git a/b.ts b/b.ts",
    "index 333..444 100644",
    "--- a/b.ts",
    "+++ b/b.ts",
    "@@ -1,2 +1,1 @@",
    " keep",
    "-removed",
  ].join("\n");
  const got = parseUnifiedDiff(patch);
  assert.equal(got.filesChanged, 2);
  assert.equal(got.linesAdded, 1);
  assert.equal(got.linesRemoved, 1);
  assert.deepEqual(got.changedLines, { "a.ts": [[2, 2]] });
  assert.deepEqual(got.removedHunks, { "b.ts": [[2, 2]] });
});

// Required case per the port's done-list: a diff that only deletes lines
// (no post-image anchor at all) must still parse cleanly into removedHunks.
test("parseUnifiedDiff: deleted-lines-only diff has no changedLines, only removedHunks", () => {
  const patch = [
    "From abc Mon Sep 17 00:00:00 2001",
    "Subject: [PATCH] remove the guard",
    "---",
    "",
    "diff --git a/guard.ts b/guard.ts",
    "index 111..222 100644",
    "--- a/guard.ts",
    "+++ b/guard.ts",
    "@@ -10,3 +10,1 @@",
    " context",
    "-if (!user) return;",
    "-  // unreachable without the guard",
    " context",
  ].join("\n");
  const got = parseUnifiedDiff(patch);
  assert.equal(got.filesChanged, 1);
  assert.equal(got.linesAdded, 0);
  assert.equal(got.linesRemoved, 2);
  assert.deepEqual(got.changedLines, {});
  assert.deepEqual(got.removedHunks, { "guard.ts": [[11, 12]] });
});

test("parseUnifiedDiff: a whole-file deletion diff", () => {
  const patch = [
    "From abc Mon Sep 17 00:00:00 2001",
    "Subject: [PATCH] delete file",
    "---",
    "",
    "diff --git a/CLAUDE.md b/CLAUDE.md",
    "deleted file mode 100644",
    "index 111..000",
    "--- a/CLAUDE.md",
    "+++ /dev/null",
    "@@ -1,1 +0,0 @@",
    "-@AGENTS.md",
  ].join("\n");
  const got = parseUnifiedDiff(patch);
  assert.equal(got.filesChanged, 1);
  assert.deepEqual(got.changedLines, {});
  assert.deepEqual(got.removedHunks, { "CLAUDE.md": [[1, 1]] });
});

test("parseUnifiedDiff: empty patch → zero files", () => {
  const got = parseUnifiedDiff("");
  assert.equal(got.filesChanged, 0);
  assert.deepEqual(got.changedLines, {});
  assert.deepEqual(got.removedHunks, {});
});

// ============================================================================
// Readiness signals
// ============================================================================

function mkPR(overrides: Partial<PRMetadata> = {}): PRMetadata {
  return {
    number: 1,
    url: "https://github.com/g/p/pull/1",
    title: "",
    description: "",
    sourceBranch: "feature/x",
    targetBranch: "main",
    headSha: "abc123",
    author: { username: "alice" },
    projectPath: "g/p",
    mergeStateStatus: "CLEAN",
    mergeable: "MERGEABLE",
    draft: false,
    ...overrides,
  };
}

function mkTicket(overrides: Partial<IssueTicket> = {}): IssueTicket {
  return {
    number: 1,
    identifier: "#1",
    url: "https://github.com/g/p/issues/1",
    title: "x",
    description: "",
    state: "OPEN",
    parentIdentifier: null,
    source: "body",
    acceptance: null,
    contract: null,
    verify: null,
    ...overrides,
  };
}

const NO_CHECKS = { failing: [] as string[], pending: [] as string[], passing: [] as string[] };

test("computeReadiness: passes when all checks succeed", () => {
  const meta = mkPR({
    description: "## Why\nWe need to fix a problem in how X handles Y.\n## How\nDo Z.\n## Testing\nRan the tests.",
    mergeStateStatus: "CLEAN",
    mergeable: "MERGEABLE",
  });
  const got = computeReadiness(meta, mkTicket(), [], NO_CHECKS);
  assert.equal(got.passed, true, `unexpected blockers: ${JSON.stringify(got.blockers)}`);
});

test("computeReadiness: HIGH for merge conflicts", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: did Z.", mergeable: "CONFLICTING" });
  const got = computeReadiness(meta, mkTicket(), [], NO_CHECKS);
  assert.equal(got.blockers.some((b) => b.check === "mergeable"), true);
});

test("computeReadiness: HIGH when behind base", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: did Z.", mergeStateStatus: "BEHIND" });
  const got = computeReadiness(meta, mkTicket(), [], NO_CHECKS);
  assert.equal(got.blockers.some((b) => b.check === "mergeable"), true);
});

test("computeReadiness: HIGH for failing required check", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: did Z." });
  const got = computeReadiness(meta, mkTicket(), [], { failing: ["build"], pending: [], passing: [] });
  const blocker = got.blockers.find((b) => b.check === "checks");
  assert.ok(blocker);
  assert.match(blocker.detail, /failing: build/);
});

test("computeReadiness: HIGH for pending required check", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: did Z." });
  const got = computeReadiness(meta, mkTicket(), [], { failing: [], pending: ["test"], passing: [] });
  const blocker = got.blockers.find((b) => b.check === "checks");
  assert.ok(blocker);
  assert.match(blocker.detail, /pending: test/);
});

test("computeReadiness: does NOT block on a passing-only required check", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: did Z." });
  const got = computeReadiness(meta, mkTicket(), [], { failing: [], pending: [], passing: ["build"] });
  assert.equal(got.blockers.some((b) => b.check === "checks"), false);
});

test("computeReadiness: HIGH for draft", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: did Z.", draft: true });
  const got = computeReadiness(meta, mkTicket(), [], NO_CHECKS);
  assert.equal(got.blockers.some((b) => b.check === "draft"), true);
});

test("computeReadiness: HIGH for empty description with no linked issue", () => {
  const meta = mkPR({ description: "" });
  const got = computeReadiness(meta, null, [], NO_CHECKS);
  assert.equal(got.blockers.some((b) => b.check === "description"), true);
});

test("computeReadiness: empty description does NOT block when an issue is linked", () => {
  const meta = mkPR({ description: "" });
  const got = computeReadiness(meta, mkTicket(), [], NO_CHECKS);
  assert.equal(got.blockers.some((b) => b.check === "description"), false);
});

test("computeReadiness: template-stub description with no ticket is HIGH", () => {
  const meta = mkPR({ description: "fix bug" }); // <50 chars
  const got = computeReadiness(meta, null, [], NO_CHECKS);
  assert.equal(got.blockers.some((b) => b.check === "description"), true);
});

test("computeReadiness: HIGH for unresolved threads", () => {
  const meta = mkPR({ description: "Why: fix X. How: do Y. Testing: Z." });
  const thread: UnresolvedThread = {
    id: "t",
    author: "cody",
    body: "split FE/BE",
    bodyExcerpt: "split FE/BE",
    filePath: null,
    createdAt: "2026-04-30T00:00:00Z",
  };
  const got = computeReadiness(meta, mkTicket(), [thread], NO_CHECKS);
  const blocker = got.blockers.find((b) => b.check === "unresolved_threads");
  assert.ok(blocker);
  assert.match(blocker.detail, /@cody/);
});

// ============================================================================
// isFeatureOutput type guard
// ============================================================================

test("isFeatureOutput: validates shape", () => {
  const good: FeatureOutput = {
    schemaVersion: 2,
    tone: "casual",
    reviewMode: "peer",
    pr: mkPR(),
    worktree: { created: false, path: null, branch: null, reason: "x" },
    ticket: null,
    ticketLookupFailure: null,
    diff: { filesChanged: 1, linesAdded: 5, linesRemoved: 2, changedLines: {}, removedHunks: {} },
    diffFetchFailed: false,
    checks: NO_CHECKS,
    readiness: { passed: true, blockers: [] },
    unresolvedThreads: [],
    slipway: {
      present: false,
      lane: null,
      verificationSection: null,
      coldReviewApplies: false,
      coldReviewChecklistPath: null,
      domainInvariants: [],
      invariantsAtRisk: [],
      activeMilestones: [],
    },
    hardHalt: null,
  };
  assert.equal(isFeatureOutput(good), true);
  assert.equal(isFeatureOutput(null), false);
  assert.equal(isFeatureOutput({}), false);
  assert.equal(isFeatureOutput({ ...good, schemaVersion: 1 }), false);
  assert.equal(isFeatureOutput({ ...good, tone: "snarky" }), false);
  // pr can be null when hardHalt.reason === "pr_not_found"
  assert.equal(isFeatureOutput({ ...good, pr: null }), true);
  assert.equal(isFeatureOutput({ ...good, diffFetchFailed: "no" as unknown as boolean }), false);
});

// ============================================================================
// slipway integration
// ============================================================================

test("extractLane: parses trivial/bounded/feature", () => {
  assert.equal(extractLane("Lane: trivial\nsome more text"), "trivial");
  assert.equal(extractLane("Lane: bounded"), "bounded");
  assert.equal(extractLane("Lane: feature"), "feature");
});

test("extractLane: returns null when absent", () => {
  assert.equal(extractLane("## What\nNo lane here."), null);
});

test("diffTouchesRiskPaths: flags money/auth/schema/deletion paths", () => {
  assert.equal(diffTouchesRiskPaths(["apps/web/src/billing/invoice.ts"]), true);
  assert.equal(diffTouchesRiskPaths(["packages/auth/session.ts"]), true);
  assert.equal(diffTouchesRiskPaths(["db/migrations/0012_add_column.sql"]), true);
  assert.equal(diffTouchesRiskPaths(["apps/web/src/account/delete-account.ts"]), true);
});

test("diffTouchesRiskPaths: false for unrelated paths", () => {
  assert.equal(diffTouchesRiskPaths(["apps/web/src/components/Button.tsx"]), false);
});

test("parseDomainInvariants: parses the table", () => {
  const md = [
    "# Domain invariants",
    "",
    "| ID | Invariant | Enforced by | Since |",
    "|---|---|---|---|",
    "| INV-1 | balances never go negative | `packages/ledger/balance.test.ts` | 2026-01-01 |",
    "| INV-2 | | | |",
  ].join("\n");
  const got = parseDomainInvariants(md);
  assert.equal(got.length, 1);
  assert.equal(got[0].id, "INV-1");
  assert.equal(got[0].enforcedBy, "packages/ledger/balance.test.ts");
});

test("findInvariantsAtRisk: flags invariants whose enforcing path was touched by a removed hunk", () => {
  const invariants = [{ id: "INV-1", invariant: "x", enforcedBy: "packages/ledger/balance.test.ts" }];
  const removedHunks = { "packages/ledger/balance.test.ts": [[5, 10]] as [number, number][] };
  assert.deepEqual(findInvariantsAtRisk(invariants, removedHunks), ["INV-1"]);
});

test("findInvariantsAtRisk: empty when no enforcing path was touched", () => {
  const invariants = [{ id: "INV-1", invariant: "x", enforcedBy: "packages/ledger/balance.test.ts" }];
  assert.deepEqual(findInvariantsAtRisk(invariants, {}), []);
});

test("parseActiveMilestone: returns the milestone when status is active", () => {
  const md = [
    "---",
    "id: M1",
    "status: active",
    "kind: mvp",
    "---",
    "",
    "# M1 — walking skeleton",
    "",
    "## No-gos",
    "",
    "- payments integration",
    "- multi-tenant support",
    "",
    "## Gate",
    "- ci green",
  ].join("\n");
  const got = parseActiveMilestone(md, "docs/milestones/M1.md");
  assert.ok(got);
  assert.equal(got!.id, "M1");
  assert.equal(got!.status, "active");
  assert.deepEqual(got!.noGos, ["payments integration", "multi-tenant support"]);
});

test("parseActiveMilestone: returns null when status is not active", () => {
  const md = ["---", "id: M2", "status: shaping", "---", "", "# M2"].join("\n");
  assert.equal(parseActiveMilestone(md, "docs/milestones/M2.md"), null);
});

test("parseActiveMilestone: returns null with no frontmatter", () => {
  assert.equal(parseActiveMilestone("# M3\nno frontmatter here", "docs/milestones/M3.md"), null);
});

function emptyDiff(): DiffStats {
  return { filesChanged: 0, linesAdded: 0, linesRemoved: 0, changedLines: {}, removedHunks: {} };
}

test("detectSlipwayContext: absent when checkoutRoot has none of the markers", () => {
  const dir = workspaceMkdtemp("no-slipway-");
  const got = detectSlipwayContext(dir, "## What\nsome change", emptyDiff());
  assert.equal(got.present, false);
  assert.equal(got.lane, null);
  assert.deepEqual(got.domainInvariants, []);
  assert.deepEqual(got.activeMilestones, []);
});

test("detectSlipwayContext: present + fields populated when markers exist", () => {
  const dir = workspaceMkdtemp("slipway-");
  mkdirSync(path.join(dir, "process"), { recursive: true });
  writeFileSync(path.join(dir, "process", "cold-review.md"), "# Cold review\n");
  mkdirSync(path.join(dir, "docs"), { recursive: true });
  writeFileSync(
    path.join(dir, "docs", "domain-invariants.md"),
    [
      "| ID | Invariant | Enforced by | Since |",
      "|---|---|---|---|",
      "| INV-1 | x | `packages/billing/charge.test.ts` | 2026-01-01 |",
    ].join("\n"),
  );
  mkdirSync(path.join(dir, "docs", "milestones"), { recursive: true });
  writeFileSync(
    path.join(dir, "docs", "milestones", "M1.md"),
    ["---", "id: M1", "status: active", "---", "", "## No-gos", "", "- payments"].join("\n"),
  );

  const body = "## What\nchanges billing\n\nLane: bounded\n\n## Verification\n\nRan `pnpm verify`, all green.";
  const diff: DiffStats = {
    filesChanged: 1,
    linesAdded: 1,
    linesRemoved: 1,
    changedLines: { "packages/billing/charge.ts": [[10, 10]] },
    removedHunks: { "packages/billing/charge.test.ts": [[3, 3]] },
  };

  const got = detectSlipwayContext(dir, body, diff);
  assert.equal(got.present, true);
  assert.equal(got.lane, "bounded");
  assert.equal(got.verificationSection, "Ran `pnpm verify`, all green.");
  assert.equal(got.coldReviewApplies, true); // touches billing/
  assert.equal(got.coldReviewChecklistPath, "process/cold-review.md");
  assert.equal(got.domainInvariants.length, 1);
  assert.deepEqual(got.invariantsAtRisk, ["INV-1"]); // enforcing test path was touched by a removed hunk
  assert.equal(got.activeMilestones.length, 1);
  assert.deepEqual(got.activeMilestones[0].noGos, ["payments"]);
});

test("detectSlipwayContext: coldReviewApplies is false when diff doesn't touch a risk path", () => {
  const dir = workspaceMkdtemp("slipway-safe-");
  mkdirSync(path.join(dir, "process"), { recursive: true });
  writeFileSync(path.join(dir, "process", "cold-review.md"), "# Cold review\n");

  const diff: DiffStats = {
    filesChanged: 1,
    linesAdded: 1,
    linesRemoved: 0,
    changedLines: { "apps/web/src/components/Button.tsx": [[1, 1]] },
    removedHunks: {},
  };
  const got = detectSlipwayContext(dir, "## What\nbutton tweak", diff);
  assert.equal(got.coldReviewApplies, false);
});

function fullSlipwayCheckout(prefix: string): string {
  const dir = workspaceMkdtemp(prefix);
  mkdirSync(path.join(dir, "process"), { recursive: true });
  writeFileSync(path.join(dir, "process", "cold-review.md"), "# Cold review\n");
  mkdirSync(path.join(dir, "docs", "milestones"), { recursive: true });
  writeFileSync(
    path.join(dir, "docs", "domain-invariants.md"),
    [
      "| ID | Invariant | Enforced by | Since |",
      "|---|---|---|---|",
      "| INV-1 | x | `packages/billing/charge.test.ts` | 2026-01-01 |",
    ].join("\n"),
  );
  writeFileSync(
    path.join(dir, "docs", "milestones", "M1.md"),
    ["---", "id: M1", "status: active", "---", "", "## No-gos", "", "- payments"].join("\n"),
  );
  return dir;
}

const billingDiff: DiffStats = {
  filesChanged: 1,
  linesAdded: 1,
  linesRemoved: 1,
  changedLines: { "packages/billing/charge.ts": [[10, 10]] },
  removedHunks: { "packages/billing/charge.test.ts": [[3, 3]] },
};

test("detectSlipwayContext: invariants set to none reads no invariants, though docs/domain-invariants.md exists", () => {
  const dir = fullSlipwayCheckout("slipway-no-inv-");
  const got = detectSlipwayContext(dir, "## What\nx", billingDiff, { ...DEFAULT_SLIPWAY_PATHS, invariants: null });
  assert.deepEqual(got.domainInvariants, []);
  assert.deepEqual(got.invariantsAtRisk, []);
  assert.equal(got.activeMilestones.length, 1); // the other inputs still read
  assert.equal(got.coldReviewChecklistPath, "process/cold-review.md");
});

test("detectSlipwayContext: every input set to none reads nothing and is not a slipway repo", () => {
  const dir = fullSlipwayCheckout("slipway-all-none-");
  const got = detectSlipwayContext(dir, "## What\nx", billingDiff, { invariants: null, milestones: null, coldReview: null });
  assert.equal(got.present, false);
  assert.deepEqual(got.domainInvariants, []);
  assert.deepEqual(got.activeMilestones, []);
  assert.equal(got.coldReviewApplies, false);
  assert.equal(got.coldReviewChecklistPath, null);
});

test("detectSlipwayContext: reads configured paths, not the default ones", () => {
  const dir = workspaceMkdtemp("slipway-custom-");
  mkdirSync(path.join(dir, "rules", "plan"), { recursive: true });
  writeFileSync(
    path.join(dir, "rules", "money.md"),
    ["| ID | Invariant | Enforced by | Since |", "|---|---|---|---|", "| INV-9 | y | `packages/billing/charge.test.ts` | 2026-01-01 |"].join("\n"),
  );
  writeFileSync(path.join(dir, "rules", "review.md"), "# Cold review\n");
  writeFileSync(path.join(dir, "rules", "plan", "M2.md"), ["---", "id: M2", "status: active", "---"].join("\n"));
  const got = detectSlipwayContext(dir, "## What\nx", billingDiff, {
    invariants: "rules/money.md",
    milestones: "rules/plan",
    coldReview: "rules/review.md",
  });
  assert.equal(got.present, true);
  assert.deepEqual(got.invariantsAtRisk, ["INV-9"]);
  assert.equal(got.activeMilestones[0].path, path.join("rules", "plan", "M2.md"));
  assert.equal(got.coldReviewChecklistPath, "rules/review.md");
});

test("detectSlipwayContext: null checkoutRoot behaves as absent", () => {
  const got = detectSlipwayContext(null, "## What\nx", emptyDiff());
  assert.equal(got.present, false);
});

// ============================================================================
// detectHardHalt
// ============================================================================

test("detectHardHalt: zero filesChanged + fetch succeeded → empty_diff", () => {
  const meta = mkPR({ description: "ok" });
  const diff = emptyDiff();
  const halt = detectHardHalt(meta, diff, false, mkTicket());
  assert.ok(halt);
  assert.equal(halt.reason, "empty_diff");
});

test("detectHardHalt: zero filesChanged + fetch FAILED → does NOT trigger empty_diff", () => {
  const meta = mkPR({ description: "ok" });
  const diff = emptyDiff();
  const halt = detectHardHalt(meta, diff, true, mkTicket());
  assert.equal(halt, null);
});

test("detectHardHalt: empty description + no ticket → no_description_no_ticket", () => {
  const meta = mkPR({ description: "" });
  const diff: DiffStats = { ...emptyDiff(), filesChanged: 5, linesAdded: 10, linesRemoved: 2 };
  const halt = detectHardHalt(meta, diff, false, null);
  assert.ok(halt);
  assert.equal(halt.reason, "no_description_no_ticket");
});

test("detectHardHalt: empty description + ticket present → no halt", () => {
  const meta = mkPR({ description: "" });
  const diff: DiffStats = { ...emptyDiff(), filesChanged: 5, linesAdded: 10, linesRemoved: 2 };
  const halt = detectHardHalt(meta, diff, false, mkTicket());
  assert.equal(halt, null);
});

test("detectHardHalt: healthy PR → no halt", () => {
  const meta = mkPR({ description: "Why X. How Y. Testing Z." });
  const diff: DiffStats = { ...emptyDiff(), filesChanged: 5, linesAdded: 10, linesRemoved: 2 };
  const halt = detectHardHalt(meta, diff, false, mkTicket());
  assert.equal(halt, null);
});

// ============================================================================
// GhNotFoundError
// ============================================================================

test("GhNotFoundError: is a subclass of Error", () => {
  const err = new GhNotFoundError("test");
  assert.equal(err instanceof Error, true);
  assert.equal(err instanceof GhNotFoundError, true);
  assert.equal(err.name, "GhNotFoundError");
});

test("runGh: surfaces a nonexistent PR as GhNotFoundError", () => {
  let ghExists = true;
  try { execSync("which gh", { stdio: "pipe" }); } catch { ghExists = false; }
  if (!ghExists) return;
  assert.throws(
    () => runGh(["pr", "view", "999999999", "-R", "cli/cli", "--json", "number"]),
    (err) => err instanceof GhNotFoundError || (err as Error).message.length > 0,
  );
});

// ============================================================================
// Worktree setup (against a real temp git repo standing in for GitHub)
// ============================================================================

function createFixtureRepo(): string {
  const repoDir = workspaceMkdtemp("repo-");
  const run = (cmd: string, cwd = repoDir) =>
    execSync(cmd, { cwd, encoding: "utf8", stdio: "pipe" });

  // --template="" skips hook copying which can fail under restricted tmpdirs.
  // --initial-branch=main pins the default so tests don't depend on user config.
  run('git init -q --template="" --initial-branch=main');
  run('git config user.email "test@example.com"');
  run('git config user.name "Test"');
  run("git config commit.gpgSign false");
  writeFileSync(path.join(repoDir, "README.md"), "# fixture\n");
  run("git add README.md");
  run('git commit -q -m "init"');

  run("git checkout -q -b feature/x");
  writeFileSync(path.join(repoDir, "f.txt"), "hi\n");
  run("git add f.txt");
  run('git commit -q -m "add f"');
  run("git checkout -q main");

  const remoteDir = workspaceMkdtemp("remote-");
  execSync(`git clone --bare --template="" "${repoDir}" "${remoteDir}"`, { stdio: "pipe" });
  run(`git remote add origin "${remoteDir}"`);
  run("git fetch -q origin");

  return repoDir;
}

/** Simulates GitHub publishing a PR's head under refs/pull/<n>/head on the remote. */
function publishPullRef(repoDir: string, number: number, branch: string): void {
  const remoteUrl = execSync("git remote get-url origin", { cwd: repoDir, encoding: "utf8" }).trim();
  execSync(`git push -q "${remoteUrl}" ${branch}:refs/pull/${number}/head`, { cwd: repoDir, stdio: "pipe" });
}

test("setupWorktree: returns not-created when withWorktree is false", () => {
  const repo = createFixtureRepo();
  const meta = mkPR({ number: 1, sourceBranch: "feature/x" });
  const got = setupWorktree(meta, false, null, repo);
  assert.equal(got.created, false);
  assert.equal(got.path, null);
  assert.match(got.reason ?? "", /not requested/);
});

test("setupWorktree: creates worktree at sibling default from the pull/N/head ref", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 7, "feature/x");
  const meta = mkPR({ number: 7, sourceBranch: "feature/x" });
  const got = setupWorktree(meta, true, null, repo);
  assert.equal(got.created, true);
  assert.ok(got.path);
  assert.equal(got.branch, "pr-7");
  assert.equal(existsSync(got.path!), true);
  assert.equal(path.basename(got.path!), `${path.basename(repo)}-pr-7`);
});

test("setupWorktree: records the commit it checked out", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 9, "feature/x");
  const meta = mkPR({ number: 9, sourceBranch: "feature/x" });
  const got = setupWorktree(meta, true, null, repo);
  const expected = execSync("git rev-parse refs/heads/feature/x", { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(got.headSha, expected);
});

test("resolveHeadReviewed: the worktree's commit, flagged when the PR moved under it", () => {
  const wt = { created: true, path: "/x", branch: "pr-1", headSha: "bbb" };
  assert.deepEqual(resolveHeadReviewed("aaa", wt), { sha: "bbb", source: "worktree", moved: true });
  assert.deepEqual(resolveHeadReviewed("bbb", wt), { sha: "bbb", source: "worktree", moved: false });
});

test("resolveHeadReviewed: without a worktree, the head gh reported", () => {
  const wt = { created: false, path: null, branch: null };
  assert.deepEqual(resolveHeadReviewed("aaa", wt), { sha: "aaa", source: "pr", moved: false });
});

test("setupWorktree: honors worktreeDir override", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 8, "feature/x");
  const customParent = workspaceMkdtemp("custom-");
  const meta = mkPR({ number: 8, sourceBranch: "feature/x" });
  const got = setupWorktree(meta, true, customParent, repo);
  assert.equal(got.created, true);
  assert.equal(path.dirname(got.path!), customParent);
});

test("setupWorktree: reuses existing worktree when re-run (picks up a re-push)", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 9, "feature/x");
  const meta = mkPR({ number: 9, sourceBranch: "feature/x" });
  const first = setupWorktree(meta, true, null, repo);
  assert.equal(first.created, true);

  // Simulate a force-push to the PR (e.g. a rebase) landing new commits on
  // the same pull/N/head ref, then re-running the review. The commit must
  // land on feature/x itself (not whatever the repo's own checkout is on)
  // since publishPullRef reads the branch's ref, not the working tree.
  execSync("git checkout -q feature/x", { cwd: repo });
  writeFileSync(path.join(repo, "f2.txt"), "more\n");
  execSync("git add f2.txt", { cwd: repo });
  execSync("git commit -q -m 'more work'", { cwd: repo });
  execSync("git checkout -q main", { cwd: repo });
  publishPullRef(repo, 9, "feature/x");

  const second = setupWorktree(meta, true, null, repo);
  assert.equal(first.path, second.path);
  assert.equal(second.created, true);
  assert.equal(existsSync(path.join(second.path!, "f2.txt")), true);
});

test("setupWorktree: when not in a git repo, returns reason", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "pr-review-empty-"));
  const meta = mkPR({ sourceBranch: "feature/x" });
  const got = setupWorktree(meta, true, null, empty);
  assert.equal(got.created, false);
  assert.match(got.reason ?? "", /not inside a git repository/);
});

test("setupWorktree: refuses a relative worktreeDir that resolves inside the repo", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 30, "feature/x");
  const meta = mkPR({ number: 30, sourceBranch: "feature/x" });

  const got = setupWorktree(meta, true, ".pr-review-worktrees", repo);

  assert.equal(got.created, false);
  assert.equal(got.path, null);
  assert.match(got.reason ?? "", /refusing to create a worktree inside the repository/);
  assert.equal(existsSync(path.join(repo, ".pr-review-worktrees")), false);
});

test("setupWorktree: refuses an absolute worktreeDir inside the repo", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 31, "feature/x");
  const meta = mkPR({ number: 31, sourceBranch: "feature/x" });

  const got = setupWorktree(meta, true, path.join(repo, "tmp", "reviews"), repo);

  assert.equal(got.created, false);
  assert.match(got.reason ?? "", /must resolve outside the working tree/);
});

test("setupWorktree: refuses the repo root itself as worktreeDir", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 32, "feature/x");
  const meta = mkPR({ number: 32, sourceBranch: "feature/x" });

  const got = setupWorktree(meta, true, repo, repo);

  assert.equal(got.created, false);
  assert.match(got.reason ?? "", /refusing to create a worktree inside the repository/);
});

test("setupWorktree: anchors on the main worktree when run from inside a review worktree", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 20, "feature/x");
  publishPullRef(repo, 21, "feature/x");
  const first = setupWorktree(mkPR({ number: 20, sourceBranch: "feature/x" }), true, null, repo);
  assert.equal(first.created, true);

  // Re-run from inside the worktree we just made, as happens when a review
  // chat is started in a previous review worktree.
  const second = setupWorktree(mkPR({ number: 21, sourceBranch: "feature/x" }), true, null, first.path!);

  assert.equal(second.created, true);
  assert.equal(path.basename(second.path!), `${path.basename(repo)}-pr-21`);
  assert.equal(path.dirname(second.path!), path.dirname(repo));
  assert.equal(second.path!.startsWith(first.path! + path.sep), false);
});

test("resolveMainWorktreeRoot: returns the repo itself when already in the main worktree", () => {
  const repo = createFixtureRepo();
  assert.equal(resolveMainWorktreeRoot(repo, repo), repo);
});

test("resolveMainWorktreeRoot: falls back to the given root outside a git repo", () => {
  const empty = mkdtempSync(path.join(tmpdir(), "pr-review-nogit-"));
  assert.equal(resolveMainWorktreeRoot(empty, empty), empty);
});

test("setupWorktree: bails when reusing a worktree holding commits the PR does not have", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 21, "feature/x");
  const meta = mkPR({ number: 21, sourceBranch: "feature/x" });
  const first = setupWorktree(meta, true, null, repo);
  assert.equal(first.created, true);
  writeFileSync(path.join(first.path!, "local.txt"), "mine\n");
  execSync('git add local.txt && git -c user.email=t@example.com -c user.name=T -c commit.gpgSign=false commit -q -m local', { cwd: first.path!, stdio: "pipe" });
  const before = execSync("git rev-parse HEAD", { cwd: first.path!, encoding: "utf8" }).trim();
  const second = setupWorktree(meta, true, null, repo);
  assert.equal(second.created, false);
  assert.match(second.reason ?? "", /commit\(s\) the PR does not/);
  assert.equal(execSync("git rev-parse HEAD", { cwd: first.path!, encoding: "utf8" }).trim(), before);
});

// The review's bar comes from the PR's base commit, never its head or a working tree.
function commitAll(repo: string, msg: string): string {
  execSync(`git add -A && git commit -q -m "${msg}"`, { cwd: repo, stdio: "pipe" });
  return execSync("git rev-parse HEAD", { cwd: repo, encoding: "utf8" }).trim();
}

test("gitSlipwayReader: a PR that deletes an invariant row and its test is still caught", () => {
  const repo = createFixtureRepo();
  mkdirSync(path.join(repo, "docs"), { recursive: true });
  writeFileSync(
    path.join(repo, "docs", "domain-invariants.md"),
    ["| ID | Invariant | Enforced by | Since |", "|---|---|---|---|", "| INV-1 | x | `packages/billing/charge.test.ts` | 2026-01-01 |"].join("\n"),
  );
  writeFileSync(path.join(repo, "cold.md"), "# checklist\n");
  const base = commitAll(repo, "base");
  // The PR's head: row and checklist gone. The working tree says the same.
  writeFileSync(path.join(repo, "docs", "domain-invariants.md"), "| ID | Invariant | Enforced by | Since |\n|---|---|---|---|\n");
  rmSync(path.join(repo, "cold.md"));
  commitAll(repo, "pr lowers its bar");
  const paths = { invariants: "docs/domain-invariants.md", milestones: null, coldReview: "cold.md" };
  const got = detectSlipwayContext(gitSlipwayReader(repo, base), "## What\nx", billingDiff, paths, base);
  assert.deepEqual(got.invariantsAtRisk, ["INV-1"]);
  assert.equal(got.coldReviewApplies, true);
  assert.equal(got.readFrom, base);
  // Read from the working tree, the same PR would have switched both off.
  const head = detectSlipwayContext(repo, "## What\nx", billingDiff, paths);
  assert.deepEqual(head.invariantsAtRisk, []);
  assert.equal(head.coldReviewApplies, false);
});

test("gitSlipwayReader: never follows a committed symlink", () => {
  const repo = createFixtureRepo();
  const outside = workspaceMkdtemp("outside-");
  writeFileSync(path.join(outside, "secret.md"), "| S | leaked | `x` | now |\n");
  mkdirSync(path.join(repo, "docs"), { recursive: true });
  execSync(`ln -s "${path.join(outside, "secret.md")}" docs/domain-invariants.md`, { cwd: repo });
  execSync(`ln -s "${outside}" docs/milestones`, { cwd: repo });
  const base = commitAll(repo, "symlinks");
  const reader = gitSlipwayReader(repo, base);
  assert.equal(reader.read("docs/domain-invariants.md"), null);
  assert.deepEqual(reader.list("docs/milestones"), null);
});

test("gitSlipwayReader: lists and reads plain files in a folder", () => {
  const repo = createFixtureRepo();
  mkdirSync(path.join(repo, "docs", "milestones"), { recursive: true });
  writeFileSync(path.join(repo, "docs", "milestones", "M1.md"), ["---", "id: M1", "status: active", "---"].join("\n"));
  const base = commitAll(repo, "milestone");
  const reader = gitSlipwayReader(repo, base);
  assert.deepEqual(reader.list("docs/milestones"), ["M1.md"]);
  assert.match(reader.read("docs/milestones/M1.md") ?? "", /status: active/);
  assert.equal(reader.read("docs/absent.md"), null);
  assert.equal(reader.list("docs/absent"), null);
});

test("fetchBaseCommit: the remote's branch tip, never a local edit; null when unknown", () => {
  const repo = createFixtureRepo();
  const remoteMain = execSync("git ls-remote origin refs/heads/main", { cwd: repo, encoding: "utf8" }).split("\t")[0];
  writeFileSync(path.join(repo, "local.md"), "unpushed\n");
  commitAll(repo, "local only");
  assert.equal(fetchBaseCommit(repo, "main"), remoteMain);
  assert.equal(fetchBaseCommit(repo, "no-such-branch"), null);
  assert.equal(fetchBaseCommit(repo, "--upload-pack=touch x"), null);
  assert.equal(fetchBaseCommit(repo, ""), null);
});

test("setupWorktree: bails when reusing a worktree with uncommitted changes", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 11, "feature/x");
  const meta = mkPR({ number: 11, sourceBranch: "feature/x" });
  const first = setupWorktree(meta, true, null, repo);
  assert.equal(first.created, true);
  writeFileSync(path.join(first.path!, "dirty.txt"), "uncommitted\n");
  const second = setupWorktree(meta, true, null, repo);
  assert.equal(second.created, false);
  assert.match(second.reason ?? "", /uncommitted changes/);
});
