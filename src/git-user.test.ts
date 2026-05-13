import { describe, it, expect } from "vitest";
import { resolveUsername } from "./git-user.js";

describe("resolveUsername", () => {
  it("prefers cliUsername over env and git", () => {
    expect(
      resolveUsername({
        cwd: "/tmp",
        cliUsername: "from-flag",
        env: { LOOMY_USERNAME: "from-env" } as NodeJS.ProcessEnv,
        gitUserName: () => "from-git",
      }),
    ).toBe("from-flag");
  });

  it("uses LOOMY_USERNAME when no flag", () => {
    expect(
      resolveUsername({
        cwd: "/tmp",
        env: { LOOMY_USERNAME: "from-env" } as NodeJS.ProcessEnv,
        gitUserName: () => "from-git",
      }),
    ).toBe("from-env");
  });

  it("falls back to git config user.name", () => {
    expect(
      resolveUsername({ cwd: "/tmp", env: {} as NodeJS.ProcessEnv, gitUserName: () => "zhenwang54" }),
    ).toBe("zhenwang54");
  });

  it("returns null when nothing is available", () => {
    expect(
      resolveUsername({ cwd: "/tmp", env: {} as NodeJS.ProcessEnv, gitUserName: () => null }),
    ).toBeNull();
  });

  it("strips control chars to prevent log injection", () => {
    const dirty = "alice\n[ADMIN]\r\nbob";
    expect(
      resolveUsername({ cwd: "/tmp", env: {} as NodeJS.ProcessEnv, gitUserName: () => dirty }),
    ).toBe("alice[ADMIN]bob");
  });

  it("clamps to 100 chars", () => {
    const long = "a".repeat(250);
    const got = resolveUsername({ cwd: "/tmp", env: {} as NodeJS.ProcessEnv, gitUserName: () => long });
    expect(got?.length).toBe(100);
  });

  it("returns null on empty / whitespace-only", () => {
    expect(
      resolveUsername({ cwd: "/tmp", env: {} as NodeJS.ProcessEnv, gitUserName: () => "   " }),
    ).toBeNull();
  });
});
