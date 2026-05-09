import { describe, it, expect, vi } from "vitest";
import { runVersion } from "./version.js";

describe("version", () => {
  it("prints gateway and cli versions", async () => {
    const client = { getJson: vi.fn().mockResolvedValue({ gateway: "0.1.0", hermes: "0.11.0" }) };
    const out: string[] = [];
    await runVersion(client as any, "0.1.0", (s) => out.push(s));
    const text = out.join("");
    expect(text).toContain("loomy-cli 0.1.0");
    expect(text).toContain("gateway 0.1.0");
    expect(text).toContain("hermes 0.11.0");
  });

  it("handles hermes=null", async () => {
    const client = { getJson: vi.fn().mockResolvedValue({ gateway: "0.1.0", hermes: null }) };
    const out: string[] = [];
    await runVersion(client as any, "0.1.0", (s) => out.push(s));
    expect(out.join("")).toContain("hermes (unavailable)");
  });
});
