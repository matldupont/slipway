#!/usr/bin/env -S npx tsx
/**
 * PR review feature extractor.
 *
 * Deterministically resolves PR identity, the PR's head and base commits
 * (fetched as objects into this clone, never checked out), linked GitHub
 * issue lookup, readiness signals, and slipway-repo context for a GitHub
 * pull request. Emits JSON on stdout (or to --output-path).
 *
 * Nothing from the PR is ever a working tree. compute.ts is the one place
 * that reads the PR's files: it writes the pinned diff and each changed
 * file's head and base text to a fresh review folder outside the repo, under
 * numbered names with an index (`reviewDir`). Reviewers read that folder with
 * their Read and Grep tools; no command they run carries the author's text.
 * `--cleanup <reviewDir.path>` deletes it at the end of the review.
 *
 * Usage:
 *   node <script-path>/compute.ts [<pr-url-or-number-or-branch>] [options]
 *   bun <script-path>/compute.ts [<pr-url-or-number-or-branch>] [options]
 *   npx tsx <script-path>/compute.ts [<pr-url-or-number-or-branch>] [options]
 *
 * Omit the positional argument to resolve the PR for the current branch
 * (via `gh pr view` with no ref — same as running `gh pr view` yourself).
 *
 * Options:
 *   --project-path <owner/repo>       GitHub repo; defaults to detection from origin
 *   --output-path <file>              Write JSON to file instead of stdout
 *   --skip-ticket                     Don't attempt linked-issue fetch (still extract the number)
 *   --tone {casual|formal}            Tone hint for downstream rendering (default: casual)
 *   --issue-repo <owner/repo>         The configured Issue repo: the one other repo a linked issue may come from
 *   --invariants <path|none>          Domain invariants doc (default: docs/domain-invariants.md)
 *   --milestones <dir|none>           Milestones folder (default: docs/milestones)
 *   --cold-review <path|none>         Cold-review checklist (default: process/cold-review.md)
 *                                     `none` turns that input off; it never falls back to the default.
 *   --verbose                         Diagnostic logs to stderr (includes swallowed gh/git stderr)
 *   --cleanup <dir>                   Delete a review folder this script made, and exit
 *
 * Environment:
 *   GH_HOST                 GitHub host for `gh` (e.g. github.example.com, for GitHub Enterprise)
 *
 * Requirements:
 *   - `gh` (authenticated) and `git` on PATH
 *   - Node 18+ OR bun
 *   - No npm/bun runtime dependencies — Node stdlib only
 */

import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, sep } from "node:path";

// ============================================================================
// Output types
// ============================================================================

export interface PRMetadata {
  number: number;
  url: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  /** Head commit SHA — carried for the `## Cold review` output mode's "head sha reviewed" line. */
  headSha: string;
  /** The base commit GitHub reports (baseRefOid): where the review's bar is read from. */
  baseSha: string;
  author: { username: string };
  /** "owner/repo". */
  projectPath: string;
  /** GitHub's mergeStateStatus: BEHIND | BLOCKED | CLEAN | DIRTY | DRAFT | HAS_HOOKS | UNKNOWN | UNSTABLE. */
  mergeStateStatus: string;
  /** GitHub's mergeable: MERGEABLE | CONFLICTING | UNKNOWN. */
  mergeable: string;
  draft: boolean;
}

/**
 * The commit this review reads: the head `gh pr view` reported, fetched into
 * this clone so `git show <sha>:<path>` reads its files. `moved` is true when
 * the PR's head had changed by the time the diff was read, so the metadata
 * and the diff may describe different commits.
 */
export interface HeadReviewed {
  sha: string;
  moved: boolean;
}

export type TicketSource = "closingIssuesReferences" | "body";

export interface IssueTicket {
  number: number;
  identifier: string;
  url: string;
  title: string;
  description: string;
  state: string;
  parentIdentifier: string | null;
  source: TicketSource;
  /** Raw text of the issue body's "Acceptance" section (issue-form shape), if present. */
  acceptance: string | null;
  /** Raw text of an embedded feature-doc "Contract" section, if present. */
  contract: string | null;
  /** Raw text of an embedded feature-doc "Verify" section, if present. */
  verify: string | null;
}

export interface IssueLookupFailure {
  extractedNumber: number | null;
  source: TicketSource | null;
  /** The repository the reference named, when not the PR's own. */
  extractedRepo?: string | null;
  reason: "no_id_found" | "skipped" | "issue_not_found" | "api_error" | "repo_not_allowed";
  errorMessage?: string;
}

/** Inclusive `[start, end]` line range. */
export type LineRange = [number, number];

export interface DiffStats {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  /**
   * Post-image line ranges this PR added or modified, keyed by new path.
   * A finding anchored outside these ranges is pre-existing code the diff
   * only happens to sit near — reading the file at HEAD cannot tell the
   * two apart, which is the whole reason this index exists.
   */
  changedLines: Record<string, LineRange[]>;
  /**
   * Pre-image line ranges this PR deleted, keyed by old path. Findings
   * about removed code (a dropped guard clause, a deleted test) have no
   * post-image anchor and would fail the `changedLines` check despite
   * being real, so they cite these instead.
   */
  removedHunks: Record<string, LineRange[]>;
}

export type ReadinessCheck =
  | "mergeable"
  | "checks"
  | "draft"
  | "description"
  | "unresolved_threads"
  | "head_moved";

export interface ReadinessBlocker {
  check: ReadinessCheck;
  severity: "HIGH" | "MEDIUM";
  detail: string;
}

export interface UnresolvedThread {
  id: string;
  author: string;
  /**
   * Full comment body. Judging "has this been addressed?" from a truncated
   * excerpt is how a thread gets credited as resolved and its substance
   * re-raised as a fresh finding in the same review — always read this.
   */
  body: string;
  /** First 200 chars. For one-line brief and log output only. */
  bodyExcerpt: string;
  filePath: string | null;
  createdAt: string;
}

export interface ReadinessSignals {
  passed: boolean;
  blockers: ReadinessBlocker[];
}

export interface RequiredChecksSummary {
  failing: string[];
  pending: string[];
  passing: string[];
}

export interface SlipwayInvariant {
  id: string;
  invariant: string;
  enforcedBy: string;
}

export interface SlipwayMilestone {
  path: string;
  id: string | null;
  status: string | null;
  noGos: string[];
}

export interface SlipwayContext {
  /** True when the repo carries slipway markers (cold-review checklist, domain invariants, or a milestones dir). */
  present: boolean;
  /**
   * The base commit the markers were read from — never the PR's head, so the
   * PR cannot lower its own bar. null when the base could not be fetched: the
   * markers then read as absent, and the review must say so.
   */
  readFrom: string | null;
  /** Parsed from a `Lane: trivial|bounded|feature` line in the PR body. */
  lane: "trivial" | "bounded" | "feature" | null;
  /** Raw text of the PR body's "## Verification" section, if present. */
  verificationSection: string | null;
  /** True when the cold-review checklist exists AND the diff touches a money/auth/schema/deletion path — always 3 lenses. */
  coldReviewApplies: boolean;
  coldReviewChecklistPath: string | null;
  domainInvariants: SlipwayInvariant[];
  /** IDs of invariants whose `enforcedBy` path was touched by a removed hunk in this diff. */
  invariantsAtRisk: string[];
  activeMilestones: SlipwayMilestone[];
}

export interface HardHalt {
  reason:
    | "pr_not_found"
    | "empty_diff"
    | "no_description_no_ticket"
    | "base_unreadable"
    | "head_unreadable"
    | "running_in_pr_checkout";
  detail: string;
}

export type Tone = "casual" | "formal";
export type ReviewMode = "self" | "peer";

