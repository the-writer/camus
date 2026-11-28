---
title: 公共片段索引
visibility: hidden
---

# 公共片段索引

技能文件只写自身特有内容；跨技能的规则与模板统一放在本目录。执行任务时按需读取：

| 文件 | 内容 | 何时读 |
|---|---|---|
| `common.md` | 输入缺失处理、证据、输出纪律、技能协作 | 所有任务 |
| `memory.md` | 记忆路径、首次初始化、用户画像、读写规则 | 所有任务 |
| `workshop.md` | `.workshop/` 文件契约、冲突优先级、只读规则 | 小说任务且项目根存在 `.workshop/` |
| `git-review.md` | 评审类技能的 git 综合评价 | 项目根存在 `.git/` 且做评审 / 评价 |
| `novel-map.md` | `outline-map` 的通用输入、公共输出块、检查清单、参考 | 使用 `novel/<subtype>/outline-map.md` |
| `novel-character.md` | 动机链、关系网、语言称谓、工具人检查、通用一致性 | 使用 `character-bible.md` |
| `novel-continuity.md` | 严重度分级、公共输出、检查基线 | 使用 `continuity-audit.md` |

## 维护约定

- 通用规则变化只改本目录，不改各技能文件。
- 技能文件引用本目录时写相对路径，例如 `.agents/shared/memory.md`。
- 新增公共片段时更新本索引，并在 PRD §11 登记。
