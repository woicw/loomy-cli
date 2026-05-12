import { describe, it, expect } from "vitest";
import { resolveProjectContext, buildPreamble } from "./context.js";

describe("resolveProjectContext", () => {
  it("cliProject overrides everything", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        cliProject: "explicit",
        env: { LOOMY_PROJECT: "from-env" },
        gitRoot: () => "/x/auto",
        gitBranch: () => "auto",
      }).project,
    ).toBe("explicit");
  });

  it("LOOMY_PROJECT used when cli flag absent", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        env: { LOOMY_PROJECT: "from-env" },
        gitRoot: () => "/x/auto",
        gitBranch: () => "auto",
      }).project,
    ).toBe("from-env");
  });

  it("gitRoot basename used when nothing explicit", () => {
    expect(
      resolveProjectContext({
        cwd: "/users/me/code/myproj",
        env: {},
        gitRoot: () => "/users/me/code/myproj",
        gitBranch: () => "main",
        gitRemoteUrl: () => "git@github.com:me/myproj.git",
      }),
    ).toEqual({ project: "myproj", branch: "main", repoUrl: "git@github.com:me/myproj.git", workspaceRoot: null });
  });

  it("cliBranch overrides git", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        cliBranch: "feature/foo",
        gitRoot: () => "/x",
        gitBranch: () => "main",
      }).branch,
    ).toBe("feature/foo");
  });

  it("LOOMY_BRANCH used when cli flag absent", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        env: { LOOMY_BRANCH: "release" },
        gitRoot: () => "/x",
        gitBranch: () => "main",
      }).branch,
    ).toBe("release");
  });

  it("all null when not in git repo and nothing set", () => {
    expect(
      resolveProjectContext({
        cwd: "/tmp",
        env: {},
        gitRoot: () => null,
        gitBranch: () => null,
        gitRemoteUrl: () => null,
      }),
    ).toEqual({ project: null, branch: null, repoUrl: null, workspaceRoot: null });
  });

  it("only project set keeps branch null", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        cliProject: "p",
        env: {},
        gitRoot: () => null,
        gitBranch: () => null,
        gitRemoteUrl: () => null,
      }),
    ).toEqual({ project: "p", branch: null, repoUrl: null, workspaceRoot: null });
  });

  it("cliRepoUrl overrides everything", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        cliRepoUrl: "git@gh.com:me/explicit.git",
        env: { LOOMY_REPO: "git@gh.com:me/from-env.git" },
        gitRoot: () => "/x",
        gitBranch: () => "main",
        gitRemoteUrl: () => "git@gh.com:me/auto.git",
      }).repoUrl,
    ).toBe("git@gh.com:me/explicit.git");
  });

  it("LOOMY_REPO used when cli flag absent", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        env: { LOOMY_REPO: "git@gh.com:me/from-env.git" },
        gitRoot: () => "/x",
        gitBranch: () => "main",
        gitRemoteUrl: () => "git@gh.com:me/auto.git",
      }).repoUrl,
    ).toBe("git@gh.com:me/from-env.git");
  });

  it("git remote.origin.url used when nothing else set", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        env: {},
        gitRoot: () => "/x",
        gitBranch: () => "main",
        gitRemoteUrl: () => "git@gh.com:me/auto.git",
      }).repoUrl,
    ).toBe("git@gh.com:me/auto.git");
  });

  it("cliWorkspaceRoot overrides env and config", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        cliWorkspaceRoot: "~/explicit",
        configWorkspaceRoot: "~/from-config",
        env: { LOOMY_WORKSPACE_ROOT: "~/from-env" },
        gitRoot: () => null,
        gitBranch: () => null,
        gitRemoteUrl: () => null,
      }).workspaceRoot,
    ).toBe("~/explicit");
  });

  it("LOOMY_WORKSPACE_ROOT overrides config when no cli flag", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        configWorkspaceRoot: "~/from-config",
        env: { LOOMY_WORKSPACE_ROOT: "~/from-env" },
        gitRoot: () => null,
        gitBranch: () => null,
        gitRemoteUrl: () => null,
      }).workspaceRoot,
    ).toBe("~/from-env");
  });

  it("configWorkspaceRoot used when no cli flag or env", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        configWorkspaceRoot: "~/from-config",
        env: {},
        gitRoot: () => null,
        gitBranch: () => null,
        gitRemoteUrl: () => null,
      }).workspaceRoot,
    ).toBe("~/from-config");
  });
});

describe("buildPreamble", () => {
  it("returns null when all fields missing", () => {
    expect(buildPreamble({ project: null, branch: null, repoUrl: null, workspaceRoot: null })).toBeNull();
  });

  it("formats project-only", () => {
    expect(buildPreamble({ project: "foo", branch: null, repoUrl: null, workspaceRoot: null })).toBe("[项目: foo]");
  });

  it("formats branch-only", () => {
    expect(buildPreamble({ project: null, branch: "main", repoUrl: null, workspaceRoot: null })).toBe("[分支: main]");
  });

  it("formats project+branch with · separator", () => {
    expect(buildPreamble({ project: "foo", branch: "main", repoUrl: null, workspaceRoot: null })).toBe("[项目: foo · 分支: main]");
  });

  it("formats project+branch+repo", () => {
    expect(buildPreamble({ project: "foo", branch: "main", repoUrl: "git@gh.com:me/foo.git", workspaceRoot: null }))
      .toBe("[项目: foo · 分支: main · 仓库: git@gh.com:me/foo.git]");
  });

  it("formats repo-only", () => {
    expect(buildPreamble({ project: null, branch: null, repoUrl: "git@gh.com:me/foo.git", workspaceRoot: null }))
      .toBe("[仓库: git@gh.com:me/foo.git]");
  });

  it("formats workspaceRoot when present", () => {
    expect(buildPreamble({ project: "foo", branch: "main", repoUrl: null, workspaceRoot: "~/ifly" }))
      .toBe("[项目: foo · 分支: main · 根目录: ~/ifly]");
  });

  it("formats all four fields in order", () => {
    expect(buildPreamble({ project: "foo", branch: "main", repoUrl: "git@gh.com:me/foo.git", workspaceRoot: "~/code" }))
      .toBe("[项目: foo · 分支: main · 仓库: git@gh.com:me/foo.git · 根目录: ~/code]");
  });
});
