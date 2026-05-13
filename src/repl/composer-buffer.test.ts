import { describe, it, expect } from "vitest";
import { emptyBuffer, insertChar, backspace, moveCursor, shouldSubmit, finalize, newline, type BufferState } from "./composer-buffer.js";

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

describe("backspace", () => {
  it("deletes char before cursor on same line", () => {
    const b: BufferState = { lines: ["abc"], cursor: { row: 0, col: 2 } };
    const next = backspace(b);
    expect(next.lines).toEqual(["ac"]);
    expect(next.cursor).toEqual({ row: 0, col: 1 });
  });

  it("merges with previous line when at col 0", () => {
    const b: BufferState = { lines: ["foo", "bar"], cursor: { row: 1, col: 0 } };
    const next = backspace(b);
    expect(next.lines).toEqual(["foobar"]);
    expect(next.cursor).toEqual({ row: 0, col: 3 });
  });

  it("no-op at start of first line", () => {
    const b = emptyBuffer();
    expect(backspace(b)).toEqual(b);
  });
});

describe("moveCursor", () => {
  it("right within line", () => {
    expect(moveCursor({ lines: ["abc"], cursor: { row: 0, col: 1 } }, "right").cursor).toEqual({ row: 0, col: 2 });
  });
  it("right at end wraps to next line", () => {
    const b: BufferState = { lines: ["ab", "cd"], cursor: { row: 0, col: 2 } };
    expect(moveCursor(b, "right").cursor).toEqual({ row: 1, col: 0 });
  });
  it("left at start wraps to prev line end", () => {
    const b: BufferState = { lines: ["ab", "cd"], cursor: { row: 1, col: 0 } };
    expect(moveCursor(b, "left").cursor).toEqual({ row: 0, col: 2 });
  });
  it("up moves to same col on prev line, clamped", () => {
    const b: BufferState = { lines: ["a", "bcde"], cursor: { row: 1, col: 3 } };
    expect(moveCursor(b, "up").cursor).toEqual({ row: 0, col: 1 });
  });
  it("down at last line is no-op", () => {
    const b: BufferState = { lines: ["abc"], cursor: { row: 0, col: 2 } };
    expect(moveCursor(b, "down")).toEqual(b);
  });
});

describe("submit decision", () => {
  it("plain content submits", () => {
    expect(shouldSubmit({ lines: ["hello"], cursor: { row: 0, col: 5 } })).toBe(true);
  });
  it("backslash at end means continue", () => {
    expect(shouldSubmit({ lines: ["hello\\"], cursor: { row: 0, col: 6 } })).toBe(false);
  });
  it("multi-line with last line ending in \\ continues", () => {
    expect(shouldSubmit({ lines: ["a", "b\\"], cursor: { row: 1, col: 2 } })).toBe(false);
  });
  it("empty buffer does not submit", () => {
    expect(shouldSubmit(emptyBuffer())).toBe(false);
  });
});

describe("finalize", () => {
  it("joins lines with \\n and strips trailing \\ continuations", () => {
    expect(finalize({ lines: ["hello\\", "world"], cursor: { row: 1, col: 5 } })).toBe("hello\nworld");
  });
  it("does not strip backslashes mid-line", () => {
    expect(finalize({ lines: ["a\\b", "c"], cursor: { row: 1, col: 1 } })).toBe("a\\b\nc");
  });
});

describe("newline", () => {
  it("splits the current line at cursor", () => {
    const b: BufferState = { lines: ["hello"], cursor: { row: 0, col: 3 } };
    const next = newline(b);
    expect(next.lines).toEqual(["hel", "lo"]);
    expect(next.cursor).toEqual({ row: 1, col: 0 });
  });
});
