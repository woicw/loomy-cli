import { join } from "node:path";
import { input, confirm } from "@inquirer/prompts";
import { writeCredentials, readCredentials } from "../config.js";
import { fetchTokenForUser } from "../buildbox-user.js";
import { CliError } from "../errors.js";

export interface RunInitOpts {
  stateDir: string;
  flags: { endpoint?: string; user?: string; serverHost?: string; workspaceRoot?: string; yes?: boolean };
  stderr: (s: string) => void;
  /** Override interactive prompts for tests. */
  prompts?: {
    askEndpoint: (defaultValue: string) => Promise<string>;
    askUser: (defaultValue: string) => Promise<string>;
    askWorkspaceRoot: (defaultValue: string) => Promise<string>;
    confirmOverwrite: () => Promise<boolean>;
  };
  /** Override token resolver for tests. */
  resolveToken?: (user: string, sshHost?: string) => string;
}

export async function runInit(opts: RunInitOpts): Promise<void> {
  const existing = (() => { try { return readCredentials(opts.stateDir); } catch { return null; } })();

  const wantEndpoint = opts.flags.endpoint ?? existing?.endpoint ?? "";
  const userDefault = opts.flags.user ?? "";
  const workspaceDefault = opts.flags.workspaceRoot ?? existing?.workspaceRoot ?? "";

  let endpoint: string;
  let user: string;
  let workspaceRoot: string;

  if (opts.flags.yes && opts.flags.user) {
    endpoint = wantEndpoint;
    user = opts.flags.user;
    workspaceRoot = workspaceDefault;
  } else {
    const p = opts.prompts ?? {
      askEndpoint: (def: string) => input({ message: "Gateway endpoint", default: def }),
      askUser: (def: string) => input({ message: "Username (must already exist on server via 'buildbox-user add')", default: def }),
      askWorkspaceRoot: (def: string) => input({ message: "Workspace root on remote host (where projects are checked out, e.g. ~/projects)", default: def }),
      confirmOverwrite: () => confirm({ message: "credentials.json exists. Overwrite?", default: false }),
    };
    if (existing && !opts.flags.yes) {
      const ok = await p.confirmOverwrite();
      if (!ok) {
        opts.stderr("aborted\n");
        return;
      }
    }
    endpoint = await p.askEndpoint(wantEndpoint);
    user = await p.askUser(userDefault);
    if (!user) throw new CliError("usage", "username is required");
    workspaceRoot = await p.askWorkspaceRoot(workspaceDefault);
  }

  const resolve = opts.resolveToken ?? ((u, h) => fetchTokenForUser({ user: u, sshHost: h }));
  const apiToken = resolve(user, opts.flags.serverHost);
  opts.stderr(`resolved token for user '${user}' via ssh ${opts.flags.serverHost ?? process.env.LOOMY_SERVER_HOST ?? "server"}\n`);

  writeCredentials(opts.stateDir, { endpoint, apiToken, ...(workspaceRoot ? { workspaceRoot } : {}) });
  opts.stderr(`wrote ${join(opts.stateDir, "credentials.json")} (mode 600)\n`);

  // healthz validation — no rollback on failure, just warn
  try {
    const res = await fetch(`${endpoint.replace(/\/+$/, "")}/healthz`, {
      headers: { authorization: `Bearer ${apiToken}` },
    });
    if (res.ok) opts.stderr("/healthz ok\n");
    else opts.stderr(`/healthz failed (${res.status} ${res.statusText})\n`);
  } catch (err) {
    opts.stderr(`/healthz unreachable: ${(err as Error).message}\n`);
  }
}
