import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInit } from "./init.js";

let dir: string;
const realFetch = globalThis.fetch;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loomy-init-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  globalThis.fetch = realFetch;
});

describe("init non-interactive", () => {
  it("writes credentials.json with the supplied values", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
    const out: string[] = [];
    await runInit({
      stateDir: dir,
      flags: { endpoint: "http://x", apiToken: "TOK", yes: true },
      stderr: (s) => out.push(s),
    });
    expect(existsSync(join(dir, "credentials.json"))).toBe(true);
    const cred = JSON.parse(readFileSync(join(dir, "credentials.json"), "utf8"));
    expect(cred).toEqual({ endpoint: "http://x", apiToken: "TOK" });
  });

  it("warns but still writes when /healthz fails", async () => {
    globalThis.fetch = vi.fn(async () => new Response("Unauthorized", { status: 401 })) as any;
    const out: string[] = [];
    await runInit({
      stateDir: dir,
      flags: { endpoint: "http://x", apiToken: "BAD", yes: true },
      stderr: (s) => out.push(s),
    });
    expect(existsSync(join(dir, "credentials.json"))).toBe(true);
    expect(out.join("")).toMatch(/healthz/i);
  });

});
