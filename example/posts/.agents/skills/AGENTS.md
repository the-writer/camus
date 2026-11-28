---
title: Camus 创作助手技能总纲
visibility: hidden
---

# Camus 创作助手 · 技能总纲

> 本文件安装在**项目根**的 `.agents/AGENTS.md`；技能与记忆统一位于项目根 `.agents/`。
> 技能文件按项目类型分目录存放于 `.agents/<type>/`，小说类型再按子类型分目录存放于 `.agents/novel/<subtype>/`；
> 每次任务都必须先读 `.agents/memories/` 记忆、完成「项目类型判定」，再加载对应技能。
> 项目根另有安装时写入的短文件 `AGENTS.md`，只负责提示先读本文件；所有规则以本文件为准。

---

## 0. 纪律红线（最高优先级）

> 本节高于本文件其它章节、`shared/` 公共片段与任何技能文件。违反任一条必须**立即停止**，先向用户说明并等待指示；不得用「我以为」「通常如此」绕过。

1. **源目录写权限**：未经用户明确要求或授权，**严禁修改 `src/` 或 `posts/` 中任何内容**——新建、改写、移动、删除、重命名、格式化、批量替换都算。评审、分析、规划、给建议默认只读；确需落盘时，先列出文件清单并取得确认。`.agents/memories/` 的按需记忆写入不在此限。
2. **私有目录**：读取、分析、评审、统计默认**跳过源目录内任意 `private/`**（含 `src/private`、`posts/private`）；只有用户明确要求时才读取，且不得把内容写入公开输出、示例、提交信息或 `.agents/memories/`。
3. **不编造**：数字、引文、书名、版本、API 行为、文件内容与提交记录必须有依据；无法核实标「待核实」，不得虚构。
4. **不越权读取**：只读授权范围内的文件；评审时只读 `.git` 的 status / diff / log，不读取凭据、密钥或未授权的私有内容。
5. **冲突优先级**：本节 > `AGENTS.md` 其它章节 > `shared/` > 技能文件；记忆冲突时：正文 > 用户新指令 > `.agents/memories/` > `.workshop/`。
6. **不确定就问**：缺关键输入、类型 / 子类型无法判定、写权限不明确时，先问一个具体问题并等待回答，不得自行补全或开始写入。
7. **交付前自检**：是否获授权修改源目录？是否误读 `private/`？是否有未标来源的事实？是否把不应写的内容写进记忆或输出？任一为「是」就停下修正。

> 这七条是硬约束，不是建议；任何技能步骤都不得解释为对本节的例外。

## 0.1 强制工作流

> 每次接到写作 / 内容 / 代码类任务，**都按下面流程走**，不得跳步；先执行上节纪律红线。类型为 `novel` 时额外多一步子类型判定（步骤 1b），并在加载技能前完成一次创作进度回顾（步骤 3b）。通用规则见 `.agents/shared/common.md`，记忆细则见 `.agents/shared/memory.md`。

### 步骤 0 · 读取记忆与共享规范

1. **先读共享规则**：`.agents/shared/common.md`（所有任务）与 `.agents/shared/memory.md`（记忆与用户画像）。
2. 项目根 `.agents/memories/` 存放跨会话记忆。先读其中的 `project.md`（若存在）；`project.md` 缺失、缺少「项目概览」或 `user/` 下没有可用文件时，标记为**需要初始化**，完成步骤 1 / 1b 后执行步骤 1c。
3. 本次任务相关的类别文件（如 `characters.md`、`world.md`、`outline.md`）在进入对应工作前再读；**类型为 `novel` 时先读 `outline.md` 回顾进度与伏笔（流程见步骤 3b）**，不必一次读全。
4. **按需读取用户记忆**：涉及写作、改写、评审、规划、风格调整或需要给方案时，读 `.agents/memories/user/` 下对应用户的文件（默认 `default.md`）；纯事实查询或机械操作可不读。
5. 项目根存在 `.workshop/` 时，小说任务按 `.agents/shared/workshop.md` 把它作为创作资产库一并读取；不存在就跳过。
6. 记忆与当前正文 / 用户新指令冲突时，以正文与新指令为准，并在步骤 5 修正记忆。

### 步骤 1 · 读取主 SUMMARY.md，推断项目类型

源目录（`posts/`，若存在则 `src/`）根目录下的 `SUMMARY.md` 是站点元信息的唯一入口，**必须第一个读**。

