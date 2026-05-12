# loomy-cli

Mac CLI that talks to a Loomy gateway from the command line: chat with the agent, manage sessions, bootstrap local skills for your AI assistant.

## Install

```
pnpm i -g loomy-cli   # or: npm i -g loomy-cli
```

Node ≥ 20 required.

## Quickstart

```
loomy init                       # store endpoint + API token to ~/.loomy-cli/credentials.json
loomy ping                       # confirm the gateway is reachable
loomy chat "summarize this PR"   # streamed SSE chat
```

`loomy init` accepts `--endpoint <url>` / `--api-token <s>` / `--yes` for non-interactive use, or you can set `LOOMY_ENDPOINT` and pass `--token`.

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

| Source | Endpoint | Token |
|---|---|---|
| CLI flag | `--endpoint <url>` | `--token <s>` |
| Env | `LOOMY_ENDPOINT` | — |
| File | `~/.loomy-cli/credentials.json` | — |

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
