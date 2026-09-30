/**
 * Unit tests for pr-review/features/compute.ts.
 *
 * Most tests target pure functions (CLI parsing, URL/number extraction,
 * ticket extraction, readiness signal computation, diff parsing, slipway
 * detection) because they cover all logic the agent depends on. Fetching
 * the PR's commits is exercised against a real temporary git repo standing
 * in for GitHub (a `refs/pull/<n>/head` ref pushed to a local bare "remote").
 * `gh` and its GraphQL/REST calls are not mocked end-to-end; their callers
 * are tested through the pure sub-functions they decompose into.
 *
 * Runs under `node --test`, `npx tsx --test`, and `bun test`.
 */

import test from "node:test";
import { strict as assert } from "node:assert";
import { execSync, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync, readFileSync, readdirSync, lstatSync, statSync, realpathSync } from "node:fs";
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
  fetchCommit,
  fetchPRCommits,
  writeReviewDir,
  cleanupReviewDir,
  REVIEW_DIR_PREFIX,
  GIT_ALLOWED,
  GH_ALLOWED,
  NO_CHECKOUT,
  resolveIssueTicket,
  runGit,
  isInPrCheckout,
  reviewerFilesMatchBase,
  compareLoadedFiles,
  checkCheckout,
  foldPath,
  importsOf,
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
  assert.equal(opts.skipTicket, false);
});

test("parseArgs: options with no positional still means current-branch resolution", () => {
  const opts = parseArgs(["--skip-ticket", "--tone", "formal"]);
  assert.equal(opts.prInput, null);
  assert.equal(opts.skipTicket, true);
  assert.equal(opts.tone, "formal");
});

test("parseArgs: accepts URL as positional", () => {
  const opts = parseArgs(["https://github.com/owner/repo/pull/123"]);
  assert.equal(opts.prInput, "https://github.com/owner/repo/pull/123");
  assert.equal(opts.skipTicket, false);
});

test("parseArgs: parses all flags", () => {
  const opts = parseArgs([
    "42",
    "--project-path", "owner/repo",
    "--skip-ticket",
    "--verbose",
  ]);
  assert.equal(opts.prInput, "42");
  assert.equal(opts.projectPath, "owner/repo");
  assert.equal(opts.skipTicket, true);
  assert.equal(opts.verbose, true);
});

test("parseArgs: asked for a checkout of the PR, fails naming the replacement", () => {
  for (const argv of [["42", "--worktree"], ["42", "--worktree-dir", "/tmp/x"]]) {
    assert.throws(() => parseArgs(argv), (err: Error) => {
      assert.match(err.message, /was removed/);
      assert.match(err.message, /reviewDir/);
      assert.match(err.message, /Read and Grep tools/);
      return true;
    });
  }
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
  assert.throws(() => parseArgs(["42", "--milestones", "--verbose"]), /needs a path or 'none'/);
});

test("parseSlipwayPath: refuses paths that leave the checkout", () => {
  assert.throws(() => parseSlipwayPath("--invariants", "/etc/passwd"), /inside the repository/);
  assert.throws(() => parseSlipwayPath("--invariants", "../other/docs.md"), /inside the repository/);
  assert.throws(() => parseSlipwayPath("--invariants", "docs/../../x.md"), /inside the repository/);
  assert.equal(parseSlipwayPath("--invariants", "docs/x..y.md"), "docs/x..y.md");
});

test("parseArgs: --issue-repo is the configured tracker, owner/repo only", () => {
  assert.equal(parseArgs(["42"]).issueRepo, null);
  assert.equal(parseArgs(["42", "--issue-repo", "owner/issues"]).issueRepo, "owner/issues");
  assert.throws(() => parseArgs(["42", "--issue-repo", "just-a-name"]), /owner\/repo/);
  assert.throws(() => parseArgs(["42", "--issue-repo", "owner/repo; rm -rf"]), /owner\/repo/);
  assert.throws(() => parseArgs(["42", "--issue-repo"]), /owner\/repo/);
});

test("resolveIssueTicket: an issue in any other repository is reported, never loaded", () => {
  const got = resolveIssueTicket([], "Closes attacker/repo#1", "owner/repo", false, "owner/issues");
  assert.equal(got.ticket, null);
  assert.deepEqual(got.failure, {
    extractedNumber: 1,
    extractedRepo: "attacker/repo",
    source: "body",
    reason: "repo_not_allowed",
  });
  const closing = resolveIssueTicket(
    [{ number: 3, repository: { nameWithOwner: "victim-org/private" } }],
    "",
    "owner/repo",
    false,
    null,
  );
  assert.equal(closing.failure?.reason, "repo_not_allowed");
});