**项目类型不写在配置里**，由 AI 首次运行时依据下列线索推断：

1. **元信息**：`title` / `subtitle` / `description` 指向的站点性质（文章集 / 产品页 / 工程文档 / 读书 / 文学创作）。
2. **目录结构**：按时间或主题分组的文章 → `blog`；按卷 / 章 / 幕划分 → `novel`；功能页而非文章集 → `website`；含 `docs/` / `api/` → `tech`；以书为单位 → `book`。
3. **正文样本**：读首篇文章 / 首章的标题与开头，确认体裁与读者预期。
4. **兜底询问**：线索不足或证据冲突 → 进入步骤 3（询问用户）。

> 推断完成后，把结果与依据写入 `.agents/memories/project.md`（规则见 `.agents/shared/memory.md`），后续运行直接复用。

### 步骤 1b · 判定小说子类型（仅 `novel`）

小说技能按子类型分成三个目录，写作规范差异很大，**必须先判定再加载**：

| 子类型 | 目录 | 适用作品 | 判定线索 |
|---|---|---|---|
| `online` | `.agents/novel/online/` | 中文网络小说、连载爽文 | 「网文 / 连载 / 日更 / 爽文 / 系统流 / 升级流」；长篇连载体量；按等级 / 境界划分战力；按「家族→宗门→大陆」推进 |
| `western-illusion` | `.agents/novel/western-illusion/` | 西方奇幻、史诗奇幻 | 「西幻 / 魔法 / 剑与魔法 / 龙 / 教会 / 公会 / 地下城 / 领主」；有魔法体系、种族与势力设定；冒险旅程式结构 |
| `simple` | `.agents/novel/simple/` | 现实向、人物驱动的普通小说 | 「短篇 / 中篇 / 家庭 / 职场 / 成长 / 日常」；不依赖类型套路；冲突来自人物处境与选择 |

判定规则：

1. **文本推断**：读正文样本（首章 + 若干章），按上表线索判定。类型与子类型都**不写入** `SUMMARY.md`，不要期待 `type` / `novel-type` 字段。
2. **兜底询问**：证据不足或两种子类型都成立（既要连载爽感又要西幻世界观）→ 进入步骤 3 询问用户。

> 子类型判定结果与项目类型一并写入 `.agents/memories/project.md`。

### 步骤 1c · 首次记忆初始化（缺失时补齐）

`.agents/memories/` 不存在、`project.md` 缺失或缺少「项目概览」、`user/` 下没有可用文件时，在判定完项目类型（与小说子类型）后补齐缺失部分，再进入步骤 2：

1. 创建 `.agents/memories/`（已存在则保留）。
2. 按 `.agents/shared/memory.md` §2 写 `project.md`（类型 / 子类型、依据、确认状态、项目概览）与 `user/default.md`（已知用户名时用 `<用户名>.md`）。
3. 只补齐缺失部分；已有内容只增量更新，不重建、不覆盖。

> 详细字段、用户画像维度与写入规则见 `.agents/shared/memory.md`；本步骤只规定触发时机与顺序。

### 步骤 2 · 输出类型声明（必做）

在任何实质工作开始之前，**先单独输出一行**类型声明，格式固定：

```text
项目类型：blog（依据：SUMMARY.md 的 description 与按主题分组的文章目录）
项目类型：tech（依据：SUMMARY.md 标题与目录结构推断：含 docs/、api/ 等工程目录）
```

- 类型只能取 `blog`、`novel`、`website`、`tech`、`book` 五个值。
- 类型为 `novel` 时，声明之后**紧接一行**子类型声明：

```text
小说子类型：online（依据：摘要提到连载与日更，正文按境界升级推进）
小说子类型：western-illusion（依据：正文出现魔法体系、种族与公会设定，按子类型判定表推断）
```

- 子类型只能取 `online`、`western-illusion`、`simple` 三个值。
- 声明之后如果依据发生变化（例如用户纠正了类型），必须**重新声明一次**，再继续工作。

### 步骤 3 · 不确定就问，不要猜

出现下列任一情况，**停止猜测**，先向用户提问并等待回答：

