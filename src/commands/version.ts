import type { GatewayClient } from "../client.js";

interface VersionResp { gateway: string; hermes: string | null }

export async function runVersion(client: GatewayClient, cliVersion: string, write: (s: string) => void): Promise<void> {
  const v = await client.getJson<VersionResp>("/version");
  write(`loomy-cli ${cliVersion}\n`);
  write(`gateway ${v.gateway}\n`);
  write(v.hermes ? `hermes ${v.hermes}\n` : `hermes (unavailable)\n`);
}
