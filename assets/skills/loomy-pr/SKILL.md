---
name: loomy-pr
description: Execute a project's PR review / merge workflow on hermes via loomy chat. Triggers when the user wants to review, validate, or merge a pull request — typical phrasings include "走 PR 流程", "review PR", "merge this PR", "跑下 merge-review", "PR 看一下", "把这个 PR 合了".
---

# Loomy — PR Workflow Dispatch

PR / merge review work runs on **hermes** (the buildbox), not locally. Each project on hermes keeps its own PR workflow as a skill at `<project>/.claude/skills/<name>/SKILL.md`. Your job here is to **dispatch correctly** — never re-implement the PR flow on the Mac.

## Default convention

- The PR workflow skill name is **`merge-review`** unless the project says otherwise.
- The engineer initiates with a PR number / branch / scope; the rest is hermes' job.
- Project + branch are auto-attached by `loomy chat` from the git root cwd. You do not need to compute them.

## When the engineer asks for PR work

1. **Get the PR number / scope.** From the engineer's message. If absent, ask once.

2. **Confirm the project context (only if cwd is non-git or ambiguous).** `loomy chat` prefixes `[项目: X · 分支: Y]` automatically when invoked from a git repo. If the engineer is in a non-git directory or wants to target a different project, ask which project + branch, then pass them explicitly:
   ```
   loomy chat --new --project <name> --branch <branch> "..."
   ```

3. **Dispatch with `--new`.** Open a fresh session for the workflow so prior context doesn't leak:
   ```
   loomy chat --new "执行 /merge-review 流程，PR #<num>，<任何额外说明>"
   ```

4. **Stream the response in default mode.** No `--quiet` / no `--json` unless the engineer specifically wants log-style or JSONL output. The engineer should see progress.

5. **Watch for "skill not found".** Hermes emits an `available_commands_update` event at session start (visible in `--json` mode, or just look at hermes' first reply). If the project does not have `/merge-review`, hermes will say so or list what it does have. Ask the engineer which skill to invoke instead, then re-dispatch.

## Following up in the same workflow

After the dispatch chat finishes, the session is still alive. For revisions, "why did you do X", or re-runs:

```
loomy chat "<follow-up>"
```

(No `--new` — reuses the same session, hermes keeps full context.)

## Overriding the skill name per project

If the project's PR flow lives under a different name (e.g. `pr-with-screenshots`, `release-merge`):

```
loomy chat --new "执行 /<skill-name> 流程，PR #<num>"
```

To discover what's available before dispatching:

```
loomy chat --new --quiet "列出当前项目下可用的命令"
```

## Cancelling

If the engineer wants to abort an in-flight workflow:

```
loomy chat --cancel
```

## Anti-patterns

- **Don't** simulate the PR review locally (running tests, fetching the diff, building locally). Hermes has the project clone, the build environment, and the right toolchain — you don't.
- **Don't** issue raw HTTP calls to the gateway. Always use `loomy chat`.
- **Don't** modify the project's skill files from the Mac. If the workflow needs to change, that's a separate change on the project repo on hermes, not a local edit.
- **Don't** invent a PR number or branch the engineer didn't give you.
