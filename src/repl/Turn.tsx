import { Box, Text } from "ink";
import type { Turn } from "./store.js";

export function TurnView({ turn }: { turn: Turn }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan">{`> ${turn.user}`}</Text>
      {turn.tools.map((t, i) => (
        <Text key={i} dimColor>{`[tool: ${t.name}] ${t.summary}`}</Text>
      ))}
      {turn.assistantText && <Text>{turn.assistantText}</Text>}
      {turn.status === "interrupted" && <Text color="yellow">^C cancelled</Text>}
      {turn.status === "error" && <Text color="red">{`✗ ${turn.errorMessage ?? "error"}`}</Text>}
    </Box>
  );
}
