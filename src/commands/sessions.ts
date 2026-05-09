import type { GatewayClient } from "../client.js";

export async function runSessionsList(client: GatewayClient, write: (s: string) => void): Promise<void> {
  const r = await client.getJson<{ sessions: string[] }>("/v1/hermes/sessions");
  for (const id of r.sessions) write(`${id}\n`);
}

export async function runSessionsRm(client: GatewayClient, id: string, write: (s: string) => void): Promise<void> {
  await client.deleteJson(`/v1/hermes/sessions/${encodeURIComponent(id)}`);
  write(`removed ${id}\n`);
}
