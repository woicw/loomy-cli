---
name: loomy
description: "MANUAL ONLY. Slash-command `/loomy <prompt>` — 把 prompt 透传给 `loomy` CLI 的 chat 子命令，与 Loomy gateway 上的 Hermes 对话。仅在用户消息以 `/loomy` 开头时触发。"
allowed-tools: Bash(loomy:*)
---

# /loomy — 调起 loomy chat

把用户在 `/loomy` 后面写的内容，通过本地 `loomy` CLI 发送到 Loomy gateway 的 chat 接口，并把返回展示给用户。

## 触发规则（强制）

只有当用户消息**以 `/loomy ` 开头**（或恰好等于 `/loomy`）时才执行本 skill。其他场景一律不要触发，包括但不限于：

- 用户讨论 loomy 项目本身、loomy 代码、loomy 文档
- 用户说"用 loomy" / "调一下 loomy"但没有 `/loomy` 前缀

若用户只输入 `/loomy` 没有 prompt，提示用法：`/loomy <你的问题>`，不要执行任何命令。

## 命令映射

把 `/loomy ` 之后的全部内容当作"chat 参数 + prompt"，透传给 `loomy chat`，并**默认注入一个 flag**：

- `--new`：每次 `/loomy` 默认开一个新会话，不继承上一次的上下文。

不要默认注入 `--quiet`：保留默认流式输出，避免 Hermes 中途要二次确认 / 反问时被缓冲遮蔽，导致你这边毫无感知。

```bash
loomy chat --new <用户在 /loomy 后写的内容>
```

### 实现细节

- 用 Bash 工具单次调用执行上述命令。
- 用户输入里的 prompt 用单引号包裹整段，避免 shell 解析问题；引号本身用 `'\''` 转义。
- 如果用户带了 loomy chat 自己的 flag（`--session <id>`、`--project <name>`、`--branch <name>`、`--no-context`、`--cancel`、`--new`），保持原样，置于 prompt 之前。
- `--new` 注入规则（避免和用户显式选择冲突）：
  - 用户写了 `--session <id>`：**不**注入 `--new`（沿用指定 session）。
  - 用户已写了 `--new`：不重复注入。
  - 用户写了 `--cancel`：不注入 `--new`，因为 `--cancel` 不需要 prompt 也不会出回复。
  - 其它情况：默认注入 `--new`。
- 如果用户显式写了 `--quiet` 或 `--json`，保持原样；本 skill 不主动注入这两个 flag。
- 不要在没有 prompt 的情况下加 `--cancel` 之外的 flag 然后空跑。

### 示例

| 用户输入 | 你应该执行 |
|---|---|
| `/loomy 帮我总结今天的提交` | `loomy chat --new '帮我总结今天的提交'` |
| `/loomy --new 开一个新会话讨论 X` | `loomy chat --new '开一个新会话讨论 X'` |
| `/loomy --session abc123 继续聊` | `loomy chat --session abc123 '继续聊'` |
| `/loomy --quiet 跑个脚本不想看流` | `loomy chat --quiet --new '跑个脚本不想看流'` |
| `/loomy --cancel` | `loomy chat --cancel` |
| `/loomy` | 提示用法，不执行 |

## 输出处理

- 把 `loomy chat` 的 stdout 原文展示给用户（默认是 SSE 流式增量，最终拼起来是一段 Markdown / 文本回复）。
- 不要做额外摘要、改写或翻译。
- 如果 Hermes 中途出现追问 / 二次确认（例如要你确认操作、补全参数），把原文交给用户决定，不要替用户回答。
- 如果命令返回非零，把 stderr 的最后几行报给用户，可能是 gateway 未启动、未配置 credential、网络问题等。常见兜底建议：
  - `loomy ping` 检查 gateway
  - `loomy init` 重新写入凭据
- **不要** 自动改 `~/.loomy-cli/credentials.json`、不要私下 `loomy init`、不要切 endpoint。

## 不属于本 skill 的事

- 浏览 / 修改本仓库代码 — 请走常规对话流程
- 列会话 / 删会话（`loomy sessions list|rm`）— 用户没有要求，不主动触发
- 安装 bundled skills（`loomy install`）— 同上
