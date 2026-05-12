import { join } from "node:path";
import { input, password, confirm } from "@inquirer/prompts";
import { writeCredentials, readCredentials } from "../config.js";
import { CliError } from "../errors.js";

export interface RunInitOpts {
  stateDir: string;
  flags: { endpoint?: string; apiToken?: string; workspaceRoot?: string; yes?: boolean };
  stderr: (s: string) => void;
  /** Override interactive prompts for tests. */
  prompts?: {
    askEndpoint: (defaultValue: string) => Promise<string>;
    askToken: (defaultValue: string) => Promise<string>;
    confirmOverwrite: () => Promise<boolean>;
  };
}

export async function runInit(opts: RunInitOpts): Promise<void> {
  const existing = (() => { try { return readCredentials(opts.stateDir); } catch { return null; } })();

  const wantEndpoint = opts.flags.endpoint ?? existing?.endpoint ?? "";
  const tokenDefault = opts.flags.apiToken ?? existing?.apiToken ?? "";
  const workspaceRoot = opts.flags.workspaceRoot ?? existing?.workspaceRoot;

  let endpoint: string;
  let apiToken: string;

  if (opts.flags.yes && (opts.flags.apiToken || tokenDefault)) {
    endpoint = wantEndpoint;
    apiToken = opts.flags.apiToken ?? tokenDefault;
  } else {
    const p = opts.prompts ?? {
      askEndpoint: (def: string) => input({ message: "Gateway endpoint", default: def }),
      askToken: (def: string) => password({ message: "API token", mask: "*" }).then((v) => v || def),
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
    apiToken = await p.askToken(tokenDefault);
    if (!apiToken) throw new CliError("usage", "apiToken is required");
  }

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
