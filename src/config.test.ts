import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, writeCredentials, DEFAULT_ENDPOINT } from "./config.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "loomy-cfg-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("uses default endpoint when no source provides one", () => {
    expect(() => loadConfig({ stateDir: dir, env: {}, flags: { token: "tok" } })).not.toThrow();
    const cfg = loadConfig({ stateDir: dir, env: {}, flags: { token: "tok" } });
    expect(cfg.endpoint).toBe(DEFAULT_ENDPOINT);
    expect(cfg.apiToken).toBe("tok");
  });

  it("flag wins over env wins over file", () => {
    writeCredentials(dir, { endpoint: "http://file:1", apiToken: "file-tok" });
    const fromFile = loadConfig({ stateDir: dir, env: {}, flags: {} });
    expect(fromFile.apiToken).toBe("file-tok");
    expect(fromFile.endpoint).toBe("http://file:1");

    const fromEnv = loadConfig({ stateDir: dir, env: { LOOMY_API_TOKEN: "env-tok", LOOMY_ENDPOINT: "http://env:2" }, flags: {} });
    expect(fromEnv.apiToken).toBe("env-tok");
    expect(fromEnv.endpoint).toBe("http://env:2");

    const fromFlag = loadConfig({ stateDir: dir, env: { LOOMY_API_TOKEN: "env-tok" }, flags: { token: "flag-tok", endpoint: "http://flag:3" } });
    expect(fromFlag.apiToken).toBe("flag-tok");
    expect(fromFlag.endpoint).toBe("http://flag:3");
  });

  it("throws CliError(kind=auth) when no token anywhere", () => {
    expect(() => loadConfig({ stateDir: dir, env: {}, flags: {} })).toThrow(/no token/i);
  });

  it("rejects malformed credentials.json", () => {
    writeFileSync(join(dir, "credentials.json"), "{ broken");
    expect(() => loadConfig({ stateDir: dir, env: {}, flags: {} })).toThrow();
  });
});

describe("writeCredentials", () => {
  it("writes mode 600 JSON file", () => {
    writeCredentials(dir, { endpoint: "http://x", apiToken: "y" });
    const stat = require("node:fs").statSync(join(dir, "credentials.json"));
    expect(stat.mode & 0o777).toBe(0o600);
    const parsed = JSON.parse(require("node:fs").readFileSync(join(dir, "credentials.json"), "utf8"));
    expect(parsed).toEqual({ endpoint: "http://x", apiToken: "y" });
  });
});
