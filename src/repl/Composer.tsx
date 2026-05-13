import { useState } from "react";
import { Box, Text, useInput } from "ink";
import {
  emptyBuffer,
  insertChar,
  backspace,
  moveCursor,
  shouldSubmit,
  newline,
  finalize,
  type BufferState,
} from "./composer-buffer.js";

export interface ComposerProps {
  onSubmit: (text: string) => void;
  /** Ctrl+C handler: cancel current stream or arm exit (App owns the policy). */
  onCancel?: () => void;
  /** Esc handler: cancel current stream only; no-op when idle. */
  onEscape?: () => void;
  disabled: boolean;
}

export function Composer({ onSubmit, onCancel, onEscape, disabled }: ComposerProps) {
  const [buf, setBuf] = useState<BufferState>(emptyBuffer());

  useInput((input, key) => {
    // Ctrl+C and Esc are always honored, even when disabled — they're the
    // only way to interrupt a runaway stream.
    if (key.ctrl && input === "c") {
      onCancel?.();
      return;
    }
    if (key.escape) {
      onEscape?.();
      return;
    }
    if (disabled) return;
    if (key.return) {
      if (shouldSubmit(buf)) {
        const text = finalize(buf);
        setBuf(emptyBuffer());
        onSubmit(text);
      } else {
        const lastIdx = buf.lines.length - 1;
        const last = buf.lines[lastIdx] ?? "";
        const stripped = last.endsWith("\\") ? last.slice(0, -1) : last;
        const withStripped = { ...buf, lines: [...buf.lines.slice(0, lastIdx), stripped], cursor: { row: lastIdx, col: stripped.length } };
        setBuf(newline(withStripped));
      }
      return;
    }
    if (key.backspace || key.delete) {
      setBuf(backspace(buf));
      return;
    }
    if (key.leftArrow) { setBuf(moveCursor(buf, "left")); return; }
    if (key.rightArrow) { setBuf(moveCursor(buf, "right")); return; }
    if (key.upArrow) { setBuf(moveCursor(buf, "up")); return; }
    if (key.downArrow) { setBuf(moveCursor(buf, "down")); return; }
    if (input && !key.ctrl && !key.meta) {
      setBuf(insertChar(buf, input));
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      {buf.lines.map((line, i) => {
        const isCursorRow = i === buf.cursor.row;
        const prefix = i === 0 ? "> " : "  ";
        if (!isCursorRow) return <Text key={i} dimColor={i > 0}>{prefix}{line || " "}</Text>;
        const before = line.slice(0, buf.cursor.col);
        const after = line.slice(buf.cursor.col);
        return (
          <Text key={i} dimColor={i > 0}>
            {prefix}
            {before}
            <Text inverse>▌</Text>
            {after}
          </Text>
        );
      })}
    </Box>
  );
}
