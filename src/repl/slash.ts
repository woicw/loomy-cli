export interface ParsedSlash {
  cmd: string;
  args: string[];
}

export function parseSlash(input: string): ParsedSlash | null {
  if (!input.startsWith("/")) return null;
  const trimmed = input.slice(1).trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { cmd: parts[0]!.toLowerCase(), args: parts.slice(1) };
}

export const SLASH_HELP: Array<{ cmd: string; desc: string }> = [
  { cmd: "/new", desc: "start a new session (discards current)" },
  { cmd: "/cancel", desc: "cancel the in-flight assistant response" },
  { cmd: "/clear", desc: "clear the visible transcript (history kept)" },
  { cmd: "/help", desc: "show this list" },
  { cmd: "/exit, /quit", desc: "leave the REPL" },
];
