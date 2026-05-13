import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { TurnView } from "./Turn.js";
import type { Turn } from "./store.js";

const baseTurn: Turn = {
  id: "1", user: "hello", assistantText: "world", tools: [], status: "done", stopReason: "end_turn",
};

describe("<TurnView/>", () => {
  it("renders user prompt with > prefix", () => {
    const { lastFrame } = render(<TurnView turn={baseTurn} />);
    expect(lastFrame()).toContain("> hello");
  });

  it("renders assistant body", () => {
    const { lastFrame } = render(<TurnView turn={baseTurn} />);
    expect(lastFrame()).toContain("world");
  });

  it("renders tool calls inline", () => {
    const t: Turn = { ...baseTurn, tools: [{ name: "bash", summary: "ls /" }] };
    const { lastFrame } = render(<TurnView turn={t} />);
    expect(lastFrame()).toContain("[tool: bash]");
  });

  it("renders error marker for error turn", () => {
    const t: Turn = { ...baseTurn, status: "error", errorMessage: "boom" };
    const { lastFrame } = render(<TurnView turn={t} />);
    expect(lastFrame()).toContain("✗");
    expect(lastFrame()).toContain("boom");
  });

  it("renders interrupted marker", () => {
    const t: Turn = { ...baseTurn, status: "interrupted" };
    const { lastFrame } = render(<TurnView turn={t} />);
    expect(lastFrame()).toContain("^C cancelled");
  });
});
