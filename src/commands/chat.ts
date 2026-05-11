import type { GatewayClient } from "../client.js";
import { parseSseStream } from "../sse.js";
import { CliError } from "../errors.js";

export type RenderMode = "default" | "json" | "quiet";

export interface RunChatOpts {
  client: GatewayClient;
  sessionId: string;
  message: string;
  mode: RenderMode;
  preamble?: string | null;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

export async function runChat(opts: RunChatOpts): Promise<void> {
  const message = opts.preamble ? `${opts.preamble}\n\n${opts.message}` : opts.message;
  const res = await opts.client.postSse("/v1/hermes/chat", {
    sessionId: opts.sessionId,
    message,
  });
  if (!res.body) throw new CliError("network", "no response body from /v1/hermes/chat");

  const buf: string[] = [];

  for await (const ev of parseSseStream(res.body)) {
    if (ev.event === "delta") {
      const parsed = safeParse(ev.data);
      const text = typeof parsed?.text === "string" ? parsed.text : "";
      if (opts.mode === "json") {
        opts.stdout(JSON.stringify({ event: "delta", text }) + "\n");
      } else if (opts.mode === "quiet") {
        buf.push(text);
      } else {
        opts.stdout(text);
      }
    } else if (ev.event === "tool_call") {
      const parsed = safeParse(ev.data);
      if (opts.mode === "json") {
        opts.stdout(JSON.stringify({ event: "tool_call", payload: parsed }) + "\n");
      } else {
        opts.stderr(`[tool] ${JSON.stringify(parsed)}\n`);
      }
    } else if (ev.event === "done") {
      const parsed = safeParse(ev.data);
      const stopReason = typeof parsed?.stopReason === "string" ? parsed.stopReason : null;
      if (opts.mode === "json") {
        opts.stdout(JSON.stringify({ event: "done", stopReason }) + "\n");
      } else if (opts.mode === "quiet") {
        opts.stdout(buf.join("") + "\n");
      } else {
        opts.stdout("\n");
        opts.stderr(`--- done (stopReason=${stopReason ?? "?"})\n`);
      }
    } else if (ev.event === "error") {
      const parsed = safeParse(ev.data);
      const msg = typeof parsed?.message === "string" ? parsed.message : ev.data;
      throw new CliError("http5xx", msg);
    }
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return undefined; }
}

export interface RunChatCancelOpts {
  client: GatewayClient;
  sessionId: string;
  stderr: (s: string) => void;
}

export async function runChatCancel(opts: RunChatCancelOpts): Promise<void> {
  await opts.client.postJson("/v1/hermes/cancel", { sessionId: opts.sessionId });
  opts.stderr(`cancel sent (sessionId=${opts.sessionId})\n`);
}
