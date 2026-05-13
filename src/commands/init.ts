import { join } from "node:path";
import { input, password, select, confirm } from "@inquirer/prompts";
import { writeCredentials, readCredentials } from "../config.js";
import { fetchTokenForUser } from "../buildbox-user.js";
import { CliError } from "../errors.js";

export interface RunInitOpts {
  stateDir: string;
  flags: {
    endpoint?: string;
    /** Look up the token via `ssh server buildbox-user show <name>`. Admin path. */
    user?: string;
    /** Paste a token directly. Path for users without ssh access to the server. */
    apiToken?: string;
    serverHost?: string;
    workspaceRoot?: string;
    yes?: boolean;
  };
  stderr: (s: string) => void;
  /** Override interactive prompts for tests. */
  prompts?: {
    askEndpoint: (defaultValue: string) => Promise<string>;
    askMode: () => Promise<"ssh" | "token">;
    askUser: (defaultValue: string) => Promise<string>;
    askToken: () => Promise<string>;
    askWorkspaceRoot: (defaultValue: string) => Promise<string>;
    confirmOverwrite: () => Promise<boolean>;
  };
  /** Override ssh-based resolver for tests. */
  resolveToken?: (user: string, sshHost?: string) => string;
}

export async function runInit(opts: RunInitOpts): Promise<void> {
  if (opts.flags.user && opts.flags.apiToken) {
    throw new CliError("usage", "--user and --api-token are mutually exclusive");
  }

  const existing = (() => { try { return readCredentials(opts.stateDir); } catch { return null; } })();

  const wantEndpoint = opts.flags.endpoint ?? existing?.endpoint ?? "";
  const workspaceDefault = opts.flags.workspaceRoot ?? existing?.workspaceRoot ?? "";

  let endpoint: string;
  let apiToken: string;
  let workspaceRoot: string;
  let resolvedVia: string;

  if (opts.flags.yes && (opts.flags.user || opts.flags.apiToken)) {
    endpoint = wantEndpoint;
    workspaceRoot = workspaceDefault;
    if (opts.flags.apiToken) {
      apiToken = opts.flags.apiToken;
      resolvedVia = "--api-token";
    } else {
      apiToken = resolveBySsh(opts, opts.flags.user!);
      resolvedVia = `ssh ${opts.flags.serverHost ?? process.env.LOOMY_SERVER_HOST ?? "server"}`;
    }
  } else {
    const p = opts.prompts ?? {
      askEndpoint: (def: string) => input({ message: "Gateway endpoint", default: def }),
      askMode: () => select<"ssh" | "token">({
        message: "How do you want to authenticate?",
        choices: [
          { name: "username — fetch token via ssh (admin path, requires Host server in ~/.ssh/config)", value: "ssh" },
          { name: "token   — paste an existing token (ask admin to run 'buildbox-user show <name>')", value: "token" },
        ],
        default: opts.flags.user ? "ssh" : "token",
      }),
      askUser: (def: string) => input({ message: "Username (must already exist on server via 'buildbox-user add')", default: def }),
      askToken: () => password({ message: "API token (T-<user>-<hex>)", mask: "*" }),
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
    const mode = opts.flags.user ? "ssh" : opts.flags.apiToken ? "token" : await p.askMode();
    if (mode === "ssh") {
      const userName = opts.flags.user ?? await p.askUser("");
      if (!userName) throw new CliError("usage", "username is required");
      apiToken = resolveBySsh(opts, userName);
      resolvedVia = `ssh ${opts.flags.serverHost ?? process.env.LOOMY_SERVER_HOST ?? "server"}`;
    } else {
      const token = opts.flags.apiToken ?? await p.askToken();
      if (!token) throw new CliError("usage", "api token is required");
      apiToken = token;
      resolvedVia = "--api-token";
    }
    workspaceRoot = await p.askWorkspaceRoot(workspaceDefault);
  }

  opts.stderr(`resolved token via ${resolvedVia}\n`);

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

function resolveBySsh(opts: RunInitOpts, user: string): string {
  const resolve = opts.resolveToken ?? ((u, h) => fetchTokenForUser({ user: u, sshHost: h }));
  return resolve(user, opts.flags.serverHost);
}
