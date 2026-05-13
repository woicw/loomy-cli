import { describe, it, expect } from "vitest";
import { runChatStream, type ChatEvent } from "./runChatStream.js";

function makeSseResponse(events: Array<{ event: string; data: string }>): Response {
  const body = events.map((e) => `event: ${e.event}\ndata: ${e.data}\n\n`).join("");
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

describe("runChatStream", () => {
  it("yields delta, tool, done events in order", async () => {
    const fakeClient = {
      postSse: async () => makeSseResponse([
        { event: "delta", data: JSON.stringify({ text: "hel" }) },
        { event: "delta", data: JSON.stringify({ text: "lo" }) },
        { event: "tool_call", data: JSON.stringify({ name: "bash", input: {} }) },
        { event: "done", data: JSON.stringify({ stopReason: "end_turn" }) },
      ]),
    } as any;
    const events: ChatEvent[] = [];
    for await (const ev of runChatStream({ client: fakeClient, sessionId: "s1", message: "hi" })) {
      events.push(ev);
    }
    expect(events.map((e) => e.kind)).toEqual(["delta", "delta", "tool", "done"]);
    expect(events[0]).toMatchObject({ kind: "delta", text: "hel" });
    expect(events[3]).toMatchObject({ kind: "done", stopReason: "end_turn" });
  });

  it("yields error event for sse 'error' frame", async () => {
    const fakeClient = {
      postSse: async () => makeSseResponse([
        { event: "error", data: JSON.stringify({ message: "boom" }) },
      ]),
    } as any;
    const events: ChatEvent[] = [];
    for await (const ev of runChatStream({ client: fakeClient, sessionId: "s1", message: "hi" })) {
      events.push(ev);
    }
    expect(events).toEqual([{ kind: "error", message: "boom" }]);
  });
});
