# loomy-cli

Mac CLI that talks to a Loomy gateway from the command line: chat with the agent, manage sessions, bootstrap local skills for your AI assistant.

## Install

```
pnpm i -g loomy-cli   # or: npm i -g loomy-cli
```

Node ≥ 20 required.

## Quickstart

```
loomy init --user <username>     # resolves token via 'ssh server buildbox-user show', writes ~/.loomy-cli/credentials.json
loomy ping                       # confirm the gateway is reachable
loomy chat "summarize this PR"   # streamed SSE chat
```

`loomy init` requires `--user <name>` (the username must already exist on the server via `buildbox-user add`); the CLI shells out to `ssh server buildbox-user show <name>` to fetch the Bearer token. Override the ssh alias with `--server-host <h>` or `LOOMY_SERVER_HOST`. Combine with `--endpoint <url>` / `--workspace-root <path>` / `--yes` for non-interactive use.

## Commands

| Command | What it does |
|---|---|
| `loomy ping` | `GET /healthz` — connectivity check |
| `loomy version` | CLI + gateway + agent versions |
| `loomy chat [prompt...]` | Streamed chat. `--new` for a fresh session. `--cancel` to abort in-flight |
| `loomy chat --project X --branch Y --ssh-url Z` | Override the auto-attached `[项目: · 分支: · 仓库:]` preamble |
| `loomy sessions list` / `rm <id>` | Inspect / drop active sessions |
| `loomy init` | Write `~/.loomy-cli/credentials.json` (mode 600) |
| `loomy install --skill <names>` / `--list` | Install bundled skills into a local AI's skills dir (default `~/.claude/skills`) |

Run `loomy <command> --help` for full options on any command.

## Render modes

- Default: SSE deltas streamed to stdout, metadata to stderr.
- `--quiet`: buffer the full reply, print once at end. Best for `result=$(loomy chat --quiet "...")`.
- `--json`: one JSON event per line. Best for piping into a parser.

## Configuration

| Source | Endpoint | Token | Username |
|---|---|---|---|
| CLI flag | `--endpoint <url>` | `--token <s>` | `--username <s>` |
| Env | `LOOMY_ENDPOINT` | — | `LOOMY_USERNAME` |
| File | `~/.loomy-cli/credentials.json` | — | — |
| Fallback | — | — | `git config user.name` |

Every request carries `X-Loomy-Username` when a username is resolvable; the server logs that name in `audit.user` / `evidence.user`, falling back to the token's `X-Loomy-User` when the header is absent.

Resolution: flag > env > file. Endpoint is required; the CLI errors out clearly if it can't resolve one.

Optional preamble overrides:

| Env | Effect |
|---|---|
| `LOOMY_PROJECT` | Project name attached to outgoing chat |
| `LOOMY_BRANCH` | Branch name attached to outgoing chat |
| `LOOMY_REPO` | Repo SSH url attached to outgoing chat |

Without overrides, `loomy chat` auto-detects from git (root basename / current branch / `remote.origin.url`) when invoked from inside a git repo.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | OK |
| 1 | Unhandled error |
| 2 | Usage / argument error |
| 4 | Auth — no/invalid token |
| 5 | Network unreachable |
| 6 | HTTP 4xx |
| 7 | HTTP 5xx |

## License

ISC.
