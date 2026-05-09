import { describe, it, expect } from "vitest";
import { parseSseStream } from "./sse.js";

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]!));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of it) out.push(v);
  return out;
}

describe("parseSseStream", () => {
  it("parses event + data line pairs", async () => {
    const stream = streamFrom([
      "event: delta\ndata: {\"text\":\"hi\"}\n\n",
      "event: done\ndata: {\"stopReason\":\"end_turn\"}\n\n",
    ]);
    const events = await collect(parseSseStream(stream));
    expect(events).toEqual([
      { event: "delta", data: '{"text":"hi"}' },
      { event: "done", data: '{"stopReason":"end_turn"}' },
    ]);
  });

  it("handles chunks split across boundaries", async () => {
    const stream = streamFrom([
      "event: delta\nda",
      "ta: {\"text\":\"hi\"}\n\nevent: done\ndata: {}\n\n",
    ]);
    const events = await collect(parseSseStream(stream));
    expect(events).toEqual([
      { event: "delta", data: '{"text":"hi"}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("ignores comments and unknown fields", async () => {
    const stream = streamFrom([
      ":heartbeat\nid: 1\nevent: delta\ndata: x\n\n",
    ]);
    const events = await collect(parseSseStream(stream));
    expect(events).toEqual([{ event: "delta", data: "x" }]);
  });

  it("treats absent event as default `message`", async () => {
    const stream = streamFrom(["data: hello\n\n"]);
    const events = await collect(parseSseStream(stream));
    expect(events).toEqual([{ event: "message", data: "hello" }]);
  });
});
