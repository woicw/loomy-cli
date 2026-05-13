import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App.js";

function makeDeps() {
  const cancelMock = vi.fn(async (): Promise<void> => {});
  return {
    initialSessionId: "sid-1",
    project: "loomy-design",
    branch: "main",
    version: "0.2.0",
    streamFactory: async function* () {
      yield { kind: "delta" as const, text: "Hi" };
      yield { kind: "delta" as const, text: " there" };
      yield { kind: "done" as const, stopReason: "end_turn" };
    },
    cancel: cancelMock,
  };
}

describe("<App/>", () => {
  it("renders banner + composer on launch", () => {
    const { lastFrame } = render(<App {...makeDeps()} />);
    const out = lastFrame() ?? "";
    expect(out).toContain("loomy v0.2.0");
    expect(out).toContain("sid-1".slice(0, 8));
    expect(out).toContain("Enter to send");
  });

  it("runs a turn: shows user prompt then assistant accumulation", async () => {
    const deps = makeDeps();
    const { stdin, lastFrame } = render(<App {...deps} />);
    stdin.write("ping");
    await new Promise((r) => setTimeout(r, 10));
    stdin.write("\r");
    await new Promise((r) => setTimeout(r, 30));
    const out = lastFrame() ?? "";
    expect(out).toContain("> ping");
    expect(out).toContain("Hi there");
  });
});
