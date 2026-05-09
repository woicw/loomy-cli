import { describe, it, expect } from "vitest";
import { CliError, exitCodeFor } from "./errors.js";

describe("CliError", () => {
  it("carries kind and message", () => {
    const e = new CliError("auth", "no token");
    expect(e.kind).toBe("auth");
    expect(e.message).toBe("no token");
    expect(e instanceof Error).toBe(true);
  });
});

describe("exitCodeFor", () => {
  it.each([
    ["usage", 2],
    ["auth", 4],
    ["network", 5],
    ["http4xx", 6],
    ["http5xx", 7],
    ["unknown", 1],
  ])("%s -> %d", (kind, code) => {
    expect(exitCodeFor(kind as any)).toBe(code);
  });
});
