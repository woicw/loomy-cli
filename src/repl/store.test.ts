import { describe, it, expect } from "vitest";
import { createStore } from "./store.js";

describe("repl store", () => {
  it("beginTurn pushes a turn and sets streaming", () => {
    const s = createStore({ sessionId: "s1" });
    s.beginTurn("hello");
    const st = s.getState();
    expect(st.streaming).toBe(true);
    expect(st.turns).toHaveLength(1);
    expect(st.turns[0]!.user).toBe("hello");
    expect(st.turns[0]!.status).toBe("streaming");
    expect(st.turns[0]!.assistantText).toBe("");
  });

  it("appendAssistant accumulates into the latest turn", () => {
    const s = createStore({ sessionId: "s1" });
    s.beginTurn("hi");
    s.appendAssistant("Hel");
    s.appendAssistant("lo");
    expect(s.getState().turns[0]!.assistantText).toBe("Hello");
  });

  it("endTurn marks done and clears streaming", () => {
    const s = createStore({ sessionId: "s1" });
    s.beginTurn("hi");
    s.endTurn({ status: "done", stopReason: "end_turn" });
    const turn = s.getState().turns[0]!;
    expect(turn.status).toBe("done");
    expect(turn.stopReason).toBe("end_turn");
    expect(s.getState().streaming).toBe(false);
  });

  it("endTurn with error stores message", () => {
    const s = createStore({ sessionId: "s1" });
    s.beginTurn("hi");
    s.endTurn({ status: "error", errorMessage: "boom" });
    expect(s.getState().turns[0]!.errorMessage).toBe("boom");
  });

  it("pushTool appends to current turn tools", () => {
    const s = createStore({ sessionId: "s1" });
    s.beginTurn("hi");
    s.pushTool({ name: "bash", summary: "ls" });
    expect(s.getState().turns[0]!.tools).toEqual([{ name: "bash", summary: "ls" }]);
  });
});
