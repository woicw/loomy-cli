import { spawnSync } from "node:child_process";
import { CliError } from "./errors.js";

export interface FetchTokenOpts {
  user: string;
  sshHost?: string;
  /** Override for tests; defaults to real ssh. */
  exec?: (host: string, user: string) => { status: number; stdout: string; stderr: string };
}

export function fetchTokenForUser(opts: FetchTokenOpts): string {
  const host = opts.sshHost ?? process.env.LOOMY_SERVER_HOST ?? "server";
  const exec = opts.exec ?? defaultExec;
  const { status, stdout, stderr } = exec(host, opts.user);

  if (status !== 0) {
    throw new CliError(
      "auth",
      `failed to fetch token via 'ssh ${host} buildbox-user show ${opts.user}' (exit ${status}). this path is for admins with ssh access to the token-issuing server. if you don't have ssh to '${host}', ask an admin for your token and run 'loomy init --api-token T-<you>-<hex>' instead.\nstderr: ${stderr.trim()}`,
    );
  }

  const token = stdout.trim();
  if (!token) {
    throw new CliError(
      "auth",
      `user '${opts.user}' not registered on ${host}. ask admin to run 'ssh ${host} buildbox-user add ${opts.user}' first, then either retry with --user or pass --api-token T-${opts.user}-<hex> directly.`,
    );
  }
  return token;
}

function defaultExec(host: string, user: string) {
  const res = spawnSync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10", host, "buildbox-user", "show", user],
    { encoding: "utf8" },
  );
  return {
    status: res.status ?? 1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}
