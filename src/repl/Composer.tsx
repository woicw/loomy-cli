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
  onCancel?: () => void;
  disabled: boolean;
}

export function Composer({ onSubmit, onCancel, disabled }: ComposerProps) {
  const [buf, setBuf] = useState<BufferState>(emptyBuffer());

  useInput((input, key) => {
    if (disabled) return;
    if (key.ctrl && input === "c") {
      onCancel?.();
      return;
    }
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
    <Box borderStyle="round" paddingX={1}>
      <Box flexDirection="column" width="100%">
        {buf.lines.map((line, i) => {
          const isCursorRow = i === buf.cursor.row;
          if (!isCursorRow) return <Text key={i}>{line || " "}</Text>;
          const before = line.slice(0, buf.cursor.col);
          const after = line.slice(buf.cursor.col);
          return (
            <Text key={i}>
              {before}
              <Text inverse>▌</Text>
              {after}
            </Text>
          );
        })}
      </Box>
    </Box>
  );
}