- `SUMMARY.md` 不存在，或缺少 `title` / `subtitle` / `description` 等可用线索；
- 两种以上类型同时成立且证据相当（例如「技术博客 + 个人随笔」）；
- 站点是混合形态（既有产品页又有长文），无法判断主次；
- 用户的要求明显不属于已知的五类（例如「做一份活动海报文案」「整理 podcast 字幕」）；
- 类型为 `novel` 但子类型无法判定（例如既要连载爽感又要完整西幻体系，且体裁特征冲突）。

提问格式（一次问清，不要挤牙膏）：

```text
我需要先确认项目类型。SUMMARY.md 的信息不足以唯一判定，候选如下：
A. blog —— 站点以定期更新的观点/评测文章为主，当前 description 提到「随笔」
B. tech —— 站点以工程实现与接口文档为主，当前目录含 docs/ 与 api/
你希望按哪一类工作？（我倾向 A，因为它与 description 的表述最接近）
```

小说子类型的提问同理，例如：

```text
我需要先确认小说子类型。当前文本两种特征都成立，候选如下：
A. online —— 章节短、更新频繁、主角有金手指并按境界升级
B. western-illusion —— 有魔法体系、种族与公会设定，按冒险旅程推进
你希望按哪一类写？（我倾向 B，因为世界观设定占了开篇三章的一半篇幅）
```

- 提问后**必须等待用户回答**，不要同时开始写作。
- 用户回答后，先输出类型声明，再继续。

### 步骤 3b · 创作进度回顾（仅 `novel`）

**所有小说技能共用这一套流程，技能文件里不再重复。** 进入任何小说技能的「输入 / 执行步骤」之前，先完成一次进度回顾，并先交付「创作进度回顾」块：

1. **读记忆**：先读 `.agents/memories/project.md`、`outline.md`，再按需读 `characters.md`、`world.md`、`continuity.md`、`preferences.md`、`style.md`；目录或文件不存在就跳过，不视为错误。
2. **扫数据**：扫描源目录的卷 / 篇 / 章文件（`online` 与 `western-illusion` 按卷 / 章，`simple` 按篇 / 章），**跳过任意 `private/` 目录**；若项目根存在 `.workshop/`，按 `.agents/shared/workshop.md` 读取设定卡、地名、关系与候选条目。
3. **统计**：按下面的数据表汇总卷 / 篇 / 章数、字数、最近更新、伏笔回收、人物与设定条目；每项数值注明「来源」，无法从文件得到时标「未记录」，不估算、不编造。
4. **对齐**：记忆与正文冲突时以正文为准；回顾结论写回 `outline.md`（进度、伏笔）及受影响的类别文件。
5. **输出回顾**：先交付「创作进度回顾」块，再继续该技能后续的输入与执行步骤。

```markdown
## 创作进度回顾
- 当前阶段：<开坑 / 连载中 / 修稿 / 完结>（依据：<...>）
- 上次更新：<日期 / 最新一章>（依据：<...>）

| 项 | 数值 | 来源 |
|---|---|---|
| 卷 / 篇数、章数 | <...> | <...> |
| 已完成章节 | <...> | <...> |
| 总字数 / 章均字数 | <...> | <...> |
| 伏笔 | 埋 <X> / 收 <Y> / 未收 <Z> | <...> |
| 人物 / 地点 / 关系 / 候选 | <...> | <...> |
| `.workshop` 设定卡 | <... / 无> | <...> |

- 当前进度：<写到哪一卷 / 哪一篇的哪一章，主线停在哪>
- 待续事项：<接下来 1–3 件，按优先级>
```

### 步骤 4 · 加载技能并执行

1. 读取 `.agents/<type>/` 下与本次任务相关的技能文件（每个 `.md` 是一个独立技能）；类型为 `novel` 时读取 `.agents/novel/<subtype>/`。
2. 按技能文件的「执行步骤」执行，用「输出格式」交付，用「质量检查清单」自检。**小说任务先按步骤 3b 输出「创作进度回顾」，再执行技能正文。**
3. 引用外部结论时附上参考资料链接。
4. 评审 / 评价类技能若项目根存在 `.git/`，先按 `.agents/shared/git-review.md` 读取当前改动并结合记忆做综合评价；git 只读，不提交。

> 技能文件是**工作规范**，不是灵感库。执行前必须真正读取对应文件，不要凭印象套模板。

### 步骤 5 · 按需更新记忆

任务结束时，把**下次运行还需要**的信息写回 `.agents/memories/`：

