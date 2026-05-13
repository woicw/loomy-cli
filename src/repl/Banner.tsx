import { Box, Text } from "ink";

export interface BannerProps {
  version: string;
  sessionId: string;
  project?: string | null;
  branch?: string | null;
}

export function Banner({ version, sessionId, project, branch }: BannerProps) {
  const shortSid = sessionId.slice(0, 8);
  const ctxParts = [];
  if (project) ctxParts.push(`项目: ${project}`);
  if (branch) ctxParts.push(`分支: ${branch}`);
  const ctx = ctxParts.join(" · ");
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>loomy v{version}</Text>
      <Text dimColor>session: {shortSid}…{ctx ? `  ·  ${ctx}` : ""}</Text>
    </Box>
  );
}