export interface FeatureOutput {
  schemaVersion: 3;
  /** Tone the calling skill should use when rendering human output. */
  tone: Tone;
  /**
   * Whose PR this is. "self" flips what the review is for: nits become worth
   * surfacing because acting on them costs nobody else anything, and there is
   * no one to post inline comments to. "peer" is the fallback on any doubt.
   */
  reviewMode: ReviewMode;
  /**
   * `pr` is null only when `hardHalt.reason === "pr_not_found"`; otherwise
   * always populated.
   */
  pr: PRMetadata | null;
  ticket: IssueTicket | null;
  ticketLookupFailure: IssueLookupFailure | null;
  diff: DiffStats;
  /**
   * True when `gh` failed while fetching the diff. The `diff` numbers are
   * zeroed-out in that case and should NOT be trusted for subagent sizing —
   * fall back to line-count heuristics or warn the user.
   */
  diffFetchFailed: boolean;
  checks: RequiredChecksSummary;
  readiness: ReadinessSignals;
  unresolvedThreads: UnresolvedThread[];
  slipway: SlipwayContext;
  /** null only when `pr` is null. */
  headReviewed: HeadReviewed | null;
  /** The review folder the reviewers read; null when the review halts. */
  reviewDir: ReviewDir | null;
  hardHalt: HardHalt | null;
}

export function isFeatureOutput(value: unknown): value is FeatureOutput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 3 &&
    (v.tone === "casual" || v.tone === "formal") &&
    (v.pr === null || typeof v.pr === "object") &&
    typeof v.diff === "object" &&
    typeof v.diffFetchFailed === "boolean" &&
    typeof v.checks === "object" &&
    typeof v.readiness === "object" &&
    Array.isArray(v.unresolvedThreads) &&
    typeof v.slipway === "object" &&
    typeof v.reviewDir === "object"
  );
}

// ============================================================================
// CLI args
// ============================================================================

/**
 * Where the slipway inputs live, relative to the checkout. null turns that
 * input off (the owner's configuration said `none`).
 */
export interface SlipwayPaths {
  invariants: string | null;
  milestones: string | null;
  coldReview: string | null;
}

export const DEFAULT_SLIPWAY_PATHS: SlipwayPaths = {
  invariants: "docs/domain-invariants.md",
  milestones: "docs/milestones",
  coldReview: "process/cold-review.md",
};

interface CLIOptions {
  /** null means "resolve the PR for the current branch". */
  prInput: string | null;
  projectPath: string | null;
  /** The configured Issue repo; with the PR's own, the only repos a linked issue is loaded from. */
  issueRepo: string | null;
  slipwayPaths: SlipwayPaths;
  outputPath: string | null;
  skipTicket: boolean;
  verbose: boolean;
  tone: Tone;
  /** Set by --cleanup: delete this review folder and exit. */
  cleanup: string | null;
}

/** Why a checkout is refused, and what replaces it. */
export const NO_CHECKOUT =
  "the review never checks the PR out, so there is no worktree: compute.ts writes the diff and " +
  "each changed file's head and base text to reviewDir (read with the Read and Grep tools), " +
  "using git show on headReviewed.sha and pr.baseSha as objects";

export function parseArgs(argv: string[]): CLIOptions {
  const opts: CLIOptions = {
    prInput: null,
    projectPath: null,
    issueRepo: null,
    slipwayPaths: { ...DEFAULT_SLIPWAY_PATHS },
    outputPath: null,
    skipTicket: false,
    verbose: false,
    tone: "casual",
    cleanup: null,
  };
  let i = 0;
  if (argv.length > 0 && !argv[0].startsWith("--")) {
    opts.prInput = argv[0];
    i = 1;
  }
  for (; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--project-path":
        opts.projectPath = argv[++i] ?? null;
        break;
      case "--worktree":
      case "--worktree-dir":
        throw new Error(`${arg} was removed: ${NO_CHECKOUT}`);
      case "--issue-repo": {
        const v = argv[++i];
        if (!v || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v)) {
          throw new Error(`--issue-repo must be owner/repo (got '${v ?? ""}')`);
        }
        opts.issueRepo = v;
        break;
      }
      case "--invariants":
        opts.slipwayPaths.invariants = parseSlipwayPath(arg, argv[++i]);
        break;
      case "--milestones":
        opts.slipwayPaths.milestones = parseSlipwayPath(arg, argv[++i]);
        break;
      case "--cold-review":
        opts.slipwayPaths.coldReview = parseSlipwayPath(arg, argv[++i]);
        break;
      case "--cleanup": {
        const v = argv[++i];
        if (!v || v.startsWith("--")) throw new Error("--cleanup needs the review folder's path");
        opts.cleanup = v;
        break;
      }
      case "--output-path":
        opts.outputPath = argv[++i] ?? null;
        break;
      case "--skip-ticket":
        opts.skipTicket = true;
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      case "--tone": {
        const v = argv[++i];
        if (v !== "casual" && v !== "formal") {
          throw new Error(`--tone must be 'casual' or 'formal' (got '${v}')`);
        }
        opts.tone = v;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

/**
 * A configured slipway path: `none` turns the input off (null), anything else
 * must be a relative path that stays inside the checkout. A missing value is
 * an error, never the default — a flag given empty must not read the file the
 * owner turned off.
 */
export function parseSlipwayPath(flag: string, value: string | undefined): string | null {
  if (value === undefined || value.trim() === "" || value.startsWith("--")) {
    throw new Error(`${flag} needs a path or 'none'`);
  }
  const v = value.trim();
  if (v.toLowerCase() === "none") return null;
  if (v.startsWith("/") || /^[A-Za-z]:/.test(v) || v.split(/[\\/]/).includes("..")) {
    throw new Error(`${flag} must be a path inside the repository (got '${v}')`);
  }
  return v.replace(/\/+$/, "");
}

function logVerbose(opts: { verbose: boolean }, msg: string): void {
  if (opts.verbose) process.stderr.write(`[pr-review] ${msg}\n`);
}

// ============================================================================
// gh / git wrappers
// ============================================================================

// Verbose channel set by main() so tryRun* helpers can report swallowed errors.
let verboseLog: ((msg: string) => void) | null = null;
export function _setVerboseLog(fn: ((msg: string) => void) | null): void {
  verboseLog = fn;
}

/**
 * Hooks are off for every git call: a relative core.hooksPath (husky,
 * lefthook) runs whatever the working tree holds, with the reviewer's token.
 */
export const GIT_SAFE_ARGS = ["-c", "core.hooksPath=/dev/null"];

/**
 * The only git commands compute.ts runs: each reads objects or refs, fetches
 * them, or compares the reviewer's own checkout with the base. Nothing that
 * writes or adds a working tree (checkout, switch, reset, restore, clone,
 * merge, stash…) is on it, so no code path can put the PR's files on disk.
 */
export const GIT_ALLOWED = new Set(["rev-parse", "fetch", "ls-tree", "cat-file", "diff", "status", "remote"]);

/**
 * Every git call goes through here: an argv array (no shell), an allowed
 * command, hooks off. Raw bytes, so a blob's content is never re-encoded.
 */
function execGit(args: string[], cwd?: string): Buffer {
  if (!GIT_ALLOWED.has(args[0] ?? "")) {
    throw new Error(`git ${args[0] ?? "(none)"} is not run here: ${NO_CHECKOUT}`);
  }
  return execFileSync("git", [...GIT_SAFE_ARGS, ...args], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 512 * 1024 * 1024,
  });
}

export function runGit(args: string[], cwd?: string): string {
  return execGit(args, cwd).toString("utf8").trim();
}

function tryRunGit(args: string[], cwd?: string): string {
  try {
    return runGit(args, cwd);
  } catch (err) {
    if (verboseLog) {
      const msg = err instanceof Error ? err.message : String(err);
      verboseLog(`git ${args.join(" ")} failed: ${msg.split("\n")[0]}`);
    }
    return "";
  }
}

export class GhNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GhNotFoundError";
  }
}

/**
 * The only gh commands compute.ts runs: reads of the PR, its checks and its
 * issue, and the API reads. `gh pr checkout`, `gh repo clone` and the like
 * run git checkout underneath, so they are not on it.
 */
export const GH_ALLOWED = new Set(["pr view", "pr diff", "pr checks", "issue view", "api"]);

function assertGhAllowed(args: string[]): void {
  const cmd = args[0] === "api" ? "api" : `${args[0] ?? ""} ${args[1] ?? ""}`;
  if (!GH_ALLOWED.has(cmd)) {
    throw new Error(`gh ${cmd.trim() || "(none)"} is not run here: ${NO_CHECKOUT}`);
  }
}

