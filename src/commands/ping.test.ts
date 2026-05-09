import { describe, it, expect, vi } from "vitest";
import { runPing } from "./ping.js";

describe("ping", () => {
  it("calls /healthz and prints ok", async () => {
    const client = { getJson: vi.fn().mockResolvedValue({ ok: true }) };
    const out: string[] = [];
    await runPing(client as any, (s) => out.push(s));
    expect(client.getJson).toHaveBeenCalledWith("/healthz");
    expect(out.join("")).toMatch(/ok/i);
  });
});
