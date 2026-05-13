import { randomUUID } from "node:crypto";

export interface Turn {
  id: string;
  user: string;
  assistantText: string;
  tools: Array<{ name: string; summary: string }>;
  status: "streaming" | "done" | "interrupted" | "error";
  stopReason?: string;
  errorMessage?: string;
}

export interface ReplState {
  turns: Turn[];
  streaming: boolean;
  sessionId: string;
  queuedNext?: string;
  exitArmed: boolean;
}

type Listener = (s: ReplState) => void;

export interface ReplStore {
  getState(): ReplState;
  subscribe(fn: Listener): () => void;
  setSessionId(id: string): void;
  beginTurn(user: string): void;
  appendAssistant(text: string): void;
  pushTool(t: { name: string; summary: string }): void;
  endTurn(
    arg:
      | { status: "done"; stopReason: string | null }
      | { status: "interrupted" }
      | { status: "error"; errorMessage: string },
  ): void;
  clearTurns(): void;
  setQueued(text: string | undefined): void;
  setExitArmed(armed: boolean): void;
}

export function createStore(init: { sessionId: string }): ReplStore {
  let state: ReplState = {
    turns: [],
    streaming: false,
    sessionId: init.sessionId,
    exitArmed: false,
  };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((fn) => fn(state));
  const mutate = (patch: Partial<ReplState>) => {
    state = { ...state, ...patch };
    emit();
  };
  const mutateLastTurn = (patch: Partial<Turn>) => {
    if (state.turns.length === 0) return;
    const turns = [...state.turns];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    turns[turns.length - 1] = { ...turns[turns.length - 1]!, ...patch };
    mutate({ turns });
  };

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setSessionId(id) {
      mutate({ sessionId: id });
    },
    beginTurn(user) {
      const t: Turn = {
        id: randomUUID(),
        user,
        assistantText: "",
        tools: [],
        status: "streaming",
      };
      mutate({ turns: [...state.turns, t], streaming: true });
    },
    appendAssistant(text) {
      if (state.turns.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const last = state.turns[state.turns.length - 1]!;
      mutateLastTurn({ assistantText: last.assistantText + text });
    },
    pushTool(t) {
      if (state.turns.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const last = state.turns[state.turns.length - 1]!;
      mutateLastTurn({ tools: [...last.tools, t] });
    },
    endTurn(arg) {
      if (arg.status === "done")
        mutateLastTurn({ status: "done", stopReason: arg.stopReason ?? undefined });
      else if (arg.status === "interrupted") mutateLastTurn({ status: "interrupted" });
      else mutateLastTurn({ status: "error", errorMessage: arg.errorMessage });
      mutate({ streaming: false });
    },
    clearTurns() { mutate({ turns: [] }); },
    setQueued(text) {
      mutate({ queuedNext: text });
    },
    setExitArmed(armed) {
      mutate({ exitArmed: armed });
    },
  };
}
