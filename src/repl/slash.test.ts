import { describe, it, expect } from "vitest";
import { parseSlash } from "./slash.js";

describe("parseSlash", () => {
  it("returns null for non-slash input", () => {
    expect(parseSlash("hello")).toBeNull();
    expect(parseSlash("  /not-leading")).toBeNull();
  });
  it("parses bare command", () => {
    expect(parseSlash("/new")).toEqual({ cmd: "new", args: [] });
  });
  it("parses command with args", () => {
    expect(parseSlash("/resume abc-123")).toEqual({ cmd: "resume", args: ["abc-123"] });
  });
  it("trims trailing whitespace", () => {
    expect(parseSlash("/exit   ")).toEqual({ cmd: "exit", args: [] });
  });
  it("lowercases the command", () => {
    expect(parseSlash("/EXIT")).toEqual({ cmd: "exit", args: [] });
  });
  it("tolerates whitespace immediately after the slash", () => {
    expect(parseSlash("/ help")).toEqual({ cmd: "help", args: [] });
  });
});
