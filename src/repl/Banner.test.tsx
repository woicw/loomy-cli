import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { Banner } from "./Banner.js";

describe("<Banner/>", () => {
  it("shows version, sessionId short, and project context", () => {
    const { lastFrame } = render(
      <Banner version="0.2.0" sessionId="019e1f0e-7e39-701d-9d2c-c970610567db" project="loomy-design" branch="main" />,
    );
    const out = lastFrame() ?? "";
    expect(out).toContain("loomy v0.2.0");
    expect(out).toContain("019e1f0e");
    expect(out).toContain("loomy-design");
    expect(out).toContain("main");
  });

  it("renders without project info when context is missing", () => {
    const { lastFrame } = render(<Banner version="0.2.0" sessionId="abc-def" />);
    expect(lastFrame()).toContain("loomy v0.2.0");
  });
});
