import { describe, it, expect, vi } from "vitest";
import { runSessionsList, runSessionsRm } from "./sessions.js";

describe("sessions list", () => {
  it("prints each session id on its own line", async () => {
    const client = { getJson: vi.fn().mockResolvedValue({ sessions: ["s1", "s2"] }) };
    const out: string[] = [];
    await runSessionsList(client as any, (s) => out.push(s));
    expect(client.getJson).toHaveBeenCalledWith("/v1/hermes/sessions");
    expect(out.join("")).toBe("s1\ns2\n");
  });

  it("prints nothing when empty (just exits)", async () => {
    const client = { getJson: vi.fn().mockResolvedValue({ sessions: [] }) };
    const out: string[] = [];
    await runSessionsList(client as any, (s) => out.push(s));
    expect(out).toEqual([]);
  });
});

describe("sessions rm", () => {
  it("calls DELETE on the session path", async () => {
    const client = { deleteJson: vi.fn().mockResolvedValue({ ok: true }) };
    const out: string[] = [];
    await runSessionsRm(client as any, "abc", (s) => out.push(s));
    expect(client.deleteJson).toHaveBeenCalledWith("/v1/hermes/sessions/abc");
    expect(out.join("")).toContain("removed abc");
  });
});
