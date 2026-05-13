import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { StatusBar } from "./StatusBar.js";

describe("<StatusBar/>", () => {
  it("shows default keyhint when idle", () => {
    const { lastFrame } = render(<StatusBar streaming={false} exitArmed={false} />);
    expect(lastFrame()).toContain("Enter to send");
    expect(lastFrame()).toContain("Ctrl+C");
  });
  it("shows streaming spinner text when streaming", () => {
    const { lastFrame } = render(<StatusBar streaming={true} exitArmed={false} />);
    expect(lastFrame()).toMatch(/streaming|thinking/i);
  });
  it("warns when exit is armed", () => {
    const { lastFrame } = render(<StatusBar streaming={false} exitArmed={true} />);
    expect(lastFrame()).toContain("again to exit");
  });
});
