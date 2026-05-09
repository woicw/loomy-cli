import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CliError } from "./errors.js";
import { defaultStateDir } from "./state.js";

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
  try {
    return CredentialsSchema.parse(JSON.parse(raw));
  } catch (err) {
    throw new CliError("usage", `credentials.json malformed (${(err as Error).message}). Run \`loomy init\` to repair.`);
  }
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
  const endpoint = flags.endpoint ?? env.LOOMY_ENDPOINT ?? file?.endpoint;

  if (!apiToken) {
    throw new CliError("auth", "No token. Run `loomy init` to set one, or pass --token / LOOMY_API_TOKEN.");
  }
  if (!endpoint) {
    throw new CliError("usage", "No endpoint. Run `loomy init` to configure, or pass --endpoint / LOOMY_ENDPOINT.");
  }

  return { endpoint, apiToken };
}
