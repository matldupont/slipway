#!/usr/bin/env -S npx tsx
/**
 * PR review feature extractor.
 *
 * Deterministically resolves PR identity, optional worktree setup, linked
 * GitHub issue lookup, readiness signals, and slipway-repo context for a
 * GitHub pull request. Emits JSON on stdout (or to --output-path).
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
 *   --worktree                        Create a worktree for the PR (default: off)
 *   --worktree-dir <parent>           Parent directory for the worktree
 *                                     (default: $PR_REVIEW_WORKTREE_DIR or sibling of repo root)
 *   --output-path <file>              Write JSON to file instead of stdout
 *   --skip-ticket                     Don't attempt linked-issue fetch (still extract the number)
 *   --tone {casual|formal}            Tone hint for downstream rendering (default: casual)
 *   --invariants <path|none>          Domain invariants doc (default: docs/domain-invariants.md)
 *   --milestones <dir|none>           Milestones folder (default: docs/milestones)
 *   --cold-review <path|none>         Cold-review checklist (default: process/cold-review.md)
 *                                     `none` turns that input off; it never falls back to the default.
 *   --verbose                         Diagnostic logs to stderr (includes swallowed gh/git stderr)
 *
 * Environment:
 *   GH_HOST                 GitHub host for `gh` (e.g. github.example.com, for GitHub Enterprise)
 *   PR_REVIEW_WORKTREE_DIR  Default parent directory for worktrees
 *
 * Requirements:
 *   - `gh` (authenticated) and `git` on PATH
 *   - Node 18+ OR bun
 *   - No npm/bun runtime dependencies — Node stdlib only
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, basename, join, resolve, sep } from "node:path";

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
  author: { username: string };
  /** "owner/repo". */
  projectPath: string;
  /** GitHub's mergeStateStatus: BEHIND | BLOCKED | CLEAN | DIRTY | DRAFT | HAS_HOOKS | UNKNOWN | UNSTABLE. */
  mergeStateStatus: string;
  /** GitHub's mergeable: MERGEABLE | CONFLICTING | UNKNOWN. */
  mergeable: string;
  draft: boolean;
}

export interface WorktreeInfo {
  created: boolean;
  path: string | null;
  branch: string | null;
  /** `git rev-parse HEAD` in the worktree once it is checked out. */
  headSha?: string | null;
  reason?: string;
}

/**
 * The commit this review reads. With a worktree it is the commit checked out
 * there; without one, the head `gh pr view` reported. `moved` is true when
 * the two differ: the PR was pushed to between the metadata read and the
 * fetch, so the metadata, diff and checkout may describe different commits.
 */
export interface HeadReviewed {
  sha: string;
  source: "worktree" | "pr";
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
  reason: "no_id_found" | "skipped" | "issue_not_found" | "api_error";
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
  reason: "pr_not_found" | "empty_diff" | "no_description_no_ticket";
  detail: string;
}

export type Tone = "casual" | "formal";
export type ReviewMode = "self" | "peer";

export interface FeatureOutput {
  schemaVersion: 2;
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
  worktree: WorktreeInfo;
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
  hardHalt: HardHalt | null;
}

export function isFeatureOutput(value: unknown): value is FeatureOutput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 2 &&
    (v.tone === "casual" || v.tone === "formal") &&
    (v.pr === null || typeof v.pr === "object") &&
    typeof v.worktree === "object" &&
    typeof v.diff === "object" &&
    typeof v.diffFetchFailed === "boolean" &&
    typeof v.checks === "object" &&
    typeof v.readiness === "object" &&
    Array.isArray(v.unresolvedThreads) &&
    typeof v.slipway === "object"
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
  slipwayPaths: SlipwayPaths;
  withWorktree: boolean;
  worktreeDir: string | null;
  outputPath: string | null;
  skipTicket: boolean;
  verbose: boolean;
  tone: Tone;
}

