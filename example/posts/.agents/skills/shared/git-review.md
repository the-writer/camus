---
title: 评审类技能的 git 综合评价
visibility: hidden
---

# 评审类技能的 git 综合评价

> 项目根存在 `.git/` 时，评审 / 评价类技能不能只看用户贴出的片段。本文件是唯一细则来源；`code-review`、`architecture-review` 等技能只引用，不重复命令与规则。

## 1. 触发

只检查项目根是否存在 `.git/`。不存在就跳过本节，按原技能执行。

## 2. 数据源

| 来源 | 读取内容 | 用途 |
|---|---|---|
| `.git/` | `git status --short`、`git diff --stat`、`git diff`（未暂存）、`git diff --cached`（已暂存）、`git log -1 --oneline` | 确认改动范围、暂存状态与基线 |
| 项目记忆 | `.agents/memories/project.md`、`preferences.md`、`style.md`、`outline.md`、`continuity.md` 等 | 对照项目目标、偏好、结构与连续性约定 |
| 用户记忆 | `.agents/memories/user/<用户>.md` | 对照协作偏好、评审习惯与表达方式 |

## 3. 规则

1. **只读**：不执行 `git add` / `commit` / `reset` / `checkout` / `clean` 等写操作。
2. **不遗漏未暂存改动**：`git diff` 与 `git diff --cached` 都要看；两者都为空时说明工作区干净。
3. **不编造**：git 不可用、输出为空或仓库无提交时如实说明，不虚构 diff、文件名或提交记录。
4. **以记忆为参照，不以记忆为事实**：记忆与代码冲突时以代码为准，并在评价中指出记忆需要修正。
5. **分开评价**：把「改动本身的质量」与「改动是否符合项目目标 / 记忆」分开写，避免混为一谈。
6. **不改仓库**：评价结论只写进交付物或 `.agents/memories/`，不自动提交。

## 4. 输出

至少包含：

- 改动概览（文件 / 行数 / 暂存状态）；
- 与记忆的一致性；
- 风险项；
- 验证情况；
- 明确结论（通过 / 修改后通过 / 需要重做，或等价分级）。
