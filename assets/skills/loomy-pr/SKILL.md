---
name: loomy-pr
description: Dispatch a project's PR review / merge workflow to hermes via loomy chat. Triggers on phrasings like "走 PR 流程", "review PR <n>", "merge this PR", "跑下 merge-review", "把 PR 合了", "PR 看一下".
---

# Loomy — PR Workflow Dispatch

PR / merge review work runs on **hermes** (the buildbox). The actual flow (diff analysis, test runs, merge logic) is a hermes-side skill — `merge-review` by default. Your job is to dispatch via `loomy chat`; never simulate the flow locally.

## Workspace context — already handled

The hermes-side `project-context-setup` skill auto-runs on every chat and prepares the project workspace from the `loomy chat` preamble. You do **not** need to:

- Tell hermes which project to operate on
- Tell hermes which branch
- Worry about cwd

If the engineer is in a git repo, `loomy chat` auto-attaches `[项目: X · 分支: Y · 仓库: Z]`. If not, pass `--project` / `--branch` / `--ssh-url` explicitly.

## When the engineer asks for PR work

1. **Get the PR number / scope.** If absent, ask once.

2. **Dispatch with `--new`.** Open a fresh session so prior chat context doesn't bleed in:
   ```
   loomy chat --new "/skill merge-review PR #<num>，<任何额外说明>"
   ```
   `/skill <name>` is hermes' explicit skill-load syntax. If the project's PR flow uses a different skill name (e.g. `pr-with-screenshots`, `release-merge`), substitute it.

3. **Default streaming mode.** No `--quiet` / `--json` unless the engineer asks for log-style or JSONL output. The engineer should see progress.

4. **If hermes responds without invoking the skill** (no `Loading skill 'merge-review'` event in the stream, no skill output structure), the skill is probably not installed on hermes (skills live at `~/.hermes/skills/<category>/<name>/`). Tell the engineer; ask whether to install it, or invoke a different existing one.

## Targeting a project not yet on hermes

If the project isn't checked out on hermes yet, `project-context-setup` will ask whether to clone first. To pre-supply the ssh url so the engineer only sees one yes/no instead of a "no ssh url, please retry" round-trip:

```
loomy chat --new --ssh-url git@github.com:org/<project>.git \
  "/skill merge-review PR #<num>"
```

## Following up

After the workflow finishes, the session is alive. Continue with bare `loomy chat`:

```
loomy chat "<follow-up>"
```

Don't use `loomy chat --cancel` for follow-ups — cancel drops in-flight state and is only for aborting a stuck workflow.

## Anti-patterns

- Don't simulate PR review locally (running tests, fetching diffs, building). Hermes has the project clone, the toolchain, and the right env — you don't.
- Don't issue raw HTTP to the gateway. Use `loomy chat`.
- Don't modify project skill files from the Mac; that's a separate task on the project repo.
- Don't invent a PR number or branch the engineer didn't give you.
- Don't pre-resolve project / branch into the prompt text — the preamble is the channel for that, and project-context-setup handles it on the hermes end.
