import { describe, it, expect } from "vitest";
import { emptyBuffer, insertChar, type BufferState } from "./composer-buffer.js";

describe("composer-buffer initial state", () => {
  it("emptyBuffer has one empty line and cursor at 0,0", () => {
    const b: BufferState = emptyBuffer();
    expect(b.lines).toEqual([""]);
    expect(b.cursor).toEqual({ row: 0, col: 0 });
  });
});

describe("insertChar", () => {
  it("inserts a char at the cursor and advances col", () => {
    const b1 = insertChar(emptyBuffer(), "h");
    const b2 = insertChar(b1, "i");
    expect(b2.lines).toEqual(["hi"]);
    expect(b2.cursor).toEqual({ row: 0, col: 2 });
  });

  it("inserts in the middle of a line", () => {
    const b: BufferState = { lines: ["hell"], cursor: { row: 0, col: 2 } };
    const next = insertChar(b, "X");
    expect(next.lines).toEqual(["heXll"]);
    expect(next.cursor).toEqual({ row: 0, col: 3 });
  });

  it("treats multi-codepoint strings as one insert event preserving newlines", () => {
    const b = insertChar(emptyBuffer(), "foo\nbar");
    expect(b.lines).toEqual(["foo", "bar"]);
    expect(b.cursor).toEqual({ row: 1, col: 3 });
  });
});
