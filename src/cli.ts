import { Command, Option } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CliError, exitCodeFor } from "./errors.js";
import { GatewayClient } from "./client.js";
import { loadConfig } from "./config.js";
import { defaultStateDir, ensureSessionId } from "./state.js";
import { runPing } from "./commands/ping.js";
import { runVersion } from "./commands/version.js";
import { runSessionsList, runSessionsRm } from "./commands/sessions.js";
import { runChat, runChatCancel, type RenderMode } from "./commands/chat.js";
import { resolveProjectContext, buildPreamble } from "./context.js";
import { resolveUsername } from "./git-user.js";
import { runInit } from "./commands/init.js";
import { runInstall, runInstallList } from "./commands/install.js";
import { defaultAssetsDir, defaultTargetDir } from "./skills.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string };

interface GlobalFlags {
  endpoint?: string;
  token?: string;
  username?: string;
  json?: boolean;
  quiet?: boolean;
  debug?: boolean;
}

function makeClient(globals: GlobalFlags): GatewayClient {
  const cfg = loadConfig({
    flags: { token: globals.token, endpoint: globals.endpoint },
  });
  const username = resolveUsername({ cwd: process.cwd(), cliUsername: globals.username });
  return new GatewayClient({
    endpoint: cfg.endpoint,
    apiToken: cfg.apiToken,
    username,
    debug: globals.debug,
  });
}

function renderModeFrom(globals: GlobalFlags): RenderMode {
  if (globals.json && globals.quiet) {
    throw new CliError("usage", "--json and --quiet are mutually exclusive");
  }
  if (globals.json) return "json";
  if (globals.quiet) return "quiet";
  return "default";
}

