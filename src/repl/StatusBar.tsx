import { Box, Text } from "ink";
import Spinner from "ink-spinner";

export interface StatusBarProps {
  streaming: boolean;
  exitArmed: boolean;
  errorMessage?: string;
}

export function StatusBar({ streaming, exitArmed, errorMessage }: StatusBarProps) {
  if (errorMessage) {
    return (
      <Box>
        <Text color="red">! {errorMessage}</Text>
      </Box>
    );
  }
  if (exitArmed) {
    return (
      <Box>
        <Text color="yellow">Press Ctrl+C again to exit</Text>
      </Box>
    );
  }
  if (streaming) {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> streaming · Ctrl+C to cancel</Text>
      </Box>
    );
  }
  return (
    <Box>
      <Text dimColor>Enter to send · \↩ for newline · Ctrl+C to cancel · /exit to quit</Text>
    </Box>
  );
}
