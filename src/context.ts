import { execFileSync } from "node:child_process";
import { basename } from "node:path";

export interface ProjectContext {
  project: string | null;
  branch: string | null;
  repoUrl: string | null;
  workspaceRoot: string | null;
}

export interface ResolveContextOpts {
  cwd: string;
  cliProject?: string | undefined;
  cliBranch?: string | undefined;
  cliRepoUrl?: string | undefined;
  cliWorkspaceRoot?: string | undefined;
  configWorkspaceRoot?: string | undefined;
  env?: NodeJS.ProcessEnv;
  gitRoot?: (cwd: string) => string | null;
  gitBranch?: (cwd: string) => string | null;
  gitRemoteUrl?: (cwd: string) => string | null;
}

export function resolveProjectContext(opts: ResolveContextOpts): ProjectContext {
  const env = opts.env ?? process.env;
  const gitRootFn = opts.gitRoot ?? defaultGitRoot;
  const gitBranchFn = opts.gitBranch ?? defaultGitBranch;
  const gitRemoteUrlFn = opts.gitRemoteUrl ?? defaultGitRemoteUrl;

  let project: string | null = opts.cliProject ?? env.LOOMY_PROJECT ?? null;
  let branch: string | null = opts.cliBranch ?? env.LOOMY_BRANCH ?? null;
  let repoUrl: string | null = opts.cliRepoUrl ?? env.LOOMY_REPO ?? null;
  const rawWorkspaceRoot: string | null =
    opts.cliWorkspaceRoot ?? env.LOOMY_WORKSPACE_ROOT ?? opts.configWorkspaceRoot ?? null;
  const workspaceRoot = normalizeWorkspaceRoot(rawWorkspaceRoot, env.HOME);

  if (!project || !branch || !repoUrl) {
    const root = gitRootFn(opts.cwd);
    if (root) {
      if (!project) project = basename(root);
      if (!branch) branch = gitBranchFn(opts.cwd);
      if (!repoUrl) repoUrl = gitRemoteUrlFn(opts.cwd);
    }
  }

  return { project, branch, repoUrl, workspaceRoot };
}

/**
 * If the workspace root is rooted under the local user's $HOME (because the
 * shell already expanded `~` before `loomy init` saw it), rewrite it back to
 * `~/…` form so the remote hermes side expands it against ITS own HOME
 * (`/Users/loomy/…`), not against the Mac user's home (`/Users/woic/…`).
 */
export function normalizeWorkspaceRoot(path: string | null, home: string | undefined): string | null {
  if (!path) return path;
  if (!home) return path;
  if (path === home) return "~";
  if (path.startsWith(home + "/")) return "~/" + path.slice(home.length + 1);
  return path;
}

export function buildPreamble(ctx: ProjectContext): string | null {
  if (!ctx.project && !ctx.branch && !ctx.repoUrl && !ctx.workspaceRoot) return null;
  const parts: string[] = [];
  if (ctx.project) parts.push(`项目: ${ctx.project}`);
  if (ctx.branch) parts.push(`分支: ${ctx.branch}`);
  if (ctx.repoUrl) parts.push(`仓库: ${ctx.repoUrl}`);
  if (ctx.workspaceRoot) parts.push(`根目录: ${ctx.workspaceRoot}`);
  return `[${parts.join(" · ")}]`;
}

function defaultGitRoot(cwd: string): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function defaultGitBranch(cwd: string): string | null {
  try {
    const b = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return b === "HEAD" ? null : b;
  } catch {
    return null;
  }
}

function defaultGitRemoteUrl(cwd: string): string | null {
  try {
    const url = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return url || null;
  } catch {
    return null;
  }
}
