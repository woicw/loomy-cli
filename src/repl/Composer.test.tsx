import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { Composer } from "./Composer.js";

describe("<Composer/>", () => {
  it("renders empty composer with cursor", () => {
    const { lastFrame } = render(<Composer onSubmit={() => {}} disabled={false} />);
    expect(lastFrame()).toContain("▌");
  });

  it("calls onSubmit with typed text when Enter pressed", async () => {
    const onSubmit = vi.fn();
    const { stdin } = render(<Composer onSubmit={onSubmit} disabled={false} />);
    stdin.write("hi");
    await new Promise((r) => setTimeout(r, 10));
    stdin.write("\r"); // Enter
    await new Promise((r) => setTimeout(r, 10));
    expect(onSubmit).toHaveBeenCalledWith("hi");
  });

  it("does not submit when last line ends with backslash; continues on next line", async () => {
    const onSubmit = vi.fn();
    const { stdin, lastFrame } = render(<Composer onSubmit={onSubmit} disabled={false} />);
    stdin.write("foo\\");
    await new Promise((r) => setTimeout(r, 10));
    stdin.write("\r");
    await new Promise((r) => setTimeout(r, 10));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(lastFrame()).toContain("foo");
  });
});
