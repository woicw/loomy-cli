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
}

export function App(props: AppProps) {
  const storeRef = useRef(createStore({ sessionId: props.initialSessionId }));
  const [state, setState] = useState<ReplState>(storeRef.current.getState());
  const { exit } = useApp();
  const exitTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => storeRef.current.subscribe(setState), []);
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

  const sendPrompt = async (text: string) => {
    const slash = parseSlash(text);
    if (slash) {
      if (slash.cmd === "exit" || slash.cmd === "quit") { exit(); return; }
      if (slash.cmd === "new") {
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
      // unknown slash → show synthetic error turn
      storeRef.current.beginTurn(text);
      storeRef.current.endTurn({ status: "error", errorMessage: `unknown command: /${slash.cmd} (try /help)` });
      return;
    }
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

  const handleCancel = () => {
    const st = storeRef.current.getState();
    if (st.streaming) {
      props.cancel(st.sessionId).catch(() => {});
      storeRef.current.endTurn({ status: "interrupted" });
      return;
    }
    if (st.exitArmed) { exit(); return; }
    storeRef.current.setExitArmed(true);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => storeRef.current.setExitArmed(false), 2000);
  };

  return (
    <Box flexDirection="column">
      <Banner version={props.version} sessionId={state.sessionId} project={props.project} branch={props.branch} />
      <Transcript turns={state.turns} />
      <Composer onSubmit={sendPrompt} onCancel={handleCancel} disabled={false} />
      <StatusBar streaming={state.streaming} exitArmed={state.exitArmed} />
    </Box>
  );
}
