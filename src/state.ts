import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import { CliError } from "./errors.js";

const StateSchema = z.object({
  lastSessionId: z.string().optional(),
});
export type State = z.infer<typeof StateSchema>;

export function defaultStateDir(): string {
  return join(homedir(), ".loomy-cli");
}

function statePath(dir: string): string {
  return join(dir, "state.json");
}

export function readState(dir: string = defaultStateDir()): State {
  const p = statePath(dir);
  if (!existsSync(p)) return {};
  const raw = readFileSync(p, "utf8");
  try {
    return StateSchema.parse(JSON.parse(raw));
  } catch (err) {
    throw new CliError("usage", `state.json malformed (${(err as Error).message}). Delete it and run again.`);
  }
}

export function writeState(dir: string = defaultStateDir(), state: State): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const p = statePath(dir);
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n");
  chmodSync(p, 0o600);
}

export function ensureSessionId(dir: string = defaultStateDir(), forceNew: boolean): string {
  const current = readState(dir);
  if (!forceNew && current.lastSessionId) return current.lastSessionId;
  const next = uuidv7();
  writeState(dir, { ...current, lastSessionId: next });
  return next;
}
