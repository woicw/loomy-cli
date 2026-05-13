import { useEffect, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { Box, useApp } from "ink";
import { Banner } from "./Banner.js";
import { Transcript } from "./Transcript.js";
import { Composer } from "./Composer.js";
import { StatusBar } from "./StatusBar.js";
import { createStore, type ReplState } from "./store.js";
import { parseSlash, SLASH_HELP } from "./slash.js";
import type { ChatEvent } from "./runChatStream.js";

export interface AppProps {
  initialSessionId: string;
  version: string;
  project?: string | null;
  branch?: string | null;
  preamble?: string | null;
  streamFactory: (args: { sessionId: string; message: string }) => AsyncGenerator<ChatEvent>;
  cancel: (sessionId: string) => Promise<void>;
  /** Close a session in the gateway pool (DELETE /v1/sessions/:id). Fire-and-forget on exit / /new. */
  closeSession: (sessionId: string) => Promise<void>;
}

export function App(props: AppProps) {
  const storeRef = useRef(createStore({ sessionId: props.initialSessionId }));
  const [state, setState] = useState<ReplState>(storeRef.current.getState());
  const { exit } = useApp();
  const exitTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => storeRef.current.subscribe(setState), []);
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

  // Fire-and-forget close so we don't leak gateway-side sessions against the
  // MAX_SESSIONS_PER_USER cap. Called from exit paths and /new (which abandons
  // the current sessionId).
  const closeCurrentSession = () => {
    props.closeSession(storeRef.current.getState().sessionId).catch(() => {});
  };

  const exitRepl = () => {
    closeCurrentSession();
    exit();
  };

  const sendPrompt = async (text: string) => {
    const slash = parseSlash(text);
    if (slash) {
      if (slash.cmd === "exit" || slash.cmd === "quit") { exitRepl(); return; }
      if (slash.cmd === "new") {
        closeCurrentSession();
        storeRef.current.setSessionId(randomUUID());
        return;
      }
      if (slash.cmd === "clear") {
        storeRef.current.clearTurns();
        return;
      }
      if (slash.cmd === "help") {
        storeRef.current.beginTurn("/help");
        for (const item of SLASH_HELP) storeRef.current.appendAssistant(`${item.cmd}  —  ${item.desc}\n`);
        storeRef.current.endTurn({ status: "done", stopReason: "help" });
        return;
      }
      if (slash.cmd === "cancel") {
        handleStreamCancel();
        return;
      }
      // unknown slash → show synthetic error turn
      storeRef.current.beginTurn(text);
      storeRef.current.endTurn({ status: "error", errorMessage: `unknown command: /${slash.cmd} (try /help)` });
      return;
    }
    // Non-slash input during streaming: drop to avoid state corruption from
    // beginTurn-while-streaming. Ctrl+C is the way to interrupt; non-slash
    // messages typed mid-stream are lost (MVP — queueing is v1.x backlog).
    if (storeRef.current.getState().streaming) return;
    const message = props.preamble ? `${props.preamble}\n\n${text}` : text;
    storeRef.current.beginTurn(text);
    try {
      for await (const ev of props.streamFactory({ sessionId: storeRef.current.getState().sessionId, message })) {
        if (ev.kind === "delta") storeRef.current.appendAssistant(ev.text);
        else if (ev.kind === "tool") {
          const p: any = ev.payload;
          storeRef.current.pushTool({ name: p?.name ?? "tool", summary: JSON.stringify(p?.input ?? p) });
        }
        else if (ev.kind === "done") storeRef.current.endTurn({ status: "done", stopReason: ev.stopReason });
        else if (ev.kind === "error") storeRef.current.endTurn({ status: "error", errorMessage: ev.message });
      }
      if (storeRef.current.getState().streaming) {
        storeRef.current.endTurn({ status: "done", stopReason: null });
      }
    } catch (err) {
      storeRef.current.endTurn({ status: "error", errorMessage: (err as Error).message });
    }
  };

  // Cancels the current stream if any; no-op when idle. Used by Esc and /cancel.
  const handleStreamCancel = () => {
    const st = storeRef.current.getState();
    if (!st.streaming) return;
    props.cancel(st.sessionId).catch(() => {});
    storeRef.current.endTurn({ status: "interrupted" });
  };

  // Ctrl+C: cancel current stream OR arm/confirm exit when idle.
  const handleCancel = () => {
    const st = storeRef.current.getState();
    if (st.streaming) { handleStreamCancel(); return; }
    if (st.exitArmed) { exitRepl(); return; }
    storeRef.current.setExitArmed(true);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => storeRef.current.setExitArmed(false), 2000);
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner version={props.version} sessionId={state.sessionId} project={props.project} branch={props.branch} />
      <Transcript turns={state.turns} />
      <Composer onSubmit={sendPrompt} onCancel={handleCancel} onEscape={handleStreamCancel} disabled={false} />
      <StatusBar streaming={state.streaming} exitArmed={state.exitArmed} />
    </Box>
  );
}