/** Every gh call goes through here, checked against GH_ALLOWED first. */
function execGh(args: string[]): string {
  assertGhAllowed(args);
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function runGh(args: string[]): string {
  try {
    return execGh(args);
  } catch (err) {
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((err as { stderr: unknown }).stderr ?? "")
        : "";
    if (/404|not found|could not resolve/i.test(stderr)) {
      throw new GhNotFoundError(stderr.trim() || "gh returned not-found");
    }
    throw err;
  }
}

function tryRunGh(args: string[]): string {
  try {
    return runGh(args);
  } catch (err) {
    if (verboseLog) {
      const msg = err instanceof Error ? err.message : String(err);
      verboseLog(`gh ${args.join(" ")} failed: ${msg.split("\n")[0]}`);
    }
    return "";
  }
}

/**
 * `gh pr checks` exits non-zero for pending (8) or failing (1) checks, but
 * still writes the JSON array to stdout — unlike a real failure, that output
 * is the answer, not noise to discard.
 */
function runGhAllowNonZero(args: string[]): string {
  assertGhAllowed(args); // outside the try: a refusal is never read as empty output
  try {
    return execGh(args);
  } catch (err) {
    const stdout =
      err && typeof err === "object" && "stdout" in err
        ? String((err as { stdout: unknown }).stdout ?? "")
        : "";
    return stdout;
  }
}

/**
 * Compares the PR author against the authenticated user.
 *
 * Falls back to "peer" whenever the current user can't be determined. That
 * direction is deliberate: "peer" keeps the social bar on and suppresses
 * nits, so an unknown degrades into the quieter review rather than the one
 * that spends a colleague's attention.
 */
export function detectReviewMode(
  authorUsername: string,
  fetchUser: () => string = () => tryRunGh(["api", "user", "--jq", ".login"]),
): ReviewMode {
  const raw = fetchUser().trim();
  if (!raw) return "peer";
  return raw.toLowerCase() === authorUsername.toLowerCase() ? "self" : "peer";
}

// ============================================================================
// PR resolution
// ============================================================================

/** Extract the PR number from a GitHub PR URL like .../owner/repo/pull/123 */
export function extractPrNumberFromUrl(input: string): number | null {
  const m = input.match(/\/pull\/(\d+)(?:[?#/].*)?$/);
  return m ? Number(m[1]) : null;
}

/** Parse "https://github.com/owner/repo/pull/123" → "owner/repo" */
export function projectPathFromUrl(url: string): string | null {
  const m = url.match(/^https?:\/\/[^/]+\/(.+?)\/pull\/\d+/);
  return m ? m[1] : null;
}

/**
 * Detect "owner/repo" from `git remote get-url origin`. Handles all three
 * remote URL shapes:
 *   - https://host/owner/repo(.git)?
 *   - ssh://git@host[:port]/owner/repo(.git)?
 *   - git@host:owner/repo(.git)?
 */
export function projectPathFromOrigin(cwd?: string): string | null {
  const url = tryRunGit(["remote", "get-url", "origin"], cwd);
  if (!url) return null;
  return projectPathFromRemoteUrl(url);
}

export function projectPathFromRemoteUrl(url: string): string | null {
  let rest: string;
  if (url.startsWith("https://") || url.startsWith("http://")) {
    const m = url.match(/^https?:\/\/[^/]+\/(.+?)(?:\.git)?\/?$/);
    if (!m) return null;
    rest = m[1];
  } else if (url.startsWith("ssh://")) {
    const m = url.match(/^ssh:\/\/[^/]+\/(.+?)(?:\.git)?\/?$/);
    if (!m) return null;
    rest = m[1];
  } else {
    const m = url.match(/^[^@]+@[^:]+:(.+?)(?:\.git)?\/?$/);
    if (!m) return null;
    rest = m[1];
  }
  if (!rest.includes("/")) return null;
  return rest;
}

export interface ResolvedInput {
  /** What to pass as `gh pr view`'s positional ref — null means "current branch". */
  prRef: string | null;
  projectPath: string | null;
}

export function resolvePRInput(
  input: string | null,
  projectPathOverride: string | null,
  cwd?: string,
): ResolvedInput {
  if (input === null) {
    return { prRef: null, projectPath: projectPathOverride ?? projectPathFromOrigin(cwd) };
  }

  const urlNumber = extractPrNumberFromUrl(input);
  if (urlNumber !== null) {
    const projectPath =
      projectPathOverride ?? projectPathFromUrl(input) ?? projectPathFromOrigin(cwd);
    return { prRef: input, projectPath };
  }

  // Bare number or an explicit branch name: `gh pr view` resolves either
  // directly, but needs to know which repo unless cwd is already inside it.
  const projectPath = projectPathOverride ?? projectPathFromOrigin(cwd);
  if (!projectPath) {
    throw new Error(
      "Could not determine project path from origin remote. Pass --project-path.",
    );
  }
  return { prRef: input, projectPath };
}

interface RawPR {
  number: number;
  url: string;
  title: string;
  body: string | null;
  headRefName: string;
  baseRefName: string;
  headRefOid: string;
  baseRefOid?: string;
  author: { login: string } | null;
  isDraft?: boolean;
  mergeable?: string;
  mergeStateStatus?: string;
}

/**
 * Fetches PR metadata. Returns `null` when `gh` reports the PR doesn't
 * exist — callers convert this into a `HardHalt`. Throws for other `gh`
 * failures (auth, network, etc.).
 */
/**
 * `-R owner/repo` for a gh call about the PR. A full URL already encodes
 * owner/repo; passing -R too is redundant and, on some gh versions, rejected
 * as conflicting.
 */
function ghRepoArgs(prRef: string | null, projectPath: string | null): string[] {
  const isUrl = prRef !== null && extractPrNumberFromUrl(prRef) !== null;
  return projectPath && !isUrl ? ["-R", projectPath] : [];
}

export function fetchPRMetadata(
  prRef: string | null,
  projectPath: string | null,
): PRMetadata | null {
  const args = ["pr", "view"];
  if (prRef !== null) args.push(prRef);
  args.push(...ghRepoArgs(prRef, projectPath));
  args.push(
    "--json",
    "number,url,title,body,headRefName,baseRefName,headRefOid,baseRefOid,author,isDraft,mergeable,mergeStateStatus",
  );

  let raw: string;
  try {
    raw = runGh(args);
  } catch (err) {
    if (err instanceof GhNotFoundError) return null;
    throw new Error(
      `gh pr view failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  let parsed: RawPR;
  try {
    parsed = JSON.parse(raw) as RawPR;
  } catch {
    throw new Error("gh pr view returned non-JSON");
  }
  return {
    number: parsed.number,
    url: parsed.url,
    title: parsed.title,
    description: parsed.body ?? "",
    sourceBranch: parsed.headRefName,
    targetBranch: parsed.baseRefName,
    headSha: parsed.headRefOid,
    baseSha: parsed.baseRefOid ?? "",
    author: { username: parsed.author?.login ?? "unknown" },
    projectPath: projectPath ?? projectPathFromUrl(parsed.url) ?? "unknown/unknown",
    mergeStateStatus: parsed.mergeStateStatus ?? "UNKNOWN",
    mergeable: parsed.mergeable ?? "UNKNOWN",
    draft: parsed.isDraft ?? false,
  };
}

// ============================================================================
// The review folder: the one place the PR's files are read
// ============================================================================

export interface ReviewFile {
  /** The number its texts are filed under: files/<n>.head, files/<n>.base. */
  n: number;
  /** The author's name for the file: data, never put into a command. */
  path: string;
  /** A added, D deleted, M modified, T type changed. */
  status: string;
  /** Relative to the review folder; null when the file is absent on that side or has no text. */
  head: string | null;
  base: string | null;
  headMode: string | null;
  baseMode: string | null;
  /** Mode 120000 on either side: the text is the link's target, never followed. */
  symlink: boolean;
  /** A NUL byte in the first 8000 bytes of either side. */
  binary: boolean;
  /** Over MAX_REVIEW_FILE_BYTES on a side: that side's text is not written. */
  tooLarge: boolean;
}

export interface ReviewDir {
  /** A fresh folder outside the repository, owner-only (0700). */
  path: string;
  /** index.json: the head, the base and every changed file, as data. */
  index: string;
  /** diff.patch: `git diff <base>...<head>`, pinned to headReviewed.sha. */
  diff: string;
  files: ReviewFile[];
}

export const REVIEW_DIR_PREFIX = "pr-review-";
export const MAX_REVIEW_FILE_BYTES = 2 * 1024 * 1024;

/** `git ls-tree -r -z` of a whole commit: path → mode and object id. No path is passed. */
export function readTree(repoRoot: string, commit: string): Map<string, { mode: string; oid: string }> {
  const out = execGit(["ls-tree", "-r", "-z", "--full-tree", commit], repoRoot).toString("utf8");
  const tree = new Map<string, { mode: string; oid: string }>();
  for (const entry of out.split("\0")) {
    if (!entry) continue;
    const tab = entry.indexOf("\t");
    const [mode, , oid] = entry.slice(0, tab).split(" ");
    tree.set(entry.slice(tab + 1), { mode, oid });
  }
  return tree;
}

/** `git diff --name-status -z <base>...<head>`: the changed paths, NUL-separated, never re-quoted. */
export function readChangedPaths(repoRoot: string, base: string, head: string): { status: string; path: string }[] {
  const out = execGit(
    ["diff", "--name-status", "-z", "--no-renames", "--no-ext-diff", "--no-textconv", `${base}...${head}`],
    repoRoot,
  ).toString("utf8");
  const parts = out.split("\0");
  const changed: { status: string; path: string }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    if (parts[i]) changed.push({ status: parts[i], path: parts[i + 1] });
  }
  return changed;
}

function isInsideDir(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

/**
 * Writes the review folder: a fresh owner-only folder in the system temp
 * directory, never inside the repository. Only commit and object ids reach
 * git; every path the author chose arrives on stdout, NUL-separated, and
 * leaves only as a JSON string in index.json. Texts are written as plain
 * files under numbered names, so no name, link or mode the PR chose
 * reaches the disk.
 */
export function writeReviewDir(repoRoot: string, base: string, head: string): ReviewDir {
  const root = realpathSync(tmpdir());
  const repo = realpathSync(repoRoot);
  if (isInsideDir(repo, root)) {
    throw new Error(`the temp directory ${root} is inside the repository; set TMPDIR outside it`);
  }
  const dir = mkdtempSync(join(root, REVIEW_DIR_PREFIX));
  chmodSync(dir, 0o700);
  mkdirSync(join(dir, "files"), { mode: 0o700 });

  const headTree = readTree(repoRoot, head);
  const baseTree = readTree(repoRoot, base);
  const files: ReviewFile[] = readChangedPaths(repoRoot, base, head).map(({ status, path }, i) => {
    const n = i + 1;
    const file: ReviewFile = {
      n, path, status, head: null, base: null, headMode: null, baseMode: null,
      symlink: false, binary: false, tooLarge: false,
    };
    for (const side of ["head", "base"] as const) {
      const entry = (side === "head" ? headTree : baseTree).get(path);
      if (!entry) continue;
      file[`${side}Mode`] = entry.mode;
      if (entry.mode === "120000") file.symlink = true;
      if (!/^1[02]0[0-7]{3}$/.test(entry.mode)) continue; // a submodule's commit: no text
      const blob = execGit(["cat-file", "blob", entry.oid], repoRoot);
      if (blob.length > MAX_REVIEW_FILE_BYTES) {
        file.tooLarge = true;
        continue;
      }
      if (blob.subarray(0, 8000).includes(0)) file.binary = true;
      const rel = `files/${n}.${side}`;
      writeFileSync(join(dir, rel), blob, { mode: 0o600 });
      file[side] = rel;
    }
    return file;
  });

  const patch = execGit(["diff", "--no-ext-diff", "--no-textconv", "--no-color", `${base}...${head}`], repoRoot);
  writeFileSync(join(dir, "diff.patch"), patch, { mode: 0o600 });
  const index = { prReview: 3, head, base, files };
  writeFileSync(join(dir, "index.json"), JSON.stringify(index, null, 2) + "\n", { mode: 0o600 });
  return { path: dir, index: join(dir, "index.json"), diff: join(dir, "diff.patch"), files };
}

/**
 * Deletes a review folder writeReviewDir made, and nothing else: a direct
 * child of the temp directory, named with the prefix, holding its index.
 */
export function cleanupReviewDir(dir: string): void {
  let real: string;
  try {
    real = realpathSync(dir);
  } catch {
    throw new Error(`no review folder at ${dir}`);
  }
  const root = realpathSync(tmpdir());
  let marked = false;
  try {
    marked = (JSON.parse(readFileSync(join(real, "index.json"), "utf8")) as { prReview?: unknown }).prReview === 3;
  } catch {
    marked = false;
  }
  if (dirname(real) !== root || !basename(real).startsWith(REVIEW_DIR_PREFIX) || !marked) {
    throw new Error(`refusing to delete ${dir}: not a review folder this script made`);
  }
  rmSync(real, { recursive: true, force: true });
}

// ============================================================================
// The reviewer's checkout, and the head reviewed
// ============================================================================

/**
 * True when someone else's PR would be reviewed from its own checkout:
 * current-branch mode (no ref), or a checkout whose HEAD is the PR's head.
 */
export function isInPrCheckout(
  reviewMode: ReviewMode,
  prRef: string | null,
  cwdHead: string,
  prHeadSha: string,
): boolean {
  return reviewMode === "peer" && (prRef === null || (cwdHead !== "" && cwdHead === prHeadSha));
}

/**
 * What Claude Code loads from the checkout it runs in: the skill itself,
 * settings (allow-list, hooks), agents, and the configuration the skill
 * reads. On someone else's PR they must be the base commit's, byte for byte.
 */
export const REVIEWER_FILES = [".claude", "AGENT.md", "process/intake.md"];

/**
 * True when the checkout at `repoRoot` holds exactly the base commit's
 * REVIEWER_FILES: no tracked difference (committed or not) and no
 * untracked, unignored file among them. Compared by content, so a checkout
 * at any head of the PR — current or older — fails it. False when the
 * base commit is unknown.
 */
export function reviewerFilesMatchBase(repoRoot: string, baseSha: string | null): boolean {
  if (!baseSha) return false;
  try {
    runGit(["diff", "--quiet", baseSha, "--", ...REVIEWER_FILES], repoRoot);
  } catch {
    return false; // exit 1: differs (or git failed): not the base's
  }
  const untracked = tryRunGit(
    ["status", "--porcelain", "--untracked-files=all", "--", ...REVIEWER_FILES],
    repoRoot,
  );
  return untracked === "";
}

/**
 * The commit the review reads, and whether the PR moved under it: `headNow`
 * is the head GitHub reported after the diff was read ("" when unknown).
 */
export function resolveHeadReviewed(prHeadSha: string, headNow: string): HeadReviewed {
  return { sha: prHeadSha, moved: headNow !== "" && headNow !== prHeadSha };
}

/** The PR's head as GitHub reports it now; "" when gh fails. */
export function fetchPRHeadSha(prRef: string, projectPath: string): string {
  return tryRunGh(["pr", "view", prRef, ...ghRepoArgs(prRef, projectPath), "--json", "headRefOid", "--jq", ".headRefOid"]).trim();
}

/**
 * The PR's base and head commits, fetched into this clone as objects (never
 * checked out), and the halt when either cannot be read: the bar comes from
 * the base, and the files are read from the head with `git show`.
 */
export function fetchPRCommits(
  repoRoot: string | null,
  meta: Pick<PRMetadata, "baseSha" | "headSha">,
): { baseCommit: string | null; headCommit: string | null; halt: HardHalt | null } {
  const baseCommit = repoRoot ? fetchCommit(repoRoot, meta.baseSha) : null;
  const headCommit = repoRoot ? fetchCommit(repoRoot, meta.headSha) : null;
  let halt: HardHalt | null = null;
  if (!baseCommit) {
    halt = {
      reason: "base_unreadable",
      detail:
        `the PR's base commit ${meta.baseSha || "(not reported)"} could not be read from origin; ` +
        `the review's bar comes from it, so the review stops rather than run without it`,
    };
  } else if (!headCommit) {
    halt = {
      reason: "head_unreadable",
      detail:
        `the PR's head commit ${meta.headSha || "(not reported)"} could not be fetched from origin; ` +
        `its files are read from it with git show, so the review stops rather than read something else`,
    };
  }
  return { baseCommit, headCommit, halt };
}

// ============================================================================
// Linked-issue extraction + fetch
// ============================================================================

export interface ClosingIssueRef {
  number: number;
  repository?: { nameWithOwner: string } | null;
}

export interface ExtractedIssueRef {
  number: number;
  source: TicketSource;
  /** The repository the reference names; null means the PR's own, as `#N` does on GitHub. */
  repo: string | null;
}

/**
 * GitHub's own "closes this issue" linkage wins outright — it's a structural
 * fact, not a guess. Otherwise fall back to the standard closing keywords in
 * the PR body.
 */
export function extractIssueRef(
  closingIssuesReferences: ClosingIssueRef[],
  body: string,
): ExtractedIssueRef | null {
  if (closingIssuesReferences.length > 0) {
    const first = closingIssuesReferences[0];
    return {
      number: first.number,
      source: "closingIssuesReferences",
      repo: first.repository?.nameWithOwner ?? null,
    };
  }
  // `#N` is the PR's own repository on GitHub; `owner/repo#N` names another.
  const m = body.match(/\b(?:closes?|closed|fix(?:es|ed)?|part of)\s*:?\s*(?:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+))?#(\d+)/i);
  if (m) return { number: Number(m[2]), source: "body", repo: m[1] ?? null };
  return null;
}

interface RawIssue {
  number: number;
  title: string;
  body: string | null;
  url: string;
  state: string;
  parent?: { number: number } | null;
}

export function resolveIssueTicket(
  closingIssuesReferences: ClosingIssueRef[],
  prBody: string,
  projectPath: string,
  skipTicket: boolean,
  issueRepo: string | null = null,
): { ticket: IssueTicket | null; failure: IssueLookupFailure | null } {
  const extracted = extractIssueRef(closingIssuesReferences, prBody);
  if (!extracted) {
    return {
      ticket: null,
      failure: { extractedNumber: null, source: null, reason: "no_id_found" },
    };
  }
  // The PR chooses its reference, so it must not choose the repository: an
  // issue elsewhere would set the review's bar, or be read with the
  // reviewer's token. Only the PR's own repo and the configured Issue repo.
  const allowed = [projectPath, issueRepo].filter(Boolean).map((r) => r!.toLowerCase());
  if (extracted.repo && !allowed.includes(extracted.repo.toLowerCase())) {
    return {
      ticket: null,
      failure: {
        extractedNumber: extracted.number,
        extractedRepo: extracted.repo,
        source: extracted.source,
        reason: "repo_not_allowed",
      },
    };
  }
  if (skipTicket) {
    return {
      ticket: null,
      failure: {
        extractedNumber: extracted.number,
        extractedRepo: extracted.repo,
        source: extracted.source,
        reason: "skipped",
      },
    };
  }
  try {
    const raw = runGh([
      "issue",
      "view",
      String(extracted.number),
      "-R",
      extracted.repo ?? projectPath,
      "--json",
      "number,title,body,state,url,parent",
    ]);
    const issue = JSON.parse(raw) as RawIssue;
    const body = issue.body ?? "";
    return {
      ticket: {
        number: issue.number,
        identifier: `#${issue.number}`,
        url: issue.url,
        title: issue.title,
        description: body,
        state: issue.state,
        parentIdentifier: issue.parent ? `#${issue.parent.number}` : null,
        source: extracted.source,
        acceptance: extractMarkdownSection(body, "Acceptance"),
        contract: extractMarkdownSection(body, "Contract"),
        verify: extractMarkdownSection(body, "Verify"),
      },
      failure: null,
    };
  } catch (err) {
    if (err instanceof GhNotFoundError) {
      return {
        ticket: null,
        failure: {
          extractedNumber: extracted.number,
          extractedRepo: extracted.repo,
          source: extracted.source,
          reason: "issue_not_found",
        },
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ticket: null,
      failure: {
        extractedNumber: extracted.number,
        extractedRepo: extracted.repo,
        source: extracted.source,
        reason: "api_error",
        errorMessage: msg,
      },
    };
  }
}

/**
 * Extracts the body of a markdown section by heading text, matching any
 * heading level (## or ###, since GitHub issue forms render field labels as
 * `### Label` while slipway's own docs use `##`). Case-insensitive, ends at
 * the next heading of any level.
 */
export function extractMarkdownSection(body: string, heading: string): string | null {
  const lines = body.split("\n");
  const headingRe = new RegExp(`^#{1,6}\\s+${heading}\\s*$`, "i");
  const anyHeadingRe = /^#{1,6}\s+/;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (anyHeadingRe.test(lines[i])) {
      end = i;
      break;
    }
  }
  const section = lines.slice(start, end).join("\n").trim();
  return section.length > 0 ? section : null;
}

// ============================================================================
// Readiness signals
// ============================================================================

export interface RawReviewThreadComment {
  author: { login: string } | null;
  body: string;
  path: string | null;
  createdAt: string;
}

export interface RawReviewThread {
  id: string;
  isResolved: boolean;
  comments: { nodes: RawReviewThreadComment[] };
}

export function extractUnresolvedThreads(threads: RawReviewThread[]): UnresolvedThread[] {
  const out: UnresolvedThread[] = [];
  for (const t of threads) {
    if (t.isResolved) continue;
    const first = t.comments.nodes[0];
    if (!first) continue;
    out.push({
      id: t.id,
      author: first.author?.login ?? "unknown",
      body: first.body,
      bodyExcerpt: first.body.slice(0, 200),
      filePath: first.path ?? null,
      createdAt: first.createdAt,
    });
  }
  return out;
}

export function summarizeRequiredChecks(
  checks: Array<{ name: string; bucket: string }>,
): RequiredChecksSummary {
  const failing: string[] = [];
  const pending: string[] = [];
  const passing: string[] = [];
  for (const c of checks) {
    if (c.bucket === "fail" || c.bucket === "cancel") failing.push(c.name);
    else if (c.bucket === "pending") pending.push(c.name);
    else passing.push(c.name);
  }
  return { failing, pending, passing };
}

const DESCRIPTION_KEYWORDS = [
  "why",
  "purpose",
  "problem",
  "what",
  "how",
  "test",
  "context",
  "summary",
  "verification",
];

function descriptionHasSubstance(description: string): boolean {
  if (description.trim().length < 50) return false;
  const lower = description.toLowerCase();
  return DESCRIPTION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function computeReadiness(
  meta: PRMetadata,
  ticket: IssueTicket | null,
  unresolvedThreads: UnresolvedThread[],
  checks: RequiredChecksSummary,
): ReadinessSignals {
  const blockers: ReadinessBlocker[] = [];

  if (meta.mergeable === "CONFLICTING" || meta.mergeStateStatus === "BEHIND") {
    blockers.push({
      check: "mergeable",
      severity: "HIGH",
      detail: `mergeable=${meta.mergeable}; mergeStateStatus=${meta.mergeStateStatus}`,
    });
  }

  if (checks.failing.length > 0 || checks.pending.length > 0) {
    blockers.push({
      check: "checks",
      severity: "HIGH",
      detail:
        (checks.failing.length > 0 ? `failing: ${checks.failing.join(", ")}` : "") +
        (checks.failing.length > 0 && checks.pending.length > 0 ? "; " : "") +
        (checks.pending.length > 0 ? `pending: ${checks.pending.join(", ")}` : ""),
    });
  }

  if (meta.draft) {
    blockers.push({
      check: "draft",
      severity: "HIGH",
      detail: "PR is marked draft",
    });
  }

  if (!descriptionHasSubstance(meta.description) && ticket === null) {
    blockers.push({
      check: "description",
      severity: "HIGH",
      detail:
        "description is empty, a template stub, or missing problem/solution framing, and no linked issue was found",
    });
  }

  if (unresolvedThreads.length > 0) {
    blockers.push({
      check: "unresolved_threads",
      severity: "HIGH",
      detail: `${unresolvedThreads.length} unresolved review thread(s): ${unresolvedThreads
        .map((t) => `@${t.author}`)
        .join(", ")}`,
    });
  }

  return { passed: blockers.length === 0, blockers };
}

// ============================================================================
// Diff parsing + anchor index
// ============================================================================

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export interface ParsedFileDiff {
  added: number;
  removed: number;
  /** Post-image line numbers of `+` lines, coalesced into ranges. */
  changedLines: LineRange[];
  /** Pre-image line numbers of `-` lines, coalesced into ranges. */
  removedHunks: LineRange[];
}

/** Coalesces an ascending list of line numbers into inclusive ranges. */
export function toLineRanges(lines: number[]): LineRange[] {
  const ranges: LineRange[] = [];
  for (const line of lines) {
    const last = ranges[ranges.length - 1];
    if (last && line === last[1] + 1) last[1] = line;
    else ranges.push([line, line]);
  }
  return ranges;
}

/**
 * Parses one file's unified diff (hunks plus whatever `diff --git` preamble
 * precedes them — preamble lines are harmlessly ignored since they match
 * neither a hunk header nor a `+`/`-`/context line) into line counts plus the
 * added/removed line ranges. Pure and exported so the anchor index is
 * unit-testable without shelling out to `gh`.
 */
export function parseFileDiff(diff: string): ParsedFileDiff {
  const addedLines: number[] = [];
  const removedLines: number[] = [];
  let newLine = 0;
  let oldLine = 0;

  for (const line of diff.split("\n")) {
    const header = HUNK_HEADER.exec(line);
    if (header) {
      oldLine = Number(header[1]);
      newLine = Number(header[2]);
      continue;
    }
    // A missing-trailing-newline marker belongs to the previous line and
    // must not advance either counter.
    if (line.startsWith("\\")) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;

    if (line.startsWith("+")) {
      addedLines.push(newLine);
      newLine++;
    } else if (line.startsWith("-")) {
      removedLines.push(oldLine);
      oldLine++;
    } else {
      newLine++;
      oldLine++;
    }
  }

  return {
    added: addedLines.length,
    removed: removedLines.length,
    changedLines: toLineRanges(addedLines),
    removedHunks: toLineRanges(removedLines),
  };
}

/** Splits a multi-file `gh pr diff --patch` blob into one block per file. */
export function splitDiffIntoFiles(patch: string): string[] {
  const lines = patch.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (current.length > 0) blocks.push(current.join("\n"));
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
    // Lines before the first "diff --git" are the `git format-patch`-style
    // From/Date/Subject preamble `gh pr diff --patch` adds; not a file diff.
  }
  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks;
}

/**
 * Recovers old/new paths for one file block. Prefers the `---`/`+++` lines
 * (present whenever the file has content hunks); falls back to the
 * `diff --git a/X b/Y` header for a pure rename with no content change,
 * which has neither.
 */
export function extractPathsFromDiffBlock(block: string): {
  oldPath: string | null;
  newPath: string | null;
} {
  const minusMatch = block.match(/^--- (?:a\/(.+)|\/dev\/null)$/m);
  const plusMatch = block.match(/^\+\+\+ (?:b\/(.+)|\/dev\/null)$/m);
  let oldPath = minusMatch ? (minusMatch[1] ?? null) : null;
  let newPath = plusMatch ? (plusMatch[1] ?? null) : null;
  if (oldPath === null && newPath === null) {
    const header = block.match(/^diff --git a\/(.+) b\/(.+)$/m);
    if (header) {
      oldPath = header[1];
      newPath = header[2];
    }
  }
  return { oldPath, newPath };
}

/**
 * Parses a full `gh pr diff --patch` blob into aggregate stats plus the
 * anchor index. Pure and exported for unit testing without shelling out.
 */
export function parseUnifiedDiff(patch: string): DiffStats {
  const blocks = splitDiffIntoFiles(patch);
  let added = 0;
  let removed = 0;
  const changedLines: Record<string, LineRange[]> = {};
  const removedHunks: Record<string, LineRange[]> = {};

  for (const block of blocks) {
    const { oldPath, newPath } = extractPathsFromDiffBlock(block);
    const parsed = parseFileDiff(block);
    added += parsed.added;
    removed += parsed.removed;
    if (newPath && parsed.changedLines.length > 0) {
      changedLines[newPath] = parsed.changedLines;
    }
    const removedKey = oldPath ?? newPath;
    if (removedKey && parsed.removedHunks.length > 0) {
      removedHunks[removedKey] = parsed.removedHunks;
    }
  }

  return {
    filesChanged: blocks.length,
    linesAdded: added,
    linesRemoved: removed,
    changedLines,
    removedHunks,
  };
}

/**
 * Returns `null` when `gh` itself failed (so the caller can distinguish
 * "transient API failure" from "PR genuinely has zero changes"). Logs to
 * verbose stderr on failure.
 */
export function fetchDiffStats(prRef: string, projectPath: string): DiffStats | null {
  let raw: string;
  try {
    raw = runGh(["pr", "diff", prRef, "-R", projectPath, "--patch"]);
  } catch (err) {
    if (verboseLog) {
      const msg = err instanceof Error ? err.message : String(err);
      verboseLog(`fetchDiffStats: gh failed: ${msg.split("\n")[0]}`);
    }
    return null;
  }
  return parseUnifiedDiff(raw);
}

export function detectHardHalt(
  meta: PRMetadata,
  diff: DiffStats,
  diffFetchFailed: boolean,
  ticket: IssueTicket | null,
): HardHalt | null {
  // Only treat zero-files as empty_diff when we actually retrieved the diff.
  // A gh failure means we don't *know* the diff is empty.
  if (!diffFetchFailed && diff.filesChanged === 0) {
    return {
      reason: "empty_diff",
      detail: "PR has no file changes to review",
    };
  }
  if (meta.description.trim().length === 0 && ticket === null) {
    return {
      reason: "no_description_no_ticket",
      detail:
        "PR has no description and no linked GitHub issue could be resolved from closingIssuesReferences or the body",
    };
  }
  return null;
}

// ============================================================================
// Review threads + closing issues (GraphQL, paginated)
// ============================================================================

const REVIEW_THREADS_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        closingIssuesReferences(first: 10) {
          nodes { number repository { nameWithOwner } }
        }
        reviewThreads(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            comments(first: 20) {
              nodes { author { login } body path createdAt }
            }
          }
        }
      }
    }
  }