export function parseArgs(argv: string[]): CLIOptions {
  const opts: CLIOptions = {
    prInput: null,
    projectPath: null,
    slipwayPaths: { ...DEFAULT_SLIPWAY_PATHS },
    withWorktree: false,
    worktreeDir: process.env.PR_REVIEW_WORKTREE_DIR ?? null,
    outputPath: null,
    skipTicket: false,
    verbose: false,
    tone: "casual",
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
        opts.withWorktree = true;
        break;
      case "--invariants":
        opts.slipwayPaths.invariants = parseSlipwayPath(arg, argv[++i]);
        break;
      case "--milestones":
        opts.slipwayPaths.milestones = parseSlipwayPath(arg, argv[++i]);
        break;
      case "--cold-review":
        opts.slipwayPaths.coldReview = parseSlipwayPath(arg, argv[++i]);
        break;
      case "--worktree-dir":
        opts.worktreeDir = argv[++i] ?? null;
        break;
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

export function runGit(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
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

export function runGh(args: string[]): string {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
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
  try {
    return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
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
export function fetchPRMetadata(
  prRef: string | null,
  projectPath: string | null,
): PRMetadata | null {
  const args = ["pr", "view"];
  if (prRef !== null) args.push(prRef);
  // A full URL already encodes owner/repo; passing -R too is redundant and,
  // on some gh versions, rejected as conflicting.
  const isUrl = prRef !== null && extractPrNumberFromUrl(prRef) !== null;
  if (projectPath && !isUrl) args.push("-R", projectPath);
  args.push(
    "--json",
    "number,url,title,body,headRefName,baseRefName,headRefOid,author,isDraft,mergeable,mergeStateStatus",
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
    author: { username: parsed.author?.login ?? "unknown" },
    projectPath: projectPath ?? projectPathFromUrl(parsed.url) ?? "unknown/unknown",
    mergeStateStatus: parsed.mergeStateStatus ?? "UNKNOWN",
    mergeable: parsed.mergeable ?? "UNKNOWN",
    draft: parsed.isDraft ?? false,
  };
}

// ============================================================================
// Worktree
// ============================================================================

function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

/**
 * Resolve the main worktree's root, given the root of the worktree we're
 * currently in. `git worktree list --porcelain` always lists the main
 * worktree first.
 *
 * Without this, running the skill from inside a previous review worktree
 * nests names (`repo-pr-1` -> `repo-pr-1-pr-2`) and scatters review
 * worktrees under each other instead of alongside the repo.
 */
export function resolveMainWorktreeRoot(repoRoot: string, cwd?: string): string {
  const list = tryRunGit(["worktree", "list", "--porcelain"], cwd);
  const first = list.split("\n").find((line) => line.startsWith("worktree "));
  if (!first) return repoRoot;
  const mainRoot = first.slice("worktree ".length).trim();
  return mainRoot && existsSync(mainRoot) ? mainRoot : repoRoot;
}

export function setupWorktree(
  meta: PRMetadata,
  withWorktree: boolean,
  worktreeDir: string | null,
  cwd?: string,
): WorktreeInfo {
  if (!withWorktree) {
    return {
      created: false,
      path: null,
      branch: null,
      reason: "worktree creation not requested (pass --worktree to enable)",
    };
  }

  const currentRoot = tryRunGit(["rev-parse", "--show-toplevel"], cwd);
  if (!currentRoot) {
    return {
      created: false,
      path: null,
      branch: null,
      reason: "not inside a git repository; cannot create worktree",
    };
  }
  const repoRoot = resolveMainWorktreeRoot(currentRoot, cwd);
  const repoName = basename(repoRoot);

  // A relative --worktree-dir resolves against the caller's cwd, which is
  // usually the repo itself — that silently drops a full second checkout
  // inside the working tree, where it shows up as untracked files and is one
  // `git add -A` away from being committed.
  const parentDir = worktreeDir
    ? resolve(cwd ?? process.cwd(), worktreeDir)
    : dirname(repoRoot);

  const enclosing = [repoRoot, currentRoot].find((root) => isInside(root, parentDir));
  if (enclosing) {
    return {
      created: false,
      path: null,
      branch: null,
      reason:
        `refusing to create a worktree inside the repository at ${enclosing}; ` +
        `--worktree-dir must resolve outside the working tree ` +
        `(got ${parentDir}). Omit it to use the repo's sibling directory.`,
    };
  }

  const worktreePath = join(parentDir, `${repoName}-pr-${meta.number}`);
  const branchName = `pr-${meta.number}`;
  // GitHub exposes every PR's commits (including from forks, which have no
  // remote-tracking ref on `origin`) under this synthetic ref on the origin
  // remote, regardless of where the head branch actually lives.
  const pullRefspec = `pull/${meta.number}/head`;

  const worktreeList = tryRunGit(["worktree", "list", "--porcelain"], repoRoot);
  const reuse = worktreeList
    .split("\n")
    .some((line) => line === `worktree ${worktreePath}`);

  if (reuse) {
    // Bail if the existing worktree has uncommitted edits — force-checkout
    // would silently nuke user changes.
    const dirty = tryRunGit(["status", "--porcelain"], worktreePath);
    if (dirty.length > 0) {
      return {
        created: false,
        path: worktreePath,
        branch: branchName,
        reason:
          `existing worktree at ${worktreePath} has uncommitted changes; ` +
          `clean it or pass --worktree-dir to a fresh location`,
      };
    }
    // Can't fetch straight into `branchName` here — git refuses to update a
    // ref that's checked out in a worktree (this one). Land on FETCH_HEAD
    // instead, then move the branch with checkout -B, which git allows for
    // a worktree's own current branch.
    runGit(["fetch", "origin", pullRefspec], worktreePath);
    // Commits made in the review worktree that the PR does not have would be
    // reset away by checkout -B: refuse, as for uncommitted edits.
    const local = tryRunGit(["rev-list", "--count", "FETCH_HEAD..HEAD"], worktreePath);
    if (local !== "" && local !== "0") {
      return {
        created: false,
        path: worktreePath,
        branch: branchName,
        reason:
          `existing worktree at ${worktreePath} has ${local} commit(s) the PR does not; ` +
          `push or move them, or pass --worktree-dir to a fresh location`,
      };
    }
    runGit(["checkout", "-B", branchName, "FETCH_HEAD"], worktreePath);
  } else {
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
    runGit(["fetch", "origin", `${pullRefspec}:${branchName}`], repoRoot);
    runGit(["worktree", "add", worktreePath, branchName], repoRoot);
  }

  const headSha = tryRunGit(["rev-parse", "HEAD"], worktreePath) || null;
  return { created: true, path: worktreePath, branch: branchName, headSha };
}

/** The commit the review reads, and whether the PR moved under it. */
export function resolveHeadReviewed(prHeadSha: string, worktree: WorktreeInfo): HeadReviewed {
  if (worktree.created && worktree.headSha) {
    return { sha: worktree.headSha, source: "worktree", moved: worktree.headSha !== prHeadSha };
  }
  return { sha: prHeadSha, source: "pr", moved: false };
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
): { ticket: IssueTicket | null; failure: IssueLookupFailure | null } {
  const extracted = extractIssueRef(closingIssuesReferences, prBody);
  if (!extracted) {
    return {
      ticket: null,
      failure: { extractedNumber: null, source: null, reason: "no_id_found" },
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
 * The PR's base commit: `refs/heads/<target>` fetched from origin into a sha,
 * so a stale local branch or a local edit never stands in for it. null when
 * it cannot be fetched.
 */
export function fetchBaseCommit(repoRoot: string, targetBranch: string): string | null {
  // refs/heads/ prefixes the name, so a branch named like an option is never read as one.
  if (!targetBranch) return null;
  // ls-remote names the sha without touching FETCH_HEAD, so a failed fetch
  // can never leave an older FETCH_HEAD standing in for the base.
  const line = tryRunGit(["ls-remote", "origin", `refs/heads/${targetBranch}`], repoRoot).split("\n")[0] ?? "";
  const sha = line.split("\t")[0];
  if (!/^[0-9a-f]{40,64}$/.test(sha)) return null;
  try {
    runGit(["fetch", "--no-tags", "origin", sha], repoRoot);
  } catch {
    // Already present locally (fetch by sha may be refused): fine if the object exists.
  }
  return tryRunGit(["cat-file", "-e", `${sha}^{commit}`], repoRoot) === "" &&
    tryRunGit(["rev-parse", "--verify", "--quiet", `${sha}^{commit}`], repoRoot) === sha
    ? sha
    : null;
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

  const worktree = setupWorktree(meta, opts.withWorktree, opts.worktreeDir, cwd);
  if (worktree.created) logVerbose(opts, `worktree at ${worktree.path}`);

  const [owner, repo] = meta.projectPath.split("/");
  const { threads, closingIssues } = fetchReviewThreadsAndClosingIssues(owner, repo, meta.number);
  const unresolved = extractUnresolvedThreads(threads);

  const { ticket, failure } = resolveIssueTicket(
    closingIssues,
    meta.description,
    meta.projectPath,
    opts.skipTicket,
  );
  logVerbose(
    opts,
    `ticket: ${ticket ? ticket.identifier : `none (${failure?.reason ?? "unknown"})`}`,
  );

  const diffResult = fetchDiffStats(prRef ?? String(meta.number), meta.projectPath);
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
  const hardHalt = detectHardHalt(meta, diff, diffFetchFailed, ticket);

  const reviewMode = detectReviewMode(meta.author.username);
  logVerbose(opts, `review mode: ${reviewMode} (author @${meta.author.username})`);

  // The bar comes from the PR's base commit, never its head or a working tree.
  const repoRoot = tryRunGit(["rev-parse", "--show-toplevel"], cwd) || null;
  const baseCommit = repoRoot ? fetchBaseCommit(repoRoot, meta.targetBranch) : null;
  const slipway = detectSlipwayContext(
    repoRoot && baseCommit ? gitSlipwayReader(repoRoot, baseCommit) : null,
    meta.description,
    diff,
    opts.slipwayPaths,
    baseCommit,
  );
  logVerbose(opts, `slipway: present=${slipway.present} lane=${slipway.lane ?? "none"}`);

  const headReviewed = resolveHeadReviewed(meta.headSha, worktree);
  if (headReviewed.moved) {
    readiness.blockers.push({
      check: "head_moved",
      severity: "HIGH",
      detail: `PR head moved during setup: metadata read ${meta.headSha}, worktree has ${headReviewed.sha}. Re-run to review one commit.`,
    });
    readiness.passed = false;
  }

  return {
    schemaVersion: 2,
    tone: opts.tone,
    reviewMode,
    pr: meta,
    worktree,
    ticket,
    ticketLookupFailure: failure,
    diff,
    diffFetchFailed,
    checks,
    readiness,
    unresolvedThreads: unresolved,
    slipway,
    headReviewed,
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
    schemaVersion: 2,
    tone,
    reviewMode: "peer",
    pr: null,
    worktree: {
      created: false,
      path: null,
      branch: null,
      reason: "skipped because PR was not found",
    },
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
        "  --worktree                        Create a worktree for the PR (default: off)\n" +
        "  --worktree-dir <parent>           Parent directory for the worktree\n" +
        "  --output-path <file>              Write JSON to file instead of stdout\n" +
        "  --skip-ticket                     Don't attempt linked-issue fetch\n" +
        "  --tone {casual|formal}            Tone hint for downstream rendering (default: casual)\n" +
        "  --invariants <path|none>          Domain invariants doc (default: docs/domain-invariants.md)\n" +
        "  --milestones <dir|none>           Milestones folder (default: docs/milestones)\n" +
        "  --cold-review <path|none>         Cold-review checklist (default: process/cold-review.md)\n" +
        "  --verbose                         Diagnostic logs to stderr\n",
    );
    process.exit(1);
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
