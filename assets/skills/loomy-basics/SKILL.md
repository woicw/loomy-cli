---
name: loomy-basics
description: Use the `loomy` CLI to talk to Hermes via the Loomy gateway. Triggers when the user wants to chat with hermes, list chat sessions, or check the gateway is reachable.
---

# Loomy CLI Basics

The `loomy` command on this Mac forwards requests to the Loomy gateway over a public reverse tunnel. Use it instead of curl for any Hermes interaction.

## Commands

- `loomy chat "<prompt>"` — Streams a response from Hermes. Reuses the last session id automatically.
- `loomy chat --new "<prompt>"` — Starts a fresh session.
- `loomy chat --session <id> "<prompt>"` — Targets a specific session.
- `loomy chat --cancel` — Cancels the current in-flight prompt for the active session.
- `loomy sessions list` — Lists active sessions for the caller.
- `loomy sessions rm <id>` — Closes a specific session.
- `loomy ping` — Confirms the gateway is reachable.
- `loomy version` — Prints CLI + gateway + hermes versions.

## Modes

- Default: SSE deltas streamed live to stdout; metadata to stderr.
- `--quiet`: buffer all deltas, print final reply once. Best for `result=$(loomy chat --quiet "...")`.
- `--json`: one JSON object per SSE event, line-delimited. Best for piping into a parser.

## Error handling

`loomy` exits with discrete codes:
- `4` auth (no/invalid token; run `loomy init`)
- `5` network unreachable
- `6` HTTP 4xx
- `7` HTTP 5xx

## When to invoke

- Any time the user asks to talk to hermes / Loomy / "the agent on the buildbox", prefer `loomy chat` over a custom HTTP call.
- For long replies, use the default streaming mode so the user sees progress.
- For scripted automation, use `--quiet` (capture full reply) or `--json` (structured parsing).
