import { describe, it, expect } from "vitest";
import { emptyBuffer, type BufferState } from "./composer-buffer.js";

describe("composer-buffer initial state", () => {
  it("emptyBuffer has one empty line and cursor at 0,0", () => {
    const b: BufferState = emptyBuffer();
    expect(b.lines).toEqual([""]);
    expect(b.cursor).toEqual({ row: 0, col: 0 });
  });
});
