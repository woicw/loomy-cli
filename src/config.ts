import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";
import { CliError } from "./errors.js";
import { defaultStateDir } from "./state.js";

export const DEFAULT_ENDPOINT = "http://172.31.250.82:16888";

const CredentialsSchema = z.object({
  endpoint: z.string().url().optional(),
  apiToken: z.string().min(1),
});
export type Credentials = z.infer<typeof CredentialsSchema>;

export interface Config {
  endpoint: string;
  apiToken: string;
}

export interface LoadConfigInput {
  stateDir?: string;
  env?: Record<string, string | undefined>;
  flags?: { token?: string; endpoint?: string };
}

function credPath(dir: string): string {
  return join(dir, "credentials.json");
}

export function readCredentials(dir: string = defaultStateDir()): Credentials | null {
  const p = credPath(dir);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  return CredentialsSchema.parse(JSON.parse(raw));
}

export function writeCredentials(dir: string = defaultStateDir(), creds: Credentials): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = credPath(dir);
  writeFileSync(p, JSON.stringify(creds, null, 2) + "\n");
  chmodSync(p, 0o600);
}

export function loadConfig(input: LoadConfigInput = {}): Config {
  const stateDir = input.stateDir ?? defaultStateDir();
  const env = input.env ?? process.env;
  const flags = input.flags ?? {};

  const file = readCredentials(stateDir);
  const apiToken = flags.token ?? env.LOOMY_API_TOKEN ?? file?.apiToken;
  const endpoint = flags.endpoint ?? env.LOOMY_ENDPOINT ?? file?.endpoint ?? DEFAULT_ENDPOINT;

  if (!apiToken) {
    throw new CliError("auth", "No token. Run `loomy init` to set one, or pass --token / LOOMY_API_TOKEN.");
  }

  return { endpoint, apiToken };
}
