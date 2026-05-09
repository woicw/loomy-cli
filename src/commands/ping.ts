import type { GatewayClient } from "../client.js";

export async function runPing(client: GatewayClient, write: (s: string) => void): Promise<void> {
  await client.getJson("/healthz");
  write("ok\n");
}
