export interface BufferState {
  lines: string[];
  cursor: { row: number; col: number };
}

export function emptyBuffer(): BufferState {
  return { lines: [""], cursor: { row: 0, col: 0 } };
}

export function insertChar(b: BufferState, ch: string): BufferState {
  if (ch.includes("\n")) {
    const parts = ch.split("\n");
    const currentLine = b.lines[b.cursor.row] ?? "";
    const before = currentLine.slice(0, b.cursor.col);
    const after = currentLine.slice(b.cursor.col);
    const newLines = [...b.lines];
    newLines.splice(
      b.cursor.row,
      1,
      before + parts[0],
      ...parts.slice(1, -1),
      parts[parts.length - 1] + after,
    );
    const lastPart = parts[parts.length - 1] ?? "";
    return {
      lines: newLines,
      cursor: { row: b.cursor.row + parts.length - 1, col: lastPart.length },
    };
  }
  const line = b.lines[b.cursor.row] ?? "";
  const next = line.slice(0, b.cursor.col) + ch + line.slice(b.cursor.col);
  const newLines = [...b.lines];
  newLines[b.cursor.row] = next;
  return {
    lines: newLines,
    cursor: { row: b.cursor.row, col: b.cursor.col + ch.length },
  };
}

export function backspace(b: BufferState): BufferState {
  if (b.cursor.col === 0 && b.cursor.row === 0) return b;
  if (b.cursor.col === 0) {
    const prev = b.lines[b.cursor.row - 1] ?? "";
    const curr = b.lines[b.cursor.row] ?? "";
    const newLines = [...b.lines];
    newLines.splice(b.cursor.row - 1, 2, prev + curr);
    return { lines: newLines, cursor: { row: b.cursor.row - 1, col: prev.length } };
  }
  const line = b.lines[b.cursor.row] ?? "";
  const next = line.slice(0, b.cursor.col - 1) + line.slice(b.cursor.col);
  const newLines = [...b.lines];
  newLines[b.cursor.row] = next;
  return { lines: newLines, cursor: { row: b.cursor.row, col: b.cursor.col - 1 } };
}

export type MoveDir = "left" | "right" | "up" | "down";

export function moveCursor(b: BufferState, dir: MoveDir): BufferState {
  const { row, col } = b.cursor;
  if (dir === "left") {
    if (col > 0) return { ...b, cursor: { row, col: col - 1 } };
    if (row > 0) return { ...b, cursor: { row: row - 1, col: (b.lines[row - 1] ?? "").length } };
    return b;
  }
  if (dir === "right") {
    const lineLen = (b.lines[row] ?? "").length;
    if (col < lineLen) return { ...b, cursor: { row, col: col + 1 } };
    if (row < b.lines.length - 1) return { ...b, cursor: { row: row + 1, col: 0 } };
    return b;
  }
  if (dir === "up") {
    if (row === 0) return b;
    const prevLen = (b.lines[row - 1] ?? "").length;
    return { ...b, cursor: { row: row - 1, col: Math.min(col, prevLen) } };
  }
  if (row >= b.lines.length - 1) return b;
  const nextLen = (b.lines[row + 1] ?? "").length;
  return { ...b, cursor: { row: row + 1, col: Math.min(col, nextLen) } };
}
