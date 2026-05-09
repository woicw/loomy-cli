import { describe, it, expect, vi } from "vitest";
import { runChat, runChatCancel } from "./chat.js";

function makeSseResponse(events: string[]): Response {
  const body = events.join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

describe("chat", () => {
  it("default mode streams delta.text concatenated to stdout", async () => {
    const client = {
      postSse: vi.fn().mockResolvedValue(makeSseResponse([
        "event: delta\ndata: {\"text\":\"hel\"}\n\n",
        "event: delta\ndata: {\"text\":\"lo\"}\n\n",
        "event: done\ndata: {\"stopReason\":\"end_turn\"}\n\n",
      ])),
    };
    const stdout: string[] = [];
    const stderr: string[] = [];
    await runChat({
      client: client as any,
      sessionId: "s1",
      message: "hi",
      mode: "default",
      stdout: (s) => stdout.push(s),
      stderr: (s) => stderr.push(s),
    });
    expect(client.postSse).toHaveBeenCalledWith("/v1/hermes/chat", { sessionId: "s1", message: "hi" });
    expect(stdout.join("")).toBe("hello\n");
    expect(stderr.join("")).toContain("end_turn");
  });

  it("json mode emits one JSON object per event", async () => {
    const client = {
      postSse: vi.fn().mockResolvedValue(makeSseResponse([
        "event: delta\ndata: {\"text\":\"hi\"}\n\n",
        "event: done\ndata: {\"stopReason\":\"end_turn\"}\n\n",
      ])),
    };
    const out: string[] = [];
    await runChat({
      client: client as any, sessionId: "s1", message: "x", mode: "json",
      stdout: (s) => out.push(s), stderr: () => {},
    });
    const lines = out.join("").trim().split("\n");
    expect(JSON.parse(lines[0]!)).toEqual({ event: "delta", text: "hi" });
    expect(JSON.parse(lines[1]!)).toEqual({ event: "done", stopReason: "end_turn" });
  });

  it("quiet mode buffers, prints once at done", async () => {
    const client = {
      postSse: vi.fn().mockResolvedValue(makeSseResponse([
        "event: delta\ndata: {\"text\":\"a\"}\n\n",
        "event: delta\ndata: {\"text\":\"b\"}\n\n",
        "event: done\ndata: {}\n\n",
      ])),
    };
    const out: string[] = [];
    await runChat({
      client: client as any, sessionId: "s1", message: "x", mode: "quiet",
      stdout: (s) => out.push(s), stderr: () => {},
    });
    expect(out.join("")).toBe("ab\n");
  });
});

describe("chat --cancel", () => {
  it("posts to /v1/hermes/cancel with session id", async () => {
    const client = { postJson: vi.fn().mockResolvedValue({ ok: true }) };
    const stderr: string[] = [];
    await runChatCancel({
      client: client as any, sessionId: "s1",
      stderr: (s) => stderr.push(s),
    });
    expect(client.postJson).toHaveBeenCalledWith("/v1/hermes/cancel", { sessionId: "s1" });
    expect(stderr.join("")).toContain("cancel sent");
  });
});
