import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInstall, runInstallList } from "./install.js";

let assets: string;
let target: string;

beforeEach(() => {
  assets = mkdtempSync(join(tmpdir(), "loomy-assets-"));
  target = mkdtempSync(join(tmpdir(), "loomy-target-"));
  mkdirSync(join(assets, "loomy-basics"), { recursive: true });
  writeFileSync(join(assets, "loomy-basics", "SKILL.md"), "# loomy-basics\nteach the agent\n");
  mkdirSync(join(assets, "another"), { recursive: true });
  writeFileSync(join(assets, "another", "SKILL.md"), "# another\n");
});

afterEach(() => {
  rmSync(assets, { recursive: true, force: true });
  rmSync(target, { recursive: true, force: true });
});

describe("install --list", () => {
  it("lists bundled skills", async () => {
    const out: string[] = [];
    await runInstallList({ assetsDir: assets, write: (s) => out.push(s) });
    const text = out.join("");
    expect(text).toContain("loomy-basics");
    expect(text).toContain("another");
  });
});

describe("install --skill", () => {
  it("copies a single skill to target", async () => {
    const out: string[] = [];
    await runInstall({ assetsDir: assets, targetDir: target, skills: ["loomy-basics"], force: false, write: (s) => out.push(s) });
    const dest = join(target, "loomy-basics", "SKILL.md");
    expect(existsSync(dest)).toBe(true);
    expect(readFileSync(dest, "utf8")).toContain("teach the agent");
  });

  it("copies multiple skills", async () => {
    await runInstall({ assetsDir: assets, targetDir: target, skills: ["loomy-basics", "another"], force: false, write: () => {} });
    expect(existsSync(join(target, "loomy-basics", "SKILL.md"))).toBe(true);
    expect(existsSync(join(target, "another", "SKILL.md"))).toBe(true);
  });

  it("rejects unknown skill", async () => {
    await expect(runInstall({ assetsDir: assets, targetDir: target, skills: ["nope"], force: false, write: () => {} }))
      .rejects.toThrow(/unknown skill/i);
  });

  it("refuses to overwrite without --force", async () => {
    mkdirSync(join(target, "loomy-basics"), { recursive: true });
    writeFileSync(join(target, "loomy-basics", "SKILL.md"), "old\n");
    await expect(runInstall({ assetsDir: assets, targetDir: target, skills: ["loomy-basics"], force: false, write: () => {} }))
      .rejects.toThrow(/exists/i);
  });

  it("overwrites with --force", async () => {
    mkdirSync(join(target, "loomy-basics"), { recursive: true });
    writeFileSync(join(target, "loomy-basics", "SKILL.md"), "old\n");
    await runInstall({ assetsDir: assets, targetDir: target, skills: ["loomy-basics"], force: true, write: () => {} });
    expect(readFileSync(join(target, "loomy-basics", "SKILL.md"), "utf8")).toContain("teach the agent");
  });
});
