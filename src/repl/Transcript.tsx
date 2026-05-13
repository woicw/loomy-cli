import { Box } from "ink";
import type { Turn } from "./store.js";
import { TurnView } from "./Turn.js";

export function Transcript({ turns }: { turns: Turn[] }) {
  return (
    <Box flexDirection="column">
      {turns.map((t) => <TurnView key={t.id} turn={t} />)}
    </Box>
  );
}