- 类型 / 子类型判定结果 → `project.md`
- 用户新增的偏好、工作方式、创作习惯或明确纠正 → `user/<用户>.md`
- 一般性的协作偏好与禁区 → `preferences.md`
- 新确定的人物、设定、大纲进度、伏笔状态 → 对应类别文件
- 本次的进度、字数与伏笔状态变化 → `outline.md`（进度快照与创作数据）
- 本次发现并修复的连续性问题 → `continuity.md`

一次性内容不写；读写规则与用户画像评估见 `.agents/shared/memory.md`。

---

## 1. 类型判定表

| 类型 | 适用站点 | 判定线索（`title` / `subtitle` / `description` / 目录结构） | 技能目录 |
|---|---|---|---|
| `blog` | 博客、专栏、随笔、评测、教程型内容站 | 定期发布文章；有「随笔 / 专栏 / 评测 / 手记 / 笔记」等词；有按时间或主题分组的文章目录 | `.agents/blog/` |
| `novel` | 小说、剧本、诗集等文学创作 | 「长篇 / 连载 / 章节 / 人物 / 情节 / 剧」；目录按卷、章、幕划分；文章篇幅长且有连续情节 | `.agents/novel/<subtype>/` |
| `website` | 产品站、机构站、落地页、FAQ 站 | 「产品 / 服务 / 方案 / 定价 / 关于我们 / 常见问题」；目录是功能页而非文章集 | `.agents/website/` |
| `tech` | 技术博客、工程文档、教程与源码说明站 | 「架构 / 源码 / 部署 / 性能 / 踩坑 / API / 实现」；含代码块、命令、配置文件；目录含 `docs/` `api/` `guide/` | `.agents/tech/` |
| `book` | 读书、书评、书摘、书单、读书笔记站 | 「书单 / 书评 / 读后感 / 笔记 / 摘录 / 共读」；以书为单位组织内容，常见作者 / 译者 / 出版社 / ISBN 等字段 | `.agents/book/` |

**混合站点的处理**：先定「主类型」，再跨目录借用其它类型的技能。例如「技术博客里夹了三篇书评」→ 主类型 `tech`，书评部分调用 `.agents/book/book-review.md`。

**小说类型的子目录**：`novel` 下再分三个子类型目录，判定规则见「步骤 1b」。

| 子类型 | 技能目录 | 核心差异 |
|---|---|---|
| `online` | `.agents/novel/online/` | 连载节奏：黄金三章、爽点密度、章末钩子、金手指与升级体系 |
| `western-illusion` | `.agents/novel/western-illusion/` | 世界观自洽：魔法体系与代价、种族与势力、位阶标尺、冒险旅程 |
| `simple` | `.agents/novel/simple/` | 通用基线：人物驱动、生活细节、克制表达、情感张力 |

> 子类型不同，规范差异很大：**不要跨子类型混用技能文件**，需要时以 `simple` 为基线再叠加对应子类型的专项要求。

---

## 2. 技能清单

### `.agents/blog/` — 博客与内容创作

| 技能 | 何时使用 |
|---|---|
| `topic-ideation.md` | 需要选题、找灵感、规划内容日历时 |
| `outline-builder.md` | 已有选题，需要搭结构、排大纲时 |
| `hook-writer.md` | 需要标题、开头前 3 句、摘要、导语时 |
| `readability-score.md` | 需要可读性打分、判断「读不读得下去」时 |
| `style-editor.md` | 稿件需要审校、去除冗余与「AI 味」时 |
| `related-post-finder.md` | 需要找同主题旧文、建立内链、判断内容是否重复时 |

### `.agents/novel/online/` — 网文（连载爽文）

| 技能 | 何时使用 |
|---|---|
| `premise-generator.md` | 需要选题、一句话卖点、金手指与爽点承诺时 |
| `character-bible.md` | 需要建立人物档案、等级台阶表、金手指能力与代价表时 |
| `plot-outline.md` | 需要排黄金三章、分卷结构、章节大纲与章末钩子时 |
| `outline-map.md` | 需要复盘当前创作脉络、分卷进度、伏笔与 `.workshop` 设定资产时 |
| `dialogue-polish.md` | 需要打磨网文对白、爽点台词与群像声线时 |
| `scene-tension-score.md` | 需要评估章节节奏、爽点密度与追读动力时 |
| `continuity-audit.md` | 需要检查战力、等级、道具与时间线是否自洽时 |