`;

interface ReviewThreadsPage {
  data?: {
    repository?: {
      pullRequest?: {
        closingIssuesReferences?: { nodes: ClosingIssueRef[] };
        reviewThreads?: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: RawReviewThread[];
        };
      } | null;
    } | null;
  };
}

/**
 * Fetches review threads (paginated) and closing-issue references in one
 * GraphQL query per page. `gh pr view --json` doesn't expose thread
 * resolution state, so this goes straight at the API.
 */
export function fetchReviewThreadsAndClosingIssues(
  owner: string,
  repo: string,
  number: number,
): { threads: RawReviewThread[]; closingIssues: ClosingIssueRef[] } {
  const threads: RawReviewThread[] = [];
  let closingIssues: ClosingIssueRef[] = [];
  let cursor: string | null = null;
  let page = 0;
  const MAX_PAGES = 20;

  do {
    const args = [
      "api",
      "graphql",
      "-f",
      `query=${REVIEW_THREADS_QUERY}`,
      "-f",
      `owner=${owner}`,
      "-f",
      `repo=${repo}`,
      "-F",
      `number=${number}`,
    ];
    if (cursor) args.push("-f", `cursor=${cursor}`);

    const raw = tryRunGh(args);
    if (!raw) break;
    let parsed: ReviewThreadsPage;
    try {
      parsed = JSON.parse(raw) as ReviewThreadsPage;
    } catch {
      break;
    }
    const pr = parsed.data?.repository?.pullRequest;
    if (!pr) break;
    if (page === 0) closingIssues = pr.closingIssuesReferences?.nodes ?? [];
    threads.push(...(pr.reviewThreads?.nodes ?? []));
    const pageInfo = pr.reviewThreads?.pageInfo;
    cursor = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
    page++;
  } while (cursor && page < MAX_PAGES);

  return { threads, closingIssues };
}

interface RawRequiredCheck {
  name: string;
  bucket: string;
  state: string;
}

/**
 * Required checks only — "failing or pending required checks" per the
 * readiness bar. `gh pr checks --required` resolves which checks are
 * actually required via branch protection, so this doesn't have to.
 */
export function fetchRequiredChecks(prRef: string, projectPath: string): RawRequiredCheck[] {
  const raw = runGhAllowNonZero([
    "pr",
    "checks",
    prRef,
    "-R",
    projectPath,
    "--required",
    "--json",
    "name,bucket,state",
  ]);
  try {
    return JSON.parse(raw) as RawRequiredCheck[];
  } catch {
    return [];
  }
}

// ============================================================================
// slipway integration
// ============================================================================

const RISK_PATH_PATTERNS: RegExp[] = [
  /billing|payment|invoice|\bprice\b|charge|checkout|subscription/i,
  /\bauth|session|permission|\brole\b|\bacl\b|token/i,
  /schema|migrat|\.sql$/i,
  /\bdelete\b|destroy|purge|\bdrop\b/i,
];

export function diffTouchesRiskPaths(changedFiles: string[]): boolean {
  return changedFiles.some((f) => RISK_PATH_PATTERNS.some((re) => re.test(f)));
}

/** Parses `docs/domain-invariants.md`'s `| ID | Invariant | Enforced by | Since |` table. */
export function parseDomainInvariants(md: string): SlipwayInvariant[] {
  const out: SlipwayInvariant[] = [];
  const rows = md.split("\n").filter((l) => l.trim().startsWith("|") && !/^\|[\s-]+\|/.test(l.trim()));
  for (const row of rows) {
    const cells = row.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3) continue;
    const [id, invariant, enforcedByRaw] = cells;
    if (!id || id === "ID") continue;
    const enforcedBy = enforcedByRaw.replace(/`/g, "").trim();
    if (!enforcedBy) continue;
    out.push({ id, invariant, enforcedBy });
  }
  return out;
}

