import type { GatewayClient } from "../client.js";
import { runChatStream } from "../repl/runChatStream.js";
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
  const buf: string[] = [];

  for await (const ev of runChatStream({ client: opts.client, sessionId: opts.sessionId, message })) {
    if (ev.kind === "delta") {
      if (opts.mode === "json") opts.stdout(JSON.stringify({ event: "delta", text: ev.text }) + "\n");
      else if (opts.mode === "quiet") buf.push(ev.text);
      else opts.stdout(ev.text);
    } else if (ev.kind === "tool") {
      if (opts.mode === "json") opts.stdout(JSON.stringify({ event: "tool_call", payload: ev.payload }) + "\n");
      else opts.stderr(`[tool] ${JSON.stringify(ev.payload)}\n`);
    } else if (ev.kind === "done") {
      if (opts.mode === "json") opts.stdout(JSON.stringify({ event: "done", stopReason: ev.stopReason }) + "\n");
      else if (opts.mode === "quiet") opts.stdout(buf.join("") + "\n");
      else { opts.stdout("\n"); opts.stderr(`--- done (stopReason=${ev.stopReason ?? "?"})\n`); }
    } else if (ev.kind === "error") {
      throw new CliError("http5xx", ev.message);
    }
  }
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