### `.agents/novel/western-illusion/` — 西方奇幻

| 技能 | 何时使用 |
|---|---|
| `premise-generator.md` | 需要设计魔法体系、种族势力与核心禁忌时 |
| `character-bible.md` | 需要建立冒险队伍、位阶与阵营关系档案时 |
| `plot-outline.md` | 需要排旅程阶段、地标锚点与 BOSS 阶梯时 |
| `outline-map.md` | 需要复盘当前旅程脉络、分卷进度、伏笔与 `.workshop` 设定资产时 |
| `dialogue-polish.md` | 需要打磨称谓、语域与种族口吻时 |
| `scene-tension-score.md` | 需要评估战斗与探索场景的张力时 |
| `continuity-audit.md` | 需要检查魔法规则、地图、位阶与势力关系是否自洽时 |

### `.agents/novel/simple/` — 普通小说（现实向基线）

| 技能 | 何时使用 |
|---|---|
| `premise-generator.md` | 需要故事梗概、控制主题与冲突内核时 |
| `character-bible.md` | 需要建立人物档案、动机链与生活细节时 |
| `plot-outline.md` | 需要排结构、场景清单与章节大纲时 |
| `outline-map.md` | 需要复盘当前创作脉络、结构进度、伏笔与 `.workshop` 设定资产时 |
| `dialogue-polish.md` | 需要打磨日常对白、写出潜台词时 |
| `scene-tension-score.md` | 需要评估场景张力与情感强度时 |
| `continuity-audit.md` | 需要检查时间线、生活细节与视角信息越界时 |

### `.agents/website/` — 站点与产品页

| 技能 | 何时使用 |
|---|---|
| `content-inventory.md` | 需要盘点现有页面、重整信息架构时 |
| `copy-rewrite.md` | 需要改写首页、关于页、功能说明文案时 |
| `accessibility-audit.md` | 需要做可访问性（WCAG）检查时 |
| `seo-audit.md` | 需要检查标题、描述、结构化数据、索引时 |
| `navigation-design.md` | 需要设计导航、面包屑、站点层级时 |
| `performance-checklist.md` | 需要体检加载速度与 Core Web Vitals 时 |

### `.agents/tech/` — 技术写作与工程

| 技能 | 何时使用 |
|---|---|
| `architecture-review.md` | 需要评审系统设计、模块划分、依赖方向时 |
| `code-review.md` | 需要评审一段改动（CL / diff）时 |
| `api-design.md` | 需要设计或评审接口契约时 |
| `test-strategy.md` | 需要设计测试分层、覆盖边界时 |
| `debug-diagnosis.md` | 需要定位故障、复盘事故时 |
| `tech-post-writer.md` | 需要把实现过程写成技术文章时 |

### `.agents/book/` — 阅读与书评

| 技能 | 何时使用 |
|---|---|
| `book-mapper.md` | 需要梳理一本书的结构、章节脉络时 |
| `key-idea-extractor.md` | 需要提炼核心观点、生成读书卡片时 |
| `reading-notes.md` | 需要写结构化读书笔记时 |
| `comparable-books.md` | 需要找同类书、对比多本书时 |
| `book-review.md` | 需要写书评时 |
| `reading-plan.md` | 需要排阅读计划、跟踪进度时 |

---

## 3. 技能文件的通用结构

每个技能文件都遵循同一结构，便于快速定位：

```text
用途        → 这个技能解决什么问题
何时使用    → 触发条件
输入        → 执行前需要拿到的材料（缺失时向用户索取）
执行步骤    → 编号步骤，可直接照做
输出格式    → 交付物的骨架（模板，不是正文）
质量检查清单 → 交付前逐条自检
参考资料    → 外部依据，引用时给链接
```

> 小说任务的「创作进度回顾」由 §0.1 步骤 3b 统一规定，技能文件不再单独写这一节。

**执行原则**

- 只使用技能文件与 `.agents/shared/` 公共片段里列出的输入；缺输入就问，不要编造事实、数据、引用。
- **小说任务先按步骤 3b 输出「创作进度回顾」**，再进入具体工作；回顾数据必须注明来源，取不到就写「未记录」。
- 事实性内容（数据、引文、书名、版本号、API 行为）不确定时标注「待核实」，不要虚构。
- 交付后必须过一遍本技能的质量检查清单与 `.agents/shared/common.md` 的通用基线，并说明未通过项及原因。
- 一次任务可串联多个技能，但要说明串联顺序。

