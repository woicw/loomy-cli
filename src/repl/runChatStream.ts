import type { GatewayClient } from "../client.js";
import { parseSseStream } from "../sse.js";
import { CliError } from "../errors.js";

export type ChatEvent =
  | { kind: "delta"; text: string }
  | { kind: "tool"; payload: unknown }
  | { kind: "done"; stopReason: string | null }
  | { kind: "error"; message: string };

export interface RunChatStreamOpts {
  client: Pick<GatewayClient, "postSse">;
  sessionId: string;
  message: string;
}

export async function* runChatStream(opts: RunChatStreamOpts): AsyncGenerator<ChatEvent> {
  const res = await opts.client.postSse("/v1/hermes/chat", {
    sessionId: opts.sessionId,
    message: opts.message,
  });
  if (!res.body) throw new CliError("network", "no response body from /v1/hermes/chat");

  for await (const ev of parseSseStream(res.body)) {
    if (ev.event === "delta") {
      const parsed = safeParse(ev.data);
      const text = typeof parsed?.text === "string" ? parsed.text : "";
      yield { kind: "delta", text };
    } else if (ev.event === "tool_call") {
      yield { kind: "tool", payload: safeParse(ev.data) };
    } else if (ev.event === "done") {
      const parsed = safeParse(ev.data);
      yield { kind: "done", stopReason: typeof parsed?.stopReason === "string" ? parsed.stopReason : null };
    } else if (ev.event === "error") {
      const parsed = safeParse(ev.data);
      yield { kind: "error", message: typeof parsed?.message === "string" ? parsed.message : ev.data };
    }
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}
