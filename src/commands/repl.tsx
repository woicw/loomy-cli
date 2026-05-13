import { render } from "ink";
import type { GatewayClient } from "../client.js";
import { runChatStream } from "../repl/runChatStream.js";
import { App } from "../repl/App.js";

export interface RunReplOpts {
  client: GatewayClient;
  sessionId: string;
  version: string;
  project?: string | null;
  branch?: string | null;
  preamble?: string | null;
}

export async function runRepl(opts: RunReplOpts): Promise<void> {
  const streamFactory = (args: { sessionId: string; message: string }) =>
    runChatStream({ client: opts.client, sessionId: args.sessionId, message: args.message });
  const cancel = async (sessionId: string) => {
    await opts.client.postJson("/v1/hermes/cancel", { sessionId });
  };
  const closeSession = async (sessionId: string) => {
    await opts.client.deleteJson(`/v1/hermes/sessions/${encodeURIComponent(sessionId)}`);
  };
  const { waitUntilExit } = render(
    <App
      initialSessionId={opts.sessionId}
      version={opts.version}
      project={opts.project ?? null}
      branch={opts.branch ?? null}
      preamble={opts.preamble ?? null}
      streamFactory={streamFactory}
      cancel={cancel}
      closeSession={closeSession}
    />,
  );
  await waitUntilExit();
}
