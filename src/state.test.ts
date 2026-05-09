import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readState, writeState, ensureSessionId } from "./state.js";
import { CliError } from "./errors.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loomy-state-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("state", () => {
  it("returns empty when file absent", () => {
    expect(readState(dir)).toEqual({});
  });

  it("round-trips lastSessionId", () => {
    writeState(dir, { lastSessionId: "abc-123" });
    expect(readState(dir)).toEqual({ lastSessionId: "abc-123" });
  });

  it("writes mode 600", () => {
    writeState(dir, { lastSessionId: "x" });
    const mode = statSync(join(dir, "state.json")).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("ensureSessionId returns existing then persists new", () => {
    expect(ensureSessionId(dir, false)).toMatch(/[0-9a-f-]{36}/i);
    const sessionId = readState(dir).lastSessionId;
    expect(ensureSessionId(dir, false)).toBe(sessionId);
  });

  it("ensureSessionId(force=true) generates a new one and overwrites", () => {
    const a = ensureSessionId(dir, false);
    const b = ensureSessionId(dir, true);
    expect(a).not.toBe(b);
    expect(readState(dir).lastSessionId).toBe(b);
  });

  it("rejects malformed JSON with CliError(usage)", () => {
    require("node:fs").writeFileSync(join(dir, "state.json"), "{ broken");
    try {
      readState(dir);
      throw new Error("should not reach");
    } catch (err) {
      expect(err).toBeInstanceOf(CliError);
      expect((err as CliError).kind).toBe("usage");
      expect((err as Error).message).toMatch(/state\.json/i);
    }
  });
});
