---
name: loomy-pr
description: Dispatch a project's PR review / merge workflow to hermes via loomy chat. Triggers on phrasings like "走 PR 流程", "review PR <n>", "merge this PR", "跑下 merge-review", "把 PR 合了", "PR 看一下".
---

# Loomy — PR Workflow Dispatch

PR / merge review work runs on **hermes** (the buildbox). The actual merge-review flow is **defined inside the project's own repo** (each project has its own definition of what "merge-review" means: which tests, which reviewers, which checks). It is NOT a hermes-installed skill — hermes reads it from the project tree after the workspace is prepared.

## What hermes already does for you

- **Workspace prep** — `project-context-setup` auto-runs on every chat: cd's to `~/ifly/<project>`, checks out the right branch, asks before cloning a missing project. You don't need to handle any of that.
- **Project preamble** — `loomy chat` auto-attaches `[项目: X · 分支: Y · 仓库: Z]` from the engineer's git cwd.

So your only job is to **dispatch a natural-language request that names the workflow and the PR**. Hermes (after cd'ing into the project) will look for the project's merge-review definition and follow it.

## When the engineer asks for PR work

1. **Get the PR number / scope.** If absent, ask once.

2. **Pre-flight: confirm hermes can see the engineer's local commits.**
   Hermes pulls from `origin`; anything sitting only on the engineer's Mac
   (uncommitted, or committed-but-unpushed) is invisible to it. Run these in
   the engineer's local cwd (NOT via `loomy chat`):
   ```bash
   git status --porcelain                       # should be empty
   git rev-list --count @{u}..HEAD 2>/dev/null  # should be 0
   ```
   - **dirty tree** (status non-empty): tell the engineer
     > 本地有未提交改动，hermes 看不到。要先 commit + push，还是这次 review 不带这些改动？
   - **unpushed commits** (`@{u}..HEAD` > 0): tell the engineer
     > 本地有 N 个未推送 commit。要先 `git push` 再 dispatch 吗？(yes/no)
   - **no upstream set** (`git rev-list` errored): branch isn't tracking
     remote. Give:
     ```
     git push -u origin <current-branch>
     ```
     and ask before running it.
   - All clean: silently proceed to step 3.

   **Skip pre-flight if the engineer is reviewing someone else's PR** (i.e.
   their current branch ≠ the PR's branch). When in doubt, ask:
   > 这个 PR 是你自己的工作还是 review 别人的？(我自己 / 别人)

3. **Dispatch with `--new`.** Open a fresh session so prior chat context doesn't bleed in:
   ```
   loomy chat --new "走当前项目的 merge-review 流程，PR #<num>，<任何额外说明>"
   ```
   The phrasing "**当前项目的 merge-review 流程**" tells hermes:
   - The workflow is project-defined (not a global skill)
   - Look inside the project tree for the definition (typical location: `.claude/skills/merge-review/SKILL.md` or wherever the project keeps workflow docs)
   - Follow whatever that definition says

4. **Default streaming mode.** No `--quiet` / `--json` unless the engineer asks for log-style or JSONL output.

5. **If the project has no merge-review definition,** hermes will say so (no file to follow). Tell the engineer:
   > 项目 `<project>` 里没找到 merge-review 流程定义。要不要先在仓库里加一个？或者用别的工作流名（如 `pr-with-screenshots`、`release-merge`）？

## Naming

`merge-review` is the **default convention**, not a fixed name. If a project uses another name (e.g. `pr-with-screenshots`, `release-flow`, `quick-review`), substitute it:

```
loomy chat --new "走当前项目的 <skill-name> 流程，PR #<num>"
```

## Targeting a project not yet on hermes

If the project isn't checked out on hermes yet, `project-context-setup` will ask whether to clone first. To pre-supply the ssh url so the engineer only sees one yes/no prompt instead of a "no ssh url, please retry" round-trip:

```
loomy chat --new --ssh-url git@github.com:org/<project>.git \
  "走当前项目的 merge-review 流程，PR #<num>"
```

## Following up

After the workflow finishes, the session is alive. Continue with bare `loomy chat`:

```
loomy chat "<follow-up>"
```

Don't use `loomy chat --cancel` for follow-ups — cancel drops in-flight state. Use it only to abort a stuck workflow.

## Anti-patterns

- Don't simulate PR review locally (running tests, fetching diffs, building). Hermes has the project clone, the toolchain, and the right env — you don't.
- Don't issue raw HTTP to the gateway. Use `loomy chat`.
- Don't try to install merge-review onto hermes (e.g. `~/.hermes/skills/`). It's project-defined; it lives in the project repo and stays there.
- Don't modify the project's merge-review definition from the Mac. If the workflow needs changes, that's a separate task on the project repo (work on it via hermes too, not by editing files on your Mac).
- Don't pre-resolve project / branch into the prompt text — the preamble is the channel for that, and project-context-setup handles it on the hermes end.
- Don't invent a PR number or branch the engineer didn't give you.
- Don't use `/skill merge-review` — that's hermes' explicit-load syntax for hermes-installed skills, but merge-review isn't one of those.
- Don't auto-`git push` in the pre-flight step. Always ask first — engineer may be in the middle of WIP and not ready to publish.
- Don't skip the pre-flight check just because the engineer sounds urgent. Reviewing stale code (without the latest local commits) wastes a review cycle.
