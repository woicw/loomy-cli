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
      }),
    ).toEqual({ project: "myproj", branch: "main" });
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
      }),
    ).toEqual({ project: null, branch: null });
  });

  it("only project set keeps branch null", () => {
    expect(
      resolveProjectContext({
        cwd: "/x",
        cliProject: "p",
        env: {},
        gitRoot: () => null,
        gitBranch: () => null,
      }),
    ).toEqual({ project: "p", branch: null });
  });
});

describe("buildPreamble", () => {
  it("returns null when both fields missing", () => {
    expect(buildPreamble({ project: null, branch: null })).toBeNull();
  });

  it("formats project-only", () => {
    expect(buildPreamble({ project: "foo", branch: null })).toBe("[项目: foo]");
  });

  it("formats branch-only", () => {
    expect(buildPreamble({ project: null, branch: "main" })).toBe("[分支: main]");
  });

  it("formats both with · separator", () => {
    expect(buildPreamble({ project: "foo", branch: "main" })).toBe("[项目: foo · 分支: main]");
  });
});