/** Invariant IDs whose enforcing path was touched by a removed hunk in this diff. */
export function findInvariantsAtRisk(
  invariants: SlipwayInvariant[],
  removedHunks: Record<string, LineRange[]>,
): string[] {
  const touched = new Set(Object.keys(removedHunks));
  return invariants.filter((inv) => touched.has(inv.enforcedBy)).map((inv) => inv.id);
}

/** Parses one `docs/milestones/*.md` file; returns null unless `status: active`. */
export function parseActiveMilestone(md: string, filePath: string): SlipwayMilestone | null {
  const frontmatter = md.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return null;
  const status = frontmatter[1].match(/^status:\s*(\S+)/m)?.[1] ?? null;
  if (status !== "active") return null;
  const id = frontmatter[1].match(/^id:\s*(\S+)/m)?.[1] ?? null;
  const noGosSection = extractMarkdownSection(md, "No-gos");
  const noGos = noGosSection
    ? noGosSection
        .split("\n")
        .filter((l) => l.trim().startsWith("-"))
        .map((l) => l.replace(/^\s*-\s*/, "").trim())
    : [];
  return { path: filePath, id, status, noGos };
}

export function extractLane(body: string): "trivial" | "bounded" | "feature" | null {
  const m = body.match(/\bLane:\s*(trivial|bounded|feature)\b/i);
  return m ? (m[1].toLowerCase() as "trivial" | "bounded" | "feature") : null;
}

