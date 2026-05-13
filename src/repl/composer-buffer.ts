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