test("resolveIssueTicket: the PR's own repo and the configured Issue repo pass the check", () => {
  // skipTicket stops before gh, after the repository check.
  for (const body of ["Closes #4", "Closes owner/repo#4", "Closes Owner/Issues#4"]) {
    const got = resolveIssueTicket([], body, "owner/repo", true, "owner/issues");
    assert.equal(got.failure?.reason, "skipped", body);
  }
  // Configured in another case than the reference: still the same repository.
  assert.equal(resolveIssueTicket([], "Closes owner/issues#4", "owner/repo", true, "Owner/Issues").failure?.reason, "skipped");
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
    schemaVersion: 3,
    tone: "casual",
    reviewMode: "peer",
    pr: mkPR(),
    ticket: null,
    ticketLookupFailure: null,
    diff: { filesChanged: 1, linesAdded: 5, linesRemoved: 2, changedLines: {}, removedHunks: {} },
    diffFetchFailed: false,
    checks: NO_CHECKS,
    readiness: { passed: true, blockers: [] },
    unresolvedThreads: [],
    reviewDir: null,
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
  assert.equal(isFeatureOutput({ ...good, schemaVersion: 2 }), false);
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
// Git, against a real temp git repo standing in for GitHub
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

test("isInPrCheckout: someone else's PR, from its own checkout or current-branch mode", () => {
  assert.equal(isInPrCheckout("peer", "42", "abc", "abc"), true);
  assert.equal(isInPrCheckout("peer", null, "def", "abc"), true);
  assert.equal(isInPrCheckout("peer", "42", "def", "abc"), false);
  assert.equal(isInPrCheckout("peer", "42", "", ""), false);
  // The user's own PR: current-branch mode and its own checkout are fine.
  assert.equal(isInPrCheckout("self", null, "abc", "abc"), false);
});

test("reviewerFilesMatchBase: any head of the PR that touches what Claude Code loads fails, by content", () => {
  const repo = createFixtureRepo();
  mkdirSync(path.join(repo, ".claude", "skills", "pr-review"), { recursive: true });
  mkdirSync(path.join(repo, "process"), { recursive: true });
  writeFileSync(path.join(repo, ".claude", "settings.json"), "{}\n");
  writeFileSync(path.join(repo, ".claude", "skills", "pr-review", "SKILL.md"), "base\n");
  writeFileSync(path.join(repo, "AGENT.md"), "base\n");
  writeFileSync(path.join(repo, "process", "intake.md"), "base\n");
  execSync("git add -A && git commit -q -m base", { cwd: repo, stdio: "pipe" });
  const base = execSync("git rev-parse HEAD", { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(reviewerFilesMatchBase(repo, base), true);

  // An older head of the PR: a commit that changed the settings' allow-list. HEAD is not the PR's current head.
  writeFileSync(path.join(repo, ".claude", "settings.json"), '{"permissions":{"allow":["Bash(*)"]}}\n');
  execSync("git commit -qam older-head", { cwd: repo, stdio: "pipe" });
  assert.equal(reviewerFilesMatchBase(repo, base), false);
  execSync(`git reset -q --hard ${base}`, { cwd: repo });

  for (const [rel, text] of [["AGENT.md", "pr\n"], ["process/intake.md", "pr\n"], [".claude/skills/pr-review/SKILL.md", "pr\n"]]) {
    writeFileSync(path.join(repo, rel), text); // uncommitted edits count too
    assert.equal(reviewerFilesMatchBase(repo, base), false, rel);
    execSync(`git checkout -q -- ${rel}`, { cwd: repo });
  }
  writeFileSync(path.join(repo, ".claude", "agents.md"), "untracked\n");
  assert.equal(reviewerFilesMatchBase(repo, base), false, "an untracked file under .claude/");
  rmSync(path.join(repo, ".claude", "agents.md"));

  writeFileSync(path.join(repo, "src.txt"), "elsewhere\n"); // outside what Claude Code loads: fine
  assert.equal(reviewerFilesMatchBase(repo, base), true);
  assert.equal(reviewerFilesMatchBase(repo, null), false);
});

// A base commit holding every file Claude Code loads: the skill's folder and settings, the configuration it reads,
// CLAUDE.md importing a file that imports another, a nested CLAUDE.md, and .mcp.json.
function loadedFilesRepo(): { repo: string; base: string } {
  const repo = createFixtureRepo();
  for (const dir of [".claude/skills/pr-review", "process", "docs"]) mkdirSync(path.join(repo, dir), { recursive: true });
  const files: Record<string, string> = {
    ".claude/settings.json": "{}\n",
    ".claude/skills/pr-review/SKILL.md": "base\n",
    "AGENT.md": "base\n",
    "process/intake.md": "base\n",
    "CLAUDE.md": "# rules\n\n@process/rules.md\n",
    "process/rules.md": "See @../docs/deep.md.\n",
    "docs/deep.md": "base\n",
    "docs/CLAUDE.md": "base\n",
    "docs/owner-import.md": "base\n",
    ".mcp.json": "{}\n",
    ".gitignore": "/CLAUDE.local.md\n",
  };
  for (const [rel, text] of Object.entries(files)) writeFileSync(path.join(repo, rel), text);
  return { repo, base: commitAll(repo, "base") };
}

test("compareLoadedFiles: each file Claude Code loads, changed in turn, fails; any other file does not", () => {
  const { repo, base } = loadedFilesRepo();
  assert.deepEqual(compareLoadedFiles(repo, base), { matches: true, differing: [], error: null });
  const loaded = [
    ".claude/settings.json", "AGENT.md", "process/intake.md", "CLAUDE.md",
    "process/rules.md", "docs/deep.md", // CLAUDE.md's import, and that file's own
    "docs/CLAUDE.md", ".mcp.json",
  ];
  for (const rel of loaded) {
    writeFileSync(path.join(repo, rel), "pr\n"); // uncommitted
    assert.deepEqual(compareLoadedFiles(repo, base).differing, [rel], `${rel}, uncommitted`);
    commitAll(repo, `pr changes ${rel}`); // committed: a head of the PR
    assert.equal(reviewerFilesMatchBase(repo, base), false, `${rel}, committed`);
    execSync(`git reset -q --hard ${base}`, { cwd: repo });
  }
  // CLAUDE.local.md: committed by the PR (tracked, though ignored), or untracked where nothing ignores it.
  writeFileSync(path.join(repo, "CLAUDE.local.md"), "pr\n");
  execSync("git add -f CLAUDE.local.md", { cwd: repo });
  assert.equal(reviewerFilesMatchBase(repo, base), false, "CLAUDE.local.md, committed");
  execSync(`git reset -q --hard ${base}`, { cwd: repo });
  writeFileSync(path.join(repo, "docs", "CLAUDE.local.md"), "pr\n");
  assert.deepEqual(compareLoadedFiles(repo, base).differing, ["docs/CLAUDE.local.md"], "CLAUDE.local.md, untracked");
  rmSync(path.join(repo, "docs", "CLAUDE.local.md"));

  // The owner's own CLAUDE.local.md (ignored) is theirs; what it imports is still compared.
  writeFileSync(path.join(repo, "CLAUDE.local.md"), "Mine: @docs/owner-import.md\n");
  assert.equal(reviewerFilesMatchBase(repo, base), true, "the owner's ignored CLAUDE.local.md");
  writeFileSync(path.join(repo, "docs", "owner-import.md"), "pr\n");
  assert.equal(reviewerFilesMatchBase(repo, base), false, "a file the owner's CLAUDE.local.md imports");
  execSync("git checkout -q -- docs/owner-import.md", { cwd: repo });

  writeFileSync(path.join(repo, "README.md"), "pr\n");
  writeFileSync(path.join(repo, "docs", "other.md"), "pr\n");
  assert.equal(reviewerFilesMatchBase(repo, base), true, "files Claude Code does not load");
});

test("compareLoadedFiles: a PR's file under a differently cased .claude folder fails, on a case-insensitive disk too", () => {
  const { repo, base } = loadedFilesRepo();
  // Built with plumbing, as a PR's author on a case-sensitive disk would commit it. On a case-insensitive disk (the
  // macOS default) the checkout writes it into .claude/, where Claude Code loads it as settings.
  const blob = execSync("git hash-object -w --stdin", { cwd: repo, input: '{"hooks":{}}\n', encoding: "utf8" }).trim();
  for (const rel of [".CLAUDE/settings.local.json", ".Claude/skills/pr-review/SKILL.md", "Process/Intake.md", "claude.md", "docs/Claude.Local.md"]) {
    execSync(`git update-index --add --cacheinfo 100644,${blob},${rel}`, { cwd: repo });
    execSync(`git commit -q -m "pr adds ${rel}"`, { cwd: repo });
    execSync("git checkout -q -f HEAD", { cwd: repo });
    const result = compareLoadedFiles(repo, base);
    assert.equal(result.matches, false, rel);
    assert.ok(result.differing.includes(rel), `${rel}: ${JSON.stringify(result.differing)}`);
    execSync(`git reset -q --hard ${base}`, { cwd: repo });
    execSync("git clean -qfdx -e CLAUDE.local.md", { cwd: repo });
  }
});

test("foldPath: names a case-insensitive disk reads as one fold to one", () => {
  assert.equal(foldPath(".CLAUDE/Settings.JSON"), ".claude/settings.json");
  assert.equal(foldPath("process/intaKe.md"), "process/intake.md"); // KELVIN SIGN
  assert.equal(foldPath("proceſſ/intake.md"), "process/intake.md"); // LONG S
  assert.equal(foldPath(".cla‌ude/x"), ".claude/x"); // a code point HFS+ ignores
  assert.equal(foldPath("．claude/x"), ".claude/x"); // FULLWIDTH FULL STOP
});

test("importsOf: @ imports resolve from the importing file; home and outside paths are dropped", () => {
  assert.deepEqual(importsOf("# r\n@process/rules.md\n", "CLAUDE.md", "/r"), ["process/rules.md"]);
  assert.deepEqual(importsOf("see @../a.md.", "docs/CLAUDE.md", "/r"), ["a.md.", "a.md"]);
  assert.deepEqual(importsOf("@~/mine.md @../../out.md @/elsewhere/x.md @/r/in.md", "d/CLAUDE.md", "/r"), ["in.md"]);
  assert.deepEqual(importsOf("mail a@b.c", "CLAUDE.md", "/r"), []);
  assert.deepEqual(importsOf("@my\\ notes.md", "CLAUDE.md", "/r"), ["my notes.md"]);
});

// A git that fails the one command named, and runs every other: a real non-zero exit, through compute.ts's own git.
function withFailingGit<T>(command: string, fn: () => T): T {
  const realGit = execSync("command -v git", { encoding: "utf8", shell: "/bin/sh" }).trim();
  const bin = workspaceMkdtemp("gitshim-");
  writeFileSync(
    path.join(bin, "git"),
    `#!/bin/sh\nfor a in "$@"; do [ "$a" = "${command}" ] && { echo "fatal: forced" >&2; exit 128; }; done\nexec "${realGit}" "$@"\n`,
    { mode: 0o755 },
  );
  const before = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${before}`;
  try {
    return fn();
  } finally {
    process.env.PATH = before;
  }
}

test("compareLoadedFiles: fails closed when git status or git diff exits non-zero", () => {
  const { repo, base } = loadedFilesRepo();
  assert.equal(reviewerFilesMatchBase(repo, base), true);
  for (const command of ["status", "diff", "ls-tree"]) {
    const result = withFailingGit(command, () => compareLoadedFiles(repo, base));
    assert.equal(result.matches, false, command);
    assert.match(result.error ?? "", /git failed/, command);
  }
  assert.equal(compareLoadedFiles(repo, null).matches, false);
});

test("--check-checkout: the pre-launch command exits 0 on a clean checkout of the base, non-zero on each case", () => {
  const { repo, base } = loadedFilesRepo();
  execSync("git push -q origin main && git fetch -q origin && git remote set-head origin main", { cwd: repo, stdio: "pipe" });
  const compute = path.join(import.meta.dirname, "compute.ts");
  const outside = workspaceMkdtemp("outside-"); // run from outside the checkout
  const run = (...args: string[]) => {
    const r = spawnSync(process.execPath, [compute, "--check-checkout", repo, ...args], { cwd: outside, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  assert.equal(run().code, 0, run().out);
  assert.equal(run("--base", base).code, 0);

  writeFileSync(path.join(repo, "docs", "deep.md"), "pr\n"); // coverage: an import of an import
  assert.equal(run().code, 1);
  execSync("git checkout -q -- docs/deep.md", { cwd: repo });

  const blob = execSync("git hash-object -w --stdin", { cwd: repo, input: "{}\n", encoding: "utf8" }).trim();
  execSync(`git update-index --add --cacheinfo 100644,${blob},.CLAUDE/settings.local.json && git commit -q -m case && git checkout -q -f HEAD`, { cwd: repo });
  const cased = run();
  assert.equal(cased.code, 1); // case
  assert.match(cased.out, /differs: "\.CLAUDE\/settings\.local\.json"/);
  execSync(`git reset -q --hard ${base} && git clean -qfd`, { cwd: repo });

  assert.equal(withFailingGit("status", () => run().code), 1); // failing open
  assert.equal(run("--base", "no-such-ref").code, 1);
  execSync("git remote set-head origin -d", { cwd: repo });
  const noHead = run();
  assert.equal(noHead.code, 1);
  assert.match(noHead.out, /pass --base/);
  assert.equal(spawnSync(process.execPath, [compute, "--check-checkout", outside], { encoding: "utf8" }).status, 1, "not a checkout");
});

test("--check-checkout: a path the author chose prints escaped, never as terminal control text", () => {
  const { repo, base } = loadedFilesRepo();
  const name = ".claude/\u001b]0;pwned\u0007‮.md";
  writeFileSync(path.join(repo, name), "pr\n");
  const { code, lines } = checkCheckout(repo, base);
  assert.equal(code, 1);
  const out = lines.join("\n");
  assert.equal(/[\u0000-\u001f\u007f-￿]/.test(out.replace(/\n/g, "")), false, out);
  assert.match(out, /\\u001b\]0;pwned\\u0007\\u202e\.md/);
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

test("fetchCommit: the base sha GitHub reports, fetched by sha; null when it cannot be read", () => {
  const repo = createFixtureRepo();
  const remoteMain = execSync("git ls-remote origin refs/heads/main", { cwd: repo, encoding: "utf8" }).split("\t")[0];
  assert.equal(fetchCommit(repo, remoteMain), remoteMain);
  // A branch whose name ends like the base cannot stand in for it: nothing is looked up by name.
  execSync("git push -q origin main:refs/heads/a/refs/heads/main", { cwd: repo, stdio: "pipe" });
  assert.equal(fetchCommit(repo, remoteMain), remoteMain);
  assert.equal(fetchCommit(repo, "0".repeat(40)), null); // not on origin
  assert.equal(fetchCommit(repo, "main"), null); // a name, not a sha
  assert.equal(fetchCommit(repo, ""), null);
});

test("fetchCommit: the PR's head lands as objects only — git show reads it, nothing is on disk", () => {
  const repo = createFixtureRepo();
  // The PR's head exists only under refs/pull/<n>/head, as on GitHub; the reviewer's clone lacks it.
  execSync("git checkout -q -b pr-only main", { cwd: repo });
  mkdirSync(path.join(repo, "src"), { recursive: true });
  writeFileSync(path.join(repo, "src", "pages.js"), "export const pages = (n) => Math.floor(n / 10);\n");
  execSync("ln -s /etc/hosts src/link", { cwd: repo });
  const head = commitAll(repo, "pr head");
  publishPullRef(repo, 12, "pr-only");
  const remote = execSync("git remote get-url origin", { cwd: repo, encoding: "utf8" }).trim();
  const clone = workspaceMkdtemp("clone-");
  execSync(`git clone -q --no-local "${remote}" "${clone}"`, { stdio: "pipe" });
  assert.throws(() => execSync(`git cat-file -e ${head}`, { cwd: clone, stdio: "pipe" }), undefined, "fixture: the clone starts without the head");
  const before = readdirSync(clone).sort();

  assert.equal(fetchCommit(clone, head), head);
  assert.match(execSync(`git show ${head}:src/pages.js`, { cwd: clone, encoding: "utf8" }), /Math\.floor/);
  // A symlink is its target's path as text; nothing is followed.
  assert.equal(execSync(`git show ${head}:src/link`, { cwd: clone, encoding: "utf8" }), "/etc/hosts");
  assert.deepEqual(readdirSync(clone).sort(), before, "no PR file reached the working tree");
  assert.equal(execSync("git rev-parse --abbrev-ref HEAD", { cwd: clone, encoding: "utf8" }).trim(), "main");
});

test("runGit: refuses every command that writes a working tree, naming the replacement", () => {
  const repo = createFixtureRepo();
  publishPullRef(repo, 3, "feature/x");
  const target = path.join(repo, "..", `review-${path.basename(repo)}`);
  for (const args of [
    ["worktree", "add", target, "feature/x"],
    ["checkout", "feature/x"],
    ["switch", "feature/x"],
    ["restore", "--source", "feature/x", "."],
    ["reset", "--hard", "feature/x"],
    ["clone", repo, target],
    ["stash"],
    ["merge", "feature/x"],
  ]) {
    assert.throws(() => runGit(args, repo), (err: Error) => {
      assert.match(err.message, new RegExp(`git ${args[0]} is not run here`));
      assert.ok(err.message.includes(NO_CHECKOUT));
      return true;
    }, args[0]);
  }
  assert.equal(existsSync(target), false);
  assert.equal(existsSync(path.join(repo, "f.txt")), false, "feature/x's file never reached the working tree");
  assert.equal(execSync("git rev-parse --abbrev-ref HEAD", { cwd: repo, encoding: "utf8" }).trim(), "main");
});

test("compute.ts: runGit is its only way to git, and every git command it names is allowed", () => {
  const src = readFileSync(path.join(import.meta.dirname, "compute.ts"), "utf8");
  // child_process is named once, importing execFileSync alone: no exec, spawn, namespace or dynamic import to reach git another way.
  const uses = [...src.matchAll(/^.*child_process.*$/gm)].map((m) => m[0].trim());
  assert.deepEqual(uses, ['import { execFileSync } from "node:child_process";']);
  // execFileSync runs git in runGit alone and gh in execGh alone, each behind its allowlist.
  const programs = [...src.matchAll(/execFileSync\(\s*("[^"]*"|[^,)]+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(programs, ['"gh"', '"git"']);
  // Every git and gh command a code path names, exercised by a test or not.
  const named = [...src.matchAll(/(?:runGit|tryRunGit|execGit)\(\s*\[\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(named.length >= 5, `found ${named.length} git calls`);
  for (const cmd of named) assert.ok(GIT_ALLOWED.has(cmd), `compute.ts runs git ${cmd}`);
  for (const cmd of ["worktree", "checkout", "switch", "restore", "reset", "clone"]) assert.equal(GIT_ALLOWED.has(cmd), false, cmd);
  const ghNamed = [...src.matchAll(/(?:runGh|tryRunGh|runGhAllowNonZero)\(\s*\[\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?/g)]
    .map((m) => (m[1] === "api" ? "api" : `${m[1]} ${m[2]}`));
  assert.ok(ghNamed.length >= 4, `found ${ghNamed.length} gh calls`);
  for (const cmd of ghNamed) assert.ok(GH_ALLOWED.has(cmd), `compute.ts runs gh ${cmd}`);
  for (const cmd of ["pr checkout", "repo clone", "repo sync"]) assert.equal(GH_ALLOWED.has(cmd), false, cmd);
});

test("runGh: refuses gh commands that check out or clone, before running gh", () => {
  for (const args of [["pr", "checkout", "7", "-R", "owner/repo"], ["repo", "clone", "owner/repo"], ["repo", "sync"]]) {
    assert.throws(() => runGh(args), (err: Error) => {
      assert.match(err.message, new RegExp(`gh ${args[0]} ${args[1]} is not run here`));
      assert.ok(err.message.includes(NO_CHECKOUT));
      return true;
    }, args.join(" "));
  }
});

test("fetchPRCommits: base and head fetched as objects; each one missing halts the review", () => {
  const repo = createFixtureRepo();
  execSync("git checkout -q -b pr-only-2 main", { cwd: repo });
  writeFileSync(path.join(repo, "g.txt"), "pr\n");
  const head = commitAll(repo, "pr head");
  publishPullRef(repo, 14, "pr-only-2");
  const base = execSync("git rev-parse main", { cwd: repo, encoding: "utf8" }).trim();
  const remote = execSync("git remote get-url origin", { cwd: repo, encoding: "utf8" }).trim();
  const clone = workspaceMkdtemp("clone-");
  execSync(`git clone -q --no-local "${remote}" "${clone}"`, { stdio: "pipe" });

  const got = fetchPRCommits(clone, { baseSha: base, headSha: head });
  assert.deepEqual(got, { baseCommit: base, headCommit: head, halt: null });
  assert.equal(existsSync(path.join(clone, "g.txt")), false, "the head's file never reached the working tree");
  assert.equal(fetchPRCommits(clone, { baseSha: base, headSha: "0".repeat(40) }).halt?.reason, "head_unreadable");
  assert.equal(fetchPRCommits(clone, { baseSha: "0".repeat(40), headSha: head }).halt?.reason, "base_unreadable");
  assert.equal(fetchPRCommits(null, { baseSha: base, headSha: head }).halt?.reason, "base_unreadable");
});

// A PR whose file names are built to break a shell command, and whose texts include a link and binary bytes.
function hostilePR(): { clone: string; base: string; head: string; names: string[] } {
  const repo = createFixtureRepo();
  execSync("git checkout -q -b hostile main", { cwd: repo });
  const names = ["$(touch PWNED).txt", "a\nb.txt", "it's.txt", "-rf.txt", "[id].tsx", "sp ace.md"];
  for (const n of names) writeFileSync(path.join(repo, n), `text of ${JSON.stringify(n)}\n`);
  execSync("ln -s /etc/hosts link", { cwd: repo });
  writeFileSync(path.join(repo, "bin.dat"), Buffer.from([0x50, 0, 0xff, 0x0a]));
  writeFileSync(path.join(repo, "README.md"), "# fixture, changed\n");
  const head = commitAll(repo, "hostile head");
  publishPullRef(repo, 15, "hostile");
  const base = execSync("git rev-parse main", { cwd: repo, encoding: "utf8" }).trim();
  const remote = execSync("git remote get-url origin", { cwd: repo, encoding: "utf8" }).trim();
  const clone = workspaceMkdtemp("clone-");
  execSync(`git clone -q --no-local "${remote}" "${clone}"`, { stdio: "pipe" });
  assert.equal(fetchPRCommits(clone, { baseSha: base, headSha: head }).halt, null);
  return { clone, base, head, names };
}

test("writeReviewDir: hostile names arrive as data, texts as plain numbered files, nothing runs", () => {
  const { clone, base, head, names } = hostilePR();
  const before = readdirSync(clone).sort();
  const rd = writeReviewDir(clone, base, head);
  try {
    // A fresh owner-only folder in the temp directory, outside the repository.
    assert.equal(path.dirname(rd.path), realpathSync(tmpdir()));
    assert.ok(path.basename(rd.path).startsWith(REVIEW_DIR_PREFIX));
    assert.equal(statSync(rd.path).mode & 0o777, 0o700);
    assert.equal(rd.path.startsWith(realpathSync(clone)), false);

    const index = JSON.parse(readFileSync(rd.index, "utf8"));
    assert.equal(index.head, head);
    const byPath = new Map(index.files.map((f: { path: string }) => [f.path, f]));
    for (const n of names) {
      const f = byPath.get(n) as { head: string; base: string | null; status: string };
      assert.ok(f, `index lists ${JSON.stringify(n)} verbatim`);
      assert.equal(f.status, "A");
      assert.equal(f.base, null);
      assert.match(f.head, /^files\/\d+\.head$/);
      assert.equal(readFileSync(path.join(rd.path, f.head), "utf8"), `text of ${JSON.stringify(n)}\n`);
    }
    const link = byPath.get("link") as { head: string; symlink: boolean; headMode: string };
    assert.equal(link.symlink, true);
    assert.equal(link.headMode, "120000");
    assert.equal(lstatSync(path.join(rd.path, link.head)).isSymbolicLink(), false, "a link is written as its target's text");
    assert.equal(readFileSync(path.join(rd.path, link.head), "utf8"), "/etc/hosts");
    const bin = byPath.get("bin.dat") as { head: string; binary: boolean };
    assert.equal(bin.binary, true);
    assert.deepEqual([...readFileSync(path.join(rd.path, bin.head))], [0x50, 0, 0xff, 0x0a]);
    const readme = byPath.get("README.md") as { status: string; head: string; base: string };
    assert.equal(readme.status, "M");
    assert.equal(readFileSync(path.join(rd.path, readme.base), "utf8"), "# fixture\n");
    assert.match(readFileSync(rd.diff, "utf8"), /# fixture, changed/);

    // Every file in the folder has a name compute.ts chose, and none is executable.
    for (const f of readdirSync(path.join(rd.path, "files"))) {
      assert.match(f, /^\d+\.(head|base)$/);
      assert.equal(statSync(path.join(rd.path, "files", f)).mode & 0o111, 0);
    }
    // Nothing the names spell ran: no PWNED anywhere, and the clone's working tree is untouched.
    for (const where of [process.cwd(), clone, rd.path, path.join(rd.path, "files"), FIXTURE_ROOT]) {
      assert.equal(existsSync(path.join(where, "PWNED")), false, where);
    }
    assert.deepEqual(readdirSync(clone).sort(), before);
  } finally {
    cleanupReviewDir(rd.path);
  }
  assert.equal(existsSync(rd.path), false, "cleanup deletes the folder");
});

test("writeReviewDir: a failure part-way leaves no folder behind", () => {
  const { clone, base } = hostilePR();
  const listReviewDirs = () => readdirSync(realpathSync(tmpdir())).filter((n) => n.startsWith(REVIEW_DIR_PREFIX)).sort();
  const before = listReviewDirs();
  assert.throws(() => writeReviewDir(clone, base, "0".repeat(40))); // a head this clone does not have
  assert.deepEqual(listReviewDirs(), before);
});

test("cleanupReviewDir: deletes only a review folder this script made", () => {
  const { clone, base, head } = hostilePR();
  const bare = mkdtempSync(path.join(tmpdir(), REVIEW_DIR_PREFIX)); // the prefix, no index
  const other = mkdtempSync(path.join(tmpdir(), "not-a-review-"));
  writeFileSync(path.join(other, "index.json"), '{"prReview":3}');
  const inside = path.join(clone, `${REVIEW_DIR_PREFIX}x`);
  mkdirSync(inside);
  writeFileSync(path.join(inside, "index.json"), '{"prReview":3}');
  try {
    for (const dir of [bare, other, inside, clone, tmpdir(), path.join(tmpdir(), `${REVIEW_DIR_PREFIX}absent`)]) {
      assert.throws(() => cleanupReviewDir(dir), /refusing to delete|no review folder/, dir);
      if (dir !== path.join(tmpdir(), `${REVIEW_DIR_PREFIX}absent`)) assert.equal(existsSync(dir), true, dir);
    }
    const rd = writeReviewDir(clone, base, head);
    cleanupReviewDir(rd.path);
    assert.equal(existsSync(rd.path), false);
  } finally {
    rmSync(bare, { recursive: true, force: true });
    rmSync(other, { recursive: true, force: true });
  }
});

test("parseArgs: --output-path is refused — compute.ts runs pre-approved and writes nowhere but its folder", () => {
  assert.throws(() => parseArgs(["42", "--output-path", "/tmp/out.json"]), /--output-path was removed/);
});

test("writeReviewDir: names that are not valid UTF-8 keep their own texts", () => {
  const repo = createFixtureRepo();
  // Built from git objects: a filesystem (APFS) may refuse such names, and a PR's tree need not come from one.
  const git = (args: string[], input?: Buffer | string) =>
    execFileSync("git", args, { cwd: repo, input, stdio: ["pipe", "pipe", "pipe"] });
  const blob = (text: string) => git(["hash-object", "-w", "--stdin"], text).toString().trim();
  const entry = (oid: string, name: Buffer) =>
    Buffer.concat([Buffer.from(`100644 blob ${oid}\t`), name, Buffer.from([0])]);
  const tree = git(["mktree", "-z"], Buffer.concat([
    git(["ls-tree", "-z", "main"]),
    entry(blob("MALICIOUS\n"), Buffer.from([0x78, 0xfe, 0x2e, 0x6a, 0x73])), // x\xfe.js
    entry(blob("benign\n"), Buffer.from([0x78, 0xff, 0x2e, 0x6a, 0x73])), // x\xff.js
  ])).toString().trim();
  const head = git(["-c", "user.email=t@example.com", "-c", "user.name=T", "commit-tree", tree, "-p", "main", "-m", "bytes"]).toString().trim();
  const base = git(["rev-parse", "main"]).toString().trim();
  const rd = writeReviewDir(repo, base, head);
  try {
    const odd = rd.files.filter((f) => f.pathNotUtf8);
    assert.equal(odd.length, 2);
    const texts = odd.map((f) => readFileSync(path.join(rd.path, f.head!), "utf8")).sort();
    assert.deepEqual(texts, ["MALICIOUS\n", "benign\n"]);
  } finally {
    cleanupReviewDir(rd.path);
  }
});

test("writeReviewDir: one blob behind many paths writes no more than the limits allow", () => {
  const repo = createFixtureRepo();
  execSync("git checkout -q -b many main", { cwd: repo });
  const big = Buffer.alloc(2 * 1024 * 1024 - 1, 0x61); // just under the per-file limit
  for (let i = 0; i < 40; i++) writeFileSync(path.join(repo, `copy-${i}.txt`), big);
  const head = commitAll(repo, "many copies of one blob");
  const base = execSync("git rev-parse main", { cwd: repo, encoding: "utf8" }).trim();
  const rd = writeReviewDir(repo, base, head);
  try {
    const bytes = readdirSync(path.join(rd.path, "files")).reduce((t, f) => t + statSync(path.join(rd.path, "files", f)).size, 0);
    assert.ok(bytes <= 64 * 1024 * 1024, `wrote ${bytes} bytes`);
    assert.equal(rd.truncated, true);
    assert.ok(rd.files.some((f) => f.tooLarge && f.head === null));
    assert.equal(rd.files.length, 40, "every changed name is still listed");
  } finally {
    cleanupReviewDir(rd.path);
  }
});

test("writeReviewDir: base texts come from the merge-base, not the base branch's later commits", () => {
  const repo = createFixtureRepo();
  execSync("git checkout -q -b forked main", { cwd: repo });
  writeFileSync(path.join(repo, "README.md"), "# fixture, by the PR\n");
  const head = commitAll(repo, "pr edits README");
  execSync("git checkout -q main", { cwd: repo });
  writeFileSync(path.join(repo, "README.md"), "# fixture, main moved on\n");
  const base = commitAll(repo, "main edits README after the fork");
  const rd = writeReviewDir(repo, base, head);
  try {
    const readme = rd.files.find((f) => f.path === "README.md")!;
    assert.equal(readFileSync(path.join(rd.path, readme.base!), "utf8"), "# fixture\n");
    assert.match(readFileSync(rd.diff, "utf8"), /^-# fixture$/m);
    assert.equal(rd.mergeBase, execSync(`git merge-base ${base} ${head}`, { cwd: repo, encoding: "utf8" }).trim());
  } finally {
    cleanupReviewDir(rd.path);
  }
});

test("parseArgs: --cleanup takes the folder; without one it is an error", () => {
  assert.equal(parseArgs(["--cleanup", "/tmp/pr-review-abc"]).cleanup, "/tmp/pr-review-abc");
  assert.throws(() => parseArgs(["--cleanup"]), /needs the review folder/);
});

test("resolveHeadReviewed: the head gh reported, flagged when GitHub moved on before the diff was read", () => {
  assert.deepEqual(resolveHeadReviewed("aaa", "aaa"), { sha: "aaa", moved: false });
  assert.deepEqual(resolveHeadReviewed("aaa", "bbb"), { sha: "aaa", moved: true });
  assert.deepEqual(resolveHeadReviewed("aaa", ""), { sha: "aaa", moved: false }); // unknown is not a move
});

test("runGit: hooks never run, even with a relative core.hooksPath", () => {
  const repo = createFixtureRepo();
  mkdirSync(path.join(repo, ".hooks"), { recursive: true });
  const marker = path.join(repo, "..", `hook-ran-${path.basename(repo)}`);
  writeFileSync(path.join(repo, ".hooks", "reference-transaction"), `#!/bin/sh\ntouch "${marker}"\n`, { mode: 0o755 });
  execSync("git add .hooks && git commit -q -m hooks && git config core.hooksPath .hooks", { cwd: repo, stdio: "pipe" });
  publishPullRef(repo, 4, "feature/x");
  execSync("git fetch -q origin refs/pull/4/head:refs/remotes/origin/pr-a", { cwd: repo, stdio: "pipe" });
  assert.equal(existsSync(marker), true, "fixture: the hook runs under plain git");
  rmSync(marker);
  runGit(["fetch", "-q", "origin", "refs/pull/4/head:refs/remotes/origin/pr-b"], repo);
  assert.equal(existsSync(marker), false);
});

