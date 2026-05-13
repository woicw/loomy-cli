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
  it("resolves token for the supplied username and writes credentials.json", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
    const out: string[] = [];
    await runInit({
      stateDir: dir,
      flags: { endpoint: "http://x", user: "alice", yes: true },
      stderr: (s) => out.push(s),
      resolveToken: (u) => `T-${u}-deadbeef`,
    });
    expect(existsSync(join(dir, "credentials.json"))).toBe(true);
    const cred = JSON.parse(readFileSync(join(dir, "credentials.json"), "utf8"));
    expect(cred).toEqual({ endpoint: "http://x", apiToken: "T-alice-deadbeef" });
    expect(out.join("")).toMatch(/resolved token for user 'alice'/);
  });

  it("persists --workspace-root flag value", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
    await runInit({
      stateDir: dir,
      flags: { endpoint: "http://x", user: "alice", workspaceRoot: "~/code", yes: true },
      stderr: () => {},
      resolveToken: () => "TOK",
    });
    const cred = JSON.parse(readFileSync(join(dir, "credentials.json"), "utf8"));
    expect(cred.workspaceRoot).toBe("~/code");
  });

  it("omits workspaceRoot from credentials when neither flag nor existing value set", async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as any;
    await runInit({
      stateDir: dir,
      flags: { endpoint: "http://x", user: "alice", yes: true },
      stderr: () => {},
      resolveToken: () => "TOK",
    });
    const cred = JSON.parse(readFileSync(join(dir, "credentials.json"), "utf8"));
    expect("workspaceRoot" in cred).toBe(false);
  });

  it("warns but still writes when /healthz fails", async () => {
    globalThis.fetch = vi.fn(async () => new Response("Unauthorized", { status: 401 })) as any;
    const out: string[] = [];
    await runInit({
      stateDir: dir,
      flags: { endpoint: "http://x", user: "alice", yes: true },
      stderr: (s) => out.push(s),
      resolveToken: () => "BAD",
    });
    expect(existsSync(join(dir, "credentials.json"))).toBe(true);
    expect(out.join("")).toMatch(/healthz/i);
  });

  it("propagates resolver error (e.g. unknown user)", async () => {
    await expect(
      runInit({
        stateDir: dir,
        flags: { endpoint: "http://x", user: "ghost", yes: true },
        stderr: () => {},
        resolveToken: () => {
          throw new Error("user 'ghost' not registered on server");
        },
      }),
    ).rejects.toThrow(/not registered/);
    expect(existsSync(join(dir, "credentials.json"))).toBe(false);
  });
});
