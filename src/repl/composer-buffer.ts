export interface BufferState {
  lines: string[];
  cursor: { row: number; col: number };
}

export function emptyBuffer(): BufferState {
  return { lines: [""], cursor: { row: 0, col: 0 } };
}