/**
 * Where the slipway inputs are read from. `read` returns a file's text, or
 * null when it is absent or not a plain file; `list` returns a folder's
 * plain-file names, or null when the folder is absent.
 */
export interface SlipwayReader {
  read(rel: string): string | null;
  list(rel: string): string[] | null;
}

/** Reads a directory on disk. Tests and callers with no base commit. */
export function fsSlipwayReader(root: string): SlipwayReader {
  return {
    read(rel) {
      try {
        const full = join(root, rel);
        return existsSync(full) ? readFileSync(full, "utf8") : null;
      } catch {
        return null;
      }
    },
    list(rel) {
      try {
        const full = join(root, rel);
        return existsSync(full) ? readdirSync(full) : null;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Reads a commit's tree, never a working tree. The review's bar (invariants,
 * milestones, the cold-review checklist) comes from the PR's base commit, so
 * the PR cannot lower its own bar by editing those files, and a symlink the
 * PR commits is never followed: only plain blobs (mode 100644/100755) read.
 */
export function gitSlipwayReader(repoRoot: string, commit: string): SlipwayReader {
  const entries = (rel: string, asDir: boolean) => {
    const out = tryRunGit(["ls-tree", commit, "--", asDir ? `${rel}/` : rel], repoRoot);
    return out
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [meta, path] = line.split("\t");
        const [mode, type] = meta.split(" ");
        return { mode, type, path };
      });
  };
  const plain = (e: { mode: string; type: string }) => e.type === "blob" && (e.mode === "100644" || e.mode === "100755");
  return {
    read(rel) {
      const e = entries(rel, false).find((x) => x.path === rel);
      if (!e || !plain(e)) return null;
      try {
        return runGit(["cat-file", "blob", `${commit}:${rel}`], repoRoot);
      } catch {
        return null;
      }
    },
    list(rel) {
      const es = entries(rel, true);
      if (es.length === 0) return null;
      return es.filter(plain).map((e) => basename(e.path));
    },
  };
}

/**
 * Makes a commit GitHub reported (the PR's baseRefOid or headRefOid)
 * readable here as objects: fetched from origin by sha, never found by
 * branch name, which a pushed branch could shadow, and never checked out.
 * GitHub serves a PR's head by sha, a fork's included, since
 * `pull/<n>/head` makes it reachable. null when it cannot be read: the
 * caller stops the review (fail closed).
 */
export function fetchCommit(repoRoot: string, sha: string): string | null {
  if (!/^[0-9a-f]{40,64}$/.test(sha)) return null;
  const have = () => tryRunGit(["rev-parse", "--verify", "--quiet", `${sha}^{commit}`], repoRoot) === sha;
  if (have()) return sha;
  tryRunGit(["fetch", "--no-tags", "origin", sha], repoRoot);
  return have() ? sha : null;
}

/**
 * Reads slipway-repo context through `source`: the PR's base commit in
 * normal use (`gitSlipwayReader`), a directory in tests. Every marker is
 * optional — a repo without them gets `present: false` and the skill
 * behaves exactly as it does for any other repo.
 */
export function detectSlipwayContext(
  source: string | SlipwayReader | null,
  prBody: string,
  diff: DiffStats,
  paths: SlipwayPaths = DEFAULT_SLIPWAY_PATHS,
  readFrom: string | null = null,
): SlipwayContext {
  const reader = typeof source === "string" ? fsSlipwayReader(source) : source;
  // A path turned off (null) is never read, whatever the checkout holds.
  const read = (rel: string | null) => (reader && rel ? reader.read(rel) : null);
  const coldReviewText = read(paths.coldReview);
  const invariantsText = read(paths.invariants);
  const milestoneFiles = reader && paths.milestones ? reader.list(paths.milestones) : null;

  const hasColdReview = coldReviewText !== null;
  const present = hasColdReview || invariantsText !== null || milestoneFiles !== null;

  const changedFiles = Object.keys(diff.changedLines);
  const coldReviewApplies = hasColdReview && diffTouchesRiskPaths(changedFiles);

  const domainInvariants = invariantsText !== null ? parseDomainInvariants(invariantsText) : [];
  const invariantsAtRisk = findInvariantsAtRisk(domainInvariants, diff.removedHunks);

  const activeMilestones: SlipwayMilestone[] = [];
  for (const f of milestoneFiles ?? []) {
    if (!f.endsWith(".md") || f === "TEMPLATE.md") continue;
    const rel = join(paths.milestones!, f);
    const text = reader!.read(rel);
    const parsedMilestone = text !== null ? parseActiveMilestone(text, rel) : null;
    if (parsedMilestone) activeMilestones.push(parsedMilestone);
  }

  return {
    present,
    readFrom,
    lane: extractLane(prBody),
    verificationSection: extractMarkdownSection(prBody, "Verification"),
    coldReviewApplies,
    coldReviewChecklistPath: hasColdReview ? paths.coldReview : null,
    domainInvariants,
    invariantsAtRisk,
    activeMilestones,
  };
}

// ============================================================================
// Main
// ============================================================================

export async function compute(opts: CLIOptions, cwd?: string): Promise<FeatureOutput> {
  if (opts.verbose) _setVerboseLog((m) => process.stderr.write(`[pr-review] ${m}\n`));
  logVerbose(opts, `resolving input: ${opts.prInput ?? "(current branch)"}`);
  const { prRef, projectPath } = resolvePRInput(opts.prInput, opts.projectPath, cwd);
  logVerbose(opts, `resolved ref=${prRef ?? "(current branch)"} in ${projectPath ?? "(cwd-detected)"}`);

  const meta = fetchPRMetadata(prRef, projectPath);
  if (meta === null) {
    return prNotFoundOutput(prRef, projectPath, opts.tone);
  }
  logVerbose(opts, `fetched meta: ${meta.title} (${meta.sourceBranch} → ${meta.targetBranch})`);

  // Someone else's PR is never reviewed from its own checkout: there, the
  // skill and compute.ts running are the PR's. Current-branch mode is for
  // the user's own PR only.
  const reviewMode = detectReviewMode(meta.author.username);
  logVerbose(opts, `review mode: ${reviewMode} (author @${meta.author.username})`);
  const cwdHead = tryRunGit(["rev-parse", "HEAD"], cwd);
  // The bar comes from the PR's base commit, never its head or a working tree.
  const repoRoot = tryRunGit(["rev-parse", "--show-toplevel"], cwd) || null;
  // Base and head as objects only: the review folder is written from them.
  const { baseCommit, headCommit, halt: commitHalt } = fetchPRCommits(repoRoot, meta);
  // On someone else's PR, what Claude Code loaded here must be the base's:
  // a checkout at an older head of the PR has a different HEAD but the
  // PR's files.
  const inPrCheckout =
    isInPrCheckout(reviewMode, prRef, cwdHead, meta.headSha) ||
    (reviewMode === "peer" && !!repoRoot && !!baseCommit && !reviewerFilesMatchBase(repoRoot, baseCommit));

  const [owner, repo] = meta.projectPath.split("/");
  const { threads, closingIssues } = fetchReviewThreadsAndClosingIssues(owner, repo, meta.number);
  const unresolved = extractUnresolvedThreads(threads);

  const { ticket, failure } = resolveIssueTicket(
    closingIssues,
    meta.description,
    meta.projectPath,
    opts.skipTicket,
    opts.issueRepo,
  );
  logVerbose(
    opts,
    `ticket: ${ticket ? ticket.identifier : `none (${failure?.reason ?? "unknown"})`}`,
  );

  const diffResult = fetchDiffStats(prRef ?? String(meta.number), meta.projectPath);
  const headNow = fetchPRHeadSha(prRef ?? String(meta.number), meta.projectPath);
  const diff: DiffStats = diffResult ?? {
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
    changedLines: {},
    removedHunks: {},
  };
  const diffFetchFailed = diffResult === null;
  logVerbose(
    opts,
    `diff: ${diff.filesChanged} files (fetch ${diffFetchFailed ? "FAILED" : "ok"}), +${diff.linesAdded}/-${diff.linesRemoved}; unresolved threads: ${unresolved.length}`,
  );

  const requiredChecksRaw = fetchRequiredChecks(prRef ?? String(meta.number), meta.projectPath);
  const checks = summarizeRequiredChecks(requiredChecksRaw);

  const readiness = computeReadiness(meta, ticket, unresolved, checks);
  let hardHalt = detectHardHalt(meta, diff, diffFetchFailed, ticket);

  if (!hardHalt && inPrCheckout) {
    hardHalt = {
      reason: "running_in_pr_checkout",
      detail:
        `this checkout's ${REVIEWER_FILES.join(", ")} are not the base commit's, or it is the PR's own head, ` +
        `and the PR is @${meta.author.username}'s: what runs here may be the PR's. ` +
        `Run from a clean checkout of ${meta.targetBranch}, passing the PR number.`,
    };
  }
  if (!hardHalt) hardHalt = commitHalt;
  const slipway = detectSlipwayContext(
    repoRoot && baseCommit ? gitSlipwayReader(repoRoot, baseCommit) : null,
    meta.description,
    diff,
    opts.slipwayPaths,
    baseCommit,
  );
  logVerbose(opts, `slipway: present=${slipway.present} lane=${slipway.lane ?? "none"}`);

  const headReviewed = resolveHeadReviewed(meta.headSha, headNow);
  if (headReviewed.moved) {
    readiness.blockers.push({
      check: "head_moved",
      severity: "HIGH",
      detail: `PR head moved during setup: metadata read ${meta.headSha}, GitHub now reports ${headNow}. Re-run to review one commit.`,
    });
    readiness.passed = false;
  }

  const reviewDir =
    !hardHalt && repoRoot && baseCommit && headCommit ? writeReviewDir(repoRoot, baseCommit, headCommit) : null;
  if (reviewDir) logVerbose(opts, `review folder at ${reviewDir.path}`);

  return {
    schemaVersion: 3,
    tone: opts.tone,
    reviewMode,
    pr: meta,
    ticket,
    ticketLookupFailure: failure,
    diff,
    diffFetchFailed,
    checks,
    readiness,
    unresolvedThreads: unresolved,
    slipway,
    headReviewed,
    reviewDir,
    hardHalt,
  };
}

/** Build a FeatureOutput for the case where the PR couldn't be fetched. */
function prNotFoundOutput(
  prRef: string | null,
  projectPath: string | null,
  tone: Tone,
): FeatureOutput {
  return {
    schemaVersion: 3,
    tone,
    reviewMode: "peer",
    pr: null,
    ticket: null,
    ticketLookupFailure: null,
    diff: {
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      changedLines: {},
      removedHunks: {},
    },
    diffFetchFailed: false,
    checks: { failing: [], pending: [], passing: [] },
    readiness: { passed: false, blockers: [] },
    unresolvedThreads: [],
    slipway: {
      present: false,
      readFrom: null,
      lane: null,
      verificationSection: null,
      coldReviewApplies: false,
      coldReviewChecklistPath: null,
      domainInvariants: [],
      invariantsAtRisk: [],
      activeMilestones: [],
    },
    headReviewed: null,
    reviewDir: null,
    hardHalt: {
      reason: "pr_not_found",
      detail: `PR ${prRef ?? "(current branch)"} not found${projectPath ? ` in ${projectPath}` : ""} (gh reported not-found)`,
    },
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let opts: CLIOptions;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(
      (err instanceof Error ? `${err.message}\n` : String(err)) +
        "Usage: node <script-path>/compute.ts [<pr-url-or-number-or-branch>] [options]\n" +
        "       (bun / npx tsx also work; omit the ref to use the current branch)\n" +
        "Options:\n" +
        "  --project-path <owner/repo>       GitHub repo; defaults to detection from origin\n" +
        "  --output-path <file>              Write JSON to file instead of stdout\n" +
        "  --skip-ticket                     Don't attempt linked-issue fetch\n" +
        "  --tone {casual|formal}            Tone hint for downstream rendering (default: casual)\n" +
        "  --issue-repo <owner/repo>         The configured Issue repo (the one other repo an issue may come from)\n" +
        "  --invariants <path|none>          Domain invariants doc (default: docs/domain-invariants.md)\n" +
        "  --milestones <dir|none>           Milestones folder (default: docs/milestones)\n" +
        "  --cold-review <path|none>         Cold-review checklist (default: process/cold-review.md)\n" +
        "  --verbose                         Diagnostic logs to stderr\n" +
        "  --cleanup <dir>                   Delete a review folder this script made, and exit\n",
    );
    process.exit(1);
  }

  if (opts.cleanup) {
    try {
      cleanupReviewDir(opts.cleanup);
    } catch (err) {
      process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    }
    return;
  }

  let output: FeatureOutput;
  try {
    output = await compute(opts);
  } catch (err) {
    process.stderr.write(
      `compute failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(2);
  }

  const json = JSON.stringify(output, null, 2);
  if (opts.outputPath) {
    writeFileSync(opts.outputPath, json + "\n");
  } else {
    process.stdout.write(json + "\n");
  }
}

declare const Bun: { main: string } | undefined;
const isMain =
  (typeof Bun !== "undefined" && Bun.main === import.meta.filename) ||
  (typeof Bun === "undefined" &&
    typeof import.meta.url === "string" &&
    import.meta.url === `file://${process.argv[1]}`);

if (isMain) {
  main();
}