export async function main(argv: string[] = process.argv): Promise<number> {
  const program = new Command();

  program
    .name("loomy")
    .version(pkg.version)
    .addOption(new Option("--endpoint <url>", "gateway base URL").default(undefined))
    .addOption(new Option("--token <s>", "Bearer token override").default(undefined))
    .addOption(new Option("--username <s>", "X-Loomy-Username header override (defaults to git config user.name)").default(undefined))
    .option("--json", "JSONL output")
    .option("--quiet", "buffer chat deltas, print final reply only")
    .option("--debug", "print request/response headers to stderr");

  program
    .command("ping")
    .description("hit /healthz")
    .action(async () => {
      const globals = program.opts<GlobalFlags>();
      await runPing(makeClient(globals), (s) => process.stdout.write(s));
    });

  program
    .command("version")
    .description("gateway + cli versions")
    .action(async () => {
      const globals = program.opts<GlobalFlags>();
      await runVersion(makeClient(globals), pkg.version, (s) => process.stdout.write(s));
    });

  const sessions = program.command("sessions").description("manage hermes sessions");
  sessions
    .command("list")
    .description("list active sessions")
    .action(async () => {
      const globals = program.opts<GlobalFlags>();
      await runSessionsList(makeClient(globals), (s) => process.stdout.write(s));
    });
  sessions
    .command("rm <id>")
    .description("delete a session")
    .action(async (id: string) => {
      const globals = program.opts<GlobalFlags>();
      await runSessionsRm(makeClient(globals), id, (s) => process.stdout.write(s));
    });

  program
    .command("chat [prompt...]")
    .description("send a prompt; SSE-streamed by default")
    .option("--session <id>", "use this session id (overrides last)")
    .option("--new", "force a new session id")
    .option("--cancel", "send cancel for current session, no prompt")
    .option("--project <name>", "project name (overrides cwd auto-detect)")
    .option("--branch <name>", "branch name (overrides git auto-detect)")
    .option("--ssh-url <url>", "repo ssh url (overrides remote.origin.url auto-detect)")
    .option("--workspace-root <path>", "remote workspace root (overrides config)")
    .option("--no-context", "skip project/branch/repo preamble")
    .action(async (promptParts: string[], cmdOpts: { session?: string; new?: boolean; cancel?: boolean; project?: string; branch?: string; sshUrl?: string; workspaceRoot?: string; context?: boolean }) => {
      const globals = program.opts<GlobalFlags>();
      const cfg = loadConfig({ flags: { token: globals.token, endpoint: globals.endpoint } });
      const client = makeClient(globals);
      if (cmdOpts.cancel) {
        const sessionId = cmdOpts.session ?? ensureSessionId(defaultStateDir(), false);
        await runChatCancel({ client, sessionId, stderr: (s) => process.stderr.write(s) });
        return;
      }
      const message = promptParts.join(" ").trim();
      if (!message) throw new CliError("usage", "prompt required");
      const sessionId = cmdOpts.session ?? ensureSessionId(defaultStateDir(), Boolean(cmdOpts.new));
      const mode = renderModeFrom(globals);
      let preamble: string | null = null;
      if (cmdOpts.context !== false) {
        const ctx = resolveProjectContext({
          cwd: process.cwd(),
          cliProject: cmdOpts.project,
          cliBranch: cmdOpts.branch,
          cliRepoUrl: cmdOpts.sshUrl,
          cliWorkspaceRoot: cmdOpts.workspaceRoot,
          configWorkspaceRoot: cfg.workspaceRoot ?? undefined,
        });
        const hasContext = ctx.project || ctx.branch || ctx.repoUrl;
        if (hasContext && !ctx.workspaceRoot) {
          throw new CliError("usage", "workspace root not configured. run `loomy init --workspace-root <path>` to set it, pass --workspace-root, or use --no-context to skip the preamble.");
        }
        preamble = buildPreamble(ctx);
      }
      await runChat({
        client, sessionId, message, mode, preamble,
        stdout: (s) => process.stdout.write(s),
        stderr: (s) => process.stderr.write(s),
      });
    });

  program
    .command("init")
    .description("write ~/.loomy-cli/credentials.json (resolves token by username via ssh)")
    .option("--user <name>", "registered username on server (must exist via 'buildbox-user add')")
    .option("--server-host <host>", "ssh alias for the token-issuing server (default: 'server', or $LOOMY_SERVER_HOST)")
    .option("--workspace-root <path>", "remote workspace root where projects are checked out")
    .option("--yes", "non-interactive: accept defaults / overwrite (requires --user)")
    .action(async (cmdOpts: { user?: string; serverHost?: string; workspaceRoot?: string; yes?: boolean }) => {
      const globals = program.opts<GlobalFlags>();
      await runInit({
        stateDir: defaultStateDir(),
        flags: { endpoint: globals.endpoint, user: cmdOpts.user, serverHost: cmdOpts.serverHost, workspaceRoot: cmdOpts.workspaceRoot, yes: cmdOpts.yes },
        stderr: (s) => process.stderr.write(s),
      });
    });

  program
    .command("install")
    .description("install bundled skills into the local agent")
    .option("--skill <names...>", "skill name(s) to install")
    .option("--list", "list available bundled skills")
    .option("--target <path>", "destination skills dir", defaultTargetDir())
    .option("--force", "overwrite existing skill dir")
    .action(async (cmdOpts: { skill?: string[]; list?: boolean; target: string; force?: boolean }) => {
      if (cmdOpts.list) {
        await runInstallList({ assetsDir: defaultAssetsDir(), write: (s) => process.stdout.write(s) });
        return;
      }
      if (!cmdOpts.skill || cmdOpts.skill.length === 0) {
        throw new CliError("usage", "specify --skill <name> [...] or --list");
      }
      await runInstall({
        assetsDir: defaultAssetsDir(),
        targetDir: cmdOpts.target,
        skills: cmdOpts.skill,
        force: Boolean(cmdOpts.force),
        write: (s) => process.stdout.write(s),
      });
    });

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (err) {
    if (err instanceof CliError) {
      process.stderr.write(`${err.message}\n`);
      return exitCodeFor(err.kind);
    }
    if ((err as any)?.code === "commander.helpDisplayed") return 0;
    if ((err as any)?.code === "commander.version") return 0;
    process.stderr.write(`${(err as Error).message}\n`);
    if (program.opts<GlobalFlags>().debug) process.stderr.write((err as Error).stack + "\n");
    return 1;
  }
}

main().then((code) => process.exit(code), (err) => {
  console.error(err);
  process.exit(1);
});
