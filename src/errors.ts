export type ErrorKind = "usage" | "auth" | "network" | "http4xx" | "http5xx" | "unknown";

export class CliError extends Error {
  constructor(public kind: ErrorKind, message: string) {
    super(message);
    this.name = "CliError";
  }
}

const CODES: Record<ErrorKind, number> = {
  usage: 2,
  auth: 4,
  network: 5,
  http4xx: 6,
  http5xx: 7,
  unknown: 1,
};

export function exitCodeFor(kind: ErrorKind): number {
  return CODES[kind];
}