---

## 4. 目录约定

```text
<项目根>/
├── AGENTS.md              ← 短入口：提示先读 .agents/AGENTS.md
├── .agents/               ← 技能库与记忆（安装到项目根）
│   ├── AGENTS.md          ← 本文件（技能总纲）
│   ├── shared/            ← 公共片段：通用规则 / 记忆 / .workshop / git 评审 / 小说脉络
│   ├── blog/  book/  tech/  website/
│   ├── novel/             ← 小说按子类型再分目录
│   │   └── online/  western-illusion/  simple/
│   └── memories/          ← 跨会话记忆（AI 运行时创建，按类别分文件）
│       ├── project.md     ← 类型 / 项目概览
│       ├── …              ← preferences / style / outline / characters / world / continuity
│       └── user/          ← 用户画像：user/<用户>.md（默认 default.md）
├── .workshop/             ← 可选：创作资产库（设定卡 / 地名 / 关系 / 候选 / 图谱，见 shared/workshop.md）
├── <source>/              ← 源目录（src/ 或 posts/）
│   ├── .agents/skills/    ← 同源技能镜像（仅示例内容带；不参与构建）
│   ├── SUMMARY.md         ← 主 SUMMARY.md：站点标题 / 副标题 / 描述 / cover / logo
│   └── …                  ← 文章 / 卷 / 章
├── camus.yaml             ← 站点配置
└── theme/                 ← 主题模板
```

- **技能权威副本**是 `.agents/<type>/**/*.md`；示例内容里的 `posts/.agents/skills/` 是同一套技能的随站分发镜像。
- `AGENTS.md` 与任意 `.agents/` 目录在构建时强制忽略（与 `private` 同级），不会出现在构建产物中。
- `.agents/memories/` 由 AI 在运行中创建与维护，不属于安装包内容，也不参与构建。
- `.workshop/` 为可选的创作资产库，存在时按 `.agents/shared/workshop.md` 读取；不存在不视为错误，也不参与构建。
- 项目根 `AGENTS.md` 是短入口；`--copy` 时若已存在则跳过并打印错误（不覆盖用户已有文件），`--force` 才覆盖；`--new` 下若内容不同仍按冲突处理。`.agents/` 内文件冲突时提示并终止复制，请自行合并或用 `--force` 覆盖。

---

## 5. 记忆与共享规范

- 通用规则：`.agents/shared/common.md`
- 记忆与用户画像：`.agents/shared/memory.md`（首次初始化见步骤 1c）
- `.workshop` 资产库：`.agents/shared/workshop.md`
- 评审类技能的 git 综合评价：`.agents/shared/git-review.md`
- 小说创作脉络公共片段：`.agents/shared/novel-map.md`
- 小说人物公共片段：`.agents/shared/novel-character.md`
- 小说连续性公共片段：`.agents/shared/novel-continuity.md`

记忆目录为 `.agents/memories/`，用户画像按 `.agents/memories/user/<用户>.md` 分文件；技能文件不重复这些细则。

---

## 6. 与 Camus 的衔接

- 内容写入 `posts/`（或 `src/`），目录需要标题就放一个 `SUMMARY.md`；新建文章可用 `camus --create <path>`。
- 构建：`camus --build`；只校验配置与目录：`camus --check`（加 `--fix` 自动补 `title` / `create-time` / `SUMMARY.md`）。
- 修改 `SUMMARY.md` 的 front matter 可设置 `title`、`subtitle`、`description`、`cover`、`logo`；项目类型与小说子类型**不写入配置**，由 AI 首次运行时推断并记入 `.agents/memories/project.md`。
- 写作前先看站点已有文章，避免选题重复（可用 `.agents/blog/related-post-finder.md`）。

---

## 7. 参考资料

- [Google 开发者文档风格指南](https://developers.google.com/style) —— 通用写作规范（语气、标题、句子长度）
- [中文文案排版指北](https://github.com/sparanoid/chinese-copywriting-guidelines) —— 中英文混排、标点与空格的排版约定
- [Nielsen Norman Group：How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/) —— 网页阅读行为与可扫描性
- [Google 搜索中心：创建有用内容](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) —— 站点内容的质量标准
