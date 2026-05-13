import { describe, it, expect } from "vitest";
import { fetchTokenForUser } from "./buildbox-user.js";
import { CliError } from "./errors.js";

describe("fetchTokenForUser", () => {
  it("returns trimmed stdout when ssh succeeds and stdout is non-empty", () => {
    const token = fetchTokenForUser({
      user: "alice",
      exec: () => ({ status: 0, stdout: "T-alice-deadbeef\n", stderr: "" }),
    });
    expect(token).toBe("T-alice-deadbeef");
  });

  it("throws auth error when user not registered (empty stdout)", () => {
    expect(() =>
      fetchTokenForUser({
        user: "ghost",
        exec: () => ({ status: 0, stdout: "", stderr: "" }),
      }),
    ).toThrow(/not registered/);
  });

  it("throws auth error when ssh exits non-zero", () => {
    try {
      fetchTokenForUser({
        user: "alice",
        exec: () => ({ status: 255, stdout: "", stderr: "Permission denied (publickey)." }),
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).message).toMatch(/Permission denied/);
      expect((err as CliError).message).toMatch(/exit 255/);
    }
  });

  it("honors sshHost override over default", () => {
    let seenHost = "";
    fetchTokenForUser({
      user: "alice",
      sshHost: "custom-host",
      exec: (host) => {
        seenHost = host;
        return { status: 0, stdout: "T-alice-x", stderr: "" };
      },
    });
    expect(seenHost).toBe("custom-host");
  });
});
